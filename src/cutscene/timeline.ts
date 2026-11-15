export type GamePhase = 'title' | 'cutscene' | 'survival' | 'paused' | 'complete';

export type ChapterId =
  | 'earth_farewell'
  | 'boarding'
  | 'launch'
  | 'transit_8_months'
  | 'mars_landing'
  | 'mars_arrival_timelapse'
  | 'storm_evacuation'
  | 'awakening';

export interface SubtitleBeat {
  /** Offset in seconds from the start of the chapter */
  at: number;
  /** Duration in seconds */
  duration: number;
  speaker: string;
  text: string;
  tone?: 'normal' | 'alert' | 'critical';
}

export interface ChapterSpec {
  id: ChapterId;
  index: number;
  title: string;
  location: string;
  duration: number;
  subtitles: SubtitleBeat[];
}

export const CUTSCENE_CHAPTERS: ChapterSpec[] = [
  {
    id: 'earth_farewell',
    index: 1,
    title: 'Launch Complex Departure',
    location: 'Kennedy Orbital Complex · Launch Wing B',
    duration: 9.5,
    subtitles: [
      {
        at: 0.3,
        duration: 4.1,
        speaker: 'CDR. VANCE',
        text: 'Ares Four crew, suit pressure nominal, green across all seals. Proceeding down Wing B gantry.',
      },
      {
        at: 4.9,
        duration: 4.2,
        speaker: 'FLIGHT CONTROL',
        text: 'Launch Control copies. Fuel cells topped, guidance aligned. Eight months to Mars—godspeed, Ares Four.',
      },
    ],
  },
  {
    id: 'boarding',
    index: 2,
    title: 'Boarding Ares IV',
    location: 'Crew Access Arm · Forward Airlock',
    duration: 7.5,
    subtitles: [
      {
        at: 0.3,
        duration: 3.3,
        speaker: 'DR. LIN',
        text: 'Forward hatch locked. Cabin oxygen purge complete, holding one-oh-one point three kilopascals.',
      },
      {
        at: 3.8,
        duration: 3.4,
        speaker: 'CDR. VANCE',
        text: 'Pre-flight checklist complete. APU online, gimbal check good. Armed for terminal count.',
      },
    ],
  },
  {
    id: 'launch',
    index: 3,
    title: 'Booster Ignition & Liftoff',
    location: 'Launch Pad 39C · Earth Ascent',
    duration: 14.5,
    subtitles: [
      {
        at: 0.15,
        duration: 5.1,
        speaker: 'CAPCOM',
        text: 'All stations go for launch. Terminal count... Five... Four... Three... Two... One... Main engine start!',
      },
      {
        at: 5.4,
        duration: 4.1,
        speaker: 'CDR. VANCE',
        text: 'Ignition confirmed! Solid boosters lit—we have liftoff! Clearing the launch tower now.',
      },
      {
        at: 9.8,
        duration: 4.4,
        speaker: 'ENG. MORALES',
        text: 'Passing Max-Q. Booster separation clean—leaving Earth gravity well.',
      },
    ],
  },
  {
    id: 'transit_8_months',
    index: 4,
    title: 'Interplanetary Transit',
    location: 'Heliocentric Transfer Orbit · 225M km',
    duration: 12.0,
    subtitles: [
      {
        at: 0.4,
        duration: 3.4,
        speaker: 'SHIP LOG',
        text: 'Trans-Mars Injection complete. Crew settled in cruise cabin—Earth receding astern.',
      },
      {
        at: 4.2,
        duration: 3.6,
        speaker: 'NAV COMPUTER',
        text: 'Entering deep-space coast. Advancing mission clock across eight months in transit.',
      },
      {
        at: 8.1,
        duration: 3.6,
        speaker: 'DR. LIN',
        text: 'Month eight—Mars fills the forward viewport. Preparing retro-burn for entry.',
      },
    ],
  },
  {
    id: 'mars_landing',
    index: 5,
    title: 'Martian Descent',
    location: 'Jezero Outpost Sector · Mars',
    duration: 10.5,
    subtitles: [
      {
        at: 0.5,
        duration: 4.5,
        speaker: 'ENG. MORALES',
        text: 'Entry interface complete. Retro-thrusters firing—vertical velocity dropping smoothly.',
      },
      {
        at: 5.3,
        duration: 4.8,
        speaker: 'CDR. VANCE',
        text: 'Landing struts locked. Touchdown confirmed near the Ares II legacy domes.',
      },
    ],
  },
  {
    id: 'mars_arrival_timelapse',
    index: 6,
    title: 'Surface Operations & Sol Timelapse',
    location: 'Ares IV Surface Camp · Sol 01–18',
    duration: 11.5,
    subtitles: [
      {
        at: 0.5,
        duration: 4.6,
        speaker: 'DR. LIN',
        text: 'First bootprint on Mars—three expeditions came before us, and their habs still stand.',
      },
      {
        at: 5.6,
        duration: 5.4,
        speaker: 'MISSION LOG',
        text: 'Eighteen sols of core sampling and outpost calibration across the Jezero ridge.',
      },
    ],
  },
  {
    id: 'storm_evacuation',
    index: 7,
    title: 'Sol 19 · Dust Cyclone',
    location: 'North Core Ridge · 75m from MAV',
    duration: 18.5,
    subtitles: [
      {
        at: 2.4,
        duration: 3.1,
        speaker: 'FIELD LOG',
        text: 'Sol 19 routine core survey along North Ridge. Atmospheric readings calm—MAV waits 75 meters downrange.',
      },
      {
        at: 5.8,
        duration: 3.1,
        speaker: 'WEATHER ALERT',
        text: 'RED ALERT: Category-5 dust cyclone incoming! Immediate MAV evacuation—all crew to the ship NOW!',
        tone: 'critical',
      },
      {
        at: 9.1,
        duration: 2.6,
        speaker: 'CDR. VANCE',
        text: 'Crew is at the airlock—where are you?! Wind shear is critical, run for the lander!',
        tone: 'alert',
      },
      {
        at: 11.9,
        duration: 3.0,
        speaker: 'SUIT COMMS',
        text: 'COMMS SEVERED — Signal dead. Teammates unable to reach you—MAV forced to launch without you.',
        tone: 'critical',
      },
      {
        at: 15.1,
        duration: 3.1,
        speaker: 'SUIT DIAGNOSTIC',
        text: 'Cyclone impact! Visor breached. Beacon lost in storm—crew forced to leave you behind, presumed dead.',
        tone: 'critical',
      },
    ],
  },
  {
    id: 'awakening',
    index: 8,
    title: 'Awakening Alone',
    location: 'Jezero Valley · Sol 23',
    duration: 9.0,
    subtitles: [
      {
        at: 0.6,
        duration: 4.0,
        speaker: 'SUIT AI',
        text: 'Rebooting life support... Sol 23. Four sols elapsed since storm impact. Crew beacon: none.',
        tone: 'alert',
      },
      {
        at: 4.8,
        duration: 4.0,
        speaker: 'OBJECTIVE',
        text: 'They think you are dead. Gather supplies and reach the legacy Ares II Hab to survive.',
      },
    ],
  },
];

