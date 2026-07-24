import * as THREE from 'three';

// Helper functions (matching CharacterBuilder.js pattern)
const M = (c, r=0.85, m=0.0) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});

function B(w,h,d,mat) { const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); x.castShadow=true; return x; }
function S(r,mat) { const x=new THREE.Mesh(new THREE.SphereGeometry(r,20,16),mat); x.castShadow=true; return x; }
function CY(rt,rb,h,mat) { const x=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,14),mat); x.castShadow=true; return x; }
function CO(r,h,seg,mat) { const x=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat); x.castShadow=true; return x; }

// Animal color schemes (round-cute set: body / dark shade / light belly-muzzle / iris color)
const DOG_COLORS = [
  { body:'#DCAE63', dark:'#A67C3B', lite:'#F3E2C0', eye:'#5B3A1E', nose:'#26211C', tongue:true  },
  { body:'#7A4F2E', dark:'#56371F', lite:'#C9A784', eye:'#5B3A1E', nose:'#26211C', tongue:false },
  { body:'#9AA5B1', dark:'#6C7580', lite:'#D3DAE1', eye:'#3A6FA8', nose:'#26211C', tongue:false },
  { body:'#2F3338', dark:'#202327', lite:'#6A7078', eye:'#C9932F', nose:'#111111', tongue:true  },
  { body:'#EFE3C8', dark:'#C9B896', lite:'#FBF5E8', eye:'#5B3A1E', nose:'#26211C', tongue:false },
];

const CAT_COLORS = [
  { body:'#E08A3F', dark:'#B0641F', lite:'#F5D9B8', eye:'#2F9E63', nose:'#D8798F' },
  { body:'#99A0AB', dark:'#6F7681', lite:'#D6DAE0', eye:'#2F9E63', nose:'#D8798F' },
  { body:'#2C2F36', dark:'#1E2126', lite:'#62666E', eye:'#D6B52F', nose:'#B06070' },
  { body:'#F3F0E9', dark:'#CFC9BD', lite:'#FFFFFF', eye:'#3A7FC4', nose:'#D8798F' },
  { body:'#B5854F', dark:'#8A6234', lite:'#E3C79F', eye:'#2F9E63', nose:'#D8798F' },
];

// Comic-style speech bubble sprite ("Waff Waff!" / "Meow Meow!")
function makeSpeechBubble(text) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = '#ffffff';
  x.strokeStyle = '#3a3a3a';
  x.lineWidth = 5;
  const r = 24, L = 10, T = 10, R = 246, Bm = 86;
  x.beginPath();
  x.moveTo(L + r, T);
  x.lineTo(R - r, T); x.quadraticCurveTo(R, T, R, T + r);
  x.lineTo(R, Bm - r); x.quadraticCurveTo(R, Bm, R - r, Bm);
  x.lineTo(150, Bm); x.lineTo(126, 116); x.lineTo(112, Bm);
  x.lineTo(L + r, Bm); x.quadraticCurveTo(L, Bm, L, Bm - r);
  x.lineTo(L, T + r); x.quadraticCurveTo(L, T, L + r, T);
  x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#3a3a3a';
  x.font = 'bold 34px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 128, 48);

  const tex = new THREE.CanvasTexture(cv);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.renderOrder = 999;
  sprite.visible = false;
  return sprite;
}

// Round expressive eyes: white backing + colored iris + pupil + shine (visible on dark fur too)
function addRoundEyes(headG, eyeColor, x, y, z, s, slitPupil) {
  [-x, x].forEach(xx => {
    const white = S(0.085 * s, M('#F6F3EC'));
    white.scale.set(1, 1, 0.72);
    white.position.set(xx, y, z);
    headG.add(white);

    const iris = S(0.052 * s, M(eyeColor));
    iris.position.set(xx, y, z + 0.045 * s);
    headG.add(iris);

    if (slitPupil) {
      const pupil = B(0.026 * s, 0.085 * s, 0.02, M('#111'));
      pupil.position.set(xx, y, z + 0.082 * s);
      headG.add(pupil);
    } else {
      const pupil = S(0.021 * s, M('#111'));
      pupil.position.set(xx, y, z + 0.085 * s);
      headG.add(pupil);
    }

    const shine = S(0.018 * s, M('#fff'));
    shine.position.set(xx + 0.028 * s, y + 0.03 * s, z + 0.09 * s);
    headG.add(shine);
  });
}

