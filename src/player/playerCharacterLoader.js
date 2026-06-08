import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getCharacterModelPath } from '../ui/characterSelection.js';

const ANIMATIONS_BASE = '/models/player/animations/';
const FADE_DURATION = 0.2;

const loader = new GLTFLoader();
let _characterTemplate = null;
let _animationClips = {};

const ANIMATION_FILES = {
  idle: 'idle.glb',
  walk: 'walking.glb',
  run: 'running.glb',
  jump: 'jump.glb',
  sit: 'SittingIdle.glb',
};

export async function preloadPlayerCharacter(characterId) {
  const modelPath = getCharacterModelPath(characterId);
  console.log(`[player] 🎭 Loading character ${characterId} from ${modelPath}`);

  const gltf = await new Promise((resolve, reject) =>
    loader.load(modelPath, resolve, undefined, reject)
  );

  _characterTemplate = gltf.scene;

  // Configure meshes for proper rendering
  _characterTemplate.traverse(n => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
      n.frustumCulled = false;
    }
  });

  console.log(`[player] ✅ Character ${characterId} loaded`);

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

export async function spawnPlayerCharacter(parentGroup, characterId) {
  if (!_characterTemplate) {
    console.error('[player] ❌ Character template not preloaded!');
    throw new Error('[player] Character not preloaded');
  }

  console.log(`[player] ✅ Spawning character ${characterId}`);

  if (parentGroup.userData._charModel) {
    parentGroup.remove(parentGroup.userData._charModel);
    parentGroup.userData._charModel = null;
  }

  const clone = _characterTemplate.clone(true);

  // Configure cloned meshes
  clone.traverse(n => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
      n.frustumCulled = false;
    }
  });

  // Scale to 1.8 units tall
  const TARGET_HEIGHT = 1.8;
  const rawBox = new THREE.Box3().setFromObject(clone);
  const rawHeight = rawBox.getSize(new THREE.Vector3()).y;
  const scale = rawHeight > 0 ? TARGET_HEIGHT / rawHeight : 1.0;

  clone.scale.setScalar(scale);
  clone.rotation.set(0, 0, 0);
  clone.updateMatrixWorld(true);

  // Position on ground
  const box2 = new THREE.Box3().setFromObject(clone);
  const floorOffset = -box2.min.y;

  clone.position.set(0, floorOffset, 0);
  clone.updateMatrix();
  clone.matrixAutoUpdate = true;

  parentGroup.add(clone);
  parentGroup.userData._charModel = clone;

  const boneMap = new Map();
  clone.traverse(n => { if (n.isBone) boneMap.set(n.name, n); });
  parentGroup.userData._charBoneMap = boneMap;

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

  if (!actions.walk && actions.idle) actions.walk = actions.idle;
  if (!actions.run && actions.walk) actions.run = actions.walk;
  if (!actions.sit && actions.idle) actions.sit = actions.idle;

  console.log('[player] Actions:', Object.keys(actions).join(', '));

  parentGroup.userData.mixer = mixer;
  parentGroup.userData.actions = actions;
  parentGroup.userData.state = null;

  setPlayerAnimState(parentGroup, 'idle', true);
}

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
  if (group.userData.mixer) {
    group.userData.mixer.update(delta);
  }
}
