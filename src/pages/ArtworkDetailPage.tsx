import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Maximize2, Minus, Plus, X } from 'lucide-react';
import { Artwork, ArtworkVariation, categoryDisplayName, formatMoney } from '../types/shop';
import { BotanicalDivider } from '../components/BotanicalDecor';

interface ArtworkDetailPageProps {
  artwork: Artwork | undefined;
  loading: boolean;
  onNavigate: (path: string) => void;
  onAddToBag: (artwork: Artwork, variation: ArtworkVariation, quantity: number) => void;
}

export function ArtworkDetailPage({
  artwork,
  loading,
  onNavigate,
  onAddToBag,
}: ArtworkDetailPageProps) {
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (artwork && artwork.variations.length > 0) {
      const firstInStock =
        artwork.variations.find((v) => v.stock > 0) || artwork.variations[0];
      setSelectedVariationId(firstInStock.id ?? null);
      setQuantity(1);
      setAddedFeedback(false);
    }
  }, [artwork]);

  if (loading) {
    return (
      <div className="paper-grain mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-xl bg-[#EFE8DA]" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="paper-grain mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-[#1F241E]">Artwork not found</h1>
        <p className="mt-2 text-sm text-[#5B6458]">
          This piece may have been moved or unpublished.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/gallery')}
          className="mt-6 rounded-lg bg-[#24402E] px-5 py-2.5 text-sm font-medium text-[#FBF8F1]"
        >
          Return to Gallery
        </button>
      </div>
    );
  }

  const selectedVariation =
    artwork.variations.find((v) => v.id === selectedVariationId) || artwork.variations[0];

  const maxStock = selectedVariation ? selectedVariation.stock : 0;
  const outOfStock = maxStock <= 0;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleAdd = () => {
    if (!selectedVariation || outOfStock) return;
    onAddToBag(artwork, selectedVariation, quantity);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 2200);
  };

  return (
    <div className="paper-grain">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('/gallery')}
            className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-[#5B6458] hover:text-[#24402E]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Gallery</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] px-3.5 py-1.5 text-xs font-medium text-[#1F241E] hover:bg-[#EFE8DA]"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#24402E]" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#5B6458]" />
                <span>Share Artwork</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left: High-Resolution Framed Artwork Viewer */}
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-xl border border-[#DDD4C4] bg-[#EFE8DA] p-4 sm:p-6">
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Inspect full size artwork"
                className="group relative block w-full overflow-hidden rounded-md bg-[#F4EFE4]"
              >
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[560px] w-full object-contain mx-auto"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-[#1F241E]/80 px-2.5 py-1.5 text-xs text-[#FBF8F1] opacity-90 transition-opacity group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Inspect Detail</span>
                </span>
              </button>
            </div>

            {artwork.artistNote && (
              <div className="mt-5 rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#5E7C64]">
                  Artist Studio Note
                </p>
                <p className="mt-1.5 font-serif text-lg italic leading-relaxed text-[#1F241E]">
                  “{artwork.artistNote}”
                </p>
              </div>
            )}
          </div>

          {/* Right: Contiguous Purchase & Accession Module */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B6458]">
                <span>{categoryDisplayName(artwork.category)}</span>
                <span aria-hidden="true">·</span>
                <span>{artwork.year}</span>
                {selectedVariation?.isOneOfAKind && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#B56A3B]">One-of-a-Kind (1 of 1)</span>
                  </>
                )}
              </div>

              <h1 className="mt-2 font-serif text-3xl font-semibold text-[#1F241E] sm:text-4xl">
                {artwork.title}
              </h1>

              {selectedVariation && (
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <p className="text-2xl font-semibold text-[#24402E] tabular-nums">
                    {formatMoney(selectedVariation.priceCents)}
                  </p>
                  <p className="text-xs font-medium text-[#5B6458] tabular-nums">
                    {outOfStock
                      ? 'Sold out / Collected'
                      : selectedVariation.isOneOfAKind
                      ? '1 unique original available'
                      : `${selectedVariation.stock} in studio stock`}
                  </p>
                </div>
              )}

              <p className="mt-4 text-sm leading-relaxed text-[#5B6458]">
                {artwork.description}
              </p>

              <BotanicalDivider className="my-5" />

              {/* Variation / Size / Pack Selector */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#5B6458]">
                  Select Edition / Size / Option
                </label>
                <div className="mt-2.5 flex flex-col gap-2">
                  {artwork.variations.map((v) => {
                    const active = v.id === selectedVariation?.id;
                    const soldOut = v.stock <= 0;
                    return (
                      <button
                        key={v.id || v.sku}
                        type="button"
                        onClick={() => {
                          setSelectedVariationId(v.id ?? null);
                          setQuantity(1);
                        }}
                        className={`flex min-h-[48px] items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-[#24402E] bg-[#EFE8DA]'
                            : 'border-[#DDD4C4] bg-[#FBF8F1] hover:bg-[#F4EFE4]'
                        } ${soldOut ? 'opacity-65' : ''}`}
                      >
                        <div>
                          <div className="text-sm font-medium text-[#1F241E]">
                            {v.label}
                          </div>
                          <div className="text-xs text-[#5B6458]">
                            {v.size}
                            {v.isOneOfAKind ? ' · One-of-a-Kind' : ''}
                            {soldOut ? ' · Collected' : ''}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-[#1F241E] tabular-nums">
                          {formatMoney(v.priceCents)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity & Add to Bag */}
              <div className="mt-6 flex items-center gap-3">
                {!selectedVariation?.isOneOfAKind && !outOfStock && (
                  <div className="inline-flex min-h-[44px] items-center rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="inline-flex h-11 w-10 items-center justify-center text-[#1F241E] hover:bg-[#EFE8DA]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[32px] text-center text-sm font-medium tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= maxStock}
                      onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                      aria-label="Increase quantity"
                      className="inline-flex h-11 w-10 items-center justify-center text-[#1F241E] hover:bg-[#EFE8DA] disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={handleAdd}
                  className="min-h-[44px] flex-1 rounded-lg bg-[#24402E] px-6 py-3 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123] disabled:cursor-not-allowed disabled:bg-[#DDD4C4] disabled:text-[#5B6458]"
                >
                  {outOfStock
                    ? 'Currently Collected'
                    : addedFeedback
                    ? 'Added to Bag'
                    : 'Add to Shopping Bag'}
                </button>
              </div>

              {outOfStock && (
                <button
                  type="button"
                  onClick={() => onNavigate('/commissions')}
                  className="mt-3 w-full min-h-[42px] rounded-lg border border-[#24402E] px-4 py-2 text-xs font-medium text-[#24402E] hover:bg-[#EFE8DA]"
                >
                  Request a Custom Commission Inspired by This Piece
                </button>
              )}

              {/* Accession Details Table */}
              <dl className="mt-6 divide-y divide-[#DDD4C4] border-t border-[#DDD4C4] text-xs">
                <div className="flex justify-between py-2.5">
                  <dt className="text-[#5B6458]">Medium</dt>
                  <dd className="font-medium text-[#1F241E] text-right">{artwork.medium}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-[#5B6458]">Dimensions</dt>
                  <dd className="font-medium text-[#1F241E] tabular-nums">
                    {selectedVariation?.size || artwork.dimensionsSummary}
                  </dd>
                </div>
                {selectedVariation && (
                  <div className="flex justify-between py-2.5">
                    <dt className="text-[#5B6458]">Studio SKU</dt>
                    <dd className="font-medium text-[#1F241E] tabular-nums">{selectedVariation.sku}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Inspection Modal */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F241E]/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Full view of ${artwork.title}`}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Close full view"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FBF8F1] text-[#1F241E]"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[92vw] rounded-md object-contain"
          />
        </div>
      )}
    </div>
  );
}
