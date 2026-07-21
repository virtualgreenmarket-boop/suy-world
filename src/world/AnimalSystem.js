import * as THREE from 'three';

// Helper functions (matching CharacterBuilder.js pattern)
const M = (c, r=0.7, m=0.05) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});

function B(w,h,d,mat) { const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); x.castShadow=true; return x; }
function S(r,mat) { const x=new THREE.Mesh(new THREE.SphereGeometry(r,10,10),mat); x.castShadow=true; return x; }
function CY(rt,rb,h,mat) { const x=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,10),mat); x.castShadow=true; return x; }
function CO(r,h,seg,mat) { const x=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat); x.castShadow=true; return x; }

// Animal color schemes
const DOG_COLORS = [
  { body:'#C8A050', dark:'#8B6914', nose:'#222', inner:'#FFB6C1' },
  { body:'#F5F5F5', dark:'#DDDDDD', nose:'#333', inner:'#FFB6C1' },
  { body:'#222222', dark:'#111111', nose:'#111', inner:'#cc4444' },
  { body:'#8B4513', dark:'#5C2E00', nose:'#222', inner:'#FFB6C1' },
  { body:'#E8C49A', dark:'#8B4513', nose:'#222', inner:'#FFB6C1' },
];

const CAT_COLORS = [
  { body:'#E8842A', dark:'#C0601A', nose:'#ff9999', inner:'#FFB6C1', stripe:true  },
  { body:'#111111', dark:'#000000', nose:'#333',    inner:'#cc4444', stripe:false },
  { body:'#F8F8F8', dark:'#E0E0E0', nose:'#FFB6C1', inner:'#FFB6C1', stripe:false },
  { body:'#888888', dark:'#555555', nose:'#cc8888', inner:'#FFB6C1', stripe:true  },
  { body:'#D4AA70', dark:'#8B6914', nose:'#FFB6C1', inner:'#FFB6C1', stripe:true  },
];

// Build a dog using primitives
export function buildDog(colors) {
  const group = new THREE.Group();
  const parts = { legs: [] };

  const bodyM = M(colors.body);
  const darkM = M(colors.dark);
  const noseM = M(colors.nose);
  const innerM = M(colors.inner);
  const white = M('#fff');

  // Body - elongated sphere
  const body = S(0.4, bodyM);
  body.scale.set(1.5, 0.85, 1.0);
  body.position.y = 0.55;
  group.add(body);

  // Chest patch (lighter)
  const chest = S(0.25, innerM);
  chest.position.set(0, 0.45, 0.45);
  group.add(chest);

  // Head group
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 0.88, 0.55);

  // Head sphere
  const head = S(0.3, bodyM);
  parts.headG.add(head);

  // Muzzle (lighter color)
  const muzzle = S(0.2, innerM);
  muzzle.position.set(0, -0.08, 0.28);
  parts.headG.add(muzzle);

  // Nose (dark, flattened)
  const nose = S(0.08, noseM);
  nose.scale.set(1, 0.6, 1);
  nose.position.set(0, -0.08, 0.42);
  parts.headG.add(nose);

  // Eyes
  [-0.12, 0.12].forEach(x => {
    const eyeWhite = S(0.08, white);
    eyeWhite.position.set(x, 0.08, 0.26);
    parts.headG.add(eyeWhite);

    const pupil = S(0.05, M('#111'));
    pupil.position.set(x, 0.08, 0.32);
    parts.headG.add(pupil);

    const shine = S(0.02, white);
    shine.position.set(x + 0.015, 0.1, 0.35);
    parts.headG.add(shine);
  });

  // Floppy ears
  [-0.22, 0.22].forEach((x, i) => {
    const ear = S(0.12, darkM);
    ear.scale.set(0.7, 1.5, 0.6);
    ear.position.set(x, 0.05, 0);
    ear.rotation.z = i === 0 ? 0.5 : -0.5;
    parts.headG.add(ear);
  });

  // Tongue
  const tongue = S(0.08, M('#FF69B4'));
  tongue.scale.set(1, 1.2, 0.6);
  tongue.position.set(0, -0.2, 0.35);
  parts.headG.add(tongue);

  group.add(parts.headG);

  // 4 Legs
  const legPositions = [
    { x: -0.28, z: 0.22 },
    { x: 0.28, z: 0.22 },
    { x: -0.28, z: -0.22 },
    { x: 0.28, z: -0.22 },
  ];

  legPositions.forEach(({ x, z }) => {
    const legG = new THREE.Group();
    legG.position.set(x, 0.4, z);

    // Upper leg
    const upper = CY(0.08, 0.08, 0.28, bodyM);
    upper.position.y = -0.14;
    legG.add(upper);

    // Lower leg
    const lower = CY(0.07, 0.06, 0.26, darkM);
    lower.position.y = -0.41;
    legG.add(lower);

    // Paw
    const paw = S(0.08, M('#333'));
    paw.position.y = -0.54;
    legG.add(paw);

    parts.legs.push(legG);
    group.add(legG);
  });

  // Tail
  parts.tailG = new THREE.Group();
  parts.tailG.position.set(0, 0.7, -0.5);
  const tail = S(0.12, darkM);
  tail.scale.set(0.7, 0.6, 1.8);
  tail.rotation.x = 0.6;
  parts.tailG.add(tail);
  group.add(parts.tailG);

  // Ensure all meshes are solid
  group.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.depthWrite = true;
      child.material.transparent = false;
      child.renderOrder = 0;
    }
  });

  group.userData.parts = parts;
  return group;
}

