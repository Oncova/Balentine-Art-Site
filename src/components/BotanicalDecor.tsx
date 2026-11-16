import { useState } from 'react';

export function BotanicalCornerVine({
  className = '',
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 180"
      fill="none"
      className={`pointer-events-none select-none ${flip ? '-scale-x-100' : ''} ${className}`}
    >
      <path
        d="M8 14C46 28 74 52 102 88C124 116 154 136 206 152"
        stroke="#5E7C64"
        strokeOpacity="0.32"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M52 38C64 20 82 14 96 18C90 34 74 44 52 38Z"
        stroke="#5E7C64"
        strokeOpacity="0.34"
        strokeWidth="1.15"
        fill="#5E7C64"
        fillOpacity="0.07"
      />
      <path
        d="M78 62C60 72 48 90 54 106C70 98 80 82 78 62Z"
        stroke="#5E7C64"
        strokeOpacity="0.34"
        strokeWidth="1.15"
        fill="#5E7C64"
        fillOpacity="0.06"
      />
      <path
        d="M114 98C128 80 148 74 164 80C156 96 138 104 114 98Z"
        stroke="#5E7C64"
        strokeOpacity="0.32"
        strokeWidth="1.15"
        fill="#5E7C64"
        fillOpacity="0.07"
      />
      <path
        d="M148 128C136 144 132 158 140 170C154 160 158 144 148 128Z"
        stroke="#5E7C64"
        strokeOpacity="0.28"
        strokeWidth="1.1"
        fill="#5E7C64"
        fillOpacity="0.05"
      />
      <circle cx="102" cy="88" r="2.2" fill="#B56A3B" fillOpacity="0.35" />
      <circle cx="174" cy="142" r="2" fill="#B56A3B" fillOpacity="0.3" />
    </svg>
  );
}

export function BotanicalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
      <div className="h-px flex-1 bg-[#DDD4C4]" />
      <svg viewBox="0 0 64 20" width="54" height="17" fill="none">
        <path
          d="M6 10C18 10 24 10 32 10C40 10 46 10 58 10"
          stroke="#5E7C64"
          strokeOpacity="0.45"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M24 10C20 4 14 3 11 5C14 10 19 11 24 10Z"
          stroke="#5E7C64"
          strokeOpacity="0.5"
          strokeWidth="1"
          fill="#5E7C64"
          fillOpacity="0.1"
        />
        <path
          d="M40 10C44 4 50 3 53 5C50 10 45 11 40 10Z"
          stroke="#5E7C64"
          strokeOpacity="0.5"
          strokeWidth="1"
          fill="#5E7C64"
          fillOpacity="0.1"
        />
        <circle cx="32" cy="10" r="2" fill="#B56A3B" fillOpacity="0.55" />
      </svg>
      <div className="h-px flex-1 bg-[#DDD4C4]" />
    </div>
  );
}

const CAT_NOTES = [
  'Studio cat curled by the watercolor jars',
  'Quietly watching the marsh birds dry',
  'Soft purr from the sunlit windowsill',
  'Resting paws near the ink sketchbook',
];

/**
 * Subtle, interactive realistic ink-and-wash sleeping cat companion
 * tucked gently into the studio corner/footer without blocking artwork.
 */
export function StudioCatCompanion() {
  const [noteIdx, setNoteIdx] = useState(0);
  const [awakeBlink, setAwakeBlink] = useState(false);

  const handleInteract = () => {
    setAwakeBlink(true);
    setNoteIdx((prev) => (prev + 1) % CAT_NOTES.length);
    window.setTimeout(() => setAwakeBlink(false), 1400);
  };

  return (
    <div className="inline-flex flex-col items-start sm:items-end gap-1.5">
      <button
        type="button"
        onClick={handleInteract}
        aria-label="Interact with the studio cat illustration"
        className="group relative inline-flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-[#EFE8DA]/70 focus-visible:ring-2 focus-visible:ring-[#24402E]"
      >
        <svg
          viewBox="0 0 120 74"
          width="86"
          height="53"
          fill="none"
          aria-hidden="true"
          className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
        >
          {/* Soft warm moss cushion shadow */}
          <ellipse cx="62" cy="64" rx="46" ry="7" fill="#5E7C64" fillOpacity="0.14" />

          {/* Curled cat body contour inspired by Balentine Art's cat sketches */}
          <path
            d="M27 54C22 45 24 31 35 23C46 15 68 13 84 21C97 27 102 39 98 50C94 59 79 62 63 62C46 62 32 60 27 54Z"
            fill="#F4EFE4"
            stroke="#1F241E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Subtle fur wash shading */}
          <path
            d="M39 27C52 21 71 21 84 27C91 31 94 38 92 45C84 40 73 37 59 38C47 39 39 44 34 50C32 41 33 32 39 27Z"
            fill="#DDD4C4"
            fillOpacity="0.48"
          />

          {/* Curled tail wrapping gently around paws */}
          <path
            d="M93 52C105 51 112 43 108 35C105 30 98 31 96 36"
            stroke="#1F241E"
            strokeWidth="1.45"
            strokeLinecap="round"
          />

          {/* Resting head & ears (gentle ear twitch on tap) */}
          <g
            style={{
              transformOrigin: '44px 36px',
              transform: awakeBlink ? 'rotate(-3deg) translateY(-1px)' : 'rotate(0deg)',
              transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <path
              d="M31 44C28 36 30 27 36 22L38 12L46 20C50 19 55 20 58 22L65 14L66 25C70 30 70 39 65 45C58 51 39 51 31 44Z"
              fill="#FBF8F1"
              stroke="#1F241E"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Inner ear tint */}
            <path d="M38 17L40 22L44 21" stroke="#B56A3B" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M62 19L59 23L64 24" stroke="#B56A3B" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />

            {/* Sleeping closed eyes vs soft amber-olive glance when tapped */}
            {awakeBlink ? (
              <>
                <ellipse cx="43" cy="34" rx="2.4" ry="1.8" fill="#24402E" />
                <ellipse cx="56" cy="34" rx="2.4" ry="1.8" fill="#24402E" />
                <circle cx="43.7" cy="33.5" r="0.6" fill="#FBF8F1" />
                <circle cx="56.7" cy="33.5" r="0.6" fill="#FBF8F1" />
              </>
            ) : (
              <>
                <path d="M40 34C42 36 45 36 47 34" stroke="#1F241E" strokeWidth="1.35" strokeLinecap="round" />
                <path d="M53 34C55 36 58 36 60 34" stroke="#1F241E" strokeWidth="1.35" strokeLinecap="round" />
              </>
            )}

            {/* Tiny nose & whiskers */}
            <path d="M48.5 38.5L50 40.5L51.5 38.5Z" fill="#B56A3B" fillOpacity="0.75" />
            <path d="M38 38L30 37M38 40.5L29 41.5" stroke="#5B6458" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M61 38L69 37M61 40.5L70 41.5" stroke="#5B6458" strokeWidth="0.9" strokeLinecap="round" />
          </g>

          {/* Tucked front paw */}
          <path
            d="M42 54C42 50 48 49 52 52C55 49 61 50 61 54"
            stroke="#1F241E"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>

        <span className="text-xs leading-relaxed text-[#5B6458] max-w-[180px]">
          {CAT_NOTES[noteIdx]}
        </span>
      </button>
    </div>
  );
}
