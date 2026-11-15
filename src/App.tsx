import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gem, Sparkles } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { DecisionModal } from './components/DecisionModal';
import { GameMenuModal } from './components/GameMenuModal';
import { LevelBriefModal } from './components/LevelBriefModal';
import { MissionDebriefModal } from './components/MissionDebriefModal';
import { NasaDataModal } from './components/NasaDataModal';
import { StationInteractModal } from './components/StationInteractModal';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { IntroCutscene } from './cutscene/IntroCutscene';
import {
  CURATED_ARCHIVE_FLARES,
  fetchNasaDataset,
  KID_GLOSSARY,
  NasaDatasetSnapshot,
  OSDR_STUDIES,
  RADLAB_BENCHMARKS,
} from './data/nasaData';
import {
  ASTRONAUT_PROFILES,
  AstronautId,
  DilemmaChoice,
  FIELD_SAMPLES,
  GAME_LEVELS,
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

const PROGRESS_STORAGE_KEY = 'starbase_junior_progress_v1';

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

interface SavedProgress {
  unlockedLevel: number;
  completedLevels: number[];
}

function loadSavedProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return { unlockedLevel: 1, completedLevels: [] };
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      unlockedLevel: Math.max(1, Math.min(GAME_LEVELS.length, parsed.unlockedLevel ?? 1)),
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
    };
  } catch {
    return { unlockedLevel: 1, completedLevels: [] };
  }
}

