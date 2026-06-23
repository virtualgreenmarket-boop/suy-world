import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { getSurfaceY } from '../systems/terrain.js';

let eishaModel = null;
let eishaMixer = null;
let eishaAnimations = [];

const FBX_URL = '/models/characters/npcs/eisha.fbx';
const TARGET_POSITION = { x: 77, y: 0.02, z: 46.83 };
const TARGET_HEIGHT = 2.0; // Adjust this for desired size

export async function loadEisha(scene) {
  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();

    loader.load(
      FBX_URL,
      (fbx) => {
        console.log('[Eisha] FBX loaded successfully');

        // Enable shadows
        fbx.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Improve material quality
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach(mat => {
                if (mat.isMeshStandardMaterial) {
                  // Add slight emissive for better visibility
                  mat.emissive.setHex(0x222222);
                  mat.emissiveIntensity = 0.2;
                  mat.roughness = Math.min(mat.roughness ?? 1.0, 0.75);
                  mat.needsUpdate = true;

                  // Enable anisotropic filtering for sharper textures
                  if (mat.map) {
                    mat.map.anisotropy = 16;
                    mat.map.needsUpdate = true;
                  }
                }
              });
            }
          }
        });

        // Scale to target height
        const box = new THREE.Box3().setFromObject(fbx);
        const currentHeight = box.max.y - box.min.y;
        const scale = TARGET_HEIGHT / currentHeight;
        fbx.scale.setScalar(scale);

        // Compute floor offset after scaling
        const box2 = new THREE.Box3().setFromObject(fbx);
        const floorOffset = -box2.min.y;

        // Position at target location
        const surfaceY = getSurfaceY(TARGET_POSITION.x, TARGET_POSITION.z);
        fbx.position.set(
          TARGET_POSITION.x,
          TARGET_POSITION.y + floorOffset,
          TARGET_POSITION.z
        );

        // Store model reference
        eishaModel = fbx;

        // Setup animations
        if (fbx.animations && fbx.animations.length > 0) {
          eishaMixer = new THREE.AnimationMixer(fbx);
          eishaAnimations = fbx.animations;

          console.log('[Eisha] Animations found:', fbx.animations.map(a => a.name).join(', '));

          // Play first animation (usually idle or T-pose)
          const firstClip = fbx.animations[0];
          const action = eishaMixer.clipAction(firstClip);
          action.play();

          console.log('[Eisha] Playing animation:', firstClip.name);
        } else {
          console.log('[Eisha] No animations found in FBX');
        }

        // Add to scene
        scene.add(fbx);

        console.log('[Eisha] Model added to scene at position:', TARGET_POSITION);
        console.log('[Eisha] Scale:', scale.toFixed(3), '| Height:', (currentHeight * scale).toFixed(2), 'm');

        resolve(fbx);
      },
      (progress) => {
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        console.log(`[Eisha] Loading: ${percent}%`);
      },
      (error) => {
        console.error('[Eisha] Failed to load FBX:', error);
        reject(error);
      }
    );
  });
}

export function updateEisha(delta) {
  if (eishaMixer) {
    eishaMixer.update(delta);
  }
}

export function getEishaModel() {
  return eishaModel;
}

export function getEishaAnimations() {
  return eishaAnimations;
}

// Helper to play specific animation by name
export function playEishaAnimation(animationName) {
  if (!eishaMixer || !eishaAnimations.length) {
    console.warn('[Eisha] No animations available');
    return;
  }

  const clip = eishaAnimations.find(a => a.name.toLowerCase().includes(animationName.toLowerCase()));
  if (!clip) {
    console.warn('[Eisha] Animation not found:', animationName);
    console.log('[Eisha] Available:', eishaAnimations.map(a => a.name).join(', '));
    return;
  }

  // Stop all current actions
  eishaMixer.stopAllAction();

  // Play new animation
  const action = eishaMixer.clipAction(clip);
  action.reset().play();
  console.log('[Eisha] Playing animation:', clip.name);
}
