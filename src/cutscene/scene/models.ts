import * as THREE from 'three';
import type { ProceduralTextureSet } from './materials';

/**
 * Deterministic Mars terrain height function so every prop, rover, hab, and the player
 * sit flush on the regolith with zero floating.
 */
export function marsHeightAt(x: number, z: number): number {
  // Keep central landing & hab valley flatter while hills rise around the perimeter
  const distFromCenter = Math.hypot(x, z + 30);
  const valleyFlatness = THREE.MathUtils.smoothstep(distFromCenter, 22, 95);
  const dunes =
    Math.sin(x * 0.06) * Math.cos(z * 0.05) * 1.1 +
    Math.sin(x * 0.14 + z * 0.11) * 0.35;
  const ridgeWall = valleyFlatness * (4.5 + Math.sin(x * 0.045) * 3.2 + Math.cos(z * 0.04) * 2.8);
  return dunes * (0.25 + 0.75 * valleyFlatness) + ridgeWall;
}

export interface AstronautRig {
  group: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  head: THREE.Group;
}

function createRoundedPackGeometry(width: number, height: number, depth: number, radius: number): THREE.ExtrudeGeometry {
  const hw = width * 0.5 - radius;
  const hh = height * 0.5 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh - radius);
  shape.lineTo(hw, -hh - radius);
  shape.quadraticCurveTo(hw + radius, -hh - radius, hw + radius, -hh);
  shape.lineTo(hw + radius, hh);
  shape.quadraticCurveTo(hw + radius, hh + radius, hw, hh + radius);
  shape.lineTo(-hw, hh + radius);
  shape.quadraticCurveTo(-hw - radius, hh + radius, -hw - radius, hh);
  shape.lineTo(-hw - radius, -hh);
  shape.quadraticCurveTo(-hw - radius, -hh - radius, -hw, -hh - radius);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 0.04,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  geo.center();
  return geo;
}

/**
 * Anatomically contoured, multi-jointed 25+ part Astronaut Rig grounded at y = 0.
 * Supports full hip/knee/ankle gait, elbow/shoulder reach, waist bend/twist, and head look.
 */
