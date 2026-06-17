import * as THREE from 'three';

// Helper functions (matching CharacterBuilder.js pattern)
const M = (c, r=0.7, m=0.05) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});

function B(w,h,d,mat) { const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); x.castShadow=true; return x; }
function S(r,mat) { const x=new THREE.Mesh(new THREE.SphereGeometry(r,10,10),mat); x.castShadow=true; return x; }
function CY(rt,rb,h,mat) { const x=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,10),mat); x.castShadow=true; return x; }

// Color schemes
const COW_COLORS = [
  { body:'#F5F5F5', spots:'#222222', nose:'#FFCCAA', hooves:'#333' }, // שחור-לבן
  { body:'#C8855A', spots:'#8B4513', nose:'#FFCCAA', hooves:'#333' }, // חום
  { body:'#E8D5A3', spots:'#C8855A', nose:'#FFCCAA', hooves:'#333' }, // בז' וחום
];

const HORSE_COLORS = [
  { body:'#8B4513', mane:'#4a2000', hooves:'#222', nose:'#C8855A' }, // חום
  { body:'#222222', mane:'#111',    hooves:'#111', nose:'#555'    }, // שחור
  { body:'#D4AA70', mane:'#8B6914', hooves:'#333', nose:'#C8855A' }, // בז'
  { body:'#F5F5F5', mane:'#DDDDDD', hooves:'#AAA', nose:'#FFCCAA' }, // לבן
];

// Build a cow using primitives
export function buildCow(colorScheme) {
  const group = new THREE.Group();
  const parts = { legs: [] };

  const bodyM = M(colorScheme.body);
  const spotM = M(colorScheme.spots);
  const noseM = M(colorScheme.nose);
  const hoofM = M(colorScheme.hooves);

  // Body - large elongated sphere
  const body = S(0.65, bodyM);
  body.scale.set(2.2, 1.1, 1.1);
  body.position.y = 0.85;
  group.add(body);

  // Random spots on body (2-3)
  const numSpots = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < numSpots; i++) {
    const spot = B(0.3 + Math.random() * 0.2, 0.25 + Math.random() * 0.15, 0.25 + Math.random() * 0.15, spotM);
    spot.position.set(
      (Math.random() - 0.5) * 1.2,
      0.85 + (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.6
    );
    spot.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
    group.add(spot);
  }

  // Head group
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 1.1, 1.1);

  // Head box
  const head = B(0.55, 0.5, 0.55, bodyM);
  parts.headG.add(head);

  // Muzzle
  const muzzle = B(0.45, 0.28, 0.3, noseM);
  muzzle.position.set(0, -0.15, 0.42);
  parts.headG.add(muzzle);

  // Nostrils
  [-0.12, 0.12].forEach(x => {
    const nostril = S(0.05, M('#222'));
    nostril.position.set(x, -0.15, 0.56);
    nostril.scale.set(1, 0.7, 1);
    parts.headG.add(nostril);
  });

  // Eyes
  [-0.22, 0.22].forEach(x => {
    const eyeWhite = S(0.08, M('#fff'));
    eyeWhite.position.set(x, 0.08, 0.22);
    parts.headG.add(eyeWhite);

    const pupil = S(0.05, M('#111'));
    pupil.position.set(x, 0.08, 0.28);
    parts.headG.add(pupil);
  });

  // Horns
  [-0.18, 0.18].forEach((x, i) => {
    const horn = CY(0.04, 0.02, 0.18, M('#F5E6D3'));
    horn.position.set(x, 0.32, -0.05);
    horn.rotation.x = 0.3;
    horn.rotation.z = i === 0 ? 0.4 : -0.4;
    parts.headG.add(horn);
  });

  // Ears (floppy)
  [-0.3, 0.3].forEach((x, i) => {
    const ear = S(0.12, bodyM);
    ear.scale.set(0.6, 1.2, 0.4);
    ear.position.set(x, 0.15, 0);
    ear.rotation.z = i === 0 ? 0.8 : -0.8;
    parts.headG.add(ear);
  });

  // Jaw group (for eating animation)
  parts.jawG = new THREE.Group();
  parts.jawG.position.set(0, -0.28, 0.3);
  const jaw = B(0.38, 0.12, 0.25, noseM);
  parts.jawG.add(jaw);
  parts.headG.add(parts.jawG);

  group.add(parts.headG);

  // 4 Thick legs
  const legPositions = [
    { x: -0.55, z: 0.55 },
    { x: 0.55, z: 0.55 },
    { x: -0.55, z: -0.55 },
    { x: 0.55, z: -0.55 },
  ];

  legPositions.forEach(({ x, z }) => {
    const legG = new THREE.Group();
    legG.position.set(x, 0.52, z);

    // Upper leg
    const upper = CY(0.13, 0.13, 0.38, bodyM);
    upper.position.y = -0.19;
    legG.add(upper);

    // Lower leg
    const lower = CY(0.11, 0.11, 0.36, bodyM);
    lower.position.y = -0.56;
    legG.add(lower);

    // Hoof
    const hoof = B(0.18, 0.08, 0.15, hoofM);
    hoof.position.y = -0.78;
    legG.add(hoof);

    parts.legs.push(legG);
    group.add(legG);
  });

  // Tail
  parts.tailG = new THREE.Group();
  parts.tailG.position.set(0, 1.0, -0.75);
  const tailBase = CY(0.04, 0.03, 0.5, bodyM);
  tailBase.position.y = -0.25;
  parts.tailG.add(tailBase);
  const tailTuft = S(0.12, spotM);
  tailTuft.position.y = -0.52;
  parts.tailG.add(tailTuft);
  group.add(parts.tailG);

  // Udder (4 small pink spheres)
  const udderY = 0.35;
  const udderZ = -0.3;
  [-0.15, -0.05, 0.05, 0.15].forEach(x => {
    const teat = S(0.06, M('#FFB6C1'));
    teat.scale.set(0.8, 1.3, 0.8);
    teat.position.set(x, udderY, udderZ);
    group.add(teat);
  });

  group.userData.parts = parts;
  return group;
}

