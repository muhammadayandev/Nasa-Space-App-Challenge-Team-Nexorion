import * as THREE from 'three';

export interface ProceduralTextureSet {
  moonGround: THREE.CanvasTexture;
  marsGround: THREE.CanvasTexture;
  marsGroundBump: THREE.CanvasTexture;
  marsRockMap: THREE.CanvasTexture;
  marsRockBump: THREE.CanvasTexture;
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

function createCutsceneMarsTextures(maxAnisotropy: number): {
  marsGround: THREE.CanvasTexture;
  marsGroundBump: THREE.CanvasTexture;
  marsRockMap: THREE.CanvasTexture;
  marsRockBump: THREE.CanvasTexture;
} {
  // Exact Mars Iron-Oxide Regolith Color + Bump from cutscene materials.ts
  const [marsC, marsCtx] = makeCanvas(512, 512);
  const marsGrad = marsCtx.createLinearGradient(0, 0, 512, 512);
  marsGrad.addColorStop(0, '#9c4527');
  marsGrad.addColorStop(0.5, '#b2522f');
  marsGrad.addColorStop(1, '#82371f');
  marsCtx.fillStyle = marsGrad;
  marsCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 8) {
    marsCtx.fillStyle = y % 16 === 0 ? 'rgba(210, 112, 68, 0.16)' : 'rgba(65, 22, 12, 0.15)';
    marsCtx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const wave = Math.sin(x * 0.04 + y * 0.05) * 4;
      if (x === 0) marsCtx.moveTo(x, y + wave);
      else marsCtx.lineTo(x, y + wave);
    }
    marsCtx.lineTo(512, y + 6);
    marsCtx.lineTo(0, y + 6);
    marsCtx.closePath();
    marsCtx.fill();
  }
  let seed = 4129;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 3600; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    marsCtx.fillStyle = rand() > 0.5 ? 'rgba(58, 28, 20, 0.35)' : 'rgba(218, 134, 90, 0.25)';
    marsCtx.fillRect(x, y, 2 + rand() * 2, 2);
  }
  const marsGround = new THREE.CanvasTexture(marsC);
  marsGround.colorSpace = THREE.SRGBColorSpace;
  marsGround.wrapS = THREE.RepeatWrapping;
  marsGround.wrapT = THREE.RepeatWrapping;
  marsGround.repeat.set(20, 20);
  marsGround.anisotropy = maxAnisotropy;

  const [marsBC, marsBCtx] = makeCanvas(256, 256);
  marsBCtx.fillStyle = '#808080';
  marsBCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    marsBCtx.fillStyle = y % 12 === 0 ? '#a8a8a8' : '#606060';
    marsBCtx.fillRect(0, y, 256, 3);
  }
  for (let i = 0; i < 2000; i++) {
    const v = 70 + Math.floor(rand() * 115);
    marsBCtx.fillStyle = `rgb(${v},${v},${v})`;
    marsBCtx.fillRect(rand() * 256, rand() * 256, 2, 2);
  }
  const marsGroundBump = new THREE.CanvasTexture(marsBC);
  marsGroundBump.colorSpace = THREE.NoColorSpace;
  marsGroundBump.wrapS = THREE.RepeatWrapping;
  marsGroundBump.wrapT = THREE.RepeatWrapping;
  marsGroundBump.repeat.set(20, 20);
  marsGroundBump.anisotropy = maxAnisotropy;

  // Martian Sedimentary Rock Map & Bump matching cutscene rocks
  const [rkC, rkCtx] = makeCanvas(256, 256);
  const rkGrad = rkCtx.createLinearGradient(0, 0, 256, 256);
  rkGrad.addColorStop(0, '#853a22');
  rkGrad.addColorStop(0.5, '#9d482b');
  rkGrad.addColorStop(1, '#682b18');
  rkCtx.fillStyle = rkGrad;
  rkCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 10) {
    rkCtx.fillStyle = y % 20 === 0 ? 'rgba(196, 102, 62, 0.22)' : 'rgba(54, 20, 11, 0.24)';
    rkCtx.fillRect(0, y, 256, 4);
  }
  for (let i = 0; i < 1800; i++) {
    rkCtx.fillStyle = i % 3 === 0 ? 'rgba(52, 22, 14, 0.42)' : 'rgba(206, 120, 80, 0.25)';
    rkCtx.fillRect((i * 73) % 256, (i * 139) % 256, 2 + (i % 3), 2);
  }
  const marsRockMap = new THREE.CanvasTexture(rkC);
  marsRockMap.colorSpace = THREE.SRGBColorSpace;
  marsRockMap.wrapS = THREE.RepeatWrapping;
  marsRockMap.wrapT = THREE.RepeatWrapping;
  marsRockMap.repeat.set(2, 2);
  marsRockMap.anisotropy = maxAnisotropy;

  const [rkBC, rkBCtx] = makeCanvas(256, 256);
  rkBCtx.fillStyle = '#808080';
  rkBCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const shade = 55 + ((i * 53) % 135);
    rkBCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    rkBCtx.fillRect((i * 97) % 256, (i * 61) % 256, 2 + (i % 4), 2 + (i % 3));
  }
  const marsRockBump = new THREE.CanvasTexture(rkBC);
  marsRockBump.colorSpace = THREE.NoColorSpace;
  marsRockBump.wrapS = THREE.RepeatWrapping;
  marsRockBump.wrapT = THREE.RepeatWrapping;
  marsRockBump.repeat.set(2, 2);
  marsRockBump.anisotropy = maxAnisotropy;

  return { marsGround, marsGroundBump, marsRockMap, marsRockBump };
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const moonGround = createGroundTexture('#6b7078', '#3c4047', '#9ba1ab', maxAnisotropy);
  const { marsGround, marsGroundBump, marsRockMap, marsRockBump } =
    createCutsceneMarsTextures(maxAnisotropy);
  const solarCell = createSolarTexture(maxAnisotropy);
  const hullPanels = createHullPanelTexture(maxAnisotropy);
  const contactShadow = createContactShadowTexture();
  const earthGlobe = createEarthTexture(maxAnisotropy);

  return {
    moonGround,
    marsGround,
    marsGroundBump,
    marsRockMap,
    marsRockBump,
    solarCell,
    hullPanels,
    contactShadow,
    earthGlobe,
    dispose: () => {
      moonGround.dispose();
      marsGround.dispose();
      marsGroundBump.dispose();
      marsRockMap.dispose();
      marsRockBump.dispose();
      solarCell.dispose();
      hullPanels.dispose();
      contactShadow.dispose();
      earthGlobe.dispose();
    },
  };
}
