import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import {
  ASTRONAUT_PROFILES,
  AstronautId,
  CropPlotState,
  FIELD_SAMPLES,
  INTERIOR_POINTS,
  InteriorZoneId,
  MODULE_SPECS,
  ModuleId,
  OutpostSiteId,
  PowerSystemKey,
  STATION_POINTS,
} from '../data/missionScenarios';
import { poseAstronautWalk, type AstronautRig } from '../cutscene/scene/models';
import { applyCropStageToBeds } from './cropVisuals';
import { buildInteriorWorld, type InteriorWorldHandles } from './interiorModels';
import { buildOutpostModules, groundHeightAt, OutpostDynamicHandles } from './models';
import { createProceduralTextures } from './textures';

export interface ViewportSimSnapshot {
  site: OutpostSiteId;
  selectedModule: ModuleId;
  activeAstronaut: AstronautId;
  collectedSampleIds: string[];
  powerAllocation: Record<PowerSystemKey, number>;
  isSolarStorm: boolean;
  isDustStorm: boolean;
  solarDust: number;
  crewHealth: number;
  food: number;
  lifeSupport: number;
  shieldLevel: number;
  cameraMode: 'follow' | 'overview';
  walkSpeed: 'normal' | 'fast';
  worldLocation: 'outside' | 'inside';
  cropPlots: CropPlotState[];
  commsRepaired: boolean;
  scanningActive: boolean;
  rescueArrived: boolean;
}

export type SpawnAnchorType =
  | 'inside_station'
  | 'inside_greenhouse'
  | 'outside_station'
  | 'outside_greenhouse';

interface OutpostViewportProps {
  simSnapshot: ViewportSimSnapshot;
  walkToTarget: { x: number; z: number; seq: number } | null;
  interiorWalkTarget: { x: number; z: number; seq: number } | null;
  spawnAnchor: { type: SpawnAnchorType; seq: number } | null;
  onNearStationChange: (stationId: Exclude<ModuleId, 'overview'> | null) => void;
  onNearInteriorChange: (zoneId: InteriorZoneId | null) => void;
  onShelterChange: (inShelter: boolean) => void;
  onInteractStation: (stationId: Exclude<ModuleId, 'overview'>) => void;
  onInteractInterior: (zoneId: InteriorZoneId) => void;
  onCollectSample: (sampleId: string) => void;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _mouseVec = new THREE.Vector2();
const _tmpColor = new THREE.Color();
const _rockDummy = new THREE.Object3D();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _floorHit = new THREE.Vector3();

function dampRigToIdle(rig: AstronautRig, delta: number): void {
  const k = 10;
  rig.pelvis.position.y = THREE.MathUtils.damp(rig.pelvis.position.y, 0.92, k, delta);
  rig.pelvis.rotation.z = THREE.MathUtils.damp(rig.pelvis.rotation.z, 0, k, delta);
  rig.pelvis.rotation.y = THREE.MathUtils.damp(rig.pelvis.rotation.y, 0, k, delta);
  rig.spine.rotation.x = THREE.MathUtils.damp(rig.spine.rotation.x, 0, k, delta);
  rig.spine.rotation.y = THREE.MathUtils.damp(rig.spine.rotation.y, 0, k, delta);
  rig.leftHip.rotation.x = THREE.MathUtils.damp(rig.leftHip.rotation.x, 0, k, delta);
  rig.rightHip.rotation.x = THREE.MathUtils.damp(rig.rightHip.rotation.x, 0, k, delta);
  rig.leftKnee.rotation.x = THREE.MathUtils.damp(rig.leftKnee.rotation.x, 0.05, k, delta);
  rig.rightKnee.rotation.x = THREE.MathUtils.damp(rig.rightKnee.rotation.x, 0.05, k, delta);
  rig.leftAnkle.rotation.x = THREE.MathUtils.damp(rig.leftAnkle.rotation.x, 0, k, delta);
  rig.rightAnkle.rotation.x = THREE.MathUtils.damp(rig.rightAnkle.rotation.x, 0, k, delta);
  rig.leftShoulder.rotation.x = THREE.MathUtils.damp(rig.leftShoulder.rotation.x, 0, k, delta);
  rig.rightShoulder.rotation.x = THREE.MathUtils.damp(rig.rightShoulder.rotation.x, 0, k, delta);
  rig.leftShoulder.rotation.z = THREE.MathUtils.damp(rig.leftShoulder.rotation.z, 0.14, k, delta);
  rig.rightShoulder.rotation.z = THREE.MathUtils.damp(rig.rightShoulder.rotation.z, -0.14, k, delta);
  rig.leftElbow.rotation.x = THREE.MathUtils.damp(rig.leftElbow.rotation.x, -0.15, k, delta);
  rig.rightElbow.rotation.x = THREE.MathUtils.damp(rig.rightElbow.rotation.x, -0.15, k, delta);
}

const CAMERA_PRESETS: Record<ModuleId, { pos: [number, number, number]; look: [number, number, number] }> = {
  overview: { pos: [26, 20, 32], look: [0, 2.0, 0] },
  crew: { pos: [8, 5, 16], look: [0, 1.5, 9] },
  habitat: { pos: [14, 10, 18], look: [0, 3.2, 0] },
  solar: { pos: [-30, 8.5, 0], look: [-21.5, 1.8, -10.0] },
  greenhouse: { pos: [24, 6.5, 11], look: [15.8, 1.6, 0.0] },
  lifesupport: { pos: [-22, 6.5, 25], look: [-14.0, 1.6, 17.5] },
  comms: { pos: [20, 7.5, -27], look: [12.0, 2.5, -19.0] },
  science: { pos: [22, 5.5, 25], look: [14.5, 1.2, 18.0] },
};

const ROCK_SEEDS: Array<{ x: number; z: number; s: number; ry: number; rx: number }> = (() => {
  const arr: Array<{ x: number; z: number; s: number; ry: number; rx: number }> = [];
  let s = 918273;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (seedVal => seedVal)(s - 1) / 2147483646;
  };
  for (let i = 0; i < 130; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 29.0 + rand() * 52;
    arr.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      s: 0.6 + rand() * 1.9,
      ry: rand() * Math.PI * 2,
      rx: rand() * 0.4,
    });
  }
  return arr;
})();

