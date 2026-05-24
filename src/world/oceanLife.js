import * as THREE from 'three';

// Ocean life: schools of fish in the shallow zone + a distant whale
// that surfaces every 2-4 minutes with a water spout.

const SCHOOL_COUNT  = 7;
const FISH_PER_SCHOOL = 9;
const TOTAL_FISH    = SCHOOL_COUNT * FISH_PER_SCHOOL;

let _fishMesh   = null;
let _schools    = [];
const _dummy    = new THREE.Object3D();

let _whale      = null;
let _whaleTime  = 0;

// ── Public ────────────────────────────────────────────────────────────

export function initOceanLife(scene) {
  initFish(scene);
  initWhale(scene);
}

export function updateOceanLife(delta, time) {
  updateFish(delta, time);
  updateWhale(delta, time);
}

// ─────────────────────────────────────────────────────────────────────
// FISH SCHOOLS
// ─────────────────────────────────────────────────────────────────────

function initFish(scene) {
  // Fish body: diamond-shaped cone (simple, reads well underwater)
  const fishGeo = new THREE.ConeGeometry(0.18, 0.72, 4);
  fishGeo.rotateX(Math.PI / 2); // nose forward

  const fishMat = new THREE.MeshStandardMaterial({
    color:     0x70B8D8,
    roughness: 0.25,
    metalness: 0.55,
    transparent: true,
    opacity:   0.85,
  });

  _fishMesh = new THREE.InstancedMesh(fishGeo, fishMat, TOTAL_FISH);
  _fishMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  _fishMesh.castShadow = false;
  scene.add(_fishMesh);

  const rng = seededRng(11);
  for (let s = 0; s < SCHOOL_COUNT; s++) {
    const angle  = (s / SCHOOL_COUNT) * Math.PI * 2 + rng() * 0.6;
    const radius = 255 + rng() * 55;   // shallow water zone (238-310)
    const depth  = -(4.5 + rng() * 3); // y=-4.5 to y=-7.5 (below water surface)
    const fish   = [];
    for (let f = 0; f < FISH_PER_SCHOOL; f++) {
      fish.push({
        ox: (rng() - 0.5) * 3.5,    // x offset from school centre
        oy: (rng() - 0.5) * 1.2,    // y offset
        oz: (rng() - 0.5) * 3.5,    // z offset
        freq:  0.8 + rng() * 0.8,   // individual wriggle frequency
        phase: rng() * Math.PI * 2,
      });
    }
    _schools.push({
      angle,
      radius,
      depth,
      speed:  (0.30 + rng() * 0.35) * (rng() < 0.5 ? 1 : -1),
      tilt:   (rng() - 0.5) * 0.12,
      fish,
    });
  }
}

function updateFish(delta, time) {
  if (!_fishMesh) return;

  for (let s = 0; s < _schools.length; s++) {
    const sc = _schools[s];
    sc.angle += sc.speed * delta;

    const cx = Math.cos(sc.angle) * sc.radius;
    const cz = Math.sin(sc.angle) * sc.radius;
    const cy = sc.depth + Math.sin(time * 0.4 + s) * 0.6; // gentle vertical drift

    // School faces tangent to its circular path
    const headingY = sc.angle + (sc.speed > 0 ? Math.PI / 2 : -Math.PI / 2);

    for (let f = 0; f < FISH_PER_SCHOOL; f++) {
      const fi = sc.fish[f];

      // Jitter offsets rotated into school's heading frame
      const cos = Math.cos(headingY), sin = Math.sin(headingY);
      const jx  = fi.ox * cos - fi.oz * sin;
      const jz  = fi.ox * sin + fi.oz * cos;
      const jy  = fi.oy + Math.sin(time * fi.freq + fi.phase) * 0.25;

      _dummy.position.set(cx + jx, cy + jy, cz + jz);
      _dummy.rotation.y = headingY + Math.sin(time * fi.freq * 2 + fi.phase) * 0.08;
      _dummy.rotation.z = sc.tilt;
      _dummy.updateMatrix();
      _fishMesh.setMatrixAt(s * FISH_PER_SCHOOL + f, _dummy.matrix);
    }
  }
  _fishMesh.instanceMatrix.needsUpdate = true;
}

// ─────────────────────────────────────────────────────────────────────
// WHALE
// ─────────────────────────────────────────────────────────────────────

const WHALE_RADIUS      = 420;
const WHALE_SURFACE_Y   = -0.5;
const WHALE_DEEP_Y      = -22;
const SURFACE_INTERVAL  = 150; // seconds between surfaces (base)

