import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  db,
  initDatabase,
  hydrateArtworks,
  exportDatabaseBackupSnapshot,
} from './server/db.ts';
import {
  hashPassword,
  verifyPassword,
  signAdminToken,
  requireAdmin,
  extractBearerToken,
  verifyAdminToken,
} from './server/auth.ts';
import {
  createSquarePaymentLink,
  getSquareEnvironmentName,
  isSquareConfigured,
  isSquareWebhookConfigured,
  verifySquareOrderPaid,
  verifySquareWebhookSignature,
} from './server/square.ts';
import {
  getConfiguredTemplateIds,
  getContactNotificationEmail,
  getEmailFromAddress,
  getNewsletterContactState,
  getNewsletterSegmentId,
  getNewsletterSenderAddress,
  isResendConfigured,
  isResendContactsConfigured,
  isValidEmailAddress,
  sanitizeMultilineText,
  sanitizeSingleLineText,
  sendContactInquiryEmails,
  sendNewsletterConfirmationEmail,
  sendOrderConfirmationEmail,
  sendShippingTrackingEmail,
  upsertConfirmedNewsletterContact,
  verifyNewsletterResendSetup,
} from './server/email.ts';

initDatabase();

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 3000);

// Sliding-window rate limiter for public contact & newsletter endpoints
const rateLimitBuckets = new Map<string, number[]>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const recent = (rateLimitBuckets.get(key) || []).filter((ts) => ts > windowStart);

  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitBuckets.set(key, recent);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  rateLimitBuckets.set(key, recent);

  if (rateLimitBuckets.size > 2000) {
    for (const [bucketKey, timestamps] of rateLimitBuckets.entries()) {
      const active = timestamps.filter((ts) => ts > windowStart);
      if (active.length === 0) rateLimitBuckets.delete(bucketKey);
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'artworks');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeBase =
      path
        .basename(file.originalname, ext)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 40);
    cb(null, `${safeBase || 'artwork'}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, or GIF artwork images are allowed.'));
    }
  },
});

interface CartLineInput {
  artworkId: number;
  variationId: number;
  quantity: number;
}

interface ShippingRateRow {
  id: number;
  name: string;
  category_scope: 'all' | 'painting' | 'aceo_sticker';
  flat_rate_cents: number;
  free_above_cents: number | null;
  estimated_days: string;
  active: number;
}

function calculateCartTotals(items: CartLineInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your shopping bag is empty.');
  }

  let subtotalCents = 0;
  let hasCanvasOriginal = false;
  const resolvedItems: Array<{
    artworkId: number;
    variationId: number;
    title: string;
    category: 'painting' | 'aceo' | 'sticker';
    variationLabel: string;
    optionKind: string;
    sku: string;
    unitPriceCents: number;
    quantity: number;
    stock: number;
  }> = [];

  for (const line of items) {
    const qty = Math.floor(Number(line.quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error('Invalid item quantity.');
    }

    const row = db
      .prepare(
        `SELECT v.id as variation_id, v.artwork_id, v.label, v.option_kind, v.sku, v.price_cents, v.stock,
                a.title, a.category, a.published
         FROM artwork_variations v
         JOIN artworks a ON a.id = v.artwork_id
         WHERE v.id = ? AND v.artwork_id = ?`
      )
      .get(Number(line.variationId), Number(line.artworkId)) as
      | {
          variation_id: number;
          artwork_id: number;
          label: string;
          option_kind: string;
          sku: string;
          price_cents: number;
          stock: number;
          title: string;
          category: 'painting' | 'aceo' | 'sticker';
          published: number;
        }
      | undefined;

    if (!row || !row.published) {
      throw new Error('One of the selected artworks is no longer available.');
    }
    if (row.stock < qty) {
      throw new Error(`Only ${row.stock} remaining for "${row.title} — ${row.label}".`);
    }

    if (row.category === 'painting' && row.option_kind === 'original') {
      hasCanvasOriginal = true;
    }

    subtotalCents += row.price_cents * qty;
    resolvedItems.push({
      artworkId: row.artwork_id,
      variationId: row.variation_id,
      title: row.title,
      category: row.category,
      variationLabel: row.label,
      optionKind: row.option_kind,
      sku: row.sku,
      unitPriceCents: row.price_cents,
      quantity: qty,
      stock: row.stock,
    });
  }

  const activeRates = db
    .prepare('SELECT * FROM shipping_rates WHERE active = 1 ORDER BY id ASC')
    .all() as unknown as ShippingRateRow[];

  let chosenRate: ShippingRateRow | undefined;
  if (hasCanvasOriginal) {
    chosenRate =
      activeRates.find((r) => r.category_scope === 'painting') ||
      activeRates.find((r) => r.category_scope === 'all');
  } else {
    chosenRate =
      activeRates.find((r) => r.category_scope === 'aceo_sticker') ||
      activeRates.find((r) => r.category_scope === 'all');
  }

  let shippingCents = chosenRate ? chosenRate.flat_rate_cents : 950;
  let shippingRateName = chosenRate ? chosenRate.name : 'Standard Studio Shipping';
  const estimatedDays = chosenRate ? chosenRate.estimated_days : '4–7 business days';

  if (
    chosenRate &&
    chosenRate.free_above_cents !== null &&
    subtotalCents >= chosenRate.free_above_cents
  ) {
    shippingCents = 0;
    shippingRateName = `${chosenRate.name} (Free Shipping Qualified)`;
  }

  return {
    resolvedItems,
    subtotalCents,
    shippingCents,
    shippingRateName,
    estimatedDays,
    totalCents: subtotalCents + shippingCents,
  };
}

async function finalizePaidOrder(orderId: number, squarePaymentId: string | null) {
  let newlyPaid = false;

  db.exec('BEGIN IMMEDIATE');
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
      | {
          id: number;
          order_number: string;
          customer_name: string;
          customer_email: string;
          subtotal_cents: number;
          shipping_cents: number;
          total_cents: number;
          payment_status: string;
          confirmation_email_status: string;
        }
      | undefined;

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.payment_status !== 'paid') {
      const items = db
        .prepare('SELECT * FROM order_items WHERE order_id = ?')
        .all(orderId) as unknown as Array<{
        artwork_id: number;
        variation_id: number;
        title_snapshot: string;
        variation_snapshot: string;
        unit_price_cents: number;
        quantity: number;
      }>;

      for (const item of items) {
        const res = db
          .prepare('UPDATE artwork_variations SET stock = stock - ? WHERE id = ? AND stock >= ?')
          .run(item.quantity, item.variation_id, item.quantity);

        if (res.changes === 0) {
          throw new Error(
            `Insufficient inventory while finalizing "${item.title_snapshot}" (${item.variation_snapshot})`
          );
        }

        const remaining = db
          .prepare('SELECT SUM(stock) as total FROM artwork_variations WHERE artwork_id = ?')
          .get(item.artwork_id) as { total: number | null };
        if ((remaining?.total ?? 0) <= 0) {
          db.prepare('UPDATE artworks SET is_sold_archive = 1, updated_at = ? WHERE id = ?').run(
            new Date().toISOString(),
            item.artwork_id
          );
        }
      }

      db.prepare(
        `UPDATE orders
         SET payment_status = 'paid',
             square_payment_id = COALESCE(?, square_payment_id),
             paid_at = ?
         WHERE id = ?`
      ).run(squarePaymentId, new Date().toISOString(), orderId);

      newlyPaid = true;
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  if (newlyPaid) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as {
      id: number;
      order_number: string;
      customer_name: string;
      customer_email: string;
      subtotal_cents: number;
      shipping_cents: number;
      total_cents: number;
    };
    const items = db
      .prepare(
        'SELECT title_snapshot as titleSnapshot, variation_snapshot as variationSnapshot, quantity, unit_price_cents as unitPriceCents FROM order_items WHERE order_id = ?'
      )
      .all(orderId) as unknown as Array<{
      titleSnapshot: string;
      variationSnapshot: string;
      quantity: number;
      unitPriceCents: number;
    }>;

    const emailRes = await sendOrderConfirmationEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
      items,
    });
    db.prepare('UPDATE orders SET confirmation_email_status = ? WHERE id = ?').run(
      emailRes.status,
      orderId
    );
  }
}

// IMPORTANT: Square webhook MUST receive raw text body before express.json()
app.post(
  '/api/webhooks/square',
  express.text({ type: '*/*' }),
  async (req, res) => {
    if (!isSquareConfigured() || !isSquareWebhookConfigured()) {
      return res.status(503).json({ error: 'Square webhook is not configured.' });
    }

    const sig = req.headers['x-square-hmacsha256-signature'];
    if (!sig || typeof sig !== 'string') {
      return res.status(400).send('Missing Square signature header.');
    }

    const rawBody = typeof req.body === 'string' ? req.body : '';
    const origin =
      process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
        ? process.env.APP_URL.replace(/\/$/, '')
        : `${req.protocol}://${req.get('host')}`;
    const notificationUrl = `${origin}/api/webhooks/square`;

    try {
      const valid = await verifySquareWebhookSignature({
        rawBody,
        signatureHeader: sig,
        notificationUrl,
      });

      if (!valid) {
        console.warn('Square webhook signature mismatch');
        return res.status(403).send('Invalid Square webhook signature.');
      }

      const event = JSON.parse(rawBody) as {
        type?: string;
        data?: {
          object?: {
            payment?: {
              id?: string;
              status?: string;
              order_id?: string;
            };
            order_updated?: {
              order_id?: string;
              state?: string;
            };
          };
        };
      };

      const payment = event.data?.object?.payment;
      if (
        (event.type === 'payment.updated' || event.type === 'payment.created') &&
        payment?.status === 'COMPLETED' &&
        payment.order_id
      ) {
        const order = db
          .prepare('SELECT id FROM orders WHERE square_order_id = ?')
          .get(payment.order_id) as { id: number } | undefined;
        if (order) {
          await finalizePaidOrder(order.id, payment.id || null);
        }
      }

      res.status(200).send('Received');
    } catch (err) {
      console.error('Square webhook processing error:', err);
      res.status(500).send('Webhook processing failed.');
    }
  }
);

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.resolve(process.cwd(), 'public')));

