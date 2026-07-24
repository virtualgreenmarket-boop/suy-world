/**
 * autumnTrees.js
 * Red/orange autumn trees — procedural, low-poly, MeshLambertMaterial only.
 */

import * as THREE from 'three';

// ── Avenue layout ────────────────────────────────────────────────────────────
// West path (runs along -X, walkway spans Z in [-5, +5]).
// Trees at X -296..-256, both sides at Z = +/-12.
//
// NOTE: this stretch lies inside mapZones' "Marina" avoid-zone (centre -230, radius 140),
// so isValidGrassPosition() would reject it. That zone exists to keep RANDOM scatter
// (plants, animals) away from the marina — but these positions are chosen deliberately
// and sit on open grass beside the path, so we use a simple guard instead.
const AVENUE_SEGMENTS = [
  { from: -296, to: -256, step: 8 },
];
const SIDE_OFFSET = 12;

// Keeps trees off the walkway and out of the sea.
function _isPlantable(x, z) {
  if (Math.abs(z) < 8) return false;
  const r = Math.hypot(x, z);
  if (r > 340) return false;
  return true;
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
  _autumnGroup = new THREE.Group();
  let planted = 0;
  const rejected = [];
  let seed = 1001;

  AVENUE_SEGMENTS.forEach(seg => {
    for (let x = seg.from; x <= seg.to; x += seg.step) {
      [SIDE_OFFSET, -SIDE_OFFSET].forEach(z => {
        if (!_isPlantable(x, z)) { rejected.push(`(${x}, ${z})`); return; }
        const rng = seededRng(seed);
        const scale = 0.85 + rng() * 0.3;
        const tree = buildAutumnTree(seed, scale);
        tree.position.set(x, 0, z);
        tree.rotation.y = rng() * Math.PI * 2;
        _autumnGroup.add(tree);
        planted++;
        seed += 137;
      });
    }
  });

  scene.add(_autumnGroup);
  console.log(`[autumnTrees] Planted ${planted} red autumn trees along the west path`);
  if (rejected.length) console.log(`[autumnTrees] ${rejected.length} spots rejected:`, rejected.join(' '));
  if (planted === 0) console.warn('[autumnTrees] NO trees planted — check AVENUE_SEGMENTS.');
}

export function getAutumnTreeGroup() {
  return _autumnGroup;
}
