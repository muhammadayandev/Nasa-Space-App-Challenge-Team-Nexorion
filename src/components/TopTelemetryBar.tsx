import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  DoorOpen,
  Droplets,
  Dumbbell,
  FastForward,
  Heart,
  Menu,
  Pill,
  Radio,
  ShieldAlert,
  SkipForward,
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

export interface TutorialGoalItem {
  label: string;
  done: boolean;
}

interface TopTelemetryBarProps {
  gameMode: 'tutorial' | 'survival';
  worldLocation: 'outside' | 'inside';
  level: GameLevelSpec;
  levelGoalMet: boolean;
  tutorialChecklist: TutorialGoalItem[];
  site: OutpostSiteId;
  activeAstronaut: AstronautId;
  day: number;
  maxDays: number;
  survivalTargetDays: number;
  lifeSupport: number;
  food: number;
  crewHealth: number;
  muscleBone: number;
  lastScannedSol: number;
  commsRepair: number;
  earthContacted: boolean;
  radiationMsv: number;
  radiationPct: number;
  medkits: number;
  powerFree: number;
  powerTotal: number;
  isSolarStorm: boolean;
  isDustStorm: boolean;
  solarDust: number;
  inShelter: boolean;
  dustStormPhase: 'clear' | 'raging' | 'settled';
  shelterGraceSec: number;
  stormSecondsLeft: number;
  muted: boolean;
  introPlaying: boolean;
  onOpenMenu: () => void;
  onOpenCrewSwitch: () => void;
  onOpenNasaData: () => void;
  onToggleMute: () => void;
  onAdvanceDay: () => void;
  onFastForwardSols: () => void;
  onToggleWorldLocation: () => void;
  onWalkToInsideLab: () => void;
  onWalkToShelter: () => void;
  onWalkToSolar: () => void;
  onUseMedkit: () => void;
  onSkipTutorialLevel: () => void;
  onSkipAllTutorials: () => void;
}