// Build a cat using primitives
export function buildCat(colors) {
  const group = new THREE.Group();
  const parts = { legs: [] };

  const bodyM = M(colors.body);
  const darkM = M(colors.dark);
  const noseM = M(colors.nose);
  const innerM = M(colors.inner);
  const white = M('#fff');

  // Body - elongated sphere
  const body = S(0.35, bodyM);
  body.scale.set(1.4, 0.9, 0.95);
  body.position.y = 0.5;
  group.add(body);

  // Belly patch
  const belly = S(0.2, innerM);
  belly.position.set(0, 0.35, 0.3);
  group.add(belly);

  // Stripes (if applicable)
  if (colors.stripe) {
    [-0.12, 0, 0.12].forEach(z => {
      const stripe = B(0.5, 0.08, 0.05, darkM);
      stripe.position.set(0, 0.68, z);
      stripe.rotation.y = Math.PI / 2;
      group.add(stripe);
    });
  }

  // Head group
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 0.9, 0.44);

  // Head sphere
  const head = S(0.24, bodyM);
  parts.headG.add(head);

  // Two small muzzle spheres
  [-0.08, 0.08].forEach(x => {
    const muzzle = S(0.09, innerM);
    muzzle.position.set(x, -0.08, 0.2);
    parts.headG.add(muzzle);
  });

  // Triangle nose
  const nose = CO(0.05, 0.08, 3, noseM);
  nose.rotation.x = Math.PI;
  nose.position.set(0, -0.08, 0.26);
  parts.headG.add(nose);

  // Eyes - almond-shaped (teal with vertical pupil)
  [-0.11, 0.11].forEach(x => {
    const eye = S(0.09, M('#40E0D0'));
    eye.scale.set(1.2, 0.75, 0.5);
    eye.position.set(x, 0.05, 0.2);
    parts.headG.add(eye);

    // Vertical pupil slit
    const pupil = B(0.03, 0.12, 0.02, M('#111'));
    pupil.position.set(x, 0.05, 0.24);
    parts.headG.add(pupil);

    // Shine
    const shine = S(0.02, white);
    shine.position.set(x + 0.02, 0.08, 0.26);
    parts.headG.add(shine);
  });

  // Pointy ears
  [-0.15, 0.15].forEach((x, i) => {
    const ear = CO(0.1, 0.2, 4, bodyM);
    ear.position.set(x, 0.24, -0.05);
    ear.rotation.z = i === 0 ? -0.3 : 0.3;
    parts.headG.add(ear);

    // Inner ear (smaller cone)
    const inner = CO(0.06, 0.12, 4, innerM);
    inner.position.set(x, 0.22, -0.05);
    inner.rotation.z = i === 0 ? -0.3 : 0.3;
    parts.headG.add(inner);
  });

  // Whiskers (6 thin boxes)
  [
    { x: -0.18, y: -0.05, z: 0.2, rot: 0.4 },
    { x: -0.18, y: -0.08, z: 0.2, rot: 0 },
    { x: -0.18, y: -0.11, z: 0.2, rot: -0.4 },
    { x: 0.18, y: -0.05, z: 0.2, rot: -0.4 },
    { x: 0.18, y: -0.08, z: 0.2, rot: 0 },
    { x: 0.18, y: -0.11, z: 0.2, rot: 0.4 },
  ].forEach(({ x, y, z, rot }) => {
    const whisker = B(0.25, 0.01, 0.01, M('#333'));
    whisker.position.set(x, y, z);
    whisker.rotation.y = rot;
    parts.headG.add(whisker);
  });

  group.add(parts.headG);

  // 4 Slender legs
  const legPositions = [
    { x: -0.22, z: 0.18 },
    { x: 0.22, z: 0.18 },
    { x: -0.22, z: -0.18 },
    { x: 0.22, z: -0.18 },
  ];

  legPositions.forEach(({ x, z }) => {
    const legG = new THREE.Group();
    legG.position.set(x, 0.35, z);

    // Upper leg (slimmer than dog)
    const upper = CY(0.075, 0.075, 0.24, bodyM);
    upper.position.y = -0.12;
    legG.add(upper);

    // Lower leg
    const lower = CY(0.065, 0.055, 0.22, darkM);
    lower.position.y = -0.36;
    legG.add(lower);

    // Paw
    const paw = S(0.07, M('#333'));
    paw.position.y = -0.47;
    legG.add(paw);

    parts.legs.push(legG);
    group.add(legG);
  });

  // Long curved tail (two cylinders at angles)
  parts.tailG = new THREE.Group();
  parts.tailG.position.set(0, 0.6, -0.45);

  const tail1 = CY(0.06, 0.05, 0.5, bodyM);
  tail1.rotation.x = 0.8;
  tail1.position.set(0, 0.15, -0.15);
  parts.tailG.add(tail1);

  const tail2 = CY(0.05, 0.04, 0.4, bodyM);
  tail2.rotation.x = 1.2;
  tail2.position.set(0, 0.35, -0.35);
  parts.tailG.add(tail2);

  // Dark tip
  const tip = S(0.06, darkM);
  tip.position.set(0, 0.5, -0.55);
  parts.tailG.add(tip);

  group.add(parts.tailG);

  // Ensure all meshes are solid
  group.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.depthWrite = true;
      child.material.transparent = false;
      child.renderOrder = 0;
    }
  });

  group.userData.parts = parts;
  return group;
}

