import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DoorOpen, Mountain, Sparkles } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { DecisionModal } from './components/DecisionModal';
import { GameMenuModal } from './components/GameMenuModal';
import { InteriorZoneModal } from './components/InteriorZoneModal';
import { LevelBriefModal } from './components/LevelBriefModal';
import { MissionDebriefModal } from './components/MissionDebriefModal';
import { NasaDataModal } from './components/NasaDataModal';
import { StationInteractModal } from './components/StationInteractModal';
import { SolarScrubModal } from './components/SolarScrubModal';
import { TopTelemetryBar, TutorialGoalItem } from './components/TopTelemetryBar';
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
  CropPlotState,
  CropType,
  DilemmaChoice,
  FIELD_SAMPLES,
  GAME_LEVELS,
  INTERIOR_POINTS,
  InteriorZoneId,
  MISSION_DILEMMAS,
  MissionDilemma,
  MODULE_SPECS,
  ModuleId,
  OutpostSiteId,
  PowerSystemKey,
  SITE_CONFIGS,
  STATION_POINTS,
  SURVIVAL_TARGET_SOLS,
} from './data/missionScenarios';
import { OutpostViewport, SpawnAnchorType, ViewportSimSnapshot } from './three/OutpostViewport';

const PROGRESS_STORAGE_KEY = 'starbase_junior_progress_v1';
const SURVIVAL_DUST_DAYS = [8, 22, 38, 56, 78, 102, 126, 142];
const SURVIVAL_SOLAR_DAYS = [14, 30, 48, 70, 94, 118, 135];

function createInitialCropPlots(preGrown = false): CropPlotState[] {
  return [
    {
      id: 0,
      cropType: preGrown ? 'potatoes' : 'lettuce',
      stage: preGrown ? 2 : 1,
    },
    {
      id: 1,
      cropType: 'tomatoes',
      stage: preGrown ? 1 : 0,
    },
    {
      id: 2,
      cropType: 'lettuce',
      stage: 0,
    },
  ];
}

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
  unlockedSurvival?: boolean;
}

function loadSavedProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return { unlockedLevel: 1, completedLevels: [], unlockedSurvival: false };
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const completed = Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [];
    return {
      unlockedLevel: Math.max(1, Math.min(GAME_LEVELS.length, parsed.unlockedLevel ?? 1)),
      completedLevels: completed,
      unlockedSurvival: Boolean(parsed.unlockedSurvival || completed.includes(GAME_LEVELS.length)),
    };
  } catch {
    return { unlockedLevel: 1, completedLevels: [], unlockedSurvival: false };
  }
}

