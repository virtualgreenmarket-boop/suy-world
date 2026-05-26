import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getSurfaceY } from '../systems/terrain.js';

const ISLAND_R    = 228;
const WALK_SPEED  = 0.38;

const CAT_SPOTS = [
  { x:  65, z: -75 },
  { x: -55, z:  70 },
  { x:  90, z:  45 },
  { x: -80, z:  60 },
  { x:  50, z: -110 },
];

const HEN_SPOTS = [
  { x:  40, z:  95 },
  { x: -65, z: -55 },
  { x:  85, z: -30 },
];

const CAT_URL   = '/models/nature/animals/porcelain_toy___kitten.glb';
const HEN_URL   = '/models/nature/animals/handpainted_rooster_and_hen.glb';
const CAT_H     = 0.48;   // normalised height in metres
const HEN_H     = 0.55;

const _loader = new GLTFLoader();
const _animals = [];

export function initCats(scene) {
  _loadAndPlace(scene, CAT_URL, CAT_H, CAT_SPOTS, WALK_SPEED);
  _loadAndPlace(scene, HEN_URL, HEN_H, HEN_SPOTS, 0.30);
}

export function updateCats(delta, time) {
  for (const a of _animals) _updateAnimal(a, delta, time);
}

// ── loader ────────────────────────────────────────────────────────────

function _loadAndPlace(scene, url, targetH, spots, speed) {
  _loader.load(url, gltf => {
    const tmpl = gltf.scene;
    tmpl.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

    const box = new THREE.Box3().setFromObject(tmpl);
    const h   = Math.max(box.max.y - box.min.y, 0.001);
    const sc  = targetH / h;

    const clips  = gltf.animations ?? [];
    const idleClip = clips.find(c => {
      const n = c.name.toLowerCase();
      return n.includes('idle') || n.includes('stand') || n.includes('breathe');
    }) ?? clips[0] ?? null;
    const walkClip = clips.find(c => {
      const n = c.name.toLowerCase();
      return n.includes('walk') || n.includes('run');
    }) ?? null;

    for (const spot of spots) {
      const inst = tmpl.clone(true);
      inst.scale.setScalar(sc);
      const sy = getSurfaceY(spot.x, spot.z);
      // Offset so the bottom of the bounding box sits on the surface
      const floorOffset = -box.min.y * sc;
      inst.position.set(spot.x, sy + floorOffset, spot.z);
      inst.rotation.y = Math.random() * Math.PI * 2;
      scene.add(inst);

      const mixer = new THREE.AnimationMixer(inst);
      let idleAction = null, walkAction = null;
      if (idleClip) { idleAction = mixer.clipAction(idleClip); idleAction.play(); }
      if (walkClip) { walkAction = mixer.clipAction(walkClip); }

      _animals.push({
        group: inst,
        mixer,
        idleAction, walkAction,
        floorOffset,
        home:      new THREE.Vector3(spot.x, 0, spot.z),
        target:    new THREE.Vector3(spot.x, 0, spot.z),
        state:     'sitting',
        sitTimer:  4 + Math.random() * 8,
        speed,
        speedMult: 0.85 + Math.random() * 0.30,
        phase:     Math.random() * Math.PI * 2,
        hasAnim:   !!idleClip,
      });
    }
  }, undefined, err => {
    console.warn('[animals] failed to load', url, err?.message ?? err);
  });
}

// ── per-frame ─────────────────────────────────────────────────────────

function _updateAnimal(a, delta, time) {
  a.mixer.update(delta);

  if (a.state === 'sitting') {
    a.sitTimer -= delta;
    if (a.sitTimer <= 0) _startWalking(a);
    return;
  }

  const pos    = a.group.position;
  const dx     = a.target.x - pos.x;
  const dz     = a.target.z - pos.z;
  const distSq = dx * dx + dz * dz;

  if (distSq < 1.0) {
    a.state    = 'sitting';
    a.sitTimer = 2 + Math.random() * 5;
    if (a.walkAction) { a.walkAction.fadeOut(0.3); }
    if (a.idleAction) { a.idleAction.reset().fadeIn(0.3).play(); }
    return;
  }

  const dist = Math.sqrt(distSq);
  pos.x += (dx / dist) * a.speed * a.speedMult * delta;
  pos.z += (dz / dist) * a.speed * a.speedMult * delta;
  pos.y  = getSurfaceY(pos.x, pos.z) + a.floorOffset;
  a.group.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
}

function _startWalking(a) {
  a.state = 'walking';
  let tx, tz, tries = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const r     = 8 + Math.random() * 28;
    tx = a.home.x + Math.cos(angle) * r;
    tz = a.home.z + Math.sin(angle) * r;
    tries++;
  } while ((tx * tx + tz * tz > ISLAND_R * ISLAND_R ||
            (Math.abs(tx) < 42 && Math.abs(tz) < 42)) && tries < 20);
  a.target.set(tx, 0, tz);
  a.sitTimer = 5 + Math.random() * 9;
  if (a.idleAction) a.idleAction.fadeOut(0.3);
  if (a.walkAction) a.walkAction.reset().fadeIn(0.3).play();
  else if (a.idleAction) a.idleAction.reset().fadeIn(0.1).play();
}