// Animate animal based on state
export function animateAnimal(animal, type, time) {
  const parts = animal.userData.parts;
  if (!parts) return;

  const { headG, tailG, legs } = parts;

  if (type === 'idle') {
    // Tail wag
    tailG.rotation.y = Math.sin(time * 2.5) * 0.6;
    // Head bob
    headG.position.y = headG.userData.baseY + Math.sin(time * 1.5) * 0.02;
    // Body slight up/down
    animal.position.y = animal.userData.baseY + Math.sin(time * 1.2) * 0.03;
  }
  else if (type === 'walk') {
    // 4 legs swing alternating pairs
    legs.forEach((leg, i) => {
      const phase = (i % 2 === 0) ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 3.5 + phase) * 0.5;
    });
    // Tail wag
    tailG.rotation.y = Math.sin(time * 3.0) * 0.5;
    // Head bob
    headG.position.y = headG.userData.baseY + Math.abs(Math.sin(time * 3.5)) * 0.05;
  }
  else if (type === 'run') {
    // Faster leg swing
    legs.forEach((leg, i) => {
      const phase = (i % 2 === 0) ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 5.5 + phase) * 0.8;
    });
    // Tail wag faster
    tailG.rotation.y = Math.sin(time * 4.5) * 0.7;
    // Head tilts forward
    headG.rotation.x = -0.2;
    headG.position.y = headG.userData.baseY + Math.abs(Math.sin(time * 5.5)) * 0.08;
  }
  else if (type === 'sit') {
    // Back legs fold
    if (legs[2]) {
      legs[2].rotation.x = -1.2;
      legs[2].position.y = 0.15;
    }
    if (legs[3]) {
      legs[3].rotation.x = -1.2;
      legs[3].position.y = 0.15;
    }
    // Front legs upright
    if (legs[0]) legs[0].rotation.x = 0;
    if (legs[1]) legs[1].rotation.x = 0;
    // Head tilt with curiosity
    headG.rotation.z = Math.sin(time * 1.8) * 0.15;
    // Tail wag
    tailG.rotation.y = Math.sin(time * 2.2) * 0.4;
  }
}

