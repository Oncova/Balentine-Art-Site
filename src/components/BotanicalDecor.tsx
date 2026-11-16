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

/**
 * Subtle hand-drawn watercolor-and-ink sleeping cat companion with botanical details,
 * rendered on a transparent background to blend naturally into the studio footer.
 */
export function StudioCatCompanion() {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        aria-hidden="true"
        className="flex h-28 w-48 items-center justify-center rounded-xl border border-[#DDD4C4]/70 bg-[#FBF8F1]/60 p-4 text-[#5E7C64]"
      >
        <BotanicalCornerVine className="h-20 w-28 opacity-75" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[230px] items-center justify-center sm:max-w-[248px] md:justify-end">
      <img
        src="/assets/studio-sleeping-cat.png"
        alt="Hand-drawn sleeping cat curled beside watercolor jars and botanical leaves"
        width={1004}
        height={583}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="h-auto w-full select-none object-contain transition-transform duration-300 ease-out hover:-translate-y-0.5"
      />
    </div>
  );
}