export default function App() {
  const saved = useMemo(() => loadSavedProgress(), []);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(saved.unlockedLevel);
  const [completedLevels, setCompletedLevels] = useState<number[]>(saved.completedLevels);
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const currentLevel = useMemo(
    () => GAME_LEVELS.find((l) => l.id === currentLevelId) ?? GAME_LEVELS[0],
    [currentLevelId]
  );

  const [site, setSite] = useState<OutpostSiteId>('mars');
  const [activeAstronaut, setActiveAstronaut] = useState<AstronautId>('maya');

  // Always start with the imported Mars intro cutscene!
  const [isIntroPlaying, setIsIntroPlaying] = useState<boolean>(true);
  const [introAutostart, setIntroAutostart] = useState<boolean>(false);

  const [showLevelBrief, setShowLevelBrief] = useState<boolean>(true);
  const [showMenuModal, setShowMenuModal] = useState<boolean>(false);
  const [showNasaModal, setShowNasaModal] = useState<boolean>(false);

  const [day, setDay] = useState<number>(1);
  const [lifeSupport, setLifeSupport] = useState<number>(currentLevel.initialAir);
  const [food, setFood] = useState<number>(currentLevel.initialFood);
  const [crewHealth, setCrewHealth] = useState<number>(currentLevel.initialHealth);
  const [science, setScience] = useState<number>(0);
  const [solarDust, setSolarDust] = useState<number>(currentLevel.initialDust);
  const [actionsDone, setActionsDone] = useState<string[]>([]);

  const [collectedSampleIds, setCollectedSampleIds] = useState<string[]>([]);
  const [sampleToast, setSampleToast] = useState<{
    title: string;
    body: string;
    color: string;
  } | null>(null);
  const [walkToTarget, setWalkToTarget] = useState<{
    x: number;
    z: number;
    seq: number;
  } | null>(null);

  const [basePowerCells, setBasePowerCells] = useState<number>(SITE_CONFIGS.mars.maxSolarCells);
  const [nextDayPowerMod, setNextDayPowerMod] = useState<number>(0);
  const [shieldBonusToday, setShieldBonusToday] = useState<number>(0);
  const [powerAllocation, setPowerAllocation] = useState<Record<PowerSystemKey, number>>(
    currentLevel.initialPower
  );

  const [nearStationId, setNearStationId] = useState<Exclude<ModuleId, 'overview'> | null>(null);
  const [activeStationModal, setActiveStationModal] = useState<Exclude<ModuleId, 'overview'> | null>(
    null
  );

  const [muted, setMuted] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isSolarStorm, setIsSolarStorm] = useState<boolean>(false);
  const [isDustStorm, setIsDustStorm] = useState<boolean>(false);

  const [activeDilemma, setActiveDilemma] = useState<MissionDilemma | null>(null);
  const [usedDilemmaIds, setUsedDilemmaIds] = useState<string[]>([]);
  const [missionOutcome, setMissionOutcome] = useState<'victory' | 'failed' | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [unlockedNewLevel, setUnlockedNewLevel] = useState<boolean>(false);

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

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify({ unlockedLevel, completedLevels })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [unlockedLevel, completedLevels]);



  const startLevel = useCallback(
    (levelId: number, playIntro: boolean, overrideSite?: OutpostSiteId) => {
      const lvl = GAME_LEVELS.find((l) => l.id === levelId) ?? GAME_LEVELS[0];
      const targetSite = overrideSite ?? lvl.site;
      soundEngine.playClick(560);
      setCurrentLevelId(lvl.id);
      setSite(targetSite);
      setDay(1);
      setLifeSupport(lvl.initialAir);
      setFood(lvl.initialFood);
      setCrewHealth(lvl.initialHealth);
      setScience(0);
      setSolarDust(lvl.initialDust);
      setActionsDone([]);
      setCollectedSampleIds([]);
      setSampleToast(null);
      setWalkToTarget(null);
      const maxCells = SITE_CONFIGS[targetSite].maxSolarCells - (lvl.dustDay === 1 ? 2 : 0);
      setBasePowerCells(maxCells);
      setNextDayPowerMod(0);
      setShieldBonusToday(0);
      setPowerAllocation(rebalancePower(lvl.initialPower, maxCells));
      setNearStationId(null);
      setActiveStationModal(null);
      setIsSolarStorm(lvl.stormDay === 1);
      setIsDustStorm(lvl.dustDay === 1);
      setActiveDilemma(null);
      setUsedDilemmaIds([]);
      setMissionOutcome(null);
      setFailureReason(null);
      setUnlockedNewLevel(false);
      setShowMenuModal(false);
      setShowLevelBrief(true);

      if (playIntro) {
        setIntroAutostart(true);
        setIsIntroPlaying(true);
      } else {
        setIsIntroPlaying(false);
      }
    },
    []
  );

  const totalPowerCells = Math.max(4, Math.min(9, basePowerCells + nextDayPowerMod));
  const usedPowerCells =
    powerAllocation.lifesupport +
    powerAllocation.greenhouse +
    powerAllocation.shield +
    powerAllocation.science;
  const freePowerCells = Math.max(0, totalPowerCells - usedPowerCells);

  const effectiveRadiationMsv = useMemo(() => {
    const siteCfg = SITE_CONFIGS[site];
    const activeFlareDose = isSolarStorm
      ? nasaSnapshot.flares[0]?.radiationMsvDay ?? 4.2
      : siteCfg.baseRadiationMsv;
    const shieldReduction = powerAllocation.shield * 1.15 + shieldBonusToday * 0.05;
    return Math.max(0.15, activeFlareDose - shieldReduction);
  }, [site, isSolarStorm, nasaSnapshot.flares, powerAllocation.shield, shieldBonusToday]);

  const levelGoalMet = useMemo(() => {
    if (currentLevel.requiredMinAir !== undefined && lifeSupport < currentLevel.requiredMinAir) {
      return false;
    }
    if (currentLevel.requiredMinFood !== undefined && food < currentLevel.requiredMinFood) {
      return false;
    }
    if (
      currentLevel.requiredActionId &&
      !actionsDone.includes(currentLevel.requiredActionId)
    ) {
      return false;
    }
    if (currentLevel.requiredMaxDust !== undefined && solarDust > currentLevel.requiredMaxDust) {
      return false;
    }
    if (
      currentLevel.requiredMinShield !== undefined &&
      powerAllocation.shield < currentLevel.requiredMinShield &&
      shieldBonusToday <= 0
    ) {
      return false;
    }
    if (
      currentLevel.requiredSamples !== undefined &&
      collectedSampleIds.length < currentLevel.requiredSamples
    ) {
      return false;
    }
    if (currentLevel.requiredScience !== undefined && science < currentLevel.requiredScience) {
      return false;
    }
    return true;
  }, [
    currentLevel,
    lifeSupport,
    food,
    actionsDone,
    solarDust,
    powerAllocation.shield,
    shieldBonusToday,
    collectedSampleIds.length,
    science,
  ]);

  const handleSyncMuted = useCallback((nextMuted: boolean) => {
    soundEngine.setMuted(nextMuted);
    setMuted(nextMuted);
  }, []);

  const handleIntroFinished = useCallback(() => {
    soundEngine.playSuccess();
    setIntroAutostart(false);
    setIsIntroPlaying(false);
  }, []);

  const handleCollectSample = useCallback(
    (sampleId: string) => {
      if (collectedSampleIds.includes(sampleId)) return;
      const node = FIELD_SAMPLES.find((s) => s.id === sampleId);
      if (!node) return;
      soundEngine.playSampleCollect();
      setCollectedSampleIds((prev) => [...prev, sampleId]);

      setLifeSupport((v) => clampPercent(v + (node.effects.lifeSupport ?? 0)));
      setFood((v) => clampPercent(v + (node.effects.food ?? 0)));
      setCrewHealth((v) => clampPercent(v + (node.effects.crewHealth ?? 0)));
      setScience((v) => v + (node.effects.science ?? 0));
      if (node.effects.powerBonus) {
        setNextDayPowerMod((m) => Math.min(2, m + (node.effects.powerBonus ?? 0)));
      }

      setSampleToast({
        title: `${node.emoji} ${node.name} (${node.bonusText})`,
        body: node.nasaFact,
        color: node.colorCss,
      });
    },
    [collectedSampleIds]
  );

  useEffect(() => {
    if (!sampleToast) return;
    const t = setTimeout(() => setSampleToast(null), 4200);
    return () => clearTimeout(t);
  }, [sampleToast]);

  const handleInteractStation = useCallback(
    (stationId: Exclude<ModuleId, 'overview'>) => {
      if (activeDilemma || missionOutcome || showMenuModal || showLevelBrief) return;
      soundEngine.playSelectModule();
      setActiveStationModal(stationId);
    },
    [activeDilemma, missionOutcome, showMenuModal, showLevelBrief]
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
      setActionsDone((prev) => (prev.includes(actionId) ? prev : [...prev, actionId]));

      let nextLs = lifeSupport;
      let nextFood = food;
      let nextHealth = crewHealth;
      let nextSci = science;

      const mayaBonus = activeAstronaut === 'maya' ? 5 : 0;
      const leoBonus = activeAstronaut === 'leo' ? 5 : 0;
      const zaraSave = activeAstronaut === 'zara' ? 4 : 0;

      if (actionId === 'clean-solar') {
        setSolarDust(0);
        setNextDayPowerMod((m) => Math.min(2, m + 1));
        nextLs = clampPercent(lifeSupport - 8 + zaraSave);
        nextHealth = clampPercent(crewHealth - 5);
      } else if (actionId === 'battery-boost') {
        setSolarDust(Math.max(0, solarDust - 25));
        setNextDayPowerMod((m) => Math.min(2, m + 1));
        nextLs = clampPercent(lifeSupport - 6 + zaraSave);
        nextHealth = clampPercent(crewHealth - 7);
      } else if (actionId === 'flush-filters') {
        nextLs = clampPercent(lifeSupport + 12 + mayaBonus);
        nextHealth = clampPercent(crewHealth - 7);
      } else if (actionId === 'moxie-split') {
        nextLs = clampPercent(lifeSupport + 10 + mayaBonus);
        nextHealth = clampPercent(crewHealth - 4);
        nextFood = clampPercent(food - 4);
      } else if (actionId === 'harvest-greens') {
        nextFood = clampPercent(food + 12 + leoBonus);
        nextHealth = clampPercent(crewHealth + 5 + leoBonus);
        nextLs = clampPercent(lifeSupport - 9);
      } else if (actionId === 'veggie-study') {
        nextSci = science + 1;
        nextFood = clampPercent(food + 6 + leoBonus);
        nextLs = clampPercent(lifeSupport - 8);
      } else if (actionId === 'drill-sample') {
        nextSci = science + 1;
        nextLs = clampPercent(lifeSupport - 9 + zaraSave);
        nextHealth = clampPercent(crewHealth - 6);
      } else if (actionId === 'osdr-bio-scan') {
        nextSci = science + 1;
        nextHealth = clampPercent(crewHealth + 4);
        nextFood = clampPercent(food - 7);
      } else if (actionId === 'beam-earth') {
        nextSci = science + 1;
        nextLs = clampPercent(lifeSupport - 10);
      } else if (actionId === 'crew-snack') {
        nextHealth = clampPercent(crewHealth + 12 + leoBonus);
        nextFood = clampPercent(food - 8);
      } else if (actionId === 'water-wall-shield') {
        setShieldBonusToday((b) => Math.min(40, b + 25));
        nextLs = clampPercent(lifeSupport - 8 + mayaBonus);
        nextHealth = clampPercent(crewHealth + 6);
      }

      setLifeSupport(nextLs);
      setFood(nextFood);
      setCrewHealth(nextHealth);
      setScience(nextSci);
      setActiveStationModal(null);

      if (nextLs <= 0 || nextFood <= 0 || nextHealth <= 0) {
        setFailureReason('One of your bars reached 0%! Keep Air, Food, and Health above zero.');
        setMissionOutcome('failed');
      }
    },
    [lifeSupport, food, crewHealth, science, solarDust, activeAstronaut]
  );

  const handleAdvanceDay = useCallback(() => {
    if (isIntroPlaying || missionOutcome || activeDilemma || showLevelBrief) return;

    const lsDeltaMap = [-22, -9, 4, 11];
    const ghFoodMap = [-16, -6, 6, 13];
    const ghO2BonusMap = [0, 0, 3, 6];

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

    if (nextLs <= 0 || nextFood <= 0 || nextHealth <= 0) {
      soundEngine.playAdvanceSol(true);
      setFailureReason(
        nextLs <= 0
          ? 'Air ran out! Give the Air Machine at least 2 Power Cells.'
          : nextFood <= 0
          ? 'Food ran out! Give Space Garden more Power or harvest crops.'
          : 'Crew Health dropped to 0! Raise Shield power during storms.'
      );
      setMissionOutcome('failed');
      return;
    }

    // End of final level day -> check if level goal passed!
    if (day >= currentLevel.maxDays) {
      const passedAir =
        currentLevel.requiredMinAir === undefined || nextLs >= currentLevel.requiredMinAir;
      const passedFood =
        currentLevel.requiredMinFood === undefined || nextFood >= currentLevel.requiredMinFood;
      const passedAction =
        !currentLevel.requiredActionId || actionsDone.includes(currentLevel.requiredActionId);
      const passedDust =
        currentLevel.requiredMaxDust === undefined || solarDust <= currentLevel.requiredMaxDust;
      const passedShield =
        currentLevel.requiredMinShield === undefined ||
        powerAllocation.shield >= currentLevel.requiredMinShield ||
        shieldBonusToday > 0;
      const passedSamples =
        currentLevel.requiredSamples === undefined ||
        collectedSampleIds.length >= currentLevel.requiredSamples;
      const passedSci =
        currentLevel.requiredScience === undefined || nextScience >= currentLevel.requiredScience;

      if (
        passedAir &&
        passedFood &&
        passedAction &&
        passedDust &&
        passedShield &&
        passedSamples &&
        passedSci
      ) {
        soundEngine.playSuccess();
        setCompletedLevels((prev) =>
          prev.includes(currentLevel.id) ? prev : [...prev, currentLevel.id]
        );
        if (currentLevel.id >= unlockedLevel && currentLevel.id < GAME_LEVELS.length) {
          setUnlockedLevel(currentLevel.id + 1);
          setUnlockedNewLevel(true);
        }
        setMissionOutcome('victory');
      } else {
        soundEngine.playAdvanceSol(true);
        setFailureReason(`Almost! Level Goal not finished yet: ${currentLevel.goalText}`);
        setMissionOutcome('failed');
      }
      return;
    }

    // Advance to next day in current level
    const nextDay = day + 1;
    setDay(nextDay);
    setShieldBonusToday(0);

    const stormActive = currentLevel.stormDay === nextDay;
    const dustOrShadow = currentLevel.dustDay === nextDay;
    setIsSolarStorm(stormActive);
    setIsDustStorm(dustOrShadow);

    const addedDust = dustOrShadow ? 35 : 10;
    const nextDust = Math.min(100, solarDust + addedDust);
    setSolarDust(nextDust);

    const dustPenalty = nextDust >= 65 ? -1 : 0;
    const newBasePower = (dustOrShadow ? 6 : SITE_CONFIGS[site].maxSolarCells) + dustPenalty;
    setBasePowerCells(Math.max(5, newBasePower));
    setNextDayPowerMod(0);
    const nextTotalPower = Math.max(4, Math.min(9, newBasePower));
    setPowerAllocation((prev) => rebalancePower(prev, nextTotalPower));

    soundEngine.playAdvanceSol(stormActive);

    const available = MISSION_DILEMMAS.filter((d) => !usedDilemmaIds.includes(d.id));
    if (available.length > 0 && (stormActive || currentLevel.id >= 3)) {
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
    showLevelBrief,
    powerAllocation,
    effectiveRadiationMsv,
    lifeSupport,
    food,
    crewHealth,
    science,
    day,
    currentLevel,
    actionsDone,
    solarDust,
    shieldBonusToday,
    collectedSampleIds.length,
    site,
    unlockedLevel,
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
      if (nextLs <= 0 || nextFood <= 0 || nextHealth <= 0) {
        setFailureReason('A resource bar hit 0%! Replay the level and try a safer trade-off.');
        setMissionOutcome('failed');
      }
    },
    [lifeSupport, food, crewHealth, science, basePowerCells]
  );

  const viewportSnapshot: ViewportSimSnapshot = useMemo(
    () => ({
      site,
      activeAstronaut,
      selectedModule: 'overview',
      powerAllocation,
      isSolarStorm,
      isDustStorm,
      crewHealth,
      food,
      lifeSupport,
      shieldLevel: powerAllocation.shield,
      cameraMode: 'follow',
      walkSpeed: 'normal',
      collectedSampleIds,
    }),
    [
      site,
      activeAstronaut,
      powerAllocation,
      isSolarStorm,
      isDustStorm,
      crewHealth,
      food,
      lifeSupport,
      collectedSampleIds,
    ]
  );

  const nearPoint = nearStationId ? STATION_POINTS.find((p) => p.id === nearStationId) : null;
  const nearSpec = nearStationId ? MODULE_SPECS[nearStationId] : null;
  const uncollectedSamples = FIELD_SAMPLES.filter((s) => !collectedSampleIds.includes(s.id));

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070B14]">
      {isIntroPlaying ? (
        <IntroCutscene
          autostart={introAutostart}
          muted={muted}
          onSyncMuted={handleSyncMuted}
          onComplete={handleIntroFinished}
        />
      ) : (
        <>
          <OutpostViewport
            simSnapshot={viewportSnapshot}
            walkToTarget={walkToTarget}
            onNearStationChange={setNearStationId}
            onInteractStation={handleInteractStation}
            onCollectSample={handleCollectSample}
          />

          {/* GTA-Style Top-Left Health/Air/Food/Rad/Power Bars & Top-Right Menu */}
          <TopTelemetryBar
            level={currentLevel}
            levelGoalMet={levelGoalMet}
            site={site}
            activeAstronaut={activeAstronaut}
            day={day}
            maxDays={currentLevel.maxDays}
            lifeSupport={lifeSupport}
            food={food}
            crewHealth={crewHealth}
            radiationMsv={effectiveRadiationMsv}
            powerFree={freePowerCells}
            powerTotal={totalPowerCells}
            isSolarStorm={isSolarStorm}
            isDustStorm={isDustStorm}
            muted={muted}
            introPlaying={false}
            onOpenMenu={() => {
              soundEngine.playClick(620);
              setShowMenuModal(true);
            }}
            onOpenCrewSwitch={() => handleInteractStation('crew')}
            onOpenNasaData={() => {
              soundEngine.playClick(620);
              setShowNasaModal(true);
            }}
            onToggleMute={() => {
              const next = !muted;
              soundEngine.setMuted(next);
              setMuted(next);
            }}
            onAdvanceDay={handleAdvanceDay}
          />
        </>
      )}

      {/* Sample Crystal Toast */}
      {!isIntroPlaying && sampleToast && (
        <div
          className="pointer-events-none fixed left-1/2 top-16 z-20 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl border-2 bg-[#080E1B]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-[popupSlideUp_0.25s_ease-out]"
          style={{ borderColor: sampleToast.color }}
        >
          <p className="flex items-center gap-1.5 font-display text-sm font-extrabold text-white">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{sampleToast.title}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-300">{sampleToast.body}</p>
        </div>
      )}

      {/* Minimal Bottom Quick-Walk Station Strip */}
      {!isIntroPlaying && !showLevelBrief && !showMenuModal && !missionOutcome && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 flex w-full max-w-2xl -translate-x-1/2 flex-col items-center gap-2 px-3">
          {nearStationId && nearSpec && !activeStationModal && !activeDilemma && (
            <button
              type="button"
              onClick={() => handleInteractStation(nearStationId)}
              className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border-2 border-amber-400 bg-[#080E1B]/95 px-4 py-2 shadow-2xl hover:bg-slate-900 transition-colors"
            >
              <span className="rounded-lg bg-amber-500 px-2 py-0.5 font-mono-tabular text-xs font-extrabold text-slate-950">
                E
              </span>
              <span className="font-display text-sm font-extrabold text-white">
                {nearPoint ? nearPoint.promptAction : nearSpec.name}
              </span>
            </button>
          )}

          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-700/80 bg-[#080E1B]/85 p-1.5 shadow-xl backdrop-blur-md">
            {STATION_POINTS.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick(580);
                  const len = Math.hypot(st.x, st.z);
                  const standX =
                    len < 0.5 ? 0 : st.x - (st.x / len) * (st.collisionRadius + 0.7);
                  const standZ =
                    len < 0.5
                      ? st.collisionRadius + 0.7
                      : st.z - (st.z / len) * (st.collisionRadius + 0.7);
                  setWalkToTarget((prev) => ({
                    x: standX,
                    z: standZ,
                    seq: (prev?.seq ?? 0) + 1,
                  }));
                }}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-colors ${
                  nearStationId === st.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {st.shortName}
              </button>
            ))}

            {uncollectedSamples.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const target = uncollectedSamples[0];
                  soundEngine.playClick(720);
                  setWalkToTarget((prev) => ({
                    x: target.x,
                    z: target.z,
                    seq: (prev?.seq ?? 0) + 1,
                  }));
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/70 px-2.5 py-1 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-900/70"
              >
                <Gem className="h-3 w-3 text-fuchsia-400" />
                <span>Crystal ({collectedSampleIds.length}/5)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Level Start Lesson Card */}
      {!isIntroPlaying && showLevelBrief && !missionOutcome && !showMenuModal && (
        <LevelBriefModal
          level={currentLevel}
          onStart={() => {
            soundEngine.playClick(640);
            setShowLevelBrief(false);
            soundEngine.speak(`${currentLevel.lessonTitle}. ${currentLevel.lessonText}`);
          }}
        />
      )}

      {/* Station Modal */}
      {activeStationModal && (
        <StationInteractModal
          stationId={activeStationModal}
          activeAstronaut={activeAstronaut}
          onSelectAstronaut={(id) => {
            soundEngine.playSelectModule();
            setActiveAstronaut(id);
          }}
          site={site}
          day={day}
          maxDays={currentLevel.maxDays}
          lifeSupport={lifeSupport}
          food={food}
          crewHealth={crewHealth}
          science={science}
          solarDust={solarDust}
          radiationMsv={effectiveRadiationMsv}
          totalPowerCells={totalPowerCells}
          powerAllocation={powerAllocation}
          onSetPower={handleSetPower}
          onStationAction={handleStationAction}
          onAdvanceDay={handleAdvanceDay}
          onClose={() => setActiveStationModal(null)}
        />
      )}

      {/* Space Base Game Menu */}
      {showMenuModal && (
        <GameMenuModal
          currentLevelId={currentLevelId}
          unlockedLevel={unlockedLevel}
          completedLevels={completedLevels}
          site={site}
          activeAstronaut={activeAstronaut}
          muted={muted}
          voiceEnabled={voiceEnabled}
          onSelectLevel={(lvlId) => startLevel(lvlId, false)}
          onSelectSite={(nextSite) => startLevel(currentLevelId, false, nextSite)}
          onSelectAstronaut={(id) => {
            soundEngine.playSelectModule();
            setActiveAstronaut(id);
          }}
          onToggleMute={() => {
            const next = !muted;
            soundEngine.setMuted(next);
            setMuted(next);
          }}
          onToggleVoice={() => {
            const next = !voiceEnabled;
            soundEngine.setVoiceEnabled(next);
            setVoiceEnabled(next);
          }}
          onReplayIntro={() => startLevel(currentLevelId, true)}
          onClose={() => setShowMenuModal(false)}
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

      {missionOutcome && (
        <MissionDebriefModal
          outcome={missionOutcome}
          failureReason={failureReason}
          level={currentLevel}
          hasNextLevel={currentLevel.id < GAME_LEVELS.length}
          unlockedNextLevel={unlockedNewLevel}
          crewHealth={crewHealth}
          lifeSupport={lifeSupport}
          food={food}
          science={science}
          onNextLevel={() => startLevel(Math.min(GAME_LEVELS.length, currentLevel.id + 1), false)}
          onReplayLevel={() => startLevel(currentLevel.id, false)}
          onOpenMenu={() => {
            setMissionOutcome(null);
            setShowMenuModal(true);
          }}
        />
      )}
    </div>
  );
}
