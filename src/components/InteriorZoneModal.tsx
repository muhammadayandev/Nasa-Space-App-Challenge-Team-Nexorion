import React from 'react';
import {
  Activity,
  ArrowRight,
  Dumbbell,
  FlaskConical,
  HeartPulse,
  Pill,
  Radio,
  ScanLine,
  Sprout,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  CROP_LABELS,
  CropPlotState,
  CropType,
  InteriorZoneId,
  PowerSystemKey,
} from '../data/missionScenarios';

interface InteriorZoneModalProps {
  zoneId: Exclude<InteriorZoneId, 'exit_station' | 'exit_greenhouse'>;
  gameMode: 'tutorial' | 'survival';
  day: number;
  maxDays: number;
  lifeSupport: number;
  food: number;
  crewHealth: number;
  science: number;
  muscleBone: number;
  radiationMsv: number;
  radiationPct: number;
  medkits: number;
  bodyRadiationDose: number;
  lastScannedSol: number;
  commsRepair: number;
  earthContacted: boolean;
  cropPlots: CropPlotState[];
  scanningActive: boolean;
  greenhousePower: number;
  freePowerCells: number;
  isDustStorm: boolean;
  onFixComms: () => void;
  onLabAnalyze: () => void;
  onCraftMedkit: () => void;
  onExercise: () => void;
  onRunBodyScan: () => void;
  onUseMedkit: () => void;
  onPlantCrops: (cropType: CropType) => void;
  onWaterCrops: () => void;
  onHarvestCrops: () => void;
  onSetPower: (key: PowerSystemKey, level: number) => void;
  onAdvanceDay: () => void;
  onClose: () => void;
}

const STAGE_NAMES: Record<0 | 1 | 2 | 3, string> = {
  0: 'Empty Soil',
  1: 'Sprouting 🌱',
  2: 'Growing 🌿',
  3: 'Ripe Food! 🍅',
};

