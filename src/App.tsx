import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { BottomControlDock } from './components/BottomControlDock';
import { DecisionModal } from './components/DecisionModal';
import { GuideModal } from './components/GuideModal';
import { MissionDebriefModal } from './components/MissionDebriefModal';
import { NasaDataModal } from './components/NasaDataModal';
import { SettingsModal } from './components/SettingsModal';
import { StationInteractModal } from './components/StationInteractModal';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import {
  CURATED_ARCHIVE_FLARES,
  fetchNasaDataset,
  KID_GLOSSARY,
  NasaDatasetSnapshot,
  OSDR_STUDIES,
  RADLAB_BENCHMARKS,
} from './data/nasaData';
import {
  DilemmaChoice,
  MISSION_DILEMMAS,
  MissionDilemma,
  MODULE_SPECS,
  ModuleId,
  OutpostSiteId,
  PowerSystemKey,
  SITE_CONFIGS,
  STATION_POINTS,
} from './data/missionScenarios';
import { OutpostViewport, ViewportSimSnapshot } from './three/OutpostViewport';

const MAX_DAYS = 7;
const SCIENCE_GOAL = 8;

const INITIAL_POWER: Record<PowerSystemKey, number> = {
  lifesupport: 2,
  greenhouse: 2,
  shield: 2,
  science: 2,
};

function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function rebalancePower(
  current: Record<PowerSystemKey, number>,
  maxTotal: number
): Record<PowerSystemKey, number> {
  const next = { ...current };
  let total = next.lifesupport + next.greenhouse + next.shield + next.science;
  const order: PowerSystemKey[] = ['science', 'shield', 'greenhouse', 'lifesupport'];
  let guard = 0;
  while (total > maxTotal && guard < 20) {
    for (const k of order) {
      if (total > maxTotal && next[k] > 0) {
        next[k] -= 1;
        total -= 1;
      }
    }
    guard += 1;
  }
  return next;
}

