export type OutpostSiteId = 'moon' | 'mars';

export type ModuleId =
  | 'overview'
  | 'crew'
  | 'habitat'
  | 'solar'
  | 'greenhouse'
  | 'lifesupport'
  | 'comms'
  | 'science';

export type PowerSystemKey = 'lifesupport' | 'greenhouse' | 'shield' | 'science';

export interface StationPoint {
  id: Exclude<ModuleId, 'overview'>;
  shortName: string;
  x: number;
  z: number;
  interactRadius: number;
  collisionRadius: number;
  promptAction: string;
}

export const STATION_POINTS: StationPoint[] = [
  {
    id: 'habitat',
    shortName: 'Shield',
    x: 0,
    z: 0,
    interactRadius: 5.4,
    collisionRadius: 3.6,
    promptAction: 'Boost Shield & Sleep',
  },
  {
    id: 'greenhouse',
    shortName: 'Farm',
    x: 7.2,
    z: 0,
    interactRadius: 4.5,
    collisionRadius: 2.7,
    promptAction: 'Grow & Harvest Food',
  },
  {
    id: 'solar',
    shortName: 'Solar',
    x: -7.6,
    z: -3.2,
    interactRadius: 4.8,
    collisionRadius: 2.6,
    promptAction: 'Clean Dust for Power',
  },
  {
    id: 'lifesupport',
    shortName: 'Air',
    x: -4.2,
    z: 5.8,
    interactRadius: 4.4,
    collisionRadius: 2.4,
    promptAction: 'Make Clean Air & Water',
  },
  {
    id: 'comms',
    shortName: 'Radio',
    x: 3.2,
    z: -6.8,
    interactRadius: 3.8,
    collisionRadius: 1.7,
    promptAction: 'Send Message to Earth',
  },
  {
    id: 'science',
    shortName: 'Rover',
    x: 4.8,
    z: 6.2,
    interactRadius: 4.2,
    collisionRadius: 1.8,
    promptAction: 'Drive Rover & Collect Science',
  },
];

export interface SiteConfig {
  id: OutpostSiteId;
  name: string;
  subtitle: string;
  missionLabel: string;
  dayUnit: string;
  gravityG: number;
  commDelayText: string;
  baseRadiationMsv: number;
  maxSolarCells: number;
  nasaReference: string;
  environmentFact: string;
}

export const SITE_CONFIGS: Record<OutpostSiteId, SiteConfig> = {
  mars: {
    id: 'mars',
    name: 'Mars Base',
    subtitle: 'Red Planet',
    missionLabel: 'Mars Explorer',
    dayUnit: 'Day',
    gravityG: 0.38,
    commDelayText: '12 min radio delay',
    baseRadiationMsv: 0.67,
    maxSolarCells: 8,
    nasaReference: 'NASA Mars Trek & Curiosity RAD',
    environmentFact:
      'Mars is cold and dusty. Radio messages take 12 minutes to reach Earth!',
  },
  moon: {
    id: 'moon',
    name: 'Moon Base',
    subtitle: 'Lunar South Pole',
    missionLabel: 'Moon Explorer',
    dayUnit: 'Day',
    gravityG: 0.165,
    commDelayText: '1.3 sec radio delay',
    baseRadiationMsv: 1.37,
    maxSolarCells: 8,
    nasaReference: 'NASA Artemis & LRO CRaTER',
    environmentFact:
      'The Moon has no air at all. Astronauts need strong shields and clean air tanks!',
  },
};

export interface ModuleSpec {
  id: Exclude<ModuleId, 'overview'>;
  name: string;
  shortName: string;
  role: string;
  plainExplanation: string;
  tradeOffTip: string;
  powerKey?: PowerSystemKey;
}

