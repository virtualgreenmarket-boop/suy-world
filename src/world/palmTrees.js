// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Palm Trees
// Two coconut-palm variants for beach/shoreline ambience:
//   'tall'  — a tall, mostly-straight coconut palm
//   'curved'— a shorter palm with a characteristic curved lean
// Each has a segmented tapering trunk (with bark rings), a crown of drooping
// fronds built from a central rib + leaflets, and a few coconuts at the top.
// Fronds sway gently in the wind (per-frond phase, subtle trunk bend).
//
// USAGE (in main.js / world init, after the scene exists):
//   import { initPalmTrees, spawnPalm, updatePalmTrees } from './world/palmTrees.js';
//   initPalmTrees(scene);
//   spawnPalm('tall',   { x: -300, y: 0, z: 40 });
//   spawnPalm('curved', { x: -312, y: 0, z: 46, rotY: 1.2 });
//   // in your animation loop:
//   updatePalmTrees(delta);
//
// PERF: trunk + fronds are low-poly. castShadow defaults OFF (perf-safe);
// pass { castShadow:true } to spawnPalm for hero trees near the player.
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

let _scene = null;
const _palms = [];
let _clock = 0;

// ── Shared materials (created once) ──
let _mats = null;
function mats() {
  if (_mats) return _mats;
  _mats = {
    bark:      new THREE.MeshStandardMaterial({ color: 0x9c7a4d, roughness: 0.95, metalness: 0 }),
    barkDark:  new THREE.MeshStandardMaterial({ color: 0x7a5c34, roughness: 1.0,  metalness: 0 }),
    frond:     new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.7, metalness: 0, side: THREE.DoubleSide }),
    frondDark: new THREE.MeshStandardMaterial({ color: 0x2f6e2c, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    coconut:   new THREE.MeshStandardMaterial({ color: 0x5a3d22, roughness: 0.85, metalness: 0 }),
  };
  return _mats;
}

// ── Variant specs ──
const VARIANTS = {
  tall: {
    height: 16, segments: 10, baseR: 0.45, topR: 0.26,
    curve: 0.6, curveDir: 1,
    frondCount: 11, frondLen: 6.2, frondDroop: 0.9, coconuts: 5,
    swayAmp: 0.05, frondSway: 0.13,
  },
  curved: {
    height: 11, segments: 9, baseR: 0.5, topR: 0.28,
    curve: 2.6, curveDir: 1,
    frondCount: 10, frondLen: 5.2, frondDroop: 1.05, coconuts: 4,
    swayAmp: 0.07, frondSway: 0.16,
  },
};

// ── Trunk: chain of tapering cylinder segments following a curved spine ──
function buildTrunk(v) {
  const g = new THREE.Group();
  const m = mats();
  const segH = v.height / v.segments;
  for (let i = 0; i < v.segments; i++) {
    const t0 = i / v.segments, t1 = (i + 1) / v.segments;
    const r0 = v.baseR + (v.topR - v.baseR) * t0;
    const r1 = v.baseR + (v.topR - v.baseR) * t1;
    const off0 = Math.pow(t0, 1.7) * v.curve * v.curveDir;
    const off1 = Math.pow(t1, 1.7) * v.curve * v.curveDir;

    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, segH * 1.02, 10),
      i % 2 === 0 ? m.bark : m.barkDark
    );
    seg.position.set((off0 + off1) / 2, (i + 0.5) * segH, 0);
    seg.rotation.z = -Math.atan2(off1 - off0, segH);
    g.add(seg);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(r0 * 1.02, r0 * 0.14, 6, 12), m.barkDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(off0, i * segH, 0);
    ring.scale.y = 0.6;
    g.add(ring);
  }
  g.userData.crown = new THREE.Vector3(v.curve * v.curveDir, v.height, 0);
  return g;
}

// ── One frond: central rib (drooping) with leaflets down both sides ──
function buildFrond(v) {
  const m = mats();
  const g = new THREE.Group();
  const len = v.frondLen;
  const ribSegs = 8;
  const rib = new THREE.Group();

  const pts = [];
  for (let i = 0; i <= ribSegs; i++) {
    const t = i / ribSegs;
    pts.push(new THREE.Vector3(t * len, -Math.pow(t, 1.8) * v.frondDroop * len * 0.5, 0));
  }
  for (let i = 0; i < ribSegs; i++) {
    const a = pts[i], b = pts[i + 1];
    const dir = new THREE.Vector3().subVectors(b, a);
    const h = dir.length();
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 * (1 - i / ribSegs) + 0.015, 0.05 * (1 - i / ribSegs) + 0.02, h, 5),
      m.frondDark
    );
    seg.position.copy(a).addScaledVector(dir, 0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    rib.add(seg);

    const leafLen = (0.9 - 0.7 * (i / ribSegs)) * (len * 0.28);
    for (const side of [1, -1]) {
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(leafLen, 0.16, 1, 1), i % 2 ? m.frond : m.frondDark);
      const mid = a.clone().addScaledVector(dir, 0.5);
      blade.position.copy(mid);
      blade.rotation.y = side * (Math.PI / 2 - 0.5);
      blade.rotation.z = -0.5 - i * 0.04;
      blade.position.z += side * leafLen * 0.4;
      rib.add(blade);
    }
  }
  g.add(rib);
  return g;
}

