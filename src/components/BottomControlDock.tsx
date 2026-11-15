import React from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Droplets,
  Shield,
  Sprout,
  Zap,
} from 'lucide-react';
import {
  ModuleId,
  OutpostSiteId,
  PowerSystemKey,
  SITE_CONFIGS,
} from '../data/missionScenarios';

interface BottomControlDockProps {
  site: OutpostSiteId;
  day: number;
  maxDays: number;
  totalPowerCells: number;
  powerAllocation: Record<PowerSystemKey, number>;
  onSetPower: (key: PowerSystemKey, level: number) => void;
  selectedModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  onAdvanceDay: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  disabled: boolean;
  hiddenDuringIntro: boolean;
}

const VIEW_TABS: Array<{ id: ModuleId; label: string }> = [
  { id: 'overview', label: 'Base View' },
  { id: 'crew', label: 'Med-Bay & Gym' },
  { id: 'habitat', label: 'Active Defense' },
  { id: 'greenhouse', label: 'Potato Farm' },
  { id: 'lifesupport', label: 'ECLSS & Shower' },
  { id: 'solar', label: 'Solar Grid' },
  { id: 'science', label: 'Mars Buggy' },
  { id: 'comms', label: 'Sat-Comms' },
];

const LEVEL_LABELS = ['Off', '1', '2', '3'];

const POWER_ROWS: Array<{
  key: PowerSystemKey;
  label: string;
  activeClass: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'lifesupport',
    label: 'Life Support (CO₂/Heat)',
    activeClass: 'bg-sky-500 text-slate-950',
    icon: <Droplets className="h-4 w-4 text-sky-400" />,
  },
  {
    key: 'greenhouse',
    label: 'Potato Bio-Dome',
    activeClass: 'bg-emerald-500 text-slate-950',
    icon: <Sprout className="h-4 w-4 text-emerald-400" />,
  },
  {
    key: 'shield',
    label: 'Active Defense (EDS)',
    activeClass: 'bg-amber-400 text-slate-950',
    icon: <Shield className="h-4 w-4 text-amber-400" />,
  },
  {
    key: 'science',
    label: 'Buggy & Sat-Comms',
    activeClass: 'bg-cyan-400 text-slate-950',
    icon: <Cpu className="h-4 w-4 text-cyan-400" />,
  },
];

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  site,
  day,
  maxDays,
  totalPowerCells,
  powerAllocation,
  onSetPower,
  selectedModule,
  onSelectModule,
  onAdvanceDay,
  collapsed,
  onToggleCollapse,
  disabled,
  hiddenDuringIntro,
}) => {
  if (hiddenDuringIntro) return null;

  const siteCfg = SITE_CONFIGS[site];
  const usedCells =
    powerAllocation.lifesupport +
    powerAllocation.greenhouse +
    powerAllocation.shield +
    powerAllocation.science;
  const freeCells = totalPowerCells - usedCells;

  return (
    <div
      className={`pointer-events-none fixed bottom-3 left-1/2 z-20 -translate-x-1/2 w-[min(980px,96vw)] transition-transform duration-200 ease-out ${
        collapsed ? 'translate-y-[calc(100%-30px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Tab */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700 bg-[#0B1120]/95 px-4 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{collapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
        </button>
      </div>

      {/* Unified Dock */}
      <div className="pointer-events-auto rounded-2xl border border-slate-700/90 bg-[#0B1120]/95 p-3 shadow-2xl">
        {/* Top Row: Camera Focus + Visual Battery Reserve */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Camera Focus">
            {VIEW_TABS.map((tab) => {
              const active = selectedModule === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectModule(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                    active
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 text-xs whitespace-nowrap shrink-0">
            <span className="hidden md:inline text-[11px] text-slate-400">
              Drag or WASD to move
            </span>
            <span className="hidden md:inline text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <Zap className={`h-3.5 w-3.5 ${freeCells > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="text-slate-300 font-medium">Spare Power:</span>
              <div className="flex items-center gap-1" aria-label={`${freeCells} spare power cells`}>
                {Array.from({ length: totalPowerCells }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-3 w-2 rounded-xs ${
                      idx < freeCells ? 'bg-amber-400' : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono-tabular font-bold text-white ml-0.5">
                {freeCells}/{totalPowerCells}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Direct-Tap Power Bars + Next Day Action */}
        <div className="mt-2.5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {POWER_ROWS.map((row) => {
              const current = powerAllocation[row.key];
              const maxReachable = current + freeCells;
              return (
                <div
                  key={row.key}
                  className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                      {row.icon}
                      {row.label}
                    </span>
                    <span className="font-mono-tabular text-[11px] text-slate-400">
                      {current === 0 ? 'Off' : `Level ${current}`}
                    </span>
                  </div>

                  {/* Direct 1-click segmented power selector */}
                  <div
                    className="grid grid-cols-4 gap-1 rounded-lg bg-slate-950 p-1"
                    role="group"
                    aria-label={`${row.label} power level`}
                  >
                    {[0, 1, 2, 3].map((lvl) => {
                      const isSelected = current === lvl;
                      const isFilled = lvl > 0 && lvl <= current;
                      const canReach = lvl <= maxReachable;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          disabled={disabled || !canReach}
                          onClick={() => onSetPower(row.key, lvl)}
                          className={`h-7 rounded-md text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                            isSelected
                              ? lvl === 0
                                ? 'bg-slate-700 text-white'
                                : row.activeClass
                              : isFilled
                              ? `${row.activeClass} opacity-75`
                              : canReach
                              ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              : 'text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          {LEVEL_LABELS[lvl]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onAdvanceDay}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3.5 font-display text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all lg:min-w-[148px] focus-visible:outline-2 focus-visible:outline-white"
          >
            <span>{day >= maxDays ? 'Finish Mission' : `Next ${siteCfg.dayUnit}`}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