// Build a dog using primitives (round-cute version, faces +Z, hip pivots at y=0.4)
export function buildDog(colors) {
  const group = new THREE.Group();
  const parts = { legs: [], ears: [] };

  const bodyM = M(colors.body);
  const darkM = M(colors.dark);
  const liteM = M(colors.lite);

  // Body - round elongated sphere
  const body = S(0.42, bodyM);
  body.scale.set(1.0, 0.95, 1.4);
  body.position.y = 0.62;
  group.add(body);

  // Chest patch (lighter)
  const chest = S(0.26, liteM);
  chest.scale.set(0.95, 0.9, 1.0);
  chest.position.set(0, 0.5, 0.42);
  group.add(chest);

  // Head group
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 0.98, 0.55);

  // Head sphere (big and round = cute)
  const head = S(0.34, bodyM);
  parts.headG.add(head);

  // Muzzle (lighter color)
  const muzzle = S(0.18, liteM);
  muzzle.scale.set(1.25, 0.85, 1.2);
  muzzle.position.set(0, -0.1, 0.26);
  parts.headG.add(muzzle);

  // Nose
  const nose = S(0.07, M(colors.nose));
  nose.position.set(0, -0.05, 0.44);
  parts.headG.add(nose);

  // Eyes (white-backed, colored iris, shine)
  addRoundEyes(parts.headG, colors.eye, 0.155, 0.09, 0.26, 1.1, false);

  // Big floppy ears (pivoted so they can bounce while walking)
  [-0.26, 0.26].forEach((x, i) => {
    const earG = new THREE.Group();
    earG.position.set(x, 0.26, -0.02);
    const ear = S(0.17, darkM);
    ear.scale.set(0.55, 1.7, 0.9);
    ear.position.set(0, -0.24, 0.02);
    earG.add(ear);
    earG.rotation.z = i === 0 ? 0.55 : -0.55;
    earG.userData.baseZ = earG.rotation.z;
    parts.ears.push(earG);
    parts.headG.add(earG);
  });

  // Tongue (only some dogs — pants while walking)
  if (colors.tongue) {
    const tongue = S(0.07, M('#E86A8A'));
    tongue.scale.set(0.9, 0.5, 1.3);
    tongue.position.set(0, -0.2, 0.34);
    tongue.rotation.x = 0.2;
    parts.tongue = tongue;
    parts.headG.add(tongue);
  }

  group.add(parts.headG);

  // 4 Legs (hip pivots at y=0.4 — matches behavior code expectations)
  const legPositions = [
    { x: -0.26, z: 0.24 },
    { x: 0.26, z: 0.24 },
    { x: -0.26, z: -0.24 },
    { x: 0.26, z: -0.24 },
  ];

  legPositions.forEach(({ x, z }) => {
    const legG = new THREE.Group();
    legG.position.set(x, 0.4, z);

    const leg = CY(0.1, 0.092, 0.34, bodyM);
    leg.position.y = -0.17;
    legG.add(leg);

    const paw = S(0.11, darkM);
    paw.position.y = -0.36;
    legG.add(paw);

    parts.legs.push(legG);
    group.add(legG);
  });

  // Tail (points back-up, wags on rotation.y)
  parts.tailG = new THREE.Group();
  parts.tailG.position.set(0, 0.78, -0.5);
  const tail = CY(0.055, 0.04, 0.42, darkM);
  tail.rotation.x = -0.85;
  tail.position.set(0, 0.12, -0.12);
  parts.tailG.add(tail);
  const tip = S(0.075, darkM);
  tip.position.set(0, 0.27, -0.28);
  parts.tailG.add(tip);
  group.add(parts.tailG);

  // Dogs are significantly bigger than cats
  group.scale.setScalar(1.5);

  // Ensure all meshes are solid
  group.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.depthWrite = true;
      child.material.transparent = false;
      child.renderOrder = 0;
    }
  });

  // Speech bubble (added after the solid-material pass — must stay transparent)
  parts.bubble = makeSpeechBubble('Waff Waff!');
  parts.bubble.position.set(0, 1.9, 0.2);
  parts.bubble.scale.set(1.5, 0.75, 1);
  group.add(parts.bubble);

  group.userData.parts = parts;
  return group;
}

