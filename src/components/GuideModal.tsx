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
            <p className="text-xs font-semibold text-sky-400">Lone Survivor Mission Briefing ("The Martian" Protocol)</p>
            <h2 id="guide-title" className="mt-1 font-display text-2xl font-bold text-white">
              Surviving Alone at {siteCfg.name}
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
                1. Fix Your Injury, Scan Your Body & Exercise Daily
              </h3>
              <p className="mt-0.5 text-xs text-slate-300">
                After the sudden dust storm forced your crew to launch without you, you survived with a minor injury. Visit the <strong>Med-Bay & Gym</strong> first to suture your wound, run daily <strong>Whole-Body Scans</strong> (checking for DNA/neural radiation damage & 0.38g bone/muscle loss), and use the <strong>Dynamo Resistance Bike</strong> to generate +1 bonus Power Cell!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                2. Balance Power Quota, Life Support & Active Defense (EDS & Storm Shield)
              </h3>
              <p className="mt-0.5 text-xs text-slate-300">
                Solar energy is limited by Martian dust storms. Allocate your fixed <strong>Power Quota</strong> wisely: <strong>Life Support</strong> clears CO₂ build-up and heats the base; <strong>Active Defense (EDS & Storm Shield)</strong> runs current through coils to generate an Earth-like magnetic field; <strong>Potato Bio-Dome</strong> grows potatoes in composted bio-waste. Always <strong>clean solar panels manually</strong> during dust outages and <strong>take a Decon Shower</strong> after EVA walks!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                3. Excavate Buried Legacy Hardware & Contact Earth for Rescue
              </h3>
              <p className="mt-0.5 text-xs text-slate-300">
                Previous missions left equipment buried across Mars! Walk or drive the <strong>Mars Buggy</strong> to unearth <strong>5 Buried Legacy Caches</strong> (Pathfinder transponder, RTG heaters, seed crates) and align the <strong>Sat-Comms Array</strong> (<strong className="text-white">{scienceGoal} Rescue Points</strong>) so Earth knows your heart is still beating and sends the rescue ship on {siteCfg.dayUnit} {maxDays}!
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
