import React, { useState } from 'react';
import { BookOpen, Radiation, Sun, X } from 'lucide-react';
import { NasaDatasetSnapshot } from '../data/nasaData';
import { OutpostSiteId, SITE_CONFIGS } from '../data/missionScenarios';

interface NasaDataModalProps {
  snapshot: NasaDatasetSnapshot;
  site: OutpostSiteId;
  onClose: () => void;
}

type TabId = 'flares' | 'radiation' | 'biology' | 'glossary';

export const NasaDataModal: React.FC<NasaDataModalProps> = ({ snapshot, site, onClose }) => {
  const [tab, setTab] = useState<TabId>('flares');
  const siteCfg = SITE_CONFIGS[site];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nasa-data-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-[#0B1120] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <h2 id="nasa-data-title" className="font-display text-xl font-bold text-white">
              Real NASA Open Science Data
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {snapshot.sourceMode === 'live'
                ? `Source: Live NASA DONKI API · Updated ${snapshot.fetchedAt}`
                : 'Source: Verified NASA Archive Snapshot (DONKI · RadLab · OSDR)'}
              {' · '}
              Active Site: {siteCfg.nasaReference}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close NASA data log"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 px-6 py-2.5 bg-slate-900/50">
          {[
            { id: 'flares' as const, label: 'Solar Weather (DONKI)' },
            { id: 'radiation' as const, label: 'Radiation Dose (RadLab)' },
            { id: 'biology' as const, label: 'Space Health (OSDR)' },
            { id: 'glossary' as const, label: 'Space Dictionary' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="custom-scroll flex-1 overflow-y-auto p-6">
          {tab === 'flares' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                NASA’s <strong className="text-white">DONKI</strong> (Space Weather Database) tracks
                real solar flares on the Sun. Strong M-class and X-class flares send bursts of radiation
                across the Moon and Mars, making your Storm Shield decisions critical!
              </p>
              <div className="space-y-3">
                {snapshot.flares.map((flare) => (
                  <div
                    key={flare.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sun
                          className={`h-4 w-4 ${
                            flare.severity === 'extreme' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        />
                        <span className="font-display text-sm font-bold text-white">
                          Class {flare.classType} Solar Flare
                        </span>
                      </div>
                      <span className="font-mono-tabular text-xs text-slate-400">
                        {flare.peakTime} · Est. {flare.radiationMsvDay.toFixed(2)} mSv/day
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-300">{flare.kidSummary}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Solar Region: {flare.sourceLocation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'radiation' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Measured by <strong className="text-white">RadLab</strong> aboard the International
                Space Station and Mars/Moon surface sensors. Notice how much more radiation reaches the
                Moon (zero air) compared to Earth!
              </p>
              <div className="space-y-3">
                {snapshot.radLabBenchmarks.map((bm) => {
                  const barWidth = Math.min(100, Math.max(4, (bm.doseMsvPerDay / 5.0) * 100));
                  return (
                    <div
                      key={bm.label}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-display text-sm font-bold text-white">
                          <Radiation className="h-4 w-4 text-amber-400" />
                          {bm.label}
                        </span>
                        <span className="font-mono-tabular text-xs font-bold text-sky-300">
                          {bm.doseMsvPerDay.toFixed(3)} mSv/day
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-amber-400"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-300">{bm.note}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Instrument: {bm.instrument}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'biology' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                NASA’s <strong className="text-white">Open Science Data Repository (OSDR)</strong>{' '}
                shares real biology experiments from spaceflight. These studies guide how your outpost
                grows food and keeps astronauts healthy.
              </p>
              <div className="space-y-3">
                {snapshot.osdrStudies.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-white">{st.title}</span>
                      <span className="font-mono-tabular text-xs font-semibold text-emerald-400">
                        {st.id} · {st.topic}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{st.finding}</p>
                    <p className="mt-2 text-xs font-medium text-sky-300">
                      In this simulation: {st.gameplayLink}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'glossary' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {snapshot.glossary.map((item) => (
                <div
                  key={item.term}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                >
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-sky-300">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>{item.term}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">{item.meaning}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{item.example}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