export function createAstronaut(
  accentColor = 0xd94826,
  suitKind: 'aces' | 'eva' = 'eva'
): AstronautRig {
  const group = new THREE.Group();

  const mainSuitColor = suitKind === 'aces' ? 0xe06224 : 0xebedf2;
  const suitMat = new THREE.MeshStandardMaterial({
    color: mainSuitColor,
    roughness: suitKind === 'aces' ? 0.62 : 0.7,
    metalness: 0.08,
  });
  const trimFabricMat = new THREE.MeshStandardMaterial({
    color: suitKind === 'aces' ? 0x263142 : 0xd5dbe4,
    roughness: 0.75,
    metalness: 0.1,
  });
  const bearingMat = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    roughness: 0.35,
    metalness: 0.68,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.4,
    metalness: 0.25,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x252b34,
    roughness: 0.85,
    metalness: 0.15,
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: suitKind === 'aces' ? 0x162230 : 0xd99b26,
    roughness: 0.08,
    metalness: suitKind === 'aces' ? 0.35 : 0.94,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  // Pelvis root at hip level y = 0.92
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.92, 0);
  group.add(pelvis);

  const pelvisShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 16, 12),
    suitMat
  );
  pelvisShell.scale.set(1.22, 0.72, 0.92);
  pelvisShell.castShadow = true;
  pelvis.add(pelvisShell);

  const waistRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.195, 0.025, 10, 22),
    bearingMat
  );
  waistRing.rotation.x = Math.PI / 2;
  waistRing.position.y = 0.07;
  waistRing.scale.set(1.15, 0.88, 1);
  pelvis.add(waistRing);

  // Articulated Leg Builder: Hip -> Thigh -> Knee -> Shin -> Ankle -> Contoured Boot
  const buildLeg = (xOffset: number) => {
    const hip = new THREE.Group();
    hip.position.set(xOffset, -0.02, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.28, 8, 14), suitMat);
    thigh.position.y = -0.21;
    thigh.scale.set(1.02, 1, 1.08);
    thigh.castShadow = true;
    hip.add(thigh);

    // Knee bellows ring
    const knee = new THREE.Group();
    knee.position.set(0, -0.43, 0);
    hip.add(knee);

    const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.092, 12, 10), trimFabricMat);
    kneePad.scale.set(1, 0.85, 1.05);
    knee.add(kneePad);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.27, 8, 14), suitMat);
    shin.position.y = -0.21;
    shin.castShadow = true;
    knee.add(shin);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.41, 0);
    knee.add(ankle);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.018, 8, 16), bearingMat);
    cuff.rotation.x = Math.PI / 2;
    ankle.add(cuff);

    const bootUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.13, 8, 12), bootMat);
    bootUpper.rotation.x = Math.PI / 2;
    bootUpper.position.set(0, -0.035, 0.055);
    bootUpper.scale.set(1.05, 1, 0.72);
    bootUpper.castShadow = true;
    ankle.add(bootUpper);

    const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.14, 6, 10), bearingMat);
    sole.rotation.x = Math.PI / 2;
    sole.position.set(0, -0.055, 0.058);
    sole.scale.set(1.08, 1, 0.35);
    ankle.add(sole);

    return { hip, knee, ankle };
  };

  const leftLegParts = buildLeg(-0.145);
  const rightLegParts = buildLeg(0.145);

  // Articulated Upper Spine (pivots from pelvis waist)
  const spine = new THREE.Group();
  spine.position.set(0, 0.08, 0);
  pelvis.add(spine);

  // Contoured Lathe torso (natural athletic chest & tapered waist)
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18, 0.02),
    new THREE.Vector2(0.195, 0.16),
    new THREE.Vector2(0.24, 0.36),
    new THREE.Vector2(0.23, 0.5),
    new THREE.Vector2(0.13, 0.57),
    new THREE.Vector2(0.0, 0.58),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 22);
  const torso = new THREE.Mesh(torsoGeo, suitMat);
  torso.scale.set(1.16, 1, 0.82);
  torso.castShadow = true;
  spine.add(torso);

  // Harness straps & Mission Accent Collar
  const harnessLeft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.48, 0.34), trimFabricMat);
  harnessLeft.position.set(-0.11, 0.28, 0.01);
  spine.add(harnessLeft);
  const harnessRight = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.48, 0.34), trimFabricMat);
  harnessRight.position.set(0.11, 0.28, 0.01);
  spine.add(harnessRight);

  // Contoured Chest Display & Control Module (DCM)
  const dcm = new THREE.Mesh(createRoundedPackGeometry(0.23, 0.17, 0.09, 0.03), trimFabricMat);
  dcm.position.set(0, 0.34, 0.2);
  spine.add(dcm);
  const dcmAccent = new THREE.Mesh(createRoundedPackGeometry(0.16, 0.04, 0.04, 0.01), accentMat);
  dcmAccent.position.set(0, 0.38, 0.245);
  spine.add(dcmAccent);

  // Sculpted Rounded Backpack (PLSS for EVA, sleek survival pack for ACES)
  const packWidth = suitKind === 'eva' ? 0.38 : 0.32;
  const packHeight = suitKind === 'eva' ? 0.52 : 0.42;
  const packDepth = suitKind === 'eva' ? 0.2 : 0.14;
  const backpack = new THREE.Mesh(
    createRoundedPackGeometry(packWidth, packHeight, packDepth, 0.07),
    suitKind === 'eva' ? trimFabricMat : accentMat
  );
  backpack.position.set(0, 0.33, -0.22);
  backpack.castShadow = true;
  spine.add(backpack);

  if (suitKind === 'eva') {
    [-0.1, 0.1].forEach((ox) => {
      const o2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 12), accentMat);
      o2.position.set(ox, 0.31, -0.31);
      spine.add(o2);
    });
    const packStripe = new THREE.Mesh(createRoundedPackGeometry(0.32, 0.055, 0.05, 0.02), accentMat);
    packStripe.position.set(0, 0.5, -0.3);
    spine.add(packStripe);
  }

  // Articulated Arm Builder: Shoulder -> UpperArm -> Elbow -> ForeArm -> Gloved Hand
  const buildArm = (xOffset: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(xOffset, 0.47, 0);
    spine.add(shoulder);

    const shoulderBearing = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), accentMat);
    shoulder.add(shoulderBearing);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.22, 8, 12), suitMat);
    upperArm.position.y = -0.15;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.3, 0);
    shoulder.add(elbow);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 10), trimFabricMat);
    elbow.add(elbowJoint);

    const foreArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 8, 12), suitMat);
    foreArm.position.y = -0.14;
    foreArm.castShadow = true;
    elbow.add(foreArm);

    const wristRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 14), bearingMat);
    wristRing.rotation.x = Math.PI / 2;
    wristRing.position.y = -0.26;
    elbow.add(wristRing);

    const glove = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.06, 6, 10), bootMat);
    glove.position.set(0, -0.32, 0.015);
    glove.scale.set(0.95, 1, 0.72);
    elbow.add(glove);

    return { shoulder, elbow };
  };

  const leftArmParts = buildArm(-0.29);
  const rightArmParts = buildArm(0.29);

  // Articulated Head & NASA Pressure Helmet
  const head = new THREE.Group();
  head.position.set(0, 0.56, 0.01);
  spine.add(head);

  const neckDisconnect = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.026, 10, 22), bearingMat);
  neckDisconnect.rotation.x = Math.PI / 2;
  head.add(neckDisconnect);

  const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.185, 22, 18), suitKind === 'aces' ? new THREE.MeshStandardMaterial({ color: 0xf1f4f8, roughness: 0.3, metalness: 0.12 }) : suitMat);
  helmetShell.position.set(0, 0.17, -0.01);
  helmetShell.scale.set(0.96, 1.04, 1.04);
  helmetShell.castShadow = true;
  head.add(helmetShell);

  const visorHood = new THREE.Mesh(
    new THREE.TorusGeometry(0.155, 0.026, 10, 20, Math.PI * 1.15),
    bearingMat
  );
  visorHood.position.set(0, 0.19, 0.065);
  visorHood.rotation.z = -Math.PI * 0.075;
  visorHood.rotation.x = 0.22;
  head.add(visorHood);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.172, 20, 16, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.22, Math.PI * 0.46),
    visorMat
  );
  visor.position.set(0, 0.175, 0.032);
  visor.rotation.y = Math.PI * 0.5;
  head.add(visor);

  return {
    group,
    pelvis,
    spine,
    leftHip: leftLegParts.hip,
    leftKnee: leftLegParts.knee,
    leftAnkle: leftLegParts.ankle,
    rightHip: rightLegParts.hip,
    rightKnee: rightLegParts.knee,
    rightAnkle: rightLegParts.ankle,
    leftShoulder: leftArmParts.shoulder,
    leftElbow: leftArmParts.elbow,
    rightShoulder: rightArmParts.shoulder,
    rightElbow: rightArmParts.elbow,
    head,
  };
}

