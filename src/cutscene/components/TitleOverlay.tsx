import React from 'react';
import { Play, FastForward, Volume2, VolumeX } from 'lucide-react';

interface TitleOverlayProps {
  muted: boolean;
  onStart: () => void;
  onSkipToMars: () => void;
  onToggleMute: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  muted,
  onStart,
  onSkipToMars,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Subtle asymmetric left scrim so typography stays >= 4.5:1 over bright Earth launchpad sky */}
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 w-full md:w-[58%] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(8, 10, 15, 0.88) 0%, rgba(8, 10, 15, 0.56) 62%, rgba(8, 10, 15, 0) 100%)',
        }}
      />

      {/* Top utility row */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="text-xs tracking-wider text-slate-300 font-mono-tech">
          NASA SPACE APPS · CHALLENGE 03
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/15 bg-[#10141c]/90 text-slate-200 hover:bg-[#1a202c] focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Title Lockup in left calm negative space */}
      <div className="relative z-10 max-w-xl my-auto">
        {/* Custom inline SVG mission crest emblem */}
        <svg
          viewBox="0 0 250 48"
          className="w-64 h-12 mb-4"
          role="img"
          aria-label="Ares IV Mission Crest"
        >
          <circle cx="24" cy="24" r="18" fill="none" stroke="#d95b2b" strokeWidth="2.2" />
          <circle cx="24" cy="24" r="8" fill="#d95b2b" />
          <path
            d="M 6 34 Q 24 10 46 22"
            fill="none"
            stroke="#f5f7fa"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="46" cy="22" r="2.6" fill="#38bdf8" />
          <text
            x="56"
            y="22"
            fill="#f8fafc"
            fontSize="13.5"
            fontWeight="700"
            fontFamily="Barlow Condensed, sans-serif"
            letterSpacing="2.2"
          >
            ARES IV EXPEDITION
          </text>
          <text
            x="56"
            y="37"
            fill="#94a3b8"
            fontSize="9.5"
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="1.4"
          >
            EARTH → JEZERO BASIN
          </text>
        </svg>

        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white leading-[0.95] text-balance mb-4">
          Red Horizon
        </h1>

        <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-md mb-8">
          Experience the first-person 3D launch sequence, eight-month transit, Mars landing, and the
          dust storm evacuation that left one astronaut behind to survive alone.
        </p>

        <div className="flex flex-wrap items-center gap-3 pointer-events-auto">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#d95b2b] hover:bg-[#e56837] text-white font-semibold text-sm whitespace-nowrap shrink-0 shadow-lg focus-visible:outline-2 focus-visible:outline-amber-300 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Mission Cutscene</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onSkipToMars();
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 bg-[#12161f]/90 hover:bg-[#1c2230] text-slate-200 font-medium text-sm whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-300 transition-colors cursor-pointer"
          >
            <FastForward className="w-4 h-4" />
            <span>Skip to Mars Surface</span>
          </button>
        </div>
      </div>

      {/* Single flat borderless control hint line */}
      <div className="relative z-10 text-xs text-slate-400 font-mono-tech">
        Enter Start Cutscene · S Skip Anytime · WASD Move on Mars · Drag Mouse to Look · M Mute
      </div>
    </div>
  );
};
