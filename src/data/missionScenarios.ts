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

export type InteriorZoneId =
  | 'exit_station'
  | 'lab'
  | 'exercise'
  | 'scanner'
  | 'greenhouse_beds'
  | 'exit_greenhouse';

export interface InteriorPoint {
  id: InteriorZoneId;
  shortName: string;
  name: string;
  x: number;
  z: number;
  interactRadius: number;
  promptAction: string;
}

export const INTERIOR_POINTS: InteriorPoint[] = [
  {
    id: 'exit_station',
    shortName: 'Exit',
    name: 'Main Station Airlock',
    x: 0,
    z: 3.8,
    interactRadius: 2.1,
    promptAction: 'Step Outside Station',
  },
  {
    id: 'lab',
    shortName: 'Lab Desk',
    name: 'Science & Radio Lab Desk',
    x: 0,
    z: -2.4,
    interactRadius: 2.6,
    promptAction: 'Work at Lab Desk',
  },
  {
    id: 'exercise',
    shortName: 'Gym',
    name: 'Treadmill & Bone Trainer',
    x: -6.8,
    z: -1.1,
    interactRadius: 2.4,
    promptAction: 'Exercise Muscles & Bones',
  },
  {
    id: 'scanner',
    shortName: 'Scanner',
    name: 'Health & Radiation Scanner',
    x: -6.0,
    z: 2.4,
    interactRadius: 2.3,
    promptAction: 'Enter Body Scanner',
  },
  {
    id: 'greenhouse_beds',
    shortName: 'Crops',
    name: 'Attached Greenhouse Beds',
    x: 13.8,
    z: -0.4,
    interactRadius: 3.1,
    promptAction: 'Plant & Harvest Crops',
  },
  {
    id: 'exit_greenhouse',
    shortName: 'Farm Exit',
    name: 'Greenhouse Airlock',
    x: 14.2,
    z: 3.2,
    interactRadius: 2.1,
    promptAction: 'Step Outside Greenhouse',
  },
];

export type CropType = 'potatoes' | 'lettuce' | 'tomatoes';

export interface CropPlotState {
  id: number;
  cropType: CropType;
  stage: 0 | 1 | 2 | 3;
}

export const CROP_LABELS: Record<CropType, string> = {
  potatoes: 'Mars Potatoes',
  lettuce: 'Crisp Lettuce',
  tomatoes: 'Space Tomatoes',
};

export const SURVIVAL_TARGET_SOLS = 150;

