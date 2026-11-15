import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import {
  ASTRONAUT_PROFILES,
  AstronautId,
  FIELD_SAMPLES,
  MODULE_SPECS,
  ModuleId,
  OutpostSiteId,
  PowerSystemKey,
  STATION_POINTS,
} from '../data/missionScenarios';
import { buildOutpostModules, buildSpacecraft, groundHeightAt, OutpostDynamicHandles } from './models';
import { createProceduralTextures } from './textures';

export interface ViewportSimSnapshot {
  site: OutpostSiteId;
  selectedModule: ModuleId;
  activeAstronaut: AstronautId;
  collectedSampleIds: string[];
  powerAllocation: Record<PowerSystemKey, number>;
  isSolarStorm: boolean;
  isDustStorm: boolean;
  crewHealth: number;
  food: number;
  lifeSupport: number;
  shieldLevel: number;
  cameraMode: 'follow' | 'overview';
  walkSpeed: 'normal' | 'fast';
}

interface OutpostViewportProps {
  simSnapshot: ViewportSimSnapshot;
  walkToTarget: { x: number; z: number; seq: number } | null;
  onNearStationChange: (stationId: Exclude<ModuleId, 'overview'> | null) => void;
  onInteractStation: (stationId: Exclude<ModuleId, 'overview'>) => void;
  onCollectSample: (sampleId: string) => void;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _mouseVec = new THREE.Vector2();
const _tmpColor = new THREE.Color();
const _rockDummy = new THREE.Object3D();

const CAMERA_PRESETS: Record<ModuleId, { pos: [number, number, number]; look: [number, number, number] }> = {
  overview: { pos: [14.8, 11.2, 16.8], look: [0.5, 1.0, 0.0] },
  crew: { pos: [6.8, 4.2, 8.6], look: [2.2, 1.0, 3.5] },
  habitat: { pos: [6.8, 5.2, 8.2], look: [0, 2.1, 0] },
  solar: { pos: [-14.0, 5.4, 3.8], look: [-7.6, 1.5, -3.2] },
  greenhouse: { pos: [13.2, 4.6, 6.4], look: [7.2, 1.2, 0] },
  lifesupport: { pos: [-9.8, 4.5, 11.2], look: [-4.2, 1.3, 5.8] },
  comms: { pos: [8.8, 5.8, -12.6], look: [3.2, 2.4, -6.8] },
  science: { pos: [10.4, 4.0, 11.6], look: [4.8, 0.9, 6.2] },
};

const ROCK_SEEDS: Array<{ x: number; z: number; s: number; ry: number; rx: number }> = (() => {
  const arr: Array<{ x: number; z: number; s: number; ry: number; rx: number }> = [];
  let s = 918273;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < 64; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 12.6 + rand() * 34;
    arr.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      s: 0.45 + rand() * 1.45,
      ry: rand() * Math.PI * 2,
      rx: rand() * 0.4,
    });
  }
  return arr;
})();

