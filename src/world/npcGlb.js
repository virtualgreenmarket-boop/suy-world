import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { preloadAnimations, buildClipForSkeleton } from '../player/animations.js';
import { getSurfaceY } from '../systems/terrain.js';

// ── NPC catalogue ─────────────────────────────────────────────────────
// All GLB files in public/models/characters/npcs/.
// Scale target: 1.75 m × 1.2 = 2.10 m (20% larger than standard height).
const TARGET_HEIGHT = 3.1;

const NPC_URLS = [
  '/models/characters/npcs/skylar_breeze_a_casual_summer_character_scan.glb',
  '/models/characters/npcs/starfish_necklace_blue_bodysuit_portrait.glb',
  '/models/characters/npcs/texting_while_walking.glb',
  '/models/characters/npcs/jeny_tpose_riged.glb',
];

// Per-entry NPC template data
const _templates = []; // { scene, floorY, hasSkel, builtinClips, hasWalk }
let _allLoaded   = false;
let _loadPromise = null;

const _loader = new GLTFLoader();

// ── Preload ───────────────────────────────────────────────────────────

export function preloadAllNpcs() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = Promise.all(NPC_URLS.map((url, i) => _loadOne(url, i)))
    .then(() => { _allLoaded = true; console.log('[npc-glb] all', NPC_URLS.length, 'NPCs loaded'); });
  return _loadPromise;
}

// backward compat: loads the first NPC (skylar_breeze)
export function preloadNpc() { return preloadAllNpcs(); }

function _loadOne(url, i) {
  return new Promise((resolve, reject) => {
    _loader.load(url, gltf => {
      const tmpl = gltf.scene;
      let hasSkel = false, hasWalkAnim = false, hasIdleAnim = false;

      tmpl.traverse(n => {
        if (n.isMesh)       { n.castShadow = true; n.receiveShadow = true; }
        if (n.isBone || n.isSkinnedMesh) hasSkel = true;
      });

      const box1 = new THREE.Box3().setFromObject(tmpl);
      const h    = Math.max(box1.max.y - box1.min.y, 0.01);
      tmpl.scale.setScalar(TARGET_HEIGHT / h);

      const box2 = new THREE.Box3().setFromObject(tmpl);
      const floorY = -box2.min.y;

      const clips = gltf.animations ?? [];
      clips.forEach(c => {
        const n = c.name.toLowerCase();
        if (n.includes('walk') || n.includes('run')) hasWalkAnim = true;
        if (n.includes('idle') || n.includes('stand') || n.includes('breathing')) hasIdleAnim = true;
      });

      _templates[i] = { tmpl, floorY, hasSkel, builtinClips: clips, hasWalkAnim, hasIdleAnim };
      console.log('[npc-glb]', i, url.split('/').pop(), '| h:', h.toFixed(2),
                  '| anims:', clips.map(c => c.name).join(', ') || 'none',
                  '| walk:', hasWalkAnim);
      resolve();
    }, undefined, err => {
      console.warn('[npc-glb] failed to load', url, err?.message ?? err);
      _templates[i] = null;
      resolve(); // don't fail the whole Promise.all
    });
  });
}

// ── Spawn one NPC by catalogue index ─────────────────────────────────

export async function spawnNpcByIndex(scene, npcIndex, x, z, rotY = 0) {
  await preloadAllNpcs();
  const entry = _templates[npcIndex % _templates.length];
  if (!entry) return null;
  return _spawnFromEntry(scene, entry, x, z, rotY);
}

// backward compat: spawn first NPC
export async function spawnNpc(scene, x, z, rotY = 0) {
  return spawnNpcByIndex(scene, 0, x, z, rotY);
}

// ── Spawn all NPCs spread across the plaza ────────────────────────────

const PLAZA_POSITIONS = [
  { x:  10, z:  -5, rot: Math.PI * 0.75 },
  { x: -12, z:   8, rot: Math.PI * 1.5  },
  { x:  18, z:  18, rot: Math.PI * 0.25 },
  { x: -20, z: -12, rot: Math.PI * 0.1  },
  { x:   6, z: -22, rot: Math.PI * 1.2  },
];

const _plazaNpcs = [];