// Build a cat using primitives (round-cute version, faces +Z, hip pivots at y=0.35)
export function buildCat(colors) {
  const group = new THREE.Group();
  const parts = { legs: [], ears: [] };

  const bodyM = M(colors.body);
  const darkM = M(colors.dark);
  const liteM = M(colors.lite);

  // Body - round elongated sphere
  const body = S(0.32, bodyM);
  body.scale.set(1.0, 0.95, 1.4);
  body.position.y = 0.5;
  group.add(body);

  // Belly patch
  const belly = S(0.18, liteM);
  belly.position.set(0, 0.4, 0.32);
  group.add(belly);

  // Head group
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 0.82, 0.42);

  // Head sphere
  const head = S(0.27, bodyM);
  head.scale.set(1, 0.95, 1);
  parts.headG.add(head);

  // Muzzle (lighter)
  const muzzle = S(0.13, liteM);
  muzzle.scale.set(1.25, 0.8, 1.1);
  muzzle.position.set(0, -0.09, 0.2);
  parts.headG.add(muzzle);

  // Pink nose
  const nose = S(0.045, M(colors.nose));
  nose.position.set(0, -0.04, 0.315);
  parts.headG.add(nose);

  // Eyes (white-backed, colored iris, vertical slit pupil)
  addRoundEyes(parts.headG, colors.eye, 0.12, 0.06, 0.21, 0.95, true);

  // Pointy ears with pink inner (pivoted for subtle bounce)
  [-0.15, 0.15].forEach((x, i) => {
    const earG = new THREE.Group();
    earG.position.set(x, 0.24, -0.02);
    const ear = CO(0.11, 0.24, 14, bodyM);
    ear.position.y = 0.1;
    earG.add(ear);
    const inner = CO(0.055, 0.13, 12, M('#E8A4B4'));
    inner.position.set(0, 0.09, 0.03);
    earG.add(inner);
    earG.rotation.z = i === 0 ? -0.12 : 0.12;
    earG.userData.baseZ = earG.rotation.z;
    parts.ears.push(earG);
    parts.headG.add(earG);
  });

  // Whiskers (6 thin boxes)
  [
    { x: -0.16, y: -0.04, z: 0.22, rot: 0.4 },
    { x: -0.16, y: -0.07, z: 0.22, rot: 0 },
    { x: -0.16, y: -0.1, z: 0.22, rot: -0.4 },
    { x: 0.16, y: -0.04, z: 0.22, rot: -0.4 },
    { x: 0.16, y: -0.07, z: 0.22, rot: 0 },
    { x: 0.16, y: -0.1, z: 0.22, rot: 0.4 },
  ].forEach(({ x, y, z, rot }) => {
    const whisker = B(0.22, 0.008, 0.008, M('#333'));
    whisker.position.set(x, y, z);
    whisker.rotation.y = rot;
    parts.headG.add(whisker);
  });

  group.add(parts.headG);

  // 4 Slender legs (hip pivots at y=0.35 — matches behavior code expectations)
  const legPositions = [
    { x: -0.2, z: 0.19 },
    { x: 0.2, z: 0.19 },
    { x: -0.2, z: -0.19 },
    { x: 0.2, z: -0.19 },
  ];

  legPositions.forEach(({ x, z }) => {
    const legG = new THREE.Group();
    legG.position.set(x, 0.35, z);

    const leg = CY(0.075, 0.068, 0.3, bodyM);
    leg.position.y = -0.15;
    legG.add(leg);

    const paw = S(0.085, darkM);
    paw.position.y = -0.31;
    legG.add(paw);

    parts.legs.push(legG);
    group.add(legG);
  });

  // Curved upright tail (wags on rotation.y)
  parts.tailG = new THREE.Group();
  parts.tailG.position.set(0, 0.55, -0.42);

  const tail1 = CY(0.05, 0.042, 0.34, darkM);
  tail1.rotation.x = -0.9;
  tail1.position.set(0, 0.1, -0.12);
  parts.tailG.add(tail1);

  const tail2 = CY(0.04, 0.034, 0.3, darkM);
  tail2.rotation.x = -0.35;
  tail2.position.set(0, 0.32, -0.24);
  parts.tailG.add(tail2);

  const tip = S(0.055, darkM);
  tip.position.set(0, 0.46, -0.27);
  parts.tailG.add(tip);

  group.add(parts.tailG);

  // Cats are noticeably smaller than dogs
  group.scale.setScalar(0.8);

  // Ensure all meshes are solid
  group.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.depthWrite = true;
      child.material.transparent = false;
      child.renderOrder = 0;
    }
  });

  // Speech bubble (added after the solid-material pass — must stay transparent)
  parts.bubble = makeSpeechBubble('Meow Meow!');
  parts.bubble.position.set(0, 1.7, 0.15);
  parts.bubble.scale.set(1.8, 0.9, 1);
  group.add(parts.bubble);

  group.userData.parts = parts;
  return group;
}

