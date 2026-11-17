import { ShippingRate, formatMoney } from '../types/shop';
import { BotanicalDivider } from '../components/BotanicalDecor';

interface PoliciesPageProps {
  shippingRates: ShippingRate[];
  onNavigate: (path: string) => void;
}

export function PoliciesPage({ shippingRates, onNavigate }: PoliciesPageProps) {
  return (
    <div className="paper-grain">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-widest text-[#5E7C64]">Studio care &amp; policies</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1F241E] sm:text-5xl">Shipping &amp; Return Policies</h1>
        <p className="mt-3 text-base leading-7 text-[#5B6458]">
          Every little wild thing leaves the studio carefully packed and protected. Shipping prices depend on the
          artwork's size and packaging needs; custom work follows a separate creation timeline.
        </p>
        <section className="mt-9 rounded-2xl border border-[#DDD4C4] bg-[#FBF8F1] p-5 sm:p-7">
          <h2 className="font-serif text-2xl font-semibold text-[#24402E]">Ready-to-ship artwork</h2>
          <p className="mt-2 text-sm leading-7 text-[#5B6458]">
            In-stock pieces are ordinarily prepared for dispatch within 2–4 business days after confirmed payment.
            Carrier transit time begins after dispatch, not when you place the order. Larger paintings can take longer
            to protect and package. We'll email you when your parcel has been shipped.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-[#DDD4C4]">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[#F4EFE4] text-xs uppercase tracking-wide text-[#5B6458]"><tr>
                <th className="px-4 py-3 font-medium">Size &amp; packaging</th>
                <th className="px-4 py-3 font-medium">Shipping charge</th>
                <th className="px-4 py-3 font-medium">Estimated transit</th>
              </tr></thead>
              <tbody className="divide-y divide-[#DDD4C4] bg-white">
                {shippingRates.map(r => <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-[#1F241E]">{r.name}</td>
                  <td className="px-4 py-3 tabular-nums text-[#24402E]">{formatMoney(r.flatRateCents)}</td>
                  <td className="px-4 py-3 text-[#5B6458]">{r.estimatedDays}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#5B6458]">
            These rates are estimates for the contiguous United States. Multiple artworks may require separate protective packages.
            Alaska, Hawaii, unusually large or framed artwork, and special shipping arrangements need a studio quote before payment.
            We do not offer international checkout at this time.
          </p>
        </section>
        <section className="mt-7 rounded-2xl border border-[#C9D7C2] bg-[#F0F3E8] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#658064]">Special request orders</p>
          <h2 className="mt-2 font-serif text-2xl text-[#24402E]">Created just for you takes a little longer</h2>
          <p className="mt-3 text-sm leading-7 text-[#4E5A4B]">
            Custom commissions, personalized illustrations, and made-to-order pieces are <strong>not covered by the
            in-stock dispatch timeframe</strong>. Because each piece is created to your specifications, Jorja will
            confirm the artwork price, production schedule, shipping cost, and estimated completion date in a quote
            before accepting payment. Requested deadlines are considered but are not guaranteed until confirmed in writing.
          </p>
          <button type="button" onClick={() => onNavigate('/commissions')} className="mt-5 min-h-[44px] rounded-xl bg-[#24402E] px-5 py-3 text-sm font-semibold text-white">Request custom artwork</button>
        </section>
        <BotanicalDivider className="my-9" />
        <div className="grid gap-7 md:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">Packaging &amp; care</h2>
            <p className="text-sm leading-7 text-[#5B6458]">Stickers and small ACEO art cards are protected in rigid mailers or other suitable packaging. Larger flat prints and stretched canvases require different protective materials and boxes; shipping rates therefore depend on size.</p>
            <p className="text-sm leading-7 text-[#5B6458]">For questions about a specific size, framing, combined shipments, or gift deadlines, contact the studio before checkout.</p>
          </section>
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">Returns &amp; shipping damage</h2>
            <p className="text-sm leading-7 text-[#5B6458]">Prints and unopened sticker packs may be returned within 14 days of delivery in their original condition. One-of-a-kind original art and approved custom commissions are normally final sale, except where the law requires otherwise.</p>
            <p className="text-sm leading-7 text-[#5B6458]">If your artwork arrives damaged, contact the studio within 7 days with pictures of the packaging and artwork so Jorja can help resolve it.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
