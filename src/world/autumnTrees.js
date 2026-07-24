/**
 * autumnTrees.js
 * Red/orange autumn trees — procedural, low-poly, MeshLambertMaterial only.
 */

import * as THREE from 'three';

// ── Plaza corner trees ───────────────────────────────────────────────────────
// STEP 1: 4 red/autumn trees at plaza corners (82×82m square centered at -50, 0)
// Each positioned 3m diagonally outward from the corner.
// Plaza corners: NW(-91,-41), NE(-9,-41), SW(-91,+41), SE(-9,+41)
// Diagonal outward = direction from center(-50,0) to corner, normalized, × 3m
const PLAZA_CORNER_TREES = [
  { x: -93.12, z: -43.12, desc: 'NW corner' }, // (-91,-41) + (-0.707,-0.707)*3 = (-93.12,-43.12)
  { x: -6.88,  z: -43.12, desc: 'NE corner' }, // (-9,-41)  + (+0.707,-0.707)*3 = (-6.88,-43.12)
  { x: -93.12, z: +43.12, desc: 'SW corner' }, // (-91,+41) + (-0.707,+0.707)*3 = (-93.12,+43.12)
  { x: -6.88,  z: +43.12, desc: 'SE corner' }, // (-9,+41)  + (+0.707,+0.707)*3 = (-6.88,+43.12)
];

// STEP 1: Simple guard for corner trees (always plantable)
function _isPlantable(x, z) {
  return true; // Corner positions are pre-validated
}

// ── Look ─────────────────────────────────────────────────────────────────────
const LEAVES_PER_TREE = 700;
const AUTUMN_PALETTE = [
  0x6d1414, 0x831c18, 0x9b2820, 0xae3324, 0xc04329,
  0xcf5a24, 0xb8481f, 0x8f2a1c, 0xd97327, 0x74180f,
];

let _autumnGroup = null;

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

let _barkMat = null;
let _leafGeom = null;
const _leafMats = new Map();

function _getBarkMaterial() {
  if (_barkMat) return _barkMat;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#5e4632';
  x.fillRect(0, 0, 64, 256);
  const rng = seededRng(4242);
  for (let i = 0; i < 130; i++) {
    const y = rng() * 256, h = 6 + rng() * 30, w = 1 + rng() * 4, xx = rng() * 64;
    x.fillStyle = rng() < 0.5 ? 'rgba(40,28,18,0.55)' : 'rgba(122,96,70,0.35)';
    x.fillRect(xx, y, w, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _barkMat = new THREE.MeshLambertMaterial({ map: tex });
  return _barkMat;
}

function _getLeafGeometry() {
  if (_leafGeom) return _leafGeom;
  const s = new THREE.Shape();
  s.moveTo(0, -0.28);
  s.lineTo(0.06, -0.08);  s.lineTo(0.24, -0.13);
  s.lineTo(0.15, 0.05);   s.lineTo(0.30, 0.12);
  s.lineTo(0.12, 0.18);   s.lineTo(0.16, 0.34);
  s.lineTo(0, 0.26);
  s.lineTo(-0.16, 0.34);  s.lineTo(-0.12, 0.18);
  s.lineTo(-0.30, 0.12);  s.lineTo(-0.15, 0.05);
  s.lineTo(-0.24, -0.13); s.lineTo(-0.06, -0.08);
  s.closePath();
  _leafGeom = new THREE.ShapeGeometry(s);
  _leafGeom.scale(1.6, 1.6, 1.6);
  return _leafGeom;
}

function _getLeafMaterial(color) {
  if (!_leafMats.has(color)) {
    _leafMats.set(color, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  }
  return _leafMats.get(color);
}

export function buildAutumnTree(seed = 1, scale = 1) {
  const tree = new THREE.Group();
  const rng = seededRng(seed);
  const barkMat = _getBarkMaterial();
  const tips = [];

  function limb(from, dir, len, rad, depth) {
    const to = from.clone().add(dir.clone().multiplyScalar(len));
    const geo = new THREE.CylinderGeometry(rad * 0.66, rad, len, 7, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = 1 + (Math.sin(i * 7.3 + seed) * 0.5) * 0.12;
      p.setX(i, p.getX(i) * f);
      p.setZ(i, p.getZ(i) * f);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();

    const m = new THREE.Mesh(geo, barkMat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.copy(from.clone().add(to).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    tree.add(m);

    if (depth <= 0 || rad < 0.075) { tips.push(to.clone()); return; }

    const n = depth > 2 ? 2 : (rng() < 0.5 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      const nd = dir.clone();
      const ax = new THREE.Vector3(rng() - 0.5, rng() * 0.22, rng() - 0.5).normalize();
      nd.applyAxisAngle(ax, 0.38 + rng() * 0.48);
      nd.y = Math.max(nd.y, 0.16);
      nd.normalize();
      limb(to, nd, len * (0.68 + rng() * 0.12), rad * (0.62 + rng() * 0.1), depth - 1);
    }
  }

  limb(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 1, 0.02), 6.2, 1.05, 4);

  const leafGeom = _getLeafGeometry();
  const perTip = Math.max(1, Math.floor(LEAVES_PER_TREE / Math.max(tips.length, 1)));
  const dummy = new THREE.Object3D();
  const byColor = new Map();

  tips.forEach(tip => {
    for (let i = 0; i < perTip; i++) {
      const color = AUTUMN_PALETTE[Math.floor(rng() * AUTUMN_PALETTE.length)];
      if (!byColor.has(color)) byColor.set(color, []);
      const spread = 1.4 + rng() * 1.1;
      dummy.position.copy(tip).add(new THREE.Vector3(
        (rng() - 0.5) * spread * 2,
        (rng() - 0.5) * spread * 1.4,
        (rng() - 0.5) * spread * 2
      ));
      dummy.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
      const sc = 0.8 + rng() * 0.6;
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      byColor.get(color).push(dummy.matrix.clone());
    }
  });

  byColor.forEach((mats, color) => {
    const inst = new THREE.InstancedMesh(leafGeom, _getLeafMaterial(color), mats.length);
    inst.castShadow = true;
    mats.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    tree.add(inst);
  });

  tree.scale.setScalar(scale);
  return tree;
}

export function initAutumnTrees(scene) {
  try {
    _autumnGroup = new THREE.Group();
    let planted = 0;
    let seed = 1001;

    // STEP 1: Plant exactly 4 trees at plaza corners, 3m diagonally outward
    PLAZA_CORNER_TREES.forEach(corner => {
      const rng = seededRng(seed);
      const scale = 0.85 + rng() * 0.3;
      const tree = buildAutumnTree(seed, scale);
      tree.position.set(corner.x, 0, corner.z);
      tree.rotation.y = rng() * Math.PI * 2;
      _autumnGroup.add(tree);
      planted++;
      seed += 137;
    });

    scene.add(_autumnGroup);
    console.log(`[autumnTrees] Planted ${planted} red autumn trees at plaza corners`);
    if (planted !== 4) console.warn(`[autumnTrees] Expected 4 trees, got ${planted}`);
  } catch (err) {
    console.error('[autumnTrees] Init error:', err);
  }
}

export function getAutumnTreeGroup() {
  return _autumnGroup;
}
