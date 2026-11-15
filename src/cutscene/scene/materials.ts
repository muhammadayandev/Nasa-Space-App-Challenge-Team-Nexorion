import * as THREE from 'three';

export interface ProceduralTextureSet {
  concreteMap: THREE.CanvasTexture;
  concreteBump: THREE.CanvasTexture;
  marsSoilMap: THREE.CanvasTexture;
  marsSoilBump: THREE.CanvasTexture;
  marsRockMap: THREE.CanvasTexture;
  marsRockBump: THREE.CanvasTexture;
  hullPanelMap: THREE.CanvasTexture;
  solarCellMap: THREE.CanvasTexture;
  earthGlobeMap: THREE.CanvasTexture;
  earthCloudMap: THREE.CanvasTexture;
  marsGlobeMap: THREE.CanvasTexture;
  dispose: () => void;
}

function hash3D(ix: number, iy: number, iz: number, seed: number): number {
  const n =
    Math.sin(ix * 127.1 + iy * 311.7 + iz * 191.9 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise3D(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3D(ix, iy, iz, seed);
  const n100 = hash3D(ix + 1, iy, iz, seed);
  const n010 = hash3D(ix, iy + 1, iz, seed);
  const n110 = hash3D(ix + 1, iy + 1, iz, seed);
  const n001 = hash3D(ix, iy, iz + 1, seed);
  const n101 = hash3D(ix + 1, iy, iz + 1, seed);
  const n011 = hash3D(ix, iy + 1, iz + 1, seed);
  const n111 = hash3D(ix + 1, iy + 1, iz + 1, seed);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;

  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbmSphere3D(
  nx: number,
  ny: number,
  nz: number,
  baseFreq: number,
  octaves: number,
  seed: number
): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = baseFreq;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise3D(nx * freq, ny * freq, nz * freq, seed + o * 23.7);
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  // Contrast-stretch central-limit distribution into crisp [0, 1]
  const raw = sum / norm;
  return Math.max(0, Math.min(1, (raw - 0.28) / 0.44));
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Concrete Launch Apron & Bump
  const [concC, concCtx] = makeCanvas(512, 512);
  concCtx.fillStyle = '#6c727a';
  concCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 90 + Math.floor(Math.random() * 45);
    concCtx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    concCtx.fillRect(x, y, 2, 2);
  }
  concCtx.strokeStyle = 'rgba(30, 34, 40, 0.45)';
  concCtx.lineWidth = 3;
  for (let g = 0; g <= 512; g += 128) {
    concCtx.beginPath();
    concCtx.moveTo(g, 0);
    concCtx.lineTo(g, 512);
    concCtx.stroke();
    concCtx.beginPath();
    concCtx.moveTo(0, g);
    concCtx.lineTo(512, g);
    concCtx.stroke();
  }
  concCtx.fillStyle = '#d99b26';
  concCtx.fillRect(0, 248, 512, 12);
  const concreteMap = configureTexture(concC, true, maxAnisotropy, 8, 8);

  const [concBC, concBCtx] = makeCanvas(256, 256);
  concBCtx.fillStyle = '#808080';
  concBCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const v = 95 + Math.floor(Math.random() * 65);
    concBCtx.fillStyle = `rgb(${v},${v},${v})`;
    concBCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const concreteBump = configureTexture(concBC, false, maxAnisotropy, 8, 8);

  // 2. Mars Iron-Oxide Regolith Color + Bump
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
  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    marsCtx.fillStyle =
      Math.random() > 0.5 ? 'rgba(58, 28, 20, 0.35)' : 'rgba(218, 134, 90, 0.25)';
    marsCtx.fillRect(x, y, 2 + Math.random() * 2, 2);
  }
  const marsSoilMap = configureTexture(marsC, true, maxAnisotropy, 18, 18);

  const [marsBC, marsBCtx] = makeCanvas(256, 256);
  marsBCtx.fillStyle = '#808080';
  marsBCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    marsBCtx.fillStyle = y % 12 === 0 ? '#a8a8a8' : '#606060';
    marsBCtx.fillRect(0, y, 256, 3);
  }
  for (let i = 0; i < 2000; i++) {
    const v = 70 + Math.floor(Math.random() * 115);
    marsBCtx.fillStyle = `rgb(${v},${v},${v})`;
    marsBCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const marsSoilBump = configureTexture(marsBC, false, maxAnisotropy, 18, 18);

  // 3. Spacecraft Fuselage Panel Map
  const [hullC, hullCtx] = makeCanvas(512, 512);
  hullCtx.fillStyle = '#ebeef2';
  hullCtx.fillRect(0, 0, 512, 512);
  hullCtx.strokeStyle = 'rgba(60, 72, 88, 0.35)';
  hullCtx.lineWidth = 2;
  for (let y = 0; y <= 512; y += 64) {
    hullCtx.beginPath();
    hullCtx.moveTo(0, y);
    hullCtx.lineTo(512, y);
    hullCtx.stroke();
  }
  for (let x = 0; x <= 512; x += 128) {
    hullCtx.beginPath();
    hullCtx.moveTo(x, 0);
    hullCtx.lineTo(x, 512);
    hullCtx.stroke();
  }
  hullCtx.fillStyle = '#d94826';
  hullCtx.fillRect(0, 132, 512, 24);
  hullCtx.fillStyle = '#1f242c';
  hullCtx.fillRect(0, 384, 512, 96);
  hullCtx.fillStyle = '#1b2638';
  hullCtx.font = 'bold 34px sans-serif';
  hullCtx.fillText('ARES IV', 44, 114);
  const hullPanelMap = configureTexture(hullC, true, maxAnisotropy, 1, 1);

  // 4. Photovoltaic Solar Array Texture
  const [solC, solCtx] = makeCanvas(256, 256);
  solCtx.fillStyle = '#0f2347';
  solCtx.fillRect(0, 0, 256, 256);
  solCtx.strokeStyle = '#6ba3e8';
  solCtx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 32) {
    solCtx.beginPath();
    solCtx.moveTo(x, 0);
    solCtx.lineTo(x, 256);
    solCtx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    solCtx.beginPath();
    solCtx.moveTo(0, y);
    solCtx.lineTo(256, y);
    solCtx.stroke();
  }
  const solarCellMap = configureTexture(solC, true, maxAnisotropy, 2, 2);

  // 5. High-Detail 3D Spherical Procedural Earth Map (~70% Oceans, Organic Continents, Smooth Biomes & Swirling Clouds)
  const ew = 512;
  const eh = 256;
  const [earthC, earthCtx] = makeCanvas(ew, eh);
  const earthImg = earthCtx.createImageData(ew, eh);
  const [cloudC, cloudCtx] = makeCanvas(ew, eh);
  const cloudImg = cloudCtx.createImageData(ew, eh);

  for (let py = 0; py < eh; py++) {
    const v = py / eh;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const lat = Math.abs(cosPhi); // 0 = equator, 1 = poles

    for (let px = 0; px < ew; px++) {
      const u = px / ew;
      const theta = u * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);
      const idx = (py * ew + px) * 4;

      // Domain-warped 3D spherical continental elevation
      const wx = fbmSphere3D(nx, ny, nz, 2.2, 3, 1.7) - 0.5;
      const wy = fbmSphere3D(nx, ny, nz, 2.2, 3, 5.2) - 0.5;
      const wz = fbmSphere3D(nx, ny, nz, 2.2, 3, 8.9) - 0.5;
      const elev = fbmSphere3D(nx + wx * 0.35, ny + wy * 0.35, nz + wz * 0.35, 2.6, 5, 14.3);
      const moisture = fbmSphere3D(nx, ny, nz, 3.8, 4, 29.1);
      const detail = fbmSphere3D(nx, ny, nz, 12.0, 3, 41.7);

      let r = 10;
      let g = 42;
      let b = 102;

      const seaLevel = 0.57;
      const iceMask = Math.max(0, Math.min(1, (lat - (0.86 - detail * 0.06)) / 0.05));

      if (elev < seaLevel) {
        // Deep sapphire ocean -> turquoise continental shelf
        const depth = elev / seaLevel;
        const shelf = Math.pow(Math.max(0, (elev - 0.46) / (seaLevel - 0.46)), 1.6);
        r = lerpNum(8, 22, depth) + shelf * 28;
        g = lerpNum(28, 74, depth) + shelf * 74;
        b = lerpNum(78, 148, depth) + shelf * 56;
      } else {
        // Organic smooth biome transitions (forest -> savannah -> desert -> mountain -> snow)
        const landH = (elev - seaLevel) / (1 - seaLevel);
        const subtropical = Math.exp(-Math.pow((lat - 0.34) / 0.22, 2));
        const arid = Math.max(0, Math.min(1, subtropical * (1.15 - moisture * 1.1)));

        // Lush forest base
        const fr = 28 + detail * 28;
        const fg = 78 + detail * 38;
        const fb = 38 + detail * 16;

        // Warm ochre/tan arid biome
        const dr = 172 + detail * 34;
        const dg = 144 + detail * 26;
        const db = 94 + detail * 18;

        r = lerpNum(fr, dr, arid);
        g = lerpNum(fg, dg, arid);
        b = lerpNum(fb, db, arid);

        // Elevation rock + alpine snow caps
        const rockMix = Math.max(0, Math.min(1, (landH - 0.45) / 0.32));
        r = lerpNum(r, 118, rockMix);
        g = lerpNum(g, 112, rockMix);
        b = lerpNum(b, 108, rockMix);

        const snowMix = Math.max(0, Math.min(1, (landH - 0.72) / 0.2));
        r = lerpNum(r, 238, snowMix);
        g = lerpNum(g, 242, snowMix);
        b = lerpNum(b, 248, snowMix);
      }

      // Smooth polar ice blending
      r = lerpNum(r, 236, iceMask);
      g = lerpNum(g, 244, iceMask);
      b = lerpNum(b, 252, iceMask);

      earthImg.data[idx] = Math.round(r);
      earthImg.data[idx + 1] = Math.round(g);
      earthImg.data[idx + 2] = Math.round(b);
      earthImg.data[idx + 3] = 255;

      // Realistic wispy atmospheric cloud bands
      const cw = fbmSphere3D(nx, ny, nz, 2.8, 3, 61.1) - 0.5;
      const cloudField = fbmSphere3D(
        nx + cw * 0.45 + Math.sin(ny * 5.0) * 0.12,
        ny * 1.35 + cw * 0.2,
        nz + cw * 0.45,
        3.4,
        4,
        53.8
      );
      const cloudAlpha = Math.max(0, Math.min(225, Math.round((cloudField - 0.48) * 560)));
      cloudImg.data[idx] = 248;
      cloudImg.data[idx + 1] = 251;
      cloudImg.data[idx + 2] = 255;
      cloudImg.data[idx + 3] = cloudAlpha;
    }
  }
  earthCtx.putImageData(earthImg, 0, 0);
  cloudCtx.putImageData(cloudImg, 0, 0);
  const earthGlobeMap = configureTexture(earthC, true, maxAnisotropy, 1, 1);
  const earthCloudMap = configureTexture(cloudC, true, maxAnisotropy, 1, 1);

  // 6. High-Detail 3D Spherical Procedural Mars Map (regolith, dark basalt maria, craters, Valles Marineris, ice caps)
  const [marsGC, marsGCtx] = makeCanvas(ew, eh);
  const marsImg = marsGCtx.createImageData(ew, eh);

  const craters: Array<[number, number, number]> = [
    [0.24, 0.56, 0.045],
    [0.58, 0.62, 0.058],
    [0.72, 0.38, 0.036],
    [0.14, 0.34, 0.028],
    [0.41, 0.44, 0.03],
    [0.86, 0.52, 0.04],
  ];

  for (let py = 0; py < eh; py++) {
    const v = py / eh;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const lat = Math.abs(cosPhi);

    for (let px = 0; px < ew; px++) {
      const u = px / ew;
      const theta = u * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);
      const idx = (py * ew + px) * 4;

      const macro = fbmSphere3D(nx, ny, nz, 2.8, 5, 71.3);
      const detail = fbmSphere3D(nx, ny, nz, 11.0, 3, 91.9);

      const mix = Math.max(0, Math.min(1, (macro - 0.25) / 0.55));
      let r = 82 + mix * 124 + (detail - 0.5) * 32;
      let g = 38 + mix * 64 + (detail - 0.5) * 20;
      let b = 26 + mix * 38 + (detail - 0.5) * 14;

      if (macro < 0.42) {
        r -= 16;
        g -= 10;
        b -= 5;
      }

      // Valles Marineris equatorial canyon scar
      const canyonDist = Math.abs(v - (0.52 + Math.sin(u * 12) * 0.015));
      if (u > 0.3 && u < 0.58 && canyonDist < 0.014) {
        const depth = 1 - canyonDist / 0.014;
        r *= 1 - depth * 0.48;
        g *= 1 - depth * 0.52;
        b *= 1 - depth * 0.45;
      }

      // Subtle shaded craters
      for (const [cu, cv, cr] of craters) {
        const du = Math.min(Math.abs(u - cu), 1 - Math.abs(u - cu));
        const dv = (v - cv) * 0.55;
        const dist = Math.hypot(du, dv);
        if (dist < cr) {
          const rim = Math.exp(-Math.pow((dist - cr * 0.85) / (cr * 0.14), 2));
          const bowl = dist < cr * 0.78 ? -0.18 : 0;
          const shade = rim * 0.22 + bowl;
          r *= 1 + shade;
          g *= 1 + shade;
          b *= 1 + shade;
        }
      }

      // Polar CO2/water ice caps
      const marsIce = Math.max(0, Math.min(1, (lat - (0.9 - detail * 0.04)) / 0.04));
      r = lerpNum(r, 238, marsIce);
      g = lerpNum(g, 228, marsIce);
      b = lerpNum(b, 222, marsIce);

      marsImg.data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      marsImg.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      marsImg.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      marsImg.data[idx + 3] = 255;
    }
  }
  marsGCtx.putImageData(marsImg, 0, 0);
  const marsGlobeMap = configureTexture(marsGC, true, maxAnisotropy, 1, 1);

  // 7. Martian Sedimentary Basalt-Iron-Oxide Rock Texture & Bump
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
    const rx = (i * 73) % 256;
    const ry = (i * 139) % 256;
    rkCtx.fillStyle = i % 3 === 0 ? 'rgba(52, 22, 14, 0.42)' : 'rgba(206, 120, 80, 0.25)';
    rkCtx.fillRect(rx, ry, 2 + (i % 3), 2);
  }
  const marsRockMap = configureTexture(rkC, true, maxAnisotropy, 2, 2);

  const [rkBC, rkBCtx] = makeCanvas(256, 256);
  rkBCtx.fillStyle = '#808080';
  rkBCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const shade = 55 + ((i * 53) % 135);
    rkBCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    rkBCtx.fillRect((i * 97) % 256, (i * 61) % 256, 2 + (i % 4), 2 + (i % 3));
  }
  const marsRockBump = configureTexture(rkBC, false, maxAnisotropy, 2, 2);

  return {
    concreteMap,
    concreteBump,
    marsSoilMap,
    marsSoilBump,
    marsRockMap,
    marsRockBump,
    hullPanelMap,
    solarCellMap,
    earthGlobeMap,
    earthCloudMap,
    marsGlobeMap,
    dispose: () => {
      concreteMap.dispose();
      concreteBump.dispose();
      marsSoilMap.dispose();
      marsSoilBump.dispose();
      marsRockMap.dispose();
      marsRockBump.dispose();
      hullPanelMap.dispose();
      solarCellMap.dispose();
      earthGlobeMap.dispose();
      earthCloudMap.dispose();
      marsGlobeMap.dispose();
    },
  };
}
