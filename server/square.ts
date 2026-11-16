import crypto from 'node:crypto';
import { SquareClient, SquareEnvironment, WebhooksHelper } from 'square';

export function isSquareConfigured(): boolean {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  return Boolean(
    token &&
      locationId &&
      !token.includes('...') &&
      !locationId.includes('...') &&
      token.trim().length > 10
  );
}

export function isSquareWebhookConfigured(): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  return Boolean(key && !key.includes('...') && key.trim().length > 8);
}

export function getSquareEnvironmentName(): 'sandbox' | 'production' {
  return process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
}

export function getSquareClient(): SquareClient | null {
  if (!isSquareConfigured()) return null;
  return new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN as string,
    environment:
      getSquareEnvironmentName() === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

export interface SquareLineItemInput {
  title: string;
  variationLabel: string;
  unitAmountCents: number;
  quantity: number;
}

export async function createSquarePaymentLink(params: {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: SquareLineItemInput[];
  shippingCents: number;
  shippingLabel: string;
  redirectUrl: string;
}): Promise<{ paymentLinkId: string; checkoutUrl: string; squareOrderId: string }> {
  const client = getSquareClient();
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!client || !locationId) {
    throw new Error('SQUARE_NOT_CONFIGURED');
  }

  const lineItems = params.items.map((item) => ({
    name: `${item.title} (${item.variationLabel})`,
    quantity: String(item.quantity),
    basePriceMoney: {
      amount: BigInt(item.unitAmountCents),
      currency: 'USD' as const,
    },
  }));

  if (params.shippingCents > 0) {
    lineItems.push({
      name: `Shipping (${params.shippingLabel})`,
      quantity: '1',
      basePriceMoney: {
        amount: BigInt(params.shippingCents),
        currency: 'USD' as const,
      },
    });
  }

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey: crypto.randomUUID(),
    order: {
      locationId,
      referenceId: params.orderNumber,
      lineItems,
    },
    checkoutOptions: {
      redirectUrl: params.redirectUrl,
      askForShippingAddress: false,
    },
    prePopulatedData: {
      buyerEmail: params.customerEmail,
    },
    paymentNote: `Little Wild Things Order ${params.orderNumber} (${params.customerName})`,
  });

  const link = response.paymentLink;
  if (!link?.url || !link?.orderId || !link?.id) {
    throw new Error('Square did not return a valid payment link.');
  }

  return {
    paymentLinkId: link.id,
    checkoutUrl: link.url,
    squareOrderId: link.orderId,
  };
}

export async function verifySquareOrderPaid(squareOrderId: string): Promise<{
  paid: boolean;
  paymentId: string | null;
}> {
  const client = getSquareClient();
  if (!client) {
    throw new Error('SQUARE_NOT_CONFIGURED');
  }

  const res = await client.orders.get({ orderId: squareOrderId });
  const order = res.order;
  if (!order) {
    return { paid: false, paymentId: null };
  }

  const tenders = order.tenders || [];
  const netDue = order.netAmountDueMoney?.amount ?? BigInt(1);
  const totalMoney = order.totalMoney?.amount ?? BigInt(0);

  const isPaid =
    tenders.length > 0 &&
    ((totalMoney > BigInt(0) && netDue <= BigInt(0)) || order.state === 'COMPLETED');

  const paymentId = tenders[0]?.paymentId || tenders[0]?.id || null;
  return { paid: Boolean(isPaid), paymentId };
}

export async function verifySquareWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  notificationUrl: string;
}): Promise<boolean> {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) return false;
  return await WebhooksHelper.verifySignature({
    requestBody: params.rawBody,
    signatureHeader: params.signatureHeader,
    signatureKey,
    notificationUrl: params.notificationUrl,
  });
}
