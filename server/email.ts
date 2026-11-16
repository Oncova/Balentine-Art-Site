import { Resend } from 'resend';

export interface EmailSendResult {
  configured: boolean;
  sent: boolean;
  provider: 'resend' | 'none';
  status: string;
  messageId?: string;
  errorMessage?: string;
}

export interface ContactInquiryEmailResult {
  configured: boolean;
  contactNotificationEmailConfigured: boolean;
  provider: 'resend' | 'none';
  studioNotified: boolean;
  customerConfirmed: boolean;
  status: string;
  errorMessage?: string;
}

const EMAIL_REGEX = /^[^\s@<>()[\]\\,;:\s@"]+@[^\s@<>()[\]\\,;:\s@"]+\.[^\s@<>()[\]\\,;:\s@"]{2,}$/;

export function isValidEmailAddress(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  if (/[\r\n\0]/.test(trimmed)) return false;
  return EMAIL_REGEX.test(trimmed);
}

export function sanitizeSingleLineText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\0\r\n\t]+/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultilineText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMessageForTemplate(rawMessage: string): string {
  const normalized = sanitizeMultilineText(rawMessage, 5000);
  return escapeHtml(normalized).replace(/\n/g, '<br />');
}

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  return Boolean(key && key !== 're_...');
}

export function isResendContactsConfigured(): boolean {
  const key = process.env.RESEND_CONTACTS_API_KEY?.trim();
  return Boolean(key && key !== 're_...');
}

export function getNewsletterSegmentId(): string | null {
  const seg = process.env.RESEND_NEWSLETTER_SEGMENT_ID?.trim();
  if (!seg || seg === 'seg_...' || seg === 'your-segment-id') return null;
  return seg;
}

export function getNewsletterSenderAddress(): string {
  return 'Jorja | Little Wild Things <wildlittlethings@zuldeira.com>';
}

export function getEmailFromAddress(): string | null {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from || from === 'Little Wild Things <hello@example.com>') return null;
  return from;
}

export function getContactNotificationEmail(): string | null {
  const candidate = process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || '';
  if (!candidate || candidate === 'owner@example.com') return null;
  return isValidEmailAddress(candidate) ? candidate : null;
}

export function getConfiguredTemplateIds(): {
  ownerTemplateId: string | null;
  customerTemplateId: string | null;
} {
  return {
    ownerTemplateId: process.env.RESEND_OWNER_TEMPLATE_ID?.trim() || null,
    customerTemplateId: process.env.RESEND_CUSTOMER_TEMPLATE_ID?.trim() || null,
  };
}

// Cache discovered published Resend template IDs briefly when template env vars use aliases
let cachedTemplates: {
  fetchedAt: number;
  ownerId: string | null;
  customerId: string | null;
} | null = null;

async function resolveResendTemplateId(
  resend: Resend,
  kind: 'owner' | 'customer'
): Promise<string> {
  const { ownerTemplateId, customerTemplateId } = getConfiguredTemplateIds();
  if (kind === 'owner' && ownerTemplateId) return ownerTemplateId;
  if (kind === 'customer' && customerTemplateId) return customerTemplateId;

  const now = Date.now();
  if (!cachedTemplates || now - cachedTemplates.fetchedAt > 5 * 60 * 1000) {
    let ownerId: string | null = null;
    let customerId: string | null = null;

    try {
      const listRes = await resend.templates.list({ limit: 50 });
      const templates = listRes.data?.data || [];
      const published = templates.filter((t) => t.status === 'published');

      const findMatch = (patterns: string[]) =>
        published.find((t) => {
          const alias = (t.alias || '').toLowerCase();
          const name = (t.name || '').toLowerCase();
          return patterns.some((p) => alias === p || name === p || alias.includes(p) || name.includes(p));
        });

      ownerId =
        findMatch(['owner-notification', 'owner_notification', 'owner notification', 'owner'])?.id ||
        null;
      customerId =
        findMatch([
          'customer-confirmation',
          'customer_confirmation',
          'customer confirmation',
          'confirmation',
          'customer',
        ])?.id || null;
    } catch {
      // Restricted send-only keys cannot call templates.list; fall back to published aliases
    }

    cachedTemplates = { fetchedAt: now, ownerId, customerId };
  }

  if (kind === 'owner') {
    return cachedTemplates.ownerId || 'owner-notification';
  }
  return cachedTemplates.customerId || 'customer-confirmation';
}

