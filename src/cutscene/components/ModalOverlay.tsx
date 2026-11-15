import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';
import type { EngineHudSnapshot } from '../scene/CutsceneEngine';

interface ModalOverlayProps {
  mode: 'paused' | 'complete';
  hud: EngineHudSnapshot;
  onResume: () => void;
  onReplayCutscene: () => void;
  onReturnTitle: () => void;
}

export const ModalOverlay: React.FC<ModalOverlayProps> = ({
  mode,
  hud,
  onResume,
  onReplayCutscene,
  onReturnTitle,
}) => {
  const completedCount = hud.objectives.filter((o) => o.completed).length;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-[#06080c]/78">
      <div className="w-full max-w-md rounded-xl bg-[#0e121a] border border-white/15 p-7 shadow-2xl">
        <div className="text-xs font-mono-tech text-amber-400 mb-1">
          {mode === 'paused' ? 'MISSION PAUSED' : 'PROLOGUE COMPLETE'}
        </div>
        <h2 className="font-display text-4xl font-bold text-white mb-2">
          {mode === 'paused' ? 'Ares IV Standby' : 'Shelter Reached'}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {mode === 'paused'
            ? 'Resume the mission cutscene or restart from Earth departure.'
            : 'You made it inside the legacy Ares II Hab airlock with reserve oxygen and life support online. Survival begins now.'}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-[#151b26] border border-white/10">
            <div className="text-[10px] font-mono-tech text-slate-400">SOL</div>
            <div className="text-lg font-mono-tech font-semibold text-white tabular-nums">
              {hud.solNumber || 1}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#151b26] border border-white/10">
            <div className="text-[10px] font-mono-tech text-slate-400">O2 RESERVE</div>
            <div className="text-lg font-mono-tech font-semibold text-white tabular-nums">
              {hud.oxygenPercent}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#151b26] border border-white/10">
            <div className="text-[10px] font-mono-tech text-slate-400">OBJECTIVES</div>
            <div className="text-lg font-mono-tech font-semibold text-white tabular-nums">
              {completedCount}/{hud.objectives.length}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {mode === 'paused' ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onResume();
              }}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#d95b2b] hover:bg-[#e56837] text-white text-sm font-semibold cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </button>
          ) : null}

          <button
            type="button"
            data-start={mode === 'complete' ? 'true' : undefined}
            onClick={(e) => {
              e.currentTarget.blur();
              onReplayCutscene();
            }}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#18202d] hover:bg-[#222c3e] border border-white/15 text-white text-sm font-medium cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay Full Cutscene</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnTitle();
            }}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 text-sm font-medium cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};
