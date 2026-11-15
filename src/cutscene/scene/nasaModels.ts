import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface NasaModelLibrary {
  roverTemplate: THREE.Group | null;
}

function normalizeModel(root: THREE.Object3D, targetHeight: number, castShadows: boolean): THREE.Group {
  const wrapper = new THREE.Group();
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  const scale = size.y > 0.0001 ? targetHeight / size.y : 1;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  root.position.x -= scaledCenter.x;
  root.position.z -= scaledCenter.z;
  root.position.y -= scaledBox.min.y;

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = castShadows;
      mesh.receiveShadow = true;
    }
  });

  wrapper.add(root);
  return wrapper;
}

function loadGlb(loader: GLTFLoader, url: string): Promise<THREE.Group | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => {
        console.warn(`Failed to load GLB ${url}:`, err);
        resolve(null);
      }
    );
  });
}

export async function loadNasaModels(castShadows: boolean): Promise<NasaModelLibrary> {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  try {
    const roverRaw = await loadGlb(loader, '/models/mars-rover.glb');
    return {
      roverTemplate: roverRaw ? normalizeModel(roverRaw, 1.55, castShadows) : null,
    };
  } finally {
    dracoLoader.dispose();
  }
}