/**
 * Natural human walk cycle with bent knees, ankle roll, bent elbows, and spine counter-twist.
 */
export function poseAstronautWalk(rig: AstronautRig, phase: number, speedScale = 1): void {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const strideAmp = 0.48 * speedScale;

  // Pelvis natural vertical bob & slight side sway
  rig.pelvis.position.y = 0.91 + Math.abs(c) * 0.035;
  rig.pelvis.rotation.z = s * 0.025;
  rig.pelvis.rotation.y = -s * 0.06;

  // Counter-rotating upper spine & slight forward walk lean
  rig.spine.rotation.x = 0.06 * speedScale;
  rig.spine.rotation.y = s * 0.1;

  // Hips & dynamic knee bend during swing phase
  rig.leftHip.rotation.x = s * strideAmp;
  rig.rightHip.rotation.x = -s * strideAmp;

  rig.leftKnee.rotation.x = Math.max(0.06, -c * 0.68 * speedScale);
  rig.rightKnee.rotation.x = Math.max(0.06, c * 0.68 * speedScale);

  rig.leftAnkle.rotation.x = -s * 0.18;
  rig.rightAnkle.rotation.x = s * 0.18;

  // Natural arms swinging at sides with bent elbows (slight outward clearance from torso)
  rig.leftShoulder.rotation.x = -s * strideAmp * 0.72;
  rig.rightShoulder.rotation.x = s * strideAmp * 0.72;
  rig.leftShoulder.rotation.z = 0.12;
  rig.rightShoulder.rotation.z = -0.12;
  rig.leftElbow.rotation.x = -0.45 - Math.max(0, -s) * 0.35;
  rig.rightElbow.rotation.x = -0.45 - Math.max(0, s) * 0.35;

  rig.head.rotation.y = Math.sin(phase * 0.35) * 0.08;
  rig.head.rotation.x = 0.02;
}

/**
 * Athletic storm sprint cycle with forward lean and high knee/elbow drive.
 */
export function poseAstronautSprint(rig: AstronautRig, phase: number): void {
  const s = Math.sin(phase);
  const c = Math.cos(phase);

  rig.pelvis.position.y = 0.87 + Math.abs(c) * 0.055;
  rig.pelvis.rotation.y = -s * 0.1;
  rig.spine.rotation.x = 0.26;
  rig.spine.rotation.y = s * 0.16;

  rig.leftHip.rotation.x = s * 0.75;
  rig.rightHip.rotation.x = -s * 0.75;
  rig.leftKnee.rotation.x = Math.max(0.15, -c * 1.05 + 0.25);
  rig.rightKnee.rotation.x = Math.max(0.15, c * 1.05 + 0.25);

  rig.leftAnkle.rotation.x = -s * 0.25;
  rig.rightAnkle.rotation.x = s * 0.25;

  rig.leftShoulder.rotation.x = -s * 0.85;
  rig.rightShoulder.rotation.x = s * 0.85;
  rig.leftShoulder.rotation.z = 0.14;
  rig.rightShoulder.rotation.z = -0.14;
  rig.leftElbow.rotation.x = -1.25;
  rig.rightElbow.rotation.x = -1.25;
}

