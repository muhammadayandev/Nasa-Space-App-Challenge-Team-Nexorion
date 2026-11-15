import React from 'react';
import {
  CheckCircle2,
  Lock,
  Play,
  Rocket,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  ASTRONAUT_PROFILES,
  AstronautId,
  GAME_LEVELS,
  OutpostSiteId,
} from '../data/missionScenarios';

interface GameMenuModalProps {
  currentLevelId: number;
  unlockedLevel: number;
  completedLevels: number[];
  site: OutpostSiteId;
  activeAstronaut: AstronautId;
  muted: boolean;
  voiceEnabled: boolean;
  onSelectLevel: (levelId: number) => void;
  onSelectSite: (site: OutpostSiteId) => void;
  onSelectAstronaut: (id: AstronautId) => void;
  onToggleMute: () => void;
  onToggleVoice: () => void;
  onReplayIntro: () => void;
  onClose: () => void;
}

export const GameMenuModal: React.FC<GameMenuModalProps> = ({
  currentLevelId,
  unlockedLevel,
  completedLevels,
  site,
  activeAstronaut,
  muted,
  voiceEnabled,
  onSelectLevel,
  onSelectSite,
  onSelectAstronaut,
  onToggleMute,
  onToggleVoice,
  onReplayIntro,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-menu-title"
    >
      <div className="custom-scroll max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border-4 border-sky-400/60 bg-[#081020] p-6 sm:p-8 shadow-2xl animate-[popupSlideUp_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl">
              🚀
            </span>
            <div>
              <h2 id="game-menu-title" className="font-display text-2xl font-extrabold text-white">
                Game Menu
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Pass each level to unlock the next!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Menu"
            className="rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 text-slate-300 hover:border-white hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Levels Grid */}
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {GAME_LEVELS.map((lvl) => {
            const isUnlocked = lvl.id <= unlockedLevel;
            const isDone = completedLevels.includes(lvl.id);
            const isCurrent = lvl.id === currentLevelId;

            return (
              <button
                key={lvl.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => onSelectLevel(lvl.id)}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all ${
                  isCurrent
                    ? 'border-amber-400 bg-amber-500/15'
                    : isUnlocked
                    ? 'border-slate-700 bg-slate-900 hover:border-sky-400'
                    : 'border-slate-800 bg-slate-950/60 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                  {isUnlocked ? lvl.emoji : <Lock className="h-4 w-4 text-slate-500" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-extrabold text-white">
                      Level {lvl.id}: {lvl.title}
                    </span>
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isUnlocked ? (
                      <Play className="h-4 w-4 shrink-0 text-amber-400" />
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-slate-300">{lvl.goalText}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Astronaut Picker */}
        <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-sky-400">
          Pick Your Astronaut
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2.5">
          {Object.values(ASTRONAUT_PROFILES).map((prof) => {
            const selected = prof.id === activeAstronaut;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => onSelectAstronaut(prof.id)}
                className={`rounded-2xl border-2 p-3 text-center transition-all ${
                  selected
                    ? 'border-sky-400 bg-sky-500/20'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div className="text-3xl">{prof.emoji}</div>
                <p className="mt-1 font-display text-sm font-extrabold text-white">{prof.name}</p>
                <p className="text-[11px] font-semibold text-amber-300">{prof.perkSummary}</p>
              </button>
            );
          })}
        </div>

        {/* Bottom Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-slate-800 bg-slate-900 p-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectSite('mars')}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold ${
                site === 'mars'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🔴 Mars
            </button>
            <button
              type="button"
              onClick={() => onSelectSite('moon')}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold ${
                site === 'moon'
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🌕 Moon
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
            >
              {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-sky-400" />}
              <span>{muted ? 'Muted' : 'Sound On'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleVoice}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
            >
              {voiceEnabled ? '🗣️ Voice On' : '🔇 Voice Off'}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onReplayIntro();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border-b-4 border-sky-600 bg-sky-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-sky-300 active:translate-y-0.5 active:border-b-2"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Rocket Intro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
