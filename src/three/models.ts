import * as THREE from 'three';
import { AstronautRig, createAstronaut as createDetailedEvaRig } from '../cutscene/scene/models';
import { FIELD_SAMPLES, ModuleId, OutpostSiteId } from '../data/missionScenarios';
import { buildRealisticCropBed } from './cropVisuals';
import { ProceduralTextureSet } from './textures';

export function groundHeightAt(x: number, z: number, site: OutpostSiteId): number {
  const dist = Math.hypot(x, z);
  const flatFactor = THREE.MathUtils.smoothstep(dist, 28.0, 48.0);

  if (site === 'moon') {
    const rim = Math.pow(Math.max(0, dist - 34) * 0.08, 1.35) * 1.1;
    const ripples =
      Math.sin(x * 0.12 + 0.5) * Math.cos(z * 0.12 - 0.3) * 1.45 +
      Math.sin(x * 0.28 - z * 0.21) * 0.5;
    const crater1 = Math.max(0, 1 - Math.hypot(x - 36, z + 28) / 10);
    const crater2 = Math.max(0, 1 - Math.hypot(x + 38, z - 24) / 12);
    return flatFactor * (ripples + rim - crater1 * 2.4 - crater2 * 2.8);
  }

  const ridge = Math.pow(Math.max(0, dist - 36) * 0.075, 1.25) * 1.05;
  const dunes =
    Math.sin(x * 0.08 - z * 0.07) * 1.25 +
    Math.cos(x * 0.22 + z * 0.18) * 0.48;
  const basin = Math.max(0, 1 - Math.hypot(x + 32, z + 30) / 11.0);
  return flatFactor * (dunes + ridge - basin * 1.8);
}

export interface AstronautHandle {
  name: string;
  rig: AstronautRig;
  group: THREE.Group;
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
  solarDustMat: THREE.MeshStandardMaterial;
  growLightMat: THREE.MeshStandardMaterial;
  growPointLight: THREE.PointLight;
  exteriorCropBedStages: Array<[THREE.Group, THREE.Group, THREE.Group]>;
  lifeFan: THREE.Group;
  commsHead: THREE.Group;
  commsBeaconMat: THREE.MeshStandardMaterial;
  commsBeam: THREE.Mesh;
  roverGroup: THREE.Group;
  roverWheels: THREE.Object3D[];
  roverArm: THREE.Group;
  playerAstro: AstronautHandle;
  playerMarker: THREE.Mesh;
  npcAstronauts: AstronautHandle[];
  stationRings: Record<string, THREE.Mesh>;
  sampleNodes: Record<string, THREE.Group>;
  walkTargetRing: THREE.Mesh;
  landingPadPos: THREE.Vector3;
  landedShip: SpacecraftHandle;
  rescueShip: SpacecraftHandle;
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
  const rig = createDetailedEvaRig(accentHex, 'eva');
  rig.group.scale.setScalar(1.12);
  addContactShadow(rig.group, 0.56, shadowTex);
  tagInteractiveProxy(rig.group, 'crew', 1.1, 2.0, 1.1, proxies);