/**
 * Seated spacecraft crew pose actively operating flight consoles or inspecting star-nav holo-map.
 */
export function poseAstronautSeatedTask(
  rig: AstronautRig,
  t: number,
  role: 'pilot' | 'navigator'
): void {
  // Natural seated posture: pelvis tucked down, thighs forward, knees bent down
  rig.pelvis.position.y = 0.56;
  rig.pelvis.rotation.set(0, 0, 0);

  rig.leftHip.rotation.set(-1.28, 0, 0.08);
  rig.rightHip.rotation.set(-1.28, 0, -0.08);
  rig.leftKnee.rotation.set(1.36, 0, 0);
  rig.rightKnee.rotation.set(1.36, 0, 0);
  rig.leftAnkle.rotation.set(-0.08, 0, 0);
  rig.rightAnkle.rotation.set(-0.08, 0, 0);

  if (role === 'pilot') {
    // Leaning slightly forward operating flight console & switches
    rig.spine.rotation.x = 0.16 + Math.sin(t * 1.6) * 0.03;
    rig.spine.rotation.y = 0.22 + Math.sin(t * 0.8) * 0.08;
    rig.head.rotation.y = 0.18 + Math.sin(t * 1.1) * 0.14;
    rig.head.rotation.x = 0.18 + Math.cos(t * 1.4) * 0.05;

    // Right hand actively tapping/adjusting console buttons, left hand on flight controller
    rig.rightShoulder.rotation.set(-0.85 + Math.sin(t * 3.8) * 0.12, -0.15, -0.18);
    rig.rightElbow.rotation.set(-0.85 + Math.cos(t * 4.5) * 0.18, 0, 0);

    rig.leftShoulder.rotation.set(-0.68, 0.12, 0.16);
    rig.leftElbow.rotation.set(-0.95 + Math.sin(t * 2.1) * 0.06, 0, 0);
  } else {
    // Navigator turned inward studying holographic Mars trajectory & gesturing with datapad
    rig.spine.rotation.x = 0.14 + Math.cos(t * 1.3) * 0.03;
    rig.spine.rotation.y = -0.28 + Math.sin(t * 0.9) * 0.07;
    rig.head.rotation.y = -0.24 + Math.sin(t * 1.2) * 0.16;
    rig.head.rotation.x = 0.14 + Math.sin(t * 1.7) * 0.05;

    // Left arm cradling mission tablet, right arm reaching toward holographic star map
    rig.leftShoulder.rotation.set(-0.72, 0.2, 0.18);
    rig.leftElbow.rotation.set(-1.12, 0.2, 0);

    rig.rightShoulder.rotation.set(-0.92 + Math.sin(t * 2.2) * 0.1, -0.22, -0.14);
    rig.rightElbow.rotation.set(-0.72 + Math.sin(t * 2.9) * 0.14, 0, 0);
  }
}

export interface SpacecraftRig {
  group: THREE.Group;
  boosters: THREE.Group[];
  flames: THREE.Mesh[];
  landingLegs: THREE.Group[];
  hatchDoor: THREE.Mesh;
}

/**
 * Multi-stage Ares IV Spacecraft / MAV grounded at y = 0 (bottom of thruster pad / legs).
 */