export const STATION_POINTS: StationPoint[] = [
  {
    id: 'habitat',
    shortName: 'Station',
    x: 0,
    z: 0,
    interactRadius: 9.2,
    collisionRadius: 5.5,
    promptAction: 'Enter Space Station',
  },
  {
    id: 'greenhouse',
    shortName: 'Farm',
    x: 15.8,
    z: 0.0,
    interactRadius: 5.6,
    collisionRadius: 3.4,
    promptAction: 'Enter Attached Greenhouse',
  },
  {
    id: 'solar',
    shortName: 'Solar',
    x: -21.5,
    z: -10.0,
    interactRadius: 8.2,
    collisionRadius: 4.9,
    promptAction: 'Clean 12-Panel Solar Farm',
  },
  {
    id: 'lifesupport',
    shortName: 'Air',
    x: -14.0,
    z: 17.5,
    interactRadius: 5.2,
    collisionRadius: 3.1,
    promptAction: 'Make Clean Air & Water',
  },
  {
    id: 'comms',
    shortName: 'Radio',
    x: 12.0,
    z: -19.0,
    interactRadius: 4.8,
    collisionRadius: 2.5,
    promptAction: 'Send Message to Earth',
  },
  {
    id: 'science',
    shortName: 'Rover',
    x: 14.5,
    z: 18.0,
    interactRadius: 5.0,
    collisionRadius: 2.8,
    promptAction: 'Inspect Rover & Research',
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
    name: 'Main Space Station',
    shortName: 'Station',
    role: 'Storm Shelter & Shield',
    plainExplanation: 'Run inside during dust storms! Also shields sun rays and ends each day.',
    tradeOffTip: 'More Shield keeps you safe, leaving less power for Science.',
    powerKey: 'shield',
  },
  solar: {
    id: 'solar',
    name: '12-Panel Solar Farm',
    shortName: 'Solar',
    role: 'Makes Base Power',
    plainExplanation: 'Dust storms bury all 12 solar panels. Clean them fast or power stays tiny!',
    tradeOffTip: 'Cleaning the Solar Farm restores full base power right away.',
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Attached Greenhouse',
    shortName: 'Farm',
    role: 'Plant & Harvest Crops',
    plainExplanation: 'Connected right to your Space Station! Grow and harvest food from inside or outside.',
    tradeOffTip: 'Plant seeds, water crops, and harvest food to keep the Food bar full.',
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
  extraDustDays?: number[];
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
    lessonTitle: 'Lesson 1: Power Keeps You Alive',
    lessonText: 'Mars has no air to breathe. Keep your Air Machine powered up!',
    tradeOffText: 'Keep Air at 2+ power and explore the station.',
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
    title: 'Dust Storm!',
    emoji: '🌪️',
    site: 'mars',
    maxDays: 3,
    goalText: 'Shelter storm, clean Solar & Food 75%+',
    lessonTitle: 'Lesson 2: Run to Shelter & Clean Panels',
    lessonText: 'Mars dust storms hurt outdoors and coat solar panels, cutting power!',
    tradeOffText: 'Hide inside the Station during storms, then clean Solar panels after.',
    initialAir: 84,
    initialFood: 68,
    initialHealth: 90,
    initialDust: 15,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 2, science: 2 },
    stormDay: null,
    dustDay: 2,
    requiredActionId: 'harvest-greens',
    requiredMinFood: 75,
    requiredMaxDust: 25,
  },
  {
    id: 3,
    title: 'Dust Blackout',
    emoji: '☀️',
    site: 'mars',
    maxDays: 3,
    goalText: 'Clean Solar, grab 1 Mars Rock & finish Day 3',
    lessonTitle: 'Lesson 3: Dust Cuts Solar Power',
    lessonText: 'Heavy red dust dropped power to 3⚡! Brush panels clean to power up.',
    tradeOffText: 'Clean Solar first, watch for Day 3 storm, and grab 1 Mars rock.',
    initialAir: 80,
    initialFood: 80,
    initialHealth: 86,
    initialDust: 90,
    initialPower: { lifesupport: 1, greenhouse: 1, shield: 1, science: 0 },
    stormDay: null,
    dustDay: 3,
    requiredActionId: 'clean-solar',
    requiredMaxDust: 20,
    requiredSamples: 1,
  },
  {
    id: 4,
    title: 'Solar Flare!',
    emoji: '🛡️',
    site: 'mars',
    maxDays: 3,
    goalText: 'Shield 2+, 2 Mars Rocks & survive Flare',
    lessonTitle: 'Lesson 4: Dust & Space Radiation',
    lessonText: 'Dust storms bury Solar on Day 2. Sun rays hit on Day 3—raise Shield!',
    tradeOffText: 'Clean Solar after the storm so you have enough power for Shield!',
    initialAir: 82,
    initialFood: 80,
    initialHealth: 88,
    initialDust: 20,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 1, science: 2 },
    stormDay: 3,
    dustDay: 2,
    requiredMinShield: 2,
    requiredMaxDust: 25,
    requiredSamples: 2,
  },
  {
    id: 5,
    title: 'Mars Commander',
    emoji: '🚀',
    site: 'mars',
    maxDays: 4,
    goalText: '3 Mars Rocks, 5 Science & survive 4 Days',
    lessonTitle: 'Lesson 5: Survive Every Mars Hazard',
    lessonText: 'Frequent storms, tight power, and sun flares! Lead like a real commander.',
    tradeOffText: 'Shelter fast, clean Solar every storm, and collect Martian rocks.',
    initialAir: 78,
    initialFood: 76,
    initialHealth: 86,
    initialDust: 35,
    initialPower: { lifesupport: 2, greenhouse: 2, shield: 1, science: 2 },
    stormDay: 4,
    dustDay: 2,
    extraDustDays: [3],
    requiredMaxDust: 25,
    requiredSamples: 3,
    requiredScience: 5,
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
    name: 'Ice-Core Mars Rock',
    emoji: '🪨',
    x: -24.5,
    z: 9.5,
    colorHex: 0x9c4527,
    colorCss: '#d97745',
    bonusText: '+12% Air · +1 Science',
    effects: { lifeSupport: 12, science: 1 },
    nasaFact: 'Ice hides inside Mars rock! Melted ice makes water and air.',
  },
  {
    id: 'sojourner-rtg-battery',
    name: 'Iron Basalt Rock',
    emoji: '🪨',
    x: -25.0,
    z: -23.0,
    colorHex: 0x8c3a20,
    colorCss: '#c25932',
    bonusText: '+1 Power · +1 Science',
    effects: { powerBonus: 1, lifeSupport: 6, science: 1 },
    nasaFact: 'Dense iron-rich Mars rocks show ancient volcano activity.',
  },
  {
    id: 'ares-bio-seed-crate',
    name: 'Nutrient Soil Rock',
    emoji: '🪨',
    x: 26.5,
    z: -5.5,
    colorHex: 0xa3482b,
    colorCss: '#d97745',
    bonusText: '+14% Food · +1 Science',
    effects: { food: 14, science: 1 },
    nasaFact: 'Martian mineral salts can help grow hydroponic space plants!',
  },
  {
    id: 'jezero-mudstone',
    name: 'Ancient Lake Rock',
    emoji: '🪨',
    x: 24.0,
    z: 18.5,
    colorHex: 0xb2522f,
    colorCss: '#e07b4f',
    bonusText: '+2 Science Points',
    effects: { science: 2 },
    nasaFact: 'Long ago, Mars had real rivers and lakes at Jezero Crater!',
  },
  {
    id: 'eds-superconductor-coil',
    name: 'Rusty Shield Ore',
    emoji: '🪨',
    x: -3.5,
    z: -26.5,
    colorHex: 0x7d321c,
    colorCss: '#c25932',
    bonusText: '+10% Health · +1 Science',
    effects: { crewHealth: 10, science: 1 },
    nasaFact: 'Packed iron rock shields help block space rays in storms.',
  },
];
