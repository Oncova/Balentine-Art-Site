import { useState } from 'react';
import { Artwork, categoryDisplayName, formatMoney } from '../types/shop';

interface ArtworkCardProps {
  artwork: Artwork;
  onSelect: (slug: string) => void;
}

export function ArtworkCard({ artwork, onSelect }: ArtworkCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const hasVariations = artwork.variations.length > 1;
  const isSoldOut = artwork.totalStock <= 0 || artwork.isSoldArchive;

  const editionTag = artwork.hasOneOfAKind
    ? artwork.originalSold
      ? 'Original Collected'
      : 'One-of-a-Kind Available'
    : `${artwork.variations.length} Option${artwork.variations.length === 1 ? '' : 's'}`;

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(artwork.slug)}
        className="flex flex-col text-left focus-visible:outline-2 focus-visible:outline-[#24402E]"
      >
        {/* Warm linen archival mat framing */}
        <div className="relative w-full overflow-hidden rounded-lg border border-[#DDD4C4] bg-[#EFE8DA] p-3 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[#5E7C64]/70">
          <div
            className={`aspect-[4/3] w-full overflow-hidden rounded-sm ${
              artwork.category === 'sticker' ? 'bg-[#FBF8F1] p-2' : 'bg-[#F4EFE4]'
            }`}
          >
            {!imgFailed ? (
              <img
                src={artwork.imageUrl}
                alt={`${artwork.title} — ${categoryDisplayName(artwork.category)} by Jorja`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className={`h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.02] ${
                  artwork.category === 'sticker' ? 'object-contain' : 'object-cover'
                }`}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-[#F4EFE4] p-4 text-center">
                <span className="font-serif text-lg text-[#24402E]">{artwork.title}</span>
                <span className="mt-1 text-xs text-[#5B6458]">{categoryDisplayName(artwork.category)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Clean unboxed gallery metadata — zero pill spam */}
        <div className="mt-3.5 flex flex-col gap-1 px-0.5">
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#5B6458]">
            <span>{categoryDisplayName(artwork.category)}</span>
            <span aria-hidden="true">·</span>
            <span className={artwork.hasOneOfAKind && !artwork.originalSold ? 'text-[#B56A3B] font-medium' : ''}>
              {editionTag}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-xl font-medium leading-snug text-[#1F241E] transition-colors group-hover:text-[#24402E]">
              {artwork.title}
            </h3>
            <span className="shrink-0 text-sm font-medium text-[#1F241E] tabular-nums">
              {isSoldOut
                ? 'Collected'
                : `${hasVariations ? 'From ' : ''}${formatMoney(artwork.minPriceCents)}`}
            </span>
          </div>

          <p className="text-xs text-[#5B6458] line-clamp-1">{artwork.dimensionsSummary}</p>
        </div>
      </button>
    </article>
  );
}
