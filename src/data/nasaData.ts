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
    label: 'Earth Sea Level (Dipole Magnetosphere)',
    doseMsvPerDay: 0.007,
    instrument: 'Ground Reference',
    note: 'Earth’s natural magnetic field and thick atmosphere deflect Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE).',
  },
  {
    label: 'Active Defense (EDS & Storm Shield) at Full Power',
    doseMsvPerDay: 0.18,
    instrument: 'Habitat Superconducting Coil Array',
    note: 'Running high current through coils around the habitat generates an artificial magnetic field like Earth’s, protecting cellular DNA and neural structures.',
  },
  {
    label: 'Mars Surface Baseline (Unshielded GCR)',
    doseMsvPerDay: 0.67,
    instrument: 'Curiosity RAD Instrument',
    note: 'Constant Galactic Cosmic Rays increase long-term risks of cancer, cardiovascular disease, and brain neural alterations.',
  },
  {
    label: 'Lunar Surface (Quiet Sun)',
    doseMsvPerDay: 1.37,
    instrument: 'Chang’e-4 / LRO CRaTER',
    note: 'With zero atmosphere or global magnetic field, radiation exposure is over 190x higher than on Earth.',
  },
  {
    label: 'Solar Particle Event (SPE / X-Class Storm)',
    doseMsvPerDay: 4.85,
    instrument: 'NASA DONKI + RAD Storm Model',
    note: 'Without Active Defense (EDS & Storm Shield), an SPE causes acute radiation sickness, DNA strand breaks, and immune collapse.',
  },
];

export const OSDR_STUDIES: OsdrStudy[] = [
  {
    id: 'HRP-RAD-01',
    title: 'Radiation Risks: DNA Damage, Cancer, Cardiovascular & Neural Alterations',
    topic: 'Galactic Cosmic Rays (GCR) & Solar Particle Events (SPE)',
    finding:
      'High-energy cosmic rays and solar proton storms shatter cellular DNA strands, accelerate cardiovascular disease and cancer risk, and alter neural dendrites in the brain.',
    gameplayLink:
      'Perform Daily Whole-Body Scans in the Med-Bay and power Active Defense (EDS & Storm Shield) coils to generate an artificial magnetic field.',
  },
  {
    id: 'HRP-GRAV-02',
    title: 'Lower Gravity: Muscle Atrophy, Bone Loss & Spatial Disorientation',
    topic: '0.38g / 0.16g Physical Deconditioning',
    finding:
      'Reduced gravity causes rapid muscle atrophy, bone mineral density loss, cardiovascular deconditioning, balance loss, spatial disorientation, and motion sickness.',
    gameplayLink:
      'Use the Dynamo Resistance Exercise machine daily to restore muscle/bone density while generating +1 bonus electrical Power Cell!',
  },
  {
    id: 'HRP-GUT-03',
    title: 'Gut Microbiome Damage, Dormant Virus Reactivation & Bio-Waste Potatoes',
    topic: 'Microbiome, Immunity & Space Agriculture',
    finding:
      'Radiation and isolation stress damage gut flora and cause dormant viruses (like Epstein-Barr & Varicella) to reactivate. Growing potatoes in composted bio-waste provides fresh calories and prebiotic fiber.',
    gameplayLink:
      'Tend the Potato Bio-Dome using bio-waste fertilizer and ration meals carefully to survive until rescue.',
  },
  {
    id: 'HRP-PSY-04',
    title: 'Cognitive & Psychological Health: Isolation, Stress & High Workloads',
    topic: 'Behavioral Health & Sleep Deprivation',
    finding:
      'Being stranded millions of kilometers from Earth triggers severe isolation, stress, loss of motivation/mood, and cognitive errors from sleep deprivation and high workloads.',
    gameplayLink:
      'Take post-EVA Decon Showers, establish satellite links with Earth, and balance rest cycles to keep Cognitive Morale high.',
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
    kidSummary:
      'Extreme Solar Particle Event (SPE)! Energize Active Defense (EDS & Storm Shield) coils immediately to prevent cellular DNA & neural damage.',
  },
  {
    id: '2024-10-03-X9.0',
    classType: 'X9.0',
    peakTime: '2024-10-03 12:18 UTC',
    sourceLocation: 'S15W08 (Active Region 13842)',
    severity: 'extreme',
    radiationMsvDay: 5.1,
    kidSummary:
      'Massive proton burst capable of blacking out satellite communications and triggering acute radiation sickness.',
  },
  {
    id: '2025-02-23-M4.9',
    classType: 'M4.9',
    peakTime: '2025-02-23 19:27 UTC',
    sourceLocation: 'N14W76 (Active Region 14001)',
    severity: 'strong',
    radiationMsvDay: 2.65,
    kidSummary:
      'Strong solar flare raising surface GCR/SPE dose. Route extra Power Cells to Active Defense magnetic coils.',
  },
  {
    id: '2025-05-13-M7.7',
    classType: 'M7.7',
    peakTime: '2025-05-13 03:25 UTC',
    sourceLocation: 'N09E64 (Active Region 14087)',
    severity: 'strong',
    radiationMsvDay: 3.3,
    kidSummary:
      'High-speed solar particle wave that interferes with orbital satellite telemetry and increases cardiovascular/DNA stress.',
  },
];

