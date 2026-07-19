// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Ocean Fish
// Decorative fish that swim throughout the sea for ambience.
//
// 10 species (tuna, shark, dolphin + 7 reef fish), each procedurally built
// with a unique body silhouette, counter-shaded coloring, fins, eyes, and a
// spine-undulation swim animation (body wave that grows toward the tail,
// tail-fin sweep, pectoral flutter).
//
// USAGE (in main.js or your world init, after the scene exists):
//   import { initOceanFish, updateOceanFish } from './world/oceanFish.js';
//   initOceanFish(scene, { count: 60, area: { x:-380, z:0, radius:120 }, waterY: 0 });
//   // then in your animation loop:
//   updateOceanFish(delta);
//
// PERF: bodies are individual (they deform each frame for the swim), but
// they're low-poly (~16 radial segs) and you control the total via `count`.
// castShadow is OFF by default to keep draw cost low — turn on per-taste.
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

let _scene = null;
const _fishes = [];
let _clock = 0;

// ── Species specs ──
// profile: array of [t(0=nose→1=tail), halfHeight, halfWidth]
const SPECIES = [
  { name:'tuna',   kind:'big',   weight:1, top:0x2b4a6b, belly:0xd8e6ef, fin:0xf4c542, len:6.4,
    profile:[[0,0.05,0.05],[0.12,0.55,0.4],[0.3,0.95,0.62],[0.5,0.9,0.6],[0.72,0.5,0.34],[0.88,0.28,0.18],[1,0.06,0.05]],
    tail:[[0,0],[1.5,1.9],[1.1,0],[1.5,-1.9]], dorsal:[[0,0],[0.5,1.1],[1.4,0.2],[0.7,-0.1]], dorsalZ:0.4, dorsalH:0.85,
    pectoral:[[0,0],[1.0,0.5],[1.3,-0.2]], pecX:0.55, eyeX:0.5, eyeY:0.28, eyeBack:0.7, finOpacity:1,
    speed:1.2, tailAmp:0.5, bodyWave:0.35 },

  { name:'shark',  kind:'big',   weight:0.6, top:0x6b7683, belly:0xe4e8ec, fin:0x8b95a1, len:7.6,
    profile:[[0,0.06,0.06],[0.14,0.5,0.42],[0.32,0.78,0.6],[0.52,0.72,0.55],[0.72,0.44,0.32],[0.9,0.2,0.14],[1,0.05,0.04]],
    tail:[[0,-0.4],[1.2,2.4],[1.0,0.2],[1.4,-1.2]], dorsal:[[0,0],[0.4,1.5],[1.3,0.1]], dorsalZ:0.2, dorsalH:0.75,
    pectoral:[[0,0],[1.6,0.3],[1.5,-0.6]], pecX:0.55, eyeX:0.46, eyeY:0.22, eyeBack:0.6, finOpacity:1,
    speed:0.85, tailAmp:0.42, bodyWave:0.5 },

  { name:'dolphin',kind:'big',   weight:0.6, top:0x4a6b82, belly:0xeef4f7, fin:0x5f7d92, len:7.0,
    profile:[[0,0.15,0.14],[0.1,0.5,0.45],[0.3,0.72,0.6],[0.5,0.66,0.54],[0.72,0.42,0.32],[0.9,0.22,0.16],[1,0.05,0.05]],
    tail:[[0,0],[1.7,1.4],[1.2,0],[1.7,-1.4]], dorsal:[[0,0],[0.35,1.3],[1.5,0.2]], dorsalZ:0.1, dorsalH:0.68,
    pectoral:[[0,0],[1.5,0.4],[1.4,-0.5]], pecX:0.5, eyeX:0.42, eyeY:0.15, eyeBack:0.9, finOpacity:1,
    speed:1.0, tailAmp:0.55, bodyWave:0.4, vertical:true },

  { name:'clownfish', kind:'small', weight:2, top:0xff7518, belly:0xffb066, fin:0xffffff, len:1.7,
    profile:[[0,0.1,0.08],[0.18,0.6,0.32],[0.42,0.78,0.4],[0.6,0.62,0.34],[0.8,0.34,0.2],[1,0.08,0.06]],
    tail:[[0,0],[0.9,1.0],[0.7,0],[0.9,-1.0]], dorsal:[[0,0],[0.3,0.7],[0.9,0.1]], dorsalZ:0.1, dorsalH:0.6,
    pectoral:[[0,0],[0.6,0.35],[0.7,-0.15]], pecX:0.32, eyeX:0.28, eyeY:0.2, eyeBack:0.32,
    stripes:[0.35,0,-0.4], stripeColor:0xffffff, speed:1.6, tailAmp:0.6, bodyWave:0.5 },

  { name:'blueTang', kind:'small', weight:2, top:0x1565c0, belly:0x5b9bd5, fin:0xffd400, len:2.0,
    profile:[[0,0.1,0.07],[0.16,0.66,0.28],[0.4,0.92,0.36],[0.6,0.72,0.3],[0.82,0.36,0.16],[1,0.07,0.05]],
    tail:[[0,0],[1.0,1.1],[0.8,0],[1.0,-1.1]], dorsal:[[0,0],[0.3,0.9],[1.3,0.1]], dorsalZ:0, dorsalH:0.7,
    pectoral:[[0,0],[0.6,0.3],[0.7,-0.15]], pecX:0.3, eyeX:0.26, eyeY:0.24, eyeBack:0.3,
    speed:1.5, tailAmp:0.55, bodyWave:0.5 },

  { name:'yellowTang', kind:'small', weight:2, top:0xf6c700, belly:0xffe066, fin:0xf0b000, len:1.9,
    profile:[[0,0.1,0.07],[0.16,0.68,0.26],[0.4,0.9,0.34],[0.6,0.7,0.28],[0.82,0.34,0.15],[1,0.06,0.05]],
    tail:[[0,0],[0.95,1.1],[0.75,0],[0.95,-1.1]], dorsal:[[0,0],[0.3,1.0],[1.4,0.1]], dorsalZ:0, dorsalH:0.72,
    pectoral:[[0,0],[0.55,0.3],[0.65,-0.15]], pecX:0.28, eyeX:0.24, eyeY:0.24, eyeBack:0.28,
    speed:1.5, tailAmp:0.55, bodyWave:0.5 },

  { name:'parrotfish', kind:'small', weight:1.5, top:0x18a08a, belly:0xf25c9a, fin:0x8be0c8, len:2.6,
    profile:[[0,0.14,0.12],[0.16,0.58,0.4],[0.4,0.78,0.5],[0.6,0.66,0.42],[0.82,0.38,0.22],[1,0.08,0.06]],
    tail:[[0,0],[1.0,1.2],[0.8,0],[1.0,-1.2]], dorsal:[[0,0],[0.3,0.6],[1.6,0.1]], dorsalZ:0, dorsalH:0.62,
    pectoral:[[0,0],[0.7,0.35],[0.8,-0.2]], pecX:0.4, eyeX:0.34, eyeY:0.2, eyeBack:0.4,
    speed:1.2, tailAmp:0.5, bodyWave:0.45 },

  { name:'mandarin', kind:'small', weight:1.5, top:0x1b6ca8, belly:0xff8a3d, fin:0x35d0c0, len:1.5,
    profile:[[0,0.1,0.09],[0.18,0.5,0.32],[0.42,0.62,0.4],[0.62,0.52,0.32],[0.82,0.3,0.18],[1,0.07,0.06]],
    tail:[[0,0],[0.8,0.9],[0.6,0],[0.8,-0.9]], dorsal:[[0,0],[0.25,0.6],[0.8,0.1]], dorsalZ:0, dorsalH:0.5,
    pectoral:[[0,0],[0.55,0.35],[0.65,-0.15]], pecX:0.32, eyeX:0.28, eyeY:0.18, eyeBack:0.3,
    stripes:[0.2,-0.2], stripeColor:0xffc93c, speed:1.3, tailAmp:0.6, bodyWave:0.5 },

  { name:'neonTetra', kind:'small', weight:3, top:0x2fd0e6, belly:0xff3355, fin:0xbdf6ff, len:1.1,
    profile:[[0,0.08,0.06],[0.2,0.4,0.2],[0.45,0.5,0.24],[0.65,0.4,0.2],[0.84,0.24,0.12],[1,0.05,0.04]],
    tail:[[0,0],[0.7,0.8],[0.5,0],[0.7,-0.8]], dorsal:[[0,0],[0.2,0.4],[0.6,0.05]], dorsalZ:0, dorsalH:0.42,
    pectoral:[[0,0],[0.4,0.25],[0.5,-0.1]], pecX:0.22, eyeX:0.18, eyeY:0.16, eyeBack:0.22,
    stripes:[0.1], stripeColor:0x2fd0e6, speed:2.0, tailAmp:0.65, bodyWave:0.55 },

  { name:'angelfish', kind:'small', weight:1.5, top:0xf0e6d2, belly:0xd9b26a, fin:0x2b2b2b, len:2.2,
    profile:[[0,0.1,0.06],[0.16,0.72,0.2],[0.4,1.0,0.26],[0.6,0.78,0.22],[0.82,0.4,0.12],[1,0.06,0.04]],
    tail:[[0,0],[1.1,1.3],[0.9,0],[1.1,-1.3]], dorsal:[[0,0],[0.3,1.6],[1.0,0.1]], dorsalZ:0.1, dorsalH:0.9,
    pectoral:[[0,0],[0.5,0.5],[0.6,-0.2]], pecX:0.22, eyeX:0.2, eyeY:0.28, eyeBack:0.26,
    stripes:[0.4,0,-0.35], stripeColor:0x2b2b2b, speed:1.1, tailAmp:0.5, bodyWave:0.45 },
];

