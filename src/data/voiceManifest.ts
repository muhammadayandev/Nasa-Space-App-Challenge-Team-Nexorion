export interface VoiceClipSpec {
  id: string;
  file: string;
  speaker: string;
  voiceStyle: string;
  maxDurationSec: number;
  text: string;
  /** Optional match key used by cutscene subtitle keys (`${chapterId}:${at}:${speaker}`) */
  cutsceneKey?: string;
}

/**
 * Manifest for custom studio / AI-generated voiceovers placed in `public/audio/voiceovers/`.
 * If an `.mp3` matching `file` is present in `public/`, the sound engine plays it automatically;
 * otherwise it cleanly falls back to the improved Web Speech API voice.
 */
export const VOICE_CLIP_MANIFEST: VoiceClipSpec[] = [
  // Cutscene Chapter 1: Launch Complex Departure
  {
    id: 'earth_farewell_1',
    file: '/audio/voiceovers/earth_farewell_1.mp3',
    speaker: 'CDR. VANCE (Deep Male Commander Radio)',
    voiceStyle: 'Calm confident deep male NASA commander over clear cockpit radio',
    maxDurationSec: 4.5,
    text: 'Houston Flight, Ares Four crew is sealed green across all suits. Proceeding down Wing B gantry now.',
    cutsceneKey: 'earth_farewell:0.05:CDR. VANCE',
  },
  {
    id: 'earth_farewell_2',
    file: '/audio/voiceovers/earth_farewell_2.mp3',
    speaker: 'FLIGHT CONTROL (Authoritative Male Capcom)',
    voiceStyle: 'Crisp authoritative male flight director on NASA ground loop',
    maxDurationSec: 4.4,
    text: 'Copy Ares Four. Fuel cells topped, guidance aligned. Eight months to Mars—godspeed, crew.',
    cutsceneKey: 'earth_farewell:4.8:FLIGHT CONTROL',
  },

  // Cutscene Chapter 2: Boarding Ares IV
  {
    id: 'boarding_1',
    file: '/audio/voiceovers/boarding_1.mp3',
    speaker: 'DR. LIN (Female Science Officer)',
    voiceStyle: 'Focused calm female astronaut voice over cabin intercom',
    maxDurationSec: 3.3,
    text: 'Forward hatch locked. Cabin oxygen purge complete, holding one-oh-one point three kilopascals.',
    cutsceneKey: 'boarding:0.3:DR. LIN',
  },
  {
    id: 'boarding_2',
    file: '/audio/voiceovers/boarding_2.mp3',
    speaker: 'CDR. VANCE (Deep Male Commander Radio)',
    voiceStyle: 'Steady manly baritone astronaut voice on cockpit comms',
    maxDurationSec: 3.4,
    text: 'Pre-flight checklist complete. APU online, gimbal check good. Armed for terminal count.',
    cutsceneKey: 'boarding:3.8:CDR. VANCE',
  },

  // Cutscene Chapter 3: Booster Ignition & Launch Countdown
  {
    id: 'launch_1',
    file: '/audio/voiceovers/launch_1.mp3',
    speaker: 'CAPCOM (Deep Male Launch Director)',
    voiceStyle: 'Deep commanding NASA launch director, crisp pacing',
    maxDurationSec: 1.4,
    text: 'Ares Four, all stations go for launch.',
    cutsceneKey: 'launch:0.05:CAPCOM',
  },
  {
    id: 'countdown_5',
    file: '/audio/voiceovers/countdown_5.mp3',
    speaker: 'CAPCOM (Deep Male Launch Director)',
    voiceStyle: 'Deep clear NASA launch countdown cadence',
    maxDurationSec: 1.0,
    text: 'T-minus five.',
  },
  {
    id: 'countdown_4',
    file: '/audio/voiceovers/countdown_4.mp3',
    speaker: 'CAPCOM (Deep Male Launch Director)',
    voiceStyle: 'Deep clear NASA launch countdown cadence',
    maxDurationSec: 0.9,
    text: 'Four.',
  },
  {
    id: 'countdown_3',
    file: '/audio/voiceovers/countdown_3.mp3',
    speaker: 'CAPCOM (Deep Male Launch Director)',
    voiceStyle: 'Deep clear NASA launch countdown cadence',
    maxDurationSec: 0.9,
    text: 'Three.',
  },
  {
    id: 'countdown_2',
    file: '/audio/voiceovers/countdown_2.mp3',
    speaker: 'CAPCOM (Deep Male Launch Director)',
    voiceStyle: 'Deep clear NASA launch countdown cadence',
    maxDurationSec: 0.9,
    text: 'Two.',
  },
  {
    id: 'countdown_1',
    file: '/audio/voiceovers/countdown_1.mp3',
    speaker: 'CAPCOM (Deep Male Launch Director)',
    voiceStyle: 'Deep urgent NASA launch countdown cadence',
    maxDurationSec: 0.9,
    text: 'One.',
  },
  {
    id: 'launch_2',
    file: '/audio/voiceovers/launch_2.mp3',
    speaker: 'CDR. VANCE (Deep Male Commander Radio)',
    voiceStyle: 'Excited determined male commander fighting rocket vibration',
    maxDurationSec: 4.1,
    text: 'Ignition confirmed! Solid boosters lit—we have liftoff! Clearing the launch tower now.',
    cutsceneKey: 'launch:7.05:CDR. VANCE',
  },
  {
    id: 'launch_3',
    file: '/audio/voiceovers/launch_3.mp3',
    speaker: 'ENG. MORALES (Male Flight Engineer)',
    voiceStyle: 'Crisp young-adult male pilot/engineer over cockpit radio',
    maxDurationSec: 4.4,
    text: 'Passing Max-Q. Booster separation clean—leaving Earth gravity well.',
    cutsceneKey: 'launch:11.4:ENG. MORALES',
  },

  // Cutscene Chapter 4: Transit
  {
    id: 'transit_1',
    file: '/audio/voiceovers/transit_1.mp3',
    speaker: 'SHIP LOG (Warm Narrator)',
    voiceStyle: 'Warm documentary-style male mission narrator',
    maxDurationSec: 3.4,
    text: 'Trans-Mars Injection complete. Crew settled in cruise cabin—Earth receding astern.',
    cutsceneKey: 'transit_8_months:0.4:SHIP LOG',
  },
  {
    id: 'transit_2',
    file: '/audio/voiceovers/transit_2.mp3',
    speaker: 'NAV COMPUTER (Clean Suit AI)',
    voiceStyle: 'Polished calm digital cockpit assistant (friendly, not harsh)',
    maxDurationSec: 3.6,
    text: 'Entering deep-space coast. Advancing mission clock across eight months in transit.',
    cutsceneKey: 'transit_8_months:4.2:NAV COMPUTER',
  },
  {
    id: 'transit_3',
    file: '/audio/voiceovers/transit_3.mp3',
    speaker: 'DR. LIN (Female Science Officer)',
    voiceStyle: 'Inspired hopeful female scientist voice',
    maxDurationSec: 3.6,
    text: 'Month eight—Mars fills the forward viewport. Preparing retro-burn for entry.',
    cutsceneKey: 'transit_8_months:8.1:DR. LIN',
  },

  // Cutscene Chapter 5 & 6: Mars Descent & Timelapse
  {
    id: 'landing_1',
    file: '/audio/voiceovers/landing_1.mp3',
    speaker: 'ENG. MORALES (Male Flight Engineer)',
    voiceStyle: 'Focused male flight engineer calling altitude telemetry',
    maxDurationSec: 4.5,
    text: 'Entry interface complete. Retro-thrusters firing—vertical velocity dropping smoothly.',
    cutsceneKey: 'mars_landing:0.5:ENG. MORALES',
  },
  {
    id: 'landing_2',
    file: '/audio/voiceovers/landing_2.mp3',
    speaker: 'CDR. VANCE (Deep Male Commander Radio)',
    voiceStyle: 'Relieved commanding male voice on surface comms',
    maxDurationSec: 4.8,
    text: 'Landing struts locked. Touchdown confirmed near the Ares Two legacy domes.',
    cutsceneKey: 'mars_landing:5.3:CDR. VANCE',
  },
  {
    id: 'arrival_1',
    file: '/audio/voiceovers/arrival_1.mp3',
    speaker: 'DR. LIN (Female Science Officer)',
    voiceStyle: 'Awed warm female explorer over helmet radio',
    maxDurationSec: 4.6,
    text: 'First bootprint on Mars—three expeditions came before us, and their habs still stand.',
    cutsceneKey: 'mars_arrival_timelapse:0.5:DR. LIN',
  },
  {
    id: 'arrival_2',
    file: '/audio/voiceovers/arrival_2.mp3',
    speaker: 'MISSION LOG (Warm Narrator)',
    voiceStyle: 'Calm storytelling narrator voice',
    maxDurationSec: 5.4,
    text: 'Eighteen sols of core sampling and outpost calibration across the Jezero ridge.',
    cutsceneKey: 'mars_arrival_timelapse:5.6:MISSION LOG',
  },

  // Cutscene Chapter 7 & 8: Dust Cyclone & Awakening
  {
    id: 'storm_1',
    file: '/audio/voiceovers/storm_1.mp3',
    speaker: 'FIELD LOG (Warm Narrator)',
    voiceStyle: 'Calm field log voice before sudden storm',
    maxDurationSec: 3.1,
    text: 'Sol 19 routine core survey along North Ridge. Atmospheric readings calm—MAV waits 75 meters downrange.',
    cutsceneKey: 'storm_evacuation:2.4:FIELD LOG',
  },
  {
    id: 'storm_2',
    file: '/audio/voiceovers/storm_2.mp3',
    speaker: 'WEATHER ALERT (Urgent Female Warning)',
    voiceStyle: 'Urgent tense radio warning officer',
    maxDurationSec: 3.1,
    text: 'RED ALERT: Category-5 dust cyclone incoming! Immediate MAV evacuation—all crew to the ship NOW!',
    cutsceneKey: 'storm_evacuation:5.8:WEATHER ALERT',
  },
  {
    id: 'storm_3',
    file: '/audio/voiceovers/storm_3.mp3',
    speaker: 'CDR. VANCE (Urgent Male Radio)',
    voiceStyle: 'Desperate urgent male commander shouting over heavy wind radio',
    maxDurationSec: 2.6,
    text: 'Crew is at the airlock—where are you?! Wind shear is critical, run for the lander!',
    cutsceneKey: 'storm_evacuation:9.1:CDR. VANCE',
  },
  {
    id: 'storm_4',
    file: '/audio/voiceovers/storm_4.mp3',
    speaker: 'SUIT COMMS (AI Alert)',
    voiceStyle: 'Tense static-clipped telemetry voice',
    maxDurationSec: 3.0,
    text: 'COMMS SEVERED — Signal dead. Teammates unable to reach you—MAV forced to launch without you.',
    cutsceneKey: 'storm_evacuation:11.9:SUIT COMMS',
  },
  {
    id: 'storm_5',
    file: '/audio/voiceovers/storm_5.mp3',
    speaker: 'SUIT DIAGNOSTIC (AI Alert)',
    voiceStyle: 'Urgent suit diagnostic voice winding down into static',
    maxDurationSec: 3.1,
    text: 'Cyclone impact! Visor breached. Beacon lost in storm—crew forced to leave you behind, presumed dead.',
    cutsceneKey: 'storm_evacuation:15.1:SUIT DIAGNOSTIC',
  },
  {
    id: 'awakening_1',
    file: '/audio/voiceovers/awakening_1.mp3',
    speaker: 'SUIT AI (Calm Rebooting Assistant)',
    voiceStyle: 'Soft rebooting suit computer waking astronaut up on Mars',
    maxDurationSec: 4.0,
    text: 'Rebooting life support... Sol 23. Four sols elapsed since storm impact. Crew beacon: none.',
    cutsceneKey: 'awakening:0.6:SUIT AI',
  },
  {
    id: 'awakening_2',
    file: '/audio/voiceovers/awakening_2.mp3',
    speaker: 'OBJECTIVE (Deep Male Narrator)',
    voiceStyle: 'Determined inspiring cinematic voice',
    maxDurationSec: 4.0,
    text: 'They think you are dead. Gather supplies and reach the legacy Ares Two Station to survive.',
    cutsceneKey: 'awakening:4.8:OBJECTIVE',
  },

  // Open-World & Gameplay Alerts
  {
    id: 'game_dust_storm',
    file: '/audio/voiceovers/game_dust_storm.mp3',
    speaker: 'SUIT RADIO (Urgent Male Warning)',
    voiceStyle: 'Urgent clear suit alert voice',
    maxDurationSec: 2.5,
    text: 'Mars dust storm incoming! Get inside the Space Station right now!',
  },
  {
    id: 'game_storm_clear',
    file: '/audio/voiceovers/game_storm_clear.mp3',
    speaker: 'SUIT RADIO (Calm Assistant)',
    voiceStyle: 'Clear helpful crew alert voice',
    maxDurationSec: 2.6,
    text: 'Storm passed! Solar Farm is dusty—clean panels to restore full power.',
  },
  {
    id: 'game_survival_start',
    file: '/audio/voiceovers/game_survival_start.mp3',
    speaker: 'COMMANDER LOG (Deep Male Voice)',
    voiceStyle: 'Heroic determined astronaut briefing tone',
    maxDurationSec: 4.8,
    text: 'Earth thinks we are gone, and the first storm broke our antenna. Survive 150 days, fix comms in the lab, and hold on for rescue!',
  },
  {
    id: 'game_comms_fixed',
    file: '/audio/voiceovers/game_comms_fixed.mp3',
    speaker: 'CAPCOM (Jubilant Male Radio)',
    voiceStyle: 'Relieved excited NASA Capcom hearing our signal at last',
    maxDurationSec: 4.5,
    text: 'Ares Four, we copy you! You are alive! Hang tight—Earth Rescue launches to reach you on Day 150!',
  },
  {
    id: 'game_rescue_arrived',
    file: '/audio/voiceovers/game_rescue_arrived.mp3',
    speaker: 'CAPCOM (Warm Heroic Radio)',
    voiceStyle: 'Celebratory Mission Control touchdown message',
    maxDurationSec: 4.5,
    text: 'Rescue ship touching down at Ares Station! Amazing work, astronaut—you survived all 150 days on Mars!',
  },
];

export const VOICE_CLIP_BY_CUTSCENE_KEY = new Map<string, VoiceClipSpec>(
  VOICE_CLIP_MANIFEST.filter((c) => c.cutsceneKey).map((c) => [c.cutsceneKey!, c])
);