export const KID_GLOSSARY: GlossaryItem[] = [
  {
    term: 'Active Defense (EDS & Storm Shield)',
    meaning:
      'Our primary radiation & dust defense system. It runs electrical current through coils around the spacecraft/habitat to create an artificial magnetic field—just like Earth’s magnetosphere!',
    example:
      'Why does it consume so much power? Generating a magnetic bubble strong enough to deflect cosmic rays requires heavy continuous electrical current.',
  },
  {
    term: 'ECLSS Life Support (CO₂ & Heating)',
    meaning:
      'Environmental Control and Life Support System. It clears toxic CO₂ build-up from cabin air and heats the habitat against freezing -80°C Martian temperatures.',
    example:
      'If Life Support loses power during a dust storm, CO₂ levels spike and the base freezes rapidly.',
  },
  {
    term: 'Why Balance Power Quota?',
    meaning:
      'Solar energy on Mars is limited and unpredictable because dust storms prevent sunlight from reaching the solar panels.',
    example:
      'You are given a fixed quota of Power Cells each Sol and must clean panels manually if automated systems fail—or generate power via the Dynamo Exercise Bike!',
  },
  {
    term: 'Bio-Waste Potato Farming',
    meaning:
      'Growing high-calorie potato tubers by mixing sterile Martian regolith with your own composted organic waste and recycled water.',
    example:
      'Inspired by "The Martian", growing potatoes solves food shortages and supplies fiber to repair damaged gut health.',
  },
  {
    term: 'Lower-Gravity Deconditioning',
    meaning:
      'In Mars (0.38g) or Moon (0.16g) gravity, astronauts suffer muscle atrophy, bone density loss, cardiovascular deconditioning, spatial disorientation, balance loss, and motion sickness.',
    example:
      'Daily resistance training and whole-body scans counter bone/muscle loss while generating bonus electricity.',
  },
  {
    term: 'Post-EVA Decon Shower',
    meaning:
      'Taking a pressurized wash after coming inside from a Mars or Moon walk to remove electrostatically sticky, toxic dust and boost psychological morale.',
    example:
      'Always take a shower in the ECLSS module after manual solar panel cleaning or Mars Buggy salvage runs!',
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
      kidSummary: `Major ${upper} Solar Particle Event recorded by NASA DONKI! High DNA & neural radiation risk—power Active Defense coils!`,
    };
  }
  if (upper.startsWith('M')) {
    return {
      severity: 'strong',
      radiationMsvDay: 2.8,
      kidSummary: `Moderate-strong ${upper} solar flare detected. Active Defense (EDS & Storm Shield) recommended.`,
    };
  }
  return {
    severity: 'moderate',
    radiationMsvDay: 1.45,
    kidSummary: `Minor ${upper} solar activity. Baseline Active Defense magnetic field handles this safely.`,
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