export const MODULE_SPECS: Record<Exclude<ModuleId, 'overview'>, ModuleSpec> = {
  crew: {
    id: 'crew',
    name: 'Crew & Health Pod',
    shortName: 'Crew',
    role: 'Switch Astronauts & Check Health',
    plainExplanation: 'Pick who walks outside and give the crew rest or a quick checkup.',
    tradeOffTip: 'Healthy meals and rest keep Energy and Health strong.',
  },
  habitat: {
    id: 'habitat',
    name: 'Main Dome & Shield',
    shortName: 'Shield',
    role: 'Radiation Shield & Sleep',
    plainExplanation: 'Protects astronauts from Sun rays and lets you start the next day.',
    tradeOffTip: 'More Shield power keeps you safe, but leaves less power for Science.',
    powerKey: 'shield',
  },
  solar: {
    id: 'solar',
    name: 'Solar Panels',
    shortName: 'Solar',
    role: 'Makes Base Electricity',
    plainExplanation: 'Sunlight hits these panels to charge batteries for your whole base.',
    tradeOffTip: 'Cleaning dust gives +1 Power tomorrow, at a small Air & Health cost.',
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Space Garden',
    shortName: 'Farm',
    role: 'Grows Fresh Food',
    plainExplanation: 'Purple LED lights help plants grow without soil!',
    tradeOffTip: 'Growing food feeds the crew and makes oxygen, but uses Water and Power.',
    powerKey: 'greenhouse',
  },
  lifesupport: {
    id: 'lifesupport',
    name: 'Air & Water Machine',
    shortName: 'Air',
    role: 'Recycles Breathable Air & Water',
    plainExplanation: 'Cleans stale air and recycles 98% of water just like the Space Station!',
    tradeOffTip: 'Keep Air at 2+ Power so oxygen never runs low.',
    powerKey: 'lifesupport',
  },
  comms: {
    id: 'comms',
    name: 'Earth Radio Dish',
    shortName: 'Radio',
    role: 'Calls Mission Control',
    plainExplanation: 'Sends science news back to NASA scientists on Earth.',
    tradeOffTip: 'Sending big data earns Science Points, but uses extra cooling water.',
    powerKey: 'science',
  },
  science: {
    id: 'science',
    name: 'Mars Rover',
    shortName: 'Rover',
    role: 'Drills Rocks & Finds Ice',
    plainExplanation: 'A 6-wheeled robot that searches craters for water ice and cool rocks.',
    tradeOffTip: 'Rover digs earn Science Points, but take extra Power and Air.',
    powerKey: 'science',
  },
};

export interface GameLevelSpec {
  id: number;
  title: string;
  emoji: string;
  site: OutpostSiteId;
  maxDays: number;
  goalText: string;
  lessonTitle: string;
  lessonText: string;
  tradeOffText: string;
  initialAir: number;
  initialFood: number;
  initialHealth: number;
  initialDust: number;
  initialPower: Record<PowerSystemKey, number>;
  stormDay: number | null;
  dustDay: number | null;
  requiredActionId?: string;
  requiredMinAir?: number;
  requiredMinFood?: number;
  requiredMaxDust?: number;
  requiredMinShield?: number;
  requiredSamples?: number;
  requiredScience?: number;
}

