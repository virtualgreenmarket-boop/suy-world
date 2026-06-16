import * as THREE from 'three';

// Helper functions (matching AnimalSystem.js pattern)
const M = (c, r=0.7, m=0.05) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});

function B(w,h,d,mat) { const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); x.castShadow=true; return x; }
function S(r,mat) { const x=new THREE.Mesh(new THREE.SphereGeometry(r,10,10),mat); x.castShadow=true; return x; }
function CY(rt,rb,h,mat) { const x=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,10),mat); x.castShadow=true; return x; }
function CO(r,h,seg,mat) { const x=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat); x.castShadow=true; return x; }

// Pet color schemes
const PET_COLOR_SCHEMES = {
  snake: [
    { body:'#4CAF50', belly:'#A5D6A7', tongue:'#F44336' }, // ירוק
    { body:'#F44336', belly:'#FFCDD2', tongue:'#F44336' }, // אדום
    { body:'#212121', belly:'#424242', tongue:'#F44336' }, // שחור
  ],
  mouse: [
    { body:'#F5F5F5', ears:'#FFB6C1', nose:'#FF8A80' }, // לבן
    { body:'#8D6E63', ears:'#FFCCBC', nose:'#FF8A80' }, // חום
  ],
  iguana: [
    { body:'#388E3C', dark:'#1B5E20' }, // ירוק
    { body:'#1565C0', dark:'#0D47A1' }, // כחול
    { body:'#C62828', dark:'#7F0000' }, // אדום
  ],
  dragon: [
    { body:'#2E7D32', wings:'#1B5E20', eyes:'#FF0000' }, // ירוק
    { body:'#B71C1C', wings:'#7F0000', eyes:'#FF6F00' }, // אדום
  ],
};

// State
let _activePet = null;
let _petGroup = null;
let _scene = null;
let _animTime = 0;
let _petType = '';

/**
 * Initialize pet system
 */
export function initPetSystem(scene) {
  _scene = scene;
  console.log('[PetSystem] Initialized');
}

/**
 * Spawn a pet
 */
export function spawnPet(petConfig, playerGroup) {
  if (!_scene || !playerGroup) {
    console.warn('[PetSystem] Cannot spawn pet: missing scene or player');
    return;
  }

  // Remove existing pet first
  removePet();

  const { type, colorIndex } = petConfig;
  const colorScheme = PET_COLOR_SCHEMES[type]?.[colorIndex] || PET_COLOR_SCHEMES[type]?.[0];

  if (!colorScheme) {
    console.warn('[PetSystem] Invalid pet type or colorIndex:', type, colorIndex);
    return;
  }

  // Build pet based on type
  switch (type) {
    case 'snake':
      _petGroup = buildSnake(colorScheme);
      break;
    case 'mouse':
      _petGroup = buildMouse(colorScheme);
      break;
    case 'iguana':
      _petGroup = buildIguana(colorScheme);
      break;
    case 'dragon':
      _petGroup = buildDragon(colorScheme);
      break;
    default:
      console.warn('[PetSystem] Unknown pet type:', type);
      return;
  }

  _petType = type;
  _petGroup.position.set(
    playerGroup.position.x - 1.8,
    0,
    playerGroup.position.z
  );

  _scene.add(_petGroup);
  _activePet = { type, colorIndex, group: _petGroup };

  console.log('[PetSystem] Spawned', type, 'at', _petGroup.position);
}

/**
 * Remove active pet
 */
export function removePet() {
  if (_petGroup && _scene) {
    _scene.remove(_petGroup);
    _petGroup = null;
    _activePet = null;
    _petType = '';
    console.log('[PetSystem] Removed pet');
  }
}

/**
 * Update pet every frame
 */
