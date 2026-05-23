import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

const MALE_URL = '/models/Base%20Characters/Godot%20-%20UE/Superhero_Male_FullBody.gltf';

// The GLTF mesh faces +Z (bounding box confirms: small Z-depth, large X arm-span).
// No facing correction needed — movement code already handles orientation via rotation.y.
// If the character runs backwards, change this to Math.PI.
const MODEL_FACE_Y = 0;
const MODEL_SCALE  = 1.0; // model is in metres; adjust if character appears wrong size

const loader = new GLTFLoader();
let _template = null;
let _promise  = null;

function ensureLoaded() {
  if (_promise) return _promise;
  _promise = new Promise((resolve, reject) =>
    loader.load(MALE_URL, gltf => {
      _template = gltf.scene;
      _template.traverse(n => {
        if (n.isMesh) { n.castShadow = true; n.receiveShadow = false; }
      });
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
  clone.rotation.y = MODEL_FACE_Y;
  parentGroup.add(clone);
}