export const GAME_LEVELS: GameLevelSpec[] = [
  {
    id: 1,
    title: 'First Breath',
    emoji: '🫧',
    site: 'mars',
    maxDays: 2,
    goalText: 'Keep Air 75%+ & finish Day 2',
    lessonTitle: 'Lesson 1: Why Air Needs Power',
    lessonText:
      'Mars has almost no breathable air. Your Air Machine needs electricity every day!',
    tradeOffText: 'Tip: Visit the Air station or keep Air Power at 2 or 3.',
    initialAir: 76,
    initialFood: 85,
    initialHealth: 92,
    initialDust: 10,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 2, science: 2 },
    stormDay: null,
    dustDay: null,
    requiredMinAir: 75,
  },
  {
    id: 2,
    title: 'Space Garden',
    emoji: '🌱',
    site: 'mars',
    maxDays: 2,
    goalText: 'Harvest Farm once & finish Day 2',
    lessonTitle: 'Lesson 2: Growing Food in Space',
    lessonText:
      'Rockets are small, so astronauts grow fresh veggies using LED lights and recycled water!',
    tradeOffText: 'Tip: Walk to Farm, harvest crops (+Food), and watch your Water level.',
    initialAir: 85,
    initialFood: 66,
    initialHealth: 90,
    initialDust: 15,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 2, science: 2 },
    stormDay: null,
    dustDay: null,
    requiredActionId: 'harvest-greens',
    requiredMinFood: 70,
  },
  {
    id: 3,
    title: 'Dusty Panels',
    emoji: '☀️',
    site: 'mars',
    maxDays: 2,
    goalText: 'Clean Solar Panels & finish Day 2',
    lessonTitle: 'Lesson 3: Dust Cuts Power',
    lessonText:
      'Red dust covers solar panels on Mars. Less sunlight means less power for the base!',
    tradeOffText: 'Tip: Walk to Solar and brush off dust to earn +1 Power tomorrow.',
    initialAir: 84,
    initialFood: 82,
    initialHealth: 88,
    initialDust: 70,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 1, science: 1 },
    stormDay: null,
    dustDay: 1,
    requiredMaxDust: 15,
  },
  {
    id: 4,
    title: 'Solar Storm!',
    emoji: '🛡️',
    site: 'mars',
    maxDays: 2,
    goalText: 'Raise Shield to 2+ & survive storm',
    lessonTitle: 'Lesson 4: Space Weather & Radiation',
    lessonText:
      'The Sun shoots invisible rays during solar flares. Water walls and shields keep crews safe!',
    tradeOffText: 'Tip: Raise Shield Power in Habitat (or fill Water Shield) before Day 2 ends.',
    initialAir: 86,
    initialFood: 82,
    initialHealth: 90,
    initialDust: 20,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 1, science: 2 },
    stormDay: 2,
    dustDay: null,
    requiredMinShield: 2,
  },
  {
    id: 5,
    title: 'Master Commander',
    emoji: '🚀',
    site: 'mars',
    maxDays: 3,
    goalText: 'Find 2 Crystals & earn 4 Science',
    lessonTitle: 'Lesson 5: Real Mission Trade-Offs',
    lessonText:
      'Great commanders balance Air, Food, Shield, and Science all at once without running dry!',
    tradeOffText: 'Tip: Collect glowing crystals outside and use Rover or Radio!',
    initialAir: 84,
    initialFood: 80,
    initialHealth: 92,
    initialDust: 20,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 2, science: 2 },
    stormDay: 3,
    dustDay: 2,
    requiredSamples: 2,
    requiredScience: 4,
  },
];

export interface DilemmaChoice {
  id: string;
  label: string;
  gainText: string;
  costText: string;
  effects: {
    lifeSupport?: number;
    food?: number;
    crewHealth?: number;
    science?: number;
    nextDayPowerMod?: number;
    shieldBonus?: number;
  };
  lessonFeedback: string;
}

export interface MissionDilemma {
  id: string;
  title: string;
  category: 'Solar Storm' | 'Comms Delay' | 'Astronaut Health' | 'Weather & Power';
  siteFilter?: OutpostSiteId;
  story: string;
  nasaScienceNote: string;
  choices: [DilemmaChoice, DilemmaChoice];
}

