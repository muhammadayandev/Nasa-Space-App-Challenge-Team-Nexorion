import React from 'react';
import { FastForward, Play, SkipForward } from 'lucide-react';
import { GameLevelSpec } from '../data/missionScenarios';

interface LevelBriefModalProps {
  level: GameLevelSpec;
  onStart: () => void;
  onSkipTutorial: () => void;
  onSkipAllTutorials: () => void;
}

export const LevelBriefModal: React.FC<LevelBriefModalProps> = ({
  level,
  onStart,
  onSkipTutorial,
  onSkipAllTutorials,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-brief-title"
    >
      <div className="w-full max-w-2xl rounded-[2rem] border-4 border-amber-400 bg-[#081020] p-7 sm:p-10 text-center shadow-2xl animate-[popupSlideUp_0.3s_ease-out]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-amber-400/60 bg-amber-500/20 text-5xl">
          {level.emoji}
        </div>

        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-amber-400">
          Tutorial {level.id} of 5 · {level.maxDays} Days
        </p>

        <h2
          id="level-brief-title"
          className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-white"
        >
          {level.title}
        </h2>

        <div className="mt-6 space-y-3 text-left">
          <div className="rounded-2xl border-2 border-sky-400/40 bg-sky-500/10 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-sky-300">
              {level.lessonTitle}
            </p>
            <p className="mt-1 text-base sm:text-lg font-medium text-white">{level.lessonText}</p>
          </div>

          <div className="rounded-2xl border-2 border-emerald-400/40 bg-emerald-500/10 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-300">
              🎯 Goal
            </p>
            <p className="mt-1 font-display text-lg font-extrabold text-white">{level.goalText}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-600 bg-amber-400 py-4 font-display text-xl font-extrabold text-slate-950 hover:bg-amber-300 active:translate-y-0.5 active:border-b-2 transition-all"
        >
          <Play className="h-5 w-5 fill-slate-950" />
          <span>Let&apos;s Go!</span>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onSkipTutorial}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:border-amber-400 hover:text-amber-300 transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5" />
            <span>Skip Tutorial</span>
          </button>
          <button
            type="button"
            onClick={onSkipAllTutorials}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/50 py-2.5 text-xs font-bold text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/60 transition-colors"
          >
            <FastForward className="h-3.5 w-3.5" />
            <span>Skip All Tutorials</span>
          </button>
        </div>
      </div>
    </div>
  );
};
