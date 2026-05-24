import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { preloadAnimations, buildClipsForSkeleton, getClip } from './animations.js';

const MODEL_URL     = '/models/characters/ithappy/Creative_Character_free.glb';
const MODEL_SCALE   = 1.0;
const FADE_DURATION = 0.2;

const loader = new GLTFLoader();
let _template    = null;
let _modelFloorY = 0;
let _promise     = null;

// ensureLoaded performs three steps in sequence:
//   1. Download the character GLB
//   2. Wait for FBX animation files (may already be downloading from main.js)
//   3. Remap Mixamo tracks onto the skeleton's detected bone names
async function ensureLoaded() {
  if (_promise) return _promise;
  _promise = (async () => {
    // Step 1 — load GLB
    const gltf = await new Promise((resolve, reject) =>
      loader.load(MODEL_URL, resolve, undefined, reject)
    );
    _template = gltf.scene;
    _template.traverse(n => {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = false; }
    });

    // Step 2 — collect every bone name so we can auto-detect the rig convention
    const boneNames = new Set();
    _template.traverse(n => {
      if (n.isBone) boneNames.add(n.name);
      // Also capture bones referenced by skinned meshes (covers some exporters)
      if (n.isSkinnedMesh) n.skeleton.bones.forEach(b => boneNames.add(b.name));
    });
    console.log('[character] loaded — bones:', boneNames.size,
                '| sample:', [...boneNames].slice(0, 8).join(', '));

    const box = new THREE.Box3().setFromObject(_template);
    _modelFloorY = -box.min.y;

    // Step 3 — wait for FBX downloads then remap tracks onto this skeleton
    await preloadAnimations();
    buildClipsForSkeleton(boneNames);
  })();
  return _promise;
}

export function preloadCharacter() { return ensureLoaded(); }

export async function spawnCharacter(parentGroup) {
  await ensureLoaded(); // ensures model + clips are ready before continuing

  const clone = skeletonClone(_template);
  clone.scale.setScalar(MODEL_SCALE);
  clone.rotation.y = 0; // only override facing; preserve any loader axis transforms
  clone.position.y = _modelFloorY;
  parentGroup.add(clone);

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
