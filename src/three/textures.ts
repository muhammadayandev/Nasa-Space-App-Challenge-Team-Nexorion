import * as THREE from 'three';

export interface ProceduralTextureSet {
  moonGround: THREE.CanvasTexture;
  marsGround: THREE.CanvasTexture;
  solarCell: THREE.CanvasTexture;
  hullPanels: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  earthGlobe: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function createGroundTexture(
  baseHex: string,
  darkHex: string,
  lightHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  let seed = baseHex.charCodeAt(1) * 137;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 4200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.6 + rand() * 2.6;
    ctx.fillStyle = rand() > 0.5 ? darkHex : lightHex;
    ctx.globalAlpha = 0.14 + rand() * 0.22;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 45; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 6 + rand() * 18;
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = lightHex;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = darkHex;
    ctx.beginPath();
    ctx.arc(x + 1.5, y + 1.5, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSolarTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);

  ctx.fillStyle = '#0d2244';
  ctx.fillRect(0, 0, size, size);

  const cols = 8;
  const rows = 16;
  const cw = size / cols;
  const rh = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#112c58' : '#153469';
      ctx.fillRect(c * cw + 2, r * rh + 1.5, cw - 4, rh - 3);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
      ctx.fillRect(c * cw + cw * 0.48, r * rh + 1.5, 1.2, rh - 3);
    }
  }

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createHullPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let y = 0; y <= size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let x = 0; x <= size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  ctx.fillStyle = '#64748b';
  for (let y = 8; y < size; y += 64) {
    for (let x = 8; x < size; x += 64) {
      ctx.fillRect(x, y, 3, 3);
      ctx.fillRect(x + 48, y, 3, 3);
      ctx.fillRect(x, y + 48, 3, 3);
      ctx.fillRect(x + 48, y + 48, 3, 3);
    }
  }

  ctx.fillStyle = '#ea580c';
  ctx.fillRect(0, 118, size, 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createEarthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const [canvas, ctx] = makeCanvas(w, h);

  // Deep ocean gradient
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, '#0f3f7a');
  ocean.addColorStop(0.5, '#1d6fd1');
  ocean.addColorStop(1, '#0f3f7a');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);

  // Stylized continents (Americas, Eurasia/Africa, Australia)
  ctx.fillStyle = '#2f855a';
  const blobs = [
    [115, 88, 38, 42],
    [145, 148, 24, 38],
    [275, 76, 52, 34],
    [285, 134, 28, 36],
    [352, 88, 44, 30],
    [392, 168, 22, 16],
  ];
  for (const [cx, cy, rx, ry] of blobs) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar ice caps
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, 20);
  ctx.fillRect(0, h - 18, w, 18);

  // Wispy cloud swirls
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  for (let i = 0; i < 24; i++) {
    const x = (i * 53) % w;
    const y = 32 + ((i * 29) % (h - 64));
    ctx.beginPath();
    ctx.ellipse(x, y, 26 + (i % 4) * 10, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const moonGround = createGroundTexture('#6b7078', '#3c4047', '#9ba1ab', maxAnisotropy);
  const marsGround = createGroundTexture('#9c4b2d', '#5e2916', '#c97149', maxAnisotropy);
  const solarCell = createSolarTexture(maxAnisotropy);
  const hullPanels = createHullPanelTexture(maxAnisotropy);
  const contactShadow = createContactShadowTexture();
  const earthGlobe = createEarthTexture(maxAnisotropy);

  return {
    moonGround,
    marsGround,
    solarCell,
    hullPanels,
    contactShadow,
    earthGlobe,
    dispose: () => {
      moonGround.dispose();
      marsGround.dispose();
      solarCell.dispose();
      hullPanels.dispose();
      contactShadow.dispose();
      earthGlobe.dispose();
    },
  };
}
