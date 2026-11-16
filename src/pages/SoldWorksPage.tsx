import { Artwork } from '../types/shop';
import { ArtworkCard } from '../components/ArtworkCard';
import { BotanicalDivider } from '../components/BotanicalDecor';

interface SoldWorksPageProps {
  artworks: Artwork[];
  onNavigate: (path: string) => void;
}

export function SoldWorksPage({ artworks, onNavigate }: SoldWorksPageProps) {
  const soldWorks = artworks.filter((a) => a.isSoldArchive || a.totalStock <= 0);

  return (
    <div className="paper-grain min-h-[70vh]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
            Collected Archive
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1F241E] sm:text-5xl">
            Sold Works
          </h1>
          <p className="mt-3 text-base text-[#5B6458]">
            One-of-a-kind paintings and limited studio editions that have found homes with collectors.
            If a past piece speaks to you, Jorja accepts custom commission requests inspired by
            similar subjects and palettes.
          </p>
        </div>

        <BotanicalDivider className="my-8" />

        {soldWorks.length === 0 ? (
          <div className="rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-10 text-center">
            <h2 className="font-serif text-2xl font-medium text-[#1F241E]">
              Every piece in this release is currently available
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#5B6458]">
              Once a one-of-a-kind painting or ACEO card is collected—or archived in the Studio Admin
              dashboard—it automatically moves here as part of the permanent portfolio archive.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('/gallery')}
                className="min-h-[44px] rounded-lg bg-[#24402E] px-5 py-2.5 text-sm font-medium text-[#FBF8F1] hover:bg-[#1B3123]"
              >
                Explore Available Works
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/commissions')}
                className="min-h-[44px] rounded-lg border border-[#24402E] px-5 py-2.5 text-sm font-medium text-[#24402E] hover:bg-[#EFE8DA]"
              >
                Request a Commission
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {soldWorks.map((art) => (
                <ArtworkCard
                  key={art.id}
                  artwork={art}
                  onSelect={(slug) => onNavigate(`/art/${slug}`)}
                />
              ))}
            </div>

            <div className="mt-12 rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-6 sm:flex sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#1F241E]">
                  Inspired by a collected piece?
                </h2>
                <p className="mt-1 text-sm text-[#5B6458]">
                  Ask Jorja about painting a custom variation in your preferred dimensions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/commissions')}
                className="mt-4 min-h-[44px] rounded-lg bg-[#24402E] px-5 py-2.5 text-sm font-medium text-[#FBF8F1] sm:mt-0 whitespace-nowrap"
              >
                Request Similar Art
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