// ── Geometry builders ──

function buildBody(profile, len, mat) {
  const segs = profile.length, radial = 16;
  const geo = new THREE.CylinderGeometry(1, 1, 1, radial, segs - 1, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const yy = pos.getY(i), t = yy + 0.5, f = t * (segs - 1);
    const i0 = Math.min(segs - 1, Math.floor(f)), i1 = Math.min(segs - 1, i0 + 1), fr = f - i0;
    const ry = profile[i0][1] + (profile[i1][1] - profile[i0][1]) * fr;
    const rz = profile[i0][2] + (profile[i1][2] - profile[i0][2]) * fr;
    const ang = Math.atan2(pos.getZ(i), pos.getX(i));
    pos.setX(i, Math.cos(ang) * rz);
    pos.setZ(i, Math.sin(ang) * ry);
    pos.setY(i, (t - 0.5) * len);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI / 2; // nose points +Z
  return m;
}

const bodyMat = (top, bot) => new THREE.MeshStandardMaterial({
  color: top, roughness: 0.42, metalness: 0.15,
  emissive: new THREE.Color(bot).multiplyScalar(0.05)
});
const finMat = (c, o = 0.85) => new THREE.MeshStandardMaterial({
  color: c, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide,
  transparent: o < 1, opacity: o
});

function buildFin(points, mat) {
  const sh = new THREE.Shape();
  sh.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) sh.lineTo(points[i][0], points[i][1]);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
  g.center();
  return new THREE.Mesh(g, mat);
}