export function createSpacecraft(textures: ProceduralTextureSet): SpacecraftRig {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hullPanelMap,
    roughness: 0.45,
    metalness: 0.18,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x2a303a,
    roughness: 0.35,
    metalness: 0.78,
  });
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x1b1f26,
    roughness: 0.28,
    metalness: 0.88,
  });
  const boosterMat = new THREE.MeshStandardMaterial({
    color: 0xe8eaef,
    roughness: 0.55,
    metalness: 0.15,
  });
  const orangeTankMat = new THREE.MeshStandardMaterial({
    color: 0xc95a2b,
    roughness: 0.78,
    metalness: 0.05,
  });
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0x162436,
    roughness: 0.08,
    metalness: 0.25,
    clearcoat: 1.0,
  });

  // Main Engine Bell (bottom at y = 0)
  const mainNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.35, 1.6, 20), nozzleMat);
  mainNozzle.position.y = 0.8;
  mainNozzle.castShadow = true;
  group.add(mainNozzle);

  // Lower Propulsion Core
  const lowerStage = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, 7.5, 24), hullMat);
  lowerStage.position.y = 5.3;
  lowerStage.castShadow = true;
  lowerStage.receiveShadow = true;
  group.add(lowerStage);

  // Interstage Ring
  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.9, 24), darkMetalMat);
  interstage.position.y = 9.45;
  group.add(interstage);

  // Upper Crew Module (Lathe silhouette)
  const lathePoints = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(1.85, 0),
    new THREE.Vector2(1.85, 3.2),
    new THREE.Vector2(1.35, 5.2),
    new THREE.Vector2(0.55, 6.2),
    new THREE.Vector2(0.0, 6.35),
  ];
  const crewModuleGeo = new THREE.LatheGeometry(lathePoints, 24);
  const crewModule = new THREE.Mesh(crewModuleGeo, hullMat);
  crewModule.position.y = 9.9;
  crewModule.castShadow = true;
  group.add(crewModule);

  // Cockpit Canopy Window (flush with forward crew module taper)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.72, 0.45), windowMat);
  canopy.position.set(0, 13.28, 1.56);
  canopy.rotation.x = -0.35;
  group.add(canopy);

  // Crew Hatch Door (recessed with frame)
  const hatchFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.85, 0.24), darkMetalMat);
  hatchFrame.position.set(0, 11.1, 1.82);
  group.add(hatchFrame);

  const hatchDoor = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.62, 0.16), orangeTankMat);
  hatchDoor.position.set(0, 11.1, 1.88);
  group.add(hatchDoor);

  // 4 Aerodynamic Stabilizer Fins
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 1.3), darkMetalMat);
    fin.position.set(Math.cos(angle) * 2.1, 3.0, Math.sin(angle) * 2.1);
    fin.rotation.y = -angle;
    fin.castShadow = true;
    group.add(fin);
  }

  // Detachable Side Boosters (2 heavy SRBs) + Exhaust Flame Cones
  const boosters: THREE.Group[] = [];
  const flames: THREE.Mesh[] = [];

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0.92,
  });

  // Central engine flame
  const mainFlame = new THREE.Mesh(new THREE.ConeGeometry(1.15, 7.5, 16), flameMat);
  mainFlame.position.y = -3.6;
  mainFlame.rotation.x = Math.PI;
  mainFlame.visible = false;
  group.add(mainFlame);
  flames.push(mainFlame);

  [-2.75, 2.75].forEach((xPos) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(xPos, 0, 0);

    const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 8.2, 16), boosterMat);
    bBody.position.y = 4.9;
    bBody.castShadow = true;
    bGroup.add(bBody);

    const bBand = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.65, 16), orangeTankMat);
    bBand.position.y = 7.4;
    bGroup.add(bBand);

    const bNose = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.6, 16), darkMetalMat);
    bNose.position.y = 9.8;
    bGroup.add(bNose);

    const bNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 0.9, 14), nozzleMat);
    bNozzle.position.y = 0.45;
    bGroup.add(bNozzle);

    const bStrut = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.35), darkMetalMat);
    bStrut.position.set(xPos > 0 ? -0.6 : 0.6, 5.2, 0);
    bGroup.add(bStrut);

    const bFlame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 6.2, 14), flameMat);
    bFlame.position.y = -3.0;
    bFlame.rotation.x = Math.PI;
    bFlame.visible = false;
    bGroup.add(bFlame);

    group.add(bGroup);
    boosters.push(bGroup);
    flames.push(bFlame);
  });

  // 4 Deployable Landing Legs (for Mars descent & camp)
  const landingLegs: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const legPivot = new THREE.Group();
    legPivot.position.set(Math.cos(angle) * 1.9, 2.2, Math.sin(angle) * 1.9);
    legPivot.rotation.y = -angle;

    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 2.9, 8), darkMetalMat);
    strut.position.set(0.65, -1.1, 0);
    strut.rotation.z = 0.48;
    legPivot.add(strut);

    const footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 10), nozzleMat);
    footPad.position.set(1.32, -2.2, 0);
    legPivot.add(footPad);

    legPivot.visible = false;
    group.add(legPivot);
    landingLegs.push(legPivot);
  }

  return { group, boosters, flames, landingLegs, hatchDoor };
}

export interface EarthLaunchComplex {
  group: THREE.Group;
  accessArm: THREE.Group;
  farewellCrowd: AstronautRig[];
}

