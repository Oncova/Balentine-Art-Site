import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Artwork, ArtworkCategory } from '../types/shop';
import { ArtworkCard } from '../components/ArtworkCard';
import { BotanicalCornerVine } from '../components/BotanicalDecor';

interface GalleryPageProps {
  artworks: Artwork[];
  selectedCategory: 'all' | ArtworkCategory;
  onSelectCategory: (cat: 'all' | ArtworkCategory) => void;
  onNavigate: (path: string) => void;
}

const FILTER_TABS: Array<{ id: 'all' | ArtworkCategory; label: string }> = [
  { id: 'all', label: 'All Works' },
  { id: 'painting', label: 'Original Paintings' },
  { id: 'aceo', label: 'ACEO Cards' },
  { id: 'sticker', label: 'Stickers & Prints' },
];

export function GalleryPage({
  artworks,
  selectedCategory,
  onSelectCategory,
  onNavigate,
}: GalleryPageProps) {
  const [search, setSearch] = useState('');
  const [onlyOneOfAKind, setOnlyOneOfAKind] = useState(false);
  const [sortBy, setSortBy] = useState<'curated' | 'price_asc' | 'price_desc'>('curated');

  const availableWorks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = artworks
      .filter((a) => !a.isSoldArchive && a.totalStock > 0)
      .filter((a) => (selectedCategory === 'all' ? true : a.category === selectedCategory))
      .filter((a) => (onlyOneOfAKind ? a.hasOneOfAKind && !a.originalSold : true))
      .filter((a) =>
        q
          ? a.title.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.medium.toLowerCase().includes(q)
          : true
      );

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.minPriceCents - b.minPriceCents);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.minPriceCents - a.minPriceCents);
    }
    return list;
  }, [artworks, selectedCategory, onlyOneOfAKind, search, sortBy]);

  return (
    <div className="paper-grain relative min-h-[70vh] overflow-hidden">
      <BotanicalCornerVine className="absolute -right-8 top-0 h-40 w-48 opacity-45 hidden md:block" flip />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
            Exhibition &amp; Shop
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1F241E] sm:text-5xl">
            The Artwork Gallery
          </h1>
          <p className="mt-3 text-base text-[#5B6458]">
            Browse every painting, 2.5 × 3.5 in ACEO card, and sticker study currently in the
            studio. Click any piece to view dimensions, zoom in, and choose sizes or pack options.
          </p>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mt-8 flex flex-col gap-4 border-y border-[#DDD4C4] py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#EFE8DA] p-1">
            {FILTER_TABS.map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectCategory(tab.id)}
                  className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FBF8F1] text-[#24402E] shadow-xs'
                      : 'text-[#5B6458] hover:text-[#1F241E]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 text-xs font-medium text-[#1F241E]">
              <input
                type="checkbox"
                checked={onlyOneOfAKind}
                onChange={(e) => setOnlyOneOfAKind(e.target.checked)}
                className="h-4 w-4 rounded border-[#DDD4C4] accent-[#24402E]"
              />
              <span>One-of-a-Kind Available</span>
            </label>

            <div className="relative flex-1 sm:w-52 sm:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6458]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or medium..."
                aria-label="Search artworks"
                className="min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#FBF8F1] pl-9 pr-3 text-sm text-[#1F241E] placeholder:text-[#5B6458]/70"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'curated' | 'price_asc' | 'price_desc')}
              aria-label="Sort artworks"
              className="min-h-[40px] rounded-lg border border-[#DDD4C4] bg-[#FBF8F1] px-3 text-xs font-medium text-[#1F241E]"
            >
              <option value="curated">Curated Order</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Artwork Grid */}
        {availableWorks.length === 0 ? (
          <div className="mt-12 rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-10 text-center">
            <h2 className="font-serif text-2xl font-medium text-[#1F241E]">
              No matching works found
            </h2>
            <p className="mt-2 text-sm text-[#5B6458]">
              Try clearing your search or switching back to All Works.
            </p>
            <button
              type="button"
              onClick={() => {
                onSelectCategory('all');
                setOnlyOneOfAKind(false);
                setSearch('');
              }}
              className="mt-5 rounded-lg bg-[#24402E] px-5 py-2.5 text-sm font-medium text-[#FBF8F1]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {availableWorks.map((art) => (
              <ArtworkCard
                key={art.id}
                artwork={art}
                onSelect={(slug) => onNavigate(`/art/${slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
