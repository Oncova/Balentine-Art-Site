import { BotanicalCornerVine, BotanicalDivider } from '../components/BotanicalDecor';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="paper-grain relative overflow-hidden">
      <BotanicalCornerVine className="absolute -right-8 top-0 h-44 w-52 opacity-50 hidden md:block" flip />

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
          About the Artist
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1F241E] sm:text-5xl">
          Jorja &amp; the Woodland Studio
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <div className="overflow-hidden rounded-xl border border-[#DDD4C4] bg-[#EFE8DA] p-3">
              <img
                src="/assets/aistudio/Turtle_painting_481bae3a.PNG"
                alt="Red-Eared Slider acrylic painting resting on a wooden studio easel"
                referrerPolicy="no-referrer"
                className="aspect-[4/3] w-full rounded-sm object-cover"
              />
              <p className="mt-2.5 text-xs italic text-[#5B6458]">
                On the outdoor easel: Red-Eared Slider on Cypress Log.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-base leading-relaxed text-[#5B6458] md:col-span-7">
            <p className="text-[#1F241E] first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-5xl first-letter:font-semibold first-letter:text-[#24402E]">
              Little Wild Things grew out of quiet mornings observing wetland birds, basking pond
              turtles, garden beetles, and curled-up housecats. Whether working across a stretched
              acrylic canvas or a pocket-sized 2.5 × 3.5 inch ACEO card, every piece begins with
              direct observation and unhurried linework.
            </p>
            <p>
              In the studio, work moves fluidly between three worlds: one-of-a-kind acrylic
              paintings inspired by cypress marshes and twilight horizons, collectible ACEO
              miniatures painted in watercolor and ink, and weatherproof vinyl stickers drawn
              from botanical and sketchbook studies.
            </p>
            <p>
              Each original painting and original ACEO card is signed on the back and marked as
              one-of-a-kind—never reproduced as an identical original. Select pieces are also
              offered as archival fine-art prints and small-batch sticker packs so every collector
              can bring a piece of the studio home.
            </p>
          </div>
        </div>

        <BotanicalDivider className="my-12" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-5">
            <h2 className="font-serif text-xl font-semibold text-[#1F241E]">Original Canvases</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5B6458]">
              Stretched canvas acrylics sealed with archival matte varnish, shipped carefully padded
              and ready for framing or hanging.
            </p>
          </div>
          <div className="rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-5">
            <h2 className="font-serif text-xl font-semibold text-[#1F241E]">ACEO Miniatures</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5B6458]">
              Traditional 2.5 × 3.5 inch Artist Cards Editions and Originals—tiny collectible works
              in rigid archival sleeves.
            </p>
          </div>
          <div className="rounded-xl border border-[#DDD4C4] bg-[#F4EFE4] p-5">
            <h2 className="font-serif text-xl font-semibold text-[#1F241E]">Custom Commissions</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5B6458]">
              Have a beloved pet, bird, or landscape in mind? Jorja accepts bespoke requests
              throughout the year.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => onNavigate('/gallery')}
            className="min-h-[44px] rounded-lg bg-[#24402E] px-6 py-2.5 text-sm font-medium text-[#FBF8F1] hover:bg-[#1B3123]"
          >
            Browse the Gallery
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/commissions')}
            className="min-h-[44px] rounded-lg border border-[#24402E] px-6 py-2.5 text-sm font-medium text-[#24402E] hover:bg-[#EFE8DA]"
          >
            Inquire About a Commission
          </button>
        </div>
      </div>
    </div>
  );
}
