import * as THREE from 'three';
import { createAstronaut as createDetailedEvaRig, type AstronautRig } from '../cutscene/scene/models';
import { INTERIOR_POINTS, type InteriorZoneId } from '../data/missionScenarios';
import { buildRealisticCropBed } from './cropVisuals';
import type { ProceduralTextureSet } from './textures';

export interface InteriorWorldHandles {
  root: THREE.Group;
  clickableProxies: THREE.Mesh[];
  zoneRings: Record<InteriorZoneId, THREE.Mesh>;
  playerRig: AstronautRig;
  playerAccentMat: THREE.MeshStandardMaterial;
  playerMarker: THREE.Mesh;
  walkTargetRing: THREE.Mesh;
  cropBedStages: Array<[THREE.Group, THREE.Group, THREE.Group]>;
  growLightMat: THREE.MeshStandardMaterial;
  growPointLight: THREE.PointLight;
  scannerBeamRing: THREE.Mesh;
  scannerLedMat: THREE.MeshStandardMaterial;
  commsLedMat: THREE.MeshStandardMaterial;
}

function createMonitorScreenTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#061224';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 152);

    // Waveform / Mars horizon grid
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    for (let x = 14; x < 160; x += 6) {
      const y = 55 + Math.sin(x * 0.14) * 16 + Math.cos(x * 0.31) * 6;
      if (x === 14) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Bars
    const bars = [
      { x: 180, h: 72, color: '#22c55e' },
      { x: 202, h: 52, color: '#f59e0b' },
      { x: 224, h: 86, color: '#38bdf8' },
    ];
    bars.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, 128 - b.h, 14, b.h);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('MARS LAB · COMMS BUS', 14, 22);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('O2 21% · BIO OK', 14, 138);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tagInteriorProxy(
  parent: THREE.Object3D,
  zoneId: InteriorZoneId,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  proxies: THREE.Mesh[]
) {
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  proxy.position.set(x, y, z);
  proxy.layers.set(1);
  proxy.userData.interiorZoneId = zoneId;
  parent.add(proxy);
  proxies.push(proxy);
}