export const MISSION_DILEMMAS: MissionDilemma[] = [
  {
    id: 'solar-flare-storm',
    title: 'Solar Flare Alert!',
    category: 'Solar Storm',
    story: 'NASA satellites spotted a big Sun flare heading your way!',
    nasaScienceNote: 'Water walls and storm shields block harmful solar rays.',
    choices: [
      {
        id: 'pump-water-wall',
        label: 'Fill Water Shield Wall',
        gainText: 'Strong Radiation Protection today',
        costText: '-8% Air & Water',
        effects: { lifeSupport: -8, crewHealth: 6, shieldBonus: 30 },
        lessonFeedback: 'Smart! Water walls blocked the storm rays.',
      },
      {
        id: 'keep-water-work',
        label: 'Save Water & Keep Working',
        gainText: '+1 Science Point',
        costText: '-10% Health from rays',
        effects: { crewHealth: -10, science: 1 },
        lessonFeedback: 'You got Science data, but the rays tired the crew.',
      },
    ],
  },
  {
    id: 'dusty-solar-array',
    title: 'Dust on Solar Panels',
    category: 'Weather & Power',
    story: 'Dust lowered today’s solar battery power!',
    nasaScienceNote: 'Dust blocks sunlight on Mars solar arrays.',
    choices: [
      {
        id: 'eva-brush-clean',
        label: 'Brush Panels Clean',
        gainText: '+1 Power Cell tomorrow',
        costText: '-7% Air · -5% Health',
        effects: { lifeSupport: -7, crewHealth: -5, nextDayPowerMod: 1 },
        lessonFeedback: 'Clean panels make extra power for tomorrow!',
      },
      {
        id: 'stay-indoors-save',
        label: 'Rest Indoors Today',
        gainText: '+5% Crew Health',
        costText: '-1 Power Cell tomorrow',
        effects: { crewHealth: 5, nextDayPowerMod: -1 },
        lessonFeedback: 'Crew stayed safe, with a bit less power tomorrow.',
      },
    ],
  },
  {
    id: 'earth-radio-delay',
    title: '12-Minute Radio Wait',
    category: 'Comms Delay',
    story: 'A heater beeped! Waiting for Earth’s reply takes 24 minutes.',
    nasaScienceNote: 'Mars is so far away that radio waves take minutes to travel.',
    choices: [
      {
        id: 'switch-backup-heat',
        label: 'Turn On Backup Now',
        gainText: '+6% Health & Safe Air',
        costText: '-6% Food energy',
        effects: { crewHealth: 6, food: -6 },
        lessonFeedback: 'Fast thinking! Astronauts must solve urgent problems fast.',
      },
      {
        id: 'wait-mission-control',
        label: 'Wait for Earth Reply',
        gainText: '+1 Science Log',
        costText: '-8% Air & Water',
        effects: { science: 1, lifeSupport: -8 },
        lessonFeedback: 'Earth helped, though waiting cost a bit of cabin air.',
      },
    ],
  },
];

export type AstronautId = 'maya' | 'leo' | 'zara';

export interface AstronautProfile {
  id: AstronautId;
  name: string;
  role: string;
  suitColorHex: number;
  suitColorCss: string;
  emoji: string;
  perkSummary: string;
}

export const ASTRONAUT_PROFILES: Record<AstronautId, AstronautProfile> = {
  maya: {
    id: 'maya',
    name: 'Maya',
    role: 'Air & Shield Helper',
    suitColorHex: 0xea580c,
    suitColorCss: '#f97316',
    emoji: '👩‍🚀',
    perkSummary: 'Gives +5% extra Air',
  },
  leo: {
    id: 'leo',
    name: 'Leo',
    role: 'Space Farmer',
    suitColorHex: 0x22c55e,
    suitColorCss: '#22c55e',
    emoji: '🧑‍🌾',
    perkSummary: 'Grows +5% extra Food',
  },
  zara: {
    id: 'zara',
    name: 'Zara',
    role: 'Solar & Rover Pro',
    suitColorHex: 0x0ea5e9,
    suitColorCss: '#38bdf8',
    emoji: '👷‍♀️',
    perkSummary: 'Saves Air on walks',
  },
};

export interface IntroPopupItem {
  id: string;
  stageIndex: number;
  minTimeSec: number;
  maxTimeSec: number;
  badge: string;
  emoji: string;
  headline: string;
  kidExplanation: string;
  tradeOffPreview: string;
  nasaSource: string;
  accentHex: string;
}

