import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { getCharacterModelPath } from '../ui/characterSelection.js';

const ANIMATIONS_BASE = '/models/player/animations/';
const FADE_DURATION = 0.2;

const loader = new GLTFLoader();
let _characterTemplate = null;
let _animationClips = {};
let _modelFloorY = 0;

const ANIMATION_FILES = {
  idle: 'idle.glb',
  walk: 'walking.glb',
  run: 'running.glb',
  jump: 'jump.glb',
  sit: 'SittingIdle.glb',
};

// ── Preload character and animations ─────────────────────────────────

export async function preloadPlayerCharacter(characterId) {
  const modelPath = getCharacterModelPath(characterId);

  // Load character model
  const gltf = await new Promise((resolve, reject) =>
    loader.load(modelPath, resolve, undefined, reject)
  );

  _characterTemplate = gltf.scene;
  _characterTemplate.traverse(n => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = false;
    }
  });

  const box = new THREE.Box3().setFromObject(_characterTemplate);
  _modelFloorY = -box.min.y;

  console.log('[player] Loaded character', characterId);

  // Load animations
  await loadAnimations();
}

async function loadAnimations() {
  const promises = Object.entries(ANIMATION_FILES).map(async ([key, filename]) => {
    try {
      const gltf = await new Promise((resolve, reject) =>
        loader.load(ANIMATIONS_BASE + filename, resolve, undefined, reject)
      );

      if (gltf.animations && gltf.animations.length > 0) {
        _animationClips[key] = gltf.animations[0];
        console.log('[player] Loaded animation:', key);
      }
    } catch (err) {
      console.warn('[player] Failed to load animation:', filename);
    }
  });

  await Promise.all(promises);

  console.log('[player] Animations ready:', Object.keys(_animationClips).join(', '));
}

// ── Spawn character instance ──────────────────────────────────────────

export async function spawnPlayerCharacter(parentGroup) {
  if (!_characterTemplate) {
    throw new Error('[player] Character not preloaded');
  }

  // Remove any existing model
  if (parentGroup.userData._charModel) {
    parentGroup.remove(parentGroup.userData._charModel);
    parentGroup.userData._charModel = null;
  }

  const clone = skeletonClone(_characterTemplate);
  clone.scale.setScalar(1.0);
  clone.rotation.set(0, 0, 0);
  clone.position.set(0, _modelFloorY, 0);
  clone.updateMatrix();
  clone.matrixAutoUpdate = true;

  parentGroup.add(clone);
  parentGroup.userData._charModel = clone;

  // Build bone map
  const boneMap = new Map();
  clone.traverse(n => { if (n.isBone) boneMap.set(n.name, n); });
  parentGroup.userData._charBoneMap = boneMap;

  // Setup animation mixer
  const mixer = new THREE.AnimationMixer(clone);
  const actions = {};

  for (const [name, clip] of Object.entries(_animationClips)) {
    if (!clip) continue;

    const action = mixer.clipAction(clip);
    if (name === 'jump') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    actions[name] = action;
  }

  // Fallback aliases
  if (!actions.walk && actions.idle) actions.walk = actions.idle;
  if (!actions.run && actions.walk) actions.run = actions.walk;
  if (!actions.sit && actions.idle) actions.sit = actions.idle;

  console.log('[player] Spawned with actions:', Object.keys(actions).join(', '));

  parentGroup.userData.mixer = mixer;
  parentGroup.userData.actions = actions;
  parentGroup.userData.state = null;

  setPlayerAnimState(parentGroup, 'idle', true);
}

// ── Animation control ─────────────────────────────────────────────────

export function setPlayerAnimState(group, state, immediate = false) {
  const { actions, state: current } = group.userData;
  if (!actions || state === current || !actions[state]) return;

  const next = actions[state];
  const prev = current ? actions[current] : null;

  next.reset().play();
  if (prev && !immediate) next.crossFadeFrom(prev, FADE_DURATION, true);
  else if (prev) prev.stop();

  group.userData.state = state;
}

export function updatePlayerCharacterMixer(group, delta) {
  // Ensure model stays attached
  const charModel = group.userData._charModel;
  if (charModel && charModel.parent !== group) {
    console.warn('[player] Model detached! Re-attaching.');
    group.add(charModel);
  }

  // Lock local transform
  if (charModel) {
    charModel.position.y = _modelFloorY;
    charModel.rotation.x = 0;
    charModel.rotation.z = 0;
  }

  group.userData.mixer?.update(delta);
}