// Build a horse using primitives - IMPROVED VERSION
export function buildHorse(colorScheme) {
  const g = new THREE.Group();
  const p = { legs: [] };
  const bm = M(colorScheme.body, 0.85, 0);
  const mm = M(colorScheme.mane, 0.9, 0);
  const hm = M(colorScheme.hooves, 0.9, 0);
  const nm = M(colorScheme.nose, 0.8, 0);

  // BODY — large elongated ellipsoid
  const body = S(0.72, bm);
  body.scale.set(2.2, 1.0, 1.1);
  body.castShadow = true;
  body.position.set(0, 1.05, 0);
  g.add(body);

  // RUMP — slightly larger sphere at back
  const rump = S(0.6, bm);
  rump.scale.set(1.1, 1.0, 1.0);
  rump.castShadow = true;
  rump.position.set(-0.55, 1.12, 0);
  g.add(rump);

  // NECK — thick cylinder angled forward and up
  p.neckG = new THREE.Group();
  p.neckG.position.set(0.65, 1.3, 0);
  p.neckG.rotation.z = -0.55; // lean forward
  const neck = CY(0.22, 0.28, 0.75, bm);
  neck.castShadow = true;
  p.neckG.add(neck);

  // Mane along neck
  for(let i = 0; i < 5; i++) {
    const mane = B(0.08, 0.22, 0.38, mm);
    mane.castShadow = true;
    mane.position.set(0.08, 0.15 - i*0.14, 0);
    mane.rotation.z = 0.2;
    p.neckG.add(mane);
  }
  g.add(p.neckG);

  // HEAD GROUP — at top of neck
  p.headG = new THREE.Group();
  p.headG.position.set(1.12, 1.88, 0);
  p.headG.rotation.z = 0.3; // slight forward tilt

  // Skull — rounded box
  const skull = B(0.28, 0.38, 0.52, bm);
  skull.castShadow = true;
  p.headG.add(skull);

  // Long snout — box extending forward
  const snout = B(0.24, 0.28, 0.55, bm);
  snout.castShadow = true;
  snout.position.set(0, -0.06, 0.5);
  p.headG.add(snout);

  // Nose tip — rounded
  const noseTip = S(0.13, nm);
  noseTip.scale.set(1, 0.75, 1.1);
  noseTip.castShadow = true;
  noseTip.position.set(0, -0.1, 0.76);
  p.headG.add(noseTip);

  // Nostrils
  [-0.07, 0.07].forEach(x => {
    const nostril = S(0.04, M('#333'));
    nostril.scale.set(1.2, 0.6, 0.8);
    nostril.position.set(x, -0.14, 0.81);
    p.headG.add(nostril);
  });

  // Eyes — large, on sides of skull
  [-0.15, 0.15].forEach(x => {
    const eyeW = S(0.07, M('#8B6914', 0.5, 0));
    eyeW.position.set(x, 0.1, 0.12);
    p.headG.add(eyeW);
    const pupil = S(0.045, M('#111'));
    pupil.position.set(x, 0.1, 0.16);
    p.headG.add(pupil);
    const shine = S(0.016, M('#fff'));
    shine.position.set(x + 0.02, 0.12, 0.19);
    p.headG.add(shine);
  });

  // Ears — upright pointed
  [-0.1, 0.1].forEach(x => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), bm);
    ear.castShadow = true;
    ear.position.set(x, 0.32, -0.06);
    ear.rotation.z = x > 0 ? -0.15 : 0.15;
    p.headG.add(ear);
    const earI = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), nm);
    earI.position.set(x, 0.32, -0.04);
    earI.rotation.z = x > 0 ? -0.15 : 0.15;
    p.headG.add(earI);
  });

  // Forelock (hair between ears)
  const forelock = B(0.08, 0.2, 0.12, mm);
  forelock.position.set(0, 0.34, 0.04);
  forelock.rotation.x = 0.3;
  p.headG.add(forelock);

  g.add(p.headG);

  // 4 LEGS — long and elegant
  const legPositions = [
    { x:-0.18, z: 0.42, front:true  },
    { x: 0.18, z: 0.42, front:true  },
    { x:-0.18, z:-0.42, front:false },
    { x: 0.18, z:-0.42, front:false },
  ];

  legPositions.forEach(({x, z, front}) => {
    const lg = new THREE.Group();
    lg.position.set(x, 1.0, z);

    // Hip/shoulder joint sphere
    const joint = S(0.14, bm);
    joint.castShadow = true;
    lg.add(joint);

    // Upper leg
    const upper = CY(0.13, 0.11, 0.52, bm);
    upper.castShadow = true;
    upper.position.set(0, -0.3, 0);
    lg.add(upper);

    // Knee
    const knee = S(0.1, bm);
    knee.castShadow = true;
    knee.position.set(0, -0.58, 0);
    lg.add(knee);

    // Lower leg (cannon)
    const lower = CY(0.09, 0.08, 0.52, bm);
    lower.castShadow = true;
    lower.position.set(0, -0.86, 0);
    lg.add(lower);

    // Fetlock
    const fetlock = S(0.09, bm);
    fetlock.castShadow = true;
    fetlock.position.set(0, -1.14, 0);
    lg.add(fetlock);

    // Hoof
    const hoof = CY(0.1, 0.09, 0.14, hm);
    hoof.castShadow = true;
    hoof.position.set(0, -1.24, 0);
    lg.add(hoof);

    g.add(lg);
    p.legs.push(lg);
  });

  // TAIL — flowing
  p.tailG = new THREE.Group();
  p.tailG.position.set(-0.9, 1.2, 0);
  p.tailG.rotation.z = 0.3;

  const tailBase = CY(0.08, 0.06, 0.4, mm);
  tailBase.castShadow = true;
  tailBase.position.set(0, -0.2, 0);
  p.tailG.add(tailBase);

  const tailFlow = S(0.18, mm);
  tailFlow.scale.set(0.9, 2.5, 0.7);
  tailFlow.castShadow = true;
  tailFlow.position.set(0, -0.72, 0);
  p.tailG.add(tailFlow);

  g.add(p.tailG);

  // Ensure all materials are solid
  g.traverse(n => {
    if(n.isMesh) {
      n.material.depthWrite = true;
      n.material.transparent = false;
    }
  });

  g.userData.parts = p;
  g.userData.type = 'horse';
  g.position.y = 0;
  return g;
}

