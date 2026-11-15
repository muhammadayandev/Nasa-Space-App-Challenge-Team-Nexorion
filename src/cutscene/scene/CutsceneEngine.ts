import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CUTSCENE_CHAPTERS,
  LAUNCH_IGNITION_TIME,
  TOTAL_CUTSCENE_DURATION,
  createInitialObjectives,
  evaluateObjectivesAtPosition,
  getChapterStartTime,
  getLaunchCountdownValue,
  getTransitProgress,
  resolveCutsceneState,
  type ChapterId,
  type GamePhase,
  type SurvivalObjective,
} from '../timeline';
import { SoundEngine } from '../audio/soundEngine';
import { createProceduralTextures, type ProceduralTextureSet } from './materials';
import {
  createAstronaut,
  createEarthLaunchComplex,
  createMarsEnvironment,
  createSpacecraft,
  marsHeightAt,
  poseAstronautSeatedTask,
  poseAstronautSprint,
  poseAstronautWalk,
  type AstronautRig,
  type EarthLaunchComplex,
  type MarsEnvironment,
  type SpacecraftRig,
} from './models';
import { loadNasaModels } from './nasaModels';

export interface WaypointProjection {
  id: string;
  label: string;
  x: number;
  y: number;
  distanceM: number;
  visible: boolean;
  completed: boolean;
}

export interface EngineHudSnapshot {
  phase: GamePhase;
  chapterId: ChapterId;
  chapterIndex: number;
  chapterTitle: string;
  location: string;
  localTime: number;
  localProgress: number;
  totalProgress: number;
  subtitleSpeaker: string | null;
  subtitleText: string | null;
  subtitleTone: 'normal' | 'alert' | 'critical';
  countdownNumber: number;
  ignited: boolean;
  altitudeKm: number;
  velocityKms: number;
  transitMonths: number;
  transitDays: number;
  transitDistanceMkm: number;
  transitPercent: number;
  solNumber: number;
  stormAlertActive: boolean;
  commsLost: boolean;
  blackoutOpacity: number;
  helmetCracked: boolean;
  objectives: SurvivalObjective[];
  waypoints: WaypointProjection[];
  survivalElapsedSec: number;
  oxygenPercent: number;
}

// Pre-allocated scratch helpers (Zero-GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();

const SKY_EARTH = new THREE.Color(0x6da6d9);
const SKY_ORBIT = new THREE.Color(0x04070e);
const SKY_MARS_DAY = new THREE.Color(0xb86544);
const SKY_MARS_DUSK = new THREE.Color(0x522519);
const SKY_MARS_STORM = new THREE.Color(0x6b2814);

