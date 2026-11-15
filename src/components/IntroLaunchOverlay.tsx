import React from 'react';
import { Pause, Play, SkipForward, Volume2 } from 'lucide-react';
import { IntroPopupItem, OutpostSiteId } from '../data/missionScenarios';
import { soundEngine } from '../audio/soundEngine';

interface IntroLaunchOverlayProps {
  site: OutpostSiteId;
  progress: number; // 0..1
  activePopup: IntroPopupItem;
  paused: boolean;
  audioLocked: boolean;
  onUnlockAudio: () => void;
  onTogglePause: () => void;
  onSkipIntro: () => void;
}

export const IntroLaunchOverlay: React.FC<IntroLaunchOverlayProps> = ({
  site,
  progress,
  activePopup,
  paused,
  audioLocked,
  onUnlockAudio,
  onTogglePause,
  onSkipIntro,
}) => {
  const pct = Math.min(100, Math.max(2, progress * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6">
      {/* Simple Top Flight Progress Bar (Earth -> Mars only) */}
      <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border-2 border-sky-400/50 bg-[#081020]/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs font-extrabold">
            <span className="text-sky-300">🌍 Earth</span>
            <span className={progress >= 0.45 ? 'text-violet-300' : 'text-slate-500'}>
              ✨ Space
            </span>
            <span className={progress >= 0.75 ? 'text-emerald-300' : 'text-slate-500'}>
              {site === 'mars' ? '🔴 Mars' : '🌕 Moon'}
            </span>
          </div>
          <div className="relative h-2.5 w-full rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400 transition-all duration-100"
              style={{ width: `${pct}%` }}
            />
            <span
              className="absolute -top-2.5 text-base transition-all duration-100"
              style={{ left: `calc(${Math.min(96, pct)}% - 8px)` }}
              aria-hidden="true"
            >
              🚀
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {audioLocked && (
            <button
              type="button"
              onClick={onUnlockAudio}
              className="inline-flex items-center gap-1 rounded-xl border-b-4 border-amber-600 bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 active:translate-y-0.5 active:border-b-2"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Sound</span>
            </button>
          )}

          <button
            type="button"
            onClick={onTogglePause}
            aria-label={paused ? 'Resume' : 'Pause'}
            className="rounded-xl border-2 border-slate-700 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
          >
            {paused ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4 text-sky-400" />}
          </button>

          <button
            type="button"
            onClick={onSkipIntro}
            className="inline-flex items-center gap-1 rounded-xl border-b-4 border-amber-600 bg-amber-400 px-4 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300 active:translate-y-0.5 active:border-b-2"
          >
            <span>Skip</span>
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* BIG CENTER-SCREEN POPUP */}
      <div className="flex flex-1 items-center justify-center px-2">
        <div
          key={activePopup.id}
          className="pointer-events-auto relative w-full max-w-2xl rounded-[2rem] border-4 bg-[#081020]/85 p-7 sm:p-10 text-center shadow-2xl backdrop-blur-md animate-[popupSlideUp_0.35s_ease-out]"
          style={{ borderColor: activePopup.accentHex }}
        >
          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playPopupChime();
              soundEngine.speak(`${activePopup.headline}. ${activePopup.kidExplanation}`);
            }}
            className="absolute right-5 top-5 rounded-2xl border-2 border-sky-400/40 bg-sky-500/20 p-2.5 text-sky-300 hover:bg-sky-500/30"
            title="Read Out Loud"
          >
            <Volume2 className="h-5 w-5" />
          </button>

          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 text-5xl shadow-lg"
            style={{
              backgroundColor: `${activePopup.accentHex}24`,
              borderColor: activePopup.accentHex,
            }}
          >
            {activePopup.emoji}
          </div>

          <span
            className="mt-4 inline-block rounded-full px-3.5 py-1 text-xs font-extrabold tracking-wide text-slate-950"
            style={{ backgroundColor: activePopup.accentHex }}
          >
            {activePopup.badge}
          </span>

          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-white">
            {activePopup.headline}
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-lg sm:text-xl font-medium text-slate-100">
            {activePopup.kidExplanation}
          </p>

          <p className="mt-4 inline-block rounded-2xl bg-slate-900/90 px-4 py-2 text-sm font-bold text-amber-300">
            {activePopup.tradeOffPreview}
          </p>
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
};