export const INTRO_LAUNCH_POPUPS: IntroPopupItem[] = [
  {
    id: 'liftoff',
    stageIndex: 0,
    minTimeSec: 0,
    maxTimeSec: 4.5,
    badge: 'PART 1 · BLAST OFF!',
    emoji: '🚀',
    headline: '3, 2, 1... Bye Earth!',
    kidExplanation: 'Hold on tight! Our rocket is blasting off straight for Mars!',
    tradeOffPreview: 'We can only pack what fits inside the ship.',
    nasaSource: 'Earth Launch',
    accentHex: '#38bdf8',
  },
  {
    id: 'deep-space',
    stageIndex: 1,
    minTimeSec: 4.5,
    maxTimeSec: 9.5,
    badge: 'PART 2 · CRUISING TO MARS',
    emoji: '🌌',
    headline: 'Zooming Through Space!',
    kidExplanation: 'Earth is far behind us now. We make our own air and food on the way!',
    tradeOffPreview: 'No stores in space, so we take care of every drop of water.',
    nasaSource: 'Deep Space',
    accentHex: '#a78bfa',
  },
  {
    id: 'landing-outpost',
    stageIndex: 2,
    minTimeSec: 9.5,
    maxTimeSec: 15.0,
    badge: 'PART 3 · TOUCHDOWN!',
    emoji: '🔴',
    headline: 'We Made It to Mars!',
    kidExplanation: 'Touchdown on the red dust! Ready to run our new Mars base?',
    tradeOffPreview: 'Beat each level to unlock the next challenge!',
    nasaSource: 'Mars Base',
    accentHex: '#10b981',
  },
];

export interface FieldSampleNode {
  id: string;
  name: string;
  emoji: string;
  x: number;
  z: number;
  colorHex: number;
  colorCss: string;
  bonusText: string;
  effects: {
    lifeSupport?: number;
    food?: number;
    crewHealth?: number;
    science?: number;
    powerBonus?: number;
  };
  nasaFact: string;
}

export const FIELD_SAMPLES: FieldSampleNode[] = [
  {
    id: 'ice-core',
    name: 'Frozen Water-Ice Crystal',
    emoji: '🧊',
    x: -10.5,
    z: 3.8,
    colorHex: 0x38bdf8,
    colorCss: '#38bdf8',
    bonusText: '+12% Air · +1 Science',
    effects: { lifeSupport: 12, science: 1 },
    nasaFact: 'Real ice hides under Mars dirt! Melted ice gives water and oxygen.',
  },
  {
    id: 'sojourner-rtg-battery',
    name: 'Spare Solar Battery',
    emoji: '🔋',
    x: -10.2,
    z: -9.2,
    colorHex: 0xfacc15,
    colorCss: '#facc15',
    bonusText: '+1 Power tomorrow · +1 Science',
    effects: { powerBonus: 1, lifeSupport: 6, science: 1 },
    nasaFact: 'Spare batteries keep the base warm when dust blocks the sun.',
  },
  {
    id: 'ares-bio-seed-crate',
    name: 'Space Seed Pod',
    emoji: '🌱',
    x: 11.4,
    z: -2.4,
    colorHex: 0x10b981,
    colorCss: '#10b981',
    bonusText: '+14% Food · +1 Science',
    effects: { food: 14, science: 1 },
    nasaFact: 'Tiny seed pods grow healthy greens fast in water trays!',
  },
  {
    id: 'jezero-mudstone',
    name: 'Ancient Lake Rock',
    emoji: '🪨',
    x: 9.8,
    z: 5.4,
    colorHex: 0xf97316,
    colorCss: '#f97316',
    bonusText: '+2 Science Points',
    effects: { science: 2 },
    nasaFact: 'Billions of years ago, Mars had real rivers and lakes!',
  },
  {
    id: 'eds-superconductor-coil',
    name: 'Shield Booster Crystal',
    emoji: '🛡️',
    x: -2.5,
    z: -10.4,
    colorHex: 0xa855f7,
    colorCss: '#a855f7',
    bonusText: '+10% Health · +1 Science',
    effects: { crewHealth: 10, science: 1 },
    nasaFact: 'Extra shield coils help block space rays during solar storms.',
  },
];
