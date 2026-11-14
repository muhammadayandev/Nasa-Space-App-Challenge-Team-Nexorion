import React from 'react';
import { Sliders, X } from 'lucide-react';

interface SettingsModalProps {
  showBottomDock: boolean;
  onToggleBottomDock: () => void;
  autoOpenOnApproach: boolean;
  onToggleAutoOpen: () => void;
  cameraMode: 'follow' | 'overview';
  onChangeCameraMode: (mode: 'follow' | 'overview') => void;
  walkSpeed: 'normal' | 'fast';
  onChangeWalkSpeed: (speed: 'normal' | 'fast') => void;
  onReplayIntro: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  showBottomDock,
  onToggleBottomDock,
  autoOpenOnApproach,
  onToggleAutoOpen,
  cameraMode,
  onChangeCameraMode,
  walkSpeed,
  onChangeWalkSpeed,
  onReplayIntro,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B1120] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="inline-flex items-center gap-2 font-display text-xl font-bold text-white">
            <Sliders className="h-5 w-5 text-sky-400" />
            <span>Player & Control Settings</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Camera Mode */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5">
            <p className="text-xs font-semibold text-white">Camera View</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Follow directly behind Commander Maya or inspect the whole base from above.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeCameraMode('follow')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  cameraMode === 'follow'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Follow Astronaut
              </button>
              <button
                type="button"
                onClick={() => onChangeCameraMode('overview')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  cameraMode === 'overview'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Base Overview
              </button>
            </div>
          </div>

          {/* Walk Speed */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5">
            <p className="text-xs font-semibold text-white">Astronaut Walk Speed (WASD / Arrows)</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeWalkSpeed('normal')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  walkSpeed === 'normal'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Normal Walk
              </button>
              <button
                type="button"
                onClick={() => onChangeWalkSpeed('fast')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  walkSpeed === 'fast'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Fast Sprint
              </button>
            </div>
          </div>

          {/* Bottom Dock Option */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
            <div>
              <p className="text-xs font-semibold text-white">Bottom Quick-Control Bar</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Optional power dashboard at the bottom-center (shortcut: H).
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleBottomDock}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors shrink-0 ${
                showBottomDock
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {showBottomDock ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Auto-Open Proximity Option */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
            <div>
              <p className="text-xs font-semibold text-white">Auto-Open Menu Near Objects</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Automatically open a station’s menu when Maya walks up to it.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleAutoOpen}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors shrink-0 ${
                autoOpenOnApproach
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {autoOpenOnApproach ? 'On' : 'Off (Press E)'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onReplayIntro();
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Replay Earth Launch
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-500 px-5 py-2 font-display text-sm font-bold text-slate-950 hover:bg-sky-400 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