export function buildInteriorWorld(
  parent: THREE.Scene,
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): InteriorWorldHandles {
  const root = new THREE.Group();
  root.visible = false;
  parent.add(root);

  const clickableProxies: THREE.Mesh[] = [];

  // Lighting tuned cleanly for cozy high-tech Habitat + lush Greenhouse cutaway
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x334155, 0.85);
  root.add(hemi);

  const mainLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
  mainLight.position.set(-4, 14, 10);
  mainLight.castShadow = !isSoftwareGl;
  mainLight.shadow.mapSize.set(1024, 1024);
  root.add(mainLight);

  const labSpot = new THREE.PointLight(0x7dd3fc, 2.0, 18);
  labSpot.position.set(0, 3.8, -1.5);
  root.add(labSpot);

  const gymSpot = new THREE.PointLight(0xfde68a, 1.5, 14);
  gymSpot.position.set(-6.8, 3.6, 0.5);
  root.add(gymSpot);

  // Materials
  const deckFloorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.35,
  });
  const ghFloorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.78,
    metalness: 0.15,
  });
  const hullWallMat = new THREE.MeshStandardMaterial({
    map: textures.hullPanels,
    color: 0xe2e8f0,
    roughness: 0.38,
    metalness: 0.32,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.8,
  });
  const silverMetalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.28,
    metalness: 0.85,
  });
  const deskTopMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.32,
    metalness: 0.4,
  });
  const accentOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.42,
    metalness: 0.15,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.36,
    clearcoat: 1.0,
    depthWrite: false,
  });

  // 1. MAIN SPACE STATION FLOOR + CORRIDOR + ATTACHED GREENHOUSE FLOOR
  const stationFloor = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.3, 9.2), deckFloorMat);
  stationFloor.position.set(-2.0, -0.15, 0);
  stationFloor.receiveShadow = true;
  root.add(stationFloor);

  // Subtle floor walkway stripe across Station -> Greenhouse corridor
  const laneMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
  const corridorLane = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.02, 0.65), laneMat);
  corridorLane.position.set(1.5, 0.01, 0);
  root.add(corridorLane);

  // Connecting Pressurized Airlock Corridor (x = 5.5 .. 8.8)
  const tunnelFloor = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 3.2), deckFloorMat);
  tunnelFloor.position.set(7.15, -0.15, 0);
  tunnelFloor.receiveShadow = true;
  root.add(tunnelFloor);

  for (const ax of [5.6, 7.1, 8.7]) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.14, 10, 24, Math.PI),
      silverMetalMat
    );
    arch.position.set(ax, 1.5, 0);
    arch.rotation.y = Math.PI / 2;
    root.add(arch);
  }

  const tunnelBackWall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 0.22), hullWallMat);
  tunnelBackWall.position.set(7.15, 1.5, -1.65);
  root.add(tunnelBackWall);

  // Attached Greenhouse Floor (x = 8.8 .. 18.4, z = -3.8 .. +3.8)
  const ghFloor = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.3, 7.6), ghFloorMat);
  ghFloor.position.set(13.6, -0.15, 0);
  ghFloor.receiveShadow = true;
  root.add(ghFloor);

  // Cutaway Perimeter Bulkheads (North & East/West walls tall with Mars windows; South edge low curb so camera sees inside cleanly)
  const northStationWall = new THREE.Mesh(new THREE.BoxGeometry(15.2, 3.8, 0.3), hullWallMat);
  northStationWall.position.set(-2.0, 1.9, -4.6);
  northStationWall.receiveShadow = true;
  root.add(northStationWall);

  const westStationWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 9.2), hullWallMat);
  westStationWall.position.set(-9.6, 1.9, 0);
  root.add(westStationWall);

  // Partition bulkheads around corridor opening (x = 5.55, gap z = -1.5..+1.5)
  for (const side of [-1, 1]) {
    const partWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.8, 3.1), hullWallMat);
    partWall.position.set(5.55, 1.9, side * 3.05);
    root.add(partWall);
  }

  // Low South Cutaway Rim + Main Airlock Exit Door (at x = 0, z = +4.45)
  const southRimLeft = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.45, 0.25), darkTrimMat);
  southRimLeft.position.set(-5.0, 0.225, 4.55);
  root.add(southRimLeft);
  const southRimRight = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 0.25), darkTrimMat);
  southRimRight.position.set(3.8, 0.225, 4.55);
  root.add(southRimRight);

  const exitDoorMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 1.2,
  });
  const stationAirlockFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 0.3), darkTrimMat);
  stationAirlockFrame.position.set(0, 1.25, 4.55);
  root.add(stationAirlockFrame);
  const stationExitPanel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.05, 0.34), accentOrangeMat);
  stationExitPanel.position.set(0, 1.1, 4.55);
  root.add(stationExitPanel);
  const stationExitBeacon = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.38), exitDoorMat);
  stationExitBeacon.position.set(0, 2.35, 4.55);
  root.add(stationExitBeacon);
  tagInteriorProxy(root, 'exit_station', 0, 1.3, 4.4, 2.8, 2.6, 1.2, clickableProxies);

  // Outside Martian panorama panels seen through Station windows
  const marsBackdropMat = new THREE.MeshBasicMaterial({ color: 0xb86544 });
  for (const wx of [-5.2, 3.2]) {
    const windowBack = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.25, 0.08), marsBackdropMat);
    windowBack.position.set(wx, 2.25, -4.42);
    root.add(windowBack);
    const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.4, 0.14), darkTrimMat);
    windowFrame.position.set(wx, 2.25, -4.45);
    root.add(windowFrame);
  }

  // 2. LABORATORY WORKDESK & COMMS REPAIR RACK (at x = 0, z = -3.1)
  const labGroup = new THREE.Group();
  labGroup.position.set(0, 0, -3.1);

  const deskMain = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 1.35), deskTopMat);
  deskMain.position.set(0, 0.92, 0);
  deskMain.castShadow = true;
  deskMain.receiveShadow = true;
  labGroup.add(deskMain);

  for (const lx of [-2.05, 0, 2.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 1.15), darkTrimMat);
    leg.position.set(lx, 0.45, 0);
    labGroup.add(leg);
  }

  const monitorTex = createMonitorScreenTexture();
  const screenMat = new THREE.MeshStandardMaterial({
    map: monitorTex,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  [-0.85, 0.25].forEach((mx, idx) => {
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.06), darkTrimMat);
    bezel.position.set(mx, 1.42, -0.32);
    bezel.rotation.y = idx === 0 ? 0.14 : -0.1;
    labGroup.add(bezel);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.52), screenMat);
    screen.position.set(mx, 1.42, -0.285);
    screen.rotation.y = idx === 0 ? 0.14 : -0.1;
    labGroup.add(screen);
  });

  // Lab Chair & Science Sample Scope
  const scopeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 10), silverMetalMat);
  scopeBase.position.set(-1.65, 1.14, 0.1);
  labGroup.add(scopeBase);

  const chairSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12), accentOrangeMat);
  chairSeat.position.set(-0.2, 0.56, 0.95);
  labGroup.add(chairSeat);
  const chairPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.18, 0.52, 8), darkTrimMat);
  chairPost.position.set(-0.2, 0.26, 0.95);
  labGroup.add(chairPost);

  // Damaged Earth Comms Transceiver Rack next to Workdesk (glows red until fixed -> green!)
  const commsRack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.25, 0.9), darkTrimMat);
  commsRack.position.set(2.9, 1.125, -0.15);
  commsRack.castShadow = true;
  labGroup.add(commsRack);

  const commsLedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.8,
  });
  const commsLed = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.08), commsLedMat);
  commsLed.position.set(2.9, 1.9, 0.32);
  labGroup.add(commsLed);

  root.add(labGroup);
  tagInteriorProxy(root, 'lab', 0.5, 1.2, -3.0, 6.2, 2.4, 2.0, clickableProxies);

  // 3. EXERCISE GYM: T2 TREADMILL & ARED BONE RESISTANCE TRAINER (x = -6.8, z = -2.1)
  const gymGroup = new THREE.Group();
  gymGroup.position.set(-6.8, 0, -2.1);

  const gymMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 2.6), gymMat);
  pad.position.set(0, 0.03, 0.4);
  gymGroup.add(pad);

  // Zero-G Harness Treadmill
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 1.9), darkTrimMat);
  deck.position.set(-0.65, 0.15, 0.35);
  gymGroup.add(deck);
  const handleFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 0.12), silverMetalMat);
  handleFrame.position.set(-0.65, 0.85, -0.45);
  gymGroup.add(handleFrame);
  const treadScreen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.1), screenMat);
  treadScreen.position.set(-0.65, 1.48, -0.38);
  treadScreen.rotation.x = -0.35;
  gymGroup.add(treadScreen);

  // ARED Vacuum Resistance Weight Squat Rack
  for (const px of [0.45, 1.35]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.1, 10), silverMetalMat);
    post.position.set(px, 1.1, 0.25);
    gymGroup.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 10), accentOrangeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0.9, 1.45, 0.25);
  gymGroup.add(bar);

  root.add(gymGroup);
  tagInteriorProxy(root, 'exercise', -6.8, 1.1, -1.7, 3.6, 2.2, 2.8, clickableProxies);

  // 4. BIOMETRIC HEALTH & RADIATION BODY SCANNER CHAMBER (x = -6.4, z = 2.4)
  const scanGroup = new THREE.Group();
  scanGroup.position.set(-6.4, 0, 2.4);

  const scanPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.18, 20), silverMetalMat);
  scanPlinth.position.y = 0.09;
  scanGroup.add(scanPlinth);

  const scannerLedMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.5,
  });

  // 2 Curved Arch Gantry Columns
  for (const side of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.55, 0.45), darkTrimMat);
    col.position.set(side * 0.98, 1.35, 0);
    scanGroup.add(col);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 0.14), scannerLedMat);
    strip.position.set(side * 0.85, 1.35, 0);
    scanGroup.add(strip);
  }
  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.75), darkTrimMat);
  topHeader.position.y = 2.65;
  scanGroup.add(topHeader);

  const scannerBeamRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.86, 0.045, 8, 28),
    scannerLedMat
  );
  scannerBeamRing.rotation.x = Math.PI / 2;
  scannerBeamRing.position.y = 0.32;
  scanGroup.add(scannerBeamRing);

  root.add(scanGroup);
  tagInteriorProxy(root, 'scanner', -6.4, 1.3, 2.4, 2.6, 2.6, 2.4, clickableProxies);

  // 5. ATTACHED REALISTIC GREENHOUSE INTERIOR (x = 8.8 .. 18.4)
  const ghGroup = new THREE.Group();
  ghGroup.position.set(13.6, 0, 0);

  // Back & East insulated lower walls + tall glass canopy arches
  const ghBackSkirt = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.0, 0.28), hullWallMat);
  ghBackSkirt.position.set(0, 0.5, -3.75);
  ghGroup.add(ghBackSkirt);

  const ghEastSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.8, 7.6), glassMat);
  ghEastSkirt.position.set(4.75, 1.4, 0);
  ghGroup.add(ghEastSkirt);

  const ribMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 });
  for (let i = -3; i <= 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(i * 1.45, 0, -3.75),
      new THREE.Vector3(i * 1.45, 3.1, -3.1),
      new THREE.Vector3(i * 1.45, 3.85, 0),
    ]);
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.075, 8, false), ribMat);
    ghGroup.add(rib);
  }

  const ghGlassWall = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.9, 0.14), glassMat);
  ghGlassWall.position.set(0, 2.35, -3.72);
  ghGroup.add(ghGlassWall);

  // Overhead Spectrum Grow Lights
  const growLightMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xe879f9,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });
  for (const lz of [-2.0, -0.35, 1.3]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 0.24), growLightMat);
    bar.position.set(0.2, 3.25, lz);
    ghGroup.add(bar);
  }
  const growPointLight = new THREE.PointLight(0xf0abfc, 2.6, 16);
  growPointLight.position.set(0.2, 2.9, -0.3);
  ghGroup.add(growPointLight);

  // 3 Raised Hydroponic Soil Beds with dynamic crop growth stages!
  const cropBedStages: Array<[THREE.Group, THREE.Group, THREE.Group]> = [];
  [-2.05, -0.35, 1.35].forEach((bz) => {
    const bed = buildRealisticCropBed(6.4, 1.15);
    bed.group.position.set(0.4, 0, bz);
    ghGroup.add(bed.group);
    cropBedStages.push(bed.stageGroups);
  });

  // Water Misting Tank inside Greenhouse corner
  const hydroTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 1.8, 14),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.5 })
  );
  hydroTank.position.set(-4.0, 0.9, -2.85);
  ghGroup.add(hydroTank);

  // Exterior Greenhouse Airlock Exit Door (at world x = 14.2, z = +3.65)
  const ghAirlockFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.35, 0.3), darkTrimMat);
  ghAirlockFrame.position.set(0.6, 1.175, 3.72);
  ghGroup.add(ghAirlockFrame);
  const ghExitPanel = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.95, 0.34), accentOrangeMat);
  ghExitPanel.position.set(0.6, 1.05, 3.72);
  ghGroup.add(ghExitPanel);
  const ghExitBeacon = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.38), exitDoorMat);
  ghExitBeacon.position.set(0.6, 2.22, 3.72);
  ghGroup.add(ghExitBeacon);

  root.add(ghGroup);
  tagInteriorProxy(root, 'greenhouse_beds', 14.0, 0.9, -0.4, 7.2, 2.0, 4.6, clickableProxies);
  tagInteriorProxy(root, 'exit_greenhouse', 14.2, 1.2, 3.65, 2.6, 2.4, 1.2, clickableProxies);

  // 6. INTERACTIVE FLOOR RINGS FOR ALL INTERIOR ZONES
  const zoneRings = {} as Record<InteriorZoneId, THREE.Mesh>;
  INTERIOR_POINTS.forEach((pt) => {
    const r = pt.id === 'greenhouse_beds' ? 2.2 : 1.55;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.14, r, 40),
      new THREE.MeshBasicMaterial({
        color: pt.id.startsWith('exit') ? 0x22c55e : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pt.x, 0.04, pt.z);
    root.add(ring);
    zoneRings[pt.id] = ring;
  });

  // 7. INTERIOR PLAYABLE EVA ASTRONAUT (Matches Cutscene EVA Suit!)
  const playerRig = createDetailedEvaRig(0xea580c, 'eva');
  playerRig.group.scale.setScalar(1.12);
  playerRig.group.position.set(0, 0, 2.4);
  root.add(playerRig.group);

  const playerMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 28),
    new THREE.MeshBasicMaterial({
      color: 0xea580c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    })
  );
  playerMarker.rotation.x = -Math.PI / 2;
  playerMarker.position.y = 0.03;
  playerRig.group.add(playerMarker);

  const walkTargetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.48, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  walkTargetRing.rotation.x = -Math.PI / 2;
  walkTargetRing.visible = false;
  root.add(walkTargetRing);

  return {
    root,
    clickableProxies,
    zoneRings,
    playerRig,
    playerAccentMat: playerRig.accentMat,
    playerMarker,
    walkTargetRing,
    cropBedStages,
    growLightMat,
    growPointLight,
    scannerBeamRing,
    scannerLedMat,
    commsLedMat,
  };
}
