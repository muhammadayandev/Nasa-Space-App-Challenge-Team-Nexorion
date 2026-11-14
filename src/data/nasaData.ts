export type DataSourceMode = 'live' | 'archive';

export interface SolarFlareEvent {
  id: string;
  classType: string;
  peakTime: string;
  sourceLocation: string;
  severity: 'moderate' | 'strong' | 'extreme';
  radiationMsvDay: number;
  kidSummary: string;
}

export interface OsdrStudy {
  id: string;
  title: string;
  topic: string;
  finding: string;
  gameplayLink: string;
}

export interface RadLabBenchmark {
  label: string;
  doseMsvPerDay: number;
  instrument: string;
  note: string;
}

export interface GlossaryItem {
  term: string;
  meaning: string;
  example: string;
}

export interface NasaDatasetSnapshot {
  sourceMode: DataSourceMode;
  fetchedAt: string;
  flares: SolarFlareEvent[];
  radLabBenchmarks: RadLabBenchmark[];
  osdrStudies: OsdrStudy[];
  glossary: GlossaryItem[];
}

export const RADLAB_BENCHMARKS: RadLabBenchmark[] = [
  {
    label: 'Earth Sea Level (Normal)',
    doseMsvPerDay: 0.007,
    instrument: 'Ground Reference',
    note: 'Earth’s thick air and magnetic field block almost all space radiation.',
  },
  {
    label: 'International Space Station (ISS)',
    doseMsvPerDay: 0.45,
    instrument: 'ISS RadLab / DOSIS-3D',
    note: 'Astronauts inside the ISS receive ~60x more radiation than on Earth.',
  },
  {
    label: 'Lunar Surface (Quiet Sun)',
    doseMsvPerDay: 1.37,
    instrument: 'Chang’e-4 / LRO CRaTER',
    note: 'The Moon has no atmosphere or magnetic shield, so baseline radiation is high.',
  },
  {
    label: 'Mars Surface (Jezero Crater)',
    doseMsvPerDay: 0.67,
    instrument: 'Curiosity RAD Instrument',
    note: 'Mars’ thin CO₂ air blocks roughly half the cosmic rays compared to the Moon.',
  },
  {
    label: 'Solar Particle Storm (X-Class Flare)',
    doseMsvPerDay: 4.85,
    instrument: 'NASA DONKI + RAD Storm Model',
    note: 'Without water-wall storm shielding, a major flare rapidly harms crew cells.',
  },
];

export const OSDR_STUDIES: OsdrStudy[] = [
  {
    id: 'OSD-102',
    title: 'Plant Growth & Microgravity Stress (VEGGIE)',
    topic: 'Space Agriculture',
    finding:
      'Red romaine lettuce and leafy greens grown under tuned LED light give astronauts fresh vitamins and help scrub CO₂ into breathable oxygen.',
    gameplayLink: 'Powers the Hydroponics Greenhouse trade-off between electricity and crew food/O₂.',
  },
  {
    id: 'OSD-48',
    title: 'Muscle & Bone Density Loss in Low Gravity',
    topic: 'Astronaut Health',
    finding:
      'In 0.16g (Moon) or 0.38g (Mars), muscles and bones weaken unless crew spend daily energy exercising and eating nutrient-rich meals.',
    gameplayLink: 'Explains why cutting food or life support weakens Crew Health over multiple sols.',
  },
  {
    id: 'OSD-578',
    title: 'Immune Response Under Space Radiation',
    topic: 'Radiation Biology',
    finding:
      'Higher radiation doses stress immune cells and sleep cycles, making storm shelter shielding critical during solar flares.',
    gameplayLink: 'Connects DONKI flare alerts to crew health and shielding power choices.',
  },
];

export const CURATED_ARCHIVE_FLARES: SolarFlareEvent[] = [
  {
    id: '2024-05-14-X8.7',
    classType: 'X8.7',
    peakTime: '2024-05-14 16:51 UTC',
    sourceLocation: 'S18W89 (Active Region 13664)',
    severity: 'extreme',
    radiationMsvDay: 4.85,
    kidSummary: 'Giant X-class solar flare! Needs full storm shutters to protect astronauts.',
  },
  {
    id: '2024-10-03-X9.0',
    classType: 'X9.0',
    peakTime: '2024-10-03 12:18 UTC',
    sourceLocation: 'S15W08 (Active Region 13842)',
    severity: 'extreme',
    radiationMsvDay: 5.1,
    kidSummary: 'Huge burst of solar X-rays and particles capable of disrupting radio signals.',
  },
  {
    id: '2025-02-23-M4.9',
    classType: 'M4.9',
    peakTime: '2025-02-23 19:27 UTC',
    sourceLocation: 'N14W76 (Active Region 14001)',
    severity: 'strong',
    radiationMsvDay: 2.65,
    kidSummary: 'Medium-strong flare raising surface radiation. Extra shielding recommended.',
  },
  {
    id: '2025-05-13-M7.7',
    classType: 'M7.7',
    peakTime: '2025-05-13 03:25 UTC',
    sourceLocation: 'N09E64 (Active Region 14087)',
    severity: 'strong',
    radiationMsvDay: 3.3,
    kidSummary: 'Fast solar particle burst that also dims radio comms with Earth.',
  },
];