function eyeball() {
  const g = new THREE.Group();
  const w = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.3 }));
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1 }));
  p.position.z = 0.09;
  g.add(w, p);
  return g;
}

function makeFish(spec, scale) {
  const g = new THREE.Group();
  const body = buildBody(spec.profile, spec.len, bodyMat(spec.top, spec.belly));
  g.add(body);
  const fm = finMat(spec.fin, spec.finOpacity ?? 0.85);

  const tail = new THREE.Group();
  const tf = buildFin(spec.tail, fm);
  tf.rotation.y = Math.PI / 2;
  tail.add(tf);
  tail.position.z = -spec.len * 0.5;
  g.add(tail);
  g.userData.tail = tail;

  if (spec.dorsal) {
    const d = buildFin(spec.dorsal, fm);
    d.position.set(0, spec.dorsalH ?? spec.profile[3][1], spec.dorsalZ ?? 0);
    g.add(d);
  }
  if (spec.pectoral) {
    for (const side of [1, -1]) {
      const pec = buildFin(spec.pectoral, fm);
      pec.rotation.y = Math.PI / 2;
      pec.rotation.z = side * 0.3;
      pec.position.set(side * spec.pecX, -0.1, spec.pecZ ?? spec.len * 0.12);
      g.add(pec);
      (g.userData.pecs = g.userData.pecs || []).push({ mesh: pec, side });
    }
  }
  for (const side of [1, -1]) {
    const e = eyeball();
    e.position.set(side * spec.eyeX, spec.eyeY, spec.len * 0.5 - spec.eyeBack);
    g.add(e);
  }
  if (spec.stripes) {
    for (const sz of spec.stripes) {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(spec.profile[3][1] * 0.9, 0.06, 8, 20),
        new THREE.MeshStandardMaterial({ color: spec.stripeColor, roughness: 0.5 }));
      r.rotation.y = Math.PI / 2;
      r.position.z = sz;
      r.scale.set(1, 0.8, 1);
      g.add(r);
    }
  }

  g.scale.setScalar(scale);
  g.userData.body = body;
  g.userData.spec = spec;
  const bp = body.geometry.attributes.position;
  const orig = new Float32Array(bp.count * 3);
  for (let i = 0; i < bp.count; i++) {
    orig[i * 3] = bp.getX(i); orig[i * 3 + 1] = bp.getY(i); orig[i * 3 + 2] = bp.getZ(i);
  }
  g.userData.orig = orig;
  return g;
}