// ─── Public Storefront API ────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, studio: 'Little Wild Things' });
});

app.get('/api/artworks', (_req, res) => {
  try {
    res.json(hydrateArtworks(false));
  } catch (err) {
    console.error('Failed to load artworks:', err);
    res.status(500).json({ error: 'Unable to load artwork catalog.' });
  }
});

app.get('/api/artworks/:slug', (req, res) => {
  try {
    const all = hydrateArtworks(false);
    const match = all.find((a) => a.slug === req.params.slug);
    if (!match) {
      return res.status(404).json({ error: 'Artwork not found.' });
    }
    res.json(match);
  } catch (err) {
    console.error('Failed to load artwork:', err);
    res.status(500).json({ error: 'Unable to load artwork.' });
  }
});

app.get('/api/shipping-rates', (_req, res) => {
  try {
    const rates = db
      .prepare('SELECT * FROM shipping_rates WHERE active = 1 ORDER BY id ASC')
      .all() as unknown as ShippingRateRow[];
    res.json(
      rates.map((r) => ({
        id: r.id,
        name: r.name,
        categoryScope: r.category_scope,
        flatRateCents: r.flat_rate_cents,
        freeAboveCents: r.free_above_cents,
        estimatedDays: r.estimated_days,
        active: Boolean(r.active),
      }))
    );
  } catch (err) {
    console.error('Failed to load shipping rates:', err);
    res.status(500).json({ error: 'Unable to load shipping rates.' });
  }
});

