import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from './auth.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'balentine.db');
export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys & WAL mode for safer concurrent reads/writes
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('painting', 'aceo', 'sticker')),
      medium TEXT NOT NULL,
      dimensions_summary TEXT NOT NULL,
      year TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL,
      artist_note TEXT NOT NULL DEFAULT '',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_sold_archive INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artwork_variations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      option_kind TEXT NOT NULL CHECK(option_kind IN ('original', 'print', 'sticker')),
      size TEXT NOT NULL,
      pack_quantity INTEGER NOT NULL DEFAULT 1,
      is_one_of_a_kind INTEGER NOT NULL DEFAULT 0,
      sku TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shipping_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_scope TEXT NOT NULL CHECK(category_scope IN ('all', 'painting', 'aceo_sticker')),
      flat_rate_cents INTEGER NOT NULL,
      free_above_cents INTEGER,
      estimated_days TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      shipping_rate_name TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending_payment', 'paid', 'failed', 'refunded')),
      square_payment_link_id TEXT,
      square_order_id TEXT,
      square_payment_id TEXT,
      paid_at TEXT,
      fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK(fulfillment_status IN ('unfulfilled', 'packed', 'shipped', 'delivered')),
      carrier TEXT,
      tracking_number TEXT,
      shipped_at TEXT,
      confirmation_email_status TEXT NOT NULL DEFAULT 'not_sent',
      tracking_email_status TEXT NOT NULL DEFAULT 'not_sent',
      mercury_payout_reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      artwork_id INTEGER NOT NULL,
      variation_id INTEGER NOT NULL,
      title_snapshot TEXT NOT NULL,
      variation_snapshot TEXT NOT NULL,
      sku_snapshot TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commission_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      art_type TEXT NOT NULL,
      preferred_size TEXT NOT NULL,
      budget_range TEXT NOT NULL,
      message TEXT NOT NULL,
      subscribed_to_updates INTEGER NOT NULL DEFAULT 0,
      email_status TEXT NOT NULL DEFAULT 'not_sent',
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'quoted', 'completed', 'archived')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'contact_form',
      status TEXT NOT NULL DEFAULT 'confirmed',
      confirmed_at TEXT,
      unsubscribed_at TEXT,
      resend_contact_id TEXT,
      subscribed_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS newsletter_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'footer',
      consent_type TEXT NOT NULL DEFAULT 'initial',
      ip_hash TEXT NOT NULL DEFAULT '',
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_newsletter_tokens_email
      ON newsletter_verification_tokens(email);
  `);

  // Safe migration for any pre-existing SQLite file created before Square columns
  const orderCols = (db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!orderCols.includes('square_payment_link_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN square_payment_link_id TEXT;');
  }
  if (!orderCols.includes('square_order_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN square_order_id TEXT;');
  }
  if (!orderCols.includes('square_payment_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN square_payment_id TEXT;');
  }

  const inquiryCols = (
    db.prepare('PRAGMA table_info(commission_inquiries)').all() as Array<{ name: string }>
  ).map((c) => c.name);
  if (!inquiryCols.includes('email_status')) {
    db.exec("ALTER TABLE commission_inquiries ADD COLUMN email_status TEXT NOT NULL DEFAULT 'not_sent';");
  }
  if (!inquiryCols.includes('subject')) {
    db.exec("ALTER TABLE commission_inquiries ADD COLUMN subject TEXT NOT NULL DEFAULT '';");
  }

  const subscriberCols = (
    db.prepare('PRAGMA table_info(newsletter_subscribers)').all() as Array<{ name: string }>
  ).map((c) => c.name);
  if (!subscriberCols.includes('status')) {
    db.exec("ALTER TABLE newsletter_subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';");
  }
  if (!subscriberCols.includes('confirmed_at')) {
    db.exec('ALTER TABLE newsletter_subscribers ADD COLUMN confirmed_at TEXT;');
  }
  if (!subscriberCols.includes('unsubscribed_at')) {
    db.exec('ALTER TABLE newsletter_subscribers ADD COLUMN unsubscribed_at TEXT;');
  }
  if (!subscriberCols.includes('resend_contact_id')) {
    db.exec('ALTER TABLE newsletter_subscribers ADD COLUMN resend_contact_id TEXT;');
  }
  if (!subscriberCols.includes('updated_at')) {
    db.exec('ALTER TABLE newsletter_subscribers ADD COLUMN updated_at TEXT;');
  }

  db.exec(
    "UPDATE artworks SET artist_note = REPLACE(artist_note, 'Mahayla', 'Jorja') WHERE artist_note LIKE '%Mahayla%';"
  );

  seedInitialData();
}

function seedInitialData() {
  const now = new Date().toISOString();

  // Seed initial admin password hash if none exists
  const existingPw = db.prepare('SELECT value FROM admin_config WHERE key = ?').get('admin_password_hash') as
    | { value: string }
    | undefined;
  if (!existingPw) {
    const initialPass = process.env.ADMIN_PASSWORD || 'balentine-studio';
    db.prepare('INSERT INTO admin_config (key, value, updated_at) VALUES (?, ?, ?)').run(
      'admin_password_hash',
      hashPassword(initialPass),
      now
    );
  }

  // Seed default shipping rates if empty
  const shippingCount = db.prepare('SELECT COUNT(*) as cnt FROM shipping_rates').get() as { cnt: number };
  if (shippingCount.cnt === 0) {
    const insertRate = db.prepare(
      'INSERT INTO shipping_rates (name, category_scope, flat_rate_cents, free_above_cents, estimated_days, active) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertRate.run('Stickers & ACEO Rigid Mailer', 'aceo_sticker', 450, 5000, '3–5 business days', 1);
    insertRate.run('Protected Canvas & Framed Art Parcel', 'painting', 1800, 22000, '5–8 business days', 1);
    insertRate.run('Standard Studio Shipping', 'all', 950, 15000, '4–7 business days', 1);
  }

  // Seed the 14 uploaded artworks if artworks table is empty
  const artworkCount = db.prepare('SELECT COUNT(*) as cnt FROM artworks').get() as { cnt: number };
  if (artworkCount.cnt === 0) {
    const insertArtwork = db.prepare(`
      INSERT INTO artworks (
        slug, title, category, medium, dimensions_summary, year, image_url,
        description, artist_note, is_featured, is_sold_archive, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertVariation = db.prepare(`
      INSERT INTO artwork_variations (
        artwork_id, label, option_kind, size, pack_quantity, is_one_of_a_kind, sku, price_cents, stock, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedCatalog = [
      {
        slug: 'sandhill-cranes-at-sunset',
        title: 'Sandhill Cranes at Sunset',
        category: 'painting',
        medium: 'Acrylic on stretched canvas',
        dimensionsSummary: '16 × 20 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Painting_gallery_1__8cbc3891.PNG',
        description:
          'Two sandhill cranes wade quietly through golden-amber marsh ripples as the evening sun dips below the water horizon.',
        artistNote: 'Painted with layered warm ochre glazes and fine dry-brush water reflections.',
        isFeatured: 1,
        sortOrder: 1,
        variations: [
          {
            label: 'Original Acrylic Painting on Canvas',
            optionKind: 'original',
            size: '16 × 20 in',
            packQuantity: 1,
            isOneOfAKind: 1,
            sku: 'BA-PNT-CRANES-ORIG',
            priceCents: 24000,
            stock: 1,
          },
          {
            label: 'Archival Fine Art Print (8 × 10 in)',
            optionKind: 'print',
            size: '8 × 10 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-CRANES-8X10',
            priceCents: 3200,
            stock: 12,
          },
          {
            label: 'Archival Fine Art Print (11 × 14 in)',
            optionKind: 'print',
            size: '11 × 14 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-CRANES-11X14',
            priceCents: 4800,
            stock: 8,
          },
        ],
      },
      {
        slug: 'cypress-heron-flight',
        title: 'Cypress Heron Flight',
        category: 'painting',
        medium: 'Acrylic on stretched canvas',
        dimensionsSummary: '18 × 24 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Painting_gallery_3d31ccc3.PNG',
        description:
          'A great blue heron glides between moss-draped cypress trunks over deep indigo water and sunlit golden marsh grass.',
        artistNote: 'Inspired by quiet morning walks along southern cypress wetlands.',
        isFeatured: 1,
        sortOrder: 2,
        variations: [
          {
            label: 'Original Acrylic Painting on Canvas',
            optionKind: 'original',
            size: '18 × 24 in',
            packQuantity: 1,
            isOneOfAKind: 1,
            sku: 'BA-PNT-HERON-ORIG',
            priceCents: 28500,
            stock: 1,
          },
          {
            label: 'Archival Fine Art Print (8 × 10 in)',
            optionKind: 'print',
            size: '8 × 10 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-HERON-8X10',
            priceCents: 3200,
            stock: 10,
          },
          {
            label: 'Archival Fine Art Print (12 × 16 in)',
            optionKind: 'print',
            size: '12 × 16 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-HERON-12X16',
            priceCents: 5200,
            stock: 6,
          },
        ],
      },
      {
        slug: 'red-eared-slider-on-cypress-log',
        title: 'Red-Eared Slider on Cypress Log',
        category: 'painting',
        medium: 'Acrylic on stretched canvas',
        dimensionsSummary: '14 × 18 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Turtle_painting_481bae3a.PNG',
        description:
          'A basking pond turtle pauses along a weathered lakeside log surrounded by twilight foliage and dappled reflections.',
        artistNote: 'Rich umber and mossy olive undertones bring out the warm yellow striping on the shell.',
        isFeatured: 1,
        sortOrder: 3,
        variations: [
          {
            label: 'Original Acrylic Painting on Canvas',
            optionKind: 'original',
            size: '14 × 18 in',
            packQuantity: 1,
            isOneOfAKind: 1,
            sku: 'BA-PNT-TURTLE-ORIG',
            priceCents: 19500,
            stock: 1,
          },
          {
            label: 'Archival Fine Art Print (8 × 10 in)',
            optionKind: 'print',
            size: '8 × 10 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-TURTLE-8X10',
            priceCents: 3000,
            stock: 10,
          },
        ],
      },
      {
        slug: 'pond-frog-quartet-aceo',
        title: 'Pond Frog Quartet',
        category: 'aceo',
        medium: 'Watercolor, ink & marker on heavy cardstock',
        dimensionsSummary: '2.5 × 3.5 in (each ACEO)',
        year: '2026',
        imageUrl: '/assets/aistudio/Frog_collection_ACEO_363f2277.JPG',
        description:
          'Four hand-drawn and hand-colored ACEO trading-card miniatures capturing curious pond frogs in blue duckweed water, blush clay, and terracotta.',
        artistNote: 'Signed on the reverse and shipped in crystal-clear archival penny sleeves.',
        isFeatured: 1,
        sortOrder: 4,
        variations: [
          {
            label: 'Original 4-Card ACEO Set (All Four)',
            optionKind: 'original',
            size: '2.5 × 3.5 in (×4)',
            packQuantity: 4,
            isOneOfAKind: 1,
            sku: 'BA-ACEO-FROG-SET',
            priceCents: 5800,
            stock: 1,
          },
          {
            label: 'Mini Art Print Card (Single 2.5 × 3.5 in)',
            optionKind: 'print',
            size: '2.5 × 3.5 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-FROG-MINI',
            priceCents: 1000,
            stock: 15,
          },
        ],
      },
      {
        slug: 'maguro-nigiri-and-rolls-aceo',
        title: 'Maguro Nigiri & Rolls',
        category: 'aceo',
        medium: 'Alcohol marker & archival ink on Bristol',
        dimensionsSummary: '2.5 × 3.5 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Sushi_ACEO2_07ab6865.png',
        description:
          'Playful hand-illustrated ACEO card of salmon rolls, fresh wasabi, and a glistening tuna nigiri resting on a plum tabletop.',
        artistNote: 'One-of-a-kind pocket illustration painted in layered marker and waterproof fineliner.',
        isFeatured: 0,
        sortOrder: 5,
        variations: [
          {
            label: 'Original ACEO Art Card',
            optionKind: 'original',
            size: '2.5 × 3.5 in',
            packQuantity: 1,
            isOneOfAKind: 1,
            sku: 'BA-ACEO-SUSHI2-ORIG',
            priceCents: 2200,
            stock: 1,
          },
          {
            label: '5 × 7 in Archival Desk Print',
            optionKind: 'print',
            size: '5 × 7 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-SUSHI2-5X7',
            priceCents: 1800,
            stock: 15,
          },
        ],
      },
      {
        slug: 'sushi-platter-and-chopsticks-aceo',
        title: 'Sushi Platter & Chopsticks',
        category: 'aceo',
        medium: 'Alcohol marker & archival ink on Bristol',
        dimensionsSummary: '2.5 × 3.5 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Sushi_ACEO_6c677e4c.png',
        description:
          'Cozy overhead study of a red sushi tray, wooden chopsticks, soy dish, and maki trio against a soft periwinkle backdrop.',
        artistNote: 'Pairs wonderfully beside Maguro Nigiri & Rolls for a kitchen nook or desk display.',
        isFeatured: 0,
        sortOrder: 6,
        variations: [
          {
            label: 'Original ACEO Art Card',
            optionKind: 'original',
            size: '2.5 × 3.5 in',
            packQuantity: 1,
            isOneOfAKind: 1,
            sku: 'BA-ACEO-SUSHI1-ORIG',
            priceCents: 2200,
            stock: 1,
          },
          {
            label: '5 × 7 in Archival Desk Print',
            optionKind: 'print',
            size: '5 × 7 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-SUSHI1-5X7',
            priceCents: 1800,
            stock: 15,
          },
        ],
      },
      {
        slug: 'hercules-beetle-ink-sticker',
        title: 'Hercules Beetle Study',
        category: 'sticker',
        medium: 'Weatherproof matte vinyl sticker from original ink drawing',
        dimensionsSummary: '3 × 3.5 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Beetle_sticker_e8885f95.JPG',
        description:
          'Crisp entomological line drawing of a horned Hercules beetle—durable enough for sketchbooks, thermoses, and field journals.',
        artistNote: 'Digitized directly from Jorja’s hand-inked botanical notebook.',
        isFeatured: 1,
        sortOrder: 7,
        variations: [
          {
            label: 'Single Vinyl Sticker (3 in)',
            optionKind: 'sticker',
            size: '3 × 3.5 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-BEETLE-1',
            priceCents: 500,
            stock: 30,
          },
          {
            label: '3-Pack Vinyl Stickers',
            optionKind: 'sticker',
            size: '3 × 3.5 in',
            packQuantity: 3,
            isOneOfAKind: 0,
            sku: 'BA-STK-BEETLE-3',
            priceCents: 1200,
            stock: 15,
          },
          {
            label: '5 × 7 in Botanical Line Print',
            optionKind: 'print',
            size: '5 × 7 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-BEETLE-5X7',
            priceCents: 1600,
            stock: 10,
          },
        ],
      },
      {
        slug: 'avian-fossil-block-print',
        title: 'Avian Fossil Block Print',
        category: 'sticker',
        medium: 'Linocut-style mini print & matte sticker',
        dimensionsSummary: '4 × 5 in / 3 in sticker',
        year: '2026',
        imageUrl: '/assets/aistudio/Dino_sticker_097d4fa1.JPG',
        description:
          'A high-contrast paleontological bird-dinosaur skeleton study carved in textured block-print grain.',
        artistNote: 'One of the studio’s favorite natural-history museum curiosities.',
        isFeatured: 1,
        sortOrder: 8,
        variations: [
          {
            label: 'Matte Vinyl Sticker (3 in)',
            optionKind: 'sticker',
            size: '3 × 3.5 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-DINO-1',
            priceCents: 550,
            stock: 25,
          },
          {
            label: 'Mini Block-Style Card Print (5 × 7 in)',
            optionKind: 'print',
            size: '5 × 7 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-DINO-5X7',
            priceCents: 1800,
            stock: 12,
          },
        ],
      },
      {
        slug: 'desert-scorpion-ink-study',
        title: 'Desert Scorpion Study',
        category: 'sticker',
        medium: 'Weatherproof matte vinyl sticker & ink print',
        dimensionsSummary: '3 × 4 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Scorpion_sticker_96409dd7.PNG',
        description:
          'Clean anatomical pen-and-ink illustration of a poised scorpion with segmented tail and pincers.',
        artistNote: 'Printed on thick satin-matte vinyl with crisp contour lines.',
        isFeatured: 0,
        sortOrder: 9,
        variations: [
          {
            label: 'Single Vinyl Sticker (3 in)',
            optionKind: 'sticker',
            size: '3 × 4 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-SCORPION-1',
            priceCents: 500,
            stock: 28,
          },
          {
            label: '3-Pack Vinyl Stickers',
            optionKind: 'sticker',
            size: '3 × 4 in',
            packQuantity: 3,
            isOneOfAKind: 0,
            sku: 'BA-STK-SCORPION-3',
            priceCents: 1200,
            stock: 14,
          },
        ],
      },
      {
        slug: 'sleepy-loaf-cat-sticker',
        title: 'Sleepy Loaf Cat',
        category: 'sticker',
        medium: 'Clear or matte vinyl sticker from ink line drawing',
        dimensionsSummary: '2.75 × 3 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Cat_sticker_58f89c51.JPG',
        description:
          'Minimalist single-line study of a contented housecat tucked neatly into a warm loaf pose.',
        artistNote: 'Part of the five-piece Woodland Studio Cat Sketch series.',
        isFeatured: 0,
        sortOrder: 10,
        variations: [
          {
            label: 'Single Matte Vinyl Sticker (2.75 in)',
            optionKind: 'sticker',
            size: '2.75 × 3 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT1-1',
            priceCents: 450,
            stock: 35,
          },
          {
            label: 'Complete 5-Cat Studio Sticker Bundle',
            optionKind: 'sticker',
            size: '2.75–3.25 in (×5)',
            packQuantity: 5,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT-ALL5',
            priceCents: 1800,
            stock: 15,
          },
        ],
      },
      {
        slug: 'curled-nap-cat-sticker',
        title: 'Curled Nap Cat (Toe Beans)',
        category: 'sticker',
        medium: 'Matte vinyl sticker from ink line drawing',
        dimensionsSummary: '3 × 2.5 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Cat_sticker2_3f17ba5a.JPG',
        description:
          'Deeply asleep studio cat curled around its paws with a tiny peek of delicate paw pads.',
        artistNote: 'Sketched from life during quiet afternoon studio hours.',
        isFeatured: 0,
        sortOrder: 11,
        variations: [
          {
            label: 'Single Matte Vinyl Sticker (3 in)',
            optionKind: 'sticker',
            size: '3 × 2.5 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT2-1',
            priceCents: 450,
            stock: 32,
          },
          {
            label: '3-Pack Nap Cat Stickers',
            optionKind: 'sticker',
            size: '3 × 2.5 in',
            packQuantity: 3,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT2-3',
            priceCents: 1100,
            stock: 14,
          },
        ],
      },
      {
        slug: 'tucked-moon-cat-sticker',
        title: 'Tucked Moon Cat',
        category: 'sticker',
        medium: 'Matte vinyl sticker from ink line drawing',
        dimensionsSummary: '3 × 2.5 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Cat_sticker3_9ae5c249.JPG',
        description:
          'Graceful crescent silhouette of a dreaming cat tucked nose-to-tail in effortless ink strokes.',
        artistNote: 'A favorite for laptops, ceramic mugs, and watercolor tins.',
        isFeatured: 0,
        sortOrder: 12,
        variations: [
          {
            label: 'Single Matte Vinyl Sticker (3 in)',
            optionKind: 'sticker',
            size: '3 × 2.5 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT3-1',
            priceCents: 450,
            stock: 30,
          },
          {
            label: '3-Pack Moon Cat Stickers',
            optionKind: 'sticker',
            size: '3 × 2.5 in',
            packQuantity: 3,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT3-3',
            priceCents: 1100,
            stock: 12,
          },
        ],
      },
      {
        slug: 'over-the-shoulder-cat-sticker',
        title: 'Over-the-Shoulder Cat',
        category: 'sticker',
        medium: 'Matte vinyl sticker from ink line drawing',
        dimensionsSummary: '2 × 3.5 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Cat_stucker5_aa68366a.JPG',
        description:
          'Minimalist seated cat glancing calmly over its shoulder with a curled tail resting around its paws.',
        artistNote: 'Bold brush-pen contour designed to look crisp on any background.',
        isFeatured: 0,
        sortOrder: 13,
        variations: [
          {
            label: 'Single Matte Vinyl Sticker (3.5 in tall)',
            optionKind: 'sticker',
            size: '2 × 3.5 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT5-1',
            priceCents: 450,
            stock: 28,
          },
          {
            label: '5 × 7 in Minimalist Cat Print',
            optionKind: 'print',
            size: '5 × 7 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-PRT-CAT5-5X7',
            priceCents: 1500,
            stock: 10,
          },
        ],
      },
      {
        slug: 'playful-stretch-cat-sticker',
        title: 'Playful Stretch Cat',
        category: 'sticker',
        medium: 'Matte vinyl sticker from ink line drawing',
        dimensionsSummary: '2.5 × 3.5 in',
        year: '2026',
        imageUrl: '/assets/aistudio/Cat_sticker-gallery_86798da0.PNG',
        description:
          'Playful upside-down stretch study capturing a studio cat reaching out for a gentle chin scratch.',
        artistNote: 'The inspiration behind our subtle studio companion.',
        isFeatured: 1,
        sortOrder: 14,
        variations: [
          {
            label: 'Single Matte Vinyl Sticker (3.5 in)',
            optionKind: 'sticker',
            size: '2.5 × 3.5 in',
            packQuantity: 1,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT4-1',
            priceCents: 450,
            stock: 34,
          },
          {
            label: '3-Pack Stretch Cat Stickers',
            optionKind: 'sticker',
            size: '2.5 × 3.5 in',
            packQuantity: 3,
            isOneOfAKind: 0,
            sku: 'BA-STK-CAT4-3',
            priceCents: 1100,
            stock: 15,
          },
        ],
      },
    ];

    for (const item of seedCatalog) {
      const info = insertArtwork.run(
        item.slug,
        item.title,
        item.category,
        item.medium,
        item.dimensionsSummary,
        item.year,
        item.imageUrl,
        item.description,
        item.artistNote,
        item.isFeatured,
        0,
        1,
        item.sortOrder,
        now,
        now
      );
      const artworkId = Number(info.lastInsertRowid);
      item.variations.forEach((v, idx) => {
        insertVariation.run(
          artworkId,
          v.label,
          v.optionKind,
          v.size,
          v.packQuantity,
          v.isOneOfAKind,
          v.sku,
          v.priceCents,
          v.stock,
          idx + 1
        );
      });
    }
  }
}

export interface DbVariationRow {
  id: number;
  artwork_id: number;
  label: string;
  option_kind: 'original' | 'print' | 'sticker';
  size: string;
  pack_quantity: number;
  is_one_of_a_kind: number;
  sku: string;
  price_cents: number;
  stock: number;
  sort_order: number;
}

export interface DbArtworkRow {
  id: number;
  slug: string;
  title: string;
  category: 'painting' | 'aceo' | 'sticker';
  medium: string;
  dimensions_summary: string;
  year: string;
  image_url: string;
  description: string;
  artist_note: string;
  is_featured: number;
  is_sold_archive: number;
  published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function hydrateArtworks(includeUnpublished = false) {
  const artworkRows = (
    includeUnpublished
      ? db.prepare('SELECT * FROM artworks ORDER BY sort_order ASC, id ASC').all()
      : db.prepare('SELECT * FROM artworks WHERE published = 1 ORDER BY sort_order ASC, id ASC').all()
  ) as unknown as DbArtworkRow[];

  const variationRows = db
    .prepare('SELECT * FROM artwork_variations ORDER BY sort_order ASC, id ASC')
    .all() as unknown as DbVariationRow[];

  const byArtwork = new Map<number, DbVariationRow[]>();
  for (const v of variationRows) {
    const arr = byArtwork.get(v.artwork_id) || [];
    arr.push(v);
    byArtwork.set(v.artwork_id, arr);
  }

  return artworkRows.map((row) => {
    const variations = (byArtwork.get(row.id) || []).map((v) => ({
      id: v.id,
      artworkId: v.artwork_id,
      label: v.label,
      optionKind: v.option_kind,
      size: v.size,
      packQuantity: v.pack_quantity,
      isOneOfAKind: Boolean(v.is_one_of_a_kind),
      sku: v.sku,
      priceCents: v.price_cents,
      stock: v.stock,
      sortOrder: v.sort_order,
    }));

    const totalStock = variations.reduce((sum, v) => sum + v.stock, 0);
    const hasOneOfAKind = variations.some((v) => v.isOneOfAKind);
    const originalSold =
      hasOneOfAKind &&
      variations.filter((v) => v.isOneOfAKind).every((v) => v.stock <= 0);
    const minPriceCents =
      variations.length > 0 ? Math.min(...variations.map((v) => v.priceCents)) : 0;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      medium: row.medium,
      dimensionsSummary: row.dimensions_summary,
      year: row.year,
      imageUrl: row.image_url,
      description: row.description,
      artistNote: row.artist_note,
      isFeatured: Boolean(row.is_featured),
      isSoldArchive: Boolean(row.is_sold_archive) || totalStock === 0,
      published: Boolean(row.published),
      sortOrder: row.sort_order,
      hasOneOfAKind,
      originalSold,
      totalStock,
      minPriceCents,
      variations,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export function exportDatabaseBackupSnapshot() {
  return {
    exportedAt: new Date().toISOString(),
    studio: 'Little Wild Things',
    artworks: hydrateArtworks(true),
    shippingRates: db.prepare('SELECT * FROM shipping_rates ORDER BY id ASC').all(),
    orders: db.prepare('SELECT * FROM orders ORDER BY id DESC').all(),
    orderItems: db.prepare('SELECT * FROM order_items ORDER BY id DESC').all(),
    commissionInquiries: db.prepare('SELECT * FROM commission_inquiries ORDER BY id DESC').all(),
    newsletterSubscribers: db.prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC').all(),
  };
}