// Cow animation
export function animateCow(cow, state, time) {
  const parts = cow.userData.parts;
  if (!parts) return;

  const { headG, tailG, legs, jawG } = parts;

  if (state === 'graze') {
    // Head down, jaw moves
    headG.rotation.x = -0.6 + Math.sin(time * 2) * 0.1;
    if (jawG) jawG.rotation.x = Math.sin(time * 4) * 0.15;
    // Legs still
    legs.forEach(leg => { leg.rotation.x = 0; });
    // Tail sway
    tailG.rotation.z = Math.sin(time * 1.5) * 0.3;
  }
  else if (state === 'walk') {
    // 4 legs alternate pairs
    legs.forEach((leg, i) => {
      const phase = (i % 2 === 0) ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 2.5 + phase) * 0.4;
    });
    // Head bobs
    headG.position.y = parts.headG.userData.baseY + Math.abs(Math.sin(time * 2.5)) * 0.04;
    headG.rotation.x = Math.sin(time * 2.5) * 0.08;
    // Tail sway
    tailG.rotation.z = Math.sin(time * 2.0) * 0.4;
    // Body rocks
    cow.position.y = cow.userData.baseY + Math.abs(Math.sin(time * 2.5)) * 0.03;
    if (jawG) jawG.rotation.x = 0;
  }
  else if (state === 'idle') {
    // Tail sway
    tailG.rotation.z = Math.sin(time * 1.2) * 0.35;
    // Head turns
    headG.rotation.y = Math.sin(time * 0.8) * 0.2;
    headG.rotation.x = Math.sin(time * 1.5) * 0.05;
    if (jawG) jawG.rotation.x = 0;
  }
  else if (state === 'moo') {
    // Head lifts up
    headG.rotation.x = 0.3;
    tailG.rotation.z = Math.sin(time * 2.0) * 0.4;
    if (jawG) jawG.rotation.x = Math.sin(time * 8) * 0.2;
  }
}

