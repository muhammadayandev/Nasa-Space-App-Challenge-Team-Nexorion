import * as THREE from 'three';
import { FIELD_SAMPLES, ModuleId, OutpostSiteId } from '../data/missionScenarios';
import { ProceduralTextureSet } from './textures';

export function groundHeightAt(x: number, z: number, site: OutpostSiteId): number {
  const dist = Math.hypot(x, z);
  const flatFactor = THREE.MathUtils.smoothstep(dist, 11.2, 22.5);

  if (site === 'moon') {
    const rim = Math.pow(Math.max(0, dist - 20) * 0.08, 1.35) * 1.1;
    const ripples =
      Math.sin(x * 0.14 + 0.5) * Math.cos(z * 0.14 - 0.3) * 1.3 +
      Math.sin(x * 0.31 - z * 0.23) * 0.45;
    const crater1 = Math.max(0, 1 - Math.hypot(x - 19, z + 15) / 7.5);
    const crater2 = Math.max(0, 1 - Math.hypot(x + 22, z - 12) / 9);
    return flatFactor * (ripples + rim - crater1 * 2.1 - crater2 * 2.4);
  }

  const ridge = Math.pow(Math.max(0, dist - 22) * 0.075, 1.25) * 0.95;
  const dunes =
    Math.sin(x * 0.12 - z * 0.09) * 1.15 +
    Math.cos(x * 0.27 + z * 0.21) * 0.42;
  const basin = Math.max(0, 1 - Math.hypot(x + 17, z + 18) / 8.5);
  return flatFactor * (dunes + ridge - basin * 1.6);
}

export interface AstronautHandle {
  name: string;
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  suitAccentMat: THREE.MeshStandardMaterial;
  homePos: THREE.Vector2;
  workPos: THREE.Vector2;
}

export interface SpacecraftHandle {
  group: THREE.Group;
  thrusterFlame: THREE.Mesh;
  legs: THREE.Mesh[];
}

export interface OutpostDynamicHandles {
  outpostRoot: THREE.Group;
  moduleGroups: Record<Exclude<ModuleId, 'overview'>, THREE.Group>;
  clickableProxies: THREE.Mesh[];
  shieldShutters: THREE.Mesh[];
  shieldBubble: THREE.Mesh;
  cabinGlowMat: THREE.MeshStandardMaterial;
  solarWings: THREE.Group[];
  solarCellMat: THREE.MeshStandardMaterial;
  growLightMat: THREE.MeshStandardMaterial;
  growPointLight: THREE.PointLight;
  cropInstanced: THREE.InstancedMesh;
  lifeFan: THREE.Group;
  commsHead: THREE.Group;
  commsBeaconMat: THREE.MeshStandardMaterial;
  commsBeam: THREE.Mesh;
  roverGroup: THREE.Group;
  roverWheels: THREE.Mesh[];
  roverArm: THREE.Group;
  playerAstro: AstronautHandle;
  playerMarker: THREE.Mesh;
  npcAstronauts: AstronautHandle[];
  stationRings: Record<string, THREE.Mesh>;
  sampleNodes: Record<string, THREE.Group>;
  walkTargetRing: THREE.Mesh;
  landingPadPos: THREE.Vector3;
  landedShip: SpacecraftHandle;
  selectionRing: THREE.Mesh;
}

function addContactShadow(
  parent: THREE.Object3D,
  radius: number,
  shadowTex: THREE.CanvasTexture
) {
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.48,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.02;
  parent.add(plane);
}

function tagInteractiveProxy(
  parent: THREE.Group,
  moduleId: Exclude<ModuleId, 'overview'>,
  w: number,
  h: number,
  d: number,
  proxies: THREE.Mesh[]
) {
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  proxy.position.y = h * 0.5;
  proxy.layers.set(1);
  proxy.userData.moduleId = moduleId;
  parent.add(proxy);
  proxies.push(proxy);
}