function initWhale(scene) {
  const group = new THREE.Group();

  // Body
  const bodyMat = new THREE.MeshStandardMaterial({
    color:     0x2A4A6A,
    roughness: 0.55,
    metalness: 0.08,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color:     0x7A9AB0,
    roughness: 0.60,
    metalness: 0.05,
  });

  // Main body capsule (very elongated)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 18, 6, 10), bodyMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  // Belly (lighter ventral surface)
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(2.8, 14, 6, 10), bellyMat);
  belly.rotation.x = Math.PI / 2;
  belly.position.set(0, -1.8, 0);
  belly.scale.set(0.9, 0.5, 0.9);
  group.add(belly);

  // Tail stock (narrowing cylinder)
  const tailStock = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.0, 6, 8), bodyMat);
  tailStock.rotation.x = Math.PI / 2;
  tailStock.position.z = -12;
  group.add(tailStock);

  // Tail flukes (2 flat lobes)
  [-1, 1].forEach(side => {
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.35, 3.0), bodyMat);
    fluke.position.set(side * 3.2, 0, -16.5);
    fluke.rotation.y = side * 0.22;
    fluke.scale.set(1, 1, 1);
    group.add(fluke);
  });

  // Pectoral fins
  [-1, 1].forEach(side => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.5, 0.3), bodyMat);
    fin.position.set(side * 4.0, -1.0, 2);
    fin.rotation.z = side * 0.5;
    group.add(fin);
  });

  // Dorsal fin
  const dorsalGeo = new THREE.ConeGeometry(0.6, 2.8, 5);
  const dorsal = new THREE.Mesh(dorsalGeo, bodyMat);
  dorsal.position.set(0, 3.2, -2);
  dorsal.rotation.z = 0.3;
  group.add(dorsal);

  // Blowhole area bump
  const blowhole = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), bodyMat);
  blowhole.position.set(0, 3.0, 10);
  group.add(blowhole);

  // Spout (animated when surfacing)
  const spoutGeo = new THREE.CylinderGeometry(0.4, 1.2, 12, 7);
  const spoutMat = new THREE.MeshStandardMaterial({
    color:       0xCCEEFF,
    transparent: true,
    opacity:     0,
    depthWrite:  false,
    emissive:    0xAADDFF,
    emissiveIntensity: 0.4,
  });
  const spout = new THREE.Mesh(spoutGeo, spoutMat);
  spout.position.set(0, 9.5, 10);
  group.add(spout);

  // Start far away, deep underwater
  group.position.set(WHALE_RADIUS, WHALE_DEEP_Y, 0);

  scene.add(group);

  _whale = {
    group,
    spout,
    spoutMat,
    tailFlukes: group.children.filter((c, i) => i >= 4 && i <= 5),
    orbitAngle:  0,
    state:       'deep',
    timer:       SURFACE_INTERVAL * (0.5 + Math.random() * 0.5),
    stateTime:   0,
  };
}

function updateWhale(delta, time) {
  if (!_whale) return;
  const w = _whale;
  w.stateTime += delta;

  switch (w.state) {
    case 'deep': {
      // Slow orbit, deep underwater
      w.orbitAngle += 0.018 * delta;
      w.group.position.x = Math.cos(w.orbitAngle) * WHALE_RADIUS;
      w.group.position.z = Math.sin(w.orbitAngle) * WHALE_RADIUS;
      w.group.position.y = WHALE_DEEP_Y + Math.sin(w.stateTime * 0.15) * 1.5;
      w.group.rotation.y = w.orbitAngle + Math.PI / 2;
      w.group.rotation.x = 0;

      w.timer -= delta;
      if (w.timer <= 0) _transitionWhale(w, 'ascending');
      break;
    }
    case 'ascending': {
      const t = Math.min(w.stateTime / 14, 1);
      w.group.position.y = THREE.MathUtils.lerp(WHALE_DEEP_Y, WHALE_SURFACE_Y, easeInOut(t));
      w.group.rotation.x = -0.18 * Math.sin(t * Math.PI); // nose up
      w.orbitAngle += 0.012 * delta;
      w.group.position.x = Math.cos(w.orbitAngle) * WHALE_RADIUS;
      w.group.position.z = Math.sin(w.orbitAngle) * WHALE_RADIUS;
      w.group.rotation.y = w.orbitAngle + Math.PI / 2;
      if (t >= 1) _transitionWhale(w, 'spouting');
      break;
    }
    case 'spouting': {
      // Gentle rocking at surface
      w.group.position.y = WHALE_SURFACE_Y + Math.sin(w.stateTime * 1.4) * 0.4;
      w.group.rotation.x = Math.sin(w.stateTime * 0.7) * 0.05;

      // Animate spout
      const st = w.stateTime;
      if (st < 2.0) {
        // Grow
        w.spout.scale.y   = easeInOut(st / 2.0);
        w.spoutMat.opacity = 0.72 * Math.min(st / 0.6, 1);
      } else if (st < 3.5) {
        // Hold with slight sway
        w.spout.scale.y   = 1.0 + Math.sin(st * 4) * 0.08;
        w.spoutMat.opacity = 0.72;
      } else {
        // Fade out
        const fade = 1 - (st - 3.5) / 1.2;
        w.spout.scale.y   = Math.max(0, fade);
        w.spoutMat.opacity = Math.max(0, 0.72 * fade);
      }

      if (w.stateTime > 5.5) _transitionWhale(w, 'diving');
      break;
    }
    case 'diving': {
      const t = Math.min(w.stateTime / 12, 1);
      w.group.position.y = THREE.MathUtils.lerp(WHALE_SURFACE_Y, WHALE_DEEP_Y, easeInOut(t));
      // Nose tips down, tail fluke rises briefly
      w.group.rotation.x = 0.32 * Math.sin(t * Math.PI);
      w.orbitAngle += 0.014 * delta;
      w.group.position.x = Math.cos(w.orbitAngle) * WHALE_RADIUS;
      w.group.position.z = Math.sin(w.orbitAngle) * WHALE_RADIUS;
      w.group.rotation.y = w.orbitAngle + Math.PI / 2;

      w.spoutMat.opacity = 0; // ensure spout gone
      if (t >= 1) _transitionWhale(w, 'deep');
      break;
    }
  }
}

function _transitionWhale(w, newState) {
  w.state     = newState;
  w.stateTime = 0;
  if (newState === 'deep') {
    w.timer = SURFACE_INTERVAL * (0.7 + Math.random() * 0.8);
    w.spout.scale.y   = 0;
    w.spoutMat.opacity = 0;
  }
}

// ── Utilities ─────────────────────────────────────────────────────────

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