// Forbidden zones — animals avoid these areas (buildings, trees, obstacles)
const FORBIDDEN_ZONES = [
  // Plaza area (expanded to ensure animals stay away)
  { x: 0, z: 0, radius: 60 },

  // Hangars
  { x: -50, z: -271.075, radius: 90 },    // North hangar
  { x: 212.6, z: 0, radius: 90 },         // East hangar
  { x: -50, z: 262.6, radius: 90 },       // South hangar

  // Marina
  { x: -150, z: 0, radius: 90 },

  // Paths (expanded to keep animals off roads)
  { x: 0, z: -100, radius: 15 },  // North path
  { x: 0, z: 100, radius: 15 },   // South path
  { x: 100, z: 0, radius: 15 },   // East path
  { x: -100, z: 0, radius: 15 },  // West path
];

// Check if position is in a valid grass area (not in forbidden zones, not on paths)
function isPositionValid(x, z) {
  // Must be within island radius but not near beach edge
  const distFromCenter = Math.sqrt(x * x + z * z);
  if (distFromCenter < 65 || distFromCenter > 200) return false;

  // Check if on a path (paths run N-S and E-W through center)
  const PATH_WIDTH = 10;
  if (Math.abs(x) < PATH_WIDTH && Math.abs(z) > 40) return false; // N-S path
  if (Math.abs(z) < PATH_WIDTH && Math.abs(x) > 40) return false; // E-W path

  // Must not be in any forbidden zone
  for (const zone of FORBIDDEN_ZONES) {
    const dx = x - zone.x;
    const dz = z - zone.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < zone.radius) return false;
  }

  return true;
}