function createAstronaut(
  name: string,
  accentHex: number,
  shadowTex: THREE.CanvasTexture,
  proxies: THREE.Mesh[],
  homePos: THREE.Vector2,
  workPos: THREE.Vector2
): AstronautHandle {
  const group = new THREE.Group();
  addContactShadow(group, 0.55, shadowTex);

  const suitWhite = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.62,
    metalness: 0.08,
  });
  const suitAccent = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.45,
    metalness: 0.15,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
    metalness: 0.1,
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.08,
    metalness: 0.92,
    clearcoat: 1.0,
  });

  // Left & Right Legs (pivoted at hip y = 0.56)
  const makeLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.56, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.44, 10), suitWhite);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    legPivot.add(thigh);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.28), bootMat);
    boot.position.set(0, -0.49, 0.04);
    boot.castShadow = true;
    legPivot.add(boot);
    return legPivot;
  };

  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  group.add(leftLeg, rightLeg);

  // Torso + Colored Chest Stripe + Belt
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.28), suitWhite);
  torso.position.y = 0.85;
  torso.castShadow = true;
  group.add(torso);

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.3), suitAccent);
  badge.position.y = 0.9;
  group.add(badge);

  // PLSS Life-Support Backpack + Antenna
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.2), suitWhite);
  pack.position.set(0, 0.88, -0.22);
  pack.castShadow = true;
  group.add(pack);

  const packStripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.22), suitAccent);
  packStripe.position.set(0, 1.02, -0.22);
  group.add(packStripe);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 6), bootMat);
  antenna.position.set(0.14, 1.24, -0.26);
  group.add(antenna);

  // Left & Right Arms (pivoted at shoulder y = 1.06)
  const makeArm = (xOff: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOff, 1.06, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 10), suitWhite);
    sleeve.position.y = -0.2;
    sleeve.castShadow = true;
    armPivot.add(sleeve);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), suitAccent);
    glove.position.y = -0.43;
    armPivot.add(glove);
    return armPivot;
  };

  const leftArm = makeArm(-0.3);
  const rightArm = makeArm(0.3);
  group.add(leftArm, rightArm);

  // Helmet + Gold Reflective Visor
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), suitWhite);
  helmet.position.y = 1.32;
  helmet.castShadow = true;
  group.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 14, 12, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.2, Math.PI * 0.55),
    visorMat
  );
  visor.rotation.y = Math.PI * 0.5;
  visor.position.set(0, 1.33, 0.06);
  group.add(visor);

  tagInteractiveProxy(group, 'crew', 1.1, 1.75, 1.1, proxies);

  return {
    name,
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    suitAccentMat: suitAccent,
    homePos,
    workPos,
  };
}

export function buildSpacecraft(
  textures: ProceduralTextureSet,
  withFlames = true
): SpacecraftHandle {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    map: textures.hullPanels,
    roughness: 0.34,
    metalness: 0.58,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.85,
  });
  const goldFoilMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.92,
    anisotropy: 0.7,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: textures.solarCell,
    roughness: 0.2,
    metalness: 0.65,
  });

  // 1. Service Module Cylinder
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 1.5, 20), darkMetalMat);
  service.position.y = 1.65;
  service.castShadow = true;
  group.add(service);

  const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.38, 20), goldFoilMat);
  goldBand.position.y = 1.25;
  group.add(goldBand);

  // 2. Heat Shield Ring & Crew Capsule Cone
  const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.02, 0.22, 20), darkMetalMat);
  heatShield.position.y = 2.48;
  group.add(heatShield);

  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.12, 1.25, 20), hullMat);
  capsule.position.y = 3.2;
  capsule.castShadow = true;
  group.add(capsule);

  const noseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 0.3, 16), darkMetalMat);
  noseCap.position.y = 3.96;
  group.add(noseCap);

  // Cabin Window
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.2, 0.14),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.4,
    })
  );
  win.position.set(0, 3.25, 0.84);
  win.rotation.x = -0.35;
  group.add(win);

  // 3. 4 Solar Array Wings
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.55), solarMat);
    wing.position.set(Math.cos(ang) * 1.85, 1.75, Math.sin(ang) * 1.85);
    wing.rotation.y = -ang;
    wing.castShadow = true;
    group.add(wing);
  }

  // 4. Engine Nozzle + Thruster Flame Cone
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.45, 0.52, 16), darkMetalMat);
  nozzle.position.y = 0.72;
  group.add(nozzle);

  const thrusterFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 2.2, 14),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: withFlames ? 0.85 : 0,
      depthWrite: false,
    })
  );
  thrusterFlame.rotation.x = Math.PI;
  thrusterFlame.position.y = -0.55;
  group.add(thrusterFlame);

  // 5. 4 Landing Legs
  const legs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.35, 8), darkMetalMat);
    leg.position.set(Math.cos(ang) * 1.15, 0.62, Math.sin(ang) * 1.15);
    leg.rotation.z = Math.cos(ang) * 0.36;
    leg.rotation.x = -Math.sin(ang) * 0.36;
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  }

  return { group, thrusterFlame, legs };
}

