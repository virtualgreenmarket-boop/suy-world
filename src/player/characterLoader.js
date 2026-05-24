import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { preloadAnimations, getClip } from './animations.js';

const MALE_URL      = '/models/Base%20Characters/Godot%20-%20UE/Superhero_Male_FullBody.gltf';
const MODEL_SCALE   = 1.0;
const FADE_DURATION = 0.2;

const loader = new GLTFLoader();
let _template    = null;
let _modelFloorY = 0;
let _promise     = null;

function ensureLoaded() {
  if (_promise) return _promise;
  _promise = new Promise((resolve, reject) =>
    loader.load(MALE_URL, gltf => {
      _template = gltf.scene;
      _template.traverse(n => {
        if (n.isMesh) { n.castShadow = true; n.receiveShadow = false; }
      });
      const box = new THREE.Box3().setFromObject(_template);
      _modelFloorY = -box.min.y;
      resolve();
    }, undefined, reject)
  );
  return _promise;
}

export function preloadCharacter() { return ensureLoaded(); }

export async function spawnCharacter(parentGroup) {
  await ensureLoaded();

  const clone = skeletonClone(_template);
  clone.scale.setScalar(MODEL_SCALE);

  // Only set Y (facing direction). The GLTF loader applies an X-axis rotation
  // to convert from the exporter's Z-up coordinate system to Three.js Y-up.
  // Zeroing rotation.x removes that transform and makes the character lie flat.
  clone.rotation.y = 0;

  clone.position.y = _modelFloorY;
  parentGroup.add(clone);

  // Reset all root-level bone quaternions to identity so the bind pose is
  // clean and animations start from a defined baseline.
  clone.traverse(node => {
    if (node.isBone && !(node.parent?.isBone)) {
      node.quaternion.identity();
    }
  });

  await preloadAnimations().catch(() => {});

  const mixer   = new THREE.AnimationMixer(clone);
  const actions = {};

  for (const name of ['idle', 'walk', 'run', 'jump']) {
    const clip = getClip(name);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    if (name === 'jump') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    actions[name] = action;
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
