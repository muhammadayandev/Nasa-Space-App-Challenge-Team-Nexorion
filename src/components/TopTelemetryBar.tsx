import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Droplets,
  HeartPulse,
  HelpCircle,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Sprout,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { OutpostSiteId, SITE_CONFIGS } from '../data/missionScenarios';

interface TopTelemetryBarProps {
  site: OutpostSiteId;
  onSwitchSite: (site: OutpostSiteId) => void;
  day: number;
  maxDays: number;
  lifeSupport: number;
  food: number;
  crewHealth: number;
  science: number;
  scienceGoal: number;
  radiationMsv: number;
  isSolarStorm: boolean;
  isDustStorm: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onOpenNasaData: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onAdvanceDay: () => void;
  onResetMission: () => void;
  introPlaying: boolean;
}

function getStatusInfo(value: number): { label: string; colorClass: string } {
  if (value >= 60) return { label: 'Nominal', colorClass: 'text-emerald-400' };
  if (value >= 30) return { label: 'Low', colorClass: 'text-amber-400' };
  return { label: 'Critical', colorClass: 'text-rose-400' };
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  site,
  onSwitchSite,
  day,
  maxDays,
  lifeSupport,
  food,
  crewHealth,
  science,
  scienceGoal,
  radiationMsv,
  isSolarStorm,
  isDustStorm,
  muted,
  onToggleMute,
  onOpenNasaData,
  onOpenGuide,
  onOpenSettings,
  onAdvanceDay,
  onResetMission,
  introPlaying,
}) => {
  const siteCfg = SITE_CONFIGS[site];
  const lsStatus = getStatusInfo(lifeSupport);
  const foodStatus = getStatusInfo(food);
  const healthStatus = getStatusInfo(crewHealth);

  return (
    <header className="pointer-events-auto relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0A101D]/95 px-4 py-2.5 sm:px-6">
      {/* Zone 1: Brand Title + Site Switcher */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          StarBase Junior
        </span>

        <div
          className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1"
          role="group"
          aria-label="Outpost Location"
        >
          <button
            type="button"
            onClick={() => onSwitchSite('moon')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
              site === 'moon'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Moon · South Pole
          </button>
          <button
            type="button"
            onClick={() => onSwitchSite('mars')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
              site === 'mars'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Mars · Jezero Crater
          </button>
        </div>
      </div>

      {/* Zone 2: Clean Tabular Resource Strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span className="text-slate-400 font-medium">{siteCfg.dayUnit}</span>
          <span className="font-mono-tabular text-sm font-bold text-white">
            {day}/{maxDays}
          </span>
        </div>

        <span aria-hidden="true" className="text-slate-700 hidden sm:inline">
          ·
        </span>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <Droplets className={`h-3.5 w-3.5 ${lsStatus.colorClass}`} />
          <span className="text-slate-300">Air & Water</span>
          <span className="font-mono-tabular font-bold text-white">{Math.round(lifeSupport)}%</span>
          <span className={`font-semibold ${lsStatus.colorClass}`}>{lsStatus.label}</span>
        </div>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <Sprout className={`h-3.5 w-3.5 ${foodStatus.colorClass}`} />
          <span className="text-slate-300">Food</span>
          <span className="font-mono-tabular font-bold text-white">{Math.round(food)}%</span>
          <span className={`font-semibold ${foodStatus.colorClass}`}>{foodStatus.label}</span>
        </div>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <HeartPulse className={`h-3.5 w-3.5 ${healthStatus.colorClass}`} />
          <span className="text-slate-300">Crew</span>
          <span className="font-mono-tabular font-bold text-white">{Math.round(crewHealth)}%</span>
          <span className={`font-semibold ${healthStatus.colorClass}`}>{healthStatus.label}</span>
        </div>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          {isSolarStorm ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <Shield className="h-3.5 w-3.5 text-sky-400" />
          )}
          <span className="text-slate-300">Radiation</span>
          <span className="font-mono-tabular font-bold text-white">
            {radiationMsv.toFixed(2)} mSv
          </span>
          <span className={isSolarStorm ? 'font-semibold text-amber-400' : 'text-slate-400'}>
            {isSolarStorm ? 'Solar Storm' : isDustStorm ? 'Dust Storm' : 'Calm'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          {science >= scienceGoal ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          )}
          <span className="text-slate-300">Science</span>
          <span className="font-mono-tabular font-bold text-white">
            {science}/{scienceGoal}
          </span>
        </div>
      </div>

      {/* Zone 3: Actions & Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {!introPlaying && (
          <button
            type="button"
            onClick={onAdvanceDay}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            <span>{day >= maxDays ? 'Finish' : `Next ${siteCfg.dayUnit}`}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Sliders className="h-3.5 w-3.5 text-sky-400" />
          <span>Controls</span>
        </button>

        <button
          type="button"
          onClick={onOpenNasaData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Database className="h-3.5 w-3.5" />
          <span>NASA Data</span>
        </button>

        <button
          type="button"
          onClick={onOpenGuide}
          aria-label="How to Play"
          title="How to Play"
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onResetMission}
          title="Restart Mission"
          aria-label="Restart Mission"
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? 'Unmute Sound' : 'Mute Sound'}
          aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-sky-400" />}
        </button>
      </div>
    </header>
  );
};