// weighted random species pick (small fish more common)
function pickSpecies() {
  const total = SPECIES.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SPECIES) { r -= s.weight; if (r <= 0) return s; }
  return SPECIES[0];
}

// ── Public API ──

/**
 * Scatter decorative fish across the sea.
 * @param {THREE.Scene} scene
 * @param {Object} opts
 *   count   - how many fish total (default 60)
 *   area    - { x, z, radius } sea region center + radius (default around marina)
 *   waterY  - water surface Y (fish swim below it) (default 0)
 *   depth   - how far below the surface fish roam (default 10)
 *   scaleBig / scaleSmall - size multipliers (default 0.6 / 0.7)
 *   castShadow - fish cast shadows (default false, for perf)
 */
export function initOceanFish(scene, opts = {}) {
  _scene = scene;
  const count   = opts.count ?? 60;
  const area    = opts.area ?? { x: -380, z: 0, radius: 120 };
  const waterY  = opts.waterY ?? 0;
  const depth   = opts.depth ?? 10;
  const scaleBig   = opts.scaleBig ?? 0.6;
  const scaleSmall = opts.scaleSmall ?? 0.7;
  const castShadow = opts.castShadow ?? false;

  for (let i = 0; i < count; i++) {
    const spec = pickSpecies();
    const scale = spec.kind === 'big' ? scaleBig : scaleSmall;
    const f = makeFish(spec, scale);

    // each fish swims a gentle circle at its own radius/center/depth
    const localR = 6 + Math.random() * (spec.kind === 'big' ? 40 : 20);
    const ang0 = Math.random() * Math.PI * 2;
    const cx = area.x + (Math.random() - 0.5) * area.radius * 1.4;
    const cz = area.z + (Math.random() - 0.5) * area.radius * 1.4;
    const cy = waterY - 2 - Math.random() * depth;

    f.userData.orbit = { cx, cy, cz, r: localR, dir: Math.random() < 0.5 ? 1 : -1 };
    f.userData.t = ang0;
    f.userData.phase = Math.random() * Math.PI * 2;
    if (castShadow) f.traverse(o => { if (o.isMesh) o.castShadow = true; });

    f.position.set(cx + Math.cos(ang0) * localR, cy, cz + Math.sin(ang0) * localR);
    scene.add(f);
    _fishes.push(f);
  }

  console.log(`[oceanFish] spawned ${_fishes.length} fish across the sea`);
  return _fishes;
}

/** Call every frame from your animation loop. */
export function updateOceanFish(delta) {
  const dt = Math.min(delta, 0.05);
  _clock += dt;
  const time = _clock;
  const _v = new THREE.Vector3();

  for (const f of _fishes) {
    const s = f.userData.spec, o = f.userData.orbit;
    f.userData.t += dt * s.speed * 0.25 * o.dir;
    const t = f.userData.t;

    const nx = o.cx + Math.cos(t) * o.r;
    const nz = o.cz + Math.sin(t) * o.r;
    const bob = Math.sin(time * 0.6 + f.userData.phase) * (s.vertical ? 1.4 : 0.7);
    const ny = o.cy + bob;

    const px = f.position.x, py = f.position.y, pz = f.position.z;
    f.position.set(nx, ny, nz);
    _v.set(nx - px, ny - py, nz - pz);
    if (_v.lengthSq() > 1e-6) f.lookAt(nx + _v.x, ny + _v.y, nz + _v.z);

    // spine undulation — wave grows toward the tail
    const bp = f.userData.body.geometry.attributes.position, orig = f.userData.orig;
    for (let i = 0; i < bp.count; i++) {
      const oy = orig[i * 3 + 1], ox = orig[i * 3];
      const along = (oy / s.len) + 0.5;
      const swing = Math.sin(time * s.speed * 3 - along * Math.PI * 2 * s.bodyWave)
                    * s.tailAmp * Math.pow(along, 1.6);
      bp.setX(i, ox + swing);
    }
    bp.needsUpdate = true;

    if (f.userData.tail) f.userData.tail.rotation.y = Math.sin(time * s.speed * 3 - Math.PI * 0.6) * 0.6;
    if (f.userData.pecs)
      for (const pc of f.userData.pecs)
        pc.mesh.rotation.z = pc.side * 0.3 + Math.sin(time * s.speed * 5 + pc.side) * 0.25;
  }
}

/** Remove all fish (e.g. on scene teardown). */
export function disposeOceanFish() {
  for (const f of _fishes) {
    _scene?.remove(f);
    f.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose?.(); } });
  }
  _fishes.length = 0;
}
