import * as THREE from 'three';

function mat(color, rough = 0.88) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 });
}

function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const AVOID = [
  { x:   0, z: -130, r: 62 },
  { x: 130, z:    0, r: 62 },
  { x:   0, z:  130, r: 62 },
  { x: -150, z:   0, r: 84 },
  { x:   0, z:    0, r: 52 },
];
const BEACH_R = 218;
const PATH_HW = 8; // path half-width exclusion corridor

function _onPath(x, z) {
  if (Math.abs(x) < PATH_HW && z < -40 && z > -95)  return true;
  if (Math.abs(x) < PATH_HW && z >  40 && z <  95)  return true;
  if (Math.abs(z) < PATH_HW && x >  40 && x <  95)  return true;
  if (Math.abs(z) < PATH_HW && x < -40 && x > -115) return true;
  return false;
}

function clear(x, z) {
  if (x * x + z * z > BEACH_R * BEACH_R) return false;
  if (_onPath(x, z)) return false;
  return !AVOID.some(a => Math.hypot(a.x - x, a.z - z) < a.r);
}

function place(rng, minR = 10, maxR = BEACH_R) {
  const a = rng() * Math.PI * 2;
  const r = minR + rng() * (maxR - minR);
  return [Math.cos(a) * r, Math.sin(a) * r];
}

export function initDecor(scene) {
  const rng = makeRng(42);
  addRocks(scene, rng);
  addBushes(scene, rng);
  addFlowers(scene, rng);
  addMonsteras(scene, rng);
}

// ── Rocks ─────────────────────────────────────────────────────────────

function addRocks(scene, rng) {
  const cols = [0x78909C, 0x757575, 0x616161, 0x8D8D8D, 0x9E9E9E, 0x607D8B];
  for (let i = 0; i < 30; i++) {
    let x, z, t = 0;
    do { [x, z] = place(rng); t++; } while (!clear(x, z) && t < 30);
    if (!clear(x, z)) continue;

    const size = 0.28 + rng() * 0.9;
    const rock  = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), mat(cols[Math.floor(rng() * cols.length)], 0.93));
    rock.position.set(x, size * 0.32, z);
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    rock.scale.set(1 + rng() * 0.55, 0.32 + rng() * 0.45, 1 + rng() * 0.55);
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  }
}

// ── Bushes ────────────────────────────────────────────────────────────

function addBushes(scene, rng) {
  const cols = [0x388E3C, 0x2E7D32, 0x43A047, 0x558B2F, 0x33691E];
  for (let i = 0; i < 24; i++) {
    let x, z, t = 0;
    do { [x, z] = place(rng); t++; } while (!clear(x, z) && t < 30);
    if (!clear(x, z)) continue;

    const base  = 0.4 + rng() * 0.55;
    const count = 2 + Math.floor(rng() * 3);
    for (let j = 0; j < count; j++) {
      const r  = base * (0.5 + rng() * 0.5);
      const dx = (rng() - 0.5) * base * 1.2;
      const dz = (rng() - 0.5) * base * 1.2;
      const b  = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), mat(cols[Math.floor(rng() * cols.length)], 0.9));
      b.position.set(x + dx, r * 0.62, z + dz);
      b.castShadow = true;
      scene.add(b);
    }
  }
}

// ── Flowers ───────────────────────────────────────────────────────────

function addFlowers(scene, rng) {
  const petalCols = [
    0xFF7043, 0xEC407A, 0xAB47BC, 0x7E57C2,
    0x42A5F5, 0x26C6DA, 0xFFF176, 0xFF8F00, 0xF06292, 0xA5D6A7,
  ];
  const stemMat   = mat(0x66BB6A, 0.9);
  const centerMat = mat(0xFDD835, 0.82);

  for (let i = 0; i < 42; i++) {
    let x, z, t = 0;
    do { [x, z] = place(rng); t++; } while (!clear(x, z) && t < 30);
    if (!clear(x, z)) continue;

    const stemH  = 0.25 + rng() * 0.28;
    const pMat   = mat(petalCols[Math.floor(rng() * petalCols.length)], 0.85);
    const pCount = 5 + Math.floor(rng() * 3);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, stemH, 5), stemMat);
    stem.position.set(x, stemH * 0.5, z);
    scene.add(stem);

    const hy = stemH + 0.04;
    for (let p = 0; p < pCount; p++) {
      const a     = (p / pCount) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.062, 5, 4), pMat);
      petal.scale.set(0.65, 0.22, 1.4);
      petal.position.set(x + Math.cos(a) * 0.082, hy, z + Math.sin(a) * 0.082);
      petal.rotation.y = a;
      petal.castShadow = true;
      scene.add(petal);
    }

    const center = new THREE.Mesh(new THREE.SphereGeometry(0.058, 6, 5), centerMat);
    center.position.set(x, hy + 0.028, z);
    scene.add(center);
  }
}

// ── Monstera plants ───────────────────────────────────────────────────

function addMonsteras(scene, rng) {
  const stemMat  = mat(0x4E342E, 0.92);
  const leafCols = [0x1B5E20, 0x2E7D32, 0x33691E, 0x388E3C];

  for (let i = 0; i < 16; i++) {
    let x, z, t = 0;
    do { [x, z] = place(rng); t++; } while (!clear(x, z) && t < 30);
    if (!clear(x, z)) continue;

    const leafMat = mat(leafCols[Math.floor(rng() * leafCols.length)], 0.88);
    const sc      = 0.65 + rng() * 0.75;
    const group   = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rng() * Math.PI * 2;
    group.scale.setScalar(sc);

    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.2, 6), stemMat);
    stem.position.y = 0.6;
    stem.castShadow = true;
    group.add(stem);

    // Leaves — large flattened spheres radiating from stem top
    const lc = 3 + Math.floor(rng() * 3);
    for (let l = 0; l < lc; l++) {
      const a    = (l / lc) * Math.PI * 2 + rng() * 0.9;
      const dist = 0.38 + rng() * 0.3;
      const ht   = 0.7  + rng() * 0.55;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 5), leafMat);
      leaf.scale.set(0.44, 0.1, 1.0);
      leaf.position.set(Math.cos(a) * dist, ht, Math.sin(a) * dist);
      leaf.rotation.y = a;
      leaf.rotation.x = -(0.2 + rng() * 0.35);
      leaf.castShadow = true;
      group.add(leaf);
    }

    scene.add(group);
  }
}