export default function App() {
  const saved = useMemo(() => loadSavedProgress(), []);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(saved.unlockedLevel);
  const [completedLevels, setCompletedLevels] = useState<number[]>(saved.completedLevels);
  const [unlockedSurvival, setUnlockedSurvival] = useState<boolean>(Boolean(saved.unlockedSurvival));
  const [gameMode, setGameMode] = useState<'tutorial' | 'survival'>('tutorial');
  const [worldLocation, setWorldLocation] = useState<'outside' | 'inside'>('outside');
  const [spawnAnchor, setSpawnAnchor] = useState<{ type: SpawnAnchorType; seq: number } | null>(null);
  const [interiorWalkTarget, setInteriorWalkTarget] = useState<{
    x: number;
    z: number;
    seq: number;
  } | null>(null);
  const [nearInteriorZone, setNearInteriorZone] = useState<InteriorZoneId | null>(null);
  const [activeInteriorModal, setActiveInteriorModal] = useState<
    'lab' | 'exercise' | 'scanner' | 'greenhouse_beds' | null
  >(null);

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
  const [showSurvivalIntro, setShowSurvivalIntro] = useState<boolean>(false);
  const [showMenuModal, setShowMenuModal] = useState<boolean>(false);
  const [showNasaModal, setShowNasaModal] = useState<boolean>(false);

  const [day, setDay] = useState<number>(1);
  const [lifeSupport, setLifeSupport] = useState<number>(currentLevel.initialAir);
  const [food, setFood] = useState<number>(currentLevel.initialFood);
  const [crewHealth, setCrewHealth] = useState<number>(currentLevel.initialHealth);
  const [muscleBone, setMuscleBone] = useState<number>(96);
  const [radiationPct, setRadiationPct] = useState<number>(10);
  const [medkits, setMedkits] = useState<number>(3);
  const [showSolarScrub, setShowSolarScrub] = useState<boolean>(false);
  const [bodyRadiationDose, setBodyRadiationDose] = useState<number>(0);
  const [lastScannedSol, setLastScannedSol] = useState<number>(1);
  const [scanningActive, setScanningActive] = useState<boolean>(false);
  const [commsRepair, setCommsRepair] = useState<number>(0);
  const [earthContacted, setEarthContacted] = useState<boolean>(false);
  const [rescueArrived, setRescueArrived] = useState<boolean>(false);
  const [cropPlots, setCropPlots] = useState<CropPlotState[]>(() => createInitialCropPlots(false));
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

  const [basePowerCells, setBasePowerCells] = useState<number>(
    currentLevel.initialDust >= 65 ? 3 : SITE_CONFIGS.mars.maxSolarCells
  );
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
  const [inShelter, setInShelter] = useState<boolean>(false);
  const [dustStormPhase, setDustStormPhase] = useState<'clear' | 'raging' | 'settled'>('clear');
  const [shelterGraceSec, setShelterGraceSec] = useState<number>(0);
  const [stormSecondsLeft, setStormSecondsLeft] = useState<number>(0);
  const [stormTriggeredDay, setStormTriggeredDay] = useState<number | null>(null);

  const inShelterRef = useRef<boolean>(false);
  inShelterRef.current = inShelter || worldLocation === 'inside';
  const inStationModalRef = useRef<boolean>(false);
  inStationModalRef.current = activeStationModal === 'habitat' || worldLocation === 'inside';
  const graceRef = useRef<number>(0);
  const stormLeftRef = useRef<number>(0);
  const halfTickRef = useRef<number>(0);

  const [activeDilemma, setActiveDilemma] = useState<MissionDilemma | null>(null);
  const [usedDilemmaIds, setUsedDilemmaIds] = useState<string[]>([]);
  const [missionOutcome, setMissionOutcome] = useState<'victory' | 'failed' | 'rescue' | null>(null);
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
        JSON.stringify({ unlockedLevel, completedLevels, unlockedSurvival })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [unlockedLevel, completedLevels, unlockedSurvival]);

  const startLevel = useCallback(
    (levelId: number, playIntro: boolean, overrideSite?: OutpostSiteId) => {
      const lvl = GAME_LEVELS.find((l) => l.id === levelId) ?? GAME_LEVELS[0];
      const targetSite = overrideSite ?? lvl.site;
      soundEngine.playClick(560);
      setGameMode('tutorial');
      setWorldLocation('outside');
      setSpawnAnchor((prev) => ({ type: 'outside_station', seq: (prev?.seq ?? 0) + 1 }));
      setInteriorWalkTarget(null);
      setNearInteriorZone(null);
      setActiveInteriorModal(null);
      setCurrentLevelId(lvl.id);
      setSite(targetSite);
      setDay(1);
      setLifeSupport(lvl.initialAir);
      setFood(lvl.initialFood);
      setCrewHealth(lvl.initialHealth);
      setMuscleBone(96);
      setRadiationPct(targetSite === 'moon' || lvl.stormDay !== null ? 15 : 10);
      setMedkits(3);
      setShowSolarScrub(false);
      setBodyRadiationDose(0);
      setLastScannedSol(1);
      setScanningActive(false);
      setCommsRepair(0);
      setEarthContacted(false);
      setRescueArrived(false);
      setCropPlots(createInitialCropPlots(false));
      setScience(0);
      setSolarDust(lvl.initialDust);
      setActionsDone([]);
      setCollectedSampleIds([]);
      setSampleToast(null);
      setWalkToTarget(null);
      const startsDirty = lvl.initialDust >= 65;
      const maxCells = startsDirty ? 3 : SITE_CONFIGS[targetSite].maxSolarCells;
      setBasePowerCells(maxCells);
      setNextDayPowerMod(0);
      setShieldBonusToday(0);
      setPowerAllocation(rebalancePower(lvl.initialPower, maxCells));
      setNearStationId(null);
      setActiveStationModal(null);
      setIsSolarStorm(lvl.stormDay === 1);
      setIsDustStorm(false);
      setInShelter(false);
      setDustStormPhase('clear');
      setShelterGraceSec(0);
      setStormSecondsLeft(0);
      setStormTriggeredDay(null);
      graceRef.current = 0;
      stormLeftRef.current = 0;
      halfTickRef.current = 0;
      setActiveDilemma(null);
      setUsedDilemmaIds([]);
      setMissionOutcome(null);
      setFailureReason(null);
      setUnlockedNewLevel(false);
      setShowMenuModal(false);
      setShowSurvivalIntro(false);
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

  const startSurvivalMode = useCallback((overrideSite?: OutpostSiteId) => {
    const targetSite = overrideSite ?? 'mars';
    soundEngine.playSuccess();
    setUnlockedSurvival(true);
    setGameMode('survival');
    setWorldLocation('outside');
    setSpawnAnchor((prev) => ({ type: 'outside_station', seq: (prev?.seq ?? 0) + 1 }));
    setInteriorWalkTarget(null);
    setNearInteriorZone(null);
    setActiveInteriorModal(null);
    setSite(targetSite);
    setDay(1);
    setLifeSupport(84);
    setFood(78);
    setCrewHealth(92);
    setMuscleBone(90);
    setRadiationPct(15);
    setMedkits(3);
    setShowSolarScrub(false);
    setBodyRadiationDose(0.2);
    setLastScannedSol(1);
    setScanningActive(false);
    setCommsRepair(0);
    setEarthContacted(false);
    setRescueArrived(false);
    setCropPlots(createInitialCropPlots(true));
    setScience(0);
    setSolarDust(72);
    setActionsDone([]);
    setCollectedSampleIds([]);
    setSampleToast(null);
    setWalkToTarget(null);
    const maxCells = 4;
    setBasePowerCells(maxCells);
    setNextDayPowerMod(0);
    setShieldBonusToday(0);
    setPowerAllocation({ lifesupport: 2, greenhouse: 1, shield: 1, science: 0 });
    setNearStationId(null);
    setActiveStationModal(null);
    setIsSolarStorm(false);
    setIsDustStorm(false);
    setInShelter(false);
    setDustStormPhase('settled');
    setShelterGraceSec(0);
    setStormSecondsLeft(0);
    setStormTriggeredDay(null);
    graceRef.current = 0;
    stormLeftRef.current = 0;
    halfTickRef.current = 0;
    setActiveDilemma(null);
    setUsedDilemmaIds([]);
    setMissionOutcome(null);
    setFailureReason(null);
    setUnlockedNewLevel(false);
    setShowMenuModal(false);
    setShowLevelBrief(false);
    setShowSurvivalIntro(true);
    setIsIntroPlaying(false);
  }, []);

  const totalPowerCells = Math.max(3, Math.min(9, basePowerCells + nextDayPowerMod));
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
    if (!nextMuted) {
      soundEngine.unlock();
    }
  }, []);

  const handleIntroFinished = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playSuccess();
    setIntroAutostart(false);
    setIsIntroPlaying(false);
  }, []);

  // Ambient Retro Space Synthesizer Loop (Undertale 'Fallen Down' + Interstellar organ)
  useEffect(() => {
    const shouldPlayAmbient = !isIntroPlaying && !missionOutcome && !muted;
    if (!shouldPlayAmbient) {
      soundEngine.stopAmbientSpaceLoop();
      return;
    }

    soundEngine.startAmbientSpaceLoop();
    soundEngine.setAmbientAlert(isSolarStorm || dustStormPhase === 'raging');

    const unlockOnGesture = () => {
      soundEngine.unlock();
      soundEngine.startAmbientSpaceLoop();
      soundEngine.setAmbientAlert(isSolarStorm || dustStormPhase === 'raging');
    };
    window.addEventListener('pointerdown', unlockOnGesture, { once: true });
    window.addEventListener('keydown', unlockOnGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
    };
  }, [isIntroPlaying, missionOutcome, muted, isSolarStorm, dustStormPhase]);

  useEffect(() => {
    return () => {
      soundEngine.stopAmbientSpaceLoop();
      soundEngine.stopDustStormLoop();
    };
  }, []);

  // Real Mars dust storm loop (louder outdoors, muffled inside station/shelter)
  useEffect(() => {
    const stormActive =
      !isIntroPlaying && !missionOutcome && !muted && dustStormPhase === 'raging';
    if (!stormActive) {
      soundEngine.stopDustStormLoop();
      return;
    }
    const sheltered = inShelter || worldLocation === 'inside';
    void soundEngine.startDustStormLoop(sheltered);
    soundEngine.setDustStormSheltered(sheltered);
  }, [isIntroPlaying, missionOutcome, muted, dustStormPhase, inShelter, worldLocation]);

  const tutorialChecklist = useMemo<TutorialGoalItem[]>(() => {
    const items: TutorialGoalItem[] = [];
    if (currentLevel.requiredMinAir !== undefined) {
      items.push({
        label: `Air ${currentLevel.requiredMinAir}%+ (${Math.round(lifeSupport)}%)`,
        done: lifeSupport >= currentLevel.requiredMinAir,
      });
    }
    if (currentLevel.requiredMinFood !== undefined) {
      items.push({
        label: `Food ${currentLevel.requiredMinFood}%+ (${Math.round(food)}%)`,
        done: food >= currentLevel.requiredMinFood,
      });
    }
    if (currentLevel.requiredActionId) {
      const actionLabel =
        currentLevel.requiredActionId === 'harvest-greens'
          ? 'Harvest Greenhouse Crops'
          : currentLevel.requiredActionId === 'clean-solar'
          ? 'Scrub & Clean Solar Panels'
          : currentLevel.requiredActionId;
      items.push({
        label: actionLabel,
        done: actionsDone.includes(currentLevel.requiredActionId),
      });
    }
    if (currentLevel.requiredMaxDust !== undefined) {
      items.push({
        label: `Solar Dust <= ${currentLevel.requiredMaxDust}% (${Math.round(solarDust)}%)`,
        done: solarDust <= currentLevel.requiredMaxDust,
      });
    }
    if (currentLevel.requiredMinShield !== undefined) {
      items.push({
        label: `Shield Power ${currentLevel.requiredMinShield}+`,
        done: powerAllocation.shield >= currentLevel.requiredMinShield || shieldBonusToday > 0,
      });
    }
    if (currentLevel.requiredSamples !== undefined) {
      items.push({
        label: `Collect ${currentLevel.requiredSamples} Mars Rock${
          currentLevel.requiredSamples > 1 ? 's' : ''
        } (${Math.min(collectedSampleIds.length, currentLevel.requiredSamples)}/${
          currentLevel.requiredSamples
        })`,
        done: collectedSampleIds.length >= currentLevel.requiredSamples,
      });
    }
    if (currentLevel.requiredScience !== undefined) {
      items.push({
        label: `Science ${science}/${currentLevel.requiredScience}`,
        done: science >= currentLevel.requiredScience,
      });
    }
    items.push({
      label: `Reach & Finish Day ${currentLevel.maxDays} (${day}/${currentLevel.maxDays})`,
      done: day >= currentLevel.maxDays,
    });
    return items;
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
    day,
  ]);

  const enforceVitalsOrFail = useCallback(
    (params: {
      nextHealth: number;
      nextLs: number;
      nextRadPct: number;
      currentFood: number;
      nextMuscle?: number;
    }): boolean => {
      const { nextHealth, nextLs, nextRadPct, currentFood, nextMuscle } = params;
      if (nextRadPct >= 100) {
        soundEngine.playAdvanceSol(true);
        setFailureReason('Radiation sickness reached 100%! Use Anti-Rad Medkits & Shield power.');
        setMissionOutcome('failed');
        return true;
      }
      if (nextLs <= 0) {
        soundEngine.playAdvanceSol(true);
        setFailureReason('Air ran out! Give the Air Machine at least 2 Power Cells.');
        setMissionOutcome('failed');
        return true;
      }
      if (nextHealth <= 0) {
        soundEngine.playAdvanceSol(true);
        setFailureReason(
          currentFood <= 0
            ? 'Starvation! Food ran out and Crew Health dropped to 0%.'
            : 'Crew Health dropped to 0%! Keep Health, Food, and Shield up.'
        );
        setMissionOutcome('failed');
        return true;
      }
      if (gameMode === 'survival' && nextMuscle !== undefined && nextMuscle <= 0) {
        soundEngine.playAdvanceSol(true);
        setFailureReason('Muscle & bone density collapsed! Exercise regularly inside the Base Gym.');
        setMissionOutcome('failed');
        return true;
      }
      return false;
    },
    [gameMode]
  );

  const handleSkipTutorialLevel = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick(660);
    setCompletedLevels((prev) =>
      prev.includes(currentLevel.id) ? prev : [...prev, currentLevel.id]
    );
    if (currentLevel.id < GAME_LEVELS.length) {
      const nextId = currentLevel.id + 1;
      setUnlockedLevel((prev) => Math.max(prev, nextId));
      startLevel(nextId, false);
      setSampleToast({
        title: `⏭️ Skipped to Tutorial ${nextId}/5`,
        body: GAME_LEVELS[nextId - 1].goalText,
        color: '#22d3ee',
      });
    } else {
      setUnlockedSurvival(true);
      startSurvivalMode(site);
      setShowSurvivalIntro(false);
      setSampleToast({
        title: '🛸 Tutorials Complete — Survival Mode!',
        body: 'Tutorial bar cleared! Fix Earth Comms in Lab and survive 150 Sols.',
        color: '#22d3ee',
      });
    }
  }, [currentLevel.id, startLevel, startSurvivalMode, site]);

  const handleSkipAllTutorials = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playSuccess();
    setCompletedLevels(GAME_LEVELS.map((l) => l.id));
    setUnlockedLevel(GAME_LEVELS.length);
    setUnlockedSurvival(true);
    startSurvivalMode(site);
    setShowSurvivalIntro(false);
    setSampleToast({
      title: '🚀 All 5 Tutorials Skipped!',
      body: 'Open-World 150-Sol Survival active. Fix Earth Comms & scrub Solar panels!',
      color: '#22d3ee',
    });
  }, [startSurvivalMode, site]);

  const handleUseMedkit = useCallback(() => {
    if (medkits <= 0) {
      setSampleToast({
        title: '💊 Out of Anti-Rad Medkits!',
        body: 'Craft more Anti-Rad Medkits inside the Base Lab (-8% Air, -6% Food).',
        color: '#f43f5e',
      });
      return;
    }
    soundEngine.unlock();
    soundEngine.playSuccess();
    const nextRad = Math.max(0, radiationPct - 45);
    const nextHealth = clampPercent(crewHealth + 15);
    setMedkits((m) => Math.max(0, m - 1));
    setRadiationPct(nextRad);
    setCrewHealth(nextHealth);
    setBodyRadiationDose((d) => Math.max(0, +(d * 0.35).toFixed(2)));
    setSampleToast({
      title: `💊 Anti-Rad Medkit Used (${Math.round(nextRad)}% Rad)`,
      body: `-45% Radiation & +15% Health (${medkits - 1} Medkit${medkits - 1 === 1 ? '' : 's'} left).`,
      color: '#34d399',
    });
  }, [medkits, radiationPct, crewHealth]);

  const handleCraftMedkit = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick(680);
    const nextLs = clampPercent(lifeSupport - 8);
    const nextFood = clampPercent(food - 6);
    const nextHealth = nextFood <= 0 ? clampPercent(crewHealth - 20) : crewHealth;
    setLifeSupport(nextLs);
    setFood(nextFood);
    setCrewHealth(nextHealth);
    setMedkits((m) => m + 1);
    setSampleToast({
      title: `🧪 Crafted Anti-Rad Medkit (${medkits + 1} Ready)`,
      body: 'Synthesized radiation chelator in Base Lab (-8% Air, -6% Food).',
      color: '#34d399',
    });
    enforceVitalsOrFail({
      nextHealth,
      nextLs,
      nextRadPct: radiationPct,
      currentFood: nextFood,
    });
  }, [lifeSupport, food, crewHealth, medkits, radiationPct, enforceVitalsOrFail]);

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

  const isScheduledDustDay =
    gameMode === 'survival'
      ? SURVIVAL_DUST_DAYS.includes(day)
      : currentLevel.dustDay === day || (currentLevel.extraDustDays?.includes(day) ?? false);

  useEffect(() => {
    if (
      !isScheduledDustDay ||
      stormTriggeredDay === day ||
      dustStormPhase !== 'clear' ||
      isIntroPlaying ||
      showLevelBrief ||
      showSurvivalIntro ||
      showMenuModal ||
      showNasaModal ||
      showSolarScrub ||
      activeDilemma ||
      missionOutcome
    ) {
      return;
    }

    const t = window.setTimeout(() => {
      graceRef.current = 4.5;
      stormLeftRef.current = 9;
      halfTickRef.current = 0;
      setShelterGraceSec(4.5);
      setStormSecondsLeft(9);
      setDustStormPhase('raging');
      setIsDustStorm(true);
      setStormTriggeredDay(day);
      soundEngine.playAdvanceSol(true);
      void soundEngine.playRedAlertSfx();
      if (voiceEnabled) {
        soundEngine.playVoiceClip(
          'game_dust_storm',
          'Mars dust storm incoming! Get inside the Space Station right now!'
        );
      }
    }, 3800);

    return () => window.clearTimeout(t);
  }, [
    isScheduledDustDay,
    stormTriggeredDay,
    day,
    dustStormPhase,
    isIntroPlaying,
    showLevelBrief,
    showSurvivalIntro,
    showMenuModal,
    showNasaModal,
    showSolarScrub,
    activeDilemma,
    missionOutcome,
    voiceEnabled,
  ]);

  useEffect(() => {
    if (
      dustStormPhase !== 'raging' ||
      isIntroPlaying ||
      showLevelBrief ||
      showSurvivalIntro ||
      showMenuModal ||
      showNasaModal ||
      showSolarScrub ||
      activeDilemma ||
      missionOutcome
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (graceRef.current > 0) {
        graceRef.current = Math.max(0, graceRef.current - 0.5);
        setShelterGraceSec(graceRef.current);
      } else if (!inShelterRef.current && !inStationModalRef.current) {
        halfTickRef.current += 1;
        if (halfTickRef.current % 2 === 1) {
          setLifeSupport((prev) => {
            const next = clampPercent(prev - 4);
            if (next <= 0) {
              setFailureReason('Caught in the Mars dust storm! Run inside the Space Station next time.');
              setMissionOutcome('failed');
            }
            return next;
          });
          setCrewHealth((prev) => {
            const next = clampPercent(prev - 4);
            if (next <= 0) {
              setFailureReason('Hurt by the Mars dust storm! Shelter inside the Base next time.');
              setMissionOutcome('failed');
            }
            return next;
          });
          setRadiationPct((prev) => {
            const next = clampPercent(prev + 5);
            if (next >= 100) {
              setFailureReason('Radiation sickness reached 100% during the Mars storm!');
              setMissionOutcome('failed');
            }
            return next;
          });
        }
      }

      stormLeftRef.current = Math.max(0, stormLeftRef.current - 0.5);
      setStormSecondsLeft(stormLeftRef.current);

      if (stormLeftRef.current <= 0) {
        setDustStormPhase('settled');
        setIsDustStorm(false);
        setSolarDust(95);
        setBasePowerCells(3);
        setNextDayPowerMod(0);
        setPowerAllocation((prev) => rebalancePower(prev, 3));
        soundEngine.playSelectModule();
        if (voiceEnabled) {
          soundEngine.playVoiceClip(
            'game_storm_clear',
            'Storm passed. The solar farm is covered in dust. Go clean the panels.'
          );
        }
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [
    dustStormPhase,
    isIntroPlaying,
    showLevelBrief,
    showSurvivalIntro,
    showMenuModal,
    showNasaModal,
    showSolarScrub,
    activeDilemma,
    missionOutcome,
    voiceEnabled,
  ]);

  const walkToShelter = useCallback(() => {
    soundEngine.playClick(680);
    if (worldLocation === 'inside') return;
    setWalkToTarget((prev) => ({
      x: 0,
      z: 6.4,
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, [worldLocation]);

  const handleEnterInterior = useCallback((spawn: 'inside_station' | 'inside_greenhouse') => {
    soundEngine.playSelectModule();
    setActiveStationModal(null);
    setActiveInteriorModal(null);
    setNearStationId(null);
    setNearInteriorZone(null);
    setWalkToTarget(null);
    setInteriorWalkTarget(null);
    setWorldLocation('inside');
    setInShelter(true);
    setSpawnAnchor((prev) => ({ type: spawn, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const handleExitToMars = useCallback((target: 'outside_station' | 'outside_greenhouse') => {
    soundEngine.playSelectModule();
    setActiveInteriorModal(null);
    setNearInteriorZone(null);
    setInteriorWalkTarget(null);
    setWalkToTarget(null);
    setWorldLocation('outside');
    setInShelter(false);
    setSpawnAnchor((prev) => ({ type: target, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const handleToggleWorldLocation = useCallback(() => {
    if (worldLocation === 'inside') {
      handleExitToMars('outside_station');
    } else {
      handleEnterInterior(nearStationId === 'greenhouse' ? 'inside_greenhouse' : 'inside_station');
    }
  }, [worldLocation, nearStationId, handleEnterInterior, handleExitToMars]);

  const walkToInsideLab = useCallback(() => {
    soundEngine.playClick(660);
    const labZone = INTERIOR_POINTS.find((z) => z.id === 'lab');
    if (!labZone) return;
    if (worldLocation !== 'inside') {
      handleEnterInterior('inside_station');
    }
    window.setTimeout(() => {
      setInteriorWalkTarget((prev) => ({
        x: labZone.x,
        z: labZone.z + 1.4,
        seq: (prev?.seq ?? 0) + 1,
      }));
    }, 60);
  }, [worldLocation, handleEnterInterior]);

  const walkToSolar = useCallback(() => {
    const solarSt = STATION_POINTS.find((p) => p.id === 'solar');
    if (!solarSt) return;
    soundEngine.playClick(640);
    if (worldLocation === 'inside') {
      handleExitToMars('outside_station');
    }
    const len = Math.hypot(solarSt.x, solarSt.z) || 1;
    window.setTimeout(() => {
      setWalkToTarget((prev) => ({
        x: solarSt.x - (solarSt.x / len) * (solarSt.collisionRadius + 0.7),
        z: solarSt.z - (solarSt.z / len) * (solarSt.collisionRadius + 0.7),
        seq: (prev?.seq ?? 0) + 1,
      }));
    }, 60);
  }, [worldLocation, handleExitToMars]);

  const handleInteractStation = useCallback(
    (stationId: Exclude<ModuleId, 'overview'>) => {
      if (activeDilemma || missionOutcome || showMenuModal || showLevelBrief || showSurvivalIntro) {
        return;
      }
      soundEngine.playSelectModule();
      setActiveStationModal(stationId);
    },
    [activeDilemma, missionOutcome, showMenuModal, showLevelBrief, showSurvivalIntro]
  );

  const handleInteractInterior = useCallback(
    (zoneId: InteriorZoneId) => {
      if (activeDilemma || missionOutcome || showMenuModal || showLevelBrief || showSurvivalIntro) {
        return;
      }
      if (zoneId === 'exit_station') {
        handleExitToMars('outside_station');
        return;
      }
      if (zoneId === 'exit_greenhouse') {
        handleExitToMars('outside_greenhouse');
        return;
      }
      soundEngine.playSelectModule();
      setActiveInteriorModal(zoneId);
    },
    [
      activeDilemma,
      missionOutcome,
      showMenuModal,
      showLevelBrief,
      showSurvivalIntro,
      handleExitToMars,
    ]
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
      if (actionId === 'clean-solar') {
        soundEngine.playClick(640);
        setActiveStationModal(null);
        setShowSolarScrub(true);
        return;
      }

      soundEngine.playClick(640);
      setActionsDone((prev) => (prev.includes(actionId) ? prev : [...prev, actionId]));

      let nextLs = lifeSupport;
      let nextFood = food;
      let nextHealth = crewHealth;
      let nextSci = science;

      const mayaBonus = activeAstronaut === 'maya' ? 5 : 0;
      const leoBonus = activeAstronaut === 'leo' ? 5 : 0;
      const zaraSave = activeAstronaut === 'zara' ? 4 : 0;

      if (actionId === 'battery-boost') {
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

      if (nextFood <= 0) {
        nextHealth = clampPercent(nextHealth - 35);
      }

      setLifeSupport(nextLs);
      setFood(nextFood);
      setCrewHealth(nextHealth);
      setScience(nextSci);
      setActiveStationModal(null);

      enforceVitalsOrFail({
        nextHealth,
        nextLs,
        nextRadPct: radiationPct,
        currentFood: nextFood,
      });
    },
    [
      lifeSupport,
      food,
      crewHealth,
      science,
      solarDust,
      activeAstronaut,
      radiationPct,
      enforceVitalsOrFail,
    ]
  );

  const handleCompleteSolarScrub = useCallback(() => {
    soundEngine.playSuccess();
    setActionsDone((prev) => (prev.includes('clean-solar') ? prev : [...prev, 'clean-solar']));
    setSolarDust(0);
    if (dustStormPhase === 'settled') {
      setDustStormPhase('clear');
    }
    setBasePowerCells(SITE_CONFIGS[site].maxSolarCells);
    setNextDayPowerMod(1);
    const zaraSave = activeAstronaut === 'zara' ? 4 : 0;
    const nextLs = clampPercent(lifeSupport - 8 + zaraSave);
    const nextHealth = clampPercent(crewHealth - 5);
    const nextRadPct = clampPercent(radiationPct + 2);
    setLifeSupport(nextLs);
    setCrewHealth(nextHealth);
    setRadiationPct(nextRadPct);
    setShowSolarScrub(false);
    setSampleToast({
      title: '☀️ 12 Solar Panels Scrubbed Clean!',
      body: 'Full base Solar Power restored!',
      color: '#34d399',
    });
    enforceVitalsOrFail({
      nextHealth,
      nextLs,
      nextRadPct,
      currentFood: food,
    });
  }, [
    dustStormPhase,
    site,
    activeAstronaut,
    lifeSupport,
    crewHealth,
    radiationPct,
    food,
    enforceVitalsOrFail,
  ]);

  const handleFixComms = useCallback(() => {
    if (earthContacted) return;
    soundEngine.playClick(690);
    const repairStep = activeAstronaut === 'maya' || activeAstronaut === 'zara' ? 30 : 25;
    const nextLs = clampPercent(lifeSupport - 4);
    const nextHealth = clampPercent(crewHealth - 3);
    const nextRepair = Math.min(100, commsRepair + repairStep);
    setLifeSupport(nextLs);
    setCrewHealth(nextHealth);
    setScience((s) => s + 1);
    setCommsRepair(nextRepair);

    if (
      enforceVitalsOrFail({
        nextHealth,
        nextLs,
        nextRadPct: radiationPct,
        currentFood: food,
      })
    ) {
      return;
    }

    if (nextRepair >= 100 && !earthContacted) {
      setEarthContacted(true);
      soundEngine.playSuccess();
      if (gameMode === 'survival' && day >= SURVIVAL_TARGET_SOLS) {
        setActiveInteriorModal(null);
        handleExitToMars('outside_station');
        setRescueArrived(true);
        if (voiceEnabled) {
          soundEngine.playVoiceClip(
            'game_rescue_arrived',
            'Sol 150! Earth Rescue Shuttle descending to landing pad. Welcome home, astronaut!'
          );
        }
        setSampleToast({
          title: '🛸 Earth Rescue Shuttle Touchdown!',
          body: 'Comms restored on Sol 150! Rescue ship is landing outside.',
          color: '#22d3ee',
        });
        return;
      }
      if (voiceEnabled) {
        soundEngine.playVoiceClip(
          'game_comms_fixed',
          'Earth connection restored! Rescue mission is confirmed to arrive on Sol 150!'
        );
      }
      setSampleToast({
        title: '📡 Earth Connection Restored!',
        body: `Mission Control received your signal! Survive to Sol ${SURVIVAL_TARGET_SOLS} for rescue.`,
        color: '#22d3ee',
      });
    } else {
      setSampleToast({
        title: `🔧 Repaired Earth Comms (${nextRepair}%)`,
        body: 'Keep repairing in the Lab until signal reaches 100%!',
        color: '#38bdf8',
      });
    }
  }, [
    earthContacted,
    activeAstronaut,
    lifeSupport,
    crewHealth,
    commsRepair,
    radiationPct,
    food,
    enforceVitalsOrFail,
    voiceEnabled,
    gameMode,
    day,
    handleExitToMars,
  ]);

  const handleLabAnalyze = useCallback(() => {
    soundEngine.playClick(650);
    const nextLs = clampPercent(lifeSupport - 4);
    setScience((s) => s + 2);
    setLifeSupport(nextLs);
    setSampleToast({
      title: '🔬 Lab Sample Study (+2 Science)',
      body: 'Martian mineral composition logged at the Base Lab.',
      color: '#38bdf8',
    });
    enforceVitalsOrFail({
      nextHealth: crewHealth,
      nextLs,
      nextRadPct: radiationPct,
      currentFood: food,
    });
  }, [lifeSupport, crewHealth, radiationPct, food, enforceVitalsOrFail]);

  const handleExercise = useCallback(() => {
    soundEngine.playClick(660);
    const boost = activeAstronaut === 'leo' ? 26 : 22;
    const nextMuscle = clampPercent(muscleBone + boost);
    const nextFood = clampPercent(food - 5);
    const nextLs = clampPercent(lifeSupport - 6);
    const nextHealth = clampPercent(crewHealth + 8 - (nextFood <= 0 ? 30 : 0));
    setMuscleBone(nextMuscle);
    setCrewHealth(nextHealth);
    setFood(nextFood);
    setLifeSupport(nextLs);
    setSampleToast({
      title: `🏃 Exercise Complete (${Math.round(nextMuscle)}% Muscle)`,
      body: 'Daily resistive workout counters Mars low-gravity bone & muscle loss!',
      color: '#fbbf24',
    });
    enforceVitalsOrFail({
      nextHealth,
      nextLs,
      nextRadPct: radiationPct,
      currentFood: nextFood,
      nextMuscle,
    });
  }, [
    activeAstronaut,
    muscleBone,
    crewHealth,
    food,
    lifeSupport,
    radiationPct,
    enforceVitalsOrFail,
  ]);

  const handleRunBodyScan = useCallback(() => {
    soundEngine.playSelectModule();
    setScanningActive(true);
    setLastScannedSol(day);
    setCrewHealth((h) => clampPercent(h + 6));
    setScience((s) => s + 1);
    setRadiationPct((r) => Math.max(0, r - 10));
    setBodyRadiationDose((d) => Math.max(0, +(d * 0.45).toFixed(2)));
    setSampleToast({
      title: `🩺 Full Body Scan Logged (Sol ${day})`,
      body: 'Dosimetry checked (-10% Rad), muscle & bone density calibrated!',
      color: '#22d3ee',
    });
    window.setTimeout(() => setScanningActive(false), 2200);
  }, [day]);

  const handlePlantCrops = useCallback(
    (cropType: CropType) => {
      const idx = cropPlots.findIndex((p) => p.stage === 0);
      if (idx === -1) return;
      soundEngine.playClick(640);
      const nextLs = clampPercent(lifeSupport - 3);
      setCropPlots((prev) =>
        prev.map((plot, i) => (i === idx ? { ...plot, cropType, stage: 1 } : plot))
      );
      setLifeSupport(nextLs);
      setSampleToast({
        title: `🌱 Planted ${cropType.charAt(0).toUpperCase() + cropType.slice(1)} in Bed #${idx + 1}`,
        body: 'Crops grow +1 stage each Sol (or when watered) with Grow Lights!',
        color: '#34d399',
      });
      enforceVitalsOrFail({
        nextHealth: crewHealth,
        nextLs,
        nextRadPct: radiationPct,
        currentFood: food,
      });
    },
    [cropPlots, lifeSupport, crewHealth, radiationPct, food, enforceVitalsOrFail]
  );

  const handleWaterCrops = useCallback(() => {
    soundEngine.playClick(620);
    const nextLs = clampPercent(lifeSupport - 4);
    setCropPlots((prev) =>
      prev.map((p) =>
        p.stage > 0 && p.stage < 3
          ? { ...p, stage: Math.min(3, p.stage + 1) as 0 | 1 | 2 | 3 }
          : p
      )
    );
    setLifeSupport(nextLs);
    setSampleToast({
      title: '💧 Greenhouse Crops Watered',
      body: 'Hydrated beds surged +1 growth stage!',
      color: '#38bdf8',
    });
    enforceVitalsOrFail({
      nextHealth: crewHealth,
      nextLs,
      nextRadPct: radiationPct,
      currentFood: food,
    });
  }, [lifeSupport, crewHealth, radiationPct, food, enforceVitalsOrFail]);

  const handleHarvestCrops = useCallback(() => {
    const ripeCount = cropPlots.filter((p) => p.stage >= 3).length;
    if (ripeCount === 0) return;
    soundEngine.playSuccess();
    const leoBonus = activeAstronaut === 'leo' ? 4 : 0;
    const foodGain = ripeCount * (16 + leoBonus);
    setFood((f) => clampPercent(f + foodGain));
    setCrewHealth((h) => clampPercent(h + ripeCount * 5));
    setActionsDone((prev) => (prev.includes('harvest-greens') ? prev : [...prev, 'harvest-greens']));
    setCropPlots((prev) => prev.map((p) => (p.stage >= 3 ? { ...p, stage: 0 } : p)));
    setSampleToast({
      title: `🥗 Harvested ${ripeCount} Bed${ripeCount > 1 ? 's' : ''} (+${foodGain}% Food)`,
      body: 'Fresh Mars produce stored in Station Food Reserves!',
      color: '#34d399',
    });
  }, [cropPlots, activeAstronaut]);

  useEffect(() => {
    if (!rescueArrived || missionOutcome === 'rescue') return;
    const t = window.setTimeout(() => {
      setMissionOutcome('rescue');
    }, 2600);
    return () => window.clearTimeout(t);
  }, [rescueArrived, missionOutcome]);

  const advanceSimulationDays = useCallback(
    (requestedSteps: number) => {
      if (
        isIntroPlaying ||
        missionOutcome ||
        rescueArrived ||
        activeDilemma ||
        showLevelBrief ||
        showSurvivalIntro ||
        showSolarScrub ||
        dustStormPhase === 'raging'
      ) {
        return;
      }

      const lsDeltaMap = [-22, -9, 4, 11];
      const ghFoodMap = [-16, -6, 6, 13];
      const ghO2BonusMap = [0, 0, 3, 6];

      let curDay = day;
      let curLs = lifeSupport;
      let curFood = food;
      let curHealth = crewHealth;
      let curSci = science;
      let curMuscle = muscleBone;
      let curRadPct = radiationPct;
      let curBodyRad = bodyRadiationDose;
      let curDust = solarDust;
      let curPlots = cropPlots;
      let curPower = powerAllocation;
      let curBasePower = basePowerCells;
      let curSolarStorm = isSolarStorm;
      let stoppedEarlyReason: string | null = null;

      const stepsToRun = gameMode === 'survival' ? Math.max(1, requestedSteps) : 1;

      for (let step = 0; step < stepsToRun; step += 1) {
        const lsChange =
          lsDeltaMap[curPower.lifesupport] +
          ghO2BonusMap[curPower.greenhouse] -
          Math.max(0, curPower.science - 1) * 3;
        const foodChange = ghFoodMap[curPower.greenhouse];
        const scienceGain = curPower.science;

        let healthChange = 2;
        if (effectiveRadiationMsv > 1.8) {
          healthChange -= Math.round((effectiveRadiationMsv - 1.5) * 7.5);
        }
        curLs = clampPercent(curLs + lsChange);
        curFood = clampPercent(curFood + foodChange);
        if (curLs < 30) healthChange -= 10;
        if (curFood <= 0) {
          healthChange -= 48; // Starvation drops Health sharply until 0
        } else if (curFood < 25) {
          healthChange -= 14;
        }

        const shelteredFactor = inShelterRef.current ? 0.55 : 1;
        const flareRadGain = curSolarStorm
          ? Math.max(10, 32 - curPower.shield * 7 - Math.round(shieldBonusToday * 0.35))
          : 0;
        const ambientRadGain = Math.max(
          2,
          Math.round(effectiveRadiationMsv * 7 * shelteredFactor)
        );
        curRadPct = clampPercent(curRadPct + flareRadGain + ambientRadGain);
        if (curRadPct >= 65) {
          healthChange -= 8;
        }

        if (gameMode === 'survival') {
          curMuscle = clampPercent(curMuscle - 4.5);
          if (curMuscle < 35) healthChange -= 6;
          if (curDay - lastScannedSol > 18) healthChange -= 4;
          curBodyRad = +(curBodyRad + effectiveRadiationMsv * 0.12).toFixed(2);
          if (curBodyRad > 3.5) healthChange -= 3;
        }

        curHealth = clampPercent(curHealth + healthChange);
        curSci += scienceGain;

        if (
          curRadPct >= 100 ||
          curLs <= 0 ||
          curHealth <= 0 ||
          (gameMode === 'survival' && curMuscle <= 0)
        ) {
          setLifeSupport(curLs);
          setFood(curFood);
          setCrewHealth(curHealth);
          setMuscleBone(curMuscle);
          setRadiationPct(curRadPct);
          setBodyRadiationDose(curBodyRad);
          setScience(curSci);
          enforceVitalsOrFail({
            nextHealth: curHealth,
            nextLs: curLs,
            nextRadPct: curRadPct,
            currentFood: curFood,
            nextMuscle: curMuscle,
          });
          return;
        }

        // Check Tutorial victory at maxDays
        if (gameMode === 'tutorial' && curDay >= currentLevel.maxDays) {
          const passedAir =
            currentLevel.requiredMinAir === undefined || curLs >= currentLevel.requiredMinAir;
          const passedFood =
            currentLevel.requiredMinFood === undefined || curFood >= currentLevel.requiredMinFood;
          const passedAction =
            !currentLevel.requiredActionId || actionsDone.includes(currentLevel.requiredActionId);
          const passedDust =
            currentLevel.requiredMaxDust === undefined || curDust <= currentLevel.requiredMaxDust;
          const passedShield =
            currentLevel.requiredMinShield === undefined ||
            curPower.shield >= currentLevel.requiredMinShield ||
            shieldBonusToday > 0;
          const passedSamples =
            currentLevel.requiredSamples === undefined ||
            collectedSampleIds.length >= currentLevel.requiredSamples;
          const passedSci =
            currentLevel.requiredScience === undefined || curSci >= currentLevel.requiredScience;

          setLifeSupport(curLs);
          setFood(curFood);
          setCrewHealth(curHealth);
          setRadiationPct(curRadPct);
          setScience(curSci);

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
            if (currentLevel.id >= GAME_LEVELS.length) {
              setUnlockedSurvival(true);
            }
            setMissionOutcome('victory');
          } else {
            soundEngine.playAdvanceSol(true);
            setFailureReason(`Almost! Level Goal not finished yet: ${currentLevel.goalText}`);
            setMissionOutcome('failed');
          }
          return;
        }

        // Advance day counter
        const nextDay = curDay + 1;
        curDay = nextDay;

        // Grow Greenhouse crops
        let newRipe = false;
        curPlots = curPlots.map((plot) => {
          if (plot.stage > 0 && plot.stage < 3 && curPower.greenhouse >= 1) {
            const grownStage = (plot.stage + 1) as 0 | 1 | 2 | 3;
            if (grownStage === 3) newRipe = true;
            return { ...plot, stage: grownStage };
          }
          return plot;
        });

        // Update storm & dust
        curSolarStorm =
          gameMode === 'survival'
            ? SURVIVAL_SOLAR_DAYS.includes(nextDay)
            : currentLevel.stormDay === nextDay;
        const nextDustDay =
          gameMode === 'survival'
            ? SURVIVAL_DUST_DAYS.includes(nextDay)
            : currentLevel.dustDay === nextDay || (currentLevel.extraDustDays?.includes(nextDay) ?? false);

        curDust = Math.min(100, curDust + (gameMode === 'survival' ? 7 : 12));
        const siteMax = SITE_CONFIGS[site].maxSolarCells;
        curBasePower = curDust >= 65 ? 3 : curDust >= 40 ? Math.max(5, siteMax - 2) : siteMax;
        const clampedPowerTotal = Math.max(3, Math.min(9, curBasePower));
        curPower = rebalancePower(curPower, clampedPowerTotal);

        // Survival Sol 150 Rescue Check!
        if (gameMode === 'survival' && nextDay >= SURVIVAL_TARGET_SOLS) {
          setDay(nextDay);
          setLifeSupport(curLs);
          setFood(curFood);
          setCrewHealth(curHealth);
          setMuscleBone(curMuscle);
          setRadiationPct(curRadPct);
          setBodyRadiationDose(curBodyRad);
          setScience(curSci);
          setCropPlots(curPlots);
          setSolarDust(curDust);
          setBasePowerCells(curBasePower);
          setNextDayPowerMod(0);
          setShieldBonusToday(0);
          setPowerAllocation(curPower);
          setIsSolarStorm(false);
          setIsDustStorm(false);
          setDustStormPhase('clear');

          if (earthContacted) {
            if (worldLocation === 'inside') {
              handleExitToMars('outside_station');
            }
            setRescueArrived(true);
            soundEngine.playSuccess();
            if (voiceEnabled) {
              soundEngine.playVoiceClip(
                'game_rescue_arrived',
                'Sol 150! Earth Rescue Shuttle descending to landing pad. Welcome home, astronaut!'
              );
            }
            setSampleToast({
              title: '🛸 Earth Rescue Shuttle Touchdown!',
              body: `You survived ${SURVIVAL_TARGET_SOLS} Sols on Mars with Earth Comms online!`,
              color: '#22d3ee',
            });
          } else {
            setSampleToast({
              title: `📡 Sol ${nextDay} Reached — Fix Earth Comms!`,
              body: 'Repair Comms to 100% in the Base Lab so Earth can launch your Rescue Ship!',
              color: '#f59e0b',
            });
          }
          return;
        }

        // Stop fast-forward safely when attention is needed
        if (stepsToRun > 1) {
          if (nextDustDay || curSolarStorm) {
            stoppedEarlyReason = nextDustDay
              ? `Paused on Sol ${nextDay}: Mars Dust Storm alert!`
              : `Paused on Sol ${nextDay}: Solar radiation flare detected!`;
            break;
          }
          if (curRadPct >= 75) {
            stoppedEarlyReason = `Paused on Sol ${nextDay}: Radiation danger (${curRadPct}%)! Use an Anti-Rad Medkit!`;
            break;
          }
          if (newRipe) {
            stoppedEarlyReason = `Paused on Sol ${nextDay}: Greenhouse crops ready to harvest!`;
            break;
          }
          if (curLs < 38 || curFood < 38 || curHealth < 40 || curMuscle < 40) {
            stoppedEarlyReason = `Paused on Sol ${nextDay}: Vitals dropped low — check Base systems!`;
            break;
          }
        }
      }

      // Commit final state
      setDay(curDay);
      setLifeSupport(curLs);
      setFood(curFood);
      setCrewHealth(curHealth);
      setMuscleBone(curMuscle);
      setRadiationPct(curRadPct);
      setBodyRadiationDose(curBodyRad);
      setScience(curSci);
      setCropPlots(curPlots);
      setSolarDust(curDust);
      setBasePowerCells(curBasePower);
      setNextDayPowerMod(0);
      setShieldBonusToday(0);
      setPowerAllocation(curPower);
      setIsSolarStorm(curSolarStorm);
      setIsDustStorm(false);
      setDustStormPhase('clear');
      setShelterGraceSec(0);
      setStormSecondsLeft(0);
      soundEngine.playAdvanceSol(curSolarStorm);
      if (curSolarStorm) {
        void soundEngine.playRedAlertSfx();
      }

      if (stoppedEarlyReason) {
        setSampleToast({
          title: '⏭️ Auto-Advance Paused',
          body: stoppedEarlyReason,
          color: '#fbbf24',
        });
      }

      if (gameMode === 'tutorial') {
        const available = MISSION_DILEMMAS.filter((d) => !usedDilemmaIds.includes(d.id));
        if (available.length > 0 && (curSolarStorm || currentLevel.id >= 3)) {
          const picked = curSolarStorm
            ? available.find((d) => d.id === 'solar-flare-storm') || available[0]
            : available[0];
          setActiveDilemma(picked);
          setUsedDilemmaIds((prev) => [...prev, picked.id]);
        }
      }
    },
    [
      isIntroPlaying,
      missionOutcome,
      rescueArrived,
      activeDilemma,
      showLevelBrief,
      showSurvivalIntro,
      showSolarScrub,
      dustStormPhase,
      day,
      lifeSupport,
      food,
      crewHealth,
      science,
      muscleBone,
      radiationPct,
      bodyRadiationDose,
      solarDust,
      cropPlots,
      powerAllocation,
      basePowerCells,
      isSolarStorm,
      gameMode,
      effectiveRadiationMsv,
      lastScannedSol,
      currentLevel,
      actionsDone,
      shieldBonusToday,
      collectedSampleIds.length,
      unlockedLevel,
      site,
      earthContacted,
      worldLocation,
      handleExitToMars,
      enforceVitalsOrFail,
      voiceEnabled,
      usedDilemmaIds,
    ]
  );

  const handleAdvanceDay = useCallback(() => {
    advanceSimulationDays(1);
  }, [advanceSimulationDays]);

  const handleFastForwardSols = useCallback(() => {
    advanceSimulationDays(5);
  }, [advanceSimulationDays]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() !== 'e' ||
        isIntroPlaying ||
        showLevelBrief ||
        showSurvivalIntro ||
        showMenuModal ||
        showNasaModal ||
        showSolarScrub ||
        activeDilemma ||
        activeStationModal ||
        activeInteriorModal ||
        missionOutcome
      ) {
        return;
      }
      if (worldLocation === 'inside' && nearInteriorZone) {
        handleInteractInterior(nearInteriorZone);
      } else if (worldLocation === 'outside' && nearStationId) {
        handleInteractStation(nearStationId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isIntroPlaying,
    showLevelBrief,
    showSurvivalIntro,
    showMenuModal,
    showNasaModal,
    showSolarScrub,
    activeDilemma,
    activeStationModal,
    activeInteriorModal,
    missionOutcome,
    worldLocation,
    nearInteriorZone,
    nearStationId,
    handleInteractInterior,
    handleInteractStation,
  ]);

  const handleChooseDilemma = useCallback(
    (choice: DilemmaChoice) => {
      soundEngine.playClick(600);
      const eff = choice.effects;
      const nextLs = clampPercent(lifeSupport + (eff.lifeSupport ?? 0));
      const nextFood = clampPercent(food + (eff.food ?? 0));
      let nextHealth = clampPercent(crewHealth + (eff.crewHealth ?? 0));
      if (nextFood <= 0) {
        nextHealth = clampPercent(nextHealth - 35);
      }
      const nextSci = Math.max(0, science + (eff.science ?? 0));

      setLifeSupport(nextLs);
      setFood(nextFood);
      setCrewHealth(nextHealth);
      setScience(nextSci);
      if (eff.shieldBonus) setShieldBonusToday(eff.shieldBonus);

      if (eff.nextDayPowerMod) {
        const mod = eff.nextDayPowerMod;
        setNextDayPowerMod(mod);
        const updatedMax = Math.max(3, Math.min(9, basePowerCells + mod));
        setPowerAllocation((prev) => rebalancePower(prev, updatedMax));
      }

      setActiveDilemma(null);
      enforceVitalsOrFail({
        nextHealth,
        nextLs,
        nextRadPct: radiationPct,
        currentFood: nextFood,
      });
    },
    [lifeSupport, food, crewHealth, science, basePowerCells, radiationPct, enforceVitalsOrFail]
  );

  const viewportSnapshot: ViewportSimSnapshot = useMemo(
    () => ({
      site,
      activeAstronaut,
      selectedModule: 'overview',
      powerAllocation,
      isSolarStorm,
      isDustStorm,
      solarDust,
      crewHealth,
      food,
      lifeSupport,
      shieldLevel: powerAllocation.shield,
      cameraMode: 'follow',
      walkSpeed: 'normal',
      collectedSampleIds,
      worldLocation,
      cropPlots,
      commsRepaired: earthContacted,
      scanningActive,
      rescueArrived,
    }),
    [
      site,
      activeAstronaut,
      powerAllocation,
      isSolarStorm,
      isDustStorm,
      solarDust,
      crewHealth,
      food,
      lifeSupport,
      collectedSampleIds,
      worldLocation,
      cropPlots,
      earthContacted,
      scanningActive,
      rescueArrived,
    ]
  );

  const nearPoint = nearStationId ? STATION_POINTS.find((p) => p.id === nearStationId) : null;
  const nearSpec = nearStationId ? MODULE_SPECS[nearStationId] : null;
  const nearInteriorSpec = nearInteriorZone
    ? INTERIOR_POINTS.find((p) => p.id === nearInteriorZone) ?? null
    : null;
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
            interiorWalkTarget={interiorWalkTarget}
            spawnAnchor={spawnAnchor}
            onNearStationChange={setNearStationId}
            onNearInteriorChange={setNearInteriorZone}
            onShelterChange={setInShelter}
            onInteractStation={handleInteractStation}
            onInteractInterior={handleInteractInterior}
            onCollectSample={handleCollectSample}
          />

          {/* GTA-Style Top-Left Health/Air/Food/Rad/Power Bars & Top-Right Menu */}
          <TopTelemetryBar
            gameMode={gameMode}
            worldLocation={worldLocation}
            level={currentLevel}
            levelGoalMet={levelGoalMet}
            tutorialChecklist={tutorialChecklist}
            site={site}
            activeAstronaut={activeAstronaut}
            day={day}
            maxDays={currentLevel.maxDays}
            survivalTargetDays={SURVIVAL_TARGET_SOLS}
            lifeSupport={lifeSupport}
            food={food}
            crewHealth={crewHealth}
            muscleBone={muscleBone}
            lastScannedSol={lastScannedSol}
            commsRepair={commsRepair}
            earthContacted={earthContacted}
            radiationMsv={effectiveRadiationMsv}
            radiationPct={radiationPct}
            medkits={medkits}
            powerFree={freePowerCells}
            powerTotal={totalPowerCells}
            isSolarStorm={isSolarStorm}
            isDustStorm={isDustStorm}
            solarDust={solarDust}
            inShelter={inShelter || worldLocation === 'inside'}
            dustStormPhase={dustStormPhase}
            shelterGraceSec={shelterGraceSec}
            stormSecondsLeft={stormSecondsLeft}
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
              if (!next) {
                soundEngine.unlock();
              }
            }}
            onAdvanceDay={handleAdvanceDay}
            onFastForwardSols={handleFastForwardSols}
            onToggleWorldLocation={handleToggleWorldLocation}
            onWalkToInsideLab={walkToInsideLab}
            onWalkToShelter={walkToShelter}
            onWalkToSolar={walkToSolar}
            onUseMedkit={handleUseMedkit}
            onSkipTutorialLevel={handleSkipTutorialLevel}
            onSkipAllTutorials={handleSkipAllTutorials}
          />
        </>
      )}

      {/* Sample Crystal / Status Toast */}
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

      {/* Minimal Bottom Quick-Walk Strip (Outside vs Inside) */}
      {!isIntroPlaying && !showLevelBrief && !showSurvivalIntro && !showMenuModal && !missionOutcome && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 flex w-full max-w-3xl -translate-x-1/2 flex-col items-center gap-2 px-3">
          {worldLocation === 'outside' && nearStationId && nearSpec && !activeStationModal && !activeDilemma && (
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleInteractStation(nearStationId)}
                className="flex items-center gap-2.5 rounded-2xl border-2 border-amber-400 bg-[#080E1B]/95 px-4 py-2 shadow-2xl hover:bg-slate-900 transition-colors"
              >
                <span className="rounded-lg bg-amber-500 px-2 py-0.5 font-mono-tabular text-xs font-extrabold text-slate-950">
                  E
                </span>
                <span className="font-display text-sm font-extrabold text-white">
                  {nearPoint ? nearPoint.promptAction : nearSpec.name}
                </span>
              </button>

              {(nearStationId === 'habitat' || nearStationId === 'greenhouse') && (
                <button
                  type="button"
                  onClick={() =>
                    handleEnterInterior(
                      nearStationId === 'greenhouse' ? 'inside_greenhouse' : 'inside_station'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-cyan-400 bg-cyan-500 px-4 py-2 font-display text-sm font-extrabold text-slate-950 shadow-2xl hover:bg-cyan-400 transition-colors"
                >
                  <DoorOpen className="h-4 w-4" />
                  <span>Enter Inside</span>
                </button>
              )}
            </div>
          )}

          {worldLocation === 'inside' && nearInteriorZone && nearInteriorSpec && !activeInteriorModal && !activeDilemma && (
            <button
              type="button"
              onClick={() => handleInteractInterior(nearInteriorZone)}
              className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border-2 border-cyan-400 bg-[#080E1B]/95 px-4 py-2 shadow-2xl hover:bg-slate-900 transition-colors"
            >
              <span className="rounded-lg bg-cyan-400 px-2 py-0.5 font-mono-tabular text-xs font-extrabold text-slate-950">
                E
              </span>
              <span className="font-display text-sm font-extrabold text-white">
                {nearInteriorSpec.promptAction}
              </span>
            </button>
          )}

          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-700/80 bg-[#080E1B]/85 p-1.5 shadow-xl backdrop-blur-md">
            {worldLocation === 'outside' ? (
              <>
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
                          ? Math.min(7.2, st.collisionRadius + 0.7)
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
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-950/70 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-900/70"
                  >
                    <Mountain className="h-3 w-3 text-amber-400" />
                    <span>Mars Rock ({collectedSampleIds.length}/{FIELD_SAMPLES.length})</span>
                  </button>
                )}
              </>
            ) : (
              INTERIOR_POINTS.map((zp) => (
                <button
                  key={zp.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(600);
                    setInteriorWalkTarget((prev) => ({
                      x: zp.x,
                      z: Math.min(4.8, zp.z + 1.2),
                      seq: (prev?.seq ?? 0) + 1,
                    }));
                  }}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-colors ${
                    nearInteriorZone === zp.id
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {zp.shortName}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Level Start Lesson Card */}
      {!isIntroPlaying && gameMode === 'tutorial' && showLevelBrief && !missionOutcome && !showMenuModal && (
        <LevelBriefModal
          level={currentLevel}
          onStart={() => {
            soundEngine.unlock();
            soundEngine.playClick(640);
            setShowLevelBrief(false);
            soundEngine.speak(`${currentLevel.lessonTitle}. ${currentLevel.lessonText}`);
          }}
          onSkipTutorial={handleSkipTutorialLevel}
          onSkipAllTutorials={handleSkipAllTutorials}
        />
      )}

      {/* Open-World Survival Brief Card */}
      {!isIntroPlaying && gameMode === 'survival' && showSurvivalIntro && !missionOutcome && !showMenuModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-[2rem] border-4 border-cyan-400 bg-[#081020] p-7 sm:p-10 text-center shadow-2xl animate-[popupSlideUp_0.3s_ease-out]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-cyan-400/60 bg-cyan-500/20 text-5xl">
              🛰️
            </div>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-cyan-300">
              Open-World Mode · Survive {SURVIVAL_TARGET_SOLS} Sols
            </p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-white">
              Mars Open-World Survival
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-sm">
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3.5">
                <p className="font-extrabold text-rose-300">1. Fix Earth Comms in Lab</p>
                <p className="mt-1 text-slate-200">
                  The first storm broke Earth Radio! Enter the Base Lab and repair Comms to 100%.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3.5">
                <p className="font-extrabold text-amber-300">2. Clean Solar Farm + Exercise</p>
                <p className="mt-1 text-slate-200">
                  Clean the 12 solar panels outside, work out in the Gym, and use the Body Scanner!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(680);
                setShowSurvivalIntro(false);
                if (voiceEnabled) {
                  soundEngine.playVoiceClip(
                    'game_survival_start',
                    'Tutorial complete. The first storm damaged Earth communications. Farm your greenhouse, exercise daily, repair the lab radio, and survive one hundred fifty sols for rescue.'
                  );
                }
              }}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-cyan-600 bg-cyan-400 py-4 font-display text-xl font-extrabold text-slate-950 hover:bg-cyan-300"
            >
              <span>Begin 150-Sol Survival!</span>
            </button>
          </div>
        </div>
      )}

      {/* Exterior Station Modal */}
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
          maxDays={gameMode === 'survival' ? SURVIVAL_TARGET_SOLS : currentLevel.maxDays}
          lifeSupport={lifeSupport}
          food={food}
          crewHealth={crewHealth}
          science={science}
          solarDust={solarDust}
          isDustStorm={dustStormPhase === 'raging'}
          inShelter={inShelter || worldLocation === 'inside'}
          radiationMsv={effectiveRadiationMsv}
          radiationPct={radiationPct}
          medkits={medkits}
          totalPowerCells={totalPowerCells}
          powerAllocation={powerAllocation}
          onSetPower={handleSetPower}
          onStationAction={handleStationAction}
          onUseMedkit={handleUseMedkit}
          onEnterInterior={handleEnterInterior}
          onAdvanceDay={handleAdvanceDay}
          onClose={() => setActiveStationModal(null)}
        />
      )}

      {/* Interactive Solar Panel Scrubber Mini-Game */}
      {showSolarScrub && (
        <SolarScrubModal
          initialDust={solarDust}
          onCompleteClean={handleCompleteSolarScrub}
          onClose={() => setShowSolarScrub(false)}
        />
      )}

      {/* Interior Room Workdesk / Gym / Scanner / Greenhouse Modal */}
      {activeInteriorModal && (
        <InteriorZoneModal
          zoneId={activeInteriorModal}
          gameMode={gameMode}
          day={day}
          maxDays={gameMode === 'survival' ? SURVIVAL_TARGET_SOLS : currentLevel.maxDays}
          lifeSupport={lifeSupport}
          food={food}
          crewHealth={crewHealth}
          science={science}
          muscleBone={muscleBone}
          radiationMsv={effectiveRadiationMsv}
          radiationPct={radiationPct}
          medkits={medkits}
          bodyRadiationDose={bodyRadiationDose}
          lastScannedSol={lastScannedSol}
          commsRepair={commsRepair}
          earthContacted={earthContacted}
          cropPlots={cropPlots}
          scanningActive={scanningActive}
          greenhousePower={powerAllocation.greenhouse}
          freePowerCells={freePowerCells}
          isDustStorm={dustStormPhase === 'raging'}
          onFixComms={handleFixComms}
          onLabAnalyze={handleLabAnalyze}
          onExercise={handleExercise}
          onRunBodyScan={handleRunBodyScan}
          onPlantCrops={handlePlantCrops}
          onWaterCrops={handleWaterCrops}
          onHarvestCrops={handleHarvestCrops}
          onUseMedkit={handleUseMedkit}
          onCraftMedkit={handleCraftMedkit}
          onSetPower={handleSetPower}
          onAdvanceDay={handleAdvanceDay}
          onClose={() => setActiveInteriorModal(null)}
        />
      )}

      {/* Space Base Game Menu */}
      {showMenuModal && (
        <GameMenuModal
          gameMode={gameMode}
          unlockedSurvival={unlockedSurvival}
          currentLevelId={currentLevelId}
          unlockedLevel={unlockedLevel}
          completedLevels={completedLevels}
          site={site}
          activeAstronaut={activeAstronaut}
          muted={muted}
          voiceEnabled={voiceEnabled}
          onSelectLevel={(lvlId) => startLevel(lvlId, false)}
          onStartSurvival={() => startSurvivalMode(site)}
          onSelectSite={(nextSite) =>
            gameMode === 'survival'
              ? startSurvivalMode(nextSite)
              : startLevel(currentLevelId, false, nextSite)
          }
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
          gameMode={gameMode}
          failureReason={failureReason}
          level={currentLevel}
          hasNextLevel={currentLevel.id < GAME_LEVELS.length}
          unlockedNextLevel={unlockedNewLevel}
          unlockedSurvival={unlockedSurvival}
          day={day}
          crewHealth={crewHealth}
          lifeSupport={lifeSupport}
          food={food}
          science={science}
          muscleBone={muscleBone}
          onNextLevel={() => startLevel(Math.min(GAME_LEVELS.length, currentLevel.id + 1), false)}
          onStartSurvival={() => startSurvivalMode(site)}
          onReplayLevel={() =>
            gameMode === 'survival'
              ? startSurvivalMode(site)
              : startLevel(currentLevel.id, false)
          }
          onOpenMenu={() => {
            setMissionOutcome(null);
            setShowMenuModal(true);
          }}
        />
      )}
    </div>
  );
}