export function updatePet(delta, playerGroup) {
  if (!_petGroup || !playerGroup) return;

  _animTime += delta;

  // Calculate distance to player
  const dx = playerGroup.position.x - _petGroup.position.x;
  const dz = playerGroup.position.z - _petGroup.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  const targetDistance = 1.8;
  let speed = 0;

  // Follow behavior
  if (distance > 6) {
    // Run toward player
    speed = 3.5;
  } else if (distance > 3) {
    // Walk toward player
    speed = 1.8;
  } else if (distance > targetDistance + 0.3) {
    // Slow approach
    speed = 0.8;
  } else {
    // Idle - stay in place
    speed = 0;
  }

  // Move toward player
  if (speed > 0) {
    const moveDir = new THREE.Vector2(dx, dz).normalize();
    _petGroup.position.x += moveDir.x * speed * delta;
    _petGroup.position.z += moveDir.y * speed * delta;

    // Rotate to face movement direction
    const targetRotY = Math.atan2(dx, dz);
    _petGroup.rotation.y += (targetRotY - _petGroup.rotation.y) * 0.1;
  }

  // Keep on ground (except mouse which hops)
  if (_petType === 'mouse' && speed > 0) {
    // Hop animation
    _petGroup.position.y = Math.abs(Math.sin(_animTime * 8)) * 0.08;
  } else if (_petType === 'snake') {
    _petGroup.position.y = 0.06; // Slightly above ground for slither
  } else {
    _petGroup.position.y = 0;
  }

  // Animate based on type
  if (_petType === 'snake') {
    _animateSnake(_petGroup, _animTime, speed);
  } else if (_petType === 'mouse' && _petGroup.userData.parts) {
    _animateMouse(_petGroup.userData.parts, _animTime, speed);
  }
}

/**
 * Build snake from primitives
 */
function buildSnake(colors) {
  const group = new THREE.Group();
  const parts = { segments: [] };

  const bodyM = M(colors.body);
  const bellyM = M(colors.belly);
  const tongueM = M(colors.tongue);

  // 8 connected spheres decreasing in size
  const sizes = [0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.05, 0.04];

  sizes.forEach((r, i) => {
    const segment = S(r, i === 0 ? bodyM : bodyM);
    segment.position.set(0, 0, -i * 0.15);
    segment.userData.segmentIndex = i;

    // Belly spot
    if (i < 6) {
      const belly = S(r * 0.6, bellyM);
      belly.position.set(0, -r * 0.5, -i * 0.15);
      group.add(belly);
    }

    parts.segments.push(segment);
    group.add(segment);
  });

  // Head details (on first segment)
  const head = parts.segments[0];

  // Eyes
  [-0.05, 0.05].forEach(x => {
    const eye = S(0.02, M('#FFD700'));
    eye.position.set(x, 0.05, 0.1);
    head.add(eye);

    const pupil = S(0.01, M('#000'));
    pupil.position.set(x, 0.05, 0.12);
    head.add(pupil);
  });

  // Fangs (tiny red boxes)
  [-0.03, 0.03].forEach(x => {
    const fang = B(0.01, 0.04, 0.01, tongueM);
    fang.position.set(x, -0.06, 0.1);
    head.add(fang);
  });

  // Forked tongue
  const tongueBase = CY(0.008, 0.008, 0.08, tongueM);
  tongueBase.rotation.x = Math.PI / 2;
  tongueBase.position.set(0, -0.02, 0.14);
  head.add(tongueBase);

  const tongueFork1 = CY(0.006, 0.006, 0.04, tongueM);
  tongueFork1.rotation.set(Math.PI / 2, 0, 0.3);
  tongueFork1.position.set(-0.01, -0.02, 0.18);
  head.add(tongueFork1);

  const tongueFork2 = CY(0.006, 0.006, 0.04, tongueM);
  tongueFork2.rotation.set(Math.PI / 2, 0, -0.3);
  tongueFork2.position.set(0.01, -0.02, 0.18);
  head.add(tongueFork2);

  _ensureSolid(group);
  group.userData.parts = parts;
  return group;
}

/**
 * Animate snake slither
 */
function _animateSnake(group, time, speed) {
  const parts = group.userData.parts;
  if (!parts || !parts.segments) return;

  parts.segments.forEach((seg, i) => {
    if (i === 0) return; // Head doesn't move

    const offset = i * 0.5;
    const wave = Math.sin(time * 4 + offset) * 0.08;
    seg.position.x = wave;
    seg.position.z = -i * 0.15 + Math.cos(time * 4 + offset) * 0.02;
  });
}

/**
 * Build mouse from primitives
 */
