import React from 'react';
import { Compass, Footprints, Scale, Sparkles, X } from 'lucide-react';
import { OutpostSiteId, SITE_CONFIGS } from '../data/missionScenarios';

interface GuideModalProps {
  site: OutpostSiteId;
  scienceGoal: number;
  maxDays: number;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  site,
  scienceGoal,
  maxDays,
  onClose,
}) => {
  const siteCfg = SITE_CONFIGS[site];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-[#0B1120] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-sky-400">Junior Astronaut Briefing</p>
            <h2 id="guide-title" className="mt-1 font-display text-2xl font-bold text-white">
              Welcome to {siteCfg.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission guide"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">{siteCfg.environmentFact}</p>

        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
            <Footprints className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                1. Walk Around as Commander Maya
              </h3>
              <p className="mt-0.5 text-xs text-slate-300">
                Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to walk across the surface,
                and drag the mouse to look around! Walk up to any glowing station ring (Solar Panels,
                Air & Water Tanks, Greenhouse, Rover, Comms, or Habitat) and press <strong>E</strong>{' '}
                or click to open its menu.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                2. Make Real NASA Trade-Offs
              </h3>
              <p className="mt-0.5 text-xs text-slate-300">
                Every action has a cost! Brushing dust off Solar Panels restores electricity,
                harvesting crops gives food, and drilling rocks earns Science—but uses Air & Water
                or Crew energy. You can also turn on the optional Bottom Quick Bar inside{' '}
                <strong>Controls</strong> (or press <strong>H</strong>).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                3. Complete the {maxDays}-{siteCfg.dayUnit} Mission
              </h3>
              <p className="mt-0.5 text-xs text-slate-300">
                Keep Crew Health, Air & Water, and Food above 0%, shelter during solar flares, and
                collect <strong className="text-white">{scienceGoal} Science Samples</strong>!
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Compass className="h-4 w-4 text-sky-400" />
            <span>
              Gravity: {siteCfg.gravityG}g · Radio Delay: {siteCfg.commDelayText}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-500 px-5 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-sky-400 transition-colors"
          >
            Explore Outpost
          </button>
        </div>
      </div>
    </div>
  );
};