function barColor(value: number): string {
  if (value >= 60) return 'bg-emerald-400';
  if (value >= 30) return 'bg-amber-400';
  return 'bg-rose-500';
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  gameMode,
  worldLocation,
  level,
  levelGoalMet,
  tutorialChecklist,
  site,
  activeAstronaut,
  day,
  maxDays,
  survivalTargetDays,
  lifeSupport,
  food,
  crewHealth,
  muscleBone,
  lastScannedSol,
  commsRepair,
  earthContacted,
  radiationPct,
  medkits,
  powerFree,
  powerTotal,
  isSolarStorm,
  isDustStorm,
  solarDust,
  inShelter,
  dustStormPhase,
  shelterGraceSec,
  stormSecondsLeft,
  muted,
  introPlaying,
  onOpenMenu,
  onOpenCrewSwitch,
  onOpenNasaData,
  onToggleMute,
  onAdvanceDay,
  onFastForwardSols,
  onToggleWorldLocation,
  onWalkToInsideLab,
  onWalkToShelter,
  onWalkToSolar,
  onUseMedkit,
  onSkipTutorialLevel,
  onSkipAllTutorials,
}) => {
  if (introPlaying) return null;

  const astro = ASTRONAUT_PROFILES[activeAstronaut];
  const radPct = Math.max(0, Math.min(100, Math.round(radiationPct)));
  const radBarColor =
    radPct >= 75 ? 'bg-rose-500 animate-pulse' : radPct >= 45 ? 'bg-amber-400' : 'bg-emerald-400';
  const scanOverdueDays = Math.max(0, day - lastScannedSol);
  const tutorialProgressPct = Math.round(((level.id - 1) / 5) * 100 + (levelGoalMet ? 20 : 8));

  return (
    <>
      {/* GTA-Style Compact Top-Left HUD Bars */}
      <div className="pointer-events-none fixed left-3 top-3 z-20 flex w-64 flex-col gap-2">
        <div className="pointer-events-auto rounded-2xl border border-slate-700/80 bg-[#080E1B]/85 p-3 shadow-2xl backdrop-blur-md">
          {/* Level / Mode + Day + Active Astronaut */}
          <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <p className="font-display text-xs font-extrabold tracking-wide text-amber-400">
                {gameMode === 'survival'
                  ? `🛰️ SURVIVAL · ${site === 'moon' ? 'MOON' : 'MARS'}`
                  : `${level.emoji} TUTORIAL ${level.id}/5 · ${site === 'moon' ? 'MOON' : 'MARS'}`}
              </p>
              <p className="font-mono-tabular text-[11px] font-semibold text-slate-300">
                {gameMode === 'survival'
                  ? `Sol ${day} / ${survivalTargetDays}`
                  : `Day ${day} of ${maxDays}`}
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
                  radPct >= 75 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span className="w-10 text-[11px] font-bold text-slate-200">Rad</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${radBarColor}`}
                  style={{ width: `${Math.max(4, radPct)}%` }}
                />
              </div>
              <span
                className={`w-8 text-right font-mono-tabular text-[11px] font-extrabold ${
                  radPct >= 75
                    ? 'text-rose-400'
                    : radPct >= 45
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {radPct}%
              </span>
            </div>

            {radPct >= 30 && medkits > 0 && (
              <button
                type="button"
                onClick={onUseMedkit}
                className="flex w-full items-center justify-between rounded-xl border border-rose-400/50 bg-rose-500/20 px-2.5 py-1 text-[11px] font-extrabold text-rose-200 hover:bg-rose-500/35 transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  <Pill className="h-3 w-3 text-rose-300" />
                  <span>Use Anti-Rad Medkit ({medkits})</span>
                </span>
                <span className="text-emerald-300">-45% Rad</span>
              </button>
            )}

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

            {/* Muscle & Bone (Survival Mode) */}
            {gameMode === 'survival' && (
              <div className="flex items-center gap-2">
                <Dumbbell className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="w-10 text-[11px] font-bold text-slate-200">Muscle</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor(muscleBone)}`}
                    style={{ width: `${Math.max(4, Math.min(100, muscleBone))}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono-tabular text-[11px] font-bold text-slate-300">
                  {Math.round(muscleBone)}%
                </span>
              </div>
            )}
          </div>

          {/* Earth Comms & Scan Alerts (Survival Mode) */}
          {gameMode === 'survival' && (
            <div className="mt-2.5 space-y-1.5">
              {earthContacted ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300">
                  <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">Earth Linked! Rescue Sol {survivalTargetDays}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onWalkToInsideLab}
                  className="flex w-full items-center justify-between gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/15 px-2.5 py-1.5 text-left text-[11px] font-bold text-rose-200 hover:bg-rose-500/25 transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Radio className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                    <span className="truncate">Comms {Math.round(commsRepair)}% — Fix in Lab</span>
                  </span>
                </button>
              )}

              {scanOverdueDays >= 10 && (
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                  <Activity className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>Body Scan Due ({scanOverdueDays}d ago)</span>
                </div>
              )}
            </div>
          )}

          {dustStormPhase === 'raging' && (
            <div
              className={`mt-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-bold ${
                inShelter
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-rose-500/70 bg-rose-500/25 text-rose-100 animate-pulse'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1">
                  {inShelter ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  )}
                  <span>
                    {inShelter
                      ? `Safe in Shelter (${Math.ceil(stormSecondsLeft)}s)`
                      : `DUST STORM! (${Math.ceil(stormSecondsLeft)}s)`}
                  </span>
                </span>
              </div>
              {!inShelter && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-amber-200">
                    {shelterGraceSec > 0
                      ? `Run to Station (${Math.ceil(shelterGraceSec)}s)!`
                      : 'Get to Station now!'}
                  </span>
                  <button
                    type="button"
                    onClick={onWalkToShelter}
                    className="rounded-lg bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    Run to Shelter
                  </button>
                </div>
              )}
            </div>
          )}

          {dustStormPhase !== 'raging' && solarDust >= 65 && (
            <div className="mt-1.5 flex items-center justify-between gap-1.5 rounded-xl border border-amber-400/60 bg-amber-500/20 px-2 py-1.5 text-[11px] font-bold text-amber-200 animate-pulse">
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>Panels Dusty ({powerTotal}⚡)!</span>
              </span>
              <button
                type="button"
                onClick={onWalkToSolar}
                className="rounded-lg bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Clean Solar
              </button>
            </div>
          )}

          {dustStormPhase !== 'raging' && solarDust < 65 && (isSolarStorm || isDustStorm) && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/20 px-2 py-1 text-[11px] font-bold text-rose-200 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span>{isSolarStorm ? 'Solar Storm Active!' : 'Dust Storm Alert!'}</span>
            </div>
          )}
        </div>

        {/* Separate Tutorial Progress Bar & Goals Card (Disappears when skipped or complete) */}
        {gameMode === 'tutorial' && (
          <div className="pointer-events-auto rounded-2xl border border-amber-400/50 bg-[#080E1B]/90 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] font-extrabold">
              <span className="uppercase tracking-wide text-amber-300">
                Tutorial Progress
              </span>
              <span className="font-mono-tabular text-sky-300">
                Level {level.id}/5 · {tutorialProgressPct}%
              </span>
            </div>

            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${tutorialProgressPct}%` }}
              />
            </div>

            {/* Goals Checklist for Current Level */}
            <div className="mt-2.5 space-y-1 border-t border-slate-800 pt-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Level {level.id} Goals
              </p>
              {tutorialChecklist.map((goal) => (
                <div
                  key={goal.label}
                  className="flex items-start gap-1.5 text-[11px] font-bold leading-snug"
                >
                  <span className="shrink-0">{goal.done ? '✅' : '⬜'}</span>
                  <span
                    className={
                      goal.done ? 'text-emerald-300 line-through opacity-80' : 'text-slate-100'
                    }
                  >
                    {goal.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Skip Tutorial / Skip All Tutorials Controls */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onSkipTutorialLevel}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-extrabold text-slate-200 hover:border-amber-400 hover:text-amber-300 transition-colors"
              >
                <SkipForward className="h-3 w-3" />
                <span>Skip Tutorial</span>
              </button>
              <button
                type="button"
                onClick={onSkipAllTutorials}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-2 py-1.5 text-[10px] font-extrabold text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/70 transition-colors"
              >
                <FastForward className="h-3 w-3" />
                <span>Skip All Tutorials</span>
              </button>
            </div>
          </div>
        )}
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
          onClick={onToggleWorldLocation}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition-colors ${
            worldLocation === 'inside'
              ? 'border-emerald-400/60 bg-emerald-950/90 text-emerald-200 hover:bg-emerald-900'
              : 'border-indigo-400/50 bg-[#080E1B]/90 text-indigo-200 hover:border-indigo-300'
          }`}
          title="Enter or Exit Space Station & Greenhouse"
        >
          <DoorOpen className="h-3.5 w-3.5" />
          <span>{worldLocation === 'inside' ? 'Go Outside' : 'Enter Base'}</span>
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

        {gameMode === 'survival' && (
          <button
            type="button"
            onClick={onFastForwardSols}
            disabled={dustStormPhase === 'raging'}
            title="Safely advance up to 5 Sols (stops for storms, harvests, or low vitals)"
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 font-display text-xs font-extrabold shadow-lg transition-all ${
              dustStormPhase === 'raging'
                ? 'cursor-not-allowed border-slate-700 bg-slate-900/70 text-slate-500'
                : 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/35'
            }`}
          >
            <FastForward className="h-3.5 w-3.5" />
            <span>+5 Sols</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvanceDay}
          disabled={dustStormPhase === 'raging'}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-display text-xs font-extrabold shadow-lg transition-all ${
            dustStormPhase === 'raging'
              ? 'cursor-not-allowed border border-rose-400/50 bg-rose-950/90 text-rose-200'
              : gameMode === 'tutorial' && levelGoalMet
              ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 animate-pulse'
              : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
          }`}
        >
          <span>
            {dustStormPhase === 'raging'
              ? 'Seek Shelter!'
              : gameMode === 'survival'
              ? day >= survivalTargetDays && earthContacted
                ? 'Rescue Ready!'
                : `Next Sol (${day + 1})`
              : day >= maxDays
              ? 'Finish Level'
              : `Next Day (${day + 1})`}
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
};
