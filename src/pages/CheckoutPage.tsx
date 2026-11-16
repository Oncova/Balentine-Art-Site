import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { CartItem, OrderRecord, formatMoney } from '../types/shop';

interface CheckoutPageProps {
  items: CartItem[];
  onClearBag: () => void;
  onRefreshArtworks: () => Promise<void>;
  onNavigate: (path: string) => void;
}

export function CheckoutPage({
  items,
  onClearBag,
  onRefreshArtworks,
  onNavigate,
}: CheckoutPageProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [notes, setNotes] = useState('');

  const [totals, setTotals] = useState<{
    subtotalCents: number;
    shippingCents: number;
    shippingRateName: string;
    estimatedDays: string;
    totalCents: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [squareSetupNotice, setSquareSetupNotice] = useState('');

  // Square return verification state
  const [verifyingOrder, setVerifyingOrder] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState<OrderRecord | null>(null);
  const [canceledNotice, setCanceledNotice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderNumber = params.get('order_number');
    const canceled = params.get('canceled');

    if (canceled) {
      setCanceledNotice(true);
    }

    if (orderNumber) {
      setVerifyingOrder(true);
      fetch(`/api/checkout/verify-order?order_number=${encodeURIComponent(orderNumber)}`)
        .then((res) => res.json())
        .then(async (data) => {
          if (data.verifiedPaid && data.order) {
            setVerifiedOrder(data.order);
            onClearBag();
            await onRefreshArtworks();
          } else {
            setError(
              data.error ||
                'Payment has not been verified yet. Orders are only marked paid once Square confirms settlement.'
            );
          }
        })
        .catch(() => setError('Unable to verify payment status with Square.'))
        .finally(() => setVerifyingOrder(false));
    }
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setTotals(null);
      return;
    }

    fetch('/api/checkout/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({
          artworkId: i.artworkId,
          variationId: i.variationId,
          quantity: i.quantity,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setTotals(data);
      })
      .catch(() => {});
  }, [items]);

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSquareSetupNotice('');

    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          shippingAddress: {
            line1,
            line2,
            city,
            state: stateCode,
            postalCode,
            country,
          },
          notes,
          items: items.map((i) => ({
            artworkId: i.artworkId,
            variationId: i.variationId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'SQUARE_NOT_CONFIGURED') {
          setSquareSetupNotice(data.error);
        } else {
          setError(data.error || 'Unable to start checkout.');
        }
        setSubmitting(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
      } else {
        setError('Square did not return a checkout URL.');
        setSubmitting(false);
      }
    } catch {
      setError('Network error while connecting to checkout.');
      setSubmitting(false);
    }
  };

  if (verifyingOrder) {
    return (
      <div className="paper-grain mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="font-serif text-2xl text-[#1F241E]">
          Verifying your payment confirmation with Square...
        </p>
      </div>
    );
  }

  if (verifiedOrder) {
    return (
      <div className="paper-grain mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-xl border border-[#5E7C64] bg-[#FBF8F1] p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[#24402E]" />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-[#5E7C64]">
                Verified Payment Confirmed
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1F241E]">
                Thank you, {verifiedOrder.customerName}
              </h1>
              <p className="mt-2 text-sm text-[#5B6458]">
                Order <strong className="text-[#1F241E]">{verifiedOrder.orderNumber}</strong> is
                confirmed paid through Square. Your inventory has been reserved and a confirmation
                receipt was processed for {verifiedOrder.customerEmail}.
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-[#DDD4C4] pt-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#5B6458]">
              Order Summary
            </h2>
            <ul className="mt-3 divide-y divide-[#DDD4C4] text-sm">
              {verifiedOrder.items.map((item) => (
                <li key={item.id} className="flex justify-between py-2.5">
                  <span>
                    {item.title_snapshot} —{' '}
                    <span className="text-[#5B6458]">{item.variation_snapshot}</span> (×
                    {item.quantity})
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(item.unit_price_cents * item.quantity)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between py-2.5 text-[#5B6458]">
                <span>Shipping ({verifiedOrder.shippingRateName})</span>
                <span className="tabular-nums">{formatMoney(verifiedOrder.shippingCents)}</span>
              </li>
              <li className="flex justify-between py-3 text-base font-semibold text-[#1F241E]">
                <span>Total Paid</span>
                <span className="tabular-nums">{formatMoney(verifiedOrder.totalCents)}</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/gallery')}
            className="mt-6 min-h-[44px] rounded-lg bg-[#24402E] px-6 py-2.5 text-sm font-medium text-[#FBF8F1]"
          >
            Return to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-grain">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
            Secure Square Checkout
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1F241E]">
            Complete Your Order
          </h1>
        </div>

        {canceledNotice && (
          <div className="mt-6 rounded-lg border border-[#B56A3B] bg-[#F4EFE4] px-4 py-3 text-sm text-[#1F241E]">
            Your Square checkout session was canceled. Your shopping bag items are still saved below.
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-10 text-center">
            <h2 className="font-serif text-2xl font-medium text-[#1F241E]">
              Your shopping bag is empty
            </h2>
            <p className="mt-2 text-sm text-[#5B6458]">
              Add a painting, ACEO card, or sticker pack from the gallery before checking out.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/gallery')}
              className="mt-6 min-h-[44px] rounded-lg bg-[#24402E] px-6 py-2.5 text-sm font-medium text-[#FBF8F1]"
            >
              Explore Gallery
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            <form
              onSubmit={handleCheckout}
              className="space-y-5 rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6 sm:p-8 lg:col-span-7"
            >
              <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
                Shipping &amp; Contact Information
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="chk-name" className="block text-xs font-medium text-[#1F241E]">
                    Full Name *
                  </label>
                  <input
                    id="chk-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="chk-email" className="block text-xs font-medium text-[#1F241E]">
                    Email for Receipt &amp; Tracking *
                  </label>
                  <input
                    id="chk-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="chk-line1" className="block text-xs font-medium text-[#1F241E]">
                  Street Address *
                </label>
                <input
                  id="chk-line1"
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="chk-line2" className="block text-xs font-medium text-[#1F241E]">
                  Apartment / Suite (Optional)
                </label>
                <input
                  id="chk-line2"
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="chk-city" className="block text-xs font-medium text-[#1F241E]">
                    City *
                  </label>
                  <input
                    id="chk-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="chk-state" className="block text-xs font-medium text-[#1F241E]">
                    State / Province *
                  </label>
                  <input
                    id="chk-state"
                    type="text"
                    required
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="chk-zip" className="block text-xs font-medium text-[#1F241E]">
                    Postal Code *
                  </label>
                  <input
                    id="chk-zip"
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="chk-country" className="block text-xs font-medium text-[#1F241E]">
                  Country
                </label>
                <input
                  id="chk-country"
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="chk-notes" className="block text-xs font-medium text-[#1F241E]">
                  Gift Note or Delivery Instructions (Optional)
                </label>
                <textarea
                  id="chk-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 p-3 text-sm"
                />
              </div>

              {squareSetupNotice && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-lg border border-[#B56A3B] bg-[#F4EFE4] p-4 text-sm text-[#1F241E]"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B56A3B]" />
                  <div>
                    <p className="font-medium">Square Account Configuration Needed</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#5B6458]">
                      {squareSetupNotice}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-lg bg-[#9A3412]/10 px-4 py-2.5 text-sm text-[#9A3412]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#24402E] px-6 py-3 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123] disabled:opacity-60"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>
                  {submitting
                    ? 'Connecting to Square...'
                    : `Continue to Square Payment${totals ? ` · ${formatMoney(totals.totalCents)}` : ''}`}
                </span>
              </button>

              <p className="text-center text-xs text-[#5B6458]">
                Card processing is handled securely by Square. Orders are only marked paid after
                Square verifies settlement.
              </p>
            </form>

            {/* Right: Order Totals */}
            <aside className="rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-6 lg:col-span-5">
              <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">Bag Summary</h2>
              <ul className="mt-4 divide-y divide-[#DDD4C4]">
                {items.map((item) => (
                  <li key={item.variationId} className="flex items-center gap-3 py-3">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 shrink-0 rounded border border-[#DDD4C4] object-cover"
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-[#1F241E]">{item.title}</p>
                      <p className="text-xs text-[#5B6458]">
                        {item.variationLabel} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(item.unitPriceCents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {totals && (
                <dl className="mt-4 space-y-2 border-t border-[#DDD4C4] pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#5B6458]">Subtotal</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(totals.subtotalCents)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#5B6458]">
                      Shipping ({totals.shippingRateName})
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {totals.shippingCents === 0 ? 'Free' : formatMoney(totals.shippingCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-xs text-[#5B6458]">
                    <dt>Estimated Transit</dt>
                    <dd>{totals.estimatedDays}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[#DDD4C4] pt-3 text-base font-semibold text-[#1F241E]">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatMoney(totals.totalCents)}</dd>
                  </div>
                </dl>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
