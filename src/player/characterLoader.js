import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { preloadAnimations, buildClipsForSkeleton, getClip } from './animations.js';

const MODEL_URL     = '/models/characters/ithappy/Creative_Character_free.glb';
const ASSETS_BASE   = '/models/characters/ithappy/Separate_assets_glb/';
const MODEL_SCALE   = 1.0;
const FADE_DURATION = 0.2;

const loader = new GLTFLoader();
let _template    = null;
let _modelFloorY = 0;
let _promise     = null;

// Clip name mapping for built-in GLB animations
const BUILTIN_MAP = {
  idle: ['idle', 'stand', 'breathe', 'breathing', 'tpose', 't-pose', 't_pose'],
  walk: ['walk'],
  run:  ['run', 'jog', 'sprint'],
  jump: ['jump', 'leap'],
  sit:  ['sit', 'sitting', 'seated', 'chair'],
};

let _builtinClips = null;   // non-null when GLB has its own animations

async function ensureLoaded() {
  if (_promise) return _promise;
  _promise = (async () => {
    const gltf = await new Promise((resolve, reject) =>
      loader.load(MODEL_URL, resolve, undefined, reject)
    );
    _template = gltf.scene;
    _template.traverse(n => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = false;
        n.visible = false; // hide baked-in clothes/hat/shoes — Body_010.glb provides the skin
      }
    });

    const box = new THREE.Box3().setFromObject(_template);
    _modelFloorY = -box.min.y;

    // ── Check for built-in animations first ──────────────────────────
    const embedded = gltf.animations ?? [];
    if (embedded.length > 0) {
      console.log('[character] GLB has', embedded.length, 'built-in animation(s):',
                  embedded.map(c => c.name).join(', '));
      _builtinClips = _mapBuiltinClips(embedded);
      const found = Object.entries(_builtinClips).filter(([,v]) => v).map(([k]) => k);
      console.log('[character] built-in clips mapped:', found.join(', ') || 'none');
      if (found.length >= 2) {
        // Enough built-in animations — skip Mixamo retargeting
        return;
      }
    }

    // ── Fall back: Mixamo FBX retargeting ────────────────────────────
    const boneNames = new Set();
    _template.traverse(n => {
      if (n.isBone) boneNames.add(n.name);
      if (n.isSkinnedMesh) n.skeleton.bones.forEach(b => boneNames.add(b.name));
    });
    console.log('[character] skeleton bones (' + boneNames.size + '):',
                [...boneNames].join(', '));

    await preloadAnimations();
    buildClipsForSkeleton(boneNames);
  })();
  return _promise;
}

function _mapBuiltinClips(clips) {
  const result = { idle: null, walk: null, run: null, jump: null, sit: null };
  for (const [key, keywords] of Object.entries(BUILTIN_MAP)) {
    result[key] = clips.find(c => {
      const n = c.name.toLowerCase();
      return keywords.some(k => n.includes(k));
    }) ?? null;
  }
  // Fallback: if no idle found, use first clip as idle
  if (!result.idle && clips.length > 0) result.idle = clips[0];
  return result;
}

export function preloadCharacter() { return ensureLoaded(); }