/**
 * Earth Orbital Launch Complex: concrete pad, flame trench, gantry tower, crew access arm,
 * and glass-walled observation corridor with waving ground engineers & families.
 */
export function createEarthLaunchComplex(textures: ProceduralTextureSet): EarthLaunchComplex {
  const group = new THREE.Group();

  const apronMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.concreteMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.05,
    roughness: 0.85,
    metalness: 0.05,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x3b4452,
    roughness: 0.48,
    metalness: 0.72,
  });
  const gantryRedMat = new THREE.MeshStandardMaterial({
    color: 0xb83b24,
    roughness: 0.55,
    metalness: 0.4,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd9dde2,
    roughness: 0.65,
    metalness: 0.12,
  });

  // Ground Apron (huge surrounding tarmac + coastal grass apron)
  const tarmac = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), apronMat);
  tarmac.rotation.x = -Math.PI / 2;
  tarmac.receiveShadow = true;
  group.add(tarmac);

  // Raised concrete launch pedestal
  const padBase = new THREE.Mesh(new THREE.BoxGeometry(22, 1.4, 22), wallMat);
  padBase.position.set(0, 0.7, 0);
  padBase.receiveShadow = true;
  group.add(padBase);

  const flamePit = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.1, 14),
    new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.95 })
  );
  flamePit.position.set(0, 1.42, 0);
  group.add(flamePit);

  // Umbilical Gantry Tower (beside the rocket at x = -7.5)
  const tower = new THREE.Group();
  tower.position.set(-7.2, 0, -1.5);
  const colPositions = [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ];
  for (const [cx, cz] of colPositions) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.45, 22, 0.45), gantryRedMat);
    col.position.set(cx, 11, cz);
    col.castShadow = true;
    tower.add(col);
  }
  for (let y = 3; y <= 21; y += 3) {
    const level = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), steelMat);
    level.position.set(0, y, 0);
    tower.add(level);
  }
  group.add(tower);

  // Retractable Crew Access Arm (pivots from tower to rocket hatch at y = 11.2)
  const accessArm = new THREE.Group();
  accessArm.position.set(-5.6, 11.0, 1.4);
  const armBridge = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 1.5), wallMat);
  armBridge.position.set(2.2, 0, 0);
  accessArm.add(armBridge);
  group.add(accessArm);

  // Space Station / Terminal Departure Walkway & Industrial Gate (z = 16 .. 34)
  const corridorFloor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.3, 24), apronMat);
  corridorFloor.position.set(0, 0.15, 24);
  corridorFloor.receiveShadow = true;
  group.add(corridorFloor);

  // Walkway Roof Canopy, Interior Warm Ceiling Light Strips & Pillars
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.28, 22), steelMat);
  roof.position.set(0, 3.85, 25);
  group.add(roof);

  const ceilingLightMat = new THREE.MeshBasicMaterial({ color: 0xffecd2 });
  for (let z = 16; z <= 34; z += 4.5) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.35), ceilingLightMat);
    strip.position.set(0, 3.68, z);
    group.add(strip);
    [-3.4, 3.4].forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.7, 0.26), steelMat);
      post.position.set(x, 1.9, z);
      group.add(post);
    });
  }

  // Launchpad perimeter lightning protection masts
  const mastCoords = [
    [-16, -14],
    [16, -14],
    [-16, 12],
    [16, 12],
  ];
  for (const [mx, mz] of mastCoords) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.32, 26, 8), steelMat);
    mast.position.set(mx, 13, mz);
    group.add(mast);
  }

  // Spaceport Departure Gate Frame at z = 35 (clean industrial airlock portal)
  const gateHeader = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.7, 0.8), steelMat);
  gateHeader.position.set(0, 3.85, 35.5);
  group.add(gateHeader);

  [-3.8, 3.8].forEach((gx) => {
    const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.0, 0.8), steelMat);
    gatePillar.position.set(gx, 2.0, 35.5);
    group.add(gatePillar);
  });

  // 3 Astronaut Crewmates walking forward with us in articulated NASA ACES suits
  const farewellCrowd = [
    createAstronaut(0x2864b8, 'aces'), // Dr. Lin (ACES Orange + Blue trim)
    createAstronaut(0xd99b26, 'aces'), // Eng. Morales (ACES Orange + Gold trim)
    createAstronaut(0x38bdf8, 'aces'), // Cdr. Vance (ACES Orange + Sky trim)
  ];
  farewellCrowd[0].group.position.set(-1.5, 0.3, 29);
  farewellCrowd[1].group.position.set(1.5, 0.3, 28);
  farewellCrowd[2].group.position.set(-0.7, 0.3, 24.5);
  farewellCrowd.forEach((a) => group.add(a.group));

  return { group, accessArm, farewellCrowd };
}