function buildMouse(colors) {
  const group = new THREE.Group();
  const parts = { legs: [] };

  const bodyM = M(colors.body);
  const earM = M(colors.ears);
  const noseM = M(colors.nose);

  // Body - small flattened sphere
  const body = S(0.14, bodyM);
  body.scale.set(1.2, 0.9, 1.0);
  body.position.y = 0.12;
  group.add(body);

  // Head - smaller sphere forward
  const head = S(0.1, bodyM);
  head.position.set(0, 0.14, 0.18);
  group.add(head);

  // Large round ears
  [-0.08, 0.08].forEach(x => {
    const ear = S(0.08, earM);
    ear.scale.set(0.8, 1.0, 0.2);
    ear.position.set(x, 0.22, 0.16);
    group.add(ear);
  });

  // Tiny pink nose
  const nose = S(0.02, noseM);
  nose.position.set(0, 0.13, 0.27);
  group.add(nose);

  // Eyes
  [-0.04, 0.04].forEach(x => {
    const eye = S(0.015, M('#000'));
    eye.position.set(x, 0.16, 0.25);
    group.add(eye);
  });

  // Tail - thin curved cylinder
  const tail = CY(0.01, 0.008, 0.25, M('#E0A0A0'));
  tail.rotation.set(0.8, 0, 0.2);
  tail.position.set(0.05, 0.1, -0.15);
  group.add(tail);

  // 4 tiny legs
  const legPositions = [
    { x: -0.08, z: 0.06 },
    { x: 0.08, z: 0.06 },
    { x: -0.08, z: -0.06 },
    { x: 0.08, z: -0.06 },
  ];

  legPositions.forEach(({ x, z }) => {
    const leg = CY(0.02, 0.02, 0.1, bodyM);
    leg.position.set(x, 0.05, z);
    parts.legs.push(leg);
    group.add(leg);
  });

  _ensureSolid(group);
  group.userData.parts = parts;
  return group;
}

/**
 * Animate mouse
 */
function _animateMouse(parts, time, speed) {
  if (!parts.legs) return;

  const legSwing = Math.sin(time * 8) * 0.2;
  parts.legs.forEach((leg, i) => {
    leg.rotation.x = (i < 2 ? legSwing : -legSwing);
  });
}

/**
 * Build iguana from primitives
 */
function buildIguana(colors) {
  const group = new THREE.Group();

  const bodyM = M(colors.body);
  const darkM = M(colors.dark);

  // Body - elongated sphere
  const body = S(0.18, bodyM);
  body.scale.set(2.0, 0.7, 0.8);
  body.position.y = 0.16;
  group.add(body);

  // Head - box with pointed snout
  const head = B(0.15, 0.12, 0.22, bodyM);
  head.position.set(0, 0.18, 0.42);
  group.add(head);

  const snout = B(0.1, 0.08, 0.12, darkM);
  snout.position.set(0, 0.16, 0.54);
  group.add(snout);

  // Eyes
  [-0.06, 0.06].forEach(x => {
    const eye = S(0.025, M('#FFD700'));
    eye.position.set(x, 0.22, 0.5);
    group.add(eye);

    const pupil = B(0.008, 0.02, 0.008, M('#000'));
    pupil.position.set(x, 0.22, 0.52);
    group.add(pupil);
  });

  // Dewlap under chin
  const dewlap = S(0.08, M('#FF6B6B'));
  dewlap.scale.set(1.0, 0.4, 0.6);
  dewlap.position.set(0, 0.1, 0.48);
  group.add(dewlap);

  // 4 stubby legs
  const legPositions = [
    { x: -0.22, z: 0.18 },
    { x: 0.22, z: 0.18 },
    { x: -0.22, z: -0.18 },
    { x: 0.22, z: -0.18 },
  ];

  legPositions.forEach(({ x, z }) => {
    const leg = CY(0.05, 0.04, 0.14, bodyM);
    leg.position.set(x, 0.07, z);
    group.add(leg);
  });

  // Spiny ridge - 6 small cones along back
  for (let i = 0; i < 6; i++) {
    const spine = CO(0.03, 0.08, 6, darkM);
    spine.position.set(0, 0.28, 0.3 - i * 0.12);
    group.add(spine);
  }

  // Tail - 6 decreasing cylinders in a curve
  let tailZ = -0.35;
  [0.08, 0.07, 0.06, 0.05, 0.04, 0.03].forEach((r, i) => {
    const segment = CY(r, r * 0.8, 0.12, bodyM);
    segment.rotation.x = Math.PI / 2;
    segment.position.set(0, 0.12 - i * 0.02, tailZ);
    tailZ -= 0.1;
    group.add(segment);
  });

  _ensureSolid(group);
  return group;
}