export async function spawnAllPlazaNpcs(scene) {
  await preloadAllNpcs();
  for (let i = 0; i < _templates.length; i++) {
    const entry = _templates[i];
    if (!entry) continue;
    const cfg = PLAZA_POSITIONS[i % PLAZA_POSITIONS.length];

    // Phone-woman (index 2) starts on her circle path
    const startX = i === 2 ? 18 : cfg.x;
    const startZ = i === 2 ? 0  : cfg.z;
    const npc = await _spawnFromEntry(scene, entry, startX, startZ, cfg.rot);
    if (!npc) continue;

    if (i === 2) {
      // Walks in a continuous loop around the plaza
      npc.walkMode     = 'circle';
      npc.circleRadius = 18;
      npc.circleAngle  = 0;
      npc.circleSpeed  = 0.30; // rad/s
      npc.circleCenter = new THREE.Vector3(0, 0, 0);
      npc.canWalk      = false;

      // Ensure a dedicated walk clip exists — if the model only has one clip
      // (texting pose) with no walk keyword, build a retargeted walk instead.
      const needsRetarget = !npc.walkAction || npc.walkAction === npc.idleAction;
      if (needsRetarget) {
        await preloadAnimations();
        const boneNames = new Set();
        npc.group.traverse(n => {
          if (n.isBone)        boneNames.add(n.name);
          if (n.isSkinnedMesh) n.skeleton.bones.forEach(b => boneNames.add(b.name));
        });
        const walkClip = buildClipForSkeleton('walk', boneNames);
        if (walkClip?.tracks.length > 0) {
          npc.walkAction = npc.mixer.clipAction(walkClip);
        }
      }

      if (!npc.walkAction) {
        // No walk animation available — stay in place
        npc.walkMode = null;
        npc.idleAction?.reset().play();
      } else {
        npc.idleAction?.stop();
        npc.walkAction.reset().play();
      }
    } else {
      npc.walkCenter = new THREE.Vector3(cfg.x, 0, cfg.z);
      npc.walkRadius = 7;
      npc.walkTarget = new THREE.Vector3(cfg.x, 0, cfg.z);
      npc.walkState  = 'idle';
      npc.walkTimer  = 2 + Math.random() * 4;
      npc.canWalk    = (entry.hasWalkAnim || entry.hasSkel) && !!npc.walkAction;
    }
    _plazaNpcs.push(npc);
  }
}

export function updateAllPlazaNpcs(delta) {
  for (const npc of _plazaNpcs) updateNpc(npc, delta);
}

// ── Internal spawn helper ─────────────────────────────────────────────

function _cloneMat(m) {
  const c = m.clone();
  for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'sheenColorMap']) {
    if (c[key]) {
      c[key] = c[key].clone();
      c[key].colorSpace = (key === 'map' || key === 'emissiveMap' || key === 'sheenColorMap')
        ? THREE.SRGBColorSpace
        : THREE.LinearSRGBColorSpace;
      c[key].needsUpdate = true;
    }
  }
  c.needsUpdate = true;
  return c;
}

async function _spawnFromEntry(scene, entry, x, z, rotY) {
  const { tmpl, floorY, hasSkel, builtinClips, hasWalkAnim } = entry;

  const surfaceY = getSurfaceY(x, z);
  const clone    = skeletonClone(tmpl);

  // Clone materials per instance — prevents black/missing textures from shared refs
  clone.traverse(n => {
    if (!n.isMesh) return;
    if (Array.isArray(n.material)) {
      n.material = n.material.map(_cloneMat);
    } else if (n.material) {
      n.material = _cloneMat(n.material);
    }
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.roughness = Math.min(mat.roughness ?? 1.0, 0.75);
      mat.needsUpdate = true;
    }
  });

  // Compute actual floor offset from clone's own bounding box
  const cloneBox    = new THREE.Box3().setFromObject(clone);
  const cloneFloorY = -cloneBox.min.y;

  clone.position.set(x, cloneFloorY + surfaceY, z);
  clone.rotation.y = rotY;
  scene.add(clone);

  const mixer = new THREE.AnimationMixer(clone);
  let mode = 'procedural', idleAction = null, walkAction = null;

  if (builtinClips.length > 0) {
    // Use built-in animations — find idle + walk by name
    const findClip = (...keywords) => builtinClips.find(c => {
      const n = c.name.toLowerCase();
      return keywords.some(k => n.includes(k));
    });

    const idleClip = findClip('idle', 'stand', 'breathing', 'tpose', 't-pose') ?? builtinClips[0];
    const walkClip = findClip('walk', 'run', 'walking', 'jog', 'move', 'locomotion')
                  ?? (builtinClips.length > 1 ? builtinClips[1] : builtinClips[0])
                  ?? null;

    idleAction = mixer.clipAction(idleClip);
    idleAction.play();
    if (walkClip) walkAction = mixer.clipAction(walkClip);
    mode = 'builtin';

  } else if (hasSkel) {
    await preloadAnimations();
    const boneNames = new Set();
    clone.traverse(n => {
      if (n.isBone)        boneNames.add(n.name);
      if (n.isSkinnedMesh) n.skeleton.bones.forEach(b => boneNames.add(b.name));
    });
    if (boneNames.size > 0) {
      const idleClip = buildClipForSkeleton('idle', boneNames);
      const walkClip = buildClipForSkeleton('walk', boneNames);
      if (idleClip?.tracks.length > 0) {
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
        mode = 'retarget';
      }
      if (walkClip?.tracks.length > 0) {
        walkAction = mixer.clipAction(walkClip);
      }
    }
  }

  return {
    mixer, group: clone, mode,
    idleAction, walkAction,
    idlePhase: Math.random() * Math.PI * 2,
    baseY:     cloneFloorY + surfaceY,
    floorOffset: cloneFloorY,
    idleTime:  0,
    walkCenter: new THREE.Vector3(x, 0, z),
    walkRadius: 0,
    walkTarget: new THREE.Vector3(x, 0, z),
    walkState: 'idle',
    walkTimer: 0,
    canWalk: false,
  };
}