export default function App() {
  const [site, setSite] = useState<OutpostSiteId>('moon');
  const [introRunId, setIntroRunId] = useState<number>(1);
  const [isIntroPlaying, setIsIntroPlaying] = useState<boolean>(true);

  const [day, setDay] = useState<number>(1);
  const [lifeSupport, setLifeSupport] = useState<number>(84);
  const [food, setFood] = useState<number>(78);
  const [crewHealth, setCrewHealth] = useState<number>(92);
  const [science, setScience] = useState<number>(0);
  const [solarDust, setSolarDust] = useState<number>(20);

  const [basePowerCells, setBasePowerCells] = useState<number>(8);
  const [nextDayPowerMod, setNextDayPowerMod] = useState<number>(0);
  const [shieldBonusToday, setShieldBonusToday] = useState<number>(0);
  const [powerAllocation, setPowerAllocation] =
    useState<Record<PowerSystemKey, number>>(INITIAL_POWER);

  // Player Camera, Controls & Proximity State
  const [cameraMode, setCameraMode] = useState<'follow' | 'overview'>('follow');
  const [walkSpeed, setWalkSpeed] = useState<'normal' | 'fast'>('normal');
  const [showBottomDock, setShowBottomDock] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [autoOpenOnApproach, setAutoOpenOnApproach] = useState<boolean>(false);
  const [selectedModule, setSelectedModule] = useState<ModuleId>('overview');

  const [nearStationId, setNearStationId] = useState<Exclude<ModuleId, 'overview'> | null>(null);
  const [activeStationModal, setActiveStationModal] = useState<Exclude<ModuleId, 'overview'> | null>(
    null
  );
  const prevNearRef = useRef<Exclude<ModuleId, 'overview'> | null>(null);

  const [muted, setMuted] = useState<boolean>(false);
  const [isSolarStorm, setIsSolarStorm] = useState<boolean>(false);
  const [isDustStorm, setIsDustStorm] = useState<boolean>(false);

  const [activeDilemma, setActiveDilemma] = useState<MissionDilemma | null>(null);
  const [usedDilemmaIds, setUsedDilemmaIds] = useState<string[]>([]);
  const [missionOutcome, setMissionOutcome] = useState<'victory' | 'failed' | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string>(
    'Use WASD or Arrow Keys to walk Commander Maya up to any outpost station and press E to interact!'
  );

  const [showNasaModal, setShowNasaModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const [nasaSnapshot, setNasaSnapshot] = useState<NasaDatasetSnapshot>({
    sourceMode: 'archive',
    fetchedAt: 'Loading...',
    flares: CURATED_ARCHIVE_FLARES,
    radLabBenchmarks: RADLAB_BENCHMARKS,
    osdrStudies: OSDR_STUDIES,
    glossary: KID_GLOSSARY,
  });

  useEffect(() => {
    let active = true;
    fetchNasaDataset().then((data) => {
      if (active) setNasaSnapshot(data);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keyboard shortcut 'H' toggles the optional bottom quick-control bar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'h' &&
        !isIntroPlaying &&
        !activeDilemma &&
        !showNasaModal &&
        !showGuideModal &&
        !showSettingsModal &&
        !activeStationModal
      ) {
        setShowBottomDock((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isIntroPlaying,
    activeDilemma,
    showNasaModal,
    showGuideModal,
    showSettingsModal,
    activeStationModal,
  ]);

  const totalPowerCells = Math.max(4, Math.min(9, basePowerCells + nextDayPowerMod));

  const effectiveRadiationMsv = useMemo(() => {
    const siteCfg = SITE_CONFIGS[site];
    const activeFlareDose = isSolarStorm
      ? nasaSnapshot.flares[0]?.radiationMsvDay ?? 4.2
      : siteCfg.baseRadiationMsv;
    const shieldReduction = powerAllocation.shield * 1.15 + shieldBonusToday * 0.05;
    return Math.max(0.15, activeFlareDose - shieldReduction);
  }, [site, isSolarStorm, nasaSnapshot.flares, powerAllocation.shield, shieldBonusToday]);

  const resetMission = useCallback((targetSite: OutpostSiteId) => {
    soundEngine.playClick(520);
    setSite(targetSite);
    setIntroRunId((n) => n + 1);
    setIsIntroPlaying(true);
    setDay(1);
    setLifeSupport(84);
    setFood(78);
    setCrewHealth(92);
    setScience(0);
    setSolarDust(20);
    setBasePowerCells(SITE_CONFIGS[targetSite].maxSolarCells);
    setNextDayPowerMod(0);
    setShieldBonusToday(0);
    setPowerAllocation(INITIAL_POWER);
    setSelectedModule('overview');
    setNearStationId(null);
    setActiveStationModal(null);
    setIsSolarStorm(false);
    setIsDustStorm(false);
    setActiveDilemma(null);
    setUsedDilemmaIds([]);
    setMissionOutcome(null);
    setFailureReason(null);
    const cfg = SITE_CONFIGS[targetSite];
    setStatusMessage(
      `Walk Commander Maya with WASD or Arrow keys toward any station at ${cfg.name} and press E!`
    );
  }, []);

  const handleIntroFinished = useCallback(() => {
    soundEngine.playSuccess();
    setIsIntroPlaying(false);
  }, []);

  const handleNearStationChange = useCallback(
    (stationId: Exclude<ModuleId, 'overview'> | null) => {
      setNearStationId(stationId);
      if (
        autoOpenOnApproach &&
        stationId &&
        prevNearRef.current !== stationId &&
        !activeDilemma &&
        !missionOutcome
      ) {
        soundEngine.playSelectModule();
        setActiveStationModal(stationId);
      }
      prevNearRef.current = stationId;
    },
    [autoOpenOnApproach, activeDilemma, missionOutcome]
  );

  const handleInteractStation = useCallback(
    (stationId: Exclude<ModuleId, 'overview'>) => {
      if (activeDilemma || missionOutcome) return;
      soundEngine.playSelectModule();
      setSelectedModule(stationId);
      setActiveStationModal(stationId);
    },
    [activeDilemma, missionOutcome]
  );

  const handleSetPower = useCallback(
    (key: PowerSystemKey, targetLevel: number) => {
      setPowerAllocation((prev) => {
        const clampedTarget = Math.max(0, Math.min(3, targetLevel));
        const usedByOthers =
          prev.lifesupport + prev.greenhouse + prev.shield + prev.science - prev[key];
        const maxAllowed = Math.min(3, Math.max(0, totalPowerCells - usedByOthers));
        const finalLevel = Math.min(clampedTarget, maxAllowed);
        if (finalLevel === prev[key]) return prev;
        soundEngine.playClick(finalLevel > prev[key] ? 640 : 480);
        return { ...prev, [key]: finalLevel };
      });
    },
    [totalPowerCells]
  );

  const handleStationAction = useCallback(
    (actionId: string) => {
      soundEngine.playClick(640);
      let nextLs = lifeSupport;
      let nextFood = food;
      let nextHealth = crewHealth;
      let nextSci = science;

      if (actionId === 'clean-solar') {
        setSolarDust(0);
        setNextDayPowerMod((m) => Math.min(2, m + 1));
        nextLs = clampPercent(lifeSupport - 8);
        nextHealth = clampPercent(crewHealth - 5);
        setStatusMessage('Solar panels brushed clean! +1 Power Cell restored (-8% Air & Water, -5% Crew).');
      } else if (actionId === 'flush-filters') {
        nextLs = clampPercent(lifeSupport + 12);
        nextHealth = clampPercent(crewHealth - 7);
        setStatusMessage('CO₂ scrubbers & water filters flushed! +12% Air & Water (-7% Crew effort).');
      } else if (actionId === 'harvest-greens') {
        nextFood = clampPercent(food + 12);
        nextHealth = clampPercent(crewHealth + 5);
        nextLs = clampPercent(lifeSupport - 9);
        setStatusMessage('Harvested fresh space greens! +12% Food & +5% Crew Health (-9% Water).');
      } else if (actionId === 'drill-sample') {
        nextSci = science + 1;
        nextLs = clampPercent(lifeSupport - 9);
        nextHealth = clampPercent(crewHealth - 6);
        setStatusMessage('Rover drilled a new core sample! +1 Science (-9% Air & Water, -6% Crew).');
      } else if (actionId === 'beam-earth') {
        nextSci = science + 1;
        nextLs = clampPercent(lifeSupport - 10);
        setStatusMessage('High-power radio packet sent to Earth! +1 Science (-10% cooling Water).');
      } else if (actionId === 'crew-snack') {
        nextHealth = clampPercent(crewHealth + 10);
        nextFood = clampPercent(food - 9);
        setStatusMessage('Team shared fresh meal & checkup! +10% Crew Health (-9% Food).');
      }

      setLifeSupport(nextLs);
      setFood(nextFood);
      setCrewHealth(nextHealth);
      setScience(nextSci);
      setActiveStationModal(null);

      if (nextLs <= 0 || nextFood <= 0 || nextHealth <= 0) {
        setFailureReason('That outpost action drained a critical life-support or health reserve to 0%.');
        setMissionOutcome('failed');
      }
    },
    [lifeSupport, food, crewHealth, science]
  );

  const handleAdvanceDay = useCallback(() => {
    if (isIntroPlaying || missionOutcome || activeDilemma) return;

    const lsDeltaMap = [-24, -10, 4, 12];
    const ghFoodMap = [-18, -7, 7, 15];
    const ghO2BonusMap = [0, 0, 4, 7];

    const lsChange =
      lsDeltaMap[powerAllocation.lifesupport] +
      ghO2BonusMap[powerAllocation.greenhouse] -
      Math.max(0, powerAllocation.science - 1) * 3;
    const foodChange = ghFoodMap[powerAllocation.greenhouse];
    const scienceGain = powerAllocation.science;

    let healthChange = 2;
    if (effectiveRadiationMsv > 1.8) {
      healthChange -= Math.round((effectiveRadiationMsv - 1.5) * 7.5);
    }
    const nextLs = clampPercent(lifeSupport + lsChange);
    const nextFood = clampPercent(food + foodChange);
    if (nextLs < 30) healthChange -= 10;
    if (nextFood < 30) healthChange -= 9;
    const nextHealth = clampPercent(crewHealth + healthChange);
    const nextScience = science + scienceGain;

    setLifeSupport(nextLs);
    setFood(nextFood);
    setCrewHealth(nextHealth);
    setScience(nextScience);
    setShieldBonusToday(0);

    if (nextLs <= 0 || nextFood <= 0 || nextHealth <= 0) {
      soundEngine.playAdvanceSol(true);
      let reason = 'Crew health dropped to a critical emergency level.';
      if (nextLs <= 0) {
        reason =
          'Oxygen & water reserves ran dry because Life Support did not receive enough steady power.';
      } else if (nextFood <= 0) {
        reason =
          'Food supplies ran out because the Hydroponics Greenhouse needed more power earlier.';
      }
      setFailureReason(reason);
      setMissionOutcome('failed');
      return;
    }

    if (day >= MAX_DAYS) {
      soundEngine.playSuccess();
      setMissionOutcome('victory');
      return;
    }

    const nextDay = day + 1;
    setDay(nextDay);

    const stormActive = nextDay === 3 || nextDay === 6;
    const dustOrShadow = nextDay === 4 || nextDay === 5;
    setIsSolarStorm(stormActive);
    setIsDustStorm(dustOrShadow);

    const addedDust = dustOrShadow ? 35 : 15;
    const nextDust = Math.min(100, solarDust + addedDust);
    setSolarDust(nextDust);

    const dustPenalty = nextDust >= 65 ? -1 : 0;
    const newBasePower = (dustOrShadow ? 6 : SITE_CONFIGS[site].maxSolarCells) + dustPenalty;
    setBasePowerCells(Math.max(5, newBasePower));
    setNextDayPowerMod(0);
    const nextTotalPower = Math.max(4, Math.min(9, newBasePower));
    setPowerAllocation((prev) => rebalancePower(prev, nextTotalPower));

    soundEngine.playAdvanceSol(stormActive);

    const dayWord = SITE_CONFIGS[site].dayUnit;
    setStatusMessage(
      `${dayWord} ${nextDay}: ${
        stormActive
          ? 'NASA DONKI Solar Storm! Walk to the Habitat or raise Storm Shielding!'
          : dustOrShadow
          ? site === 'mars'
            ? 'Martian dust dimmed solar panels! Walk to the Solar Grid to brush them clean.'
            : 'Crater rim shadow cut sunlight — power cells reduced today!'
          : `Collected +${scienceGain} Science · Air & Water ${
              lsChange >= 0 ? `+${lsChange}` : lsChange
            }% · Food ${foodChange >= 0 ? `+${foodChange}` : foodChange}%`
      }`
    );

    const available = MISSION_DILEMMAS.filter((d) => !usedDilemmaIds.includes(d.id));
    if (available.length > 0 && nextDay >= 2 && nextDay <= 6) {
      const picked = stormActive
        ? available.find((d) => d.id === 'solar-flare-storm') || available[0]
        : available[0];
      setActiveDilemma(picked);
      setUsedDilemmaIds((prev) => [...prev, picked.id]);
    }
  }, [
    isIntroPlaying,
    missionOutcome,
    activeDilemma,
    powerAllocation,
    effectiveRadiationMsv,
    lifeSupport,
    food,
    crewHealth,
    science,
    day,
    site,
    solarDust,
    usedDilemmaIds,
  ]);

  const handleChooseDilemma = useCallback(
    (choice: DilemmaChoice) => {
      soundEngine.playClick(600);
      const eff = choice.effects;
      const nextLs = clampPercent(lifeSupport + (eff.lifeSupport ?? 0));
      const nextFood = clampPercent(food + (eff.food ?? 0));
      const nextHealth = clampPercent(crewHealth + (eff.crewHealth ?? 0));
      const nextSci = Math.max(0, science + (eff.science ?? 0));

      setLifeSupport(nextLs);
      setFood(nextFood);
      setCrewHealth(nextHealth);
      setScience(nextSci);
      if (eff.shieldBonus) setShieldBonusToday(eff.shieldBonus);

      if (eff.nextDayPowerMod) {
        const mod = eff.nextDayPowerMod;
        setNextDayPowerMod(mod);
        const updatedMax = Math.max(4, Math.min(9, basePowerCells + mod));
        setPowerAllocation((prev) => rebalancePower(prev, updatedMax));
      }

      setActiveDilemma(null);
      setStatusMessage(choice.lessonFeedback);

      if (nextLs <= 0 || nextFood <= 0 || nextHealth <= 0) {
        setFailureReason('That emergency decision pushed an outpost resource to 0%.');
        setMissionOutcome('failed');
      }
    },
    [lifeSupport, food, crewHealth, science, basePowerCells]
  );

  const viewportSnapshot: ViewportSimSnapshot = useMemo(
    () => ({
      site,
      selectedModule,
      powerAllocation,
      isSolarStorm,
      isDustStorm,
      crewHealth,
      food,
      lifeSupport,
      shieldLevel: powerAllocation.shield,
      cameraMode,
      walkSpeed,
    }),
    [
      site,
      selectedModule,
      powerAllocation,
      isSolarStorm,
      isDustStorm,
      crewHealth,
      food,
      lifeSupport,
      cameraMode,
      walkSpeed,
    ]
  );

  const nearPoint = nearStationId ? STATION_POINTS.find((p) => p.id === nearStationId) : null;
  const nearSpec = nearStationId ? MODULE_SPECS[nearStationId] : null;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#070B14]">
      <TopTelemetryBar
        site={site}
        onSwitchSite={(nextSite) => {
          if (nextSite !== site) resetMission(nextSite);
        }}
        day={day}
        maxDays={MAX_DAYS}
        lifeSupport={lifeSupport}
        food={food}
        crewHealth={crewHealth}
        science={science}
        scienceGoal={SCIENCE_GOAL}
        radiationMsv={effectiveRadiationMsv}
        isSolarStorm={isSolarStorm}
        isDustStorm={isDustStorm}
        muted={muted}
        onToggleMute={() => {
          const next = !muted;
          soundEngine.muted = next;
          setMuted(next);
        }}
        onOpenNasaData={() => {
          soundEngine.playClick(620);
          setShowNasaModal(true);
        }}
        onOpenGuide={() => {
          soundEngine.playClick(620);
          setShowGuideModal(true);
        }}
        onOpenSettings={() => {
          soundEngine.playClick(620);
          setShowSettingsModal(true);
        }}
        onAdvanceDay={handleAdvanceDay}
        onResetMission={() => resetMission(site)}
        introPlaying={isIntroPlaying}
      />

      <main className="relative flex-1 overflow-hidden">
        <OutpostViewport
          simSnapshot={viewportSnapshot}
          introRunId={introRunId}
          isIntroPlaying={isIntroPlaying}
          onIntroFinished={handleIntroFinished}
          onNearStationChange={handleNearStationChange}
          onInteractStation={handleInteractStation}
        />

        {/* Compact Top-Left Movement Hint & Top-Right Mission Log */}
        {!isIntroPlaying && (
          <>
            <div className="pointer-events-none fixed left-4 top-20 z-10 rounded-xl border border-slate-700/90 bg-[#0B1120]/90 px-3.5 py-2 text-xs text-slate-200 shadow-lg">
              <span className="font-semibold text-amber-400">Move:</span>{' '}
              <span>WASD or Arrow Keys</span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="font-semibold text-sky-400">Look:</span>{' '}
              <span>Drag Mouse</span>
            </div>

            <div className="pointer-events-none fixed right-4 top-20 z-10 max-w-sm rounded-xl border border-slate-700/90 bg-[#0B1120]/90 px-3.5 py-2 text-xs text-slate-200 shadow-lg">
              <span className="font-semibold text-sky-400">Mission Log · </span>
              <span>{statusMessage}</span>
            </div>
          </>
        )}

        {/* Proximity Interaction Prompt (Appears when Commander Maya walks near a station/teammate!) */}
        {!isIntroPlaying &&
          nearStationId &&
          nearSpec &&
          !activeStationModal &&
          !activeDilemma &&
          !missionOutcome && (
            <div
              className={`pointer-events-none fixed left-1/2 z-30 -translate-x-1/2 transition-all ${
                showBottomDock && !dockCollapsed ? 'bottom-44' : 'bottom-6'
              }`}
            >
              <button
                type="button"
                onClick={() => handleInteractStation(nearStationId)}
                className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-400 bg-[#0B1120]/95 px-5 py-3 shadow-2xl hover:bg-slate-900 transition-colors"
              >
                <span className="rounded-lg bg-amber-500 px-2.5 py-1 font-mono-tabular text-xs font-bold text-slate-950">
                  E
                </span>
                <div className="text-left">
                  <p className="font-display text-sm font-bold text-white">
                    Interact: {nearSpec.name}
                  </p>
                  <p className="text-xs text-amber-300">
                    {nearPoint ? nearPoint.promptAction : 'Check in with your Astronaut Team'}
                  </p>
                </div>
              </button>
            </div>
          )}

        {/* Optional Bottom Quick-Control Bar (Disabled by default; toggle in Controls or press H) */}
        {showBottomDock && (
          <BottomControlDock
            site={site}
            day={day}
            maxDays={MAX_DAYS}
            totalPowerCells={totalPowerCells}
            powerAllocation={powerAllocation}
            onSetPower={handleSetPower}
            selectedModule={selectedModule}
            onSelectModule={(id) => {
              setSelectedModule(id);
              if (id === 'overview') {
                setCameraMode('overview');
              } else if (id === 'crew') {
                setCameraMode('follow');
              } else {
                setCameraMode('overview');
              }
            }}
            onAdvanceDay={handleAdvanceDay}
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
            disabled={Boolean(activeDilemma || missionOutcome)}
            hiddenDuringIntro={isIntroPlaying}
          />
        )}
      </main>

      {/* Station Proximity Interaction Modal */}
      {activeStationModal && (
        <StationInteractModal
          stationId={activeStationModal}
          site={site}
          day={day}
          maxDays={MAX_DAYS}
          lifeSupport={lifeSupport}
          food={food}
          crewHealth={crewHealth}
          science={science}
          scienceGoal={SCIENCE_GOAL}
          solarDust={solarDust}
          radiationMsv={effectiveRadiationMsv}
          totalPowerCells={totalPowerCells}
          powerAllocation={powerAllocation}
          onSetPower={handleSetPower}
          onStationAction={handleStationAction}
          onAdvanceDay={handleAdvanceDay}
          onOpenNasaData={() => setShowNasaModal(true)}
          onClose={() => setActiveStationModal(null)}
        />
      )}

      {/* Player & Control Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          showBottomDock={showBottomDock}
          onToggleBottomDock={() => setShowBottomDock((prev) => !prev)}
          autoOpenOnApproach={autoOpenOnApproach}
          onToggleAutoOpen={() => setAutoOpenOnApproach((prev) => !prev)}
          cameraMode={cameraMode}
          onChangeCameraMode={setCameraMode}
          walkSpeed={walkSpeed}
          onChangeWalkSpeed={setWalkSpeed}
          onReplayIntro={() => {
            setIntroRunId((n) => n + 1);
            setIsIntroPlaying(true);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {activeDilemma && (
        <DecisionModal
          dilemma={activeDilemma}
          dayUnit={SITE_CONFIGS[site].dayUnit}
          day={day}
          onChoose={handleChooseDilemma}
        />
      )}

      {showNasaModal && (
        <NasaDataModal
          snapshot={nasaSnapshot}
          site={site}
          onClose={() => setShowNasaModal(false)}
        />
      )}

      {showGuideModal && (
        <GuideModal
          site={site}
          scienceGoal={SCIENCE_GOAL}
          maxDays={MAX_DAYS}
          onClose={() => setShowGuideModal(false)}
        />
      )}

      {missionOutcome && (
        <MissionDebriefModal
          outcome={missionOutcome}
          failureReason={failureReason}
          site={site}
          day={day}
          science={science}
          scienceGoal={SCIENCE_GOAL}
          crewHealth={crewHealth}
          lifeSupport={lifeSupport}
          food={food}
          onReplaySame={() => resetMission(site)}
          onSwitchAndReplay={(otherSite) => resetMission(otherSite)}
        />
      )}
    </div>
  );
}