/**
 * Build dragon from primitives
 */
function buildDragon(colors) {
  const group = new THREE.Group();

  const bodyM = M(colors.body);
  const wingM = M(colors.wings);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: colors.eyes,
    emissive: colors.eyes,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.2
  });

  const scale = 1.5; // 1.5x larger than iguana

  // Body - elongated sphere
  const body = S(0.18 * scale, bodyM);
  body.scale.set(2.0, 0.7, 0.8);
  body.position.y = 0.16 * scale;
  group.add(body);

  // Head - box with pointed snout
  const head = B(0.15 * scale, 0.12 * scale, 0.22 * scale, bodyM);
  head.position.set(0, 0.18 * scale, 0.42 * scale);
  group.add(head);

  const snout = B(0.1 * scale, 0.08 * scale, 0.12 * scale, bodyM);
  snout.position.set(0, 0.16 * scale, 0.54 * scale);
  group.add(snout);

  // Horn on nose
  const horn = CO(0.04 * scale, 0.12 * scale, 6, M('#FFD700'));
  horn.position.set(0, 0.24 * scale, 0.58 * scale);
  horn.castShadow = true;
  group.add(horn);

  // Emissive eyes
  [-0.06, 0.06].forEach(x => {
    const eye = S(0.035 * scale, eyeMat);
    eye.position.set(x * scale, 0.22 * scale, 0.5 * scale);
    eye.castShadow = true;
    group.add(eye);
  });

  // 4 legs
  const legPositions = [
    { x: -0.22, z: 0.18 },
    { x: 0.22, z: 0.18 },
    { x: -0.22, z: -0.18 },
    { x: 0.22, z: -0.18 },
  ];

  legPositions.forEach(({ x, z }) => {
    const leg = CY(0.06 * scale, 0.05 * scale, 0.18 * scale, bodyM);
    leg.position.set(x * scale, 0.09 * scale, z * scale);
    group.add(leg);
  });

  // Wings - flat triangular shapes
  [-0.3, 0.3].forEach((x, i) => {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(x * scale, 0.22 * scale, 0);

    // Wing membrane - flat box at angle
    const wing = B(0.35 * scale, 0.02, 0.4 * scale, wingM);
    wing.rotation.set(0, 0, i === 0 ? 0.8 : -0.8);
    wing.position.x = i === 0 ? -0.15 * scale : 0.15 * scale;
    wing.castShadow = true;
    wingGroup.add(wing);

    group.add(wingGroup);
  });

  // Spiny ridge
  for (let i = 0; i < 6; i++) {
    const spine = CO(0.04 * scale, 0.1 * scale, 6, M('#FFD700'));
    spine.position.set(0, 0.32 * scale, 0.3 * scale - i * 0.12 * scale);
    spine.castShadow = true;
    group.add(spine);
  }

  // Tail with emissive tip
  let tailZ = -0.35 * scale;
  [0.08, 0.07, 0.06, 0.05, 0.04, 0.03].forEach((r, i) => {
    const segment = CY(r * scale, r * 0.8 * scale, 0.12 * scale, bodyM);
    segment.rotation.x = Math.PI / 2;
    segment.position.set(0, 0.12 * scale - i * 0.02 * scale, tailZ);
    tailZ -= 0.1 * scale;
    group.add(segment);

    // Emissive spike at tail tip
    if (i === 5) {
      const spike = CO(0.05 * scale, 0.12 * scale, 6, eyeMat);
      spike.rotation.x = -Math.PI / 2;
      spike.position.set(0, 0.12 * scale - i * 0.02 * scale, tailZ);
      spike.castShadow = true;
      group.add(spike);
    }
  });

  _ensureSolid(group);
  return group;
}

/**
 * Ensure all meshes are solid (not transparent)
 */
function _ensureSolid(group) {
  group.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.depthWrite = true;
      child.material.transparent = false;
      child.renderOrder = 0;
      child.castShadow = true;
    }
  });
}