// Horse animation
export function animateHorse(horse, state, time) {
  const parts = horse.userData.parts;
  if (!parts) return;

  const { headG, tailG, legs, neckG } = parts;

  if (state === 'walk') {
    // Diagonal pairs (front-left + back-right together)
    legs.forEach((leg, i) => {
      const phase = (i === 0 || i === 3) ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 3.5 + phase) * 0.6;
    });
    // Head bobs forward-back
    headG.position.z = parts.headG.userData.baseZ + Math.sin(time * 3.5) * 0.08;
    headG.rotation.x = Math.sin(time * 3.5) * 0.1;
    // Tail sways
    tailG.rotation.y = Math.sin(time * 2.5) * 0.4;
    tailG.rotation.x = 0;
    // Neck rocks
    neckG.rotation.x = -0.6 + Math.sin(time * 3.5) * 0.05;
  }
  else if (state === 'gallop') {
    // Faster legs
    legs.forEach((leg, i) => {
      const phase = (i === 0 || i === 3) ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 6.5 + phase) * 1.0;
    });
    // Body pitches forward
    horse.rotation.x = -0.15;
    // Head bobs aggressively
    headG.position.z = parts.headG.userData.baseZ + Math.sin(time * 6.5) * 0.15;
    headG.rotation.x = Math.sin(time * 6.5) * 0.2;
    // Tail streams back
    tailG.rotation.x = -0.5;
    tailG.rotation.y = Math.sin(time * 5.0) * 0.3;
    // Neck rocks
    neckG.rotation.x = -0.7 + Math.sin(time * 6.5) * 0.1;
  }
  else if (state === 'idle') {
    // Weight shift
    horse.rotation.z = Math.sin(time * 0.9) * 0.04;
    // Tail sways
    tailG.rotation.y = Math.sin(time * 1.5) * 0.5;
    tailG.rotation.x = 0;
    // Head turns
    headG.rotation.y = Math.sin(time * 1.2) * 0.15;
    headG.rotation.x = Math.sin(time * 1.8) * 0.08;
    neckG.rotation.x = -0.6;
    horse.rotation.x = 0;
  }
}

