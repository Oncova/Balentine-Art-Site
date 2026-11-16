import { Minus, Plus, Trash2, X } from 'lucide-react';
import { CartItem, formatMoney } from '../types/shop';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (variationId: number, quantity: number) => void;
  onRemoveItem: (variationId: number) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  const subtotalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      <div
        className="fixed inset-0 bg-[#1F241E]/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#DDD4C4] bg-[#FBF8F1] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#DDD4C4] px-6 py-4">
          <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">Your Shopping Bag</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#5B6458] hover:bg-[#F4EFE4] hover:text-[#1F241E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-serif text-xl text-[#1F241E]">Your bag is quiet for now.</p>
              <p className="mt-2 max-w-xs text-sm text-[#5B6458]">
                Explore original acrylic paintings, 2.5 × 3.5 in ACEO cards, and studio stickers in the gallery.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-lg border border-[#24402E] px-5 py-2.5 text-sm font-medium text-[#24402E] hover:bg-[#24402E] hover:text-[#FBF8F1] transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#DDD4C4]">
              {items.map((item) => (
                <li key={item.variationId} className="flex gap-4 py-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 shrink-0 rounded-md border border-[#DDD4C4] bg-[#EFE8DA] object-cover"
                  />

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-lg font-medium leading-snug text-[#1F241E]">
                          {item.title}
                        </h3>
                        <span className="shrink-0 text-sm font-medium text-[#1F241E] tabular-nums">
                          {formatMoney(item.unitPriceCents * item.quantity)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#5B6458]">
                        {item.variationLabel}
                        {item.isOneOfAKind ? ' · One-of-a-Kind' : ''}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-md border border-[#DDD4C4] bg-[#F4EFE4]">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity > 1
                              ? onUpdateQty(item.variationId, item.quantity - 1)
                              : onRemoveItem(item.variationId)
                          }
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center text-[#1F241E] hover:bg-[#EFE8DA]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[28px] text-center text-xs font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.maxStock}
                          onClick={() => onUpdateQty(item.variationId, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center text-[#1F241E] hover:bg-[#EFE8DA] disabled:opacity-35"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.variationId)}
                        aria-label={`Remove ${item.title} from bag`}
                        className="inline-flex items-center gap-1 text-xs text-[#5B6458] hover:text-[#9A3412]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#DDD4C4] bg-[#F4EFE4] px-6 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5B6458]">Subtotal</span>
              <span className="text-base font-semibold text-[#1F241E] tabular-nums">
                {formatMoney(subtotalCents)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5B6458]">
              Shipping rate calculated at checkout based on artwork type.
            </p>
            <button
              type="button"
              onClick={onCheckout}
              className="mt-4 w-full min-h-[44px] rounded-lg bg-[#24402E] px-5 py-3 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123]"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
