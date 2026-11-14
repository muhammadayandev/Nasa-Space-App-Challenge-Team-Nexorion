import React from 'react';
import {
  ArrowRight,
  Database,
  Droplets,
  HeartPulse,
  Radio,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  MODULE_SPECS,
  ModuleId,
  OutpostSiteId,
  PowerSystemKey,
  SITE_CONFIGS,
} from '../data/missionScenarios';

interface StationInteractModalProps {
  stationId: Exclude<ModuleId, 'overview'>;
  site: OutpostSiteId;
  day: number;
  maxDays: number;
  lifeSupport: number;
  food: number;
  crewHealth: number;
  science: number;
  scienceGoal: number;
  solarDust: number;
  radiationMsv: number;
  totalPowerCells: number;
  powerAllocation: Record<PowerSystemKey, number>;
  onSetPower: (key: PowerSystemKey, level: number) => void;
  onStationAction: (actionId: string) => void;
  onAdvanceDay: () => void;
  onOpenNasaData: () => void;
  onClose: () => void;
}

const LEVEL_LABELS = ['Off', '1', '2', '3'];

export const StationInteractModal: React.FC<StationInteractModalProps> = ({
  stationId,
  site,
  day,
  maxDays,
  lifeSupport,
  food,
  crewHealth,
  science,
  scienceGoal,
  solarDust,
  radiationMsv,
  totalPowerCells,
  powerAllocation,
  onSetPower,
  onStationAction,
  onAdvanceDay,
  onOpenNasaData,
  onClose,
}) => {
  const spec = MODULE_SPECS[stationId];
  const siteCfg = SITE_CONFIGS[site];
  const usedCells =
    powerAllocation.lifesupport +
    powerAllocation.greenhouse +
    powerAllocation.shield +
    powerAllocation.science;
  const freeCells = totalPowerCells - usedCells;
  const powerKey = spec.powerKey;
  const currentPower = powerKey ? powerAllocation[powerKey] : null;
  const maxReachable = currentPower !== null ? currentPower + freeCells : 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0B1120] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-amber-400">{spec.role}</p>
            <h2 id="station-modal-title" className="mt-0.5 font-display text-xl font-bold text-white">
              {spec.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close station menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-slate-300">{spec.plainExplanation}</p>

        {/* Station-Specific Live Status */}
        <div className="mt-3.5 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
          {stationId === 'solar' && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Sun className="h-4 w-4 text-amber-400" />
                Panel Dust Coverage
              </span>
              <span
                className={`font-mono-tabular font-bold ${
                  solarDust >= 40 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {solarDust}% {solarDust >= 40 ? '(Needs Cleaning)' : '(Clean)'}
              </span>
            </div>
          )}

          {stationId === 'lifesupport' && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Droplets className="h-4 w-4 text-sky-400" />
                Oxygen & Recycled Water Tank
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {Math.round(lifeSupport)}%
              </span>
            </div>
          )}

          {stationId === 'greenhouse' && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Sprout className="h-4 w-4 text-emerald-400" />
                Food Storage & Hydroponics
              </span>
              <span className="font-mono-tabular font-bold text-white">{Math.round(food)}%</span>
            </div>
          )}

          {stationId === 'habitat' && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Shield className="h-4 w-4 text-sky-400" />
                Current Radiation Dose Inside
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {radiationMsv.toFixed(2)} mSv/day
              </span>
            </div>
          )}

          {stationId === 'science' && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                Mission Science Samples
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {science} / {scienceGoal}
              </span>
            </div>
          )}

          {stationId === 'comms' && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Radio className="h-4 w-4 text-cyan-400" />
                Earth Radio Delay ({siteCfg.name})
              </span>
              <span className="font-mono-tabular font-bold text-white">{siteCfg.commDelayText}</span>
            </div>
          )}

          {stationId === 'crew' && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <HeartPulse className="h-4 w-4 text-emerald-400" />
                Team Health (Maya, Leo & Zara)
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {Math.round(crewHealth)}%
              </span>
            </div>
          )}
        </div>

        {/* Power Level Selector for This Station (when applicable) */}
        {powerKey && currentPower !== null && (
          <div className="mt-3.5 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Power Assigned Here
              </span>
              <span className="font-mono-tabular text-slate-400">
                Spare Power: {freeCells}/{totalPowerCells} cells
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-slate-950 p-1">
              {[0, 1, 2, 3].map((lvl) => {
                const isSelected = currentPower === lvl;
                const canReach = lvl <= maxReachable;
                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={!canReach}
                    onClick={() => onSetPower(powerKey, lvl)}
                    className={`h-8 rounded-md text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950'
                        : canReach
                        ? 'text-slate-200 hover:bg-slate-800'
                        : 'text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {LEVEL_LABELS[lvl]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Hands-On Station Action (Every station has a real interactive trade-off!) */}
        <div className="mt-4 space-y-2.5">
          {stationId === 'solar' && (
            <button
              type="button"
              disabled={solarDust < 10}
              onClick={() => onStationAction('clean-solar')}
              className="flex w-full items-center justify-between rounded-xl border border-amber-500/50 bg-amber-500/10 p-3.5 text-left hover:bg-amber-500/20 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <div>
                <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-white">
                  <Wrench className="h-4 w-4 text-amber-400" />
                  Brush Dust Off Solar Panels
                </p>
                <p className="mt-1 text-xs text-emerald-400">Gain: Resets dust to 0% & +1 Spare Power Cell</p>
                <p className="text-xs text-amber-400">Cost: -8% Air & Water · -5% Crew Health</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" />
            </button>
          )}

          {stationId === 'lifesupport' && (
            <button
              type="button"
              onClick={() => onStationAction('flush-filters')}
              className="flex w-full items-center justify-between rounded-xl border border-sky-500/50 bg-sky-500/10 p-3.5 text-left hover:bg-sky-500/20 transition-colors"
            >
              <div>
                <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-white">
                  <Droplets className="h-4 w-4 text-sky-400" />
                  Scrub CO₂ & Flush Water Filters
                </p>
                <p className="mt-1 text-xs text-emerald-400">Gain: +12% Air & Water right now</p>
                <p className="text-xs text-amber-400">Cost: -7% Crew Health (manual maintenance)</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-sky-400" />
            </button>
          )}

          {stationId === 'greenhouse' && (
            <button
              type="button"
              onClick={() => onStationAction('harvest-greens')}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3.5 text-left hover:bg-emerald-500/20 transition-colors"
            >
              <div>
                <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-white">
                  <Sprout className="h-4 w-4 text-emerald-400" />
                  Harvest Fresh Hydroponic Greens
                </p>
                <p className="mt-1 text-xs text-emerald-400">Gain: +12% Food & +5% Crew Health</p>
                <p className="text-xs text-amber-400">Cost: -9% Water to start next crop batch</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-emerald-400" />
            </button>
          )}

          {stationId === 'science' && (
            <button
              type="button"
              onClick={() => onStationAction('drill-sample')}
              className="flex w-full items-center justify-between rounded-xl border border-cyan-500/50 bg-cyan-500/10 p-3.5 text-left hover:bg-cyan-500/20 transition-colors"
            >
              <div>
                <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-white">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Run Rover Core Drill Sample
                </p>
                <p className="mt-1 text-xs text-emerald-400">Gain: +1 Science Sample toward goal</p>
                <p className="text-xs text-amber-400">Cost: -9% Air & Water · -6% Crew Health</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-cyan-400" />
            </button>
          )}

          {stationId === 'comms' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onStationAction('beam-earth')}
                className="flex w-full items-center justify-between rounded-xl border border-cyan-500/50 bg-cyan-500/10 p-3.5 text-left hover:bg-cyan-500/20 transition-colors"
              >
                <div>
                  <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-white">
                    <Radio className="h-4 w-4 text-cyan-400" />
                    Transmit High-Power Data to Earth
                  </p>
                  <p className="mt-1 text-xs text-emerald-400">Gain: +1 Science Sample transmitted</p>
                  <p className="text-xs text-amber-400">Cost: -10% Air & Water (dish cooling)</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-cyan-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNasaData();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-semibold text-sky-300 hover:bg-slate-800 transition-colors"
              >
                <Database className="h-3.5 w-3.5" />
                <span>View Live NASA DONKI & RadLab Data</span>
              </button>
            </div>
          )}

          {stationId === 'crew' && (
            <button
              type="button"
              onClick={() => onStationAction('crew-snack')}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3.5 text-left hover:bg-emerald-500/20 transition-colors"
            >
              <div>
                <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-white">
                  <HeartPulse className="h-4 w-4 text-emerald-400" />
                  Share Fresh Meal & Medical Check
                </p>
                <p className="mt-1 text-xs text-emerald-400">Gain: +10% Crew Health</p>
                <p className="text-xs text-amber-400">Cost: -9% Food Supply</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-emerald-400" />
            </button>
          )}

          {stationId === 'habitat' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAdvanceDay();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-amber-500 p-3.5 text-left text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <div>
                <p className="font-display text-sm font-bold">
                  {day >= maxDays
                    ? 'Complete Mission & Report to Earth'
                    : `Crew Rest & Start ${siteCfg.dayUnit} ${day + 1}`}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-900">
                  Applies today’s power settings and checks space weather!
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