// Check if position is valid for herd animals (on grass, not in forbidden zones)
function isValidHerdPosition(x, z) {
  const distFromCenter = Math.sqrt(x * x + z * z);
  // Must be on grass (between 70-200 from center)
  if (distFromCenter < 70 || distFromCenter > 200) return false;

  // Avoid plaza
  if (distFromCenter < 65) return false;

  // Avoid paths
  const PATH_WIDTH = 12;
  if (Math.abs(x) < PATH_WIDTH && Math.abs(z) > 40) return false;
  if (Math.abs(z) < PATH_WIDTH && Math.abs(x) > 40) return false;

  // Avoid buildings
  const buildings = [
    { x: 0, z: -162.6, r: 95 },
    { x: 162.6, z: 0, r: 95 },
    { x: 0, z: 162.6, r: 95 },
    { x: -150, z: 0, r: 95 },
  ];
  for (const b of buildings) {
    const dx = x - b.x;
    const dz = z - b.z;
    if (Math.sqrt(dx * dx + dz * dz) < b.r) return false;
  }

  return true;
}

// Herd state - positions in open grass areas
const cowHerd = {
  animals: [],
  center: new THREE.Vector3(110, 0, -110), // Northeast grass area
  wanderRadius: 15,
  mooCooldown: 0,
  mooInterval: 30,
  lastMooIndex: -1,
};

const horseHerd = {
  animals: [],
  center: new THREE.Vector3(-110, 0, 110), // Southwest grass area
  wanderRadius: 20,
  gallopCooldown: 0,
  gallopDuration: 0,
  gallopingHorse: -1,
};

let _scene = null;

// Initialize herd system
export function initHerdSystem(scene) {
  _scene = scene;

  console.log('[herd] 🐄🐴 Spawning herds...');

  let cowCount = 0;
  let horseCount = 0;

  // Spawn 7 cows
  for (let i = 0; i < 7; i++) {
    const colors = COW_COLORS[i % COW_COLORS.length];
    const cow = buildCow(colors);

    // Find valid position near herd center
    let validPos = false;
    let attempts = 0;
    let x, z;
    while (!validPos && attempts < 30) {
      x = cowHerd.center.x + (Math.random() - 0.5) * 20;
      z = cowHerd.center.z + (Math.random() - 0.5) * 20;
      validPos = isValidHerdPosition(x, z);
      attempts++;
    }

    if (!validPos) {
      x = cowHerd.center.x;
      z = cowHerd.center.z;
    }

    cow.position.set(x, 0, z);

    // Ensure all meshes are solid
    cow.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.depthWrite = true;
        child.material.transparent = false;
        child.renderOrder = 0;
      }
    });

    cow.userData.type = 'cow';
    cow.userData.animState = 'idle';
    cow.userData.animT = 0;
    cow.userData.speed = 0.008;
    cow.userData.baseY = 0;
    cow.userData.radius = 1.1;
    cow.userData.collider = true;
    cow.userData.grazeCooldown = Math.random() * 3 + 2;
    cow.userData.grazeTimer = 0;
    cow.userData.velocity = new THREE.Vector2((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
    cow.userData.parts.headG.userData.baseY = cow.userData.parts.headG.position.y;

    scene.add(cow);
    cowHerd.animals.push(cow);
    cowCount++;
  }

  // Spawn 4 horses
  for (let i = 0; i < 4; i++) {
    const colors = HORSE_COLORS[i % HORSE_COLORS.length];
    const horse = buildHorse(colors);

    // Find valid position near herd center
    let validPos = false;
    let attempts = 0;
    let x, z;
    while (!validPos && attempts < 30) {
      x = horseHerd.center.x + (Math.random() - 0.5) * 30;
      z = horseHerd.center.z + (Math.random() - 0.5) * 30;
      validPos = isValidHerdPosition(x, z);
      attempts++;
    }

    if (!validPos) {
      x = horseHerd.center.x;
      z = horseHerd.center.z;
    }

    horse.position.set(x, 0, z);

    // Ensure all meshes are solid
    horse.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.depthWrite = true;
        child.material.transparent = false;
        child.renderOrder = 0;
      }
    });

    horse.userData.type = 'horse';
    horse.userData.animState = 'walk';
    horse.userData.animT = 0;
    horse.userData.speed = 0.035;
    horse.userData.baseY = 0;
    horse.userData.radius = 1.3;
    horse.userData.collider = true;
    horse.userData.velocity = new THREE.Vector2((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.04);
    horse.userData.parts.headG.userData.baseZ = horse.userData.parts.headG.position.z;

    scene.add(horse);
    horseHerd.animals.push(horse);
    horseCount++;
  }

  console.log(`[herd] Cows: ${cowCount} | Horses: ${horseCount}`);
  console.log('[herd] All spawned on valid grass positions');
}

