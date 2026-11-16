import { ArrowRight } from 'lucide-react';
import { Artwork, ArtworkCategory } from '../types/shop';
import { ArtworkCard } from '../components/ArtworkCard';
import { BotanicalCornerVine, BotanicalDivider } from '../components/BotanicalDecor';

interface HomePageProps {
  artworks: Artwork[];
  onNavigate: (path: string) => void;
  onSelectCategory: (cat: 'all' | ArtworkCategory) => void;
}

export function HomePage({ artworks, onNavigate, onSelectCategory }: HomePageProps) {
  const activeArtworks = artworks.filter((a) => !a.isSoldArchive && a.totalStock > 0);
  const heroArtwork =
    activeArtworks.find((a) => a.slug === 'sandhill-cranes-at-sunset') ||
    activeArtworks.find((a) => a.category === 'painting') ||
    activeArtworks[0];

  const featuredWorks = activeArtworks.filter((a) => a.isFeatured).slice(0, 6);

  const collectionHighlights: Array<{
    category: ArtworkCategory;
    title: string;
    subtitle: string;
    imageUrl: string;
    collageImages?: Array<{ src: string; alt: string }>;
  }> = [
    {
      category: 'painting',
      title: 'Original Paintings',
      subtitle: 'One-of-a-kind acrylic studies of wetland birds, cypress water, and wildlife.',
      imageUrl: '/assets/aistudio/Painting_gallery_3d31ccc3.PNG',
    },
    {
      category: 'aceo',
      title: 'ACEO Mini Art Cards',
      subtitle: 'Pocket-sized 2.5 × 3.5 in hand-painted & inked collector cards.',
      imageUrl: '/assets/aistudio/Frog_collection_ACEO_363f2277.JPG',
    },
    {
      category: 'sticker',
      title: 'Stickers & Block Prints',
      subtitle: 'Botanical insects, fossil prints, and minimalist sleeping studio cats.',
      imageUrl: '/assets/aistudio/Dino_sticker_097d4fa1.JPG',
      collageImages: [
        {
          src: '/assets/aistudio/Beetle_sticker_e8885f95.JPG',
          alt: 'Hercules beetle ink illustration sticker',
        },
        {
          src: '/assets/aistudio/Dino_sticker_097d4fa1.JPG',
          alt: 'Fossil bird skeleton block print',
        },
        {
          src: '/assets/aistudio/Cat_sticker2_3f17ba5a.JPG',
          alt: 'Curled sleeping studio cat sticker',
        },
      ],
    },
  ];

  return (
    <div className="paper-grain">
      {/* Cozy Woodland Hero Split */}
      <section className="relative overflow-hidden border-b border-[#DDD4C4]">
        <BotanicalCornerVine className="absolute -right-6 -top-4 h-44 w-56 opacity-60 hidden sm:block" flip />

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
              Little Wild Things · Woodland Studio
            </p>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.1] text-[#1F241E] sm:text-5xl lg:text-[3.35rem]">
              Quiet wildlife paintings, mini cards, and ink curiosities.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5B6458]">
              Welcome inside Jorja’s studio—where cypress marshes, pond frogs, and
              sleepy housecats come to life on canvas, 2.5 × 3.5 inch ACEO cards, and weatherproof
              stickers.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('all');
                  onNavigate('/gallery');
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#24402E] px-6 py-3 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123]"
              >
                <span>Browse the Gallery</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <a
                href="/commissions"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/commissions');
                }}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-[#24402E] underline decoration-[#B56A3B] decoration-1 underline-offset-4 hover:text-[#1B3123]"
              >
                Request Custom Art
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            {heroArtwork && (
              <button
                type="button"
                onClick={() => onNavigate(`/art/${heroArtwork.slug}`)}
                className="group block w-full text-left"
              >
                <div className="overflow-hidden rounded-xl border border-[#DDD4C4] bg-[#EFE8DA] p-3.5 sm:p-4">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-[#F4EFE4]">
                    <img
                      src={heroArtwork.imageUrl}
                      alt={heroArtwork.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-4 px-1">
                    <div>
                      <p className="font-serif text-xl font-medium text-[#1F241E]">
                        {heroArtwork.title}
                      </p>
                      <p className="text-xs text-[#5B6458]">
                        {heroArtwork.medium} · {heroArtwork.hasOneOfAKind ? 'One-of-a-Kind Original' : 'Studio Edition'}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-[#24402E] group-hover:underline whitespace-nowrap">
                      View Piece →
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Three Art Disciplines */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-[#1F241E]">
              Collections from the Studio Table
            </h2>
            <p className="mt-1.5 text-sm text-[#5B6458]">
              Explore one-of-a-kind canvases alongside small-batch collectibles and desk prints.
            </p>
          </div>
          <a
            href="/gallery"
            onClick={(e) => {
              e.preventDefault();
              onSelectCategory('all');
              onNavigate('/gallery');
            }}
            className="text-sm font-medium text-[#24402E] hover:underline whitespace-nowrap"
          >
            View all {activeArtworks.length} works →
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {collectionHighlights.map((col) => (
            <button
              key={col.category}
              type="button"
              onClick={() => {
                onSelectCategory(col.category);
                onNavigate('/gallery');
              }}
              className="group flex flex-col text-left"
            >
              <div className="w-full overflow-hidden rounded-lg border border-[#DDD4C4] bg-[#EFE8DA] p-2.5 transition-transform duration-200 group-hover:-translate-y-0.5">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-[#F4EFE4]">
                  {col.collageImages && col.collageImages.length === 3 ? (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1.5 bg-[#F4EFE4] p-1.5">
                      <div className="row-span-2 min-h-0 min-w-0 flex items-center justify-center overflow-hidden rounded-sm border border-[#DDD4C4]/70 bg-[#FBF8F1] p-1.5">
                        <img
                          src={col.collageImages[0].src}
                          alt={col.collageImages[0].alt}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="min-h-0 min-w-0 flex items-center justify-center overflow-hidden rounded-sm border border-[#DDD4C4]/70 bg-[#FBF8F1] p-1">
                        <img
                          src={col.collageImages[1].src}
                          alt={col.collageImages[1].alt}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="min-h-0 min-w-0 flex items-center justify-center overflow-hidden rounded-sm border border-[#DDD4C4]/70 bg-[#FBF8F1] p-1">
                        <img
                          src={col.collageImages[2].src}
                          alt={col.collageImages[2].alt}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={col.imageUrl}
                      alt={col.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
              </div>
              <h3 className="mt-3.5 font-serif text-2xl font-medium text-[#1F241E] group-hover:text-[#24402E]">
                {col.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#5B6458]">{col.subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <BotanicalDivider />
      </div>

      {/* Featured Works Grid */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-[#1F241E]">
              Featured Works
            </h2>
            <p className="mt-1.5 text-sm text-[#5B6458]">
              Original works are clearly marked one-of-a-kind; prints and stickers offer size and pack choices.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featuredWorks.map((art) => (
            <ArtworkCard
              key={art.id}
              artwork={art}
              onSelect={(slug) => onNavigate(`/art/${slug}`)}
            />
          ))}
        </div>
      </section>

      {/* Artist Studio Story Excerpt */}
      <section className="parchment-surface border-t border-[#DDD4C4]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-7">
            <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
              Inside the Studio
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#1F241E]">
              Painted by hand, packed with care.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#5B6458]">
              Every canvas, tiny ACEO trading card, and ink study starts in a quiet sketchbook surrounded
              by potted ferns and sleeping cats. Looking for a particular animal, memory, or custom size?
              Jorja welcomes custom commissions alongside studio drops.
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm font-medium">
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/about');
                }}
                className="text-[#24402E] underline decoration-[#B56A3B] underline-offset-4 hover:text-[#1B3123]"
              >
                Read About the Artist
              </a>
              <a
                href="/policies"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/policies');
                }}
                className="text-[#5B6458] hover:text-[#1F241E] hover:underline underline-offset-4"
              >
                Shipping &amp; Packaging Care
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6">
              <h3 className="font-serif text-xl font-semibold text-[#1F241E]">
                Custom Art &amp; Studio Drops
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6458]">
                Have a favorite pet, marsh landscape, or gift idea in mind? Send a commission note or
                join email alerts when new originals leave the easel.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/commissions')}
                className="mt-5 inline-flex min-h-[42px] items-center rounded-lg border border-[#24402E] px-5 py-2 text-sm font-medium text-[#24402E] transition-colors hover:bg-[#24402E] hover:text-[#FBF8F1]"
              >
                Request Custom Art
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
