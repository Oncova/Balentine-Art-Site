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
        <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
          Studio Care &amp; Policies
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1F241E] sm:text-5xl">
          Shipping &amp; Return Policies
        </h1>
        <p className="mt-3 text-base text-[#5B6458]">
          Every painting, ACEO card, and sticker pack leaves the studio carefully protected so it
          arrives ready to enjoy.
        </p>

        {/* Live Configurable Shipping Rates Table */}
        <section className="mt-10">
          <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
            Current Studio Shipping Rates
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#DDD4C4] bg-[#FBF8F1]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#DDD4C4] bg-[#F4EFE4] text-xs uppercase tracking-wider text-[#5B6458]">
                <tr>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Rate</th>
                  <th className="px-4 py-3 font-medium">Free Shipping</th>
                  <th className="px-4 py-3 font-medium">Estimated Transit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD4C4]">
                {shippingRates.map((rate) => (
                  <tr key={rate.id}>
                    <td className="px-4 py-3.5 font-medium text-[#1F241E]">{rate.name}</td>
                    <td className="px-4 py-3.5 tabular-nums text-[#1F241E]">
                      {formatMoney(rate.flatRateCents)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-[#5B6458]">
                      {rate.freeAboveCents !== null
                        ? `Orders ${formatMoney(rate.freeAboveCents)}+`
                        : 'Flat rate'}
                    </td>
                    <td className="px-4 py-3.5 text-[#5B6458]">{rate.estimatedDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <BotanicalDivider className="my-10" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
              Packaging &amp; Dispatch Timing
            </h2>
            <p className="text-sm leading-relaxed text-[#5B6458]">
              Orders ship within 2–4 business days after verified payment confirmation. You will
              receive an order confirmation email immediately upon checkout and a second tracking
              email as soon as the parcel is scanned by the carrier.
            </p>
            <p className="text-sm leading-relaxed text-[#5B6458]">
              Stickers and 2.5 × 3.5 in ACEO cards travel in rigid archival stay-flat mailers with
              moisture-resistant sleeves. Original stretched canvases are wrapped in glassine paper,
              corner-protected, and boxed in double-walled kraft cartons.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
              Returns &amp; Damaged-in-Transit Care
            </h2>
            <p className="text-sm leading-relaxed text-[#5B6458]">
              Prints and unopened sticker packs may be returned within 14 days of delivery in
              original condition. Because one-of-a-kind paintings, original ACEO cards, and custom
              commissions are unique studio works, they are final sale.
            </p>
            <p className="text-sm leading-relaxed text-[#5B6458]">
              If any artwork arrives damaged in transit, please contact Jorja within 7 days with
              photos of the parcel and artwork—we will replace prints/stickers promptly or arrange a
              full refund on damaged originals.
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-6 sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1F241E]">
              Questions about shipping or framing?
            </h3>
            <p className="mt-1 text-sm text-[#5B6458]">
              Send a message through the contact form and Jorja will reply directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/commissions')}
            className="mt-4 min-h-[42px] rounded-lg bg-[#24402E] px-5 py-2 text-sm font-medium text-[#FBF8F1] sm:mt-0 whitespace-nowrap"
          >
            Contact the Studio
          </button>
        </div>
      </div>
    </div>
  );
}