export async function spawnCharacter(parentGroup) {
  await ensureLoaded();

  const clone = skeletonClone(_template);
  clone.scale.setScalar(MODEL_SCALE);
  clone.rotation.y = 0;
  clone.position.y = _modelFloorY;
  parentGroup.add(clone);

  // Build bone map once, before any items are equipped, so it never gets polluted
  const boneMap = new Map();
  clone.traverse(n => { if (n.isBone) boneMap.set(n.name, n); });
  parentGroup.userData._charBoneMap = boneMap;

  const mixer   = new THREE.AnimationMixer(clone);
  const actions = {};

  if (_builtinClips) {
    // Use embedded GLB animations directly — they're already wired to this skeleton
    for (const [name, clip] of Object.entries(_builtinClips)) {
      if (!clip) continue;
      const action = mixer.clipAction(clip);
      if (name === 'jump') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions[name] = action;
    }
    // Alias missing clips to idle so setAnimState never warns
    if (!actions.walk && actions.idle) actions.walk = actions.idle;
    if (!actions.run  && actions.idle) actions.run  = actions.idle;
    if (!actions.sit  && actions.idle) actions.sit  = actions.idle;
  } else {
    // Mixamo retargeted clips
    for (const name of ['idle', 'walk', 'run', 'jump', 'sit']) {
      const clip = getClip(name);
      if (!clip) continue;
      const action = mixer.clipAction(clip);
      if (name === 'jump') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions[name] = action;
    }
    if (!actions.sit && actions.idle) actions.sit = actions.idle;
  }

  const clipCount = Object.keys(actions).length;
  console.log('[character] spawned — actions:', Object.keys(actions).join(', '),
              '| built-in:', !!_builtinClips);
  if (clipCount === 0) {
    console.warn('[character] WARNING: no animation clips found. Check bone names or GLB animations.');
  }

  parentGroup.userData.mixer   = mixer;
  parentGroup.userData.actions = actions;
  parentGroup.userData.state   = null;

  setAnimState(parentGroup, 'idle', true);
}

// ── Animation API ─────────────────────────────────────────────────────

export function setAnimState(group, state, immediate = false) {
  const { actions, state: current } = group.userData;
  if (!actions || state === current || !actions[state]) return;

  const next = actions[state];
  const prev = current ? actions[current] : null;

  next.reset().play();
  if (prev && !immediate) next.crossFadeFrom(prev, FADE_DURATION, true);
  else if (prev) prev.stop();

  group.userData.state = state;
}

export function updateCharacterMixer(group, delta) {
  group.userData.mixer?.update(delta);
}

// ── Accessory equip ───────────────────────────────────────────────────

// color: optional hex number (e.g. 0xCCCCCC) to override all mesh materials with a flat grey
export async function equipItem(group, category, filename, color = null) {
  if (!group) return;
  if (!group.userData._equipped) group.userData._equipped = {};

  const prev = group.userData._equipped[category];
  if (prev) { prev.parent?.remove(prev); group.userData._equipped[category] = null; }
  if (!filename) return;

  const charBoneMap = group.userData._charBoneMap ?? new Map();

  try {
    const gltf = await new Promise((res, rej) =>
      new GLTFLoader().load(ASSETS_BASE + filename, res, undefined, rej)
    );
    const item = skeletonClone(gltf.scene);
    const shoeScale = category === 'Shoes' ? MODEL_SCALE * 0.82 : MODEL_SCALE;
    item.scale.setScalar(shoeScale);
    item.position.y = _modelFloorY + (category === 'Shoes' ? 0.05 : 0);

    if (charBoneMap.size > 0) {
      item.traverse(n => {
        if (!n.isSkinnedMesh || !n.skeleton) return;
        const bones = n.skeleton.bones.map(b => charBoneMap.get(b.name) ?? b);
        n.skeleton = new THREE.Skeleton(bones, n.skeleton.boneInverses);
        n.bind(n.skeleton);
      });
    }

    // The ithappy GLBs bundle a full body mesh under every clothing item.
    // Hide any mesh whose vertical span covers most of the character height
    // (those are the ghost body duplicates — the actual clothing pieces are smaller).
    // Exception: the Body category IS the full skin mesh, so keep all its meshes visible.
    const charHeight = 1.8;
    item.traverse(n => {
      if (!n.isMesh) return;
      n.castShadow = true;
      if (category !== 'Body' && category !== 'Emotions') {
        n.geometry.computeBoundingBox();
        const bb = n.geometry.boundingBox;
        const meshH = bb.max.y - bb.min.y;
        if (meshH > charHeight * 0.55) {
          n.visible = false;
          return;
        }
      }
      if (color !== null) {
        n.material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04 });
      }
    });

    group.add(item);
    group.userData._equipped[category] = item;
    console.log('[character] equipped:', category, filename);
  } catch (err) {
    console.warn('[character] equip failed:', filename, err?.message ?? err);
  }
}