export const TOTAL_CUTSCENE_DURATION = CUTSCENE_CHAPTERS.reduce(
  (acc, ch) => acc + ch.duration,
  0
);

export interface ChapterLookup {
  chapter: ChapterSpec;
  chapterStartTime: number;
  localTime: number;
  localProgress: number;
  totalProgress: number;
  activeSubtitle: SubtitleBeat | null;
}

export function getChapterStartTime(id: ChapterId): number {
  let t = 0;
  for (const ch of CUTSCENE_CHAPTERS) {
    if (ch.id === id) return t;
    t += ch.duration;
  }
  return 0;
}

export function resolveCutsceneState(elapsedSeconds: number): ChapterLookup {
  const clamped = Math.max(0, Math.min(elapsedSeconds, TOTAL_CUTSCENE_DURATION));
  let acc = 0;
  for (let i = 0; i < CUTSCENE_CHAPTERS.length; i++) {
    const ch = CUTSCENE_CHAPTERS[i];
    const end = acc + ch.duration;
    if (clamped < end || i === CUTSCENE_CHAPTERS.length - 1) {
      const localTime = Math.max(0, Math.min(ch.duration, clamped - acc));
      const localProgress = ch.duration > 0 ? localTime / ch.duration : 1;
      const totalProgress =
        TOTAL_CUTSCENE_DURATION > 0 ? clamped / TOTAL_CUTSCENE_DURATION : 1;

      let activeSubtitle: SubtitleBeat | null = null;
      for (const sub of ch.subtitles) {
        if (localTime >= sub.at && localTime <= sub.at + sub.duration) {
          activeSubtitle = sub;
          break;
        }
      }

      return {
        chapter: ch,
        chapterStartTime: acc,
        localTime,
        localProgress,
        totalProgress,
        activeSubtitle,
      };
    }
    acc = end;
  }

  const last = CUTSCENE_CHAPTERS[CUTSCENE_CHAPTERS.length - 1];
  return {
    chapter: last,
    chapterStartTime: TOTAL_CUTSCENE_DURATION - last.duration,
    localTime: last.duration,
    localProgress: 1,
    totalProgress: 1,
    activeSubtitle: null,
  };
}