  return {
    name,
    rig,
    group: rig.group,
    suitAccentMat: rig.accentMat,
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

  // 1. LARGE MAIN SPACE STATION & STORM SHELTER (longer wings & taller multi-deck tower)
  const habitat = new THREE.Group();
  habitat.position.set(0, groundHeightAt(0, 0, site), 0);
  addContactShadow(habitat, 8.8, textures.contactShadow);

  const habPad = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.6, 0.45, 10), concretePadMat);
  habPad.position.y = 0.225;
  habPad.castShadow = true;
  habPad.receiveShadow = true;
  habitat.add(habPad);

  // Extended east-west plinth for elongated station wings
  const wingPad = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.36, 5.2), concretePadMat);
  wingPad.position.y = 0.18;
  wingPad.receiveShadow = true;
  habitat.add(wingPad);

  // Lower pressurized command ring + upper command tier
  const habLowerRing = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.7, 2.5, 20), hullMat);
  habLowerRing.position.y = 1.65;
  habLowerRing.castShadow = true;
  habLowerRing.receiveShadow = true;
  habitat.add(habLowerRing);

  const habUpperDeck = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.45, 1.5, 20), darkMetalMat);
  habUpperDeck.position.y = 3.55;
  habUpperDeck.castShadow = true;
  habitat.add(habUpperDeck);

  // Towering geodesic main dome
  const habDome = new THREE.Mesh(
    new THREE.SphereGeometry(4.1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.48),
    hullMat
  );
  habDome.position.y = 4.25;
  habDome.castShadow = true;
  habitat.add(habDome);

  // Upper Observatory Cupola & Tall Station Sensor Mast (reaches ~11.4m height!)
  const cupolaRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.16, 12, 28), brushedGoldMat);
  cupolaRing.rotation.x = Math.PI / 2;
  cupolaRing.position.y = 8.1;
  habitat.add(cupolaRing);

  const cupolaGlass = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    glassMat
  );
  cupolaGlass.position.y = 8.1;
  cupolaGlass.renderOrder = 5;
  habitat.add(cupolaGlass);

  const towerSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 2.4, 10), darkMetalMat);
  towerSpire.position.set(0, 10.2, 0);
  habitat.add(towerSpire);

  const spireBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.8,
    })
  );
  spireBeacon.position.set(0, 11.45, 0);
  habitat.add(spireBeacon);

  const cabinGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.3,
    roughness: 0.2,
  });
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.2;
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.2), cabinGlowMat);
    win.position.set(Math.cos(ang) * 4.55, 2.1, Math.sin(ang) * 4.55);
    win.rotation.y = -ang + Math.PI / 2;
    habitat.add(win);

    const upperWin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.18), cabinGlowMat);
    upperWin.position.set(Math.cos(ang) * 4.22, 3.6, Math.sin(ang) * 4.22);
    upperWin.rotation.y = -ang + Math.PI / 2;
    habitat.add(upperWin);
  }

  // Elongated East & West Pressurized Lab / Quarters Modules (gives real Station Length!)
  [-1, 1].forEach((dir) => {
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 16), darkMetalMat);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(dir * 4.9, 1.7, 0);
    tunnel.castShadow = true;
    habitat.add(tunnel);

    const modulePod = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 4.8, 18), hullMat);
    modulePod.rotation.z = Math.PI / 2;
    modulePod.position.set(dir * 7.6, 2.05, 0);
    modulePod.castShadow = true;
    modulePod.receiveShadow = true;
    habitat.add(modulePod);

    const endBulkhead = new THREE.Mesh(
      new THREE.SphereGeometry(1.82, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      darkMetalMat
    );
    endBulkhead.rotation.z = dir < 0 ? Math.PI / 2 : -Math.PI / 2;
    endBulkhead.position.set(dir * 10.0, 2.05, 0);
    habitat.add(endBulkhead);

    for (const wx of [6.4, 8.8]) {
      const podWin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 0.2), cabinGlowMat);
      podWin.position.set(dir * wx, 2.2, 1.82);
      habitat.add(podWin);
    }

    // Exterior Truss & Radiator Fin on roof of each module
    const fin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.5), darkMetalMat);
    fin.position.set(dir * 7.6, 4.15, 0);
    habitat.add(fin);
  });

  // Forward South Storm-Shelter Airlock Entry (+Z facing player spawn!)
  const airlock = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 3.2), darkMetalMat);
  airlock.position.set(0, 1.45, 5.2);
  airlock.castShadow = true;
  habitat.add(airlock);

  const airlockDoor = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.05, 0.25), accentOrangeMat);
  airlockDoor.position.set(0, 1.25, 6.82);
  habitat.add(airlockDoor);

  const shelterBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 1.5,
  });
  const shelterArchLight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.28), shelterBeaconMat);
  shelterArchLight.position.set(0, 2.52, 6.85);
  habitat.add(shelterArchLight);

  const shieldShutters: THREE.Mesh[] = [];
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.35,
    metalness: 0.7,
  });
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.8, 0.18), shutterMat);
    shutter.position.set(Math.cos(ang) * 4.65, 3.3, Math.sin(ang) * 4.65);
    shutter.rotation.y = -ang + Math.PI / 2;
    shutter.userData.baseAngle = ang;
    habitat.add(shutter);
    shieldShutters.push(shutter);
  }

  const shieldBubble = new THREE.Mesh(
    new THREE.IcosahedronGeometry(7.2, 2),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    })
  );
  shieldBubble.position.y = 3.2;
  shieldBubble.renderOrder = 8;
  habitat.add(shieldBubble);

  tagInteractiveProxy(habitat, 'habitat', 18.5, 9.6, 11.2, clickableProxies);
  outpostRoot.add(habitat);

  // 2. ATTACHED REALISTIC HYDROPONICS GREENHOUSE (physically connected to Station East Wing at 15.8, 0)
  const greenhouse = new THREE.Group();
  greenhouse.position.set(15.8, groundHeightAt(15.8, 0.0, site), 0.0);
  addContactShadow(greenhouse, 4.8, textures.contactShadow);

  // Connecting Pressurized Airlock Tunnel straight into the Main Station East Bulkhead (x = 10.0 -> 12.2 world!)
  const ghConnectTunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 2.7, 16),
    hullMat
  );
  ghConnectTunnel.rotation.z = Math.PI / 2;
  ghConnectTunnel.position.set(-4.65, 1.75, 0);
  ghConnectTunnel.castShadow = true;
  greenhouse.add(ghConnectTunnel);

  const ghConnectCollar = new THREE.Mesh(
    new THREE.TorusGeometry(1.36, 0.14, 10, 20),
    brushedGoldMat
  );
  ghConnectCollar.rotation.y = Math.PI / 2;
  ghConnectCollar.position.set(-3.5, 1.75, 0);
  greenhouse.add(ghConnectCollar);

  const ghBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.45, 5.0), concretePadMat);
  ghBase.position.y = 0.225;
  ghBase.castShadow = true;
  ghBase.receiveShadow = true;
  greenhouse.add(ghBase);

  // Insulated lower hull perimeter skirt (back & side glazing framing)
  const ghSkirt = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.45, 4.8), hullMat);
  ghSkirt.position.y = 0.62;
  greenhouse.add(ghSkirt);

  // 3 Raised Realistic Plant Beds visible clearly through the glass canopy!
  const exteriorCropBedStages: Array<[THREE.Group, THREE.Group, THREE.Group]> = [];
  [-1.35, 0, 1.35].forEach((bz) => {
    const bed = buildRealisticCropBed(5.4, 0.88);
    bed.group.position.set(0, 0.45, bz);
    greenhouse.add(bed.group);
    exteriorCropBedStages.push(bed.stageGroups);
  });

  // 7 Arched Rib Trusses + Steel Longitudinal Purlins
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 });
  for (let i = -3; i <= 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(i * 1.12, 0.55, -2.38),
      new THREE.Vector3(i * 1.12, 2.75, -1.6),
      new THREE.Vector3(i * 1.12, 3.38, 0),
      new THREE.Vector3(i * 1.12, 2.75, 1.6),
      new THREE.Vector3(i * 1.12, 0.55, 2.38),
    ]);
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.068, 8, false), ribMat);
    rib.castShadow = true;
    greenhouse.add(rib);
  }

  const growLightMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xe879f9,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  for (const gz of [-0.9, 0.9]) {
    const growBar = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.12, 0.22), growLightMat);
    growBar.position.set(0, 2.95, gz);
    greenhouse.add(growBar);
  }

  const growPointLight = new THREE.PointLight(0xf0abfc, 2.5, 11);
  growPointLight.position.set(0, 2.4, 0);
  greenhouse.add(growPointLight);

  const ghCanopyGeo = new THREE.CylinderGeometry(2.38, 2.38, 6.85, 24, 1, false, 0, Math.PI);
  ghCanopyGeo.rotateZ(Math.PI / 2);
  ghCanopyGeo.rotateX(-Math.PI / 2);
  const ghCanopy = new THREE.Mesh(ghCanopyGeo, glassMat);
  ghCanopy.position.set(0, 0.88, 0);
  ghCanopy.scale.set(1, 1.08, 1);
  ghCanopy.renderOrder = 6;
  greenhouse.add(ghCanopy);

  // Exterior South Airlock Door on Greenhouse (+Z side for direct outdoor entrance!)
  const ghDoorHousing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.1, 0.9), darkMetalMat);
  ghDoorHousing.position.set(0, 1.15, 2.52);
  greenhouse.add(ghDoorHousing);
  const ghDoorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.7, 0.2), accentOrangeMat);
  ghDoorPanel.position.set(0, 1.05, 2.92);
  greenhouse.add(ghDoorPanel);
  const ghDoorLight = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 0.22), shelterBeaconMat);
  ghDoorLight.position.set(0, 2.04, 2.94);
  greenhouse.add(ghDoorLight);

  tagInteractiveProxy(greenhouse, 'greenhouse', 7.6, 3.6, 5.8, clickableProxies);
  outpostRoot.add(greenhouse);

  // 3. 12-PANEL MARS SOLAR FARM (3 rows x 4 cols at -21.5, -10.0 + visible Mars Dust coat)
  const solar = new THREE.Group();
  solar.position.set(-21.5, groundHeightAt(-21.5, -10.0, site), -10.0);
  addContactShadow(solar, 7.6, textures.contactShadow);

  const solarCellMat = new THREE.MeshStandardMaterial({
    map: textures.solarCell,
    roughness: 0.22,
    metalness: 0.65,
    emissive: 0x0c4a6e,
    emissiveIntensity: 0.15,
  });

  const solarDustMat = new THREE.MeshStandardMaterial({
    map: textures.marsGround,
    color: 0xb95835,
    roughness: 0.96,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0,
  });

  const solarWings: THREE.Group[] = [];
  const xCols = [-4.2, -1.4, 1.4, 4.2];
  const zRows = [-3.4, 0, 3.4];

  zRows.forEach((zPos) => {
    // Ground cable conduit connecting the 4 solar piers in this row
    const rowRail = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.12, 0.22), darkMetalMat);
    rowRail.position.set(0, 0.06, zPos);
    solar.add(rowRail);

    xCols.forEach((xPos) => {
      const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.28, 8), concretePadMat);
      mastBase.position.set(xPos, 0.14, zPos);
      solar.add(mastBase);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.9, 8), darkMetalMat);
      mast.position.set(xPos, 1.05, zPos);
      mast.castShadow = true;
      solar.add(mast);

      const wingPivot = new THREE.Group();
      wingPivot.position.set(xPos, 2.02, zPos);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.09, 2.25), darkMetalMat);
      frame.castShadow = true;
      wingPivot.add(frame);

      const cells = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.11, 2.08), solarCellMat);
      cells.position.y = 0.015;
      wingPivot.add(cells);

      // Matching Martian red-dust buildup layer on every one of the 12 panels
      const dustSheet = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.13, 2.05), solarDustMat);
      dustSheet.position.y = 0.03;
      wingPivot.add(dustSheet);

      solar.add(wingPivot);
      solarWings.push(wingPivot);
    });
  });

  // High-Voltage Battery Bank & Megapack Inverter Units on East edge of Solar Farm
  for (const bz of [-1.5, 1.5]) {
    const battRack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.75, 2.2), hullMat);
    battRack.position.set(6.2, 0.88, bz);
    battRack.castShadow = true;
    solar.add(battRack);

    const battTrim = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.2, 2.26), brushedGoldMat);
    battTrim.position.set(6.2, 1.62, bz);
    solar.add(battTrim);
  }
  const conduitTrunk = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 0.28), accentOrangeMat);
  conduitTrunk.position.set(7.8, 0.06, 0);
  solar.add(conduitTrunk);

  tagInteractiveProxy(solar, 'solar', 12.6, 3.8, 9.8, clickableProxies);
  outpostRoot.add(solar);

  // 4. LIFE SUPPORT & WATER RECYCLER (spaced out to -14.0, 17.5)
  const lifesupport = new THREE.Group();
  lifesupport.position.set(-14.0, groundHeightAt(-14.0, 17.5, site), 17.5);
  addContactShadow(lifesupport, 3.6, textures.contactShadow);

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

  // 5. DEEP SPACE COMMS DISH (spaced out to 12.0, -19.0)
  const comms = new THREE.Group();
  comms.position.set(12.0, groundHeightAt(12.0, -19.0, site), -19.0);
  addContactShadow(comms, 2.9, textures.contactShadow);

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

  // 6. REALISTIC 6-WHEEL ROCKER-BOGIE MARS ROVER & RESEARCH DRILL (spaced out to 14.5, 18.0)
  const science = new THREE.Group();
  science.position.set(14.5, groundHeightAt(14.5, 18.0, site), 18.0);

  const roverGroup = new THREE.Group();
  addContactShadow(roverGroup, 2.4, textures.contactShadow);

  const titaniumStrutMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.34,
    metalness: 0.82,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e242c,
    roughness: 0.72,
    metalness: 0.38,
  });

  // Main aerospace fuselage warm-box chassis + gold Kapton thermal foil belly
  const roverLowerChassis = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.38, 2.15), brushedGoldMat);
  roverLowerChassis.position.y = 0.68;
  roverLowerChassis.castShadow = true;
  roverGroup.add(roverLowerChassis);

  const roverBody = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.44, 2.28), hullMat);
  roverBody.position.y = 0.98;
  roverBody.castShadow = true;
  roverGroup.add(roverBody);

  const roverDeck = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.08, 1.95), darkMetalMat);
  roverDeck.position.y = 1.24;
  roverGroup.add(roverDeck);

  // Differential suspension crossbar & top pivot
  const diffBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.85, 8), titaniumStrutMat);
  diffBar.rotation.z = Math.PI / 2;
  diffBar.position.set(0, 0.94, 0);
  roverGroup.add(diffBar);

  // Rear angled MMRTG nuclear power battery with cooling fins
  const rtgGroup = new THREE.Group();
  rtgGroup.position.set(0, 1.02, -1.25);
  rtgGroup.rotation.x = -0.35;
  const rtgCore = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.85, 12), darkMetalMat);
  rtgCore.rotation.x = Math.PI / 2;
  rtgGroup.add(rtgCore);
  for (let f = 0; f < 6; f++) {
    const finAng = (f / 6) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.56, 0.75), brushedGoldMat);
    fin.rotation.z = finAng;
    rtgGroup.add(fin);
  }
  roverGroup.add(rtgGroup);

  // High-Gain Parabolic Dish & UHF Antenna on rear deck
  const hgaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.55, 8), titaniumStrutMat);
  hgaPole.position.set(-0.42, 1.5, -0.58);
  roverGroup.add(hgaPole);
  const hgaDish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.08, 0.14, 16),
    hullMat
  );
  hgaDish.position.set(-0.42, 1.78, -0.58);
  hgaDish.rotation.x = -0.45;
  roverGroup.add(hgaDish);

  // White Mastcam Tower + Stereo Camera Head & Laser Eye
  const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.0, 10), hullMat);
  mastPole.position.set(0.36, 1.72, 0.72);
  mastPole.castShadow = true;
  roverGroup.add(mastPole);

  const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.26, 0.34), hullMat);
  camHead.position.set(0.36, 2.24, 0.74);
  roverGroup.add(camHead);

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.0,
    roughness: 0.15,
  });
  [-0.14, 0.14].forEach((lx) => {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 12), lensMat);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(0.36 + lx, 2.26, 0.92);
    roverGroup.add(eye);
  });

  // Visible Rocker-Bogie Suspension Linkages + 6 Spoked Grooved Wheels!
  const roverWheels: THREE.Object3D[] = [];
  [-1, 1].forEach((side) => {
    const railX = side * 0.88;
    const wheelX = side * 1.12;

    // Main rocker arm pivot to rear hub & bogie pivot
    const rearStrut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 1.25), titaniumStrutMat);
    rearStrut.position.set(railX, 0.62, -0.52);
    rearStrut.rotation.x = 0.44;
    roverGroup.add(rearStrut);

    const frontBogie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.15), titaniumStrutMat);
    frontBogie.position.set(railX, 0.44, 0.56);
    roverGroup.add(frontBogie);

    const upperStrut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.95), titaniumStrutMat);
    upperStrut.position.set(railX, 0.74, 0.28);
    upperStrut.rotation.x = -0.52;
    roverGroup.add(upperStrut);

    for (const zWheel of [-1.05, 0.02, 1.08]) {
      const hubDrop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.08), titaniumStrutMat);
      hubDrop.position.set(railX, 0.44, zWheel);
      roverGroup.add(hubDrop);

      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 8), darkMetalMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(side * 1.0, 0.34, zWheel);
      roverGroup.add(axle);

      // Spoked wheel assembly (rotates cleanly!)
      const wheelPivot = new THREE.Group();
      wheelPivot.position.set(wheelX, 0.34, zWheel);

      const tireRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.26, 20, 1, true),
        tireMat
      );
      tireRim.rotation.z = Math.PI / 2;
      tireRim.castShadow = true;
      wheelPivot.add(tireRim);

      const innerDrum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.2, 14),
        titaniumStrutMat
      );
      innerDrum.rotation.z = Math.PI / 2;
      wheelPivot.add(innerDrum);

      const driveHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.28, 12),
        accentOrangeMat
      );
      driveHub.rotation.z = Math.PI / 2;
      wheelPivot.add(driveHub);

      // Visible tire treads / grouser cleats & wheel spokes
      for (let t = 0; t < 8; t++) {
        const ang = (t / 8) * Math.PI * 2;
        const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.055), titaniumStrutMat);
        cleat.position.set(0, Math.cos(ang) * 0.35, Math.sin(ang) * 0.35);
        cleat.rotation.x = -ang;
        wheelPivot.add(cleat);
      }
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), titaniumStrutMat);
        spoke.position.x = side * 0.11;
        spoke.rotation.x = (sIdx * Math.PI) / 3;
        wheelPivot.add(spoke);
      }

      roverGroup.add(wheelPivot);
      roverWheels.push(wheelPivot);
    }
  });

  // Articulated Front Robotic Sampling Arm + Rotary Core Drill
  const roverArm = new THREE.Group();
  roverArm.position.set(-0.26, 0.94, 1.15);
  const armJoint1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), titaniumStrutMat);
  roverArm.add(armJoint1);
  const armSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.85), accentOrangeMat);
  armSeg1.position.z = 0.42;
  roverArm.add(armSeg1);
  const armJoint2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 12), titaniumStrutMat);
  armJoint2.position.z = 0.86;
  roverArm.add(armJoint2);
  const drillHead = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 10), darkMetalMat);
  drillHead.rotation.x = Math.PI / 2;
  drillHead.position.z = 1.08;
  roverArm.add(drillHead);
  roverGroup.add(roverArm);

  science.add(roverGroup);
  tagInteractiveProxy(science, 'science', 4.4, 3.0, 4.6, clickableProxies);
  outpostRoot.add(science);

  // 7. LANDING PAD & ARRIVAL SPACECRAFT (spaced out to 22.5, -17.5)
  const landingPadPos = new THREE.Vector3(22.5, groundHeightAt(22.5, -17.5, site), -17.5);
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

  const rescueShip = buildSpacecraft(textures, true);
  rescueShip.group.position.set(landingPadPos.x - 6.5, landingPadPos.y + 28, landingPadPos.z - 2.0);
  rescueShip.group.visible = false;
  outpostRoot.add(rescueShip.group);

  // 8. PLAYABLE PLAYER (Commander Maya) spawning in front of Main Station Shelter Airlock
  const crewGroup = new THREE.Group();
  const playerAstro = createAstronaut(
    'Commander Maya',
    0xea580c,
    textures.contactShadow,
    clickableProxies,
    new THREE.Vector2(0, 7.6),
    new THREE.Vector2(0, 9.2)
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
    { id: 'habitat', x: 0, z: 0, r: 8.4 },
    { id: 'greenhouse', x: 15.8, z: 0.0, r: 4.8 },
    { id: 'solar', x: -21.5, z: -10.0, r: 7.4 },
    { id: 'lifesupport', x: -14.0, z: 17.5, r: 4.1 },
    { id: 'comms', x: 12.0, z: -19.0, r: 3.3 },
    { id: 'science', x: 14.5, z: 18.0, r: 3.8 },
  ];
  stationRingConfigs.forEach((cfg) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(cfg.r - 0.18, cfg.r, 56),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cfg.x, groundHeightAt(cfg.x, cfg.z, site) + 0.04, cfg.z);
    outpostRoot.add(ring);
    stationRings[cfg.id] = ring;
  });

  // Collectible 3D Martian Research Rocks (default Martian rock texture & iron-oxide rust color — no green!)
  const sampleNodes: Record<string, THREE.Group> = {};
  FIELD_SAMPLES.forEach((smp, idx) => {
    const smpGroup = new THREE.Group();
    const sy = groundHeightAt(smp.x, smp.z, site);
    smpGroup.position.set(smp.x, sy, smp.z);

    const rockSpecimen = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.62, 1),
      new THREE.MeshStandardMaterial({
        color: smp.colorHex,
        map: textures.marsRockMap,
        bumpMap: textures.marsRockBump,
        bumpScale: 0.18,
        roughness: 0.88,
        metalness: 0.06,
      })
    );
    rockSpecimen.scale.set(1.22, 0.78, 1.04);
    rockSpecimen.rotation.set(idx * 0.7, idx * 1.3, idx * 0.4);
    rockSpecimen.position.y = 0.62;
    rockSpecimen.castShadow = true;
    rockSpecimen.userData.isCrystal = true;
    smpGroup.add(rockSpecimen);

    const haloRing = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1.02, 28),
      new THREE.MeshBasicMaterial({
        color: 0xd97745,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      })
    );
    haloRing.rotation.x = -Math.PI / 2;
    haloRing.position.y = 0.05;
    smpGroup.add(haloRing);

    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.14, 2.2, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xea580c,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beaconBeam.position.y = 1.1;
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
    solarDustMat,
    growLightMat,
    growPointLight,
    exteriorCropBedStages,
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
    rescueShip,
    selectionRing,
  };
}
