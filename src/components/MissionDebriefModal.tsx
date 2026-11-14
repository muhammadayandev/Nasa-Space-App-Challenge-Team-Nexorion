import React from 'react';
import { Award, RotateCcw, ShieldAlert, Trophy } from 'lucide-react';
import { OutpostSiteId, SITE_CONFIGS } from '../data/missionScenarios';

interface MissionDebriefModalProps {
  outcome: 'victory' | 'failed';
  failureReason: string | null;
  site: OutpostSiteId;
  day: number;
  science: number;
  scienceGoal: number;
  crewHealth: number;
  lifeSupport: number;
  food: number;
  onReplaySame: () => void;
  onSwitchAndReplay: (nextSite: OutpostSiteId) => void;
}

export const MissionDebriefModal: React.FC<MissionDebriefModalProps> = ({
  outcome,
  failureReason,
  site,
  day,
  science,
  scienceGoal,
  crewHealth,
  lifeSupport,
  food,
  onReplaySame,
  onSwitchAndReplay,
}) => {
  const siteCfg = SITE_CONFIGS[site];
  const otherSite: OutpostSiteId = site === 'moon' ? 'mars' : 'moon';
  const otherCfg = SITE_CONFIGS[otherSite];
  const isWin = outcome === 'victory';

  const badges: string[] = [];
  if (crewHealth >= 75) badges.push('Radiation Safety Chief');
  if (science >= scienceGoal) badges.push('NASA Sample Explorer');
  if (food >= 60 && lifeSupport >= 60) badges.push('Master Life-Support Engineer');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-[#0B1120] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          {isWin ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Trophy className="h-6 w-6" />
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-400">
              {siteCfg.missionLabel} · Ended on {siteCfg.dayUnit} {day}
            </p>
            <h2 id="debrief-title" className="font-display text-2xl font-bold text-white">
              {isWin ? 'Mission Complete!' : 'Outpost Emergency Evacuation'}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-200">
          {isWin
            ? science >= scienceGoal
              ? `Awesome work, Commander! You balanced electricity, oxygen, food, and storm shielding across ${siteCfg.name} while collecting ${science} NASA science samples.`
              : `Your crew survived all ${day} ${siteCfg.dayUnit.toLowerCase()}s safely! Next mission, try routing a bit more power to the Rover & Comms Dish to hit ${scienceGoal} science samples.`
            : failureReason ||
              'One of your outpost systems ran empty. Real NASA planners learn from every simulation test — try a new power balance!'}
        </p>

        {/* Final Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Crew Health</p>
            <p className="mt-1 font-mono-tabular text-lg font-bold text-white">
              {Math.round(crewHealth)}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Air & Water</p>
            <p className="mt-1 font-mono-tabular text-lg font-bold text-white">
              {Math.round(lifeSupport)}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Food Supply</p>
            <p className="mt-1 font-mono-tabular text-lg font-bold text-white">
              {Math.round(food)}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Science</p>
            <p className="mt-1 font-mono-tabular text-lg font-bold text-cyan-300">
              {science}/{scienceGoal}
            </p>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
            <p className="text-xs font-semibold text-amber-400">Explorer Certificates Earned</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {badges.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                  <Award className="h-4 w-4 text-amber-400" />
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onSwitchAndReplay(otherSite)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Try {otherCfg.name}
          </button>
          <button
            type="button"
            onClick={onReplaySame}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
