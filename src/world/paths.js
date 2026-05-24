import * as THREE from 'three';

// Paths sit at ground level — a shallow slab with stone texture.
// Top surface at y = 0.20 (PATH_SURFACE in terrain.js).

function makeStoneTexture() {
  const S = 512, T = 80; // tile size in pixels
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#B0A080';
  ctx.fillRect(0, 0, S, S);

  const rng = seededRng(55);
  const stoneCols = ['#C0B090', '#A89878', '#C8B898', '#B8A888', '#A09070'];

  let py = 0, row = 0;
  while (py < S) {
    const th = T + Math.floor(rng() * 10 - 5);
    let px = row % 2 === 0 ? 0 : -Math.floor(T * 0.5);
    while (px < S + T) {
      const tw = T + Math.floor(rng() * 20 - 10);
      const col = stoneCols[Math.floor(rng() * stoneCols.length)];
      ctx.fillStyle = col;
      ctx.fillRect(px, py, tw, th);

      // Surface texture variation
      const noise = (rng() - 0.5) * 22;
      const base = parseInt(col.slice(1), 16);
      const r = Math.min(255, Math.max(0, (base >> 16) + noise));
      const g = Math.min(255, Math.max(0, ((base >> 8) & 0xff) + noise));
      const b = Math.min(255, Math.max(0, (base & 0xff) + noise));
      ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},0.28)`;
      ctx.fillRect(px + 3, py + 3, tw - 6, th - 6);

      // Mortar line right
      ctx.fillStyle = 'rgba(55,45,35,0.8)';
      ctx.fillRect(px + tw - 1, py, 2, th);

      px += tw + 1;
    }
    // Mortar line bottom
    ctx.fillStyle = 'rgba(55,45,35,0.8)';
    ctx.fillRect(0, py + th - 1, S, 2);
    py += th + 1;
    row++;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _stoneTex = null;

function stoneMat() {
  if (!_stoneTex) _stoneTex = makeStoneTexture();
  return new THREE.MeshStandardMaterial({
    map:       _stoneTex,
    roughness: 0.93,
    metalness: 0.0,
  });
}

const EDGE_MAT = new THREE.MeshStandardMaterial({ color: 0x787060, roughness: 0.96, metalness: 0.0 });

export function initPaths(scene) {
  // Plaza exits (±41 from centre) → hangar/marina entrances
  addPath(scene,   0, -41,   0, -88, stoneMat());  // North
  addPath(scene,  41,   0,  88,   0, stoneMat());  // East
  addPath(scene,   0,  41,   0,  88, stoneMat());  // South
  addPath(scene, -41,   0, -104,  0, stoneMat());  // West → Marina
}

function addPath(scene, ax, az, bx, bz, pathMat) {
  const dx     = bx - ax;
  const dz     = bz - az;
  const length = Math.sqrt(dx * dx + dz * dz);
  const rotY   = Math.atan2(dx, dz);
  const cx     = (ax + bx) / 2;
  const cz     = (az + bz) / 2;

  // Adjust texture repeat proportional to path length
  const mat = pathMat.clone();
  mat.map = _stoneTex;   // shared texture instance
  mat.map.repeat.set(length / 10, 1);
  mat.needsUpdate = true;

  // Main stone slab — sits on the ground (top at y=0.20)
  const path = new THREE.Mesh(new THREE.BoxGeometry(9, 0.20, length), mat);
  path.position.set(cx, 0.10, cz);
  path.rotation.y = rotY;
  path.receiveShadow = true;
  scene.add(path);

  // Kerb stones along each long edge
  [-4.65, 4.65].forEach(offset => {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, length), EDGE_MAT);
    kerb.position.set(cx, 0.14, cz);
    kerb.rotation.y = rotY;
    kerb.position.x += Math.cos(rotY) * offset;
    kerb.position.z -= Math.sin(rotY) * offset;
    kerb.castShadow  = true;
    scene.add(kerb);
  });
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