export interface MarsEnvironment {
  group: THREE.Group;
  solarPanels: THREE.Mesh[];
  legacyRover: THREE.Group;
  legacyHab: THREE.Group;
  emergencyCrate: THREE.Group;
  scorchPad: THREE.Mesh;
  sunDisc: THREE.Mesh;
  phobosDisc: THREE.Mesh;
  dustParticles: THREE.Points;
}

/**
 * Complete Mars Valley with terrain mesh, previous Ares I-III legacy habs & rover,
 * solar panels, scattered rocks, craters, and dynamic dust storm particle buffer.
 */
export function createMarsEnvironment(textures: ProceduralTextureSet): MarsEnvironment {
  const group = new THREE.Group();

  // Sculpted Mars Terrain Plane
  const terrainGeo = new THREE.PlaneGeometry(340, 340, 96, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, marsHeightAt(x, z));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.marsSoilMap,
    bumpMap: textures.marsSoilBump,
    bumpScale: 0.22,
    roughness: 0.92,
    metalness: 0.02,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  group.add(terrain);

  // Instanced Martian Rocks & Boulders across the valley
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x6e311d,
    roughness: 0.9,
    metalness: 0.04,
  });
  const rockCount = 160;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();
  for (let i = 0; i < rockCount; i++) {
    const angle = (i * 2.39996) % (Math.PI * 2);
    const dist = 12 + ((i * 17.3) % 125);
    const rx = Math.cos(angle) * dist;
    const rz = -30 + Math.sin(angle) * dist;
    // Keep launch pad clear
    if (Math.hypot(rx, rz + 36) < 12) continue;
    const ry = marsHeightAt(rx, rz);
    const scale = 0.45 + ((i * 7) % 10) * 0.22;
    dummy.position.set(rx, ry + scale * 0.25, rz);
    dummy.rotation.set(i * 0.7, i * 1.1, i * 0.3);
    dummy.scale.set(scale * 1.3, scale * 0.72, scale);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    tintColor.setHSL(0.04 + (i % 5) * 0.008, 0.52, 0.24 + (i % 4) * 0.04);
    rocks.setColorAt(i, tintColor);
  }
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.computeBoundingSphere();
  group.add(rocks);

  // Scorch Pad at MAV Landing/Evacuation Site (0, z = -36)
  const scorchPad = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 32),
    new THREE.MeshStandardMaterial({
      color: 0x261a16,
      roughness: 0.96,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  scorchPad.rotation.x = -Math.PI / 2;
  scorchPad.position.set(0, marsHeightAt(0, -36) + 0.04, -36);
  group.add(scorchPad);

  // Previous Missions' Legacy Outpost: Weathered Ares II Hab Dome (-26, -52)
  const legacyHab = new THREE.Group();
  const habY = marsHeightAt(-26, -52);
  legacyHab.position.set(-26, habY, -52);

  const habBaseMat = new THREE.MeshStandardMaterial({
    color: 0xd5cbc0,
    roughness: 0.68,
    metalness: 0.16,
  });
  const habTrimMat = new THREE.MeshStandardMaterial({
    color: 0x4b5159,
    roughness: 0.42,
    metalness: 0.65,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff8833,
    emissive: 0xff6611,
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  const habRing = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.9, 1.8, 24), habTrimMat);
  habRing.position.y = 0.9;
  habRing.castShadow = true;
  legacyHab.add(habRing);

  const habDome = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    habBaseMat
  );
  habDome.position.y = 1.65;
  habDome.castShadow = true;
  legacyHab.add(habDome);

  // Airlock Tunnel + Glowing Amber Entry Beacon
  const airlock = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 4.2), habTrimMat);
  airlock.position.set(4.5, 1.3, 2.2);
  airlock.rotation.y = Math.PI * 0.28;
  airlock.castShadow = true;
  legacyHab.add(airlock);

  const airlockDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.1, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xc2542d, roughness: 0.45 })
  );
  airlockDoor.position.set(5.9, 1.15, 3.3);
  airlockDoor.rotation.y = Math.PI * 0.28;
  legacyHab.add(airlockDoor);

  const habBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), beaconMat);
  habBeacon.position.set(0, 7.4, 0);
  legacyHab.add(habBeacon);

  const habMast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.6, 8), habTrimMat);
  habMast.position.set(0, 6.2, 0);
  legacyHab.add(habMast);

  const habPointLight = new THREE.PointLight(0xff7722, 6, 24, 1.5);
  habPointLight.position.set(6.4, 2.5, 3.8);
  legacyHab.add(habPointLight);

  group.add(legacyHab);

  // Secondary Older Ares I Supply Dome further back (-44, -68) for "several previous missions"
  const oldHab = new THREE.Group();
  oldHab.position.set(-44, marsHeightAt(-44, -68), -68);
  const oldShell = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.1, 3.2, 18), habBaseMat);
  oldShell.position.y = 1.6;
  oldHab.add(oldShell);
  const oldCap = new THREE.Mesh(
    new THREE.SphereGeometry(3.8, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    habTrimMat
  );
  oldCap.position.y = 3.1;
  oldHab.add(oldCap);
  group.add(oldHab);

  // Solar Array Farm (4 tracking panels near legacy hab)
  const solarPanels: THREE.Mesh[] = [];
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.solarCellMap,
    roughness: 0.25,
    metalness: 0.55,
  });
  for (let i = 0; i < 4; i++) {
    const sx = -16 - i * 4.2;
    const sz = -64;
    const sy = marsHeightAt(sx, sz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.1, 8), habTrimMat);
    pole.position.set(sx, sy + 1.05, sz);
    group.add(pole);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 2.2), solarMat);
    panel.position.set(sx, sy + 2.15, sz);
    panel.rotation.x = 0.45;
    panel.castShadow = true;
    group.add(panel);
    solarPanels.push(panel);
  }

  // Legacy Ares III 6-Wheel Rover parked near (-14, -44)
  const legacyRover = new THREE.Group();
  legacyRover.position.set(-14, marsHeightAt(-14, -44), -44);
  legacyRover.rotation.y = 0.65;
  const roverChassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 3.2), habBaseMat);
  roverChassis.position.y = 0.95;
  roverChassis.castShadow = true;
  legacyRover.add(roverChassis);
  const roverMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 8), habTrimMat);
  roverMast.position.set(0, 1.9, 1.0);
  legacyRover.add(roverMast);
  const roverCam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.3), habTrimMat);
  roverCam.position.set(0, 2.5, 1.05);
  legacyRover.add(roverCam);
  for (const wx of [-1.25, 1.25]) {
    for (const wz of [-1.15, 0, 1.15]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14), habTrimMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.42, wz);
      legacyRover.add(wheel);
    }
  }
  group.add(legacyRover);

  // Memorial Flag / Previous Mission Marker at (-10, -52)
  const flagX = -10;
  const flagZ = -52;
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), habTrimMat);
  flagPole.position.set(flagX, marsHeightAt(flagX, flagZ) + 1.3, flagZ);
  group.add(flagPole);
  const flagCloth = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.58, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x24559c, roughness: 0.7 })
  );
  flagCloth.position.set(flagX + 0.48, marsHeightAt(flagX, flagZ) + 2.25, flagZ);
  group.add(flagCloth);

  // Emergency Supply Crate (at 12, -16) for Survival Prologue objective #1
  const emergencyCrate = new THREE.Group();
  emergencyCrate.position.set(12, marsHeightAt(12, -16), -16);
  const crateBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.95, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.48, metalness: 0.25 })
  );
  crateBody.position.y = 0.48;
  crateBody.castShadow = true;
  emergencyCrate.add(crateBody);
  const crateLid = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.16, 1.16), habTrimMat);
  crateLid.position.y = 0.96;
  emergencyCrate.add(crateLid);
  const crateBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), beaconMat);
  crateBeacon.position.set(0.55, 1.12, 0.35);
  emergencyCrate.add(crateBeacon);
  group.add(emergencyCrate);

  // Sun & Phobos Discs for Timelapse Sky
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe4bd })
  );
  sunDisc.position.set(45, 55, -140);
  group.add(sunDisc);

  const phobosDisc = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x9b8c82, roughness: 0.95 })
  );
  phobosDisc.position.set(-30, 48, -120);
  group.add(phobosDisc);

  // Dynamic Dust Particle Cloud (used heavily in storm + subtle ambient Mars dust)
  const pCount = 900;
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 140;
    pPositions[i * 3 + 1] = Math.random() * 24;
    pPositions[i * 3 + 2] = -30 + (Math.random() - 0.5) * 140;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xd47d4a,
    size: 0.42,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
  });
  const dustParticles = new THREE.Points(pGeo, pMat);
  group.add(dustParticles);

  return {
    group,
    solarPanels,
    legacyRover,
    legacyHab,
    emergencyCrate,
    scorchPad,
    sunDisc,
    phobosDisc,
    dustParticles,
  };
}