// Lerp angle with proper wrapping
function lerpAngle(current, target, alpha) {
  let diff = target - current;
  // Normalize to [-PI, PI]
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

// Animal system state
let _animals = [];
let _playerGroup = null;
let _scene = null;

// Initialize animal system
export function initAnimalSystem(scene, playerGroup) {
  _scene = scene;
  _playerGroup = playerGroup;
  _animals = [];

  console.log('[animals] 🐕🐈 Spawning animals...');

  let dogCount = 0;
  let catCount = 0;

  // Spawn 5 dogs
  for (let i = 0; i < 5; i++) {
    const colors = DOG_COLORS[i];
    const dog = buildDog(colors);

    // Find valid position on grass
    let validPos = false;
    let attempts = 0;
    let x, z;
    while (!validPos && attempts < 30) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 100;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      validPos = isPositionValid(x, z);
      attempts++;
    }

    if (!validPos) {
      // Fallback: place in known grass area (northeast quadrant)
      x = 100 + Math.random() * 50;
      z = -100 - Math.random() * 50;
    }

    dog.position.set(x, 0, z);

    dog.userData.type = 'dog';
    dog.userData.behaviorState = 'wander';
    dog.userData.animState = 'walk';
    dog.userData.animT = 0;
    dog.userData.target = null;
    dog.userData.walkSpeed = 0.028;
    dog.userData.runSpeed = 0.075;
    dog.userData.approachSpeed = 0.035;
    dog.userData.speed = 0.028;
    dog.userData.baseY = 0;
    dog.userData.stateTimer = Math.random() * 4 + 4; // Random wander direction change (4-8s)
    dog.userData.sitTimer = 0;
    dog.userData.radius = 0.6;
    dog.userData.collider = true;
    dog.userData.parts.headG.userData.baseY = dog.userData.parts.headG.position.y;

    scene.add(dog);
    _animals.push(dog);
    dogCount++;
  }

  // Spawn 5 cats
  for (let i = 0; i < 5; i++) {
    const colors = CAT_COLORS[i];
    const cat = buildCat(colors);

    // Find valid position on grass
    let validPos = false;
    let attempts = 0;
    let x, z;
    while (!validPos && attempts < 30) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 100;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      validPos = isPositionValid(x, z);
      attempts++;
    }

    if (!validPos) {
      // Fallback: place in known grass area (southwest quadrant)
      x = -100 - Math.random() * 50;
      z = 100 + Math.random() * 50;
    }

    cat.position.set(x, 0, z);

    cat.userData.type = 'cat';
    cat.userData.behaviorState = 'wander';
    cat.userData.animState = 'walk';
    cat.userData.animT = 0;
    cat.userData.target = null;
    cat.userData.walkSpeed = 0.022;
    cat.userData.runSpeed = 0.065;
    cat.userData.approachSpeed = 0.025;
    cat.userData.speed = 0.022;
    cat.userData.baseY = 0;
    cat.userData.stateTimer = Math.random() * 4 + 4; // Random wander direction change (4-8s)
    cat.userData.sitTimer = 0;
    cat.userData.radius = 0.6;
    cat.userData.collider = true;
    cat.userData.parts.headG.userData.baseY = cat.userData.parts.headG.position.y;

    scene.add(cat);
    _animals.push(cat);
    catCount++;
  }

  console.log(`[animals] Dogs: ${dogCount} | Cats: ${catCount}`);
  console.log('[animals] All spawned on valid grass positions');
}

// Pick a random valid target for an animal
function pickRandomTarget(animal) {
  let attempts = 0;
  let x, z;

  // Try to find a valid position
  do {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 35;
    x = Math.cos(angle) * radius;
    z = Math.sin(angle) * radius;
    attempts++;
  } while (!isPositionValid(x, z) && attempts < 20);

  // If we couldn't find a valid position, stay near current position
  if (attempts >= 20) {
    const nearAngle = Math.random() * Math.PI * 2;
    const nearRadius = 3 + Math.random() * 5;
    x = animal.position.x + Math.cos(nearAngle) * nearRadius;
    z = animal.position.z + Math.sin(nearAngle) * nearRadius;
  }

  return { x, z };
}

// Check if player is running (fast movement)
function isPlayerRunning() {
  if (!_playerGroup || !_playerGroup.userData._prevPos) return false;

  const dx = _playerGroup.position.x - _playerGroup.userData._prevPos.x;
  const dz = _playerGroup.position.z - _playerGroup.userData._prevPos.z;
  const speed = Math.sqrt(dx * dx + dz * dz);

  return speed > 0.1; // Threshold for running
}