// ── Per-frame update ──────────────────────────────────────────────────

export function updateNpc(npc, delta) {
  if (!npc) return;

  // Circular walk (phone-woman)
  if (npc.walkMode === 'circle') {
    npc.circleAngle += npc.circleSpeed * delta;
    const nx = npc.circleCenter.x + Math.cos(npc.circleAngle) * npc.circleRadius;
    const nz = npc.circleCenter.z + Math.sin(npc.circleAngle) * npc.circleRadius;
    npc.group.position.x = nx;
    npc.group.position.z = nz;
    npc.group.position.y = getSurfaceY(nx, nz) + npc.floorOffset;
    npc.group.rotation.y = npc.circleAngle + Math.PI / 2;
    npc.mixer.update(delta);
    return;
  }

  // Animation mixer
  if (npc.mode === 'builtin' || npc.mode === 'retarget') {
    npc.mixer.update(delta);
  } else {
    npc.idleTime += delta;
    const t = npc.idleTime;
    npc.group.rotation.z = Math.sin(t * 0.7  + npc.idlePhase) * 0.012;
    npc.group.position.y = npc.baseY
      + Math.sin(t * 1.1 + npc.idlePhase) * 0.006
      + Math.sin(t * 2.3 + npc.idlePhase * 1.3) * 0.003;
    return; // no walking for procedural mode
  }

  // Wandering behaviour
  if (!npc.canWalk || npc.walkRadius === 0) return;

  if (npc.walkState === 'idle') {
    npc.walkTimer -= delta;
    if (npc.walkTimer <= 0) {
      const a    = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * npc.walkRadius;
      npc.walkTarget.set(
        npc.walkCenter.x + Math.cos(a) * dist,
        npc.baseY,
        npc.walkCenter.z + Math.sin(a) * dist
      );
      // Clamp inside plaza (r=38)
      const lr = Math.sqrt(npc.walkTarget.x ** 2 + npc.walkTarget.z ** 2);
      if (lr > 38) { npc.walkTarget.x *= 38 / lr; npc.walkTarget.z *= 38 / lr; }

      npc.walkState = 'walking';
      npc.idleAction?.fadeOut(0.3);
      npc.walkAction?.reset().fadeIn(0.3).play();
    }
  } else {
    const dx   = npc.walkTarget.x - npc.group.position.x;
    const dz   = npc.walkTarget.z - npc.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.35) {
      npc.walkState = 'idle';
      npc.walkTimer = 3 + Math.random() * 6;
      npc.walkAction?.fadeOut(0.3);
      npc.idleAction?.reset().fadeIn(0.3).play();
    } else {
      const speed = 1.4;
      const nx = npc.group.position.x + (dx / dist) * speed * delta;
      const nz = npc.group.position.z + (dz / dist) * speed * delta;
      npc.group.position.x = nx;
      npc.group.position.z = nz;
      npc.group.position.y = getSurfaceY(nx, nz) + npc.floorOffset;
      npc.group.rotation.y = Math.atan2(dx, dz);
    }
  }
}
