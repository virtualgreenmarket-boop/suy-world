import * as THREE from 'three';

// Beach life: decorative shells/starfish + animated crabs
// All positioned on the sandy ring at radius 220-238, y=0.

const BEACH_INNER = 222;
const BEACH_OUTER = 236;
const CRAB_RADIUS = 228;
const CRAB_SPEED  = 0.28; // radians/sec

const crabs = [];

// ── Public ────────────────────────────────────────────────────────────

export function initBeach(scene) {
  addShells(scene);
  addStarfish(scene);
  addCrabs(scene);
}

export function updateBeach(delta, time) {
  crabs.forEach(c => updateCrab(c, delta, time));
}

// ── Seashells ─────────────────────────────────────────────────────────

function addShells(scene) {
  const rng = seededRng(44);
  const shellCols = [0xF5E8D0, 0xE8CFA8, 0xD4A880, 0xFFEED8, 0xC8B090, 0xF8F0E0];

  for (let i = 0; i < 55; i++) {
    const angle = rng() * Math.PI * 2;
    const r     = BEACH_INNER + rng() * (BEACH_OUTER - BEACH_INNER);
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const col = shellCols[Math.floor(rng() * shellCols.length)];
    const sc  = 0.04 + rng() * 0.09;

    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.60, metalness: 0.05 });
    let mesh;

    if (rng() < 0.55) {
      // Conch/snail shell (cone)
      mesh = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 7), mat);
      mesh.scale.setScalar(sc);
      mesh.rotation.z = (rng() - 0.5) * 0.8;
      mesh.rotation.y = rng() * Math.PI * 2;
    } else {
      // Clam shell (flattened sphere pair)
      const g = new THREE.Group();
      [0.02, -0.02].forEach(dy => {
        const half = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        half.scale.set(1, 0.38, 0.9);
        half.position.y = dy / sc;
        if (dy < 0) half.rotation.z = Math.PI;
        g.add(half);
      });
      g.scale.setScalar(sc);
      g.rotation.y = rng() * Math.PI * 2;
      mesh = g;
    }

    mesh.position.set(x, 0.01, z);
    mesh.castShadow = true;
    scene.add(mesh);
  }
}

// ── Starfish ──────────────────────────────────────────────────────────

function addStarfish(scene) {
  const rng = seededRng(33);
  const sfCols = [0xE84020, 0xF06030, 0xD03818, 0xFF8050, 0xC84028];

  for (let i = 0; i < 22; i++) {
    const angle = rng() * Math.PI * 2;
    const r     = BEACH_INNER + rng() * (BEACH_OUTER - BEACH_INNER);
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const col = sfCols[Math.floor(rng() * sfCols.length)];
    const sc  = 0.06 + rng() * 0.12;

    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.80, metalness: 0.0 });
    const g   = new THREE.Group();

    // 5 arms as flattened capsules
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.80, 4, 6), mat);
      arm.scale.y = 0.18; // flatten
      arm.position.set(Math.cos(ang) * 0.6, 0, Math.sin(ang) * 0.6);
      arm.rotation.y = -ang;
      arm.rotation.z = Math.PI / 2;
      g.add(arm);
    }
    // Disc centre
    const centre = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8), mat);
    g.add(centre);

    g.scale.setScalar(sc);
    g.rotation.y = rng() * Math.PI * 2;
    g.position.set(x, 0.02, z);
    g.castShadow = true;
    scene.add(g);
  }
}

// ── Crabs ─────────────────────────────────────────────────────────────

const CRAB_COLORS = [0xE05020, 0xC04018, 0xD84828, 0xF06030, 0xB83820, 0xCC4422];

function addCrabs(scene) {
  const rng = seededRng(22);
  for (let i = 0; i < 7; i++) {
    const g     = buildCrab(CRAB_COLORS[i % CRAB_COLORS.length]);
    const angle = rng() * Math.PI * 2;
    const r     = CRAB_RADIUS + (rng() - 0.5) * 5;
    g.group.position.set(Math.cos(angle) * r, 0.05, Math.sin(angle) * r);
    scene.add(g.group);
    crabs.push({
      ...g,
      angle,
      radius:      r,
      targetAngle: angle + (rng() - 0.5) * 1.2,
      state:       'resting',
      restTimer:   2 + rng() * 5,
      speed:       CRAB_SPEED * (0.7 + rng() * 0.6) * (rng() < 0.5 ? 1 : -1),
      phase:       rng() * Math.PI * 2,
    });
  }
}

function updateCrab(crab, delta, time) {
  // Animate claws even while resting
  crab.clawL.rotation.z =  0.4 + Math.sin(time * 0.9 + crab.phase) * 0.3;
  crab.clawR.rotation.z = -0.4 - Math.sin(time * 0.9 + crab.phase) * 0.3;

  if (crab.state === 'resting') {
    crab.restTimer -= delta;
    if (crab.restTimer <= 0) {
      crab.state       = 'scuttling';
      const dir        = crab.speed > 0 ? 1 : -1;
      crab.targetAngle = crab.angle + dir * (0.4 + Math.random() * 0.9);
    }
    return;
  }

  // Scuttling sideways along the beach ring
  const da = crab.targetAngle - crab.angle;
  if (Math.abs(da) < 0.015) {
    crab.state     = 'resting';
    crab.restTimer = 3 + Math.random() * 6;
    return;
  }

  crab.angle += Math.sign(da) * Math.abs(crab.speed) * delta;
  crab.group.position.x = Math.cos(crab.angle) * crab.radius;
  crab.group.position.z = Math.sin(crab.angle) * crab.radius;

  // Body faces perpendicular to travel direction (crabs walk sideways)
  const perp = crab.angle + (crab.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
  crab.group.rotation.y = perp;

  // Leg bob
  const bob = Math.sin(time * 9) * 0.025;
  crab.group.position.y = 0.05 + Math.abs(bob);
  crab.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(time * 9 + i * 0.8) * 0.22;
  });
}

function buildCrab(color) {
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });

  const group = new THREE.Group();

  // Shell (flattened sphere)
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), bodyMat);
  shell.scale.set(1.15, 0.42, 0.95);
  shell.position.y = 0.10;
  shell.castShadow = true;
  group.add(shell);

  // Eye stalks
  [-0.11, 0.11].forEach(ex => {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 5), bodyMat);
    stalk.position.set(ex, 0.19, 0.21);
    group.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), darkMat);
    eye.position.set(ex, 0.24, 0.23);
    group.add(eye);
  });

  // Claws (front pair — larger)
  const clawL = buildClaw(group, bodyMat, -1);
  const clawR = buildClaw(group, bodyMat,  1);

  // Walking legs (3 pairs each side, thin)
  const legGeo = new THREE.CylinderGeometry(0.017, 0.010, 0.26, 5);
  const legs   = [];
  [-0.06, 0.01, 0.09].forEach((lz, li) => {
    [-1, 1].forEach(side => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(side * 0.29, 0.04, lz);
      leg.rotation.z = side * 0.85;
      leg.rotation.x = 0.15;
      group.add(leg);
      legs.push(leg);
    });
  });

  return { group, clawL, clawR, legs };
}

function buildClaw(parent, mat, side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.28, 0.08, 0.14);
  pivot.rotation.z = side * 0.4;

  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.16, 4, 6), mat);
  arm.position.set(side * 0.06, 0, 0);
  pivot.add(arm);

  const pincer = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 6), mat);
  pincer.scale.set(1.1, 0.62, 0.82);
  pincer.position.set(side * 0.15, 0, 0.04);
  pivot.add(pincer);

  parent.add(pivot);
  return pivot;
}

// ── Utility ───────────────────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
