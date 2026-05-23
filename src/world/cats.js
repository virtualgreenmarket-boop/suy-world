import * as THREE from 'three';

const ISLAND_R  = 228;
const CAT_SPEED = 1.1;

const CAT_CONFIGS = [
  { color: 0x6D4C41, x:  65, z: -75 },  // brown
  { color: 0x1A1A1A, x: -55, z:  70 },  // black
  { color: 0xBF360C, x:  90, z:  45 },  // dark orange / tabby
];

const cats = [];

// ── Public ────────────────────────────────────────────────────────────

export function initCats(scene) {
  CAT_CONFIGS.forEach(cfg => {
    const cat = buildCat(cfg.color);
    cat.group.position.set(cfg.x, 0, cfg.z);
    cat.home.set(cfg.x, 0, cfg.z);
    scene.add(cat.group);
    cats.push(cat);
  });
}

export function updateCats(delta, time) {
  cats.forEach(cat => updateCat(cat, delta, time));
}

// ── Per-cat state machine ─────────────────────────────────────────────

function updateCat(cat, delta, time) {
  // Animate tail
  cat.tail.rotation.x = Math.sin(time * 1.8 + cat.phase) * 0.35 + 0.5;

  if (cat.state === 'sitting') {
    cat.sitTimer -= delta;
    if (cat.sitTimer <= 0) startWalking(cat);
    return;
  }

  // Walking
  const pos    = cat.group.position;
  const dx     = cat.target.x - pos.x;
  const dz     = cat.target.z - pos.z;
  const distSq = dx * dx + dz * dz;

  if (distSq < 1.2) {
    cat.state    = 'sitting';
    cat.sitTimer = 2.5 + Math.random() * 5;
    return;
  }

  const dist = Math.sqrt(distSq);
  pos.x += (dx / dist) * CAT_SPEED * delta * cat.speedMult;
  pos.z += (dz / dist) * CAT_SPEED * delta * cat.speedMult;

  // Face direction of movement
  cat.group.rotation.y = Math.atan2(dx, dz);

  // Leg bob
  const bob = Math.sin(time * 8 * cat.speedMult) * 0.04;
  cat.legFL.position.y = -0.14 + bob;
  cat.legBR.position.y = -0.14 + bob;
  cat.legFR.position.y = -0.14 - bob;
  cat.legBL.position.y = -0.14 - bob;
  cat.group.position.y = Math.abs(bob) * 0.4;
}

function startWalking(cat) {
  cat.state = 'walking';
  // Pick a new point within 70 units of home, inside island
  let tx, tz, tries = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const r     = 20 + Math.random() * 60;
    tx = cat.home.x + Math.cos(angle) * r;
    tz = cat.home.z + Math.sin(angle) * r;
    tries++;
  } while (tx * tx + tz * tz > ISLAND_R * ISLAND_R && tries < 20);
  cat.target.set(tx, 0, tz);
}

// ── Build cat mesh ────────────────────────────────────────────────────

function buildCat(color) {
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.0 });
  const eyeMat  = new THREE.MeshStandardMaterial({
    color: 0xFFFF00, emissive: 0xCCCC00, emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xFF8A80, roughness: 0.9 });

  const group = new THREE.Group();

  // Body (horizontal capsule)
  const bodyGeo = new THREE.CapsuleGeometry(0.13, 0.28, 4, 8);
  const body    = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.16, 0);
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), bodyMat);
  head.position.set(0, 0.28, 0.26);
  head.castShadow = true;
  group.add(head);

  // Ears
  const earGeo = new THREE.ConeGeometry(0.055, 0.11, 4);
  [-0.07, 0.07].forEach(ex => {
    const ear = new THREE.Mesh(earGeo, bodyMat);
    ear.position.set(ex, 0.41, 0.24);
    group.add(ear);
  });

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.028, 6, 5);
  [-0.055, 0.055].forEach(ex => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.30, 0.39);
    group.add(eye);
  });

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), noseMat);
  nose.position.set(0, 0.265, 0.405);
  group.add(nose);

  // Tail
  const tailGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.32, 6);
  const tail    = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.set(0, 0.28, -0.28);
  tail.rotation.x = -0.6;
  group.add(tail);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6);
  const legFL  = mkLeg(group, legGeo, bodyMat,  0.09, -0.14,  0.15);
  const legFR  = mkLeg(group, legGeo, bodyMat, -0.09, -0.14,  0.15);
  const legBL  = mkLeg(group, legGeo, bodyMat,  0.09, -0.14, -0.15);
  const legBR  = mkLeg(group, legGeo, bodyMat, -0.09, -0.14, -0.15);

  return {
    group,
    tail,
    legFL, legFR, legBL, legBR,
    state:     'sitting',
    sitTimer:  Math.random() * 3,
    target:    new THREE.Vector3(),
    home:      new THREE.Vector3(),
    speedMult: 0.8 + Math.random() * 0.5,
    phase:     Math.random() * Math.PI * 2,
  };
}

function mkLeg(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