app.post('/api/checkout/calculate', (req, res) => {
  try {
    const totals = calculateCartTotals(req.body?.items || []);
    res.json({
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      shippingRateName: totals.shippingRateName,
      estimatedDays: totals.estimatedDays,
      totalCents: totals.totalCents,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid cart items.' });
  }
});

app.post('/api/checkout/session', async (req, res) => {
  const { customerName, customerEmail, shippingAddress, notes, items } = req.body || {};

  if (!customerName?.trim() || !customerEmail?.trim()) {
    return res.status(400).json({ error: 'Full name and email address are required.' });
  }
  if (
    !shippingAddress?.line1?.trim() ||
    !shippingAddress?.city?.trim() ||
    !shippingAddress?.state?.trim() ||
    !shippingAddress?.postalCode?.trim()
  ) {
    return res.status(400).json({ error: 'Complete shipping address is required.' });
  }

  let totals;
  try {
    totals = calculateCartTotals(items);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid cart.' });
  }

  if (!isSquareConfigured()) {
    return res.status(503).json({
      code: 'SQUARE_NOT_CONFIGURED',
      error:
        'Square payment processing is not configured yet. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in your environment secrets to accept live or sandbox card payments. Unpaid orders are never marked as paid.',
    });
  }

  const now = new Date().toISOString();
  const orderNumber = `LWT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  let createdOrderId = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    const orderInfo = db
      .prepare(
        `INSERT INTO orders (
          order_number, customer_name, customer_email, shipping_address_json,
          subtotal_cents, shipping_cents, shipping_rate_name, total_cents,
          payment_status, fulfillment_status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'unfulfilled', ?, ?)`
      )
      .run(
        orderNumber,
        customerName.trim(),
        customerEmail.trim().toLowerCase(),
        JSON.stringify(shippingAddress),
        totals.subtotalCents,
        totals.shippingCents,
        totals.shippingRateName,
        totals.totalCents,
        notes ? String(notes).trim() : '',
        now
      );

    createdOrderId = Number(orderInfo.lastInsertRowid);

    const insertItem = db.prepare(
      `INSERT INTO order_items (
        order_id, artwork_id, variation_id, title_snapshot, variation_snapshot,
        sku_snapshot, unit_price_cents, quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of totals.resolvedItems) {
      insertItem.run(
        createdOrderId,
        item.artworkId,
        item.variationId,
        item.title,
        item.variationLabel,
        item.sku,
        item.unitPriceCents,
        item.quantity
      );
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed to create pending order:', err);
    return res.status(500).json({ error: 'Unable to initialize checkout order.' });
  }

  const origin =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/$/, '')
      : `${req.protocol}://${req.get('host')}`;

  try {
    const link = await createSquarePaymentLink({
      orderNumber,
      customerEmail: customerEmail.trim().toLowerCase(),
      customerName: customerName.trim(),
      shippingAddress,
      items: totals.resolvedItems.map((i) => ({
        title: i.title,
        variationLabel: i.variationLabel,
        unitAmountCents: i.unitPriceCents,
        quantity: i.quantity,
      })),
      shippingCents: totals.shippingCents,
      shippingLabel: totals.shippingRateName,
      redirectUrl: `${origin}/checkout?order_number=${encodeURIComponent(orderNumber)}`,
    });

    db.prepare(
      'UPDATE orders SET square_payment_link_id = ?, square_order_id = ? WHERE id = ?'
    ).run(link.paymentLinkId, link.squareOrderId, createdOrderId);

    res.json({
      orderNumber,
      checkoutUrl: link.checkoutUrl,
      squareOrderId: link.squareOrderId,
    });
  } catch (err) {
    console.error('Square Payment Link error:', err);
    db.prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?").run(createdOrderId);
    res.status(502).json({
      error:
        err instanceof Error
          ? `Payment provider error: ${err.message}`
          : 'Unable to connect to Square Checkout.',
    });
  }
});

app.get('/api/checkout/verify-order', async (req, res) => {
  const orderNumber = String(req.query.order_number || '').trim();
  if (!orderNumber) {
    return res.status(400).json({ error: 'Missing order_number parameter.' });
  }

  if (!isSquareConfigured()) {
    return res.status(503).json({ error: 'Square is not configured.' });
  }

  try {
    const order = db
      .prepare('SELECT * FROM orders WHERE order_number = ?')
      .get(orderNumber) as Record<string, unknown> | undefined;

    if (!order || !order.square_order_id) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.payment_status !== 'paid') {
      const check = await verifySquareOrderPaid(String(order.square_order_id));
      if (check.paid) {
        await finalizePaidOrder(Number(order.id), check.paymentId);
      }
    }

    const refreshed = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(Number(order.id)) as Record<string, unknown>;
    const items = db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .all(Number(order.id)) as unknown[];

    res.json({
      verifiedPaid: refreshed?.payment_status === 'paid',
      order: {
        id: refreshed.id,
        orderNumber: refreshed.order_number,
        customerName: refreshed.customer_name,
        customerEmail: refreshed.customer_email,
        shippingAddress: JSON.parse(String(refreshed.shipping_address_json || '{}')),
        subtotalCents: refreshed.subtotal_cents,
        shippingCents: refreshed.shipping_cents,
        shippingRateName: refreshed.shipping_rate_name,
        totalCents: refreshed.total_cents,
        paymentStatus: refreshed.payment_status,
        items,
      },
    });
  } catch (err) {
    console.error('Verify Square order error:', err);
    res.status(500).json({ error: 'Could not verify payment status with Square.' });
  }
});

