import * as THREE from 'three';
import { registerGround } from '../systems/terrain.js';

// Paths sit on the ground (top surface at y=0.20).
// High-res stone texture with individual blocks, variation, cracks.

function makeStoneTexture() {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const rng = seededRng(55);

  // Background grout color
  ctx.fillStyle = '#4A4030';
  ctx.fillRect(0, 0, S, S);

  const palettes = [
    '#C4B48C', '#B8A882', '#CEC0A0', '#C0B090', '#B4A87E',
    '#D0C0A0', '#A89C78', '#BCAE8C', '#C8B898', '#ACA080',
  ];
  const crackPal = ['rgba(58,48,34,0.30)', 'rgba(70,58,40,0.22)', 'rgba(48,40,28,0.28)'];

  // Stone rows with staggered joints (ashlar pattern)
  const rowH  = 68 + Math.floor(rng() * 12 - 6);
  const baseW = 100;
  let py = 0, row = 0;

  while (py < S) {
    const th  = rowH + Math.floor(rng() * 14 - 7);
    let   px  = row % 2 === 0 ? 0 : -Math.floor(baseW * 0.5);

    while (px < S + baseW) {
      const tw = baseW + Math.floor(rng() * 40 - 20);
      const col = palettes[Math.floor(rng() * palettes.length)];

      // Base stone fill
      ctx.fillStyle = col;
      ctx.fillRect(px + 2, py + 2, tw - 3, th - 3);

      // Brightness variation across the stone surface (simulate uneven weathering)
      const gx1 = px + 2, gy1 = py + 2;
      const g = ctx.createLinearGradient(gx1, gy1, gx1 + tw, gy1 + th * 0.6);
      g.addColorStop(0, `rgba(255,255,255,${0.04 + rng() * 0.08})`);
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${0.06 + rng() * 0.10})`);
      ctx.fillStyle = g;
      ctx.fillRect(px + 2, py + 2, tw - 3, th - 3);

      // Inner bevel (lighter edge highlight top-left, darker bottom-right)
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(px + 2, py + 2, tw - 3, 2);
      ctx.fillRect(px + 2, py + 2, 2, th - 3);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(px + tw - 3, py + 2, 2, th - 3);
      ctx.fillRect(px + 2, py + th - 3, tw - 3, 2);

      // Surface pitting / texture noise
      for (let n = 0; n < 6; n++) {
        const nx = px + 4 + rng() * (tw - 8);
        const ny = py + 4 + rng() * (th - 8);
        const nr = 1.2 + rng() * 2.5;
        ctx.fillStyle = `rgba(0,0,0,${0.06 + rng() * 0.08})`;
        ctx.beginPath(); ctx.ellipse(nx, ny, nr, nr * (0.4 + rng() * 0.6), rng() * Math.PI, 0, Math.PI * 2); ctx.fill();
      }

      // Crack on some stones
      if (rng() < 0.22) {
        const crk = crackPal[Math.floor(rng() * crackPal.length)];
        ctx.strokeStyle = crk;
        ctx.lineWidth   = 0.6 + rng() * 1.0;
        ctx.beginPath();
        const sx = px + 10 + rng() * (tw - 20);
        const sy = py + 8  + rng() * (th - 16);
        ctx.moveTo(sx, sy);
        let cx2 = sx, cy2 = sy;
        const segs = 2 + Math.floor(rng() * 3);
        for (let sg = 0; sg < segs; sg++) {
          cx2 += (rng() - 0.5) * (tw * 0.35);
          cy2 += (rng() - 0.5) * (th * 0.55);
          cx2 = Math.min(px + tw - 4, Math.max(px + 4, cx2));
          cy2 = Math.min(py + th - 4, Math.max(py + 4, cy2));
          ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
      }

      px += tw + 2; // 2-px grout gap
    }
    py += th + 2;
    row++;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let _stoneTex = null;
function getStoneTex() {
  if (!_stoneTex) _stoneTex = makeStoneTexture();
  return _stoneTex;
}

const EDGE_MAT = new THREE.MeshStandardMaterial({ color: 0x6A6050, roughness: 0.95 });

export function initPaths(scene) {
  // Paths to hangars (hangars 10m closer to plaza at 165.5)
  // North hangar: z=-165.5
  addPath(scene,   0, -41,   0, -123);  // Plaza to north hangar entrance

  // East/Center hangar: x=165.5
  addPath(scene,  41,   0, 123,   0);   // Plaza to center hangar entrance

  // South hangar: z=165.5
  addPath(scene,   0,  41,   0, 123);   // Plaza to south hangar entrance

  // Marina path (west): x=-230
  addPath(scene, -41,   0, -202,  0);   // Plaza to marina (unchanged)
}

function addPath(scene, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const length = Math.sqrt(dx*dx + dz*dz);
  const rotY   = Math.atan2(dx, dz);
  const cx = (ax+bx)/2, cz = (az+bz)/2;

  const pathMat = new THREE.MeshStandardMaterial({
    map:       getStoneTex(),
    roughness: 0.90,
    metalness: 0.0,
  });
  // Scale UV along path length
  pathMat.map = getStoneTex().clone();
  pathMat.map.repeat.set(1, length / 10);
  pathMat.map.needsUpdate = true;

  const path = new THREE.Mesh(new THREE.BoxGeometry(9, 0.20, length), pathMat);
  path.position.set(cx, 0.10, cz);
  path.rotation.y = rotY;
  path.receiveShadow = true;
  scene.add(path);
  registerGround(path);

}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