export const InteriorZoneModal: React.FC<InteriorZoneModalProps> = ({
  zoneId,
  gameMode,
  day,
  maxDays,
  lifeSupport,
  food,
  crewHealth,
  science,
  muscleBone,
  radiationMsv,
  radiationPct,
  medkits,
  bodyRadiationDose,
  lastScannedSol,
  commsRepair,
  earthContacted,
  cropPlots,
  scanningActive,
  greenhousePower,
  freePowerCells,
  isDustStorm,
  onFixComms,
  onLabAnalyze,
  onCraftMedkit,
  onExercise,
  onRunBodyScan,
  onUseMedkit,
  onPlantCrops,
  onWaterCrops,
  onHarvestCrops,
  onSetPower,
  onAdvanceDay,
  onClose,
}) => {
  const emptyCount = cropPlots.filter((p) => p.stage === 0).length;
  const growingCount = cropPlots.filter((p) => p.stage === 1 || p.stage === 2).length;
  const ripeCount = cropPlots.filter((p) => p.stage === 3).length;
  const maxReachableGh = greenhousePower + freePowerCells;

  const titles: Record<typeof zoneId, { tag: string; title: string; subtitle: string }> = {
    lab: {
      tag: 'STATION LABORATORY',
      title: 'Science & Radio Workdesk',
      subtitle:
        gameMode === 'survival'
          ? 'Fix damaged Earth radio equipment and study Mars samples!'
          : 'Study Mars rock samples and manage base systems safely indoors.',
    },
    exercise: {
      tag: 'ZERO-G FITNESS BAY',
      title: 'Treadmill & Bone Trainer',
      subtitle: 'Low gravity weakens muscles and bones. Exercise regularly!',
    },
    scanner: {
      tag: 'MED-BAY DIAGNOSTICS',
      title: 'Health & Radiation Scanner',
      subtitle: 'Step inside to check radiation, muscles, and bone strength.',
    },
    greenhouse_beds: {
      tag: 'ATTACHED GREENHOUSE',
      title: 'Hydroponic Crop Beds',
      subtitle: 'Plant seeds, grow plants with LED light, and harvest fresh food!',
    },
  };

  const hdr = titles[zoneId];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="custom-scroll max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border-4 border-sky-400/50 bg-[#081020] p-6 sm:p-8 shadow-2xl animate-[popupSlideUp_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              {hdr.tag}
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              {hdr.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-2xl border-2 border-slate-700 bg-slate-900 p-2.5 text-slate-300 hover:border-white hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2.5 text-base font-medium text-slate-200">{hdr.subtitle}</p>

        {/* LAB WORKDESK */}
        {zoneId === 'lab' && (
          <div className="mt-5 space-y-4">
            {/* Damaged Comms Repair Bench */}
            <div
              className={`rounded-2xl border-2 p-4 ${
                earthContacted
                  ? 'border-emerald-400/60 bg-emerald-500/15'
                  : 'border-rose-400/50 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                  <Radio
                    className={`h-5 w-5 ${
                      earthContacted ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  />
                  <span>
                    {earthContacted
                      ? 'Earth Radio Connected!'
                      : 'Damaged Earth Radio Antenna'}
                  </span>
                </span>
                <span
                  className={`font-mono-tabular text-sm font-extrabold ${
                    earthContacted ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {commsRepair}% Fixed
                </span>
              </div>

              <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    earthContacted ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${commsRepair}%` }}
                />
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-300">
                {earthContacted
                  ? 'NASA heard your signal! Rescue ship is on course for Day 150.'
                  : 'The dust storm broke Earth comms! Keep fixing it here until 100%.'}
              </p>

              {!earthContacted && (
                <button
                  type="button"
                  onClick={onFixComms}
                  className="mt-3 flex w-full items-center justify-between rounded-2xl border-2 border-amber-400/70 bg-amber-500/20 p-3.5 text-left hover:bg-amber-500/30 transition-all"
                >
                  <div>
                    <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                      <Wrench className="h-4 w-4 text-amber-300" />
                      <span>Fix Comms Equipment</span>
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-amber-200">
                      +20% Repair Progress · Cost: -5% Air & -4% Health
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onLabAnalyze}
              className="flex w-full items-center justify-between rounded-2xl border-2 border-cyan-400/50 bg-cyan-500/15 p-4 text-left hover:bg-cyan-500/25 transition-all"
            >
              <div>
                <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                  <FlaskConical className="h-5 w-5 text-cyan-400" />
                  <span>Test Rocks at Microscope</span>
                </p>
                <p className="mt-0.5 text-xs font-bold text-emerald-300">
                  +2 Science Points (Now: {science} pts) · Cost: -4% Air
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white" />
            </button>

            <button
              type="button"
              onClick={onCraftMedkit}
              className="flex w-full items-center justify-between rounded-2xl border-2 border-rose-400/50 bg-rose-500/15 p-4 text-left hover:bg-rose-500/25 transition-all"
            >
              <div>
                <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                  <Pill className="h-5 w-5 text-rose-400" />
                  <span>Synthesize Anti-Rad Medkit (Have: {medkits})</span>
                </p>
                <p className="mt-0.5 text-xs font-bold text-emerald-300">
                  +1 Medkit (-45% Rad cure) · Cost: -8% Air &amp; -6% Food
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white" />
            </button>

            <button
              type="button"
              disabled={isDustStorm}
              onClick={() => {
                onClose();
                onAdvanceDay();
              }}
              className={`flex w-full items-center justify-between rounded-2xl border-b-4 p-4 text-left transition-all ${
                isDustStorm
                  ? 'cursor-not-allowed border-rose-800 bg-rose-950/70 text-rose-200'
                  : 'border-amber-600 bg-amber-400 text-slate-950 hover:bg-amber-300 active:translate-y-0.5 active:border-b-2'
              }`}
            >
              <span className="font-display text-base font-extrabold">
                {isDustStorm
                  ? 'Wait Out Dust Storm Inside...'
                  : gameMode === 'tutorial' && day >= maxDays
                  ? 'Finish Tutorial Level!'
                  : `Sleep Indoors (Start Day ${day + 1})`}
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </button>
          </div>
        )}

        {/* EXERCISE GYM */}
        {zoneId === 'exercise' && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-300">Muscle &amp; Bone Strength:</span>
                <span
                  className={`font-extrabold ${
                    muscleBone >= 65
                      ? 'text-emerald-400'
                      : muscleBone >= 35
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {Math.round(muscleBone)}%
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    muscleBone >= 65
                      ? 'bg-emerald-400'
                      : muscleBone >= 35
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.round(muscleBone)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onExercise}
              className="flex w-full items-center justify-between rounded-2xl border-2 border-emerald-400/60 bg-emerald-500/15 p-4 text-left hover:bg-emerald-500/25 transition-all"
            >
              <div>
                <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                  <Dumbbell className="h-5 w-5 text-emerald-400" />
                  <span>Workout on Treadmill &amp; Weights</span>
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-300">
                  +18% Muscle &amp; Bone · +5% Health · Cost: -6% Food &amp; -6% Air
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
          </div>
        )}

        {/* BIOMETRIC BODY SCANNER */}
        {zoneId === 'scanner' && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-3">
                <Activity className="mx-auto h-5 w-5 text-emerald-400" />
                <p className="mt-1 text-[11px] font-bold text-slate-400">Muscle &amp; Bone</p>
                <p className="font-mono-tabular text-lg font-extrabold text-white">
                  {Math.round(muscleBone)}%
                </p>
              </div>
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-3">
                <HeartPulse className="mx-auto h-5 w-5 text-rose-400" />
                <p className="mt-1 text-[11px] font-bold text-slate-400">Health / Air</p>
                <p className="font-mono-tabular text-lg font-extrabold text-white">
                  {Math.round(crewHealth)}% · {Math.round(lifeSupport)}%
                </p>
              </div>
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-3">
                <ScanLine className="mx-auto h-5 w-5 text-cyan-400" />
                <p className="mt-1 text-[11px] font-bold text-slate-400">Body Radiation</p>
                <p
                  className={`font-mono-tabular text-lg font-extrabold ${
                    radiationPct >= 75
                      ? 'text-rose-400'
                      : radiationPct >= 45
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {Math.round(radiationPct)}%
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-2.5 text-xs font-bold text-cyan-200">
              {scanningActive
                ? '🔵 Laser Body Scan Running... Checking bones, muscles & radiation!'
                : radiationPct >= 75
                ? `⚠️ DANGER: Radiation at ${Math.round(radiationPct)}% (100% is fatal)! Use an Anti-Rad Medkit!`
                : day - lastScannedSol >= 5
                ? `⚠️ Last scan was ${day - lastScannedSol} days ago. Scan regularly!`
                : `✅ Body checkup up to date (Day ${lastScannedSol || 1}). Dose rate: ${(bodyRadiationDose + radiationMsv).toFixed(1)} mSv`}
            </div>

            <button
              type="button"
              onClick={onRunBodyScan}
              disabled={scanningActive}
              className="flex w-full items-center justify-between rounded-2xl border-2 border-cyan-400/70 bg-cyan-500/20 p-4 text-left hover:bg-cyan-500/30 transition-all disabled:opacity-60"
            >
              <div>
                <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                  <ScanLine className="h-5 w-5 text-cyan-300" />
                  <span>{scanningActive ? 'Scanning Body...' : 'Run Full Body Checkup'}</span>
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-300">
                  Checks Rad &amp; Bone Loss · +6% Health · -10% Rad Buildup · Cost: -4% Air
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white" />
            </button>

            <button
              type="button"
              onClick={onUseMedkit}
              disabled={medkits <= 0}
              className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                medkits > 0
                  ? 'border-rose-400/70 bg-rose-500/20 hover:bg-rose-500/30'
                  : 'cursor-not-allowed border-slate-700 bg-slate-900 opacity-50'
              }`}
            >
              <div>
                <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                  <Pill className="h-5 w-5 text-rose-400" />
                  <span>Use Anti-Radiation Medkit ({medkits} left)</span>
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-300">
                  Cures -45% Body Radiation &amp; +15% Crew Health
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
          </div>
        )}

        {/* ATTACHED GREENHOUSE PLANTATIONS */}
        {zoneId === 'greenhouse_beds' && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border-2 border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-300">Food Supply Bar:</span>
              <span className="font-extrabold text-emerald-300">{Math.round(food)}%</span>
            </div>

            {/* 3 Raised Planter Plot Status */}
            <div className="grid grid-cols-3 gap-2.5">
              {cropPlots.map((plot) => (
                <div
                  key={plot.id}
                  className={`rounded-2xl border-2 p-3 text-center ${
                    plot.stage === 3
                      ? 'border-emerald-400 bg-emerald-500/20'
                      : plot.stage > 0
                      ? 'border-sky-500/40 bg-slate-900'
                      : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <p className="text-[11px] font-extrabold uppercase text-slate-400">
                    Bed {plot.id + 1}
                  </p>
                  <p className="mt-1 font-display text-xs font-extrabold text-white">
                    {plot.stage === 0 ? 'Soil Ready' : CROP_LABELS[plot.cropType]}
                  </p>
                  <p
                    className={`mt-1 text-xs font-bold ${
                      plot.stage === 3
                        ? 'text-emerald-300'
                        : plot.stage > 0
                        ? 'text-amber-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {STAGE_NAMES[plot.stage]}
                  </p>
                </div>
              ))}
            </div>

            {/* Greenhouse LED Power Control */}
            <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-extrabold text-amber-300">
                  <Zap className="h-4 w-4" />
                  <span>Grow Lights Power</span>
                </span>
                <span className="text-xs font-bold text-slate-300">
                  Free Power: {freePowerCells}⚡
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((lvl) => {
                  const active = greenhousePower === lvl;
                  const reachable = lvl <= maxReachableGh;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={!reachable}
                      onClick={() => onSetPower('greenhouse', lvl)}
                      className={`rounded-xl border-2 py-2 font-display text-xs font-extrabold transition-all ${
                        active
                          ? 'border-amber-300 bg-amber-400 text-slate-950'
                          : reachable
                          ? 'border-slate-700 bg-slate-900 text-white hover:border-amber-400/70'
                          : 'cursor-not-allowed border-slate-800 bg-slate-950/60 text-slate-600'
                      }`}
                    >
                      {lvl === 0 ? 'Off' : `${lvl}⚡`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Harvest Button */}
            {ripeCount > 0 && (
              <button
                type="button"
                onClick={onHarvestCrops}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-emerald-400 bg-emerald-500/25 p-4 text-left ring-2 ring-emerald-400/50 hover:bg-emerald-500/35 transition-all"
              >
                <div>
                  <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
                    <Sprout className="h-5 w-5 text-emerald-300" />
                    <span>Harvest Ripe Crops ({ripeCount} Bed{ripeCount > 1 ? 's' : ''})</span>
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-200">
                    +{ripeCount * 16}% Food Supply · +{ripeCount * 4}% Health
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-white" />
              </button>
            )}

            {/* Plant Seeds Buttons */}
            {emptyCount > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {(['potatoes', 'lettuce', 'tomatoes'] as CropType[]).map((crop) => (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => onPlantCrops(crop)}
                    className="rounded-2xl border-2 border-sky-400/50 bg-sky-500/15 p-3 text-center hover:bg-sky-500/25 transition-all"
                  >
                    <p className="font-display text-sm font-extrabold text-white">
                      Plant {CROP_LABELS[crop].split(' ')[1]}
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-amber-300">-4% Air/Water</p>
                  </button>
                ))}
              </div>
            )}

            {/* Mist / Grow Boost */}
            {growingCount > 0 && (
              <button
                type="button"
                onClick={onWaterCrops}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-pink-400/50 bg-pink-500/15 p-3.5 text-left hover:bg-pink-500/25 transition-all"
              >
                <div>
                  <p className="inline-flex items-center gap-2 font-display text-sm font-extrabold text-white">
                    <Sprout className="h-4 w-4 text-pink-300" />
                    <span>Water &amp; Boost Plant Growth (+1 Stage)</span>
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-amber-300">Cost: -6% Air/Water</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
