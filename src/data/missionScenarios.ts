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
  x: number;
  z: number;
  interactRadius: number;
  collisionRadius: number;
  promptAction: string;
}

export const STATION_POINTS: StationPoint[] = [
  {
    id: 'habitat',
    x: 0,
    z: 0,
    interactRadius: 5.4,
    collisionRadius: 3.6,
    promptAction: 'Manage Storm Shield & Rest for Next Day',
  },
  {
    id: 'greenhouse',
    x: 7.2,
    z: 0,
    interactRadius: 4.5,
    collisionRadius: 2.7,
    promptAction: 'Tend Crops & Harvest Fresh Food',
  },
  {
    id: 'solar',
    x: -7.6,
    z: -3.2,
    interactRadius: 4.8,
    collisionRadius: 2.6,
    promptAction: 'Inspect Batteries & Clean Solar Panels',
  },
  {
    id: 'lifesupport',
    x: -4.2,
    z: 5.8,
    interactRadius: 4.4,
    collisionRadius: 2.4,
    promptAction: 'Check O₂/Water Tanks & Scrub Air Filters',
  },
  {
    id: 'comms',
    x: 3.2,
    z: -6.8,
    interactRadius: 3.8,
    collisionRadius: 1.7,
    promptAction: 'Beam Science to Earth & Check Space Weather',
  },
  {
    id: 'science',
    x: 4.8,
    z: 6.2,
    interactRadius: 4.2,
    collisionRadius: 1.8,
    promptAction: 'Operate Rover Drill & Scan Rocks',
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
  moon: {
    id: 'moon',
    name: 'Shackleton Crater Rim',
    subtitle: 'Lunar South Pole',
    missionLabel: 'Artemis Lunar Outpost',
    dayUnit: 'Day',
    gravityG: 0.165,
    commDelayText: '1.3 sec one-way',
    baseRadiationMsv: 1.37,
    maxSolarCells: 8,
    nasaReference: 'NASA Artemis / LRO CRaTER Data',
    environmentFact:
      'High crater rims catch long sunlight, while deep shadows hold water ice at -170°C. Zero air means high radiation!',
  },
  mars: {
    id: 'mars',
    name: 'Jezero Crater Delta',
    subtitle: 'Mars Surface',
    missionLabel: 'Perseverance Mars Outpost',
    dayUnit: 'Sol',
    gravityG: 0.38,
    commDelayText: '12 min one-way',
    baseRadiationMsv: 0.67,
    maxSolarCells: 8,
    nasaReference: 'NASA Mars Trek / Curiosity RAD',
    environmentFact:
      'A Martian Sol lasts 24h 39m. Thin CO₂ air softens radiation slightly, but global dust storms can dim solar panels!',
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
    name: 'Astronaut Team (Maya, Leo & Zara)',
    shortName: 'Astronauts',
    role: 'Outpost Explorers & Scientists',
    plainExplanation:
      'Commander Maya leads base safety, Botanist Leo tends the hydroponic crops, and Engineer Zara keeps life support and the rover running. They move around the base to do their jobs—and run inside the Habitat when a solar storm hits!',
    tradeOffTip:
      'Your crew needs steady Air & Water, fresh Food, and Storm Shielding to stay strong. Pushing too hard without protection lowers Crew Health.',
  },
  habitat: {
    id: 'habitat',
    name: 'Crew Habitat & Water-Wall Shield',
    shortName: 'Habitat',
    role: 'Home & Radiation Storm Shelter',
    plainExplanation:
      'Four astronauts sleep, eat, and monitor computers inside this pressurized dome. Heavy water-wall shutters slide closed during solar flares to block harmful space rays.',
    tradeOffTip:
      'Powering the active shield & storm shutters keeps crew health high during solar storms, but leaves less power for growing food or running the rover.',
    powerKey: 'shield',
  },
  solar: {
    id: 'solar',
    name: 'Solar Array & Battery Bank',
    shortName: 'Solar Grid',
    role: 'Electricity Generator',
    plainExplanation:
      'Articulated photovoltaic wings tilt to catch sunlight and charge lithium batteries. Because electricity is limited, you decide where every Power Cell goes.',
    tradeOffTip:
      'Dust storms on Mars or deep crater shadows on the Moon reduce total available Power Cells — forcing tough choices!',
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Hydroponics Greenhouse',
    shortName: 'Greenhouse',
    role: 'Fresh Food & Oxygen Helper',
    plainExplanation:
      'Purple and white LED grow lights help spinach, dwarf tomatoes, and lettuce grow in mineral water without soil (inspired by NASA VEGGIE & OSD-102).',
    tradeOffTip:
      'Giving 2–3 Power Cells grows extra food and creates bonus oxygen, but uses electricity and recycled water.',
    powerKey: 'greenhouse',
  },
  lifesupport: {
    id: 'lifesupport',
    name: 'ECLSS Life Support & Water Recycler',
    shortName: 'Life Support',
    role: 'Air & Water Recycling',
    plainExplanation:
      'Scrubs stale carbon dioxide out of the air, splits water into breathable oxygen, and recycles 98% of cabin water just like on the International Space Station.',
    tradeOffTip:
      'Under-powering Life Support saves electricity for science today, but oxygen and clean water will drop dangerously fast!',
    powerKey: 'lifesupport',
  },
  comms: {
    id: 'comms',
    name: 'Deep Space Comms Dish',
    shortName: 'Comms',
    role: 'Earth Link & Data Transmission',
    plainExplanation:
      'A steerable parabolic dish beams rock scans and crew checkups back to Earth Mission Control across hundreds of thousands or millions of kilometers.',
    tradeOffTip:
      'Transmitting high-speed science packets uses Rover/Science power and faces real light-speed delays (1.3s Moon vs 12m Mars).',
    powerKey: 'science',
  },
  science: {
    id: 'science',
    name: 'Explore Rover & Regolith Drill',
    shortName: 'Rover',
    role: 'Sample Collection & Exploration',
    plainExplanation:
      'A 6-wheeled NASA rocker-bogie rover drives across craters to drill soil samples and hunt for frozen water ice.',
    tradeOffTip:
      'Funding Science earns Mission Points toward victory, but every cell spent on the rover is a cell not protecting or feeding the crew!',
    powerKey: 'science',
  },
};

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
    title: 'Solar Flare Storm Warning',
    category: 'Solar Storm',
    story:
      'NASA DONKI space-weather sensors spotted a bright flare on the Sun! High-speed radiation particles will sweep past your outpost over the next few hours.',
    nasaScienceNote:
      'Real NASA RadLab & Curiosity RAD sensors show solar storms can push radiation above 4.0 mSv/day — 600x higher than on Earth!',
    choices: [
      {
        id: 'shelter',
        label: 'Close Storm Shutters & Shelter Crew',
        gainText: '+25% Radiation Protection today',
        costText: '-1 Power Cell tomorrow & -1 Science',
        effects: { shieldBonus: 25, nextDayPowerMod: -1, science: -1, crewHealth: 4 },
        lessonFeedback:
          'Smart safety trade-off! You paused outdoor science and spent battery reserves, keeping your astronauts safe from radiation.',
      },
      {
        id: 'push-science',
        label: 'Keep Rover Drilling Through the Flare',
        gainText: '+2 Science Samples collected',
        costText: '-18% Crew Health from radiation exposure',
        effects: { science: 2, crewHealth: -18 },
        lessonFeedback:
          'You captured valuable crater data, but without storm shelter protection the radiation took a toll on crew health.',
      },
    ],
  },
  {
    id: 'greenhouse-leak',
    title: 'Greenhouse Pipe Leak & Radio Delay',
    category: 'Comms Delay',
    story:
      'A coolant pipe inside the Hydroponics Greenhouse started dripping! On Mars, asking Earth for repair steps takes 24 minutes round-trip. Even on the Moon, gearing up takes time.',
    nasaScienceNote:
      'At light speed, Mars messages take 4–22 minutes each way. Astronauts must be trained to solve urgent problems without waiting for Earth!',
    choices: [
      {
        id: 'fix-eva',
        label: 'Send Crew to Patch It Right Away',
        gainText: 'Saves Greenhouse Water & +8% Food',
        costText: '-14% Oxygen & Water during airlock cycle',
        effects: { food: 8, lifeSupport: -14 },
        lessonFeedback:
          'Quick thinking! Opening the airlock used extra oxygen, but patching the pipe fast saved your plants.',
      },
      {
        id: 'wait-earth',
        label: 'Wait for Earth Mission Control Checklist',
        gainText: 'Saves -10% Oxygen (no airlock cycle)',
        costText: '-16% Food lost while pipe leaks',
        effects: { lifeSupport: 4, food: -16 },
        lessonFeedback:
          'You conserved airlock oxygen, but waiting through the radio delay let the greenhouse lose water and wilt some crops.',
      },
    ],
  },
  {
    id: 'osdr-exercise-nutrition',
    title: 'Low-Gravity Bone & Muscle Checkup',
    category: 'Astronaut Health',
    story:
      'Your crew’s weekly medical scan shows their muscles are getting tired in low gravity. Fresh greens and powered exercise gear help, or they can work extra shifts instead.',
    nasaScienceNote:
      'NASA OSDR studies (OSD-48 & OSD-102) show astronauts need daily exercise and fresh plant nutrients to protect bones and immune cells.',
    choices: [
      {
        id: 'exercise-greens',
        label: 'Run Exercise Bikes & Serve Fresh Salad',
        gainText: '+14% Crew Health boost',
        costText: '-12% Food & -1 Power Cell tomorrow',
        effects: { crewHealth: 14, food: -12, nextDayPowerMod: -1 },
        lessonFeedback:
          'Following NASA OSDR biology research kept your crew strong and sharp, even though it cost extra food and electricity.',
      },
      {
        id: 'overtime-ration',
        label: 'Ration Meals & Run Extra Rover Scans',
        gainText: '+2 Science Samples & saves Food',
        costText: '-12% Crew Health from fatigue',
        effects: { science: 2, crewHealth: -12 },
        lessonFeedback:
          'Your science log grew fast, but skipping fresh nutrition and exercise made the astronauts tired and weaker.',
      },
    ],
  },
  {
    id: 'dust-or-shadow-power',
    title: 'Dust Buildup on Solar Wings',
    category: 'Weather & Power',
    story:
      'Fine regolith dust has coated your solar panels, cutting charging efficiency! Cleaning them restores full electricity, or you can route power carefully and conserve.',
    nasaScienceNote:
      'Real Mars rovers like Opportunity and InSight lost power when fine Martian dust covered their solar arrays; static-charged Moon dust sticks just as stubbornly!',
    choices: [
      {
        id: 'clean-panels',
        label: 'Use Air-Jet Brushes & Crew Cleaning',
        gainText: '+1 Bonus Power Cell tomorrow',
        costText: '-12% Life Support air & -8% Crew Health',
        effects: { nextDayPowerMod: 1, lifeSupport: -12, crewHealth: -8 },
        lessonFeedback:
          'Clean panels mean big power tomorrow, though using pressurized gas and outside work tired the crew and used air.',
      },
      {
        id: 'battery-save',
        label: 'Dim Cabin Lights & Power-Save Mode',
        gainText: '+8% Life Support stability',
        costText: '-1 Power Cell tomorrow',
        effects: { lifeSupport: 8, nextDayPowerMod: -1 },
        lessonFeedback:
          'Smart conservation protected your oxygen tanks, though tomorrow you will need to budget with one fewer Power Cell.',
      },
    ],
  },
  {
    id: 'deep-ice-discovery',
    title: 'Subsurface Water Ice Discovery!',
    category: 'Astronaut Health',
    story:
      'The Rover’s ground radar spotted frozen water ice just below a nearby crater floor! Drilling it takes big energy, or you can beam the map straight to Earth.',
    nasaScienceNote:
      'Finding water ice on the Moon and Mars is huge: water gives astronauts drinking water, breathable oxygen (via electrolysis), and rocket fuel!',
    choices: [
      {
        id: 'drill-ice',
        label: 'Drill & Melt Ice into Life Support Tanks',
        gainText: '+20% Oxygen & Water reserves',
        costText: '-1 Power Cell tomorrow & -6% Crew Health',
        effects: { lifeSupport: 20, nextDayPowerMod: -1, crewHealth: -6 },
        lessonFeedback:
          'Turning crater ice into real water and oxygen gave your outpost huge breathing room at the cost of heavy drill power.',
      },
      {
        id: 'beam-data',
        label: 'Transmit Full Radar Map to NASA Earth',
        gainText: '+2 Science Samples toward mission goal',
        costText: '-8% Life Support (extra cooling power)',
        effects: { science: 2, lifeSupport: -8 },
        lessonFeedback:
          'Earth scientists cheered the discovery! Beaming high-power radio data heated the electronics and used extra cooling water.',
      },
    ],
  },
];