export const OutpostViewport: React.FC<OutpostViewportProps> = ({
  simSnapshot,
  walkToTarget,
  interiorWalkTarget,
  spawnAnchor,
  onNearStationChange,
  onNearInteriorChange,
  onShelterChange,
  onInteractStation,
  onInteractInterior,
  onCollectSample,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<ViewportSimSnapshot>(simSnapshot);
  const onNearRef = useRef(onNearStationChange);
  const onNearInteriorRef = useRef(onNearInteriorChange);
  const onShelterRef = useRef(onShelterChange);
  const onInteractRef = useRef(onInteractStation);
  const onInteractInteriorRef = useRef(onInteractInterior);
  const onCollectSampleRef = useRef(onCollectSample);
  const clickWalkTargetRef = useRef<{ x: number; z: number } | null>(null);
  const interiorWalkTargetRef = useRef<{ x: number; z: number } | null>(null);
  const pendingSpawnRef = useRef<SpawnAnchorType | null>(null);
  const cameraAnimatingRef = useRef<boolean>(true);
  const prevPresetRef = useRef<ModuleId>('overview');
  const applySiteThemeRef = useRef<((site: OutpostSiteId) => void) | null>(null);
  const nearestRef = useRef<Exclude<ModuleId, 'overview'> | null>(null);
  const nearestInteriorRef = useRef<InteriorZoneId | null>(null);
  const inShelterRef = useRef<boolean>(false);

  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<Exclude<ModuleId, 'overview'> | null>(null);
  const [hoveredInteriorId, setHoveredInteriorId] = useState<InteriorZoneId | null>(null);

  useEffect(() => {
    simRef.current = simSnapshot;
    if (prevPresetRef.current !== simSnapshot.selectedModule) {
      prevPresetRef.current = simSnapshot.selectedModule;
      cameraAnimatingRef.current = true;
    }
  }, [simSnapshot]);

  useEffect(() => {
    if (walkToTarget) {
      clickWalkTargetRef.current = { x: walkToTarget.x, z: walkToTarget.z };
    }
  }, [walkToTarget]);

  useEffect(() => {
    if (interiorWalkTarget) {
      interiorWalkTargetRef.current = { x: interiorWalkTarget.x, z: interiorWalkTarget.z };
    }
  }, [interiorWalkTarget]);

  useEffect(() => {
    if (spawnAnchor) {
      pendingSpawnRef.current = spawnAnchor.type;
    }
  }, [spawnAnchor]);

  useEffect(() => {
    onNearRef.current = onNearStationChange;
  }, [onNearStationChange]);

  useEffect(() => {
    onNearInteriorRef.current = onNearInteriorChange;
  }, [onNearInteriorChange]);

  useEffect(() => {
    onShelterRef.current = onShelterChange;
  }, [onShelterChange]);

  useEffect(() => {
    onInteractRef.current = onInteractStation;
  }, [onInteractStation]);

  useEffect(() => {
    onInteractInteriorRef.current = onInteractInterior;
  }, [onInteractInterior]);

  useEffect(() => {
    onCollectSampleRef.current = onCollectSample;
  }, [onCollectSample]);

  useEffect(() => {
    if (applySiteThemeRef.current) {
      applySiteThemeRef.current(simSnapshot.site);
    }
  }, [simSnapshot.site]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('3D WebGL viewport could not initialize on this device.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D graphics context paused. Restoring...');
    };
    const handleContextRestored = () => setWebglError(null);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 320);

    // OrbitControls only enabled when user switches to Free Base Overview
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5.5;
    controls.maxDistance = 38;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.2;
    controls.enabled = false;

    controls.addEventListener('start', () => {
      cameraAnimatingRef.current = false;
    });

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x334155, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1db, 2.35);
    keyLight.position.set(28, 38, 22);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 120;
    const d = 42;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.7);
    rimLight.position.set(-28, 16, -28);
    scene.add(rimLight);

    const textures = createProceduralTextures(renderer);

    // OUTPOST SURFACE WORLD
    const surfaceGroup = new THREE.Group();
    scene.add(surfaceGroup);

    const terrainGeo = new THREE.PlaneGeometry(240, 240, 112, 112);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.marsGround,
      bumpMap: textures.marsGroundBump,
      bumpScale: 0.22,
      roughness: 0.92,
      metalness: 0.02,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    surfaceGroup.add(terrainMesh);

    // Match cutscene rock geometry, map & bump texture
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.marsRockMap,
      bumpMap: textures.marsRockBump,
      bumpScale: 0.16,
      roughness: 0.92,
      metalness: 0.03,
    });
    const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, ROCK_SEEDS.length);
    rockInstanced.castShadow = !isSoftwareGl;
    rockInstanced.receiveShadow = true;
    surfaceGroup.add(rockInstanced);

    const starCount = 750;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 1.8 - 0.8);
      const r = 110 + Math.random() * 25;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 4;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.48, sizeAttenuation: true })
    );
    scene.add(stars);

    const celestialBody = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 24, 24),
      new THREE.MeshStandardMaterial({ map: textures.earthGlobe, roughness: 0.55, metalness: 0.05 })
    );
    celestialBody.position.set(-44, 34, -68);
    surfaceGroup.add(celestialBody);

    const stormCount = 520;
    const stormPos = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount; i++) {
      stormPos[i * 3] = (Math.random() - 0.5) * 86;
      stormPos[i * 3 + 1] = 1.0 + Math.random() * 18;
      stormPos[i * 3 + 2] = (Math.random() - 0.5) * 86;
    }
    const stormGeo = new THREE.BufferGeometry();
    stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3));
    const stormMat = new THREE.PointsMaterial({
      color: 0xd47d4a,
      size: 0.42,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const stormParticles = new THREE.Points(stormGeo, stormMat);
    surfaceGroup.add(stormParticles);

    const handles: OutpostDynamicHandles = buildOutpostModules(
      surfaceGroup,
      textures,
      simRef.current.site,
      isSoftwareGl
    );
    const interiorHandles: InteriorWorldHandles = buildInteriorWorld(
      scene,
      textures,
      isSoftwareGl
    );

    // Third-person chase camera spherical offsets behind astronaut
    let chaseYaw = 0; // 0 means camera sits at +Z looking toward -Z (forward)
    let chasePitch = 0.44;
    let chaseDistance = 8.4;
    let playerYaw = Math.PI; // facing into outpost initially

    const resetPlayerToSpawn = (site: OutpostSiteId) => {
      const px = 0;
      const pz = 9.2;
      handles.playerAstro.group.position.set(px, groundHeightAt(px, pz, site), pz);
      playerYaw = Math.PI;
      handles.playerAstro.group.rotation.y = playerYaw;
      chaseYaw = 0;
      chasePitch = 0.44;
      chaseDistance = 8.4;
    };

    const applySiteTheme = (site: OutpostSiteId) => {
      const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        posAttr.setY(i, groundHeightAt(vx, vz, site));
      }
      posAttr.needsUpdate = true;
      terrainGeo.computeVertexNormals();

      terrainMat.map = site === 'moon' ? textures.moonGround : textures.marsGround;
      terrainMat.bumpMap = site === 'moon' ? null : textures.marsGroundBump;
      terrainMat.bumpScale = site === 'moon' ? 0 : 0.22;
      terrainMat.needsUpdate = true;

      rockMat.map = site === 'moon' ? null : textures.marsRockMap;
      rockMat.bumpMap = site === 'moon' ? null : textures.marsRockBump;
      rockMat.bumpScale = site === 'moon' ? 0 : 0.16;
      rockMat.color.setHex(site === 'moon' ? 0x94a3b8 : 0xffffff);
      rockMat.needsUpdate = true;

      Object.entries(handles.moduleGroups).forEach(([key, grp]) => {
        if (key !== 'crew') {
          grp.position.y = groundHeightAt(grp.position.x, grp.position.z, site);
        }
      });
      Object.entries(handles.stationRings).forEach(([, ring]) => {
        ring.position.y = groundHeightAt(ring.position.x, ring.position.z, site) + 0.04;
      });
      FIELD_SAMPLES.forEach((smp) => {
        const node = handles.sampleNodes[smp.id];
        if (node) {
          node.position.set(smp.x, groundHeightAt(smp.x, smp.z, site), smp.z);
        }
      });
      handles.landingPadPos.y = groundHeightAt(handles.landingPadPos.x, handles.landingPadPos.z, site);
      clickWalkTargetRef.current = null;
      handles.walkTargetRing.visible = false;
      resetPlayerToSpawn(site);

      ROCK_SEEDS.forEach((rk, i) => {
        const y = groundHeightAt(rk.x, rk.z, site);
        _rockDummy.position.set(rk.x, y + rk.s * 0.18, rk.z);
        _rockDummy.rotation.set(rk.rx, rk.ry, 0);
        _rockDummy.scale.set(rk.s * 1.3, rk.s * 0.72, rk.s);
        _rockDummy.updateMatrix();
        rockInstanced.setMatrixAt(i, _rockDummy.matrix);

        if (site === 'moon') {
          const tint = ((i * 37) % 30) / 100 - 0.15;
          _tmpColor.setRGB(0.46 + tint, 0.48 + tint, 0.52 + tint);
        } else {
          // Consistent warm Mars iron-oxide palette matching cutscene rocks
          _tmpColor.setHSL(0.04 + (i % 5) * 0.008, 0.38, 0.55 + (i % 4) * 0.08);
        }
        rockInstanced.setColorAt(i, _tmpColor);
      });
      rockInstanced.instanceMatrix.needsUpdate = true;
      if (rockInstanced.instanceColor) rockInstanced.instanceColor.needsUpdate = true;
      rockInstanced.computeBoundingSphere();

      if (site === 'moon') {
        hemiLight.color.setHex(0x93c5fd);
        hemiLight.groundColor.setHex(0x334155);
        keyLight.color.setHex(0xfff7ed);
        keyLight.intensity = 2.35;
        celestialBody.scale.setScalar(1.0);
        (celestialBody.material as THREE.MeshStandardMaterial).map = textures.earthGlobe;
        (celestialBody.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
        (celestialBody.material as THREE.MeshStandardMaterial).needsUpdate = true;
      } else {
        // Match cutscene Mars warm butterscotch illumination
        hemiLight.color.setHex(0xd68c6c);
        hemiLight.groundColor.setHex(0x522112);
        keyLight.color.setHex(0xffd2b3);
        keyLight.intensity = 2.15;
        celestialBody.scale.setScalar(0.32);
        (celestialBody.material as THREE.MeshStandardMaterial).map = null;
        (celestialBody.material as THREE.MeshStandardMaterial).color.setHex(0xa8a29e);
        (celestialBody.material as THREE.MeshStandardMaterial).needsUpdate = true;
      }
    };

    applySiteThemeRef.current = applySiteTheme;
    applySiteTheme(simRef.current.site);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Keyboard WASD / Arrows for Player Movement + E for Interact
    const pressedKeys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      pressedKeys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Enter') {
        if (simRef.current.worldLocation === 'inside' && nearestInteriorRef.current) {
          onInteractInteriorRef.current(nearestInteriorRef.current);
        } else if (simRef.current.worldLocation === 'outside' && nearestRef.current) {
          onInteractRef.current(nearestRef.current);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Drag Look-Around in Follow Mode + Click Raycast (Stations OR Ground Walk)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const groundRaycaster = new THREE.Raycaster();
    let isDraggingLook = false;
    let pointerDownXY = { x: 0, y: 0 };
    let prevDragXY = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlock();
      isDraggingLook = true;
      pointerDownXY = { x: e.clientX, y: e.clientY };
      prevDragXY = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      isDraggingLook = false;
      const moved = Math.hypot(e.clientX - pointerDownXY.x, e.clientY - pointerDownXY.y);
      if (moved > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_mouseVec, camera);

      if (simRef.current.worldLocation === 'inside') {
        const iHits = raycaster.intersectObjects(interiorHandles.clickableProxies, false);
        if (iHits.length > 0) {
          const zId = iHits[0].object.userData.interiorZoneId as InteriorZoneId | undefined;
          if (zId) {
            onInteractInteriorRef.current(zId);
            return;
          }
        }
        groundRaycaster.setFromCamera(_mouseVec, camera);
        if (groundRaycaster.ray.intersectPlane(_floorPlane, _floorHit)) {
          const ix = THREE.MathUtils.clamp(_floorHit.x, -8.8, 17.6);
          const iz = THREE.MathUtils.clamp(_floorHit.z, -3.8, 3.8);
          interiorWalkTargetRef.current = { x: ix, z: iz };
          interiorHandles.walkTargetRing.position.set(ix, 0.04, iz);
          interiorHandles.walkTargetRing.visible = true;
          soundEngine.playClick(460);
        }
        return;
      }

      const hits = raycaster.intersectObjects(handles.clickableProxies, false);
      if (hits.length > 0) {
        const modId = hits[0].object.userData.moduleId as Exclude<ModuleId, 'overview'> | undefined;
        if (modId) {
          onInteractRef.current(modId);
          return;
        }
      }

      // If not clicking a building proxy, allow Click-to-Walk on Martian/Lunar terrain!
      groundRaycaster.setFromCamera(_mouseVec, camera);
      const groundHits = groundRaycaster.intersectObject(terrainMesh, false);
      if (groundHits.length > 0) {
        const pt = groundHits[0].point;
        const dist = Math.hypot(pt.x, pt.z);
        let wx = pt.x;
        let wz = pt.z;
        if (dist > 42) {
          wx = (wx / dist) * 42;
          wz = (wz / dist) * 42;
        }
        clickWalkTargetRef.current = { x: wx, z: wz };
        handles.walkTargetRing.position.set(wx, groundHeightAt(wx, wz, simRef.current.site) + 0.06, wz);
        handles.walkTargetRing.visible = true;
        soundEngine.playClick(460);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDraggingLook && simRef.current.cameraMode === 'follow') {
        const dx = e.clientX - prevDragXY.x;
        const dy = e.clientY - prevDragXY.y;
        prevDragXY = { x: e.clientX, y: e.clientY };
        chaseYaw -= dx * 0.0065;
        chasePitch = THREE.MathUtils.clamp(chasePitch + dy * 0.005, 0.16, 1.05);
        return;
      }

      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;
      const rect = renderer.domElement.getBoundingClientRect();
      _mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_mouseVec, camera);

      if (simRef.current.worldLocation === 'inside') {
        const iHits = raycaster.intersectObjects(interiorHandles.clickableProxies, false);
        setHoveredId(null);
        if (iHits.length > 0) {
          const zId = iHits[0].object.userData.interiorZoneId as InteriorZoneId;
          renderer.domElement.style.cursor = 'pointer';
          setHoveredInteriorId((prev) => (prev === zId ? prev : zId));
        } else {
          renderer.domElement.style.cursor = 'grab';
          setHoveredInteriorId((prev) => (prev === null ? prev : null));
        }
        return;
      }

      setHoveredInteriorId(null);
      const hits = raycaster.intersectObjects(handles.clickableProxies, false);
      if (hits.length > 0) {
        const modId = hits[0].object.userData.moduleId as Exclude<ModuleId, 'overview'>;
        renderer.domElement.style.cursor = 'pointer';
        setHoveredId((prev) => (prev === modId ? prev : modId));
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredId((prev) => (prev === null ? prev : null));
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (simRef.current.cameraMode === 'follow') {
        chaseDistance = THREE.MathUtils.clamp(chaseDistance + e.deltaY * 0.006, 5.0, 18.0);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let stormStrength = 0;
    let shutterProgress = 0;
    let stepAudioTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const s = simRef.current;

      // Handle explicit transition spawns between Outside & Inside doorways
      if (pendingSpawnRef.current) {
        const sp = pendingSpawnRef.current;
        pendingSpawnRef.current = null;
        if (sp === 'inside_station') {
          interiorHandles.playerRig.group.position.set(0, 0, 2.5);
          interiorHandles.playerRig.group.rotation.y = Math.PI;
          playerYaw = Math.PI;
          chaseYaw = 0;
          interiorWalkTargetRef.current = null;
          interiorHandles.walkTargetRing.visible = false;
        } else if (sp === 'inside_greenhouse') {
          interiorHandles.playerRig.group.position.set(14.2, 0, 2.1);
          interiorHandles.playerRig.group.rotation.y = Math.PI;
          playerYaw = Math.PI;
          chaseYaw = 0;
          interiorWalkTargetRef.current = null;
          interiorHandles.walkTargetRing.visible = false;
        } else if (sp === 'outside_station') {
          const gy = groundHeightAt(0, 7.6, s.site);
          handles.playerAstro.group.position.set(0, gy, 7.6);
          handles.playerAstro.group.rotation.y = 0;
          playerYaw = 0;
          clickWalkTargetRef.current = null;
          handles.walkTargetRing.visible = false;
        } else if (sp === 'outside_greenhouse') {
          const gy = groundHeightAt(15.8, 3.8, s.site);
          handles.playerAstro.group.position.set(15.8, gy, 3.8);
          handles.playerAstro.group.rotation.y = 0;
          playerYaw = 0;
          clickWalkTargetRef.current = null;
          handles.walkTargetRing.visible = false;
        }
      }

      // Sync active playable astronaut suit accent & crop growth visuals
      const astroProfile = ASTRONAUT_PROFILES[s.activeAstronaut] || ASTRONAUT_PROFILES.maya;
      handles.playerAstro.suitAccentMat.color.setHex(astroProfile.suitColorHex);
      (handles.playerMarker.material as THREE.MeshBasicMaterial).color.setHex(astroProfile.suitColorHex);
      interiorHandles.playerAccentMat.color.setHex(astroProfile.suitColorHex);
      (interiorHandles.playerMarker.material as THREE.MeshBasicMaterial).color.setHex(astroProfile.suitColorHex);
      applyCropStageToBeds(handles.exteriorCropBedStages, s.cropPlots);
      applyCropStageToBeds(interiorHandles.cropBedStages, s.cropPlots);

      // =========================================================
      // INSIDE SPACE STATION + ATTACHED GREENHOUSE MODE
      // =========================================================
      if (s.worldLocation === 'inside') {
        surfaceGroup.visible = false;
        stars.visible = false;
        interiorHandles.root.visible = true;

        const insideBg = new THREE.Color(0x080f1e);
        if (!(scene.background as THREE.Color)?.equals(insideBg)) {
          scene.background = insideBg;
          scene.fog = null;
        }

        // Player is automatically sheltered from dust storms while inside!
        if (!inShelterRef.current) {
          inShelterRef.current = true;
          onShelterRef.current(true);
        }
        if (nearestRef.current !== null) {
          nearestRef.current = null;
          onNearRef.current(null);
        }

        let moveForward = 0;
        let moveRight = 0;
        if (pressedKeys['KeyW'] || pressedKeys['ArrowUp']) moveForward += 1;
        if (pressedKeys['KeyS'] || pressedKeys['ArrowDown']) moveForward -= 1;
        if (pressedKeys['KeyD'] || pressedKeys['ArrowRight']) moveRight += 1;
        if (pressedKeys['KeyA'] || pressedKeys['ArrowLeft']) moveRight -= 1;

        const ipPos = interiorHandles.playerRig.group.position;
        let dirX = 0;
        let dirZ = 0;
        let isMoving = false;

        if (moveForward !== 0 || moveRight !== 0) {
          interiorWalkTargetRef.current = null;
          interiorHandles.walkTargetRing.visible = false;
          const forwardX = -Math.sin(chaseYaw);
          const forwardZ = -Math.cos(chaseYaw);
          const rightX = Math.cos(chaseYaw);
          const rightZ = -Math.sin(chaseYaw);
          dirX = forwardX * moveForward + rightX * moveRight;
          dirZ = forwardZ * moveForward + rightZ * moveRight;
          const len = Math.hypot(dirX, dirZ) || 1;
          dirX /= len;
          dirZ /= len;
          isMoving = true;
        } else if (interiorWalkTargetRef.current) {
          let tx = interiorWalkTargetRef.current.x;
          let tz = interiorWalkTargetRef.current.z;
          // Auto-funnel cleanly through the Station-Greenhouse connecting airlock corridor!
          const crossingToGh = ipPos.x < 5.6 && tx > 8.6;
          const crossingToStation = ipPos.x > 8.6 && tx < 5.6;
          if ((crossingToGh || crossingToStation) && Math.hypot(ipPos.x - 7.1, ipPos.z) > 1.2) {
            tx = crossingToGh ? 9.2 : 5.0;
            tz = 0;
          }
          const dx = tx - ipPos.x;
          const dz = tz - ipPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.3) {
            dirX = dx / dist;
            dirZ = dz / dist;
            isMoving = true;
          } else if (!crossingToGh && !crossingToStation) {
            interiorWalkTargetRef.current = null;
            interiorHandles.walkTargetRing.visible = false;
          }
        }

        if (isMoving) {
          const speed = s.walkSpeed === 'fast' ? 7.6 : 5.4;
          let nx = THREE.MathUtils.clamp(ipPos.x + dirX * speed * delta, -8.7, 17.4);
          let nz = THREE.MathUtils.clamp(ipPos.z + dirZ * speed * delta, -3.7, 3.8);

          // Connecting corridor wall constraints vs main rooms
          if (nx > 5.2 && nx < 9.0) {
            nz = THREE.MathUtils.clamp(nz, -1.15, 1.15);
          } else if (nx <= 5.2) {
            // Keep outside lab desk & north machinery
            if (nx > -2.5 && nx < 3.4 && nz < -1.8) {
              nz = -1.8;
            }
          } else {
            nz = THREE.MathUtils.clamp(nz, -3.1, 3.2);
          }

          ipPos.x = nx;
          ipPos.z = nz;

          const targetYaw = Math.atan2(dirX, dirZ);
          let diff = targetYaw - playerYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerYaw += diff * Math.min(1, delta * 12);
          interiorHandles.playerRig.group.rotation.y = playerYaw;
          poseAstronautWalk(interiorHandles.playerRig, elapsed * 9.2, 0.95);

          stepAudioTimer += delta;
          if (stepAudioTimer > 0.38) {
            stepAudioTimer = 0;
            soundEngine.playFootstep();
          }
        } else {
          dampRigToIdle(interiorHandles.playerRig, delta);
        }

        // Nearest interactive interior zone detection
        let foundZone: InteriorZoneId | null = null;
        let bestDist = Infinity;
        for (const pt of INTERIOR_POINTS) {
          const d = Math.hypot(ipPos.x - pt.x, ipPos.z - pt.z);
          const ring = interiorHandles.zoneRings[pt.id];
          if (d <= pt.interactRadius && d < bestDist) {
            bestDist = d;
            foundZone = pt.id;
          }
          if (ring) {
            const mat = ring.material as THREE.MeshBasicMaterial;
            const isNear = d <= pt.interactRadius;
            mat.opacity = THREE.MathUtils.damp(mat.opacity, isNear ? 0.85 : 0.3, 8, delta);
          }
        }
        if (nearestInteriorRef.current !== foundZone) {
          nearestInteriorRef.current = foundZone;
          onNearInteriorRef.current(foundZone);
        }

        // Cutaway chase camera smoothly framing the interior
        controls.enabled = false;
        const clampedPitch = THREE.MathUtils.clamp(chasePitch, 0.42, 0.92);
        const camDist = 7.4;
        _camTargetPos.set(
          ipPos.x + Math.sin(chaseYaw) * Math.cos(clampedPitch) * camDist,
          1.8 + Math.sin(clampedPitch) * camDist,
          ipPos.z + Math.cos(chaseYaw) * Math.cos(clampedPitch) * camDist
        );
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-8.5 * delta));
        _camTargetLook.set(ipPos.x, 1.25, ipPos.z);
        camera.lookAt(_camTargetLook);

        // Animate interior equipment & lights
        const ghFactor = s.powerAllocation.greenhouse / 3;
        interiorHandles.growLightMat.emissiveIntensity = 0.35 + ghFactor * 1.7;
        interiorHandles.growPointLight.intensity = 0.6 + ghFactor * 2.6;

        interiorHandles.commsLedMat.color.setHex(s.commsRepaired ? 0x22c55e : 0xef4444);
        interiorHandles.commsLedMat.emissive.setHex(s.commsRepaired ? 0x16a34a : 0xdc2626);
        interiorHandles.commsLedMat.emissiveIntensity = s.commsRepaired
          ? 1.5
          : 0.7 + Math.sin(elapsed * 8) * 0.65;

        if (s.scanningActive) {
          interiorHandles.scannerBeamRing.position.y = 1.25 + Math.sin(elapsed * 6) * 0.95;
          interiorHandles.scannerLedMat.emissiveIntensity = 2.4;
        } else {
          interiorHandles.scannerBeamRing.position.y = THREE.MathUtils.damp(
            interiorHandles.scannerBeamRing.position.y,
            0.32,
            6,
            delta
          );
          interiorHandles.scannerLedMat.emissiveIntensity = 1.2;
        }

        renderer.render(scene, camera);
        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
        return;
      }

      // =========================================================
      // OUTSIDE MARTIAN / LUNAR SURFACE EXPLORATION MODE
      // =========================================================
      surfaceGroup.visible = true;
      stars.visible = true;
      interiorHandles.root.visible = false;
      if (nearestInteriorRef.current !== null) {
        nearestInteriorRef.current = null;
        onNearInteriorRef.current(null);
      }

        const skyHex =
          s.site === 'moon' ? 0x060913 : s.isDustStorm ? 0x6b2814 : 0xb86544;
        const targetFogDensity =
          s.site === 'moon' ? 0.011 : s.isDustStorm ? 0.032 : 0.0075;
        if (
          !(scene.background as THREE.Color)?.equals(new THREE.Color(skyHex)) ||
          !scene.fog
        ) {
          scene.background = new THREE.Color(skyHex);
          scene.fog = new THREE.FogExp2(skyHex, targetFogDensity);
        } else if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetFogDensity, 2.5, delta);
        }

        handles.landedShip.group.position.set(
          handles.landingPadPos.x,
          handles.landingPadPos.y + 0.25,
          handles.landingPadPos.z
        );
        (handles.landedShip.thrusterFlame.material as THREE.MeshBasicMaterial).opacity = 0;

        // 1. Move Playable Player via WASD/Arrows OR Click-on-Terrain / Quick-Walk target!
        let moveForward = 0;
        let moveRight = 0;
        if (pressedKeys['KeyW'] || pressedKeys['ArrowUp']) moveForward += 1;
        if (pressedKeys['KeyS'] || pressedKeys['ArrowDown']) moveForward -= 1;
        if (pressedKeys['KeyD'] || pressedKeys['ArrowRight']) moveRight += 1;
        if (pressedKeys['KeyA'] || pressedKeys['ArrowLeft']) moveRight -= 1;

        const player = handles.playerAstro;
        let dirX = 0;
        let dirZ = 0;
        let isMoving = false;

        if (moveForward !== 0 || moveRight !== 0) {
          clickWalkTargetRef.current = null;
          handles.walkTargetRing.visible = false;

          const forwardX = -Math.sin(chaseYaw);
          const forwardZ = -Math.cos(chaseYaw);
          const rightX = Math.cos(chaseYaw);
          const rightZ = -Math.sin(chaseYaw);

          dirX = forwardX * moveForward + rightX * moveRight;
          dirZ = forwardZ * moveForward + rightZ * moveRight;
          const len = Math.hypot(dirX, dirZ) || 1;
          dirX /= len;
          dirZ /= len;
          isMoving = true;
        } else if (clickWalkTargetRef.current) {
          const tx = clickWalkTargetRef.current.x;
          const tz = clickWalkTargetRef.current.z;
          const dx = tx - player.group.position.x;
          const dz = tz - player.group.position.z;
          const distToTarget = Math.hypot(dx, dz);
          if (distToTarget > 0.35) {
            dirX = dx / distToTarget;
            dirZ = dz / distToTarget;
            isMoving = true;
          } else {
            clickWalkTargetRef.current = null;
            handles.walkTargetRing.visible = false;
          }
        }

        if (isMoving) {
          const speed = s.walkSpeed === 'fast' ? 9.2 : 6.4;
          let nextX = player.group.position.x + dirX * speed * delta;
          let nextZ = player.group.position.z + dirZ * speed * delta;

          // Keep inside expanded playable crater valley (42m radius!)
          const distFromOrigin = Math.hypot(nextX, nextZ);
          if (distFromOrigin > 42) {
            nextX = (nextX / distFromOrigin) * 42;
            nextZ = (nextZ / distFromOrigin) * 42;
          }

          // Smooth collision push-out from elongated Station Wings (-10..+10) + attached Greenhouse (+10..+19.8) & solid modules
          if (nextX > -10.5 && nextX < 19.6 && Math.abs(nextZ) < 3.1) {
            if (Math.abs(nextX) > 5.0) {
              nextZ = nextZ >= 0 ? 3.1 : -3.1;
            }
          }
          for (const st of STATION_POINTS) {
            const dx = nextX - st.x;
            const dz = nextZ - st.z;
            const d = Math.hypot(dx, dz);
            if (d < st.collisionRadius && d > 0.001) {
              nextX = st.x + (dx / d) * st.collisionRadius;
              nextZ = st.z + (dz / d) * st.collisionRadius;
            }
          }

          player.group.position.x = nextX;
          player.group.position.z = nextZ;

          // Smoothly rotate astronaut to face walking direction
          const targetYaw = Math.atan2(dirX, dirZ);
          let diff = targetYaw - playerYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerYaw += diff * Math.min(1, delta * 12);
          player.group.rotation.y = playerYaw;

          poseAstronautWalk(
            player.rig,
            elapsed * (s.walkSpeed === 'fast' ? 11.5 : 8.8),
            s.walkSpeed === 'fast' ? 1.15 : 0.95
          );

          stepAudioTimer += delta;
          if (stepAudioTimer > 0.36) {
            stepAudioTimer = 0;
            soundEngine.playFootstep();
          }
        } else {
          dampRigToIdle(player.rig, delta);
        }

        player.group.position.y = groundHeightAt(
          player.group.position.x,
          player.group.position.z,
          s.site
        );

        // Animate & check proximity to Collectible 3D Field Samples
        FIELD_SAMPLES.forEach((smp) => {
          const node = handles.sampleNodes[smp.id];
          if (!node) return;
          const alreadyCollected = s.collectedSampleIds.includes(smp.id);
          node.visible = !alreadyCollected;
          if (!alreadyCollected) {
            node.children.forEach((ch) => {
              if (ch.userData.isCrystal) {
                ch.rotation.y += delta * 2.2;
                ch.position.y = 0.85 + Math.sin(elapsed * 3.5 + smp.x) * 0.16;
              }
            });
            const dSample = Math.hypot(player.group.position.x - smp.x, player.group.position.z - smp.z);
            if (dSample < 2.15) {
              onCollectSampleRef.current(smp.id);
            }
          }
        });

        // Shelter check: inside or at the Space Station shelter perimeter (<= 8.8m from 0,0)
        const distFromStation = Math.hypot(player.group.position.x, player.group.position.z);
        const nowInShelter = distFromStation <= 8.8;
        if (inShelterRef.current !== nowInShelter) {
          inShelterRef.current = nowInShelter;
          onShelterRef.current(nowInShelter);
        }

        // 2. Proximity Detection to Outpost Stations & NPC Crew
        let foundNear: Exclude<ModuleId, 'overview'> | null = null;
        let bestDist = Infinity;

        for (const st of STATION_POINTS) {
          const d = Math.hypot(player.group.position.x - st.x, player.group.position.z - st.z);
          const ring = handles.stationRings[st.id];
          if (d <= st.interactRadius && d < bestDist) {
            bestDist = d;
            foundNear = st.id;
          }
          if (ring) {
            const mat = ring.material as THREE.MeshBasicMaterial;
            const isNear = d <= st.interactRadius;
            if (st.id === 'habitat' && s.isDustStorm) {
              // Highlight the Space Station shelter zone brightly during Mars dust storms!
              mat.color.setHex(nowInShelter ? 0x22c55e : 0xf59e0b);
              mat.opacity = 0.55 + Math.sin(elapsed * 7) * 0.25;
            } else {
              mat.color.setHex(isNear ? 0xf59e0b : 0x38bdf8);
              mat.opacity = THREE.MathUtils.damp(mat.opacity, isNear ? 0.78 : 0.2, 8, delta);
            }
          }
        }

        // Also check proximity to NPC teammates Leo & Zara
        if (!foundNear) {
          for (const npc of handles.npcAstronauts) {
            const d = Math.hypot(
              player.group.position.x - npc.group.position.x,
              player.group.position.z - npc.group.position.z
            );
            if (d <= 2.6) {
              foundNear = 'crew';
              break;
            }
          }
        }

        if (nearestRef.current !== foundNear) {
          nearestRef.current = foundNear;
          onNearRef.current(foundNear);
        }

        // 3. Camera Mode: 3rd-Person Chase behind Maya OR Free Base Overview
        if (s.cameraMode === 'follow') {
          controls.enabled = false;
          const px = player.group.position.x;
          const py = player.group.position.y;
          const pz = player.group.position.z;

          const desiredCamX = px + Math.sin(chaseYaw) * Math.cos(chasePitch) * chaseDistance;
          const desiredCamY = py + 1.55 + Math.sin(chasePitch) * chaseDistance;
          const desiredCamZ = pz + Math.cos(chaseYaw) * Math.cos(chasePitch) * chaseDistance;

          const followAlpha = 1 - Math.exp(-9.0 * delta);
          _camTargetPos.set(desiredCamX, desiredCamY, desiredCamZ);
          camera.position.lerp(_camTargetPos, followAlpha);

          _camTargetLook.set(px, py + 1.35, pz);
          camera.lookAt(_camTargetLook);
        } else {
          controls.enabled = true;
          if (cameraAnimatingRef.current) {
            const preset = CAMERA_PRESETS[s.selectedModule] || CAMERA_PRESETS.overview;
            _camTargetPos.set(...preset.pos);
            _camTargetLook.set(...preset.look);
            const alpha = 1 - Math.exp(-5.2 * delta);
            camera.position.lerp(_camTargetPos, alpha);
            controls.target.lerp(_camTargetLook, alpha);
            if (camera.position.distanceTo(_camTargetPos) < 0.05) {
              cameraAnimatingRef.current = false;
            }
          }
          controls.update();
        }

        // 4. NPC Teammates patrol or shelter in storms (idle pose clean)
        handles.npcAstronauts.forEach((astro) => {
          dampRigToIdle(astro.rig, delta);
        });

      // Habitat radiation shutters & shield bubble
      const targetShutter = THREE.MathUtils.clamp(
        (s.powerAllocation.shield / 3) * 0.7 + (s.isSolarStorm ? 0.35 : 0),
        0,
        1
      );
      shutterProgress = THREE.MathUtils.damp(shutterProgress, targetShutter, 4.0, delta);
      handles.shieldShutters.forEach((sh) => {
        const ang = sh.userData.baseAngle as number;
        const r = 4.65 - shutterProgress * 0.14;
        sh.position.set(Math.cos(ang) * r, 2.2 + (1 - shutterProgress) * 1.4, Math.sin(ang) * r);
      });
      const bubbleMat = handles.shieldBubble.material as THREE.MeshBasicMaterial;
      const targetBubbleOpacity =
        s.powerAllocation.shield >= 2 || s.isSolarStorm ? 0.18 + s.powerAllocation.shield * 0.05 : 0.0;
      bubbleMat.opacity = THREE.MathUtils.damp(bubbleMat.opacity, targetBubbleOpacity, 3.5, delta);
      handles.shieldBubble.rotation.y += delta * 0.25;
      handles.cabinGlowMat.emissiveIntensity = 0.4 + (s.lifeSupport / 100) * 1.1;

      // Solar Wings tilt & visible Mars dust coating
      const targetTilt = s.isDustStorm ? 0.92 : Math.sin(elapsed * 0.25) * 0.22 + 0.32;
      handles.solarWings.forEach((wing) => {
        wing.rotation.x = THREE.MathUtils.damp(wing.rotation.x, targetTilt, 3, delta);
      });
      handles.solarCellMat.emissiveIntensity = s.solarDust >= 50 || s.isDustStorm ? 0.02 : 0.22;
      handles.solarDustMat.opacity = THREE.MathUtils.damp(
        handles.solarDustMat.opacity,
        THREE.MathUtils.clamp((s.solarDust / 100) * 0.9, 0, 0.9),
        4,
        delta
      );

      // Greenhouse grow lights
      const ghPowerFactor = s.powerAllocation.greenhouse / 3;
      handles.growLightMat.emissiveIntensity = 0.25 + ghPowerFactor * 1.8;
      handles.growPointLight.intensity = 0.4 + ghPowerFactor * 2.8;

      // Life Support fan
      handles.lifeFan.rotation.z -= delta * (1.2 + s.powerAllocation.lifesupport * 3.2);

      // Comms dish & Earth uplink beam (damaged red flicker vs fixed bright cyan!)
      const sciPower = s.powerAllocation.science;
      handles.commsHead.rotation.y = s.commsRepaired
        ? Math.sin(elapsed * 0.45) * 0.35
        : -0.45 + Math.sin(elapsed * 4.5) * 0.03;
      handles.commsBeaconMat.color.setHex(s.commsRepaired ? 0x38bdf8 : 0xef4444);
      handles.commsBeaconMat.emissive.setHex(s.commsRepaired ? 0x0ea5e9 : 0xdc2626);
      handles.commsBeaconMat.emissiveIntensity = s.commsRepaired
        ? sciPower > 0
          ? 1.2 + Math.sin(elapsed * 4) * 0.4
          : 0.35
        : 0.4 + Math.sin(elapsed * 7) * 0.4;
      const beamMat = handles.commsBeam.material as THREE.MeshBasicMaterial;
      beamMat.color.setHex(s.commsRepaired ? 0x38bdf8 : 0xef4444);
      beamMat.opacity = s.commsRepaired ? (sciPower > 0 ? 0.14 + sciPower * 0.06 : 0.04) : 0.02;

      // Earth Rescue Mission Rocket Descent (Sol 150 finale!)
      if (s.rescueArrived) {
        handles.rescueShip.group.visible = true;
        const targetY = handles.landingPadPos.y + 0.25;
        handles.rescueShip.group.position.y = THREE.MathUtils.damp(
          handles.rescueShip.group.position.y,
          targetY,
          1.4,
          delta
        );
        const altitudeLeft = Math.max(0, handles.rescueShip.group.position.y - targetY);
        (handles.rescueShip.thrusterFlame.material as THREE.MeshBasicMaterial).opacity =
          altitudeLeft > 0.2 ? 0.85 : 0.0;
      } else {
        handles.rescueShip.group.visible = false;
        handles.rescueShip.group.position.y = handles.landingPadPos.y + 28;
      }

      // Rover patrol (all 6 spoked wheels & mechanical arm animate smoothly!)
      if (sciPower > 0) {
        const rt = elapsed * (0.22 + sciPower * 0.1);
        const rx = Math.sin(rt) * 2.8;
        const rz = Math.cos(rt * 0.7) * 2.1;
        handles.roverGroup.position.x = THREE.MathUtils.damp(handles.roverGroup.position.x, rx, 2.5, delta);
        handles.roverGroup.position.z = THREE.MathUtils.damp(handles.roverGroup.position.z, rz, 2.5, delta);
        const worldX = handles.moduleGroups.science.position.x + handles.roverGroup.position.x;
        const worldZ = handles.moduleGroups.science.position.z + handles.roverGroup.position.z;
        handles.roverGroup.position.y =
          groundHeightAt(worldX, worldZ, s.site) - handles.moduleGroups.science.position.y;
        handles.roverGroup.rotation.y = Math.atan2(Math.cos(rt) * 2.8, -Math.sin(rt * 0.7) * 1.47);
        handles.roverWheels.forEach((w) => {
          w.rotation.x += delta * 2.8;
        });
        handles.roverArm.rotation.x = Math.sin(elapsed * 1.8) * 0.25 - 0.15;
      }

      // Space Weather & Intense Mars Dust Storm Particles
      const targetStorm = s.isDustStorm ? 1.0 : s.isSolarStorm ? 0.85 : 0.15;
      stormStrength = THREE.MathUtils.damp(stormStrength, targetStorm, 2.5, delta);
      stormMat.opacity = s.isDustStorm ? stormStrength * 0.88 : s.isSolarStorm ? stormStrength * 0.72 : 0.12;
      stormMat.color.setHex(s.isSolarStorm && !s.isDustStorm ? 0xfbbf24 : 0xd47d4a);
      if (stormStrength > 0.02) {
        const arr = stormGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < stormCount; i++) {
          arr[i * 3] += delta * (s.isDustStorm ? 20 : s.isSolarStorm ? 12 : 1.8);
          arr[i * 3 + 1] -= delta * (s.isDustStorm ? 1.2 : s.isSolarStorm ? 3.5 : 0.25);
          if (arr[i * 3] > 43) arr[i * 3] = -43;
          if (arr[i * 3 + 1] < 0.4) arr[i * 3 + 1] = 18;
        }
        stormGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      controls.dispose();
      textures.dispose();
      envTarget.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        aria-label="Interactive 3D Lunar and Martian Outpost Viewport"
      />

      {hoveredId && !hoveredInteriorId && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-10 -translate-x-1/2 rounded-xl border border-sky-500/50 bg-[#0B1120]/95 px-3.5 py-1.5 text-xs font-semibold text-sky-200 shadow-lg">
          Click to interact: {MODULE_SPECS[hoveredId].name}
        </div>
      )}

      {hoveredInteriorId && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-10 -translate-x-1/2 rounded-xl border border-emerald-400/60 bg-[#0B1120]/95 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-lg">
          Click to use:{' '}
          {INTERIOR_POINTS.find((pt) => pt.id === hoveredInteriorId)?.name ?? hoveredInteriorId}
        </div>
      )}

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#070B14] p-6 text-center">
          <div className="max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="font-display text-xl font-bold text-white">3D Viewport Notice</h2>
            <p className="mt-2 text-sm text-slate-300">{webglError}</p>
          </div>
        </div>
      )}
    </div>
  );
};