// Update behavior state machine
function updateBehaviorState(animal, delta) {
  const state = animal.userData.behaviorState;
  const isDog = animal.userData.type === 'dog';

  // Track state timer
  animal.userData.stateTimer -= delta;

  // Distance to player
  let distToPlayer = Infinity;
  if (_playerGroup) {
    const dx = _playerGroup.position.x - animal.position.x;
    const dz = _playerGroup.position.z - animal.position.z;
    distToPlayer = Math.sqrt(dx * dx + dz * dz);
  }

  // State transitions
  if (state === 'wander') {
    // Check for player approach
    if (distToPlayer < 12 && _playerGroup) {
      const approachChance = isDog ? 0.6 : 0.4;
      if (Math.random() < approachChance) {
        animal.userData.behaviorState = 'approach';
        animal.userData.animState = 'walk';
        animal.userData.speed = animal.userData.approachSpeed;
        animal.userData.target = {
          x: _playerGroup.position.x,
          z: _playerGroup.position.z,
        };
        return;
      }
    }

    // Check for surprise (player very close)
    if (distToPlayer < 1.5 && _playerGroup) {
      animal.userData.behaviorState = 'run_away';
      animal.userData.animState = 'run';
      animal.userData.speed = animal.userData.runSpeed;
      animal.userData.stateTimer = 2;
      // Run away from player
      const dx = animal.position.x - _playerGroup.position.x;
      const dz = animal.position.z - _playerGroup.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      animal.userData.target = {
        x: animal.position.x + (dx / dist) * 15,
        z: animal.position.z + (dz / dist) * 15,
      };
      return;
    }

    // Change wander direction periodically
    if (animal.userData.stateTimer <= 0) {
      animal.userData.target = pickRandomTarget(animal);
      animal.userData.stateTimer = Math.random() * 4 + 4;
    }
  }
  else if (state === 'approach') {
    // Update target to follow player
    if (_playerGroup && distToPlayer > 2) {
      animal.userData.target = {
        x: _playerGroup.position.x,
        z: _playerGroup.position.z,
      };
    }

    // Reached player, sit down
    if (distToPlayer < 2) {
      animal.userData.behaviorState = 'sit';
      animal.userData.animState = 'sit';
      animal.userData.speed = 0;
      animal.userData.target = null;
      // Sit for random time - shorter if player is moving
      const sitTime = isPlayerRunning() ? (2 + Math.random() * 3) : (5 + Math.random() * 5);
      animal.userData.sitTimer = sitTime;
      return;
    }

    // If player running, get scared
    if (isPlayerRunning() && distToPlayer < 5) {
      animal.userData.behaviorState = 'run_away';
      animal.userData.animState = 'run';
      animal.userData.speed = animal.userData.runSpeed;
      animal.userData.stateTimer = 2;
      const dx = animal.position.x - _playerGroup.position.x;
      const dz = animal.position.z - _playerGroup.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      animal.userData.target = {
        x: animal.position.x + (dx / dist) * 15,
        z: animal.position.z + (dz / dist) * 15,
      };
      return;
    }
  }
  else if (state === 'sit') {
    animal.userData.sitTimer -= delta;
    if (animal.userData.sitTimer <= 0) {
      // Leave after sitting
      animal.userData.behaviorState = 'leave';
      animal.userData.animState = 'walk';
      animal.userData.speed = animal.userData.walkSpeed;
      animal.userData.stateTimer = 5;
      // Reset leg positions
      if (animal.userData.parts.legs[2]) {
        animal.userData.parts.legs[2].position.y = isDog ? 0.4 : 0.35;
      }
      if (animal.userData.parts.legs[3]) {
        animal.userData.parts.legs[3].position.y = isDog ? 0.4 : 0.35;
      }
      // Walk away from player
      if (_playerGroup) {
        const dx = animal.position.x - _playerGroup.position.x;
        const dz = animal.position.z - _playerGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        animal.userData.target = {
          x: animal.position.x + (dx / dist) * 10,
          z: animal.position.z + (dz / dist) * 10,
        };
      } else {
        animal.userData.target = pickRandomTarget(animal);
      }
    }
  }
  else if (state === 'leave') {
    if (animal.userData.stateTimer <= 0) {
      animal.userData.behaviorState = 'wander';
      animal.userData.animState = 'walk';
      animal.userData.speed = animal.userData.walkSpeed;
      animal.userData.target = pickRandomTarget(animal);
      animal.userData.stateTimer = Math.random() * 4 + 4;
    }
  }
  else if (state === 'run_away') {
    if (animal.userData.stateTimer <= 0) {
      animal.userData.behaviorState = 'wander';
      animal.userData.animState = 'walk';
      animal.userData.speed = animal.userData.walkSpeed;
      animal.userData.target = pickRandomTarget(animal);
      animal.userData.stateTimer = Math.random() * 4 + 4;
    }
  }
}