export function buildOutpostModules(
  parent: THREE.Object3D,
  textures: ProceduralTextureSet,
  site: OutpostSiteId,
  isSoftwareGl: boolean
): OutpostDynamicHandles {
  const outpostRoot = new THREE.Group();
  parent.add(outpostRoot);

  const clickableProxies: THREE.Mesh[] = [];

  const concretePadMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.88,
    metalness: 0.08,
  });
  const hullMat = new THREE.MeshStandardMaterial({
    map: textures.hullPanels,
    roughness: 0.36,
    metalness: 0.55,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.85,
  });
  const brushedGoldMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.94,
    anisotropy: 0.8,
  });
  const accentOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.42,
    metalness: 0.15,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    roughness: 0.08,
    metalness: 0.0,
    transmission: isSoftwareGl ? 0 : 0.72,
    transparent: true,
    opacity: isSoftwareGl ? 0.36 : 0.48,
    ior: 1.5,
    thickness: 0.6,
    clearcoat: 1.0,
    depthWrite: false,
  });

  // 1. HABITAT & RADIATION STORM SHELTER
  const habitat = new THREE.Group();
  habitat.position.set(0, groundHeightAt(0, 0, site), 0);
  addContactShadow(habitat, 4.6, textures.contactShadow);

  const habPad = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.1, 0.35, 8), concretePadMat);
  habPad.position.y = 0.175;
  habPad.castShadow = true;
  habPad.receiveShadow = true;
  habitat.add(habPad);

  const habLowerRing = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.3, 1.35, 16), hullMat);
  habLowerRing.position.y = 1.02;
  habLowerRing.castShadow = true;
  habLowerRing.receiveShadow = true;
  habitat.add(habLowerRing);

  const habDome = new THREE.Mesh(
    new THREE.SphereGeometry(3.05, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48),
    hullMat
  );
  habDome.position.y = 1.68;
  habDome.castShadow = true;
  habitat.add(habDome);

  const cupolaRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 10, 24), brushedGoldMat);
  cupolaRing.rotation.x = Math.PI / 2;
  cupolaRing.position.y = 4.62;
  habitat.add(cupolaRing);

  const cupolaGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.92, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    glassMat
  );
  cupolaGlass.position.y = 4.62;
  cupolaGlass.renderOrder = 5;
  habitat.add(cupolaGlass);

  const cabinGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.3,
    roughness: 0.2,
  });
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.3;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.18), cabinGlowMat);
    win.position.set(Math.cos(ang) * 3.16, 1.25, Math.sin(ang) * 3.16);
    win.rotation.y = -ang + Math.PI / 2;
    habitat.add(win);
  }

  const airlock = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.2, 12), darkMetalMat);
  airlock.rotation.z = Math.PI / 2;
  airlock.position.set(3.6, 1.15, 0);
  airlock.castShadow = true;
  habitat.add(airlock);

  const airlockDoor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 1.0), accentOrangeMat);
  airlockDoor.position.set(4.65, 1.15, 0);
  habitat.add(airlockDoor);

  const shieldShutters: THREE.Mesh[] = [];
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.35,
    metalness: 0.7,
  });
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.14), shutterMat);
    shutter.position.set(Math.cos(ang) * 3.25, 2.2, Math.sin(ang) * 3.25);
    shutter.rotation.y = -ang + Math.PI / 2;
    shutter.userData.baseAngle = ang;
    habitat.add(shutter);
    shieldShutters.push(shutter);
  }

  const shieldBubble = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4.3, 2),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    })
  );
  shieldBubble.position.y = 1.6;
  shieldBubble.renderOrder = 8;
  habitat.add(shieldBubble);

  tagInteractiveProxy(habitat, 'habitat', 7.4, 5.4, 7.4, clickableProxies);
  outpostRoot.add(habitat);

  // 2. HYDROPONICS GREENHOUSE
  const greenhouse = new THREE.Group();
  greenhouse.position.set(7.2, groundHeightAt(7.2, 0, site), 0);
  addContactShadow(greenhouse, 3.8, textures.contactShadow);

  const ghBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 3.8), concretePadMat);
  ghBase.position.y = 0.225;
  ghBase.castShadow = true;
  ghBase.receiveShadow = true;
  greenhouse.add(ghBase);

  const trayMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
  for (const zOff of [-0.95, 0.95]) {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, 1.15), trayMat);
    tray.position.set(0, 0.62, zOff);
    greenhouse.add(tray);
  }

  const leafGeo = new THREE.DodecahedronGeometry(0.24, 0);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72, metalness: 0.02 });
  const cropCount = 28;
  const cropInstanced = new THREE.InstancedMesh(leafGeo, leafMat, cropCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < cropCount; i++) {
    const row = i < 14 ? -0.95 : 0.95;
    const col = i % 14;
    const xPos = -2.0 + (col % 7) * 0.66;
    const zJitter = (Math.floor(col / 7) - 0.5) * 0.42;
    dummy.position.set(xPos, 0.92, row + zJitter);
    dummy.scale.setScalar(0.85 + (i % 3) * 0.15);
    dummy.updateMatrix();
    cropInstanced.setMatrixAt(i, dummy.matrix);
    cropInstanced.setColorAt(i, new THREE.Color(i % 2 === 0 ? 0x22c55e : 0x4ade80));
  }
  cropInstanced.instanceMatrix.needsUpdate = true;
  if (cropInstanced.instanceColor) cropInstanced.instanceColor.needsUpdate = true;
  cropInstanced.computeBoundingSphere();
  greenhouse.add(cropInstanced);

  const ribMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 });
  for (let i = -2; i <= 2; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(i * 1.25, 0.45, -1.8),
      new THREE.Vector3(i * 1.25, 2.35, -1.2),
      new THREE.Vector3(i * 1.25, 2.85, 0),
      new THREE.Vector3(i * 1.25, 2.35, 1.2),
      new THREE.Vector3(i * 1.25, 0.45, 1.8),
    ]);
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.07, 8, false), ribMat);
    rib.castShadow = true;
    greenhouse.add(rib);
  }

  const growLightMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xe879f9,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const growBar = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 0.25), growLightMat);
  growBar.position.set(0, 2.45, 0);
  greenhouse.add(growBar);

  const growPointLight = new THREE.PointLight(0xf0abfc, 2.2, 9);
  growPointLight.position.set(0, 2.1, 0);
  greenhouse.add(growPointLight);

  const ghCanopyGeo = new THREE.CylinderGeometry(1.85, 1.85, 5.2, 20, 1, false, 0, Math.PI);
  ghCanopyGeo.rotateZ(Math.PI / 2);
  ghCanopyGeo.rotateX(-Math.PI / 2);
  const ghCanopy = new THREE.Mesh(ghCanopyGeo, glassMat);
  ghCanopy.position.set(0, 0.85, 0);
  ghCanopy.scale.set(1, 1.15, 1);
  ghCanopy.renderOrder = 6;
  greenhouse.add(ghCanopy);

  tagInteractiveProxy(greenhouse, 'greenhouse', 5.8, 3.2, 4.0, clickableProxies);
  outpostRoot.add(greenhouse);

  // 3. SOLAR ARRAY FARM
  const solar = new THREE.Group();
  solar.position.set(-7.6, groundHeightAt(-7.6, -3.2, site), -3.2);
  addContactShadow(solar, 4.0, textures.contactShadow);

  const solarCellMat = new THREE.MeshStandardMaterial({
    map: textures.solarCell,
    roughness: 0.22,
    metalness: 0.65,
    emissive: 0x0c4a6e,
    emissiveIntensity: 0.15,
  });

  const solarWings: THREE.Group[] = [];
  for (let i = 0; i < 2; i++) {
    const zPos = i === 0 ? -1.8 : 1.8;
    const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.35, 8), concretePadMat);
    mastBase.position.set(0, 0.175, zPos);
    solar.add(mastBase);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.1, 10), darkMetalMat);
    mast.position.set(0, 1.2, zPos);
    mast.castShadow = true;
    solar.add(mast);

    const wingPivot = new THREE.Group();
    wingPivot.position.set(0, 2.25, zPos);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 2.1), darkMetalMat);
    frame.castShadow = true;
    wingPivot.add(frame);

    const cells = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 1.92), solarCellMat);
    cells.position.y = 0.02;
    wingPivot.add(cells);

    solar.add(wingPivot);
    solarWings.push(wingPivot);
  }

  const battRack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.1), hullMat);
  battRack.position.set(2.2, 0.7, 0);
  battRack.castShadow = true;
  solar.add(battRack);

  const battTrim = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.2, 1.14), brushedGoldMat);
  battTrim.position.set(2.2, 1.3, 0);
  solar.add(battTrim);

  tagInteractiveProxy(solar, 'solar', 6.5, 3.6, 6.2, clickableProxies);
  outpostRoot.add(solar);

  // 4. LIFE SUPPORT & WATER RECYCLER
  const lifesupport = new THREE.Group();
  lifesupport.position.set(-4.2, groundHeightAt(-4.2, 5.8, site), 5.8);
  addContactShadow(lifesupport, 3.2, textures.contactShadow);

  const lsPad = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 3.4), concretePadMat);
  lsPad.position.y = 0.175;
  lsPad.receiveShadow = true;
  lifesupport.add(lsPad);

  const o2TankMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.28,
    metalness: 0.72,
  });
  for (const xOff of [-1.15, 0.1]) {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 16), o2TankMat);
    tank.position.set(xOff, 1.25, -0.45);
    tank.castShadow = true;
    lifesupport.add(tank);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.45, 12), darkMetalMat);
    collar.position.set(xOff, 0.42, -0.45);
    lifesupport.add(collar);
  }

  const scrubber = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.3, 16), hullMat);
  scrubber.position.set(1.35, 1.45, 0.2);
  scrubber.castShadow = true;
  lifesupport.add(scrubber);

  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.15, 1.9, -0.45),
    new THREE.Vector3(0.1, 2.35, -0.1),
    new THREE.Vector3(1.35, 2.1, 0.2),
  ]);
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 20, 0.11, 8, false), brushedGoldMat);
  lifesupport.add(pipe);

  const lifeFan = new THREE.Group();
  lifeFan.position.set(-0.5, 1.35, 1.05);
  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12), accentOrangeMat);
  fanHub.rotation.x = Math.PI / 2;
  lifeFan.add(fanHub);
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75, 0.04), darkMetalMat);
    blade.rotation.z = (b * Math.PI) / 2;
    lifeFan.add(blade);
  }
  lifesupport.add(lifeFan);

  tagInteractiveProxy(lifesupport, 'lifesupport', 4.6, 3.0, 3.6, clickableProxies);
  outpostRoot.add(lifesupport);

  // 5. DEEP SPACE COMMS DISH
  const comms = new THREE.Group();
  comms.position.set(3.2, groundHeightAt(3.2, -6.8, site), -6.8);
  addContactShadow(comms, 2.6, textures.contactShadow);

  const commsBase = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 0.4, 8), concretePadMat);
  commsBase.position.y = 0.2;
  comms.add(commsBase);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 2.6, 12), darkMetalMat);
  tower.position.y = 1.6;
  tower.castShadow = true;
  comms.add(tower);

  const commsHead = new THREE.Group();
  commsHead.position.set(0, 3.0, 0);

  const dishPoints = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.55, 0.12),
    new THREE.Vector2(1.15, 0.42),
    new THREE.Vector2(1.6, 0.85),
  ];
  const dishGeo = new THREE.LatheGeometry(dishPoints, 24);
  dishGeo.computeTangents();
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = Math.PI * 0.32;
  dish.castShadow = true;
  commsHead.add(dish);

  const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.15, 10), brushedGoldMat);
  feedHorn.position.set(0, 0.72, 0.72);
  feedHorn.rotation.x = Math.PI * 0.32;
  commsHead.add(feedHorn);

  const commsBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  const beaconTip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), commsBeaconMat);
  beaconTip.position.set(0, 1.06, 1.18);
  commsHead.add(beaconTip);

  const commsBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.18, 9, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  commsBeam.position.set(0, 3.8, 3.4);
  commsBeam.rotation.x = Math.PI * 0.28;
  commsHead.add(commsBeam);

  comms.add(commsHead);
  tagInteractiveProxy(comms, 'comms', 3.6, 4.8, 3.6, clickableProxies);
  outpostRoot.add(comms);

  // 6. SCIENCE ROVER & DRILL
  const science = new THREE.Group();
  science.position.set(4.8, groundHeightAt(4.8, 6.2, site), 6.2);

  const roverGroup = new THREE.Group();
  addContactShadow(roverGroup, 1.75, textures.contactShadow);

  const roverBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.58, 2.05), hullMat);
  roverBody.position.y = 0.72;
  roverBody.castShadow = true;
  roverGroup.add(roverBody);

  const roverDeck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.6), brushedGoldMat);
  roverDeck.position.y = 1.04;
  roverGroup.add(roverDeck);

  const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.85, 8), darkMetalMat);
  mastPole.position.set(0.3, 1.45, 0.55);
  roverGroup.add(mastPole);

  const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.28), hullMat);
  camHead.position.set(0.3, 1.88, 0.55);
  roverGroup.add(camHead);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12),
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.9,
      roughness: 0.15,
    })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.3, 1.88, 0.71);
  roverGroup.add(lens);

  const roverWheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const xSide of [-0.92, 0.92]) {
    for (const zWheel of [-0.78, 0, 0.78]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMetalMat);
      wheel.position.set(xSide, 0.28, zWheel);
      wheel.castShadow = true;
      roverGroup.add(wheel);
      roverWheels.push(wheel);
    }
  }

  const roverArm = new THREE.Group();
  roverArm.position.set(-0.25, 0.75, 1.02);
  const armSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.75), accentOrangeMat);
  armSeg1.position.z = 0.35;
  roverArm.add(armSeg1);
  const drillHead = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 8), darkMetalMat);
  drillHead.rotation.x = Math.PI / 2;
  drillHead.position.z = 0.85;
  roverArm.add(drillHead);
  roverGroup.add(roverArm);

  science.add(roverGroup);
  tagInteractiveProxy(science, 'science', 3.4, 2.5, 3.6, clickableProxies);
  outpostRoot.add(science);

  // 7. LANDING PAD & ARRIVAL SPACECRAFT (x: 8.8, z: -6.2)
  const landingPadPos = new THREE.Vector3(8.8, groundHeightAt(8.8, -6.2, site), -6.2);
  const padGroup = new THREE.Group();
  padGroup.position.copy(landingPadPos);

  const padSlab = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.25, 12), concretePadMat);
  padSlab.position.y = 0.125;
  padSlab.receiveShadow = true;
  padGroup.add(padSlab);

  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.45, 32),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
  );
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.26;
  padGroup.add(padRing);

  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.4,
      })
    );
    beacon.position.set(Math.cos(ang) * 2.9, 0.32, Math.sin(ang) * 2.9);
    padGroup.add(beacon);
  }
  outpostRoot.add(padGroup);

  const landedShip = buildSpacecraft(textures, true);
  landedShip.group.position.copy(landingPadPos);
  landedShip.group.position.y += 0.25;
  outpostRoot.add(landedShip.group);

  // 8. PLAYABLE PLAYER (Commander Maya) & NPC TEAMMATES (Leo & Zara)
  const crewGroup = new THREE.Group();
  const playerAstro = createAstronaut(
    'Commander Maya',
    0xea580c,
    textures.contactShadow,
    clickableProxies,
    new THREE.Vector2(1.4, 4.4),
    new THREE.Vector2(2.6, 5.2)
  );
  playerAstro.group.position.set(
    playerAstro.workPos.x,
    groundHeightAt(playerAstro.workPos.x, playerAstro.workPos.y, site),
    playerAstro.workPos.y
  );
  const playerMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 28),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    })
  );
  playerMarker.rotation.x = -Math.PI / 2;
  playerMarker.position.y = 0.04;
  playerAstro.group.add(playerMarker);
  outpostRoot.add(playerAstro.group);

  const npcAstronauts: AstronautHandle[] = [];

  npcAstronauts.forEach((astro) => {
    astro.group.position.set(
      astro.workPos.x,
      groundHeightAt(astro.workPos.x, astro.workPos.y, site),
      astro.workPos.y
    );
    crewGroup.add(astro.group);
  });
  outpostRoot.add(crewGroup);

  // Subtle ground interaction rings around the 6 outpost stations
  const stationRings: Record<string, THREE.Mesh> = {};
  const stationRingConfigs: Array<{ id: string; x: number; z: number; r: number }> = [
    { id: 'habitat', x: 0, z: 0, r: 4.5 },
    { id: 'greenhouse', x: 7.2, z: 0, r: 3.6 },
    { id: 'solar', x: -7.6, z: -3.2, r: 3.8 },
    { id: 'lifesupport', x: -4.2, z: 5.8, r: 3.3 },
    { id: 'comms', x: 3.2, z: -6.8, r: 2.5 },
    { id: 'science', x: 4.8, z: 6.2, r: 2.8 },
  ];
  stationRingConfigs.forEach((cfg) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(cfg.r - 0.14, cfg.r, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cfg.x, groundHeightAt(cfg.x, cfg.z, site) + 0.04, cfg.z);
    outpostRoot.add(ring);
    stationRings[cfg.id] = ring;
  });

  // Collectible 3D Martian/Lunar Field Samples & Resource Caches
  const sampleNodes: Record<string, THREE.Group> = {};
  FIELD_SAMPLES.forEach((smp) => {
    const smpGroup = new THREE.Group();
    const sy = groundHeightAt(smp.x, smp.z, site);
    smpGroup.position.set(smp.x, sy, smp.z);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({
        color: smp.colorHex,
        emissive: smp.colorHex,
        emissiveIntensity: 0.9,
        roughness: 0.15,
        metalness: 0.25,
      })
    );
    crystal.position.y = 0.85;
    crystal.castShadow = true;
    crystal.userData.isCrystal = true;
    smpGroup.add(crystal);

    const haloRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.86, 28),
      new THREE.MeshBasicMaterial({
        color: smp.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      })
    );
    haloRing.rotation.x = -Math.PI / 2;
    haloRing.position.y = 0.05;
    smpGroup.add(haloRing);

    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.16, 2.4, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: smp.colorHex,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beaconBeam.position.y = 1.2;
    smpGroup.add(beaconBeam);

    outpostRoot.add(smpGroup);
    sampleNodes[smp.id] = smpGroup;
  });

  // Destination Ring shown when clicking on terrain to walk
  const walkTargetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.55, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  walkTargetRing.rotation.x = -Math.PI / 2;
  walkTargetRing.visible = false;
  outpostRoot.add(walkTargetRing);

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 2.95, 48),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.visible = false;
  outpostRoot.add(selectionRing);

  return {
    outpostRoot,
    moduleGroups: {
      crew: crewGroup,
      habitat,
      solar,
      greenhouse,
      lifesupport,
      comms,
      science,
    },
    clickableProxies,
    shieldShutters,
    shieldBubble,
    cabinGlowMat,
    solarWings,
    solarCellMat,
    growLightMat,
    growPointLight,
    cropInstanced,
    lifeFan,
    commsHead,
    commsBeaconMat,
    commsBeam,
    roverGroup,
    roverWheels,
    roverArm,
    playerAstro,
    playerMarker,
    npcAstronauts,
    stationRings,
    sampleNodes,
    walkTargetRing,
    landingPadPos,
    landedShip,
    selectionRing,
  };
}
