import * as THREE from 'three';
import { buildNpcCharacter } from './npc.js';

const PLAZA_SIZE = 82;
const FLOOR_Y    = 0.35;  // center of floor slab → top at 0.70

let _birds = [];

// ── Public ────────────────────────────────────────────────────────────

export function initPlaza(scene) {
  addFloor(scene);
  addCornerColumns(scene);
  addOakTree(scene);
  addEdgeBenches(scene);
  addNpc(scene);
  _birds = createBirds(scene);
}

export function updatePlaza(delta, time) {
  for (const b of _birds) _updateBird(b, delta, time);
}

// ── Medieval mosaic floor ─────────────────────────────────────────────

function makeMosaicTexture() {
  const S    = 1024;
  const T    = 64;   // pixels per tile (gives 16 tiles per axis in the texture)
  const cols = S / T;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Palette: warm limestone, cool grey, dark charcoal, golden accent
  const palette = [
    '#C8BB9A', '#B0A882', '#D4C9A8',
    '#9A9080', '#B4ACA0',
    '#A88C5A', '#C0A060', // golden accent
  ];

  const rng = seededRng(77);

  for (let row = 0; row < cols; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = (col + 0.5) / cols - 0.5;
      const cz = (row + 0.5) / cols - 0.5;
      const dist = Math.sqrt(cx * cx + cz * cz);

      // Central circle: golden mosaic within 0.12 of centre
      let color;
      if (dist < 0.12) {
        // Radiating golden/warm pattern
        const a = Math.atan2(cz, cx);
        const seg = Math.floor((a / (Math.PI * 2) + 0.5) * 8) % 2;
        color = seg === 0 ? '#C0A45C' : '#A08840';
      } else if (dist > 0.46) {
        // Outer border: two alternating dark stones
        color = (row + col) % 2 === 0 ? '#7A7060' : '#8A8272';
      } else if ((row + col) % 2 === 0) {
        color = palette[Math.floor(rng() * 3)]; // light limestone
      } else {
        color = palette[3 + Math.floor(rng() * 2)]; // mid grey
      }

      // Base tile
      ctx.fillStyle = color;
      ctx.fillRect(col * T, row * T, T, T);

      // Subtle surface variation (make each stone look unique)
      const noise = (rng() - 0.5) * 18;
      const hex = parseInt(color.slice(1), 16);
      const r = Math.min(255, Math.max(0, (hex >> 16) + noise));
      const g = Math.min(255, Math.max(0, ((hex >> 8) & 0xff) + noise));
      const bv = Math.min(255, Math.max(0, (hex & 0xff) + noise));
      ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(bv)},0.3)`;
      ctx.fillRect(col * T + 2, row * T + 2, T - 4, T - 4);

      // Grout lines
      ctx.fillStyle = 'rgba(60,50,38,0.75)';
      ctx.fillRect(col * T,       row * T,       T, 2);   // top
      ctx.fillRect(col * T,       row * T,       2, T);   // left
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT  = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);   // ~12 texture repetitions → tiles ≈ 0.54 m each
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addFloor(scene) {
  const mosaic = makeMosaicTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    map:       mosaic,
    roughness: 0.82,
    metalness: 0.04,
    color:     0xffffff,
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(PLAZA_SIZE, 0.7, PLAZA_SIZE), floorMat);
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  // Stone border curb (slightly lower, contrasting darker stone)
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0x888070, roughness: 0.9, metalness: 0.0,
  });
  const border = new THREE.Mesh(new THREE.BoxGeometry(PLAZA_SIZE + 4, 0.3, PLAZA_SIZE + 4), borderMat);
  border.position.y = 0.15;
  border.receiveShadow = true;
  scene.add(border);
}

// ── Corner columns ────────────────────────────────────────────────────

function addCornerColumns(scene) {
  const colMat = mat(0xD0C8B8, 0.72);
  const capMat = mat(0xDED6C6, 0.65);
  const ringMat = mat(0xA09080, 0.78);

  [[-36, -36], [-36, 36], [36, -36], [36, 36]].forEach(([x, z]) => {
    // Base ring
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.4, 12), ringMat);
    ring.position.set(x, 0.9, z);
    scene.add(ring);

    // Column shaft with fluting (cylinder approximation)
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 10, 12), colMat);
    col.position.set(x, 5.9, z);
    col.castShadow = true;
    scene.add(col);

    // Capital
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 0.7, 12), capMat);
    cap.position.set(x, 11.2, z);
    scene.add(cap);

    // Abacus slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 3.2), capMat);
    slab.position.set(x, 11.7, z);
    scene.add(slab);
  });
}

// ── Ancient oak tree ──────────────────────────────────────────────────

const OAK_X = 0, OAK_Z = 0;
const TREE_HEIGHT = 26;

function addOakTree(scene) {
  const barkMat  = new THREE.MeshStandardMaterial({ color: 0x3D2B1A, roughness: 0.97, metalness: 0.0 });
  const bark2Mat = new THREE.MeshStandardMaterial({ color: 0x4E3520, roughness: 0.95, metalness: 0.0 });
  const rootMat  = new THREE.MeshStandardMaterial({ color: 0x352515, roughness: 0.98, metalness: 0.0 });

  const leafCols = [0x1B4A10, 0x1E5C14, 0x255E18, 0x2D6B1A, 0x1A4210, 0x173D0E];

  // ── Root buttresses ────────────────────────────────────────────────
  for (let i = 0; i < 7; i++) {
    const a  = (i / 7) * Math.PI * 2;
    const rx = Math.cos(a), rz = Math.sin(a);
    const root = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 1.4), rootMat);
    root.position.set(rx * 1.4, 0.1, rz * 1.4);
    root.rotation.y = -a;
    root.rotation.z = Math.sign(Math.cos(a)) * 0.3;
    root.castShadow = true;
    scene.add(root);
  }

  // ── Trunk (multi-section, widening at base) ────────────────────────
  const sections = [
    { y: 2,   h: 4,  rb: 1.80, rt: 1.50 },
    { y: 6,   h: 4,  rb: 1.50, rt: 1.20 },
    { y: 10,  h: 4,  rb: 1.20, rt: 0.90 },
    { y: 14,  h: 4,  rb: 0.90, rt: 0.70 },
  ];
  sections.forEach(({ y, h, rb, rt }) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), barkMat);
    trunk.position.set(OAK_X, y, OAK_Z);
    trunk.castShadow = true;
    scene.add(trunk);
  });

  // ── Major branches ─────────────────────────────────────────────────
  const branches = [
    { ax: 8,  ay: 14, az: 0,   bx:  5, by: 20, bz: 0,    r: 0.5 },
    { ax: -8, ay: 14, az: 0,   bx: -5, by: 20, bz: 0,    r: 0.5 },
    { ax: 0,  ay: 12, az: 8,   bx: 0,  by: 19, bz: 5,    r: 0.45 },
    { ax: 0,  ay: 12, az: -8,  bx: 0,  by: 19, bz: -5,   r: 0.45 },
    { ax: 6,  ay: 10, az: 6,   bx: 4,  by: 16, bz: 4,    r: 0.38 },
    { ax: -6, ay: 10, az: -6,  bx: -4, by: 16, bz: -4,   r: 0.38 },
    { ax: 10, ay: 17, az: 5,   bx: 7,  by: 22, bz: 3,    r: 0.32 },
    { ax: -9, ay: 17, az: -4,  bx: -6, by: 22, bz: -2,   r: 0.32 },
  ];

  branches.forEach(({ ax, ay, az, bx, by, bz, r }, i) => {
    const start = new THREE.Vector3(OAK_X + ax, ay, OAK_Z + az);
    const end   = new THREE.Vector3(OAK_X + bx, by, OAK_Z + bz);
    const dir   = end.clone().sub(start);
    const len   = dir.length();
    const mid   = start.clone().add(end).multiplyScalar(0.5);

    const branch = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, len, 8), i % 2 === 0 ? barkMat : bark2Mat);
    branch.position.copy(mid);
    // Orient cylinder along dir
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    branch.castShadow = true;
    scene.add(branch);
  });

  // ── Foliage clusters ───────────────────────────────────────────────
  const foliagePositions = [
    [0,  22, 0,   4.0],
    [6,  19, 3,   3.2],
    [-7, 19, -2,  3.0],
    [3,  18, -7,  2.8],
    [-4, 20, 5,   2.8],
    [9,  16, 2,   2.4],
    [-8, 16, -5,  2.4],
    [0,  15, 9,   2.2],
    [5,  23, -4,  2.0],
    [-5, 22, 3,   2.0],
    [2,  25, 1,   1.8],   // crown top
    [-2, 24, -1,  1.6],
    [10, 13, 8,   1.6],   // low outer canopy
    [-10, 13, -7, 1.6],
    [0,  12, -10, 1.5],
    [8,  12, -8,  1.4],
  ];

  foliagePositions.forEach(([fx, fy, fz, radius], i) => {
    const colIdx = i % leafCols.length;
    const leafMat = new THREE.MeshStandardMaterial({
      color:     leafCols[colIdx],
      roughness: 0.90,
      metalness: 0.0,
    });
    // Main sphere
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 7), leafMat);
    sphere.position.set(OAK_X + fx, fy, OAK_Z + fz);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);

    // Secondary lobe offset slightly for organic shape
    if (radius > 2.0) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.68, 7, 6),
        new THREE.MeshStandardMaterial({ color: leafCols[(colIdx + 1) % leafCols.length], roughness: 0.92, metalness: 0 }));
      lobe.position.set(OAK_X + fx + 1.2, fy - 0.8, OAK_Z + fz + 0.8);
      lobe.castShadow = true;
      scene.add(lobe);
    }
  });

  // ── Bench ring around base ─────────────────────────────────────────
  const benchMat = mat(0x7A6248, 0.88);
  for (let i = 0; i < 4; i++) {
    const a    = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const bx   = OAK_X + Math.cos(a) * 3.8;
    const bz   = OAK_Z + Math.sin(a) * 3.8;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 0.9), benchMat);
    bench.position.set(bx, 0.81, bz);
    bench.rotation.y = -a;
    bench.castShadow = bench.receiveShadow = true;
    scene.add(bench);
  }
}

// ── Edge benches ──────────────────────────────────────────────────────

function addEdgeBenches(scene) {
  const benchMat  = mat(0x7A6248, 0.88);
  const legMat    = mat(0x5C4A38, 0.90);

  const sides = [
    { x:  0, z: -38, ry: 0 },
    { x:  0, z:  38, ry: Math.PI },
    { x: -38, z: 0,  ry:  Math.PI / 2 },
    { x:  38, z: 0,  ry: -Math.PI / 2 },
  ];

  sides.forEach(({ x, z, ry }) => {
    for (let i = -1; i <= 1; i++) {
      const ox = ry === 0 || ry === Math.PI ? i * 9 : 0;
      const oz = Math.abs(ry) === Math.PI / 2 ? i * 9 : 0;

      // Seat
      const bench = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.24, 1.1), benchMat);
      bench.position.set(x + ox, 0.82, z + oz);
      bench.rotation.y = ry;
      bench.castShadow = bench.receiveShadow = true;
      scene.add(bench);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.2, 0.82, 0.2);
      const legOffsets = ry === 0 || ry === Math.PI
        ? [[-2.8, 0], [2.8, 0]] : [[0, -2.8], [0, 2.8]];
      legOffsets.forEach(([lox, loz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x + ox + lox, 0.41, z + oz + loz);
        leg.castShadow = true;
        scene.add(leg);
      });
    }
  });
}

// ── Main store NPC ────────────────────────────────────────────────────

function addNpc(scene) {
  const npc = buildNpcCharacter(0xFFB300, 'mainStore');
  npc.position.set(6, 0.7, 6);
  scene.add(npc);
}

// ── Birds ─────────────────────────────────────────────────────────────

const BIRD_COUNT = 14;

function createBirds(scene) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.82, metalness: 0 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x2E2E2E, roughness: 0.85, metalness: 0 });
  const bellMat = new THREE.MeshStandardMaterial({ color: 0x4A3828, roughness: 0.88, metalness: 0 });

  const rng = seededRng(31);
  const birds = [];

  for (let i = 0; i < BIRD_COUNT; i++) {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 4, 6), bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Belly (lighter)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), bellMat);
    belly.position.set(0, -0.03, 0.04);
    belly.scale.set(0.9, 0.7, 0.9);
    group.add(belly);

    // Left wing
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.14), wingMat);
    leftWing.position.set(-0.24, 0, 0);
    leftWing.rotation.z = 0.2;
    group.add(leftWing);

    // Right wing
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.14), wingMat);
    rightWing.position.set(0.24, 0, 0);
    rightWing.rotation.z = -0.2;
    group.add(rightWing);

    // Tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.12), wingMat);
    tail.position.set(0, 0, -0.14);
    group.add(tail);

    group.scale.setScalar(0.75 + rng() * 0.5);
    scene.add(group);

    const direction = rng() < 0.5 ? 1 : -1;
    birds.push({
      group, leftWing, rightWing,
      orbitR:    5 + rng() * 11,
      orbitH:    TREE_HEIGHT * 0.42 + rng() * TREE_HEIGHT * 0.40,
      speed:     (0.35 + rng() * 0.55) * direction,
      angle:     rng() * Math.PI * 2,
      bobAmp:    0.5 + rng() * 0.8,
      bobFreq:   1.2 + rng() * 0.8,
      bobPhase:  rng() * Math.PI * 2,
      flapSpeed: 5 + rng() * 5,
      flapPhase: rng() * Math.PI * 2,
    });
  }

  return birds;
}

function _updateBird(b, delta, time) {
  b.angle += b.speed * delta;
  b.group.position.set(
    OAK_X + Math.cos(b.angle) * b.orbitR,
    b.orbitH + Math.sin(time * b.bobFreq + b.bobPhase) * b.bobAmp,
    OAK_Z + Math.sin(b.angle) * b.orbitR
  );
  // Face direction of travel
  const facing = b.speed > 0 ? b.angle + Math.PI / 2 : b.angle - Math.PI / 2;
  b.group.rotation.y = facing;
  // Gentle bank into the turn
  b.group.rotation.z = b.speed > 0 ? -0.18 : 0.18;

  // Wing flap
  const flap = Math.sin(time * b.flapSpeed + b.flapPhase) * 0.45;
  b.leftWing.rotation.z  =  flap + 0.2;
  b.rightWing.rotation.z = -flap - 0.2;
}

// ── Helpers ───────────────────────────────────────────────────────────

function mat(color, rough = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