// Check collision between two animals
function checkAnimalCollision(animal1, animal2) {
  const dx = animal2.position.x - animal1.position.x;
  const dz = animal2.position.z - animal1.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const minDist = animal1.userData.radius + animal2.userData.radius;

  if (dist < minDist && dist > 0.01) {
    // Push apart more aggressively (increased from 0.5 to full separation)
    const pushDist = (minDist - dist) * 0.52;
    const nx = dx / dist;
    const nz = dz / dist;

    // Push both animals apart
    animal1.position.x -= nx * pushDist;
    animal1.position.z -= nz * pushDist;
    animal2.position.x += nx * pushDist;
    animal2.position.z += nz * pushDist;

    // Also redirect their targets slightly to avoid re-collision
    if (animal1.userData.target) {
      animal1.userData.target.x -= nx * 2;
      animal1.userData.target.z -= nz * 2;
    }
    if (animal2.userData.target) {
      animal2.userData.target.x += nx * 2;
      animal2.userData.target.z += nz * 2;
    }
  }
}

// Update animal system every frame
export function updateAnimalSystem(delta) {
  if (!_animals.length) return;

  // Use safe delta to prevent issues
  const safeDelta = Math.min(delta || 0.016, 0.05);

  // Store player previous position for speed calculation
  if (_playerGroup) {
    if (!_playerGroup.userData._prevPos) {
      _playerGroup.userData._prevPos = { x: _playerGroup.position.x, z: _playerGroup.position.z };
    } else {
      _playerGroup.userData._prevPos.x = _playerGroup.position.x;
      _playerGroup.userData._prevPos.z = _playerGroup.position.z;
    }
  }

  // Update each animal
  _animals.forEach(animal => {
    animal.userData.animT += safeDelta;

    // Update behavior state machine
    updateBehaviorState(animal, safeDelta);

    // If no target, pick one (for wander state)
    if (!animal.userData.target && animal.userData.behaviorState === 'wander') {
      animal.userData.target = pickRandomTarget(animal);
    }

    // Move toward target if we have one and not sitting
    if (animal.userData.target && animal.userData.behaviorState !== 'sit') {
      const dx = animal.userData.target.x - animal.position.x;
      const dz = animal.userData.target.z - animal.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.5) {
        // Move toward target
        const speed = animal.userData.speed;
        const moveX = (dx / dist) * speed;
        const moveZ = (dz / dist) * speed;

        // Check if new position is valid
        const newX = animal.position.x + moveX;
        const newZ = animal.position.z + moveZ;

        // Check if new position would collide with other animals BEFORE moving
        let wouldCollide = false;
        for (const other of _animals) {
          if (other === animal) continue;
          const odx = other.position.x - newX;
          const odz = other.position.z - newZ;
          const oDist = Math.sqrt(odx * odx + odz * odz);
          const minDist = animal.userData.radius + other.userData.radius;
          if (oDist < minDist) {
            wouldCollide = true;
            break;
          }
        }

        if (!wouldCollide && isPositionValid(newX, newZ)) {
          animal.position.x = newX;
          animal.position.z = newZ;

          // Rotate to face direction smoothly using lerp
          const targetAngle = Math.atan2(dx, dz);
          animal.rotation.y = lerpAngle(animal.rotation.y, targetAngle, 0.08);
        } else {
          // Hit forbidden zone or another animal, pick new target
          animal.userData.target = pickRandomTarget(animal);
        }
      } else {
        // Reached target
        if (animal.userData.behaviorState === 'wander') {
          animal.userData.target = pickRandomTarget(animal);
        } else {
          animal.userData.target = null;
        }
      }
    }

    // FORCE Y position to ground level (fix clipping through floor)
    animal.position.y = 0;

    // Animate based on animation state
    animateAnimal(animal, animal.userData.animState, animal.userData.animT);
  });

  // Check collisions between animals
  for (let i = 0; i < _animals.length; i++) {
    for (let j = i + 1; j < _animals.length; j++) {
      checkAnimalCollision(_animals[i], _animals[j]);
    }
  }
}

// Export function to get all animals (for player collision check)
export function getAnimals() {
  return _animals;
}