export class CutsceneEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: ProceduralTextureSet;
  private sound: SoundEngine;
  private onHudUpdate: (snap: EngineHudSnapshot) => void;

  // Lighting
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // World Groups
  private earthGroup: THREE.Group;
  private earthComplex: EarthLaunchComplex;
  private earthRocket: SpacecraftRig;
  private cockpitGroup: THREE.Group;
  private exhaustParticles: THREE.Points;

  private spaceGroup: THREE.Group;
  private earthSphere: THREE.Mesh;
  private earthCloudSphere: THREE.Mesh;
  private marsSphere: THREE.Mesh;
  private transitArcLine: THREE.Line;
  private transitCruiser: THREE.Group;
  private transitCrew: AstronautRig[] = [];
  private transitHoloGroup: THREE.Group;
  private transitSpeck: THREE.Group;

  private marsGroup: THREE.Group;
  private marsEnv: MarsEnvironment;
  private marsMav: SpacecraftRig;
  private marsCrew: AstronautRig[];

  // State
  private phase: GamePhase = 'title';
  private cutsceneTime = 0;
  private titleTime = 0;
  private survivalTime = 0;
  private oxygenPercent = 42;
  private objectives: SurvivalObjective[] = createInitialObjectives();

  // First-person Survival Controller
  private playerPos = new THREE.Vector3(6, 0, 22);
  private playerYaw = 0.25;
  private playerPitch = 0.04;
  private walkDistance = 0;
  private lastFootstepStep = 0;
  private keys = new Set<string>();
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Loop management
  private frameId = 0;
  private lastFrameTs = 0;
  private lastHudPushTs = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    sound: SoundEngine,
    onHudUpdate: (snap: EngineHudSnapshot) => void
  ) {
    this.container = container;
    this.sound = sound;
    this.onHudUpdate = onHudUpdate;

    // Software-WebGL probe
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'cutscene-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = SKY_EARTH.clone();
    this.scene.fog = new THREE.FogExp2(SKY_EARTH.getHex(), 0.0045);

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 2800);

    // Mandatory studio PMREM environment reflection on every device
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm Key + Cool Hemisphere Fill
    this.hemiLight = new THREE.HemisphereLight(0xbbe0ff, 0x5c4632, 0.75);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    this.keyLight.position.set(45, 70, 35);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      const d = 55;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.camera.near = 1;
      this.keyLight.shadow.camera.far = 200;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    // 1. EARTH LAUNCH COMPLEX SCENE
    this.earthGroup = new THREE.Group();
    this.earthComplex = createEarthLaunchComplex(this.textures);
    this.earthGroup.add(this.earthComplex.group);

    this.earthRocket = createSpacecraft(this.textures);
    this.earthRocket.group.position.set(0, 1.45, 0);
    this.earthGroup.add(this.earthRocket.group);

    // Distant high-altitude cloud wisps around Earth horizon
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf4f8fc,
      roughness: 0.95,
      transparent: true,
      opacity: 0.42,
    });
    for (let i = 0; i < 18; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(9 + (i % 3) * 3, 10, 8), cloudMat);
      c.scale.set(2.8, 0.32, 1.3);
      const ang = (i / 18) * Math.PI * 2;
      c.position.set(Math.cos(ang) * 185, 62 + (i % 4) * 14, Math.sin(ang) * 185);
      this.earthGroup.add(c);
    }

    // Rocket exhaust smoke buffer
    const exCount = 320;
    const exPos = new Float32Array(exCount * 3);
    for (let i = 0; i < exCount; i++) {
      exPos[i * 3] = (Math.random() - 0.5) * 12;
      exPos[i * 3 + 1] = Math.random() * 4;
      exPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const exGeo = new THREE.BufferGeometry();
    exGeo.setAttribute('position', new THREE.BufferAttribute(exPos, 3));
    this.exhaustParticles = new THREE.Points(
      exGeo,
      new THREE.PointsMaterial({ color: 0xffe6cc, size: 1.8, transparent: true, opacity: 0.65 })
    );
    this.exhaustParticles.visible = false;
    this.earthGroup.add(this.exhaustParticles);

    // Cockpit interior frame (shown only in Chapter 2 boarding interior)
    this.cockpitGroup = this.buildCockpitInterior();
    this.cockpitGroup.visible = false;
    this.earthGroup.add(this.cockpitGroup);
    this.scene.add(this.earthGroup);

    // 2. DEEP SPACE TRANSIT SCENE (Chapter 4 — Vast Planetary Scale & Distance)
    this.spaceGroup = new THREE.Group();
    this.spaceGroup.visible = false;

    const starCount = 2400;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 750 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = 180 + r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = -180 + r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xf4f7ff, size: 1.85, sizeAttenuation: true })
    );
    this.spaceGroup.add(stars);

    // Massive Earth with multi-octave FBM continents, rotating cloud layer & atmospheric blue halo
    this.earthSphere = new THREE.Mesh(
      new THREE.SphereGeometry(64, 36, 26),
      new THREE.MeshStandardMaterial({
        map: this.textures.earthGlobeMap,
        roughness: 0.72,
        metalness: 0.05,
      })
    );
    this.earthSphere.position.set(-135, -10, -155);
    this.spaceGroup.add(this.earthSphere);

    this.earthCloudSphere = new THREE.Mesh(
      new THREE.SphereGeometry(65.1, 32, 22),
      new THREE.MeshStandardMaterial({
        map: this.textures.earthCloudMap,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        roughness: 0.9,
      })
    );
    this.earthCloudSphere.position.copy(this.earthSphere.position);
    this.spaceGroup.add(this.earthCloudSphere);

    const earthAtmo = new THREE.Mesh(
      new THREE.SphereGeometry(68.2, 28, 20),
      new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    earthAtmo.position.copy(this.earthSphere.position);
    this.spaceGroup.add(earthAtmo);

    // Distant colossal Mars far across interplanetary space (radius ~0.55x Earth, ~675 units away!)
    this.marsSphere = new THREE.Mesh(
      new THREE.SphereGeometry(35, 36, 26),
      new THREE.MeshStandardMaterial({
        map: this.textures.marsGlobeMap,
        roughness: 0.88,
        metalness: 0.03,
      })
    );
    this.marsSphere.position.set(520, 14, -320);
    this.spaceGroup.add(this.marsSphere);

    const marsAtmo = new THREE.Mesh(
      new THREE.SphereGeometry(37.2, 28, 20),
      new THREE.MeshBasicMaterial({
        color: 0xe06d44,
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    marsAtmo.position.copy(this.marsSphere.position);
    this.spaceGroup.add(marsAtmo);

    // Sweeping Heliocentric Transfer Trajectory Arc spanning hundreds of units between Earth & Mars
    const arcCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-42, 2, -56),
      new THREE.Vector3(215, 46, -135),
      new THREE.Vector3(468, 14, -278)
    );
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcCurve.getPoints(96));
    this.transitArcLine = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.36 })
    );
    this.spaceGroup.add(this.transitArcLine);

    // Full Ares IV Deep-Space Cruiser with Circular Spacecraft Porthole & Active Crew Cabin
    const cruiserBuild = this.buildTransitCruiser();
    this.transitCruiser = cruiserBuild.cruiser;
    this.transitCrew = cruiserBuild.crew;
    this.transitHoloGroup = cruiserBuild.holoGroup;
    this.transitCruiser.position.set(-42, 2, -56);
    this.spaceGroup.add(this.transitCruiser);

    // Glowing speck-of-light beacon visible after zooming out across interplanetary distances
    this.transitSpeck = this.buildTransitSpeck();
    this.spaceGroup.add(this.transitSpeck);

    this.scene.add(this.spaceGroup);

    // 3. MARS SURFACE SCENE (Chapters 5-8 + Interactive Survival)
    this.marsGroup = new THREE.Group();
    this.marsGroup.visible = false;
    this.marsEnv = createMarsEnvironment(this.textures);
    this.marsGroup.add(this.marsEnv.group);

    this.marsMav = createSpacecraft(this.textures);
    this.marsMav.boosters.forEach((b) => (b.visible = false));
    this.marsMav.landingLegs.forEach((leg) => (leg.visible = true));
    this.marsMav.group.position.set(0, marsHeightAt(0, -36), -36);
    this.marsGroup.add(this.marsMav.group);

    this.marsCrew = [
      createAstronaut(0x2864b8, 'eva'),
      createAstronaut(0xd99b26, 'eva'),
      createAstronaut(0xc93b2b, 'eva'),
    ];
    this.marsCrew.forEach((c) => this.marsGroup.add(c.group));

    // Sol 19 Field Core Scanner Rig out on North Ridge (75m away from the MAV)
    const fieldRig = this.buildFieldSurveyRig();
    fieldRig.position.set(14.2, marsHeightAt(14.2, 34.0), 34.0);
    this.marsGroup.add(fieldRig);
    this.scene.add(this.marsGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Load official NASA Mars Rover GLB for the legacy outpost
    void loadNasaModels(!this.isSoftwareGl).then((lib) => {
      if (this.disposed) return;
      if (lib.roverTemplate) {
        this.marsEnv.legacyRover.clear();
        this.marsEnv.legacyRover.add(lib.roverTemplate.clone(true));
      }
      if (this.phase === 'title') {
        this.renderer.render(this.scene, this.camera);
      }
    });

    this.bindEvents();
    this.updateTitleScene(0);
    this.renderer.render(this.scene, this.camera);
    this.lastFrameTs = performance.now();
    this.tick();
  }

  private buildTransitCruiser(): {
    cruiser: THREE.Group;
    crew: AstronautRig[];
    holoGroup: THREE.Group;
  } {
    const cruiser = new THREE.Group();
    const outerHullMat = new THREE.MeshStandardMaterial({
      color: 0xe6edf5,
      roughness: 0.36,
      metalness: 0.28,
    });
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x3b4454,
      roughness: 0.34,
      metalness: 0.78,
    });
    const cabinWallMat = new THREE.MeshStandardMaterial({
      color: 0x1b2330,
      roughness: 0.62,
      metalness: 0.35,
    });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2b3443, roughness: 0.78 });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const glowAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // 1. Cylindrical Pressurized Habitation Hull Barrel (with circular porthole cutout facing +Z)
    const barrelOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 5.4, 32, 1, false, Math.PI * 0.24, Math.PI * 1.52),
      outerHullMat
    );
    barrelOuter.rotation.z = Math.PI / 2;
    cruiser.add(barrelOuter);

    // Circular Porthole Front Bulkhead Plate (RingGeometry aperture around r = 1.68 so the porthole is strictly ROUND!)
    const bulkheadShape = new THREE.Shape();
    bulkheadShape.absarc(0, 0, 3.18, 0, Math.PI * 2, false);
    const portholeHole = new THREE.Path();
    portholeHole.absarc(0, 0.05, 1.66, 0, Math.PI * 2, true);
    bulkheadShape.holes.push(portholeHole);

    const frontBulkhead = new THREE.Mesh(
      new THREE.ExtrudeGeometry(bulkheadShape, {
        depth: 0.28,
        bevelEnabled: true,
        bevelSize: 0.06,
        bevelThickness: 0.06,
        bevelSegments: 2,
      }),
      outerHullMat
    );
    frontBulkhead.position.set(0, 0, 2.05);
    cruiser.add(frontBulkhead);

    // Heavy Titanium Circular Porthole Frame + Gasket + Perimeter Rivets
    const portholeRim = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.14, 16, 48), titaniumMat);
    portholeRim.position.set(0, 0.05, 2.34);
    cruiser.add(portholeRim);

    const innerGasket = new THREE.Mesh(new THREE.TorusGeometry(1.61, 0.05, 10, 40), cabinWallMat);
    innerGasket.position.set(0, 0.05, 2.26);
    cruiser.add(innerGasket);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), outerHullMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(Math.cos(a) * 1.78, 0.05 + Math.sin(a) * 1.78, 2.43);
      cruiser.add(bolt);
    }

    // Subtle glass sheen ring inside circular aperture
    const glassPane = new THREE.Mesh(
      new THREE.CircleGeometry(1.62, 36),
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.09,
        roughness: 0.08,
        metalness: 0.15,
        depthWrite: false,
      })
    );
    glassPane.position.set(0, 0.05, 2.28);
    cruiser.add(glassPane);

    // 2. Aft Propulsion Spine, Twin Solar Array Wings & Glowing Ion Engine (visible on zoom-out!)
    const aftSpine = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 6.2, 20), titaniumMat);
    aftSpine.rotation.z = Math.PI / 2;
    aftSpine.position.set(-5.8, 0, 0);
    cruiser.add(aftSpine);

    const aftTank = new THREE.Mesh(new THREE.SphereGeometry(1.85, 20, 16), outerHullMat);
    aftTank.scale.set(1.2, 0.92, 0.92);
    aftTank.position.set(-6.0, 0, 0);
    cruiser.add(aftTank);

    const thrusterBell = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.25, 1.4, 20), titaniumMat);
    thrusterBell.rotation.z = Math.PI / 2;
    thrusterBell.position.set(-9.1, 0, 0);
    cruiser.add(thrusterBell);

    const ionPlume = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 3.8, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 })
    );
    ionPlume.rotation.z = Math.PI / 2;
    ionPlume.position.set(-11.4, 0, 0);
    cruiser.add(ionPlume);

    const solarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.solarCellMap,
      roughness: 0.25,
      metalness: 0.55,
    });
    [-1, 1].forEach((dir) => {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8.2, 8), titaniumMat);
      mast.position.set(-4.2, dir * 4.1, 0);
      cruiser.add(mast);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 7.6, 0.08), solarMat);
      wing.position.set(-4.2, dir * 5.2, 0);
      cruiser.add(wing);
    });

    // 3. Enclosed Illuminated Interior Crew Cabin Behind Round Porthole
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.4, 0.25), cabinWallMat);
    backWall.position.set(0, 0, -1.65);
    cruiser.add(backWall);

    [-2.35, 2.35].forEach((wx) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 3.9), cabinWallMat);
      sideWall.position.set(wx, 0, 0.25);
      cruiser.add(sideWall);
    });

    const ceilingWall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 3.9), cabinWallMat);
    ceilingWall.position.set(0, 1.65, 0.25);
    cruiser.add(ceilingWall);

    const deckFloor = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 3.9), cabinWallMat);
    deckFloor.position.set(0, -1.35, 0.25);
    cruiser.add(deckFloor);

    const cabinLight = new THREE.PointLight(0xe0f2fe, 12, 12, 1.1);
    cabinLight.position.set(0, 1.25, 0.9);
    cruiser.add(cabinLight);

    // Angled Navigation & Telemetry Console Desk + Glowing Controls + Datapad
    const consoleBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.52, 0.62), titaniumMat);
    consoleBase.position.set(0, -0.78, 0.95);
    cruiser.add(consoleBase);

    const consoleDeck = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.08, 0.7), cabinWallMat);
    consoleDeck.position.set(0, -0.5, 0.95);
    consoleDeck.rotation.x = -0.22;
    cruiser.add(consoleDeck);

    [-0.78, 0.78].forEach((mx, i) => {
      const mfd = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.34, 0.04),
        i === 0 ? glowCyan : glowAmber
      );
      mfd.position.set(mx, -0.34, 0.98);
      mfd.rotation.x = -0.52;
      mfd.rotation.y = mx < 0 ? 0.2 : -0.2;
      cruiser.add(mfd);
    });

    // Central 3D Holographic Earth-Mars Trajectory Projection spinning gently above the console
    const holoGroup = new THREE.Group();
    holoGroup.position.set(0, -0.02, 0.88);
    const holoRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.015, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    holoRing.rotation.x = Math.PI * 0.38;
    holoGroup.add(holoRing);

    const holoEarth = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    holoEarth.position.set(-0.22, -0.04, 0);
    holoGroup.add(holoEarth);

    const holoMars = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    holoMars.position.set(0.22, 0.05, 0);
    holoGroup.add(holoMars);
    cruiser.add(holoGroup);

    // Ergonomic Crew Chairs + Articulated Astronauts Seated Engaged at Console & Holo-Map
    const crew: AstronautRig[] = [];
    const seatSpecs: Array<{ x: number; yaw: number; accent: number }> = [
      { x: -0.78, yaw: 0.44, accent: 0xd99b26 }, // Pilot Morales angled inward toward console
      { x: 0.78, yaw: -0.48, accent: 0x2864b8 }, // Navigator Dr. Lin angled toward holo-map & Morales
    ];

    seatSpecs.forEach((spec) => {
      const chair = new THREE.Group();
      chair.position.set(spec.x, -1.25, -0.08);
      chair.rotation.y = spec.yaw;

      const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.52), seatMat);
      seatCushion.position.set(0, 0.46, 0.14);
      chair.add(seatCushion);

      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.88, 0.12), seatMat);
      seatBack.position.set(0, 0.88, -0.14);
      seatBack.rotation.x = -0.12;
      chair.add(seatBack);

      const rig = createAstronaut(spec.accent, 'aces');
      rig.group.position.set(0, 0.02, 0.04);
      chair.add(rig.group);
      crew.push(rig);

      cruiser.add(chair);
    });

    return { cruiser, crew, holoGroup };
  }

  private buildFieldSurveyRig(): THREE.Group {
    const rig = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3b4454, metalness: 0.72, roughness: 0.35 });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.25, roughness: 0.42 });
    const glowAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Three tripod legs
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 1.35, 8), metalMat);
      leg.position.set(Math.cos(a) * 0.28, 0.62, Math.sin(a) * 0.28);
      leg.rotation.z = Math.cos(a) * 0.26;
      leg.rotation.x = -Math.sin(a) * 0.26;
      rig.add(leg);
    }

    // Core scanner head + status screen
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.36), housingMat);
    head.position.set(0, 1.24, 0);
    rig.add(head);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.03), glowCyan);
    screen.position.set(0, 1.26, 0.18);
    rig.add(screen);

    // Core drill tube + amber beacon
    const drill = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 10), metalMat);
    drill.position.set(0, 0.56, 0);
    rig.add(drill);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), glowAmber);
    beacon.position.set(0, 1.44, 0);
    rig.add(beacon);

    // Sampled basalt outcrop below the drill
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({ color: 0x693424, roughness: 0.92 })
    );
    rock.scale.set(1.3, 0.55, 1.1);
    rock.position.set(0.1, 0.12, 0);
    rig.add(rock);

    return rig;
  }

  private buildTransitSpeck(): THREE.Group {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff8e7 })
    );
    g.add(core);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    g.add(halo);
    return g;
  }

  private buildCockpitInterior(): THREE.Group {
    const g = new THREE.Group();
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a2029, roughness: 0.6, metalness: 0.4 });
    const glowGreen = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const glowAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // Console dashboard in front of player seat
    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 0.8), panelMat);
    dash.position.set(0, 12.6, 0.35);
    g.add(dash);

    for (let i = -2; i <= 2; i++) {
      const mfd = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.24, 0.04),
        i === 0 ? glowAmber : glowGreen
      );
      mfd.position.set(i * 0.46, 12.74, -0.02);
      mfd.rotation.x = -0.35;
      g.add(mfd);
    }

    // Window struts framing the sky outside
    const leftStrut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.14), panelMat);
    leftStrut.position.set(-1.1, 13.6, -0.15);
    const rightStrut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.14), panelMat);
    rightStrut.position.set(1.1, 13.6, -0.15);
    const topStrut = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.2), panelMat);
    topStrut.position.set(0, 14.3, -0.1);
    g.add(leftStrut, rightStrut, topStrut);
    return g;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.keys.clear();
    this.isDragging = false;
  };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.keys.clear();
      this.isDragging = false;
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.phase !== 'survival') return;
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || this.phase !== 'survival') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.playerYaw -= dx * 0.0045;
    this.playerPitch = THREE.MathUtils.clamp(this.playerPitch - dy * 0.0035, -0.75, 0.85);
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
  };

  public startCutscene(fromStart = true): void {
    this.sound.unlock(false);
    this.sound.prefetchCutsceneVoiceovers();
    if (fromStart) {
      this.cutsceneTime = 0;
    }
    this.phase = 'cutscene';
    this.pushHudSnapshot(true);
  }

  public jumpToChapter(id: ChapterId): void {
    this.sound.unlock(true);
    this.sound.prefetchCutsceneVoiceovers([id, 'launch']);
    this.cutsceneTime = getChapterStartTime(id);
    this.phase = 'cutscene';
    this.pushHudSnapshot(true);
  }

  public skipToSurvival(): void {
    this.sound.unlock(true);
    this.sound.silenceLoops();
    this.enterSurvivalMode();
  }

  public pause(): void {
    if (this.phase === 'cutscene' || this.phase === 'survival') {
      this.phaseBeforePause = this.phase;
      this.phase = 'paused';
      this.sound.silenceLoops();
      this.keys.clear();
      this.pushHudSnapshot(true);
    }
  }

  private phaseBeforePause: 'cutscene' | 'survival' = 'cutscene';

  public resume(): void {
    if (this.phase === 'paused') {
      this.phase = this.phaseBeforePause;
      this.pushHudSnapshot(true);
    }
  }

  public returnToTitle(): void {
    this.sound.silenceLoops();
    this.phase = 'title';
    this.cutsceneTime = 0;
    this.keys.clear();
    this.pushHudSnapshot(true);
  }

  private enterSurvivalMode(): void {
    this.phase = 'survival';
    this.survivalTime = 0;
    this.oxygenPercent = 42;
    this.objectives = createInitialObjectives();
    this.playerPos.set(6, marsHeightAt(6, 16), 16);
    this.playerYaw = 0.24; // Facing toward crate, scorched pad, and legacy Ares II Hab
    this.playerPitch = 0.03;
    this.walkDistance = 0;
    this.lastFootstepStep = 0;
    this.keys.clear();
    this.pushHudSnapshot(true);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastFrameTs) / 1000;
    this.lastFrameTs = now;
    const maxDt = this.phase === 'cutscene' ? 0.5 : 0.08;
    const dt = Math.min(Math.max(rawDt, 0.001), maxDt);

    if (this.phase === 'title') {
      this.titleTime += dt;
      this.updateTitleScene(this.titleTime);
    } else if (this.phase === 'cutscene') {
      this.cutsceneTime += dt;
      if (this.cutsceneTime >= TOTAL_CUTSCENE_DURATION) {
        this.enterSurvivalMode();
      } else {
        this.updateCutsceneScene(dt);
      }
    } else if (this.phase === 'survival') {
      this.survivalTime += dt;
      this.updateSurvivalScene(dt);
    }

    this.renderer.render(this.scene, this.camera);

    if (now - this.lastHudPushTs >= 90) {
      this.lastHudPushTs = now;
      this.pushHudSnapshot(false);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateTitleScene(t: number): void {
    this.earthGroup.visible = true;
    this.spaceGroup.visible = false;
    this.marsGroup.visible = false;
    this.cockpitGroup.visible = false;
    this.exhaustParticles.visible = false;

    this.scene.background = _c1.copy(SKY_EARTH);
    (this.scene.fog as THREE.FogExp2).color.copy(SKY_EARTH);
    (this.scene.fog as THREE.FogExp2).density = 0.0038;
    this.keyLight.color.setHex(0xfff1dc);
    this.keyLight.intensity = 2.2;
    this.keyLight.position.set(45, 70, 35);
    this.hemiLight.color.setHex(0xbbe0ff);
    this.hemiLight.groundColor.setHex(0x5c4632);
    this.hemiLight.intensity = 0.75;

    this.earthRocket.group.position.set(0, 1.45, 0);
    this.earthRocket.flames.forEach((f) => (f.visible = false));
    this.earthRocket.boosters.forEach((b) => {
      b.visible = true;
      b.position.set(b.position.x > 0 ? 2.75 : -2.75, 0, 0);
      b.rotation.set(0, 0, 0);
    });
    this.earthComplex.accessArm.rotation.y = 0;

    // Scenic sweeping tour of Ares IV pad & crew
    const ang = t * 0.14;
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(Math.sin(ang) * 24 + 6, 9.5 + Math.sin(t * 0.3) * 1.4, Math.cos(ang) * 24 + 14);
    this.camera.lookAt(0, 8.2, 4);
  }

  private updateCutsceneScene(dt: number): void {
    const state = resolveCutsceneState(this.cutsceneTime);
    const id = state.chapter.id;
    const lt = state.localTime;
    const lp = state.localProgress;
    const subKey = state.activeSubtitle
      ? `${state.chapter.id}:${state.activeSubtitle.at}:${state.activeSubtitle.speaker}`
      : '';
    const subTone = state.activeSubtitle?.tone ?? 'normal';
    const subSpeaker = state.activeSubtitle?.speaker ?? '';
    const subText = state.activeSubtitle?.text ?? '';

    if (id === 'earth_farewell') {
      this.earthGroup.visible = true;
      this.spaceGroup.visible = false;
      this.marsGroup.visible = false;
      this.cockpitGroup.visible = false;
      this.exhaustParticles.visible = false;
      this.sound.updateCutsceneAudio(id, lt, 0, false, subKey, subTone, subSpeaker, subText);

      this.scene.background = _c1.copy(SKY_EARTH);
      (this.scene.fog as THREE.FogExp2).color.copy(SKY_EARTH);
      (this.scene.fog as THREE.FogExp2).density = 0.0038;
      this.keyLight.color.setHex(0xfff1dc);
      this.keyLight.intensity = 2.2;
      this.hemiLight.color.setHex(0xbbe0ff);
      this.hemiLight.groundColor.setHex(0x5c4632);

      this.earthRocket.group.position.set(0, 1.45, 0);
      this.earthRocket.flames.forEach((f) => (f.visible = false));
      this.earthComplex.accessArm.rotation.y = 0;

      // Crewmates in articulated NASA ACES suits walk steadily forward toward the launch tower
      const walkZ = THREE.MathUtils.lerp(31.5, 16.5, lp);
      this.earthComplex.farewellCrowd.forEach((astro, idx) => {
        const xBase = idx === 0 ? -1.45 : idx === 1 ? 1.45 : -0.55;
        const zOffset = idx * 1.6;
        const gait = lt * 5.2 + idx * 1.4;
        astro.group.position.set(xBase, 0.3, walkZ - zOffset);
        astro.group.rotation.y = Math.PI; // Procedural rig faces +Z; PI faces -Z toward rocket
        poseAstronautWalk(astro, gait, 1.0);
      });

      // First-person camera walks steadily forward down the departure wing looking toward the Ares IV stack
      const camZ = THREE.MathUtils.lerp(33.5, 18.2, lp);
      const bobY = 1.92 + Math.abs(Math.sin(lt * 5.2)) * 0.045;
      this.camera.position.set(0.12 + Math.sin(lt * 2.6) * 0.04, bobY, camZ);
      this.camera.fov = 62;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(Math.sin(lt * 0.8) * 0.9, 3.2, camZ - 16);
    } else if (id === 'boarding') {
      this.earthGroup.visible = true;
      this.spaceGroup.visible = false;
      this.marsGroup.visible = false;
      this.sound.updateCutsceneAudio(id, lt, 0, false, subKey, subTone, subSpeaker, subText);

      this.earthRocket.group.position.set(0, 1.45, 0);
      this.earthRocket.flames.forEach((f) => (f.visible = false));

      if (lt < 3.8) {
        // Walking across elevated crew access arm into spacecraft hatch
        this.cockpitGroup.visible = false;
        const p = lt / 3.8;
        const armX = THREE.MathUtils.lerp(-5.2, -1.6, p);
        const bob = Math.abs(Math.sin(lt * 5.4)) * 0.04;
        this.camera.position.set(armX, 11.4 + bob, 1.4);
        this.camera.fov = 62;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(0, 11.5, 1.4);
      } else {
        // Inside spacecraft cockpit seated looking out forward canopy
        this.cockpitGroup.visible = true;
        const p = (lt - 3.8) / 3.7;
        this.camera.position.set(0, 13.55 - p * 0.08, 0.9);
        this.camera.fov = 66;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(-1.5 + p * 0.8, 13.7 + p * 0.6, -12);
      }
    } else if (id === 'launch') {
      this.earthGroup.visible = true;
      this.spaceGroup.visible = false;
      this.marsGroup.visible = false;
      this.cockpitGroup.visible = false;

      const { count, ignited } = getLaunchCountdownValue(lt);
      this.sound.updateCutsceneAudio(id, lt, count, ignited, subKey, subTone, subSpeaker, subText);

      // Retract crew access arm at T-3s
      const armRetract = THREE.MathUtils.clamp((lt - 4.2) / 2.2, 0, 1);
      this.earthComplex.accessArm.rotation.y = armRetract * 1.15;

      if (!ignited) {
        this.earthRocket.group.position.set(0, 1.45, 0);
        this.earthRocket.flames.forEach((f) => (f.visible = false));
        this.exhaustParticles.visible = lt > LAUNCH_IGNITION_TIME - 1.0;
        // Dramatic low-angle pad view looking up at Ares IV during countdown
        const shake = lt > LAUNCH_IGNITION_TIME - 1.0 ? (Math.random() - 0.5) * 0.08 : 0;
        this.camera.position.set(14 + shake, 4.2 + shake, 19);
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(0, 9.5, 0);
      } else {
        const ft = lt - LAUNCH_IGNITION_TIME;
        const rocketY = 1.45 + Math.pow(ft, 2.25) * 2.4;
        this.earthRocket.group.position.set(0, rocketY, 0);
        this.earthRocket.flames.forEach((f, idx) => {
          f.visible = true;
          const flicker = 0.88 + Math.random() * 0.28;
          f.scale.set(1, flicker, 1);
          if (idx > 0 && ft > 4.6) {
            // Side SRB boosters detach at ft > 4.6s (lt ~ 11.6s)!
            f.visible = false;
          }
        });

        // Booster separation animation
        if (ft > 4.6) {
          const sepT = ft - 4.6;
          this.earthRocket.boosters.forEach((b, idx) => {
            const dir = idx === 0 ? -1 : 1;
            b.position.set(dir * (2.75 + sepT * 3.8), -sepT * sepT * 2.2, 0);
            b.rotation.z = dir * sepT * 0.45;
          });
        }

        // Exhaust billows at pad
        this.exhaustParticles.visible = ft < 4.5;
        const pAttr = this.exhaustParticles.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pAttr.count; i++) {
          let px = pAttr.getX(i);
          let py = pAttr.getY(i);
          let pz = pAttr.getZ(i);
          px += (px >= 0 ? 1 : -1) * dt * 9;
          pz += (pz >= 0 ? 1 : -1) * dt * 9;
          py += dt * (2 + Math.random() * 3);
          if (Math.hypot(px, pz) > 26) {
            px = (Math.random() - 0.5) * 4;
            py = 1.6;
            pz = (Math.random() - 0.5) * 4;
          }
          pAttr.setXYZ(i, px, py, pz);
        }
        pAttr.needsUpdate = true;

        // Sky transitions smoothly from blue Earth atmosphere -> deep space black!
        const spaceMix = THREE.MathUtils.clamp((ft - 2.0) / 5.5, 0, 1);
        _c1.copy(SKY_EARTH).lerp(SKY_ORBIT, spaceMix);
        this.scene.background = _c1;
        (this.scene.fog as THREE.FogExp2).color.copy(_c1);
        (this.scene.fog as THREE.FogExp2).density = THREE.MathUtils.lerp(0.0038, 0.0005, spaceMix);

        // Camera tracks rocket upward with intense liftoff vibration damping out in upper atmosphere
        const shakeAmp = Math.max(0.04, 0.35 * (1 - spaceMix));
        const sx = (Math.random() - 0.5) * shakeAmp;
        const sy = (Math.random() - 0.5) * shakeAmp;
        this.camera.position.set(
          15 + ft * 0.9 + sx,
          Math.max(4.5, rocketY - 2.5) + sy,
          20 + ft * 1.1
        );
        this.camera.fov = 60 + spaceMix * 10;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(0, rocketY + 6.5, 0);
      }
    } else if (id === 'transit_8_months') {
      this.earthGroup.visible = false;
      this.spaceGroup.visible = true;
      this.marsGroup.visible = false;
      this.sound.updateCutsceneAudio(id, lt, 0, false, subKey, subTone, subSpeaker, subText);

      this.scene.background = _c1.copy(SKY_ORBIT);
      (this.scene.fog as THREE.FogExp2).density = 0;
      this.keyLight.color.setHex(0xfffaf0);
      this.keyLight.intensity = 2.6;
      this.keyLight.position.set(-180, 90, 220);
      this.hemiLight.intensity = 0.42;

      const { progressPercent } = getTransitProgress(lp);
      const tNorm = progressPercent / 100;

      // Astronomical-scale trajectory curve across hundreds of units from giant Earth to distant giant Mars
      const p0 = new THREE.Vector3(-42, 2, -56);
      const p1 = new THREE.Vector3(215, 46, -135);
      const p2 = new THREE.Vector3(468, 14, -278);
      const inv = 1 - tNorm;
      _v1.set(0, 0, 0)
        .addScaledVector(p0, inv * inv)
        .addScaledVector(p1, 2 * inv * tNorm)
        .addScaledVector(p2, tNorm * tNorm);

      this.earthSphere.rotation.y += dt * 0.08;
      this.earthCloudSphere.rotation.y += dt * 0.11;
      this.marsSphere.rotation.y += dt * 0.09;

      // Animate holographic Earth-Mars nav projection + active crew tasks inside circular porthole
      this.transitHoloGroup.rotation.y += dt * 0.8;
      if (this.transitCrew.length >= 2) {
        poseAstronautSeatedTask(this.transitCrew[0], lt, 'pilot');
        poseAstronautSeatedTask(this.transitCrew[1], lt, 'navigator');
      }

      // Stage 1 (lt 0..3.6s): Close cinematic view through circular spacecraft porthole at working crew
      // Stage 2 (lt 3.6..6.2s): Continuous zoom-out revealing full cruiser -> tiny speck between massive Earth & distant Mars
      // Stage 3 (lt 6.2..12.0s): 8-month timeline crossing vast deep space until colossal Mars fills view
      if (lt < 3.6) {
        this.transitCruiser.visible = true;
        this.transitCruiser.position.copy(p0);
        this.transitCruiser.scale.setScalar(1);
        this.transitSpeck.visible = false;
        this.transitArcLine.visible = false;

        const panP = THREE.MathUtils.smoothstep(lt, 0, 3.6);
        const camX = THREE.MathUtils.lerp(p0.x - 0.55, p0.x + 0.55, panP);
        const camZ = THREE.MathUtils.lerp(p0.z + 5.6, p0.z + 7.2, panP);
        this.camera.fov = 50;
        this.camera.updateProjectionMatrix();
        this.camera.position.set(camX, p0.y + 0.12, camZ);
        this.camera.lookAt(p0.x, p0.y - 0.02, p0.z + 0.45);
      } else if (lt < 6.2) {
        const zoomP = THREE.MathUtils.smoothstep(lt, 3.6, 6.2);
        // Smoothly shrink the actual cruiser into a speck before handing off to bright beacon speck
        this.transitCruiser.visible = zoomP < 0.65;
        this.transitCruiser.position.copy(_v1);
        this.transitCruiser.scale.setScalar(THREE.MathUtils.lerp(1.0, 0.07, zoomP));
        this.transitSpeck.visible = zoomP >= 0.42;
        this.transitArcLine.visible = zoomP >= 0.3;
        this.transitSpeck.position.copy(_v1);
        this.transitSpeck.scale.setScalar(THREE.MathUtils.lerp(0.6, 1.5, zoomP));

        // Pull back far enough that colossal Earth (left) & distant Mars (right) frame the vast void
        const camX = THREE.MathUtils.lerp(p0.x + 0.55, 140, zoomP);
        const camY = THREE.MathUtils.lerp(p0.y + 0.12, 38, zoomP);
        const camZ = THREE.MathUtils.lerp(p0.z + 7.2, 285, zoomP);
        this.camera.fov = THREE.MathUtils.lerp(50, 60, zoomP);
        this.camera.updateProjectionMatrix();
        this.camera.position.set(camX, camY, camZ);
        _v2.set(p0.x, p0.y, p0.z).lerp(new THREE.Vector3(175, 4, -210), zoomP);
        this.camera.lookAt(_v2);
      } else {
        // Timeline moving forward: tiny speck of light crosses vast interplanetary gulf toward giant Mars!
        this.transitCruiser.visible = false;
        this.transitSpeck.visible = true;
        this.transitArcLine.visible = true;
        this.transitSpeck.position.copy(_v1);

        const pulse = 1.3 + Math.sin(lt * 7.5) * 0.25;
        this.transitSpeck.scale.setScalar(pulse);

        // Glide across vast space tracking the speck, leaving Earth behind until colossal Mars fills view
        const approach = THREE.MathUtils.smoothstep(tNorm, 0.08, 1.0);
        const camX = THREE.MathUtils.lerp(140, 425, approach);
        const camY = THREE.MathUtils.lerp(38, 22, approach);
        const camZ = THREE.MathUtils.lerp(285, -172, approach);
        this.camera.fov = THREE.MathUtils.lerp(60, 52, approach);
        this.camera.updateProjectionMatrix();
        this.camera.position.set(camX, camY, camZ);
        _v2.set(175, 4, -210).lerp(this.marsSphere.position, approach * 0.94);
        this.camera.lookAt(_v2);
      }
    } else if (id === 'mars_landing') {
      this.earthGroup.visible = false;
      this.spaceGroup.visible = false;
      this.marsGroup.visible = true;
      this.sound.updateCutsceneAudio(id, lt, 0, false, subKey, subTone, subSpeaker, subText);

      this.scene.background = _c1.copy(SKY_MARS_DAY);
      (this.scene.fog as THREE.FogExp2).color.copy(SKY_MARS_DAY);
      (this.scene.fog as THREE.FogExp2).density = 0.0085;
      this.keyLight.color.setHex(0xffd2b3);
      this.keyLight.intensity = 2.1;
      this.keyLight.position.set(50, 55, 25);
      this.hemiLight.color.setHex(0xd68c6c);
      this.hemiLight.groundColor.setHex(0x522112);
      this.hemiLight.intensity = 0.72;

      this.marsCrew.forEach((c) => (c.group.visible = false));

      // Gentle retro-thruster descent onto pad at (0, -36)
      const padY = marsHeightAt(0, -36);
      const easeOut = 1 - Math.pow(1 - Math.min(1, lt / 7.8), 3);
      const shipY = THREE.MathUtils.lerp(padY + 52, padY, easeOut);
      this.marsMav.group.position.set(0, shipY, -36);
      this.marsMav.landingLegs.forEach((l) => (l.visible = true));
      this.marsMav.flames[0].visible = lt < 7.8;
      this.marsMav.flames[0].scale.set(0.85, 0.5 + Math.random() * 0.2, 0.85);

      // Gentle camera framing showing MAV descending beside legacy Ares II Hab & Rover!
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(16 - lp * 6, padY + 4.5 - lp * 1.2, -14);
      this.camera.lookAt(-4, shipY + 5.5, -40);
    } else if (id === 'mars_arrival_timelapse') {
      this.earthGroup.visible = false;
      this.spaceGroup.visible = false;
      this.marsGroup.visible = true;
      this.sound.updateCutsceneAudio(id, lt, 0, false, subKey, subTone, subSpeaker, subText);

      const padY = marsHeightAt(0, -36);
      this.marsMav.group.position.set(0, padY, -36);
      this.marsMav.flames[0].visible = false;

      if (lt < 5.4) {
        // First-person stepping out onto Mars with team, walking toward previous mission relics
        const walkT = lt / 5.4;
        this.scene.background = _c1.copy(SKY_MARS_DAY);
        (this.scene.fog as THREE.FogExp2).color.copy(SKY_MARS_DAY);
        (this.scene.fog as THREE.FogExp2).density = 0.008;
        this.keyLight.position.set(45, 55, 25);
        this.keyLight.intensity = 2.1;

        this.marsCrew.forEach((c, idx) => {
          c.group.visible = true;
          const cx = -8.2 + idx * 2.8;
          const cz = THREE.MathUtils.lerp(-31, -43, walkT) - idx * 1.2;
          const gait = lt * 4.5 + idx;
          c.group.position.set(cx, marsHeightAt(cx, cz), cz);
          c.group.rotation.y = Math.PI * 0.85;
          poseAstronautWalk(c, gait, 0.92);
        });

        const camZ = THREE.MathUtils.lerp(-29, -40, walkT);
        const camY = marsHeightAt(1.2, camZ) + 1.85 + Math.abs(Math.sin(lt * 4.5)) * 0.04;
        this.camera.position.set(1.2, camY, camZ);
        this.camera.fov = 62;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(-16, marsHeightAt(-16, -48) + 2.5, -50);
      } else {
        // SOL TIMELAPSE (Sol 01 -> Sol 18): rapid sun arcs, sweeping shadows, Phobos zipping, solar panels tracking!
        const tl = lt - 5.4;
        const cycle = tl * 2.2;
        const sunAngle = (cycle % Math.PI);
        const sunX = Math.cos(sunAngle) * 85;
        const sunY = Math.max(8, Math.sin(sunAngle) * 80);
        this.keyLight.position.set(sunX, sunY, -25);
        this.marsEnv.sunDisc.position.set(sunX * 1.4, sunY * 1.1, -135);
        this.marsEnv.phobosDisc.position.set(Math.sin(tl * 4.2) * 55, 42, -115);

        const dayWarmth = Math.sin(sunAngle);
        _c1.copy(SKY_MARS_DUSK).lerp(SKY_MARS_DAY, dayWarmth);
        this.scene.background = _c1;
        (this.scene.fog as THREE.FogExp2).color.copy(_c1);
        this.keyLight.intensity = 0.8 + dayWarmth * 1.7;

        // Solar panels track the sun rapidly during timelapse
        this.marsEnv.solarPanels.forEach((p) => {
          p.rotation.z = Math.cos(sunAngle) * 0.35;
        });

        // Crew walking around camp
        this.marsCrew.forEach((c, idx) => {
          c.group.visible = true;
          const ang = tl * 1.4 + idx * 2.1;
          const cx = -13 + Math.sin(ang) * 4.2;
          const cz = -46 + Math.cos(ang) * 4.2;
          c.group.position.set(cx, marsHeightAt(cx, cz), cz);
          c.group.rotation.y = ang + Math.PI * 0.5;
          poseAstronautWalk(c, tl * 6.0 + idx, 0.95);
        });

        this.camera.position.set(18, padY + 12, -22);
        this.camera.fov = 56;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(-14, padY + 2, -48);
      }
    } else if (id === 'storm_evacuation') {
      this.earthGroup.visible = false;
      this.spaceGroup.visible = false;
      this.marsGroup.visible = true;
      this.sound.updateCutsceneAudio(id, lt, 0, false, subKey, subTone, subSpeaker, subText);

      const padY = marsHeightAt(0, -36);
      const alertAt = 5.8;

      if (lt < alertAt) {
        // Stage A (lt 0..5.8s): Sol 19 calm sunny morning; our astronaut works calmly on North Ridge core survey far from MAV
        this.scene.background = _c1.copy(SKY_MARS_DAY);
        (this.scene.fog as THREE.FogExp2).color.copy(SKY_MARS_DAY);
        (this.scene.fog as THREE.FogExp2).density = 0.0078;
        this.keyLight.position.set(42, 50, 26);
        this.keyLight.intensity = 2.05;

        const pAttr = this.marsEnv.dustParticles.geometry.attributes.position as THREE.BufferAttribute;
        (this.marsEnv.dustParticles.material as THREE.PointsMaterial).opacity = 0.16;
        for (let i = 0; i < pAttr.count; i++) {
          let px = pAttr.getX(i) + dt * 3.0;
          if (px > 70) px = -70;
          pAttr.setXYZ(i, px, pAttr.getY(i), pAttr.getZ(i));
        }
        pAttr.needsUpdate = true;

        // Teammates working calmly right near the MAV and legacy Hab (~70m downrange)
        this.marsCrew.forEach((c, idx) => {
          c.group.visible = true;
          const baseX = -5.5 + idx * 4.5;
          const baseZ = -26.5 + (idx % 2) * 2.5;
          const walkZ = baseZ + Math.sin(lt * 0.6 + idx) * 2.0;
          c.group.position.set(baseX, marsHeightAt(baseX, walkZ), walkZ);
          c.group.rotation.y = Math.cos(lt * 0.6 + idx) >= 0 ? 0 : Math.PI;
          poseAstronautWalk(c, lt * 3.2 + idx, 0.45);
        });

        this.marsMav.group.position.set(0, padY, -36);
        this.marsMav.group.rotation.set(0, 0, 0);
        this.marsMav.flames[0].visible = false;

        // First-person astronaut calmly surveying North Ridge core rig, glancing up toward distant MAV before alert
        const standX = 13.0;
        const standZ = 35.6;
        const standY = marsHeightAt(standX, standZ) + 1.66;
        this.camera.position.set(standX, standY + Math.sin(lt * 1.4) * 0.02, standZ);
        this.camera.fov = 62;
        this.camera.updateProjectionMatrix();

        const lookUp = THREE.MathUtils.smoothstep(lt, 3.6, 5.7);
        const lookX = THREE.MathUtils.lerp(14.2, 0.5, lookUp);
        const lookY = THREE.MathUtils.lerp(
          marsHeightAt(14.2, 34.0) + 1.05,
          padY + 5.5,
          lookUp
        );
        const lookZ = THREE.MathUtils.lerp(34.0, -34.0, lookUp);
        this.camera.lookAt(lookX, lookY, lookZ);
      } else {
        // Stage B (lt >= 5.8s): Sudden RED ALERT! Storm builds gradually from horizon, crew sprints to MAV, comms severed, forced takeoff!
        const stormT = lt - alertAt;
        const stormSeverity = THREE.MathUtils.clamp(stormT / 7.5, 0.08, 1);
        _c1.copy(SKY_MARS_DAY).lerp(SKY_MARS_STORM, stormSeverity);
        this.scene.background = _c1;
        (this.scene.fog as THREE.FogExp2).color.copy(_c1);
        (this.scene.fog as THREE.FogExp2).density = THREE.MathUtils.lerp(0.0085, 0.038, stormSeverity);
        this.keyLight.intensity = 2.0 - stormSeverity * 1.15;

        // Whipping cyclone dust particles accelerating steadily
        const pAttr = this.marsEnv.dustParticles.geometry.attributes.position as THREE.BufferAttribute;
        (this.marsEnv.dustParticles.material as THREE.PointsMaterial).opacity =
          0.24 + stormSeverity * 0.72;
        for (let i = 0; i < pAttr.count; i++) {
          let px = pAttr.getX(i) + dt * (10 + stormSeverity * 60);
          const py = pAttr.getY(i);
          if (px > 70) px = -70;
          pAttr.setXYZ(i, px, py, pAttr.getZ(i));
        }
        pAttr.needsUpdate = true;

        // Teammates right beside MAV sprint straight to airlock hatch and board (before lt = 10.6s)
        this.marsCrew.forEach((c, idx) => {
          const reachT = THREE.MathUtils.clamp(stormT / 4.4, 0, 1);
          c.group.visible = stormT < 4.9;
          const startX = -5.5 + idx * 4.5;
          const startZ = -26.5 + (idx % 2) * 2.5;
          const cx = THREE.MathUtils.lerp(startX, (idx - 1) * 0.9, reachT);
          const cz = THREE.MathUtils.lerp(startZ, -35.2, reachT);
          c.group.position.set(cx, marsHeightAt(cx, cz), cz);
          c.group.rotation.y = Math.PI;
          poseAstronautSprint(c, stormT * 9.5 + idx);
        });

        // Comms severed at 11.8s -> crew forced to ignite MAV at 12.2s without waiting!
        if (lt >= 12.2) {
          const ascT = lt - 12.2;
          const mavY = padY + Math.pow(ascT, 2.05) * 4.2;
          this.marsMav.group.position.set(0, mavY, -36);
          this.marsMav.group.rotation.z = Math.sin(lt * 5) * 0.015;
          this.marsMav.flames[0].visible = true;
          this.marsMav.flames[0].scale.set(1.15, 0.85 + Math.random() * 0.4, 1.15);
        } else {
          this.marsMav.group.position.set(0, padY, -36);
          this.marsMav.group.rotation.z = Math.sin(lt * 7) * 0.03 * stormSeverity;
          this.marsMav.flames[0].visible = false;
        }

        // Stranded astronaut sprints desperately from North Ridge toward the distant MAV but falls short!
        const runP = THREE.MathUtils.clamp(stormT / 9.2, 0, 1);
        const myX = THREE.MathUtils.lerp(13.0, 6.2, runP) + Math.sin(stormT * 2.4) * 0.45;
        const myZ = THREE.MathUtils.lerp(35.6, 15.5, runP);
        const shake = 0.03 + stormSeverity * 0.19;
        const fallP = lt > 15.2 ? THREE.MathUtils.clamp((lt - 15.2) / 1.4, 0, 1) : 0;
        const fallOffset = -fallP * 1.45;

        this.camera.position.set(
          myX + (Math.random() - 0.5) * shake,
          marsHeightAt(myX, myZ) + 1.82 + Math.abs(Math.sin(stormT * 7.5)) * 0.065 + fallOffset,
          myZ
        );
        this.camera.fov = 66;
        this.camera.updateProjectionMatrix();
        const targetY = lt >= 12.2 ? this.marsMav.group.position.y + 6.5 : padY + 6.0;
        this.camera.lookAt(0, targetY + fallOffset * 2.2, -36);
      }
    } else if (id === 'awakening') {
      this.earthGroup.visible = false;
      this.spaceGroup.visible = false;
      this.marsGroup.visible = true;
      this.sound.updateCutsceneAudio(id, lt, 0, false, subKey, subTone, subSpeaker, subText);

      this.marsMav.group.position.set(0, 400, -36); // MAV is long gone
      this.marsCrew.forEach((c) => (c.group.visible = false));

      // Calm amber stillness after the storm
      this.scene.background = _c1.copy(SKY_MARS_DAY);
      (this.scene.fog as THREE.FogExp2).color.copy(SKY_MARS_DAY);
      (this.scene.fog as THREE.FogExp2).density = 0.009;
      this.keyLight.position.set(42, 48, 28);
      this.keyLight.intensity = 1.95;
      (this.marsEnv.dustParticles.material as THREE.PointsMaterial).opacity = 0.2;

      // Camera wakes up lying in the regolith at (6, 16), slowly pushing up to standing height!
      const standUp = THREE.MathUtils.smoothstep(lt, 1.2, 5.2);
      const groundY = marsHeightAt(6, 16);
      this.camera.position.set(6, groundY + THREE.MathUtils.lerp(0.35, 1.85, standUp), 16);
      this.camera.fov = 64;
      this.camera.updateProjectionMatrix();

      // Pan gaze from the empty scorched MAV pad toward the glowing Ares II Legacy Hab beacon
      const lookPan = THREE.MathUtils.smoothstep(lt, 4.5, 8.6);
      const lookX = THREE.MathUtils.lerp(0, -20, lookPan);
      const lookZ = THREE.MathUtils.lerp(-36, -50, lookPan);
      this.camera.lookAt(lookX, marsHeightAt(lookX, lookZ) + 2.5, lookZ);
    }
  }

  private updateSurvivalScene(dt: number): void {
    this.earthGroup.visible = false;
    this.spaceGroup.visible = false;
    this.marsGroup.visible = true;
    this.marsMav.group.position.set(0, 400, -36);
    this.marsCrew.forEach((c) => (c.group.visible = false));

    this.scene.background = _c1.copy(SKY_MARS_DAY);
    (this.scene.fog as THREE.FogExp2).color.copy(SKY_MARS_DAY);
    (this.scene.fog as THREE.FogExp2).density = 0.0085;
    this.keyLight.position.set(42, 48, 28);
    this.keyLight.intensity = 2.0;

    // Gentle ambient Mars dust drift
    const pAttr = this.marsEnv.dustParticles.geometry.attributes.position as THREE.BufferAttribute;
    (this.marsEnv.dustParticles.material as THREE.PointsMaterial).opacity = 0.22;
    for (let i = 0; i < pAttr.count; i++) {
      let px = pAttr.getX(i) + dt * 3.5;
      if (px > 70) px = -70;
      pAttr.setXYZ(i, px, pAttr.getY(i), pAttr.getZ(i));
    }
    pAttr.needsUpdate = true;

    // Keyboard turn support (Q/E or ArrowLeft/ArrowRight) + WASD / ArrowUp/Down movement
    const turnSpeed = 1.85;
    if (this.keys.has('KeyQ') || this.keys.has('ArrowLeft')) this.playerYaw += turnSpeed * dt;
    if (this.keys.has('KeyE') || this.keys.has('ArrowRight')) this.playerYaw -= turnSpeed * dt;

    let forward = 0;
    let strafe = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyA')) strafe -= 1;
    if (this.keys.has('KeyD')) strafe += 1;

    const speed = 10.5;
    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe);
      const nf = forward / len;
      const ns = strafe / len;
      const sinY = Math.sin(this.playerYaw);
      const cosY = Math.cos(this.playerYaw);
      const dx = (-sinY * nf + cosY * ns) * speed * dt;
      const dz = (-cosY * nf - sinY * ns) * speed * dt;

      this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x + dx, -95, 95);
      this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z + dz, -105, 65);
      const moved = Math.hypot(dx, dz);
      this.walkDistance += moved;

      const stepIdx = Math.floor(this.walkDistance / 2.2);
      if (stepIdx !== this.lastFootstepStep) {
        this.lastFootstepStep = stepIdx;
        this.sound.playFootstep(true);
      }
    }

    const groundY = marsHeightAt(this.playerPos.x, this.playerPos.z);
    const bob = Math.sin(this.walkDistance * 2.4) * 0.055;
    this.camera.position.set(this.playerPos.x, groundY + 1.85 + bob, this.playerPos.z);
    this.camera.fov = 64;
    this.camera.updateProjectionMatrix();

    // Look vector from yaw + pitch
    const cosP = Math.cos(this.playerPitch);
    _v1.set(
      this.camera.position.x - Math.sin(this.playerYaw) * cosP * 10,
      this.camera.position.y + Math.sin(this.playerPitch) * 10,
      this.camera.position.z - Math.cos(this.playerYaw) * cosP * 10
    );
    this.camera.lookAt(_v1);

    // Oxygen slowly drains, boosted if crate collected
    this.oxygenPercent = Math.max(12, this.oxygenPercent - dt * 0.14);

    // Distance to Ares II Hab for homing beacon audio
    const distToHab = Math.hypot(this.playerPos.x + 26, this.playerPos.z + 52);
    this.sound.updateSurvivalAudio(this.survivalTime, distToHab);

    // Check survival objectives
    const evalRes = evaluateObjectivesAtPosition(this.objectives, this.playerPos.x, this.playerPos.z);
    if (evalRes.newlyCompleted.length > 0) {
      this.objectives = evalRes.updated;
      this.sound.playObjectiveChime();
      if (evalRes.newlyCompleted.some((o) => o.id === 'crate')) {
        this.oxygenPercent = Math.min(100, this.oxygenPercent + 35);
      }
      if (evalRes.allDone) {
        this.phase = 'complete';
        this.sound.silenceLoops();
      }
      this.pushHudSnapshot(true);
    }
  }

  private computeWaypoints(): WaypointProjection[] {
    if (this.phase !== 'survival') return [];
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.updateMatrixWorld();

    return this.objectives.map((obj) => {
      const worldY = marsHeightAt(obj.x, obj.z) + 2.8;
      _proj.set(obj.x, worldY, obj.z);
      const distM = Math.round(_proj.distanceTo(this.camera.position));
      _proj.project(this.camera);
      const inFront = _proj.z >= -1 && _proj.z <= 1;
      const sx = ((_proj.x + 1) * 0.5) * w;
      const sy = ((-_proj.y + 1) * 0.5) * h;
      const onScreen = inFront && sx >= 40 && sx <= w - 40 && sy >= 40 && sy <= h - 40;
      return {
        id: obj.id,
        label: obj.label,
        x: sx,
        y: sy,
        distanceM: distM,
        visible: onScreen && !obj.completed,
        completed: obj.completed,
      };
    });
  }

  private pushHudSnapshot(_force: boolean): void {
    const cState = resolveCutsceneState(this.cutsceneTime);
    const id = cState.chapter.id;
    const lt = cState.localTime;
    const lp = cState.localProgress;

    const launchInfo =
      id === 'launch'
        ? getLaunchCountdownValue(lt)
        : { count: 0, ignited: false, altitudeKm: 0, velocityKms: 0 };

    const transitInfo =
      id === 'transit_8_months'
        ? getTransitProgress(lp)
        : { monthsElapsed: 0, daysElapsed: 0, distanceMillionKm: 0, progressPercent: 0 };

    let solNumber = 0;
    if (id === 'mars_landing') solNumber = 1;
    else if (id === 'mars_arrival_timelapse') {
      solNumber = lt < 5.4 ? 1 : Math.min(18, 1 + Math.round(((lt - 5.4) / 6.1) * 17));
    } else if (id === 'storm_evacuation') solNumber = 19;
    else if (id === 'awakening' || this.phase === 'survival' || this.phase === 'complete') {
      solNumber = 23;
    }

    let blackoutOpacity = 0;
    if (id === 'storm_evacuation' && lt > 15.8) {
      blackoutOpacity = THREE.MathUtils.clamp((lt - 15.8) / 2.2, 0, 1);
    } else if (id === 'awakening' && lt < 2.4) {
      blackoutOpacity = 1 - THREE.MathUtils.clamp(lt / 2.4, 0, 1);
    }

    this.onHudUpdate({
      phase: this.phase,
      chapterId: id,
      chapterIndex: cState.chapter.index,
      chapterTitle: cState.chapter.title,
      location: cState.chapter.location,
      localTime: lt,
      localProgress: lp,
      totalProgress: cState.totalProgress,
      subtitleSpeaker: cState.activeSubtitle?.speaker ?? null,
      subtitleText: cState.activeSubtitle?.text ?? null,
      subtitleTone: cState.activeSubtitle?.tone ?? 'normal',
      countdownNumber: launchInfo.count,
      ignited: launchInfo.ignited,
      altitudeKm: launchInfo.altitudeKm,
      velocityKms: launchInfo.velocityKms,
      transitMonths: transitInfo.monthsElapsed,
      transitDays: transitInfo.daysElapsed,
      transitDistanceMkm: transitInfo.distanceMillionKm,
      transitPercent: transitInfo.progressPercent,
      solNumber,
      stormAlertActive: id === 'storm_evacuation' && lt >= 5.8,
      commsLost: id === 'storm_evacuation' && lt >= 11.8,
      blackoutOpacity,
      helmetCracked:
        (id === 'storm_evacuation' && lt >= 15.2) ||
        id === 'awakening' ||
        this.phase === 'survival',
      objectives: this.objectives,
      waypoints: this.computeWaypoints(),
      survivalElapsedSec: Math.round(this.survivalTime),
      oxygenPercent: Math.round(this.oxygenPercent),
    });
  }

  public getChapterList() {
    return CUTSCENE_CHAPTERS;
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    this.textures.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