/**
 * Returns countdown integer (5..1) during Launch phase before liftoff, or 0 once ignited.
 * Liftoff happens at localTime = 5.4s in the 'launch' chapter.
 */
export function getLaunchCountdownValue(launchLocalTime: number): {
  count: number;
  ignited: boolean;
  altitudeKm: number;
  velocityKms: number;
} {
  const ignitionTime = 5.4;
  if (launchLocalTime < 0.4) {
    return { count: 5, ignited: false, altitudeKm: 0, velocityKms: 0 };
  }
  if (launchLocalTime < ignitionTime) {
    const remaining = ignitionTime - launchLocalTime;
    const count = Math.max(1, Math.min(5, Math.ceil(remaining)));
    return { count, ignited: false, altitudeKm: 0, velocityKms: 0 };
  }
  const flightTime = launchLocalTime - ignitionTime;
  const norm = Math.min(1, flightTime / 9.1);
  const altitudeKm = Math.round(Math.pow(norm, 2.2) * 210);
  const velocityKms = Number((Math.pow(norm, 1.5) * 7.8).toFixed(1));
  return { count: 0, ignited: true, altitudeKm, velocityKms };
}

/**
 * Computes 8-month transit timelapse figures for Chapter 4.
 * First ~36% of the chapter zooms out from the cabin window until the ship is a speck of light;
 * the remaining ~64% accelerates the 8-month clock as the speck approaches Mars.
 */
export function getTransitProgress(localProgress: number): {
  monthsElapsed: number;
  daysElapsed: number;
  distanceMillionKm: number;
  progressPercent: number;
} {
  const p = Math.max(0, Math.min(1, localProgress));
  const timelineNorm = Math.max(0, Math.min(1, (p - 0.34) / 0.66));
  const eased =
    timelineNorm < 0.5
      ? 2 * timelineNorm * timelineNorm
      : 1 - Math.pow(-2 * timelineNorm + 2, 2) / 2;
  const monthsElapsed = Number((eased * 8).toFixed(1));
  const daysElapsed = Math.round(eased * 240);
  const distanceMillionKm = Math.round(eased * 225);
  const progressPercent = Math.round(eased * 100);
  return { monthsElapsed, daysElapsed, distanceMillionKm, progressPercent };
}

export interface SurvivalObjective {
  id: 'crate' | 'pad' | 'hab';
  label: string;
  x: number;
  z: number;
  radius: number;
  completed: boolean;
}

export function createInitialObjectives(): SurvivalObjective[] {
  return [
    {
      id: 'crate',
      label: 'Recover Emergency Supply Crate',
      x: 12,
      z: -16,
      radius: 4.5,
      completed: false,
    },
    {
      id: 'pad',
      label: 'Inspect MAV Launch Pad Telemetry',
      x: 0,
      z: -36,
      radius: 6.0,
      completed: false,
    },
    {
      id: 'hab',
      label: 'Enter Legacy Ares II Hab Airlock',
      x: -26,
      z: -52,
      radius: 5.5,
      completed: false,
    },
  ];
}

export function evaluateObjectivesAtPosition(
  objectives: SurvivalObjective[],
  playerX: number,
  playerZ: number
): { updated: SurvivalObjective[]; newlyCompleted: SurvivalObjective[]; allDone: boolean } {
  const newlyCompleted: SurvivalObjective[] = [];
  const updated = objectives.map((obj) => {
    if (obj.completed) return obj;
    const dx = playerX - obj.x;
    const dz = playerZ - obj.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= obj.radius * obj.radius) {
      const done = { ...obj, completed: true };
      newlyCompleted.push(done);
      return done;
    }
    return obj;
  });

  const habObj = updated.find((o) => o.id === 'hab');
  const allDone = Boolean(habObj?.completed);
  return { updated, newlyCompleted, allDone };
}