export const KID_GLOSSARY: GlossaryItem[] = [
  {
    term: 'Sol',
    meaning: 'One full day and night on Mars (24 hours and 39 minutes — just 39 minutes longer than an Earth day!).',
    example: 'On the Moon, we count Earth Days; on Mars, astronauts count Sols.',
  },
  {
    term: 'Radiation Dose (mSv)',
    meaning: 'Millisieverts (mSv) measure how much invisible space energy hits an astronaut’s body.',
    example: 'Water tanks and thick walls absorb radiation before it reaches the crew.',
  },
  {
    term: 'Solar Flare / CME',
    meaning: 'A giant burst of light and charged particles shooting off the Sun.',
    example: 'NASA’s DONKI database watches the Sun so astronauts get early storm warnings.',
  },
  {
    term: 'Hydroponics',
    meaning: 'Growing fresh plants using mineral water and special LED lights instead of dirt.',
    example: 'Plants make food AND turn stale carbon dioxide back into fresh oxygen!',
  },
  {
    term: 'Regolith',
    meaning: 'The sharp, powdery broken rock and dust covering the Moon and Mars.',
    example: 'Scientists drill regolith to look for frozen water ice and ancient lake mud.',
  },
  {
    term: 'Light-Speed Delay',
    meaning: 'Even at the speed of light, radio messages take time to travel across space.',
    example: 'Moon radio takes 1.3 seconds; Mars radio takes 4 to 22 minutes each way!',
  },
];

function classifyFlare(classType: string): {
  severity: SolarFlareEvent['severity'];
  radiationMsvDay: number;
  kidSummary: string;
} {
  const upper = (classType || 'C1.0').toUpperCase();
  if (upper.startsWith('X')) {
    return {
      severity: 'extreme',
      radiationMsvDay: 4.85,
      kidSummary: `Major ${upper} solar flare recorded by NASA DONKI! High radiation risk.`,
    };
  }
  if (upper.startsWith('M')) {
    return {
      severity: 'strong',
      radiationMsvDay: 2.8,
      kidSummary: `Moderate-strong ${upper} solar flare detected. Shielding helps protect crew.`,
    };
  }
  return {
    severity: 'moderate',
    radiationMsvDay: 1.45,
    kidSummary: `Minor ${upper} solar activity. Normal shielding handles this safely.`,
  };
}

export async function fetchNasaDataset(): Promise<NasaDatasetSnapshot> {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const startDate = start.toISOString().slice(0, 10);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3200);

  try {
    const res = await fetch(
      `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`,
      { signal: controller.signal }
    );
    window.clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const raw = (await res.json()) as Array<{
      flrID?: string;
      classType?: string;
      peakTime?: string;
      sourceLocation?: string;
    }>;

    if (Array.isArray(raw) && raw.length > 0) {
      const parsed: SolarFlareEvent[] = raw
        .slice(-6)
        .reverse()
        .map((item, idx) => {
          const ct = item.classType || 'M1.0';
          const info = classifyFlare(ct);
          return {
            id: item.flrID || `live-${idx}`,
            classType: ct,
            peakTime: item.peakTime ? item.peakTime.replace('T', ' ').replace('Z', ' UTC') : 'Recent',
            sourceLocation: item.sourceLocation || 'Solar Disk',
            ...info,
          };
        });

      return {
        sourceMode: 'live',
        fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        flares: parsed,
        radLabBenchmarks: RADLAB_BENCHMARKS,
        osdrStudies: OSDR_STUDIES,
        glossary: KID_GLOSSARY,
      };
    }
  } catch {
    window.clearTimeout(timer);
  }

  return {
    sourceMode: 'archive',
    fetchedAt: 'Verified NASA Archive Snapshot',
    flares: CURATED_ARCHIVE_FLARES,
    radLabBenchmarks: RADLAB_BENCHMARKS,
    osdrStudies: OSDR_STUDIES,
    glossary: KID_GLOSSARY,
  };
}
