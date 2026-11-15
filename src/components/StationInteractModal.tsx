import React from 'react';
import {
  ArrowRight,
  BatteryCharging,
  Droplets,
  FlaskConical,
  HeartPulse,
  Radio,
  Shield,
  Sparkles,
  Sprout,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  ASTRONAUT_PROFILES,
  AstronautId,
  MODULE_SPECS,
  ModuleId,
  OutpostSiteId,
  PowerSystemKey,
  SITE_CONFIGS,
} from '../data/missionScenarios';

interface StationInteractModalProps {
  stationId: Exclude<ModuleId, 'overview'>;
  activeAstronaut: AstronautId;
  onSelectAstronaut: (id: AstronautId) => void;
  site: OutpostSiteId;
  day: number;
  maxDays: number;
  lifeSupport: number;
  food: number;
  crewHealth: number;
  science: number;
  solarDust: number;
  radiationMsv: number;
  totalPowerCells: number;
  powerAllocation: Record<PowerSystemKey, number>;
  onSetPower: (key: PowerSystemKey, level: number) => void;
  onStationAction: (actionId: string) => void;
  onAdvanceDay: () => void;
  onClose: () => void;
}

const LEVEL_LABELS = ['Off', '1', '2', '3'];

export const StationInteractModal: React.FC<StationInteractModalProps> = ({
  stationId,
  activeAstronaut,
  onSelectAstronaut,
  site,
  day,
  maxDays,
  lifeSupport,
  food,
  crewHealth,
  science,
  solarDust,
  radiationMsv,
  totalPowerCells,
  powerAllocation,
  onSetPower,
  onStationAction,
  onAdvanceDay,
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-modal-title"
    >
      <div className="custom-scroll max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border-4 border-sky-400/50 bg-[#081020] p-6 sm:p-8 shadow-2xl animate-[popupSlideUp_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              {spec.role}
            </p>
            <h2
              id="station-modal-title"
              className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white"
            >
              {spec.name}
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

        {/* Friendly 1-line note */}
        <p className="mt-3 text-base font-medium text-slate-100">{spec.plainExplanation}</p>

        {/* Live Gauge Chip */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border-2 border-slate-800 bg-slate-900 px-4 py-3 text-sm">
          {stationId === 'solar' && (
            <>
              <span className="font-semibold text-slate-300">Dust on Panels:</span>
              <span className={solarDust >= 40 ? 'font-extrabold text-amber-400' : 'font-extrabold text-emerald-400'}>
                {solarDust}% {solarDust >= 40 ? 'Clean me!' : 'Nice & Clean'}
              </span>
            </>
          )}
          {stationId === 'lifesupport' && (
            <>
              <span className="font-semibold text-slate-300">Air Level:</span>
              <span className="font-extrabold text-sky-300">{Math.round(lifeSupport)}%</span>
            </>
          )}
          {stationId === 'greenhouse' && (
            <>
              <span className="font-semibold text-slate-300">Food Left:</span>
              <span className="font-extrabold text-emerald-300">{Math.round(food)}%</span>
            </>
          )}
          {stationId === 'habitat' && (
            <>
              <span className="font-semibold text-slate-300">Sun Rays Outside:</span>
              <span className={radiationMsv > 1.8 ? 'font-extrabold text-rose-400' : 'font-extrabold text-emerald-400'}>
                {radiationMsv > 1.8 ? 'Danger! Raise Shield!' : 'Safe Inside'}
              </span>
            </>
          )}
          {(stationId === 'science' || stationId === 'comms') && (
            <>
              <span className="font-semibold text-slate-300">Science Score:</span>
              <span className="font-extrabold text-cyan-300">{science} pts</span>
            </>
          )}
          {stationId === 'crew' && (
            <>
              <span className="font-semibold text-slate-300">Crew Health:</span>
              <span className="font-extrabold text-emerald-300">{Math.round(crewHealth)}%</span>
            </>
          )}
        </div>

        {/* Crew Switcher */}
        {stationId === 'crew' && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Object.values(ASTRONAUT_PROFILES).map((prof) => {
              const selected = prof.id === activeAstronaut;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(640);
                    onSelectAstronaut(prof.id);
                  }}
                  className={`rounded-2xl border-2 p-3 text-center transition-all ${
                    selected
                      ? 'border-sky-400 bg-sky-500/20 scale-[1.02]'
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
        )}

        {/* Power Switch */}
        {powerKey && currentPower !== null && (
          <div className="mt-4 rounded-2xl border-2 border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between text-sm font-extrabold">
              <span className="flex items-center gap-1.5 text-white">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Power Level</span>
              </span>
              <span className="text-amber-300">{freeCells}⚡ free</span>
            </div>

            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((lvl) => {
                const canReach = lvl <= maxReachable;
                const active = currentPower === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={!canReach && !active}
                    onClick={() => onSetPower(powerKey, lvl)}
                    className={`rounded-xl border-b-4 py-2.5 font-mono-tabular text-sm font-extrabold transition-all active:translate-y-0.5 active:border-b-2 ${
                      active
                        ? 'border-sky-600 bg-sky-400 text-slate-950'
                        : canReach
                        ? 'border-slate-950 bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'border-slate-950 bg-slate-950 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {LEVEL_LABELS[lvl]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-3">
          {stationId === 'solar' && (
            <>
              <ActionButton
                icon={<Wrench className="h-5 w-5 text-amber-400" />}
                title="Sweep Solar Panels"
                gain="Clean panels & +1 Power tomorrow"
                cost={activeAstronaut === 'zara' ? '-4% Air & -5% Health' : '-8% Air & -5% Health'}
                borderClass="border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25"
                onClick={() => onStationAction('clean-solar')}
              />
              <ActionButton
                icon={<BatteryCharging className="h-5 w-5 text-yellow-400" />}
                title="Charge Backup Battery"
                gain="+1 Power tomorrow"
                cost="-6% Air & -7% Health"
                borderClass="border-yellow-400/50 bg-yellow-500/15 hover:bg-yellow-500/25"
                onClick={() => onStationAction('battery-boost')}
              />
            </>
          )}

          {stationId === 'lifesupport' && (
            <>
              <ActionButton
                icon={<Droplets className="h-5 w-5 text-sky-400" />}
                title="Clean Air Filters"
                gain={activeAstronaut === 'maya' ? '+17% Air' : '+12% Air'}
                cost="-7% Health"
                borderClass="border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25"
                onClick={() => onStationAction('flush-filters')}
              />
              <ActionButton
                icon={<Sparkles className="h-5 w-5 text-cyan-400" />}
                title="Make Extra Oxygen"
                gain={activeAstronaut === 'maya' ? '+15% Air' : '+10% Air'}
                cost="-4% Food & -4% Health"
                borderClass="border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25"
                onClick={() => onStationAction('moxie-split')}
              />
            </>
          )}

          {stationId === 'greenhouse' && (
            <>
              <ActionButton
                icon={<Sprout className="h-5 w-5 text-emerald-400" />}
                title="Pick Fresh Crops"
                gain={activeAstronaut === 'leo' ? '+17% Food & +10% Health' : '+12% Food & +5% Health'}
                cost="-9% Air/Water"
                borderClass="border-emerald-400/50 bg-emerald-500/15 hover:bg-emerald-500/25"
                onClick={() => onStationAction('harvest-greens')}
              />
              <ActionButton
                icon={<FlaskConical className="h-5 w-5 text-pink-400" />}
                title="Test Space Plants"
                gain="+1 Science & +6% Food"
                cost="-8% Air/Water"
                borderClass="border-pink-400/50 bg-pink-500/15 hover:bg-pink-500/25"
                onClick={() => onStationAction('veggie-study')}
              />
            </>
          )}

          {stationId === 'science' && (
            <>
              <ActionButton
                icon={<Sparkles className="h-5 w-5 text-cyan-400" />}
                title="Dig Mars Rocks"
                gain="+1 Science Point"
                cost={activeAstronaut === 'zara' ? '-5% Air & -6% Health' : '-9% Air & -6% Health'}
                borderClass="border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25"
                onClick={() => onStationAction('drill-sample')}
              />
              <ActionButton
                icon={<FlaskConical className="h-5 w-5 text-violet-400" />}
                title="Scan Tiny Microbes"
                gain="+1 Science & +4% Health"
                cost="-7% Food"
                borderClass="border-violet-400/50 bg-violet-500/15 hover:bg-violet-500/25"
                onClick={() => onStationAction('osdr-bio-scan')}
              />
            </>
          )}

          {stationId === 'comms' && (
            <ActionButton
              icon={<Radio className="h-5 w-5 text-cyan-400" />}
              title="Call Home to Earth"
              gain="+1 Science Point"
              cost="-10% Cooling Water"
              borderClass="border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25"
              onClick={() => onStationAction('beam-earth')}
            />
          )}

          {stationId === 'crew' && (
            <ActionButton
              icon={<HeartPulse className="h-5 w-5 text-emerald-400" />}
              title="Snack & Rest Time"
              gain="+12% Crew Health"
              cost="-8% Food"
              borderClass="border-emerald-400/50 bg-emerald-500/15 hover:bg-emerald-500/25"
              onClick={() => onStationAction('crew-snack')}
            />
          )}

          {stationId === 'habitat' && (
            <>
              <ActionButton
                icon={<Shield className="h-5 w-5 text-sky-400" />}
                title="Turn On Water Shield"
                gain="Blocks Sun Rays & +6% Health"
                cost={activeAstronaut === 'maya' ? '-4% Air/Water' : '-8% Air/Water'}
                borderClass="border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25"
                onClick={() => onStationAction('water-wall-shield')}
              />
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdvanceDay();
                }}
                className="flex w-full items-center justify-between rounded-2xl border-b-4 border-amber-600 bg-amber-400 p-4 text-left text-slate-950 hover:bg-amber-300 active:translate-y-0.5 active:border-b-2 transition-all"
              >
                <div>
                  <p className="font-display text-base font-extrabold">
                    {day >= maxDays ? 'Finish This Level!' : `Go to Sleep (Start ${siteCfg.dayUnit} ${day + 1})`}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  title: string;
  gain: string;
  cost: string;
  borderClass: string;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  title,
  gain,
  cost,
  borderClass,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99] ${borderClass}`}
  >
    <div>
      <p className="inline-flex items-center gap-2 font-display text-base font-extrabold text-white">
        {icon}
        <span>{title}</span>
      </p>
      <div className="mt-1 flex flex-wrap gap-3 text-xs font-bold">
        <span className="text-emerald-400">+{gain}</span>
        <span className="text-amber-300">{cost}</span>
      </div>
    </div>
    <ArrowRight className="h-5 w-5 shrink-0 text-white" />
  </button>
);
