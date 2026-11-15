import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Droplets,
  Heart,
  Menu,
  ShieldAlert,
  Sprout,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ASTRONAUT_PROFILES,
  AstronautId,
  GameLevelSpec,
  OutpostSiteId,
} from '../data/missionScenarios';

interface TopTelemetryBarProps {
  level: GameLevelSpec;
  levelGoalMet: boolean;
  site: OutpostSiteId;
  activeAstronaut: AstronautId;
  day: number;
  maxDays: number;
  lifeSupport: number;
  food: number;
  crewHealth: number;
  radiationMsv: number;
  powerFree: number;
  powerTotal: number;
  isSolarStorm: boolean;
  isDustStorm: boolean;
  muted: boolean;
  introPlaying: boolean;
  onOpenMenu: () => void;
  onOpenCrewSwitch: () => void;
  onOpenNasaData: () => void;
  onToggleMute: () => void;
  onAdvanceDay: () => void;
}

function barColor(value: number): string {
  if (value >= 60) return 'bg-emerald-400';
  if (value >= 30) return 'bg-amber-400';
  return 'bg-rose-500';
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  level,
  levelGoalMet,
  site,
  activeAstronaut,
  day,
  maxDays,
  lifeSupport,
  food,
  crewHealth,
  radiationMsv,
  powerFree,
  powerTotal,
  isSolarStorm,
  isDustStorm,
  muted,
  introPlaying,
  onOpenMenu,
  onOpenCrewSwitch,
  onOpenNasaData,
  onToggleMute,
  onAdvanceDay,
}) => {
  if (introPlaying) return null;

  const astro = ASTRONAUT_PROFILES[activeAstronaut];
  const radPct = Math.min(100, Math.round((radiationMsv / 4.2) * 100));
  const radBarColor =
    radiationMsv > 2.2 ? 'bg-rose-500' : radiationMsv > 1.2 ? 'bg-amber-400' : 'bg-emerald-400';
  const radLabel = radiationMsv > 2.2 ? 'HIGH' : radiationMsv > 1.2 ? 'MED' : 'SAFE';

  return (
    <>
      {/* GTA-Style Compact Top-Left HUD Bars */}
      <div className="pointer-events-none fixed left-3 top-3 z-20 flex w-60 flex-col gap-2">
        <div className="pointer-events-auto rounded-2xl border border-slate-700/80 bg-[#080E1B]/85 p-3 shadow-2xl backdrop-blur-md">
          {/* Level + Day + Active Astronaut */}
          <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <p className="font-display text-xs font-extrabold tracking-wide text-amber-400">
                {level.emoji} LEVEL {level.id} · {site === 'moon' ? 'MOON' : 'MARS'}
              </p>
              <p className="font-mono-tabular text-[11px] font-semibold text-slate-300">
                Day {day} of {maxDays}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenCrewSwitch}
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/90 px-2 py-1 text-xs font-bold text-white hover:border-sky-400 transition-colors"
              title="Switch Astronaut"
            >
              <span>{astro.emoji}</span>
              <span style={{ color: astro.suitColorCss }}>{astro.name}</span>
            </button>
          </div>

          {/* 5 Clean GTA-Style Bars */}
          <div className="space-y-2">
            {/* Health */}
            <div className="flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span className="w-10 text-[11px] font-bold text-slate-200">Health</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${barColor(crewHealth)}`}
                  style={{ width: `${Math.max(4, Math.min(100, crewHealth))}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono-tabular text-[11px] font-bold text-white">
                {Math.round(crewHealth)}%
              </span>
            </div>

            {/* Air & Water */}
            <div className="flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5 shrink-0 text-sky-400" />
              <span className="w-10 text-[11px] font-bold text-slate-200">Air</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${barColor(lifeSupport)}`}
                  style={{ width: `${Math.max(4, Math.min(100, lifeSupport))}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono-tabular text-[11px] font-bold text-white">
                {Math.round(lifeSupport)}%
              </span>
            </div>

            {/* Food */}
            <div className="flex items-center gap-2">
              <Sprout className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="w-10 text-[11px] font-bold text-slate-200">Food</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${barColor(food)}`}
                  style={{ width: `${Math.max(4, Math.min(100, food))}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono-tabular text-[11px] font-bold text-white">
                {Math.round(food)}%
              </span>
            </div>

            {/* Radiation */}
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`h-3.5 w-3.5 shrink-0 ${
                  radiationMsv > 2.2 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span className="w-10 text-[11px] font-bold text-slate-200">Rad</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${radBarColor}`}
                  style={{ width: `${Math.max(8, radPct)}%` }}
                />
              </div>
              <span
                className={`w-8 text-right font-mono-tabular text-[10px] font-extrabold ${
                  radiationMsv > 2.2
                    ? 'text-rose-400'
                    : radiationMsv > 1.2
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {radLabel}
              </span>
            </div>

            {/* Power */}
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
              <span className="w-10 text-[11px] font-bold text-slate-200">Power</span>
              <div className="flex flex-1 gap-0.5">
                {Array.from({ length: powerTotal }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 flex-1 rounded-sm ${
                      idx < powerTotal - powerFree ? 'bg-amber-400' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="w-8 text-right font-mono-tabular text-[11px] font-bold text-amber-300">
                {powerTotal}⚡
              </span>
            </div>
          </div>

          {/* Goal Pill */}
          <div
            className={`mt-2.5 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold ${
              levelGoalMet
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-500/35 bg-amber-500/10 text-amber-200'
            }`}
          >
            {levelGoalMet ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <span className="text-xs">🎯</span>
            )}
            <span className="truncate">{level.goalText}</span>
          </div>

          {(isSolarStorm || isDustStorm) && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/20 px-2 py-1 text-[11px] font-bold text-rose-200 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span>{isSolarStorm ? 'Solar Storm Active!' : 'Dust Storm! Clean Solar!'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Minimal Top-Right Menu & Next Day Controls */}
      <div className="pointer-events-auto fixed right-3 top-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
          className="rounded-xl border border-slate-700/90 bg-[#080E1B]/90 p-2.5 text-slate-200 shadow-lg backdrop-blur-md hover:border-slate-500 hover:text-white transition-colors"
        >
          {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-sky-400" />}
        </button>

        <button
          type="button"
          onClick={onOpenNasaData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-[#080E1B]/90 px-3 py-2 text-xs font-bold text-cyan-300 shadow-lg backdrop-blur-md hover:bg-cyan-950/70 transition-colors"
        >
          <Database className="h-3.5 w-3.5" />
          <span>NASA</span>
        </button>

        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/90 bg-[#080E1B]/90 px-3.5 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:border-sky-400 transition-colors"
        >
          <Menu className="h-4 w-4 text-sky-400" />
          <span>Menu</span>
        </button>

        <button
          type="button"
          onClick={onAdvanceDay}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-display text-xs font-extrabold shadow-lg transition-all ${
            levelGoalMet
              ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 animate-pulse'
              : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
          }`}
        >
          <span>{day >= maxDays ? 'Finish Level' : `Next Day (${day + 1})`}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
};