// Animate animal based on state
export function animateAnimal(animal, type, time) {
  const parts = animal.userData.parts;
  if (!parts) return;

  const { headG, tailG, legs, ears, tongue } = parts;
  const isCat = animal.userData.type === 'cat';

  // Tongue pants gently in every state (dogs that have one)
  if (tongue) {
    tongue.scale.y = 0.5 + Math.sin(time * 9) * 0.09;
    tongue.position.y = -0.2 + Math.sin(time * 9) * 0.012;
  }

  if (type === 'idle') {
    // Tail wag
    tailG.rotation.y = Math.sin(time * 2.5) * 0.5;
    // Head bob
    headG.position.y = headG.userData.baseY + Math.sin(time * 1.5) * 0.02;
    headG.rotation.x = 0;
    headG.rotation.y = 0;
    // Body slight up/down
    animal.position.y = animal.userData.baseY + Math.sin(time * 1.2) * 0.03;
    // Ears settle
    if (ears) ears.forEach(e => { e.rotation.x = 0; e.rotation.z = e.userData.baseZ; });
  }
  else if (type === 'walk') {
    // 4 legs swing alternating pairs
    legs.forEach((leg, i) => {
      const phase = (i % 2 === 0) ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 4.5 + phase) * 0.55;
    });
    // Tail wag
    tailG.rotation.y = Math.sin(time * 3.0) * 0.5;
    // Head bob
    headG.position.y = headG.userData.baseY + Math.abs(Math.sin(time * 4.5)) * 0.05;
    headG.rotation.x = 0;
    headG.rotation.y = 0;
    // Ears bounce with the stride
    if (ears) ears.forEach(e => {
      e.rotation.x = Math.sin(time * 4.5 + 0.5) * (isCat ? 0.06 : 0.14);
      e.rotation.z = e.userData.baseZ;
    });
  }
  else if (type === 'run') {
    // Faster leg swing
    legs.forEach((leg, i) => {
      const phase = (i % 2 === 0) ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 7 + phase) * 0.85;
    });
    // Tail wag faster
    tailG.rotation.y = Math.sin(time * 4.5) * 0.7;
    // Head tilts forward
    headG.rotation.x = -0.15;
    headG.rotation.y = 0;
    headG.position.y = headG.userData.baseY + Math.abs(Math.sin(time * 7)) * 0.08;
    // Ears flap back while running
    if (ears) ears.forEach(e => {
      e.rotation.x = -0.2 + Math.sin(time * 7) * (isCat ? 0.08 : 0.18);
      e.rotation.z = e.userData.baseZ;
    });
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
    // Tail wag
    tailG.rotation.y = Math.sin(time * 2.2) * 0.4;

    if (isCat) {
      // Cats groom while sitting: half scratch (hind leg), half fur-licking (head dips)
      const scratcher = (animal.id % 2) === 0;
      if (scratcher && legs[3]) {
        // Hind leg scratches quickly near the head, head turns toward it
        legs[3].rotation.x = -0.4 + Math.sin(time * 14) * 0.35;
        headG.rotation.y = -0.7;
        headG.rotation.x = 0.12 + Math.sin(time * 14) * 0.04;
        headG.rotation.z = 0;
      } else {
        // Licking fur: head dips toward the chest in a steady rhythm, front paw raised
        headG.rotation.x = 0.28 + Math.sin(time * 5) * 0.13;
        headG.rotation.y = 0.25 + Math.sin(time * 5) * 0.06;
        headG.rotation.z = 0;
        if (legs[0]) legs[0].rotation.x = -0.5 + Math.sin(time * 5) * 0.1;
      }
    } else {
      // Dogs: curious head tilt (and the tongue keeps panting above)
      headG.rotation.x = 0;
      headG.rotation.y = 0;
      headG.rotation.z = Math.sin(time * 1.8) * 0.15;
      if (ears) ears.forEach(e => {
        e.rotation.x = Math.sin(time * 2.2) * 0.08;
        e.rotation.z = e.userData.baseZ;
      });
    }
  }
}

// Show/hide the animal's speech bubble ("Waff Waff!" / "Meow Meow!")
function setBubbleVisible(animal, visible) {
  const parts = animal.userData.parts;
  if (parts && parts.bubble) parts.bubble.visible = visible;
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

  // Spawn 2 dogs (heavily reduced for performance)
  for (let i = 0; i < 2; i++) {
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
    dog.userData.radius = 0.9; // dogs are bigger now
    dog.userData.collider = true;
    dog.userData.parts.headG.userData.baseY = dog.userData.parts.headG.position.y;

    scene.add(dog);
    _animals.push(dog);
    dogCount++;
  }

  // Spawn 2 cats (heavily reduced for performance)
  for (let i = 0; i < 2; i++) {
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
    cat.userData.radius = 0.5;
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
        setBubbleVisible(animal, true); // "Waff Waff!" / "Meow Meow!"
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
      // Sit next to the player for 20 seconds (shorter if player is running)
      const sitTime = isPlayerRunning() ? (2 + Math.random() * 3) : 20;
      animal.userData.sitTimer = sitTime;
      return;
    }

    // If player running, get scared
    if (isPlayerRunning() && distToPlayer < 5) {
      animal.userData.behaviorState = 'run_away';
      animal.userData.animState = 'run';
      animal.userData.speed = animal.userData.runSpeed;
      animal.userData.stateTimer = 2;
      setBubbleVisible(animal, false);
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
      setBubbleVisible(animal, false); // done talking, moving on
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