// Update herd system
export function updateHerdSystem(delta) {
  if (!cowHerd.animals.length && !horseHerd.animals.length) return;

  // Use safe delta
  const safeDelta = Math.min(delta || 0.016, 0.05);

  // Update cows
  cowHerd.animals.forEach((cow, index) => {
    cow.userData.animT += safeDelta;

    // Grazing behavior
    cow.userData.grazeCooldown -= safeDelta;
    if (cow.userData.grazeCooldown <= 0 && cow.userData.animState !== 'graze') {
      // Start grazing
      cow.userData.animState = 'graze';
      cow.userData.grazeTimer = 2 + Math.random() * 2;
      cow.userData.grazeCooldown = 999; // Reset after grazing ends
    }

    if (cow.userData.animState === 'graze') {
      cow.userData.grazeTimer -= safeDelta;
      if (cow.userData.grazeTimer <= 0) {
        cow.userData.animState = 'walk';
        cow.userData.grazeCooldown = 3 + Math.random() * 2;
      }
    }

    // Movement (only when not grazing)
    if (cow.userData.animState !== 'graze' && cow.userData.animState !== 'moo') {
      // Check distance from herd center
      const dx = cow.position.x - cowHerd.center.x;
      const dz = cow.position.z - cowHerd.center.z;
      const distFromCenter = Math.sqrt(dx * dx + dz * dz);

      // If too far, turn back
      if (distFromCenter > cowHerd.wanderRadius) {
        cow.userData.velocity.x -= dx * 0.0002;
        cow.userData.velocity.y -= dz * 0.0002;
      }

      // Cohesion - steer toward nearby cows
      let avgX = 0, avgZ = 0, count = 0;
      cowHerd.animals.forEach(other => {
        if (other === cow) return;
        const odx = other.position.x - cow.position.x;
        const odz = other.position.z - cow.position.z;
        const dist = Math.sqrt(odx * odx + odz * odz);
        if (dist < 5) {
          avgX += other.position.x;
          avgZ += other.position.z;
          count++;
        }
      });
      if (count > 0) {
        avgX /= count;
        avgZ /= count;
        cow.userData.velocity.x += (avgX - cow.position.x) * 0.00005;
        cow.userData.velocity.y += (avgZ - cow.position.z) * 0.00005;
      }

      // Separation - avoid too close cows
      cowHerd.animals.forEach(other => {
        if (other === cow) return;
        const odx = other.position.x - cow.position.x;
        const odz = other.position.z - cow.position.z;
        const dist = Math.sqrt(odx * odx + odz * odz);
        if (dist < 1.2 && dist > 0.01) {
          cow.userData.velocity.x -= odx * 0.0005;
          cow.userData.velocity.y -= odz * 0.0005;
        }
      });

      // Apply velocity
      cow.position.x += cow.userData.velocity.x;
      cow.position.z += cow.userData.velocity.y;

      // Rotate to face movement
      if (cow.userData.velocity.length() > 0.001) {
        const targetAngle = Math.atan2(cow.userData.velocity.x, cow.userData.velocity.y);
        cow.rotation.y = targetAngle;
      }

      // Damping
      cow.userData.velocity.multiplyScalar(0.98);
    }

    // Moo behavior
    if (cow.userData.animState === 'moo') {
      cow.userData.mooTimer -= safeDelta;
      if (cow.userData.mooTimer <= 0) {
        cow.userData.animState = 'walk';
      }
    }

    // FORCE Y position to ground level (fix clipping through floor)
    cow.position.y = 0;

    // Animate
    animateCow(cow, cow.userData.animState, cow.userData.animT);
  });

  // Moo cooldown
  cowHerd.mooCooldown -= safeDelta;
  if (cowHerd.mooCooldown <= 0) {
    const mooIndex = Math.floor(Math.random() * cowHerd.animals.length);
    const cow = cowHerd.animals[mooIndex];
    if (cow.userData.animState !== 'graze') {
      cow.userData.animState = 'moo';
      cow.userData.mooTimer = 1;
      console.log('[cow] Moooo! 🐄');
    }
    cowHerd.mooCooldown = cowHerd.mooInterval;
  }

  // Update horses
  horseHerd.animals.forEach((horse, index) => {
    horse.userData.animT += safeDelta;

    // Gallop behavior
    if (horseHerd.gallopDuration > 0) {
      // Currently galloping
      if (index === horseHerd.gallopingHorse || Math.random() < 0.3) {
        horse.userData.animState = 'gallop';
        horse.userData.speed = 0.12;
      }
    } else {
      horse.userData.animState = 'walk';
      horse.userData.speed = 0.035;
    }

    // Movement
    if (horse.userData.animState !== 'idle') {
      // Check distance from herd center
      const dx = horse.position.x - horseHerd.center.x;
      const dz = horse.position.z - horseHerd.center.z;
      const distFromCenter = Math.sqrt(dx * dx + dz * dz);

      // If too far, turn back
      if (distFromCenter > horseHerd.wanderRadius) {
        horse.userData.velocity.x -= dx * 0.0003;
        horse.userData.velocity.y -= dz * 0.0003;
      }

      // Loose formation - less tight than cows
      horseHerd.animals.forEach(other => {
        if (other === horse) return;
        const odx = other.position.x - horse.position.x;
        const odz = other.position.z - horse.position.z;
        const dist = Math.sqrt(odx * odx + odz * odz);
        if (dist < 2.0 && dist > 0.01) {
          horse.userData.velocity.x -= odx * 0.0003;
          horse.userData.velocity.y -= odz * 0.0003;
        }
      });

      // Apply velocity
      const speed = horse.userData.speed;
      const moveLen = horse.userData.velocity.length();
      if (moveLen > 0) {
        horse.userData.velocity.normalize();
        horse.position.x += horse.userData.velocity.x * speed;
        horse.position.z += horse.userData.velocity.y * speed;

        // Rotate to face movement
        const targetAngle = Math.atan2(horse.userData.velocity.x, horse.userData.velocity.y);
        horse.rotation.y = targetAngle;
      }

      // Random direction change
      if (Math.random() < 0.01) {
        horse.userData.velocity.x += (Math.random() - 0.5) * 0.1;
        horse.userData.velocity.y += (Math.random() - 0.5) * 0.1;
      }
    }

    // FORCE Y position to ground level (fix clipping through floor)
    horse.position.y = 0;

    // Animate
    animateHorse(horse, horse.userData.animState, horse.userData.animT);
  });

  // Gallop cooldown
  if (horseHerd.gallopDuration > 0) {
    horseHerd.gallopDuration -= safeDelta;
    if (horseHerd.gallopDuration <= 0) {
      horseHerd.gallopCooldown = 15 + Math.random() * 10;
    }
  } else {
    horseHerd.gallopCooldown -= safeDelta;
    if (horseHerd.gallopCooldown <= 0) {
      // Start galloping
      horseHerd.gallopingHorse = Math.floor(Math.random() * horseHerd.animals.length);
      horseHerd.gallopDuration = 4 + Math.random() * 2;
      console.log('[horse] 🐴 Galloping!');
    }
  }
}

// Export function to get all herd animals (for player collision check)
export function getHerdAnimals() {
  return [...cowHerd.animals, ...horseHerd.animals];
}
