import * as THREE from 'three';
import type { CropPlotState } from '../data/missionScenarios';

export interface CropBedVisuals {
  group: THREE.Group;
  /** For each of the 3 growth stages (1, 2, 3), toggleable mesh group */
  stageGroups: [THREE.Group, THREE.Group, THREE.Group];
}

/**
 * Builds one realistic raised hydroponic/Martian-soil planter bed with drip irrigation
 * and 3 pre-built growth stage groups (1: Sprouts, 2: Leafy Growth, 3: Ripe Harvest).
 */
export function buildRealisticCropBed(
  width: number,
  depth: number,
  sharedMats?: {
    trayMat?: THREE.Material;
    soilMat?: THREE.Material;
    pipeMat?: THREE.Material;
  }
): CropBedVisuals {
  const group = new THREE.Group();

  const trayMat =
    sharedMats?.trayMat ??
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.55 });
  const soilMat =
    sharedMats?.soilMat ??
    new THREE.MeshStandardMaterial({ color: 0x2c1b12, roughness: 0.96, metalness: 0.0 });
  const pipeMat =
    sharedMats?.pipeMat ??
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.85 });

  // Aluminum raised planter trough
  const tray = new THREE.Mesh(new THREE.BoxGeometry(width, 0.42, depth), trayMat);
  tray.position.y = 0.21;
  tray.castShadow = true;
  tray.receiveShadow = true;
  group.add(tray);

  // Soil surface inset
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.16, 0.08, depth - 0.16),
    soilMat
  );
  soil.position.y = 0.42;
  soil.receiveShadow = true;
  group.add(soil);

  // Drip irrigation pipe along back edge + valve nozzles
  const dripLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, width - 0.12, 8),
    pipeMat
  );
  dripLine.rotation.z = Math.PI / 2;
  dripLine.position.set(0, 0.49, -depth * 0.36);
  group.add(dripLine);

  const sproutMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.72 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.74 });
  const leafMidMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
  const tomatoMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.28,
    metalness: 0.05,
  });
  const trellisMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.7 });

  const cols = Math.max(4, Math.floor(width / 0.56));
  const rows = 2;

  // Stage 1: Tender green sprouts
  const stage1 = new THREE.Group();
  for (let r = 0; r < rows; r++) {
    const z = (r - 0.5) * (depth * 0.42);
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols - 0.5) * (width - 0.5);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.11, 6), stemMat);
      stem.position.set(x, 0.51, z);
      stage1.add(stem);

      const leafA = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), sproutMat);
      leafA.scale.set(1.4, 0.45, 0.8);
      leafA.position.set(x - 0.045, 0.56, z);
      leafA.rotation.z = 0.25;
      stage1.add(leafA);

      const leafB = leafA.clone();
      leafB.position.set(x + 0.045, 0.56, z);
      leafB.rotation.z = -0.25;
      stage1.add(leafB);
    }
  }
  group.add(stage1);

  // Stage 2: Full leafy stems / lettuce rosettes
  const stage2 = new THREE.Group();
  for (let r = 0; r < rows; r++) {
    const z = (r - 0.5) * (depth * 0.44);
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols - 0.5) * (width - 0.5);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.26, 6), stemMat);
      stalk.position.set(x, 0.58, z);
      stage2.add(stalk);

      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + c * 0.4;
        const leaf = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.11, 0),
          k % 2 === 0 ? leafMidMat : leafDarkMat
        );
        leaf.scale.set(1.2, 0.58, 0.9);
        leaf.position.set(x + Math.cos(ang) * 0.09, 0.68 + (k % 2) * 0.06, z + Math.sin(ang) * 0.09);
        leaf.rotation.y = ang;
        stage2.add(leaf);
      }
    }
  }
  stage2.visible = false;
  group.add(stage2);

  // Stage 3: Tall staked crops + ripe fruits / plump produce ready for harvest!
  const stage3 = new THREE.Group();
  for (let r = 0; r < rows; r++) {
    const z = (r - 0.5) * (depth * 0.44);
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols - 0.5) * (width - 0.5);

      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6), trellisMat);
      stake.position.set(x, 0.74, z);
      stage3.add(stake);

      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 1), leafDarkMat);
      canopy.scale.set(1.05, 1.35, 1.0);
      canopy.position.set(x, 0.76, z);
      canopy.castShadow = true;
      stage3.add(canopy);

      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), leafMidMat);
      crown.position.set(x + ((c % 2) - 0.5) * 0.04, 0.95, z);
      stage3.add(crown);

      for (let f = 0; f < 3; f++) {
        const ang = f * 2.1 + c;
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), tomatoMat);
        fruit.position.set(x + Math.cos(ang) * 0.15, 0.68 + f * 0.11, z + Math.sin(ang) * 0.14);
        stage3.add(fruit);
      }
    }
  }
  stage3.visible = false;
  group.add(stage3);

  return { group, stageGroups: [stage1, stage2, stage3] };
}

export function applyCropStageToBeds(
  bedGroups: Array<[THREE.Group, THREE.Group, THREE.Group]>,
  plots: CropPlotState[]
): void {
  bedGroups.forEach((stages, idx) => {
    const plot = plots[idx];
    const stage = plot ? plot.stage : 2;
    stages[0].visible = stage === 1;
    stages[1].visible = stage === 2;
    stages[2].visible = stage === 3;
  });
}