async function deliverResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  if (!isResendConfigured()) {
    return {
      configured: false,
      sent: false,
      provider: 'none',
      status: 'resend_not_configured',
    };
  }

  const fromAddress = getEmailFromAddress() || 'Little Wild Things <onboarding@resend.dev>';

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.replyTo && isValidEmailAddress(params.replyTo)
        ? { replyTo: params.replyTo }
        : {}),
    });

    if (error) {
      console.error('Resend email error:', error);
      return {
        configured: true,
        sent: false,
        provider: 'resend',
        status: 'send_failed',
        errorMessage: error.message,
      };
    }

    return {
      configured: true,
      sent: true,
      provider: 'resend',
      status: 'sent',
      messageId: data?.id,
    };
  } catch (err) {
    console.error('Resend delivery exception:', err);
    return {
      configured: true,
      sent: false,
      provider: 'resend',
      status: 'send_failed',
      errorMessage: err instanceof Error ? err.message : 'Resend request failed',
    };
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface ContactInquiryEmailContext {
  inquiryId: number;
  name: string;
  email: string;
  subject: string;
  artType: string;
  preferredSize: string;
  budgetRange: string;
  message: string;
  subscribeToUpdates: boolean;
}

export async function sendContactInquiryEmails(
  inquiry: ContactInquiryEmailContext
): Promise<ContactInquiryEmailResult> {
  const contactNotificationEmail = getContactNotificationEmail();
  const validCustomerEmail = isValidEmailAddress(inquiry.email) ? inquiry.email.trim() : null;

  if (!validCustomerEmail) {
    return {
      configured: isResendConfigured(),
      contactNotificationEmailConfigured: Boolean(contactNotificationEmail),
      provider: isResendConfigured() ? 'resend' : 'none',
      studioNotified: false,
      customerConfirmed: false,
      status: 'invalid_customer_email',
      errorMessage: 'Customer email failed validation.',
    };
  }

  if (!isResendConfigured()) {
    return {
      configured: false,
      contactNotificationEmailConfigured: Boolean(contactNotificationEmail),
      provider: 'none',
      studioNotified: false,
      customerConfirmed: false,
      status: 'resend_not_configured',
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const explicitFrom = getEmailFromAddress();

  const safeName = escapeHtml(sanitizeSingleLineText(inquiry.name, 120));
  const safeEmail = escapeHtml(validCustomerEmail);
  const safeSubject = escapeHtml(sanitizeSingleLineText(inquiry.subject, 200));
  const safeMessage = formatMessageForTemplate(inquiry.message);

  const templateVariables: Record<string, string> = {
    CUSTOMER_NAME: safeName,
    CUSTOMER_EMAIL: safeEmail,
    SUBJECT: safeSubject,
    MESSAGE: safeMessage,
  };

  let studioNotified = false;
  let customerConfirmed = false;
  let lastError: string | undefined;

  // 1. Send published Resend owner-notification template to CONTACT_NOTIFICATION_EMAIL with Reply-To = customer email
  if (contactNotificationEmail) {
    try {
      const ownerTemplateId = await resolveResendTemplateId(resend, 'owner');
      const { error } = await resend.emails.send({
        ...(explicitFrom ? { from: explicitFrom } : {}),
        to: [contactNotificationEmail],
        replyTo: validCustomerEmail,
        template: {
          id: ownerTemplateId,
          variables: templateVariables,
        },
      });
      if (error) {
        console.error('Resend owner-notification template error:', error);
        lastError = error.message;
      } else {
        studioNotified = true;
      }
    } catch (err) {
      console.error('Resend owner-notification exception:', err);
      lastError = err instanceof Error ? err.message : 'Failed to send owner notification.';
    }
  } else {
    lastError = 'CONTACT_NOTIFICATION_EMAIL environment variable is not configured.';
  }

  // 2. Send separate published Resend customer confirmation template to customer
  try {
    const customerTemplateId = await resolveResendTemplateId(resend, 'customer');
    const { error } = await resend.emails.send({
      ...(explicitFrom ? { from: explicitFrom } : {}),
      to: [validCustomerEmail],
      ...(contactNotificationEmail ? { replyTo: contactNotificationEmail } : {}),
      template: {
        id: customerTemplateId,
        variables: templateVariables,
      },
    });
    if (error) {
      console.error('Resend customer-confirmation template error:', error);
      lastError = lastError || error.message;
    } else {
      customerConfirmed = true;
    }
  } catch (err) {
    console.error('Resend customer-confirmation exception:', err);
    lastError =
      lastError || (err instanceof Error ? err.message : 'Failed to send customer confirmation.');
  }

  let status = 'send_failed';
  if (studioNotified && customerConfirmed) {
    status = 'resend_sent';
  } else if (studioNotified) {
    status = 'resend_owner_only';
  } else if (customerConfirmed && !contactNotificationEmail) {
    status = 'resend_customer_only_missing_notification_email';
  } else if (customerConfirmed) {
    status = 'resend_customer_only';
  } else if (!contactNotificationEmail) {
    status = 'contact_notification_email_not_configured';
  }

  return {
    configured: true,
    contactNotificationEmailConfigured: Boolean(contactNotificationEmail),
    provider: 'resend',
    studioNotified,
    customerConfirmed,
    status,
    errorMessage: lastError,
  };
}

export interface OrderEmailContext {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: Array<{
    titleSnapshot: string;
    variationSnapshot: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  carrier?: string | null;
  trackingNumber?: string | null;
}

export async function sendOrderConfirmationEmail(order: OrderEmailContext): Promise<EmailSendResult> {
  const safeCustomerName = escapeHtml(order.customerName);
  const linesHtml = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #DDD4C4;">${escapeHtml(item.titleSnapshot)} — <span style="color:#5B6458;">${escapeHtml(item.variationSnapshot)}</span> (×${item.quantity})</td>
          <td style="padding:8px 0;border-bottom:1px solid #DDD4C4;text-align:right;">${formatCents(item.unitPriceCents * item.quantity)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:Georgia,serif;background:#FBF8F1;color:#1F241E;padding:32px;max-width:600px;margin:0 auto;border:1px solid #DDD4C4;">
      <h1 style="font-size:28px;margin:0 0 8px;color:#24402E;">Little Wild Things</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#5B6458;margin:0 0 24px;">Order Confirmation · ${escapeHtml(order.orderNumber)}</p>
      <p style="font-family:sans-serif;font-size:15px;line-height:1.6;">
        Dear ${safeCustomerName}, thank you for collecting from Little Wild Things. Your payment has been verified through Square and your artwork is being prepared with protective archival packaging.
      </p>
      <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;margin:20px 0;">
        ${linesHtml}
        <tr>
          <td style="padding:8px 0;color:#5B6458;">Shipping</td>
          <td style="padding:8px 0;text-align:right;">${formatCents(order.shippingCents)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-weight:bold;">Total Paid</td>
          <td style="padding:10px 0;font-weight:bold;text-align:right;">${formatCents(order.totalCents)}</td>
        </tr>
      </table>
      <p style="font-family:sans-serif;font-size:13px;color:#5B6458;">
        You will receive another email with carrier tracking details as soon as your parcel leaves the studio.
      </p>
    </div>
  `;

  return deliverResendEmail({
    to: order.customerEmail,
    subject: `Little Wild Things — Order ${order.orderNumber} Confirmed`,
    html,
    text: `Thank you ${order.customerName}! Your Little Wild Things order ${order.orderNumber} (${formatCents(order.totalCents)}) is confirmed.`,
    replyTo: getContactNotificationEmail() || undefined,
  });
}

export async function sendShippingTrackingEmail(order: OrderEmailContext): Promise<EmailSendResult> {
  const html = `
    <div style="font-family:Georgia,serif;background:#FBF8F1;color:#1F241E;padding:32px;max-width:600px;margin:0 auto;border:1px solid #DDD4C4;">
      <h1 style="font-size:28px;margin:0 0 8px;color:#24402E;">Little Wild Things</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#5B6458;margin:0 0 24px;">Your artwork has shipped · ${escapeHtml(order.orderNumber)}</p>
      <p style="font-family:sans-serif;font-size:15px;line-height:1.6;">
        Hello ${escapeHtml(order.customerName)}, your Little Wild Things parcel is on its way!
      </p>
      <div style="background:#F4EFE4;padding:16px;border:1px solid #DDD4C4;font-family:sans-serif;font-size:14px;margin:20px 0;">
        <div><strong>Carrier:</strong> ${escapeHtml(order.carrier || 'Standard Post')}</div>
        <div style="margin-top:6px;"><strong>Tracking Number:</strong> ${escapeHtml(order.trackingNumber || 'Pending')}</div>
      </div>
      <p style="font-family:sans-serif;font-size:13px;color:#5B6458;">
        Thank you for supporting independent woodland art.
      </p>
    </div>
  `;

  return deliverResendEmail({
    to: order.customerEmail,
    subject: `Little Wild Things — Order ${order.orderNumber} Shipped`,
    html,
    text: `Hello ${order.customerName}, your Little Wild Things order ${order.orderNumber} shipped via ${order.carrier || 'Carrier'}. Tracking: ${order.trackingNumber || 'Pending'}.`,
    replyTo: getContactNotificationEmail() || undefined,
  });
}

export interface NewsletterContactState {
  configured: boolean;
  exists: boolean;
  unsubscribed: boolean;
  inTargetSegment: boolean;
  contactId: string | null;
  errorMessage?: string;
}

function isResendNotFoundError(err: { statusCode?: number | null; name?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.statusCode === 404) return true;
  const name = (err.name || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();
  return name.includes('not_found') || msg.includes('not found');
}

export async function getNewsletterContactState(email: string): Promise<NewsletterContactState> {
  const segmentId = getNewsletterSegmentId();
  if (!isResendContactsConfigured() || !segmentId) {
    return {
      configured: false,
      exists: false,
      unsubscribed: false,
      inTargetSegment: false,
      contactId: null,
    };
  }

  try {
    const resendContacts = new Resend(process.env.RESEND_CONTACTS_API_KEY!.trim());
    const contactRes = await resendContacts.contacts.get({ email });

    if (contactRes.error) {
      if (isResendNotFoundError(contactRes.error)) {
        return {
          configured: true,
          exists: false,
          unsubscribed: false,
          inTargetSegment: false,
          contactId: null,
        };
      }
      return {
        configured: true,
        exists: false,
        unsubscribed: false,
        inTargetSegment: false,
        contactId: null,
        errorMessage: contactRes.error.message || 'Unable to check contact status in Resend.',
      };
    }

    const contact = contactRes.data;
    if (!contact) {
      return {
        configured: true,
        exists: false,
        unsubscribed: false,
        inTargetSegment: false,
        contactId: null,
      };
    }

    let inTargetSegment = false;
    const segmentsRes = await resendContacts.contacts.segments.list({ email });
    if (segmentsRes.error) {
      if (!isResendNotFoundError(segmentsRes.error)) {
        return {
          configured: true,
          exists: true,
          unsubscribed: Boolean(contact.unsubscribed),
          inTargetSegment: false,
          contactId: contact.id,
          errorMessage: segmentsRes.error.message || 'Unable to verify contact segments in Resend.',
        };
      }
    } else {
      const segs = segmentsRes.data?.data || [];
      inTargetSegment = segs.some((s) => s.id === segmentId);
    }

    return {
      configured: true,
      exists: true,
      unsubscribed: Boolean(contact.unsubscribed),
      inTargetSegment,
      contactId: contact.id,
    };
  } catch (err) {
    return {
      configured: true,
      exists: false,
      unsubscribed: false,
      inTargetSegment: false,
      contactId: null,
      errorMessage: err instanceof Error ? err.message : 'Resend Contacts lookup failed.',
    };
  }
}

export interface UpsertConfirmedNewsletterContactResult {
  configured: boolean;
  synced: boolean;
  contactId: string | null;
  wasUnsubscribed: boolean;
  errorMessage?: string;
}

export async function upsertConfirmedNewsletterContact(params: {
  email: string;
  name?: string;
}): Promise<UpsertConfirmedNewsletterContactResult> {
  const segmentId = getNewsletterSegmentId();
  if (!isResendContactsConfigured() || !segmentId) {
    return {
      configured: false,
      synced: false,
      contactId: null,
      wasUnsubscribed: false,
      errorMessage:
        'Resend newsletter configuration is incomplete (RESEND_CONTACTS_API_KEY and/or RESEND_NEWSLETTER_SEGMENT_ID missing).',
    };
  }

  const email = params.email.trim().toLowerCase();
  const cleanFirstName = sanitizeSingleLineText(params.name || '', 80);

  try {
    const resendContacts = new Resend(process.env.RESEND_CONTACTS_API_KEY!.trim());
    const existingRes = await resendContacts.contacts.get({ email });

    if (existingRes.error && !isResendNotFoundError(existingRes.error)) {
      return {
        configured: true,
        synced: false,
        contactId: null,
        wasUnsubscribed: false,
        errorMessage: existingRes.error.message || 'Unable to look up subscriber in Resend.',
      };
    }

    if (!existingRes.data) {
      const createRes = await resendContacts.contacts.create({
        email,
        unsubscribed: false,
        ...(cleanFirstName ? { firstName: cleanFirstName } : {}),
        segments: [{ id: segmentId }],
      });

      if (createRes.error || !createRes.data?.id) {
        return {
          configured: true,
          synced: false,
          contactId: null,
          wasUnsubscribed: false,
          errorMessage: createRes.error?.message || 'Unable to create contact in Resend.',
        };
      }

      return {
        configured: true,
        synced: true,
        contactId: createRes.data.id,
        wasUnsubscribed: false,
      };
    }

    const existing = existingRes.data;
    const wasUnsubscribed = Boolean(existing.unsubscribed);

    // Explicitly restore subscription only after user clicked fresh verification link
    if (wasUnsubscribed || (cleanFirstName && !existing.first_name)) {
      const updateRes = await resendContacts.contacts.update({
        email,
        unsubscribed: false,
        ...(cleanFirstName && !existing.first_name ? { firstName: cleanFirstName } : {}),
      });

      if (updateRes.error) {
        return {
          configured: true,
          synced: false,
          contactId: existing.id,
          wasUnsubscribed,
          errorMessage: updateRes.error.message || 'Unable to update contact consent in Resend.',
        };
      }
    }

    const listSegmentsRes = await resendContacts.contacts.segments.list({ email });
    const alreadyInSegment =
      !listSegmentsRes.error &&
      Boolean(listSegmentsRes.data?.data?.some((seg) => seg.id === segmentId));

    if (!alreadyInSegment) {
      const addSegRes = await resendContacts.contacts.segments.add({
        email,
        segmentId,
      });
      if (addSegRes.error) {
        return {
          configured: true,
          synced: false,
          contactId: existing.id,
          wasUnsubscribed,
          errorMessage: addSegRes.error.message || 'Unable to add contact to newsletter segment.',
        };
      }
    }

    return {
      configured: true,
      synced: true,
      contactId: existing.id,
      wasUnsubscribed,
    };
  } catch (err) {
    return {
      configured: true,
      synced: false,
      contactId: null,
      wasUnsubscribed: false,
      errorMessage: err instanceof Error ? err.message : 'Resend Contacts request failed.',
    };
  }
}

export async function sendNewsletterConfirmationEmail(params: {
  to: string;
  confirmUrl: string;
  expiresInHours: number;
  isResubscribe?: boolean;
}): Promise<EmailSendResult> {
  if (!isResendConfigured()) {
    return {
      configured: false,
      sent: false,
      provider: 'none',
      status: 'resend_not_configured',
    };
  }

  const safeUrl = escapeHtml(params.confirmUrl);
  const heading = params.isResubscribe
    ? 'Welcome back to Little Wild Things'
    : 'Confirm your studio notes subscription';
  const intro = params.isResubscribe
    ? 'You asked to rejoin Jorja’s studio updates and new art drop list. Because you previously unsubscribed, we only restore your subscription when you explicitly confirm below.'
    : 'Thank you for wanting to hear from Jorja’s studio. Please confirm your email address so we can share studio notes, original paintings, ACEO mini art cards, and sticker drops with you.';
  const subject = params.isResubscribe
    ? 'Confirm to rejoin Little Wild Things studio notes 🌿'
    : 'Confirm your Little Wild Things subscription 🌿';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4EFE4;color:#1F241E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F4EFE4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background-color:#FBF8F1;border:1px solid #DDD4C4;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #DDD4C4;background-color:#FBF8F1;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#5E7C64;font-weight:600;">
                Little Wild Things · Woodland Art Studio
              </p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:600;color:#24402E;">
                ${escapeHtml(heading)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 24px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#1F241E;">
                ${escapeHtml(intro)}
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="border-radius:8px;background-color:#24402E;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#FBF8F1;text-decoration:none;border-radius:8px;">
                      Confirm my subscription
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#5B6458;">
                This confirmation link is unique to you, can only be used once, and expires in ${params.expiresInHours} hours.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#5B6458;">
                If the button doesn’t open, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:#24402E;">
                <a href="${safeUrl}" style="color:#24402E;text-decoration:underline;">${safeUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #DDD4C4;background-color:#F4EFE4;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#5B6458;">
                Didn’t request studio notes from Little Wild Things? You can safely ignore this message — you won’t be added unless you click the confirmation button above.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#5B6458;">
                Sent by Jorja · Little Wild Things · You can unsubscribe anytime in one click from any studio update.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = [
    heading,
    '',
    intro,
    '',
    `Confirm your subscription: ${params.confirmUrl}`,
    '',
    `This link is single-use and expires in ${params.expiresInHours} hours.`,
    'If you did not request this email, simply ignore it and you will not be subscribed.',
    '',
    '— Jorja | Little Wild Things',
  ].join('\n');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const { data, error } = await resend.emails.send({
      from: getNewsletterSenderAddress(),
      to: [params.to],
      subject,
      html,
      text,
      replyTo: getContactNotificationEmail() || 'wildlittlethings@zuldeira.com',
    });

    if (error) {
      console.error('Resend newsletter confirmation error:', error);
      return {
        configured: true,
        sent: false,
        provider: 'resend',
        status: 'send_failed',
        errorMessage: error.message,
      };
    }

    return {
      configured: true,
      sent: true,
      provider: 'resend',
      status: 'sent',
      messageId: data?.id,
    };
  } catch (err) {
    console.error('Resend newsletter confirmation exception:', err);
    return {
      configured: true,
      sent: false,
      provider: 'resend',
      status: 'send_failed',
      errorMessage: err instanceof Error ? err.message : 'Resend request failed',
    };
  }
}
