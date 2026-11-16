export type ArtworkCategory = 'painting' | 'aceo' | 'sticker';
export type VariationOptionKind = 'original' | 'print' | 'sticker';

export interface ArtworkVariation {
  id?: number;
  artworkId?: number;
  label: string;
  optionKind: VariationOptionKind;
  size: string;
  packQuantity: number;
  isOneOfAKind: boolean;
  sku: string;
  priceCents: number;
  stock: number;
  sortOrder?: number;
}

export interface Artwork {
  id: number;
  slug: string;
  title: string;
  category: ArtworkCategory;
  medium: string;
  dimensionsSummary: string;
  year: string;
  imageUrl: string;
  description: string;
  artistNote: string;
  isFeatured: boolean;
  isSoldArchive: boolean;
  published: boolean;
  sortOrder: number;
  hasOneOfAKind: boolean;
  originalSold: boolean;
  totalStock: number;
  minPriceCents: number;
  variations: ArtworkVariation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingRate {
  id: number;
  name: string;
  categoryScope: 'all' | 'painting' | 'aceo_sticker';
  flatRateCents: number;
  freeAboveCents: number | null;
  estimatedDays: string;
  active: boolean;
}

export interface CartItem {
  artworkId: number;
  slug: string;
  title: string;
  category: ArtworkCategory;
  imageUrl: string;
  variationId: number;
  variationLabel: string;
  optionKind: VariationOptionKind;
  size: string;
  isOneOfAKind: boolean;
  unitPriceCents: number;
  maxStock: number;
  quantity: number;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  subtotalCents: number;
  shippingCents: number;
  shippingRateName: string;
  totalCents: number;
  paymentStatus: 'pending_payment' | 'paid' | 'failed' | 'refunded';
  squarePaymentLinkId: string | null;
  squareOrderId: string | null;
  squarePaymentId: string | null;
  paidAt: string | null;
  fulfillmentStatus: 'unfulfilled' | 'packed' | 'shipped' | 'delivered';
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  confirmationEmailStatus: string;
  trackingEmailStatus: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    title_snapshot: string;
    variation_snapshot: string;
    sku_snapshot: string;
    unit_price_cents: number;
    quantity: number;
  }>;
}

export interface CommissionInquiry {
  id: number;
  name: string;
  email: string;
  subject?: string;
  artType: string;
  preferredSize: string;
  budgetRange: string;
  message: string;
  subscribedToUpdates: boolean;
  emailStatus?: string;
  status: 'new' | 'reviewing' | 'quoted' | 'completed' | 'archived';
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  name: string;
  source: string;
  status?: string;
  subscribed_at: string;
}

export interface IntegrationsStatus {
  database: { engine: string; ready: boolean };
  square: {
    checkoutConfigured: boolean;
    webhookConfigured: boolean;
    environment: 'sandbox' | 'production';
  };
  resendEmail: {
    configured: boolean;
    fromConfigured: boolean;
    contactNotificationEmailConfigured: boolean;
    ownerTemplateConfigured: boolean;
    customerTemplateConfigured: boolean;
    newsletterContactsConfigured?: boolean;
    newsletterSegmentConfigured?: boolean;
    newsletterSender?: string;
  };
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function categoryDisplayName(category: ArtworkCategory): string {
  switch (category) {
    case 'painting':
      return 'Original Painting';
    case 'aceo':
      return 'ACEO Mini Card';
    case 'sticker':
      return 'Sticker & Print';
  }
}