// ── Crown: ring of fronds + coconuts ──
function buildCrown(v) {
  const g = new THREE.Group();
  const m = mats();
  g.userData.fronds = [];

  for (let i = 0; i < v.frondCount; i++) {
    const frond = buildFrond(v);
    frond.rotation.y = (i / v.frondCount) * Math.PI * 2;
    frond.rotation.z = 0.35 + Math.random() * 0.12;
    frond.userData.baseRotZ = frond.rotation.z;
    frond.userData.phase = Math.random() * Math.PI * 2;
    g.add(frond);
    g.userData.fronds.push(frond);
  }

  for (let i = 0; i < v.coconuts; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), m.coconut);
    const ang = Math.random() * Math.PI * 2, rr = 0.35 + Math.random() * 0.2;
    c.position.set(Math.cos(ang) * rr, -0.2 - Math.random() * 0.3, Math.sin(ang) * rr);
    c.scale.y = 1.15;
    g.add(c);
  }
  return g;
}

// ── Public API ──

export function initPalmTrees(scene) {
  _scene = scene;
  return _palms;
}

/**
 * Spawn a palm.
 * @param {'tall'|'curved'} variant
 * @param {{x:number,y:number,z:number,rotY?:number}} pos
 * @param {{scale?:number, castShadow?:boolean}} [opts]
 */
export function spawnPalm(variant, pos, opts = {}) {
  if (!_scene) { console.warn('[palmTrees] call initPalmTrees(scene) first'); return null; }
  const v = VARIANTS[variant] || VARIANTS.tall;
  const tree = new THREE.Group();
  const trunk = buildTrunk(v);
  tree.add(trunk);

  const crown = buildCrown(v);
  crown.position.copy(trunk.userData.crown);
  tree.add(crown);

  tree.position.set(pos.x, pos.y ?? 0, pos.z);
  tree.rotation.y = pos.rotY ?? Math.random() * Math.PI * 2;
  tree.scale.setScalar(opts.scale ?? 1);

  if (opts.castShadow) tree.traverse(o => { if (o.isMesh) o.castShadow = true; });

  tree.userData.spec = v;
  tree.userData.crown = crown;
  tree.userData.trunk = trunk;
  tree.userData.phase = Math.random() * Math.PI * 2;

  _scene.add(tree);
  _palms.push(tree);
  return tree;
}

/**
 * Line palms along BOTH sides of a straight path (e.g. plaza→marina walkway).
 * Places `perSide` palms on each side, `offset` metres out from the path centre,
 * `spacing` metres apart, alternating variants and jittering slightly so the row
 * looks natural rather than mechanical. Trees face outward-ish (random-ish rotY).
 *
 * @param {{x:number,z:number}} from  path start (centre line)
 * @param {{x:number,z:number}} to    path end   (centre line)
 * @param {Object} o
 *   perSide  - palms per side (default 10)
 *   offset   - distance from path centre to the row (default 3)
 *   spacing  - distance between consecutive palms (default 10)
 *   getY     - optional (x,z)=>groundHeight so trunks sit on the ground
 *   jitter   - random position wobble in metres (default 0.6, set 0 for a rigid row)
 *   castShadow - shadow on the palms (default false)
 */
export function spawnPalmAvenue(from, to, o = {}) {
  const perSide = o.perSide ?? 10;
  const offset  = o.offset ?? 3;
  const spacing = o.spacing ?? 10;
  const jitter  = o.jitter ?? 0.6;
  const getY    = typeof o.getY === 'function' ? o.getY : null;
  const castShadow = o.castShadow ?? false;

  // path direction (unit) and left-normal (unit)
  const dx = to.x - from.x, dz = to.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;      // along-path unit
  const nx = -uz, nz = ux;                 // left-hand normal (perpendicular)

  const trees = [];
  for (const side of [1, -1]) {            // +1 = left of path, -1 = right
    for (let i = 0; i < perSide; i++) {
      // walk along the path, centred so the row is balanced around the midpoint
      const along = (i - (perSide - 1) / 2) * spacing;
      const cx = (from.x + to.x) / 2 + ux * along;
      const cz = (from.z + to.z) / 2 + uz * along;
      // step out to the row, plus small natural jitter
      const jOff = (Math.random() - 0.5) * jitter;
      const jAlong = (Math.random() - 0.5) * jitter;
      const px = cx + nx * side * offset + nx * jOff + ux * jAlong;
      const pz = cz + nz * side * offset + nz * jOff + uz * jAlong;
      const py = getY ? getY(px, pz) : 0;

      // alternate variants down the row, offset the sides so they interlace
      const variant = ((i + (side === 1 ? 0 : 1)) % 2 === 0) ? 'tall' : 'curved';
      // face crown mostly outward from the path, with variation
      const outwardAng = Math.atan2(nz * side, nx * side);
      const rotY = outwardAng + (Math.random() - 0.5) * 0.9;
      // subtle size variation for realism
      const scale = 0.9 + Math.random() * 0.25;

      const t = spawnPalm(variant, { x: px, y: py, z: pz, rotY }, { scale, castShadow });
      if (t) trees.push(t);
    }
  }
  console.log(`[palmTrees] avenue: ${trees.length} palms (${perSide}/side) along the path`);
  return trees;
}

/** Call every frame from your animation loop for wind sway. */
export function updatePalmTrees(delta) {
  const dt = Math.min(delta, 0.05);
  _clock += dt;
  const time = _clock;

  for (const tree of _palms) {
    const v = tree.userData.spec;
    const ph = tree.userData.phase;
    const bend = Math.sin(time * 0.7 + ph) * v.swayAmp;
    tree.userData.trunk.rotation.z = bend * 0.4;
    tree.userData.crown.rotation.z = bend;

    const fronds = tree.userData.crown.userData.fronds;
    for (const f of fronds) {
      f.rotation.z = f.userData.baseRotZ + Math.sin(time * 1.6 + f.userData.phase) * v.frondSway;
    }
  }
}

/** Remove all palms (scene teardown). */
export function disposePalmTrees() {
  for (const t of _palms) {
    _scene?.remove(t);
    t.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
  }
  _palms.length = 0;
}