app.post('/api/inquiries', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(`inquiry:${clientIp}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({
      error: 'Too many contact requests from this address. Please wait a few minutes and try again.',
    });
  }

  const {
    name,
    email,
    subject,
    artType,
    preferredSize,
    budgetRange,
    message,
    subscribeToUpdates,
    website,
    company,
    formLoadedAt,
  } = req.body || {};

  // Basic spam protection: honeypot & instant-submit bot check
  if (
    (typeof website === 'string' && website.trim().length > 0) ||
    (typeof company === 'string' && company.trim().length > 0)
  ) {
    return res.status(400).json({ error: 'Unable to verify form submission.' });
  }

  if (typeof formLoadedAt === 'number' && Number.isFinite(formLoadedAt)) {
    const elapsed = Date.now() - formLoadedAt;
    if (elapsed < 1500) {
      return res.status(400).json({
        error: 'Please take a moment to review your message before submitting.',
      });
    }
  }

  const cleanName = sanitizeSingleLineText(name, 120);
  const rawEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanArtType = sanitizeSingleLineText(artType || 'Original Acrylic Painting', 100);
  const cleanSubject = sanitizeSingleLineText(subject || cleanArtType, 200);
  const cleanSize = sanitizeSingleLineText(preferredSize || 'Flexible', 100);
  const cleanBudget = sanitizeSingleLineText(budgetRange || 'Open / Discuss', 100);
  const cleanMessage = sanitizeMultilineText(message, 5000);
  const optedIn = Boolean(subscribeToUpdates);

  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Please enter your name (at least 2 characters).' });
  }
  if (!isValidEmailAddress(rawEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (cleanSubject.length < 2) {
    return res.status(400).json({ error: 'Please enter a subject for your message.' });
  }
  if (cleanMessage.length < 5) {
    return res.status(400).json({ error: 'Please enter a message (at least 5 characters).' });
  }

  const linkMatches = cleanMessage.match(/https?:\/\/|www\./gi);
  if (linkMatches && linkMatches.length > 3) {
    return res.status(400).json({ error: 'Please limit external links in your contact message.' });
  }

  // Prevent duplicate identical submissions within 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recentDuplicate = db
    .prepare(
      `SELECT id FROM commission_inquiries
       WHERE email = ? AND message = ? AND created_at > ?
       LIMIT 1`
    )
    .get(rawEmail, cleanMessage, tenMinutesAgo) as { id: number } | undefined;

  if (recentDuplicate) {
    return res.status(429).json({
      error: 'Your message was already received. Please wait a few minutes before sending it again.',
    });
  }

  const now = new Date().toISOString();
  let inquiryId = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    const info = db
      .prepare(
        `INSERT INTO commission_inquiries (
          name, email, subject, art_type, preferred_size, budget_range, message, subscribed_to_updates, email_status, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'new', ?)`
      )
      .run(
        cleanName,
        rawEmail,
        cleanSubject,
        cleanArtType,
        cleanSize,
        cleanBudget,
        cleanMessage,
        optedIn ? 1 : 0,
        now
      );

    inquiryId = Number(info.lastInsertRowid);

    if (optedIn) {
      db.prepare(
        `INSERT INTO newsletter_subscribers (email, name, source, subscribed_at)
         VALUES (?, ?, 'contact_form', ?)
         ON CONFLICT(email) DO UPDATE SET name = CASE WHEN excluded.name != '' THEN excluded.name ELSE newsletter_subscribers.name END`
      ).run(rawEmail, cleanName, now);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed to save inquiry:', err);
    return res.status(500).json({ error: 'Unable to save your art request.' });
  }

  const emailResult = await sendContactInquiryEmails({
    inquiryId,
    name: cleanName,
    email: rawEmail,
    subject: cleanSubject,
    artType: cleanArtType,
    preferredSize: cleanSize,
    budgetRange: cleanBudget,
    message: cleanMessage,
    subscribeToUpdates: optedIn,
  });

  db.prepare('UPDATE commission_inquiries SET email_status = ? WHERE id = ?').run(
    emailResult.status,
    inquiryId
  );

  res.status(201).json({
    inquiryId,
    subscribedToUpdates: optedIn,
    emailResult: {
      configured: emailResult.configured,
      contactNotificationEmailConfigured: emailResult.contactNotificationEmailConfigured,
      provider: emailResult.provider,
      studioNotified: emailResult.studioNotified,
      customerConfirmed: emailResult.customerConfirmed,
      status: emailResult.status,
    },
    message: 'Your art request has been received.',
  });
});

const NEWSLETTER_TOKEN_TTL_HOURS = 24;
const inFlightNewsletterTokens = new Set<string>();

function resolveAppOrigin(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}

app.post('/api/newsletter', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(`newsletter-ip:${clientIp}`, 8, 15 * 60 * 1000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({ error: 'Too many signup attempts. Please wait a few minutes.' });
  }

  const { email, name, website, company, formLoadedAt } = req.body || {};

  // Spam protection: honeypot & instant bot submit check
  if (
    (typeof website === 'string' && website.trim().length > 0) ||
    (typeof company === 'string' && company.trim().length > 0)
  ) {
    return res.status(400).json({ error: 'Unable to verify signup submission.' });
  }

  if (typeof formLoadedAt === 'number' && Number.isFinite(formLoadedAt)) {
    const elapsed = Date.now() - formLoadedAt;
    if (elapsed < 800) {
      return res.status(400).json({
        error: 'Please take a moment before subscribing.',
      });
    }
  }

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!isValidEmailAddress(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const emailRate = checkRateLimit(`newsletter-email:${cleanEmail}`, 4, 15 * 60 * 1000);
  if (!emailRate.allowed) {
    res.setHeader('Retry-After', String(emailRate.retryAfterSec));
    return res.status(429).json({
      error: 'A confirmation email was recently sent to this address. Please check your inbox or wait a few minutes.',
    });
  }

  if (!isResendConfigured() || !isResendContactsConfigured() || !getNewsletterSegmentId()) {
    return res.status(503).json({
      error:
        'Newsletter signup is not configured yet on the server. Please add RESEND_API_KEY, RESEND_CONTACTS_API_KEY, and RESEND_NEWSLETTER_SEGMENT_ID.',
    });
  }

  const contactState = await getNewsletterContactState(cleanEmail);
  if (contactState.errorMessage) {
    console.error('Resend contact lookup error during signup:', contactState.errorMessage);
    return res.status(502).json({
      error: 'Unable to reach our newsletter service right now. Please try again in a few moments.',
    });
  }

  const now = new Date().toISOString();
  const cleanName = sanitizeSingleLineText(name || '', 120);

  // Gracefully handle already-confirmed duplicate subscribers without overwriting or spamming
  if (contactState.exists && !contactState.unsubscribed && contactState.inTargetSegment) {
    db.prepare(
      `INSERT INTO newsletter_subscribers (email, name, source, status, confirmed_at, resend_contact_id, subscribed_at, updated_at)
       VALUES (?, ?, 'footer', 'confirmed', ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         status = 'confirmed',
         confirmed_at = COALESCE(newsletter_subscribers.confirmed_at, excluded.confirmed_at),
         resend_contact_id = COALESCE(excluded.resend_contact_id, newsletter_subscribers.resend_contact_id),
         updated_at = excluded.updated_at`
    ).run(cleanEmail, cleanName, now, contactState.contactId, now, now);

    return res.status(200).json({
      status: 'already_subscribed',
      subscribed: true,
      message: "You're already on the list! Watch your inbox for our next studio note. 🌿",
    });
  }

  // Never automatically resubscribe someone who previously unsubscribed; require fresh explicit opt-in
  const isResubscribe = Boolean(contactState.exists && contactState.unsubscribed);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const ipHash = crypto.createHash('sha256').update(String(clientIp)).digest('hex').slice(0, 16);
  const expiresAt = new Date(
    Date.now() + NEWSLETTER_TOKEN_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();
  const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM newsletter_verification_tokens WHERE email = ? AND used_at IS NULL').run(
      cleanEmail
    );
    db.prepare('DELETE FROM newsletter_verification_tokens WHERE created_at < ?').run(staleCutoff);

    db.prepare(
      `INSERT INTO newsletter_verification_tokens (
        token_hash, email, name, source, consent_type, ip_hash, expires_at, created_at
      ) VALUES (?, ?, ?, 'footer', ?, ?, ?, ?)`
    ).run(
      tokenHash,
      cleanEmail,
      cleanName,
      isResubscribe ? 'resubscribe' : 'initial',
      ipHash,
      expiresAt,
      now
    );

    db.prepare(
      `INSERT INTO newsletter_subscribers (
        email, name, source, status, subscribed_at, updated_at
      ) VALUES (?, ?, 'footer', 'pending', ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = CASE WHEN excluded.name != '' THEN excluded.name ELSE newsletter_subscribers.name END,
        status = 'pending',
        updated_at = excluded.updated_at`
    ).run(cleanEmail, cleanName, now, now);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Newsletter token persistence error:', err);
    return res.status(500).json({ error: 'Unable to start verification right now.' });
  }

  const origin = resolveAppOrigin(req);
  const confirmUrl = `${origin}/newsletter/confirm?token=${encodeURIComponent(rawToken)}`;

  const sendRes = await sendNewsletterConfirmationEmail({
    to: cleanEmail,
    confirmUrl,
    expiresInHours: NEWSLETTER_TOKEN_TTL_HOURS,
    isResubscribe,
  });

  if (!sendRes.sent) {
    db.prepare('DELETE FROM newsletter_verification_tokens WHERE token_hash = ?').run(tokenHash);
    const providerHint = sendRes.errorMessage || '';
    const lowerHint = providerHint.toLowerCase();
    let clientMessage =
      'We could not send your confirmation email right now. Please check your email address and try again.';
    if (lowerHint.includes('verify a domain') || lowerHint.includes('testing emails')) {
      clientMessage =
        'Email sending is currently restricted by Resend domain verification (testing mode).';
    } else if (lowerHint.includes('domain') && lowerHint.includes('not verified')) {
      clientMessage = 'The newsletter sender domain is not verified in Resend yet.';
    }
    return res.status(502).json({
      error: clientMessage,
    });
  }

  return res.status(201).json({
    status: 'pending_verification',
    subscribed: false,
    message: 'One little step left! Check your inbox to confirm your subscription. 🌿',
  });
});

app.get('/api/newsletter/status', async (_req, res) => {
  try {
    const diag = await verifyNewsletterResendSetup();
    res.json(diag);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to check newsletter status.',
    });
  }
});

app.post('/api/newsletter/confirm', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(`newsletter-confirm:${clientIp}`, 15, 15 * 60 * 1000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({
      code: 'RATE_LIMITED',
      error: 'Too many confirmation attempts. Please wait a few minutes and try again.',
    });
  }

  const rawToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    return res.status(400).json({
      code: 'INVALID_TOKEN',
      error: 'This confirmation link is invalid or incomplete.',
    });
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  if (inFlightNewsletterTokens.has(tokenHash)) {
    return res.status(409).json({
      code: 'IN_PROGRESS',
      error: 'Your confirmation is already being processed.',
    });
  }

  inFlightNewsletterTokens.add(tokenHash);
  try {
    const tokenRow = db
      .prepare('SELECT * FROM newsletter_verification_tokens WHERE token_hash = ?')
      .get(tokenHash) as
      | {
          id: number;
          token_hash: string;
          email: string;
          name: string;
          source: string;
          consent_type: string;
          expires_at: string;
          used_at: string | null;
        }
      | undefined;

    if (!tokenRow) {
      return res.status(404).json({
        code: 'INVALID_TOKEN',
        error: 'This confirmation link is invalid or no longer exists. Please subscribe again.',
      });
    }

    if (tokenRow.used_at) {
      return res.status(409).json({
        code: 'ALREADY_USED',
        error: 'This confirmation link has already been used.',
      });
    }

    if (Date.parse(tokenRow.expires_at) <= Date.now()) {
      return res.status(410).json({
        code: 'EXPIRED_TOKEN',
        error: 'This confirmation link has expired. Please enter your email again to receive a fresh link.',
      });
    }

    const syncRes = await upsertConfirmedNewsletterContact({
      email: tokenRow.email,
      name: tokenRow.name,
    });

    if (!syncRes.configured) {
      return res.status(503).json({
        code: 'NOT_CONFIGURED',
        error:
          'Newsletter contact management is not configured on the server yet. Please try again later.',
      });
    }

    if (!syncRes.synced) {
      console.error('Resend contact sync failed during confirmation:', syncRes.errorMessage);
      return res.status(502).json({
        code: 'PROVIDER_ERROR',
        error:
          'We had trouble saving your subscription with our email service. Please refresh to try again in a moment.',
      });
    }

    const now = new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      const updateToken = db
        .prepare(
          'UPDATE newsletter_verification_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL'
        )
        .run(now, tokenRow.id);

      if (updateToken.changes === 0) {
        db.exec('ROLLBACK');
        return res.status(409).json({
          code: 'ALREADY_USED',
          error: 'This confirmation link has already been used.',
        });
      }

      db.prepare(
        `INSERT INTO newsletter_subscribers (
          email, name, source, status, confirmed_at, unsubscribed_at, resend_contact_id, subscribed_at, updated_at
        ) VALUES (?, ?, ?, 'confirmed', ?, NULL, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = CASE WHEN excluded.name != '' THEN excluded.name ELSE newsletter_subscribers.name END,
          status = 'confirmed',
          confirmed_at = excluded.confirmed_at,
          unsubscribed_at = NULL,
          resend_contact_id = COALESCE(excluded.resend_contact_id, newsletter_subscribers.resend_contact_id),
          updated_at = excluded.updated_at`
      ).run(
        tokenRow.email,
        tokenRow.name,
        tokenRow.source || 'footer',
        now,
        syncRes.contactId,
        now,
        now
      );

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('Newsletter confirmation DB commit error:', err);
      return res.status(500).json({
        code: 'SERVER_ERROR',
        error: 'Unable to finalize your confirmation right now.',
      });
    }

    return res.json({
      confirmed: true,
      email: tokenRow.email,
      message: "You're on the list! Welcome to our little creative corner. 🌿",
    });
  } finally {
    inFlightNewsletterTokens.delete(tokenHash);
  }
});

// ─── Studio Admin Authentication & Protected API ──────────────────────────────

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Please enter the studio password.' });
  }

  const stored = db
    .prepare('SELECT value FROM admin_config WHERE key = ?')
    .get('admin_password_hash') as { value: string } | undefined;

  const envPassword = process.env.ADMIN_PASSWORD;
  const isValid =
    (stored && verifyPassword(password, stored.value)) ||
    (envPassword && envPassword !== 'change-this-studio-password' && password === envPassword);

  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect studio password.' });
  }

  const token = signAdminToken();
  res.cookie('balentine_admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  res.json({ authenticated: true, token });
});

app.get('/api/admin/session', (req, res) => {
  const token = extractBearerToken(req);
  const verified = verifyAdminToken(token);
  const usingDefaultPassword =
    !process.env.ADMIN_PASSWORD &&
    Boolean(
      verifyPassword(
        'balentine-studio',
        (
          db.prepare('SELECT value FROM admin_config WHERE key = ?').get('admin_password_hash') as
            | { value: string }
            | undefined
        )?.value || ''
      )
    );
  res.json({ authenticated: Boolean(verified), usingDefaultPassword });
});

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie('balentine_admin_token', { path: '/' });
  res.json({ ok: true });
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const stored = db
    .prepare('SELECT value FROM admin_config WHERE key = ?')
    .get('admin_password_hash') as { value: string } | undefined;
  if (stored && !verifyPassword(String(currentPassword || ''), stored.value)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  db.prepare(
    'INSERT INTO admin_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).run('admin_password_hash', hashPassword(newPassword), new Date().toISOString());

  res.json({ updated: true });
});

app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided.' });
  }
  res.json({
    imageUrl: `/uploads/artworks/${req.file.filename}`,
    filename: req.file.filename,
  });
});

app.get('/api/admin/artworks', requireAdmin, (_req, res) => {
  res.json(hydrateArtworks(true));
});

app.post('/api/admin/artworks', requireAdmin, (req, res) => {
  const {
    title,
    slug,
    category,
    medium,
    dimensionsSummary,
    year,
    imageUrl,
    description,
    artistNote,
    isFeatured,
    isSoldArchive,
    published,
    variations,
  } = req.body || {};

  if (!title?.trim() || !imageUrl?.trim()) {
    return res.status(400).json({ error: 'Artwork title and image are required.' });
  }

  const cleanSlug =
    String(slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `artwork-${Date.now()}`;

  const now = new Date().toISOString();
  const varList = Array.isArray(variations) ? variations : [];

  db.exec('BEGIN IMMEDIATE');
  try {
    const maxSort = db.prepare('SELECT MAX(sort_order) as m FROM artworks').get() as {
      m: number | null;
    };
    const info = db
      .prepare(
        `INSERT INTO artworks (
          slug, title, category, medium, dimensions_summary, year, image_url,
          description, artist_note, is_featured, is_sold_archive, published, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        cleanSlug,
        title.trim(),
        ['painting', 'aceo', 'sticker'].includes(category) ? category : 'painting',
        String(medium || 'Acrylic on canvas').trim(),
        String(dimensionsSummary || 'Standard').trim(),
        String(year || new Date().getFullYear()).trim(),
        imageUrl.trim(),
        String(description || '').trim(),
        String(artistNote || '').trim(),
        isFeatured ? 1 : 0,
        isSoldArchive ? 1 : 0,
        published !== false ? 1 : 0,
        (maxSort?.m ?? 0) + 1,
        now,
        now
      );

    const artworkId = Number(info.lastInsertRowid);
    const insertVar = db.prepare(
      `INSERT INTO artwork_variations (
        artwork_id, label, option_kind, size, pack_quantity, is_one_of_a_kind, sku, price_cents, stock, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    varList.forEach((v: Record<string, unknown>, idx: number) => {
      insertVar.run(
        artworkId,
        String(v.label || 'Standard Edition').trim(),
        ['original', 'print', 'sticker'].includes(String(v.optionKind))
          ? String(v.optionKind)
          : 'original',
        String(v.size || dimensionsSummary || 'Standard').trim(),
        Math.max(1, Math.floor(Number(v.packQuantity || 1))),
        v.isOneOfAKind ? 1 : 0,
        String(v.sku || `LWT-${artworkId}-${idx + 1}`).trim(),
        Math.max(0, Math.round(Number(v.priceCents || 0))),
        Math.max(0, Math.floor(Number(v.stock ?? 0))),
        idx + 1
      );
    });

    db.exec('COMMIT');
    const created = hydrateArtworks(true).find((a) => a.id === artworkId);
    res.status(201).json(created);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Create artwork error:', err);
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to create artwork.',
    });
  }
});

app.put('/api/admin/artworks/:id', requireAdmin, (req, res) => {
  const artworkId = Number(req.params.id);
  const {
    title,
    slug,
    category,
    medium,
    dimensionsSummary,
    year,
    imageUrl,
    description,
    artistNote,
    isFeatured,
    isSoldArchive,
    published,
    variations,
  } = req.body || {};

  if (!artworkId || !title?.trim() || !imageUrl?.trim()) {
    return res.status(400).json({ error: 'Valid artwork ID, title, and image are required.' });
  }

  const now = new Date().toISOString();
  const varList = Array.isArray(variations) ? variations : [];

  db.exec('BEGIN IMMEDIATE');
  try {
    const updated = db
      .prepare(
        `UPDATE artworks
         SET slug = ?, title = ?, category = ?, medium = ?, dimensions_summary = ?, year = ?,
             image_url = ?, description = ?, artist_note = ?, is_featured = ?, is_sold_archive = ?,
             published = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        String(slug || title)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        title.trim(),
        ['painting', 'aceo', 'sticker'].includes(category) ? category : 'painting',
        String(medium || '').trim(),
        String(dimensionsSummary || '').trim(),
        String(year || '2026').trim(),
        imageUrl.trim(),
        String(description || '').trim(),
        String(artistNote || '').trim(),
        isFeatured ? 1 : 0,
        isSoldArchive ? 1 : 0,
        published !== false ? 1 : 0,
        now,
        artworkId
      );

    if (updated.changes === 0) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Artwork not found.' });
    }

    db.prepare('DELETE FROM artwork_variations WHERE artwork_id = ?').run(artworkId);
    const insertVar = db.prepare(
      `INSERT INTO artwork_variations (
        artwork_id, label, option_kind, size, pack_quantity, is_one_of_a_kind, sku, price_cents, stock, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    varList.forEach((v: Record<string, unknown>, idx: number) => {
      insertVar.run(
        artworkId,
        String(v.label || 'Standard Option').trim(),
        ['original', 'print', 'sticker'].includes(String(v.optionKind))
          ? String(v.optionKind)
          : 'original',
        String(v.size || 'Standard').trim(),
        Math.max(1, Math.floor(Number(v.packQuantity || 1))),
        v.isOneOfAKind ? 1 : 0,
        String(v.sku || `LWT-${artworkId}-${idx + 1}`).trim(),
        Math.max(0, Math.round(Number(v.priceCents || 0))),
        Math.max(0, Math.floor(Number(v.stock ?? 0))),
        idx + 1
      );
    });

    db.exec('COMMIT');
    const refreshed = hydrateArtworks(true).find((a) => a.id === artworkId);
    res.json(refreshed);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Update artwork error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to update artwork.' });
  }
});

app.delete('/api/admin/artworks/:id', requireAdmin, (req, res) => {
  const artworkId = Number(req.params.id);
  const deleted = db.prepare('DELETE FROM artworks WHERE id = ?').run(artworkId);
  if (deleted.changes === 0) {
    return res.status(404).json({ error: 'Artwork not found.' });
  }
  res.json({ deleted: true });
});

app.get('/api/admin/shipping-rates', requireAdmin, (_req, res) => {
  const rates = db.prepare('SELECT * FROM shipping_rates ORDER BY id ASC').all() as unknown as ShippingRateRow[];
  res.json(
    rates.map((r) => ({
      id: r.id,
      name: r.name,
      categoryScope: r.category_scope,
      flatRateCents: r.flat_rate_cents,
      freeAboveCents: r.free_above_cents,
      estimatedDays: r.estimated_days,
      active: Boolean(r.active),
    }))
  );
});

app.put('/api/admin/shipping-rates', requireAdmin, (req, res) => {
  const rates = Array.isArray(req.body?.rates) ? req.body.rates : [];
  db.exec('BEGIN IMMEDIATE');
  try {
    const updateStmt = db.prepare(
      `UPDATE shipping_rates
       SET name = ?, flat_rate_cents = ?, free_above_cents = ?, estimated_days = ?, active = ?
       WHERE id = ?`
    );
    for (const r of rates) {
      updateStmt.run(
        String(r.name || 'Studio Shipping').trim(),
        Math.max(0, Math.round(Number(r.flatRateCents || 0))),
        r.freeAboveCents === null || r.freeAboveCents === '' ? null : Math.max(0, Math.round(Number(r.freeAboveCents))),
        String(r.estimatedDays || '4–7 business days').trim(),
        r.active ? 1 : 0,
        Number(r.id)
      );
    }
    db.exec('COMMIT');
    res.json({ updated: true });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: 'Unable to update shipping rates.' });
  }
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as unknown as Array<
    Record<string, unknown>
  >;
  const items = db.prepare('SELECT * FROM order_items ORDER BY id ASC').all() as unknown as Array<
    Record<string, unknown>
  >;

  const byOrder = new Map<number, Array<Record<string, unknown>>>();
  for (const item of items) {
    const oid = Number(item.order_id);
    const arr = byOrder.get(oid) || [];
    arr.push(item);
    byOrder.set(oid, arr);
  }

  res.json(
    orders.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      shippingAddress: JSON.parse(String(o.shipping_address_json || '{}')),
      subtotalCents: o.subtotal_cents,
      shippingCents: o.shipping_cents,
      shippingRateName: o.shipping_rate_name,
      totalCents: o.total_cents,
      paymentStatus: o.payment_status,
      squarePaymentLinkId: o.square_payment_link_id,
      squareOrderId: o.square_order_id,
      squarePaymentId: o.square_payment_id,
      paidAt: o.paid_at,
      fulfillmentStatus: o.fulfillment_status,
      carrier: o.carrier,
      trackingNumber: o.tracking_number,
      shippedAt: o.shipped_at,
      confirmationEmailStatus: o.confirmation_email_status,
      trackingEmailStatus: o.tracking_email_status,
      notes: o.notes,
      createdAt: o.created_at,
      items: byOrder.get(Number(o.id)) || [],
    }))
  );
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const { fulfillmentStatus, carrier, trackingNumber, sendTrackingEmail } =
    req.body || {};

  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
    | {
        id: number;
        order_number: string;
        customer_name: string;
        customer_email: string;
        subtotal_cents: number;
        shipping_cents: number;
        total_cents: number;
        payment_status: string;
        shipped_at: string | null;
      }
    | undefined;

  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const validStatus = ['unfulfilled', 'packed', 'shipped', 'delivered'].includes(fulfillmentStatus)
    ? fulfillmentStatus
    : 'unfulfilled';

  const shippedAt =
    validStatus === 'shipped' && !existing.shipped_at
      ? new Date().toISOString()
      : existing.shipped_at;

  db.prepare(
    `UPDATE orders
     SET fulfillment_status = ?, carrier = ?, tracking_number = ?, shipped_at = ?
     WHERE id = ?`
  ).run(
    validStatus,
    carrier ? String(carrier).trim() : null,
    trackingNumber ? String(trackingNumber).trim() : null,
    shippedAt,
    orderId
  );

  let emailResult = null;
  if (sendTrackingEmail && existing.payment_status === 'paid') {
    const items = db
      .prepare(
        'SELECT title_snapshot as titleSnapshot, variation_snapshot as variationSnapshot, quantity, unit_price_cents as unitPriceCents FROM order_items WHERE order_id = ?'
      )
      .all(orderId) as unknown as Array<{
      titleSnapshot: string;
      variationSnapshot: string;
      quantity: number;
      unitPriceCents: number;
    }>;

    emailResult = await sendShippingTrackingEmail({
      orderNumber: existing.order_number,
      customerName: existing.customer_name,
      customerEmail: existing.customer_email,
      subtotalCents: existing.subtotal_cents,
      shippingCents: existing.shipping_cents,
      totalCents: existing.total_cents,
      items,
      carrier: carrier ? String(carrier).trim() : null,
      trackingNumber: trackingNumber ? String(trackingNumber).trim() : null,
    });

    db.prepare('UPDATE orders SET tracking_email_status = ? WHERE id = ?').run(
      emailResult.status,
      orderId
    );
  }

  res.json({ updated: true, emailResult });
});

app.get('/api/admin/inquiries', requireAdmin, (_req, res) => {
  const inquiries = db
    .prepare('SELECT * FROM commission_inquiries ORDER BY id DESC')
    .all() as unknown as Array<Record<string, unknown>>;
  const subscribers = db
    .prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC')
    .all() as unknown as Array<Record<string, unknown>>;

  res.json({
    inquiries: inquiries.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      subject: i.subject,
      artType: i.art_type,
      preferredSize: i.preferred_size,
      budgetRange: i.budget_range,
      message: i.message,
      subscribedToUpdates: Boolean(i.subscribed_to_updates),
      emailStatus: i.email_status,
      status: i.status,
      createdAt: i.created_at,
    })),
    subscribers,
  });
});

app.patch('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['new', 'reviewing', 'quoted', 'completed', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid inquiry status.' });
  }
  db.prepare('UPDATE commission_inquiries SET status = ? WHERE id = ?').run(status, id);
  res.json({ updated: true });
});

app.get('/api/admin/integrations-status', requireAdmin, (_req, res) => {
  const templates = getConfiguredTemplateIds();
  res.json({
    database: {
      engine: 'SQLite (WAL ACID Transactions)',
      ready: true,
    },
    square: {
      checkoutConfigured: isSquareConfigured(),
      webhookConfigured: isSquareWebhookConfigured(),
      environment: getSquareEnvironmentName(),
    },
    resendEmail: {
      configured: isResendConfigured(),
      fromConfigured: Boolean(getEmailFromAddress()),
      contactNotificationEmailConfigured: Boolean(getContactNotificationEmail()),
      ownerTemplateConfigured: Boolean(templates.ownerTemplateId),
      customerTemplateConfigured: Boolean(templates.customerTemplateId),
      newsletterContactsConfigured: isResendContactsConfigured(),
      newsletterSegmentConfigured: Boolean(getNewsletterSegmentId()),
      newsletterSender: getNewsletterSenderAddress(),
    },
  });
});

app.get('/api/admin/backup', requireAdmin, (_req, res) => {
  const snapshot = exportDatabaseBackupSnapshot();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="little-wild-things-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.send(JSON.stringify(snapshot, null, 2));
});

// ─── Vite / Static Frontend Serving ───────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Little Wild Things studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