export const OutpostViewport: React.FC<OutpostViewportProps> = ({
  simSnapshot,
  walkToTarget,
  onNearStationChange,
  onInteractStation,
  onCollectSample,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<ViewportSimSnapshot>(simSnapshot);
  const onNearRef = useRef(onNearStationChange);
  const onInteractRef = useRef(onInteractStation);
  const onCollectSampleRef = useRef(onCollectSample);
  const clickWalkTargetRef = useRef<{ x: number; z: number } | null>(null);
  const cameraAnimatingRef = useRef<boolean>(true);
  const prevPresetRef = useRef<ModuleId>('overview');
  const applySiteThemeRef = useRef<((site: OutpostSiteId) => void) | null>(null);
  const nearestRef = useRef<Exclude<ModuleId, 'overview'> | null>(null);

  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<Exclude<ModuleId, 'overview'> | null>(null);

  useEffect(() => {
    simRef.current = simSnapshot;
    if (prevPresetRef.current !== simSnapshot.selectedModule) {
      prevPresetRef.current = simSnapshot.selectedModule;
      cameraAnimatingRef.current = true;
    }
  }, [simSnapshot]);

  useEffect(() => {
    simRef.current = simSnapshot;
  }, [simSnapshot]);

  useEffect(() => {
    if (walkToTarget) {
      clickWalkTargetRef.current = { x: walkToTarget.x, z: walkToTarget.z };
    }
  }, [walkToTarget]);



  useEffect(() => {
    onNearRef.current = onNearStationChange;
  }, [onNearStationChange]);

  useEffect(() => {
    onInteractRef.current = onInteractStation;
  }, [onInteractStation]);



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
    keyLight.position.set(18, 24, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 75;
    const d = 18;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.7);
    rimLight.position.set(-16, 12, -18);
    scene.add(rimLight);

    const textures = createProceduralTextures(renderer);

    // OUTPOST SURFACE WORLD
    const surfaceGroup = new THREE.Group();
    scene.add(surfaceGroup);

    const terrainGeo = new THREE.PlaneGeometry(140, 140, 96, 96);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: textures.moonGround,
      roughness: 0.92,
      metalness: 0.04,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    surfaceGroup.add(terrainMesh);

    const rockGeo = new THREE.DodecahedronGeometry(0.65, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.88,
      metalness: 0.06,
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

    const stormCount = 260;
    const stormPos = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount; i++) {
      stormPos[i * 3] = (Math.random() - 0.5) * 44;
      stormPos[i * 3 + 1] = 2 + Math.random() * 18;
      stormPos[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const stormGeo = new THREE.BufferGeometry();
    stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3));
    const stormMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.3,
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

    // Third-person chase camera spherical offsets behind Commander Maya
    let chaseYaw = 0; // 0 means camera sits at +Z looking toward -Z (forward)
    let chasePitch = 0.42;
    let chaseDistance = 6.8;
    let playerYaw = Math.PI; // facing into outpost initially

    const resetPlayerToSpawn = (site: OutpostSiteId) => {
      const px = 2.6;
      const pz = 5.2;
      handles.playerAstro.group.position.set(px, groundHeightAt(px, pz, site), pz);
      playerYaw = Math.PI;
      handles.playerAstro.group.rotation.y = playerYaw;
      chaseYaw = 0;
      chasePitch = 0.42;
      chaseDistance = 6.8;
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
        _rockDummy.position.set(rk.x, y + rk.s * 0.15, rk.z);
        _rockDummy.rotation.set(rk.rx, rk.ry, 0);
        _rockDummy.scale.set(rk.s * 1.15, rk.s * 0.72, rk.s * 0.95);
        _rockDummy.updateMatrix();
        rockInstanced.setMatrixAt(i, _rockDummy.matrix);

        const tint = ((i * 37) % 30) / 100 - 0.15;
        if (site === 'moon') {
          _tmpColor.setRGB(0.46 + tint, 0.48 + tint, 0.52 + tint);
        } else {
          _tmpColor.setRGB(0.62 + tint, 0.31 + tint * 0.5, 0.21 + tint * 0.4);
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
        celestialBody.scale.setScalar(1.0);
        (celestialBody.material as THREE.MeshStandardMaterial).map = textures.earthGlobe;
        (celestialBody.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
        (celestialBody.material as THREE.MeshStandardMaterial).needsUpdate = true;
      } else {
        hemiLight.color.setHex(0xfdba74);
        hemiLight.groundColor.setHex(0x5c2414);
        keyLight.color.setHex(0xffedd5);
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
      if ((e.code === 'KeyE' || e.code === 'Enter') && nearestRef.current) {
        onInteractRef.current(nearestRef.current);
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
        if (dist > 21) {
          wx = (wx / dist) * 21;
          wz = (wz / dist) * 21;
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
        chaseDistance = THREE.MathUtils.clamp(chaseDistance + e.deltaY * 0.006, 4.2, 13.5);
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

      // Sync active playable astronaut suit color in real time!
      const astroProfile = ASTRONAUT_PROFILES[s.activeAstronaut] || ASTRONAUT_PROFILES.maya;
      handles.playerAstro.suitAccentMat.color.setHex(astroProfile.suitColorHex);
      (handles.playerMarker.material as THREE.MeshBasicMaterial).color.setHex(astroProfile.suitColorHex);

      // ---------------------------------------------------------
      // INTERACTIVE 3RD-PERSON PLAYER EXPLORATION MODE
      // ---------------------------------------------------------
      surfaceGroup.visible = true;

        const skyHex = s.site === 'moon' ? 0x060913 : 0x28130e;
        if (!(scene.background as THREE.Color)?.equals(new THREE.Color(skyHex))) {
          scene.background = new THREE.Color(skyHex);
          scene.fog = new THREE.FogExp2(skyHex, s.site === 'moon' ? 0.013 : 0.016);
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
          const speed = s.walkSpeed === 'fast' ? 6.6 : 4.5;
          let nextX = player.group.position.x + dirX * speed * delta;
          let nextZ = player.group.position.z + dirZ * speed * delta;

          // Keep inside playable crater valley
          const distFromOrigin = Math.hypot(nextX, nextZ);
          if (distFromOrigin > 21) {
            nextX = (nextX / distFromOrigin) * 21;
            nextZ = (nextZ / distFromOrigin) * 21;
          }

          // Smooth collision push-out from solid building interiors
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

          const walkSwing = Math.sin(elapsed * (s.walkSpeed === 'fast' ? 12 : 9)) * 0.52;
          player.leftLeg.rotation.x = walkSwing;
          player.rightLeg.rotation.x = -walkSwing;
          player.leftArm.rotation.x = -walkSwing * 0.75;
          player.rightArm.rotation.x = walkSwing * 0.75;

          stepAudioTimer += delta;
          if (stepAudioTimer > 0.36) {
            stepAudioTimer = 0;
            soundEngine.playFootstep();
          }
        } else {
          player.leftLeg.rotation.x = THREE.MathUtils.damp(player.leftLeg.rotation.x, 0, 10, delta);
          player.rightLeg.rotation.x = THREE.MathUtils.damp(player.rightLeg.rotation.x, 0, 10, delta);
          player.leftArm.rotation.x = THREE.MathUtils.damp(player.leftArm.rotation.x, 0, 10, delta);
          player.rightArm.rotation.x = THREE.MathUtils.damp(player.rightArm.rotation.x, 0, 10, delta);
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
            if (dSample < 1.85) {
              onCollectSampleRef.current(smp.id);
            }
          }
        });

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
            mat.color.setHex(isNear ? 0xf59e0b : 0x38bdf8);
            mat.opacity = THREE.MathUtils.damp(mat.opacity, isNear ? 0.78 : 0.16, 8, delta);
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

        // 4. NPC Teammates (Leo & Zara) patrol or shelter in storms
        handles.npcAstronauts.forEach((astro, idx) => {
          const target2D = s.isSolarStorm ? astro.homePos : astro.workPos;
          const patrolOffsetX = s.isSolarStorm ? 0 : Math.sin(elapsed * 0.45 + idx * 2.1) * 0.85;
          const patrolOffsetZ = s.isSolarStorm ? 0 : Math.cos(elapsed * 0.35 + idx * 1.7) * 0.7;
          const tx = target2D.x + patrolOffsetX;
          const tz = target2D.y + patrolOffsetZ;

          const dx = tx - astro.group.position.x;
          const dz = tz - astro.group.position.z;
          const dist = Math.hypot(dx, dz);

          if (dist > 0.08) {
            const step = Math.min(dist, (s.isSolarStorm ? 2.4 : 1.1) * delta);
            astro.group.position.x += (dx / dist) * step;
            astro.group.position.z += (dz / dist) * step;
            astro.group.rotation.y = Math.atan2(dx, dz);
            const walkSwing = Math.sin(elapsed * (s.isSolarStorm ? 10 : 5.5) + idx) * 0.42;
            astro.leftLeg.rotation.x = walkSwing;
            astro.rightLeg.rotation.x = -walkSwing;
            astro.leftArm.rotation.x = -walkSwing * 0.7;
            astro.rightArm.rotation.x = walkSwing * 0.7;
          } else {
            astro.leftLeg.rotation.x = THREE.MathUtils.damp(astro.leftLeg.rotation.x, 0, 8, delta);
            astro.rightLeg.rotation.x = THREE.MathUtils.damp(astro.rightLeg.rotation.x, 0, 8, delta);
            astro.leftArm.rotation.x = THREE.MathUtils.damp(astro.leftArm.rotation.x, 0, 8, delta);
            astro.rightArm.rotation.x = THREE.MathUtils.damp(
              astro.rightArm.rotation.x,
              Math.sin(elapsed * 2.5 + idx) * 0.15,
              5,
              delta
            );
          }

          astro.group.position.y = groundHeightAt(
            astro.group.position.x,
            astro.group.position.z,
            s.site
          );
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
        const r = 3.22 - shutterProgress * 0.12;
        sh.position.set(Math.cos(ang) * r, 1.55 + (1 - shutterProgress) * 1.15, Math.sin(ang) * r);
      });
      const bubbleMat = handles.shieldBubble.material as THREE.MeshBasicMaterial;
      const targetBubbleOpacity =
        s.powerAllocation.shield >= 2 || s.isSolarStorm ? 0.18 + s.powerAllocation.shield * 0.05 : 0.0;
      bubbleMat.opacity = THREE.MathUtils.damp(bubbleMat.opacity, targetBubbleOpacity, 3.5, delta);
      handles.shieldBubble.rotation.y += delta * 0.25;
      handles.cabinGlowMat.emissiveIntensity = 0.4 + (s.lifeSupport / 100) * 1.1;

      // Solar Wings tilt
      const targetTilt = s.isDustStorm ? 0.85 : Math.sin(elapsed * 0.25) * 0.22 + 0.32;
      handles.solarWings.forEach((wing) => {
        wing.rotation.x = THREE.MathUtils.damp(wing.rotation.x, targetTilt, 3, delta);
      });
      handles.solarCellMat.emissiveIntensity = s.isDustStorm ? 0.04 : 0.2;

      // Greenhouse grow lights
      const ghPowerFactor = s.powerAllocation.greenhouse / 3;
      handles.growLightMat.emissiveIntensity = 0.25 + ghPowerFactor * 1.8;
      handles.growPointLight.intensity = 0.4 + ghPowerFactor * 2.8;

      // Life Support fan
      handles.lifeFan.rotation.z -= delta * (1.2 + s.powerAllocation.lifesupport * 3.2);

      // Comms dish & beam
      const sciPower = s.powerAllocation.science;
      handles.commsHead.rotation.y = Math.sin(elapsed * 0.45) * 0.35;
      handles.commsBeaconMat.emissiveIntensity = sciPower > 0 ? 1.2 + Math.sin(elapsed * 4) * 0.4 : 0.2;
      const beamMat = handles.commsBeam.material as THREE.MeshBasicMaterial;
      beamMat.opacity = sciPower > 0 ? 0.12 + sciPower * 0.06 : 0.02;

      // Rover patrol
      if (sciPower > 0) {
        const rt = elapsed * (0.22 + sciPower * 0.12);
        const rx = Math.sin(rt) * 2.2;
        const rz = Math.cos(rt * 0.7) * 1.6;
        handles.roverGroup.position.x = THREE.MathUtils.damp(handles.roverGroup.position.x, rx, 2.5, delta);
        handles.roverGroup.position.z = THREE.MathUtils.damp(handles.roverGroup.position.z, rz, 2.5, delta);
        const worldX = handles.moduleGroups.science.position.x + handles.roverGroup.position.x;
        const worldZ = handles.moduleGroups.science.position.z + handles.roverGroup.position.z;
        handles.roverGroup.position.y =
          groundHeightAt(worldX, worldZ, s.site) - handles.moduleGroups.science.position.y;
        handles.roverGroup.rotation.y = Math.atan2(Math.cos(rt) * 2.2, -Math.sin(rt * 0.7) * 1.12);
        handles.roverWheels.forEach((w) => {
          w.rotation.x += delta * 2.5;
        });
        handles.roverArm.rotation.x = Math.sin(elapsed * 1.8) * 0.25 - 0.15;
      }

      // Space Weather Storm Particles
      const targetStorm = s.isSolarStorm ? 1 : s.isDustStorm ? 0.65 : 0;
      stormStrength = THREE.MathUtils.damp(stormStrength, targetStorm, 2.5, delta);
      stormMat.opacity = stormStrength * 0.75;
      stormMat.color.setHex(s.isSolarStorm ? 0xfbbf24 : 0xfb923c);
      if (stormStrength > 0.02) {
        const arr = stormGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < stormCount; i++) {
          arr[i * 3] += delta * (s.isSolarStorm ? 11 : 5);
          arr[i * 3 + 1] -= delta * (s.isSolarStorm ? 3.8 : 0.6);
          if (arr[i * 3] > 22) arr[i * 3] = -22;
          if (arr[i * 3 + 1] < 0.5) arr[i * 3 + 1] = 19;
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

      {hoveredId && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-10 -translate-x-1/2 rounded-xl border border-sky-500/50 bg-[#0B1120]/95 px-3.5 py-1.5 text-xs font-semibold text-sky-200 shadow-lg">
          Click to interact: {MODULE_SPECS[hoveredId].name}
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
