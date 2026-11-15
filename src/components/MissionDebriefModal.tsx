import React from 'react';
import { ArrowRight, LockOpen, Menu, RotateCcw } from 'lucide-react';
import { GameLevelSpec } from '../data/missionScenarios';

interface MissionDebriefModalProps {
  outcome: 'victory' | 'failed' | 'rescue';
  gameMode: 'tutorial' | 'survival';
  failureReason: string | null;
  level: GameLevelSpec;
  hasNextLevel: boolean;
  unlockedNextLevel: boolean;
  unlockedSurvival: boolean;
  day: number;
  crewHealth: number;
  lifeSupport: number;
  food: number;
  science: number;
  muscleBone: number;
  onNextLevel: () => void;
  onStartSurvival: () => void;
  onReplayLevel: () => void;
  onOpenMenu: () => void;
}

export const MissionDebriefModal: React.FC<MissionDebriefModalProps> = ({
  outcome,
  gameMode,
  failureReason,
  level,
  hasNextLevel,
  unlockedNextLevel,
  unlockedSurvival,
  day,
  crewHealth,
  lifeSupport,
  food,
  science,
  muscleBone,
  onNextLevel,
  onStartSurvival,
  onReplayLevel,
  onOpenMenu,
}) => {
  const isRescue = outcome === 'rescue';
  const isWin = outcome === 'victory' || isRescue;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
    >
      <div
        className={`w-full max-w-2xl rounded-[2rem] border-4 bg-[#081020] p-7 sm:p-10 text-center shadow-2xl animate-[popupSlideUp_0.3s_ease-out] ${
          isRescue
            ? 'border-cyan-400'
            : isWin
            ? 'border-emerald-400'
            : 'border-rose-400'
        }`}
      >
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-5xl ${
            isRescue
              ? 'bg-cyan-500/20'
              : isWin
              ? 'bg-emerald-500/20'
              : 'bg-rose-500/20'
          }`}
        >
          {isRescue ? '🛸' : isWin ? '🏆' : '💪'}
        </div>

        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-amber-400">
          {isRescue
            ? `Open-World Survival · Sol ${day} Complete!`
            : gameMode === 'survival'
            ? `Open-World Survival · Sol ${day}`
            : `Tutorial ${level.id} of 5 · ${level.title}`}
        </p>

        <h2
          id="debrief-title"
          className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-white"
        >
          {isRescue
            ? 'Earth Rescue Has Landed!'
            : isWin && !hasNextLevel
            ? 'Tutorial Complete!'
            : isWin
            ? 'Awesome Job!'
            : 'Good Try! One More Time!'}
        </h2>

        <div
          className={`mt-5 rounded-2xl border-2 p-4 text-left ${
            isRescue
              ? 'border-cyan-400/50 bg-cyan-500/10'
              : isWin
              ? 'border-emerald-400/40 bg-emerald-500/10'
              : 'border-rose-400/40 bg-rose-500/10'
          }`}
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-white">
            {isRescue
              ? 'Mission Accomplished!'
              : isWin
              ? level.lessonTitle
              : 'What Happened'}
          </p>
          <p className="mt-1 text-base sm:text-lg font-medium text-slate-100">
            {isRescue
              ? 'You fixed Earth Comms in the Lab, grew fresh crops, stayed strong with exercise & body scans, and survived all 150 Mars Sols until the rescue crew touched down!'
              : isWin && !hasNextLevel
              ? 'You finished all 5 training missions! Now you are ready for 150-Day Open-World Mars Survival.'
              : isWin
              ? level.lessonText
              : failureReason || 'Keep an eye on Health, Air, Food, Muscle, and Storms!'}
          </p>
        </div>

        {isWin && unlockedNextLevel && hasNextLevel && gameMode === 'tutorial' && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border-2 border-amber-400/60 bg-amber-500/20 px-5 py-2.5 text-sm font-extrabold text-amber-300">
            <LockOpen className="h-4 w-4" />
            <span>Tutorial {level.id + 1} Unlocked!</span>
          </div>
        )}

        {isWin && !hasNextLevel && gameMode === 'tutorial' && unlockedSurvival && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border-2 border-cyan-400/60 bg-cyan-500/20 px-5 py-2.5 text-sm font-extrabold text-cyan-200">
            <LockOpen className="h-4 w-4" />
            <span>150-Day Open-World Survival Unlocked!</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-4 gap-2.5 text-center">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2.5">
            <p className="text-[11px] font-bold text-slate-400">Health</p>
            <p className="font-mono-tabular text-base font-extrabold text-white">
              {Math.round(crewHealth)}%
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2.5">
            <p className="text-[11px] font-bold text-slate-400">Air</p>
            <p className="font-mono-tabular text-base font-extrabold text-white">
              {Math.round(lifeSupport)}%
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2.5">
            <p className="text-[11px] font-bold text-slate-400">Food</p>
            <p className="font-mono-tabular text-base font-extrabold text-white">
              {Math.round(food)}%
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2.5">
            <p className="text-[11px] font-bold text-slate-400">
              {gameMode === 'survival' ? 'Muscle' : 'Science'}
            </p>
            <p className="font-mono-tabular text-base font-extrabold text-cyan-300">
              {gameMode === 'survival' ? `${Math.round(muscleBone)}%` : science}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex items-center gap-1.5 rounded-2xl border-b-4 border-slate-950 bg-slate-800 px-4 py-3 text-sm font-extrabold text-slate-200 hover:bg-slate-700 active:translate-y-0.5 active:border-b-2"
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onReplayLevel}
              className="inline-flex items-center gap-1.5 rounded-2xl border-b-4 border-slate-950 bg-slate-800 px-4 py-3 text-sm font-extrabold text-white hover:bg-slate-700 active:translate-y-0.5 active:border-b-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{gameMode === 'survival' ? 'Restart Survival' : 'Play Again'}</span>
            </button>

            {isWin && hasNextLevel && gameMode === 'tutorial' && (
              <button
                type="button"
                onClick={onNextLevel}
                className="inline-flex items-center gap-1.5 rounded-2xl border-b-4 border-emerald-600 bg-emerald-400 px-6 py-3 font-display text-base font-extrabold text-slate-950 hover:bg-emerald-300 active:translate-y-0.5 active:border-b-2"
              >
                <span>Next Tutorial</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {isWin && !hasNextLevel && gameMode === 'tutorial' && (
              <button
                type="button"
                onClick={onStartSurvival}
                className="inline-flex items-center gap-1.5 rounded-2xl border-b-4 border-cyan-600 bg-cyan-400 px-6 py-3 font-display text-base font-extrabold text-slate-950 hover:bg-cyan-300 active:translate-y-0.5 active:border-b-2"
              >
                <span>Start 150-Day Survival</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
