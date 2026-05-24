import * as THREE from 'three';
import { getSurfaceY } from '../systems/terrain.js';

const ISLAND_R  = 228;
const DOG_SPEED = 1.5;

const DOG_CONFIGS = [
  { color: 0xF0EBE0, x: -70, z: -30 },  // cream/white
  { color: 0xC8A96E, x:  50, z:  85 },  // golden
  { color: 0x2E2319, x: -80, z:  35 },  // dark brown
];

const dogs = [];

// ── Public ────────────────────────────────────────────────────────────

export function initDogs(scene) {
  DOG_CONFIGS.forEach(cfg => {
    const dog = buildDog(cfg.color);
    dog.group.position.set(cfg.x, getSurfaceY(cfg.x, cfg.z), cfg.z);
    dog.home.set(cfg.x, 0, cfg.z);
    scene.add(dog.group);
    dogs.push(dog);
  });
}

export function updateDogs(delta, time) {
  dogs.forEach(dog => updateDog(dog, delta, time));
}

// ── Per-dog state machine ─────────────────────────────────────────────

function updateDog(dog, delta, time) {
  dog.tail.rotation.y = Math.sin(time * 4.5 + dog.phase) * 0.7;

  if (dog.state === 'sitting') {
    dog.sitTimer -= delta;
    if (dog.sitTimer <= 0) startWalking(dog);
    return;
  }

  const pos    = dog.group.position;
  const dx     = dog.target.x - pos.x;
  const dz     = dog.target.z - pos.z;
  const distSq = dx * dx + dz * dz;

  if (distSq < 1.5) {
    dog.state    = 'sitting';
    dog.sitTimer = 1.5 + Math.random() * 4;
    return;
  }

  const dist = Math.sqrt(distSq);
  pos.x += (dx / dist) * DOG_SPEED * delta * dog.speedMult;
  pos.z += (dz / dist) * DOG_SPEED * delta * dog.speedMult;

  // Keep dog on the terrain surface
  pos.y = getSurfaceY(pos.x, pos.z);

  dog.group.rotation.y = Math.atan2(dx, dz);

  const bob = Math.sin(time * 9 * dog.speedMult) * 0.05;
  dog.legFL.position.y = -0.16 + bob;
  dog.legBR.position.y = -0.16 + bob;
  dog.legFR.position.y = -0.16 - bob;
  dog.legBL.position.y = -0.16 - bob;
  pos.y += Math.abs(bob) * 0.4;
}

function startWalking(dog) {
  dog.state = 'walking';
  let tx, tz, tries = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const r     = 20 + Math.random() * 65;
    tx = dog.home.x + Math.cos(angle) * r;
    tz = dog.home.z + Math.sin(angle) * r;
    tries++;
    // Keep dogs away from the plaza interior
  } while ((tx * tx + tz * tz > ISLAND_R * ISLAND_R ||
            (Math.abs(tx) < 38 && Math.abs(tz) < 38)) && tries < 20);
  dog.target.set(tx, 0, tz);
}

// ── Build dog mesh ────────────────────────────────────────────────────

function buildDog(color) {
  const bodyMat   = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.0 });
  const eyeMat    = new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.6 });
  const noseMat   = new THREE.MeshStandardMaterial({ color: 0x2A1A1A, roughness: 0.9 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0xFF6B8A, roughness: 0.9 });

  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.38, 4, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.22, 0);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), bodyMat);
  head.scale.set(1.15, 0.9, 1.0);
  head.position.set(0, 0.34, 0.34);
  head.castShadow = true;
  group.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.14), bodyMat);
  snout.position.set(0, 0.28, 0.49);
  group.add(snout);

  const earGeo = new THREE.BoxGeometry(0.09, 0.17, 0.13);
  [-0.14, 0.14].forEach(ex => {
    const ear = new THREE.Mesh(earGeo, bodyMat);
    ear.position.set(ex, 0.34, 0.29);
    ear.rotation.z = ex > 0 ? -0.45 : 0.45;
    ear.castShadow = true;
    group.add(ear);
  });

  const eyeGeo = new THREE.SphereGeometry(0.033, 6, 5);
  [-0.07, 0.07].forEach(ex => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.38, 0.46);
    group.add(eye);
  });

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), noseMat);
  nose.position.set(0, 0.29, 0.56);
  group.add(nose);

  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.08), tongueMat);
  tongue.position.set(0, 0.255, 0.56);
  tongue.rotation.x = 0.35;
  group.add(tongue);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 0.24, 6), bodyMat);
  tail.position.set(0, 0.36, -0.38);
  tail.rotation.x = -1.1;
  tail.castShadow = true;
  group.add(tail);

  const legGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 6);
  const legFL  = mkLeg(group, legGeo, bodyMat,  0.11, -0.16,  0.20);
  const legFR  = mkLeg(group, legGeo, bodyMat, -0.11, -0.16,  0.20);
  const legBL  = mkLeg(group, legGeo, bodyMat,  0.11, -0.16, -0.20);
  const legBR  = mkLeg(group, legGeo, bodyMat, -0.11, -0.16, -0.20);

  return {
    group, tail, legFL, legFR, legBL, legBR,
    state:     'sitting',
    sitTimer:  Math.random() * 3,
    target:    new THREE.Vector3(),
    home:      new THREE.Vector3(),
    speedMult: 0.85 + Math.random() * 0.55,
    phase:     Math.random() * Math.PI * 2,
  };
}

function mkLeg(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
