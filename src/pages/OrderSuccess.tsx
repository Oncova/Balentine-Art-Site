import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MapPin,
  Package,
  Sparkles,
} from 'lucide-react';
import type { OrderRecord } from '../types/shop';
import { formatMoney } from '../types/shop';

type OrderSuccessProps = {
  order: OrderRecord;
  onNavigate: (path: string) => void;
};

// This public logo route is already hosted by your Little Wild Things Worker.
const BRAND_LOGO_URL =
  'https://little-wild-things-api.mahaylabalentine04.workers.dev/brand/lwt-logo.jpg';

export function OrderSuccess({ order, onNavigate }: OrderSuccessProps) {
  const [copied, setCopied] = useState(false);
  const firstName = order.customerName.trim().split(/\s+/)[0] || 'friend';
  const address = order.shippingAddress;

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
    } catch {
      // The order number remains available to select manually.
    }
  }

  return (
    <main className="paper-grain min-h-[80vh] bg-[#FBF8F1] px-4 py-9 text-[#1F241E] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-[1030px] overflow-hidden rounded-[28px] border border-[#DDD4C4] bg-[#FFFDF8] shadow-[0_18px_60px_rgba(36,64,46,0.11)]">
        {/* Woodland celebration header */}
        <section className="relative overflow-hidden bg-[#24402E] px-6 pb-11 pt-9 text-center text-[#FBF8F1] sm:px-10 sm:pb-12 sm:pt-11">
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-5 rotate-[-18deg] font-serif text-5xl text-[#B9C9A9]/35 sm:left-12 sm:text-7xl">✿</span>
          <span aria-hidden="true" className="pointer-events-none absolute right-6 top-12 rotate-[20deg] font-serif text-4xl text-[#E1B077]/65 sm:right-16 sm:text-6xl">✧</span>
          <span aria-hidden="true" className="pointer-events-none absolute bottom-7 left-[14%] font-serif text-2xl text-[#C1D2B6]/40">✦</span>
          <span aria-hidden="true" className="pointer-events-none absolute bottom-6 right-[12%] font-serif text-3xl text-[#D9BA8B]/40">✿</span>

          <img
            src={BRAND_LOGO_URL}
            alt="Little Wild Things botanical cat and flower logo"
            width={112}
            height={112}
            className="relative mx-auto h-28 w-28 rounded-2xl border-4 border-[#F3EADD]/80 object-cover shadow-xl"
          />
          <span className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-[#E5E0CE]/45 bg-[#FFFFFF]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F8F1DF]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Payment confirmed
          </span>
          <h1 className="relative mx-auto mt-5 max-w-3xl font-serif text-3xl leading-tight sm:text-5xl">
            A little wild thing is getting ready, {firstName}!
          </h1>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-7 text-[#E8ECE2] sm:text-base">
            Thank you for giving a little piece of Jorja’s creativity a home.
            Your payment is confirmed, and your art is getting ready for its next adventure.
          </p>
          <p className="relative mt-5 text-xs italic tracking-wide text-[#E9CBA0]">
            a little art, a little wild ✿
          </p>
        </section>

        {/* Receipt and details */}
        <div className="grid gap-6 px-5 py-7 sm:px-9 sm:py-9 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-7">
            <section className="rounded-2xl border border-[#E0D6C6] bg-white p-5 sm:p-6" aria-labelledby="lwt-order-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E7C64]">Your woodland receipt</p>
                  <h2 id="lwt-order-title" className="mt-1 font-serif text-2xl text-[#24402E]">A few little treasures</h2>
                </div>
                <span className="rounded-full bg-[#EDF1E8] px-3 py-1.5 text-xs font-semibold text-[#24402E]">Paid with Square</span>
              </div>

              <div className="mt-5 rounded-xl bg-[#F7F2E9] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#6F7D6E]">Order number</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="max-w-full break-all font-mono text-xs font-semibold text-[#24402E] sm:text-sm">{order.orderNumber}</span>
                  <button
                    type="button"
                    onClick={copyOrderNumber}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#D4C8B7] bg-[#FFFDF8] px-3 text-xs font-medium text-[#24402E] transition hover:bg-[#E9EFE4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24402E]"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {copied ? 'Copied!' : 'Copy number'}
                  </button>
                </div>
              </div>

              <ul className="mt-4 divide-y divide-[#E9E2D7]">
                {order.items.map((item, index) => (
                  <li key={item.id ?? index} className="flex items-start justify-between gap-4 py-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold leading-6 text-[#1F241E]">{item.title_snapshot}</p>
                      <p className="mt-1 text-xs text-[#687368]">{item.variation_snapshot} · Qty {item.quantity}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-[#1F241E]">{formatMoney(item.unit_price_cents * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 border-t border-[#E3D9CA] pt-5 text-sm">
                <div className="flex justify-between"><span className="text-[#5B6458]">Subtotal</span><span className="tabular-nums">{formatMoney(order.subtotalCents)}</span></div>
                <div className="flex items-start justify-between gap-4"><span className="text-[#5B6458]">Shipping <span className="block text-xs text-[#8A8D82]">{order.shippingRateName}</span></span><span className="tabular-nums">{order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}</span></div>
                <div className="flex items-center justify-between border-t border-[#DDD4C4] pt-4"><strong className="font-serif text-xl text-[#24402E]">Total paid</strong><strong className="font-serif text-2xl tabular-nums text-[#24402E]">{formatMoney(order.totalCents)}</strong></div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#DFE4D9] bg-[#EFF3E9] p-5 sm:p-6" aria-label="What happens next">
              <div className="flex items-center gap-2 text-[#24402E]"><Sparkles className="h-5 w-5" aria-hidden="true" /><h2 className="font-serif text-xl">What happens next?</h2></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div><span className="text-xs font-bold text-[#B56A3B]">01</span><p className="mt-1 text-sm font-semibold">Order confirmed</p><p className="mt-1 text-xs leading-5 text-[#5B6458]">Payment received securely through Square.</p></div>
                <div><span className="text-xs font-bold text-[#B56A3B]">02</span><p className="mt-1 text-sm font-semibold">Studio preparation</p><p className="mt-1 text-xs leading-5 text-[#5B6458]">Jorja prepares your artwork for packing.</p></div>
                <div><span className="text-xs font-bold text-[#B56A3B]">03</span><p className="mt-1 text-sm font-semibold">Shipping</p><p className="mt-1 text-xs leading-5 text-[#5B6458]">The studio follows up with shipping details.</p></div>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:col-span-5">
            <section className="rounded-2xl border border-[#DDD4C4] bg-[#F7F2E9] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#24402E]"><MapPin className="h-5 w-5" aria-hidden="true" /><h2 className="font-serif text-xl">Where your art will go</h2></div>
              <address className="mt-4 not-italic text-sm leading-7 text-[#4F574E]">
                <strong className="text-[#1F241E]">{order.customerName}</strong><br />
                {address.line1}<br />
                {address.line2 ? <>{address.line2}<br /></> : null}
                {address.city}, {address.state} {address.postalCode}<br />
                {address.country}
              </address>
            </section>
            <section className="rounded-2xl border border-[#DDD4C4] bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#24402E]"><Mail className="h-5 w-5" aria-hidden="true" /><h2 className="font-serif text-xl">Your confirmation</h2></div>
              <p className="mt-3 text-sm leading-6 text-[#5B6458]">We sent your order details to:</p>
              <p className="mt-2 break-all text-sm font-semibold text-[#24402E]">{order.customerEmail}</p>
            </section>
            <section className="relative overflow-hidden rounded-2xl border border-[#D9D0BE] bg-[#FFF6E9] p-5 sm:p-6">
              <span aria-hidden="true" className="pointer-events-none absolute right-4 top-0 font-serif text-6xl text-[#DDBB90]/50">✿</span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A26943]">A note from the studio</p>
              <p className="relative mt-3 font-serif text-lg italic leading-7 text-[#24402E]">“Every order helps this little creative world grow. Thank you for being part of it.”</p>
              <p className="mt-3 text-sm text-[#6B735F]">— Little Wild Things studio</p>
            </section>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#DDD4C4] bg-[#F6F0E7] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <span className="text-sm italic text-[#6C7769]">Thanks for keeping art a little wild. ✿</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => onNavigate('/gallery')} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#24402E] px-5 py-3 text-sm font-semibold text-[#FBF8F1] transition hover:bg-[#1B3123]">Explore more art <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => onNavigate('/commissions')} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#BFC6B6] bg-[#FFFDF8] px-5 py-3 text-sm font-semibold text-[#24402E] transition hover:bg-[#F0F4EC]">Commission a piece <Package className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </footer>
      </div>
