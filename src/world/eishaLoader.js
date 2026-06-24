import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getSurfaceY } from '../systems/terrain.js';

let eishaModel = null;
let eishaMixer = null;
let eishaAnimations = [];
let eishaTemplate = null; // Preloaded GLB template

const GLB_URL = '/models/characters/npcs/EISHA.GLB';
const TARGET_POSITION = { x: -15, y: 0, z: -5 }; // Plaza center area
const TARGET_HEIGHT = 3.1; // Same as other NPCs (NPC 1)

// Preload the GLB (without scene) for loading screen
export async function preloadEisha() {
  if (eishaTemplate) return eishaTemplate;

  console.log('[Eisha] Preloading GLB from:', GLB_URL);
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      GLB_URL,
      (gltf) => {
        console.log('[Eisha] ✅ GLB preloaded successfully!');
        eishaTemplate = gltf.scene;
        eishaAnimations = gltf.animations || [];
        console.log('[Eisha] Animations in GLB:', eishaAnimations.length);
        resolve(gltf.scene);
      },
      (progress) => {
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        console.log(`[Eisha] Preloading: ${percent}%`);
      },
      (error) => {
        console.error('[Eisha] ❌ Failed to preload GLB:', error);
        reject(error);
      }
    );
  });
}

export async function loadEisha(scene) {
  console.log('[Eisha] Spawning in scene...');

  // Wait for preload if not ready
  if (!eishaTemplate) {
    console.log('[Eisha] Template not preloaded, loading now...');
    await preloadEisha();
  }

  return new Promise((resolve, reject) => {
    try {
      // Clone the preloaded template
      const model = eishaTemplate.clone(true);
      console.log('[Eisha] ✅ Template cloned successfully!');

        // Enable shadows and fix materials
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Clone materials to avoid shared material issues
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material = child.material.map(mat => {
                  const cloned = mat.clone();
                  // Fix GLB color space
                  if (cloned.map) {
                    cloned.map.colorSpace = THREE.SRGBColorSpace;
                    cloned.map.anisotropy = 16;
                  }
                  cloned.roughness = Math.min(cloned.roughness ?? 1.0, 0.75);
                  cloned.needsUpdate = true;
                  return cloned;
                });
              } else {
                const cloned = child.material.clone();
                // Fix GLB color space
                if (cloned.map) {
                  cloned.map.colorSpace = THREE.SRGBColorSpace;
                  cloned.map.anisotropy = 16;
                }
                cloned.roughness = Math.min(cloned.roughness ?? 1.0, 0.75);
                cloned.needsUpdate = true;
                child.material = cloned;
              }
            }
          }
        });

        console.log('[Eisha] Materials fixed and shadows enabled');

        // Scale to target height
        const box = new THREE.Box3().setFromObject(model);
        const currentHeight = box.max.y - box.min.y;
        const scale = TARGET_HEIGHT / currentHeight;
        model.scale.setScalar(scale);

        // Compute floor offset after scaling
        const box2 = new THREE.Box3().setFromObject(model);
        const floorOffset = -box2.min.y;

        // Position at target location
        const surfaceY = getSurfaceY(TARGET_POSITION.x, TARGET_POSITION.z);
        console.log('[Eisha] Surface Y at position:', surfaceY.toFixed(3));

        // Use surfaceY + floorOffset to place on ground properly
        model.position.set(
          TARGET_POSITION.x,
          surfaceY + floorOffset,
          TARGET_POSITION.z
        );

        // Store model reference
        eishaModel = model;

        // Setup animations (already loaded in preload)
        if (eishaAnimations && eishaAnimations.length > 0) {
          eishaMixer = new THREE.AnimationMixer(model);

          console.log('[Eisha] Animations found:', eishaAnimations.map(a => a.name).join(', '));

          // Play first animation (usually idle or T-pose)
          const firstClip = eishaAnimations[0];
          const action = eishaMixer.clipAction(firstClip);
          action.play();

          console.log('[Eisha] Playing animation:', firstClip.name);
        } else {
          console.log('[Eisha] No animations found in GLB');
        }

        // Add to scene
        scene.add(model);

        // Debug: Add red marker cube at position
        const debugMarker = new THREE.Mesh(
          new THREE.BoxGeometry(1, 3, 1),
          new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 })
        );
        debugMarker.position.copy(model.position);
        debugMarker.position.y += 1.5; // Center of 3m tall cube
        scene.add(debugMarker);
        console.log('[Eisha] 🔴 Red debug marker added at position');

        console.log('[Eisha] ✅ Model added to scene');
        console.log('[Eisha] Position:', model.position.x.toFixed(2), model.position.y.toFixed(2), model.position.z.toFixed(2));
        console.log('[Eisha] Scale:', scale.toFixed(3), '| Height:', (currentHeight * scale).toFixed(2), 'm');
        console.log('[Eisha] Floor offset:', floorOffset.toFixed(3));
        console.log('[Eisha] Bounding box:', 'min:', box2.min.y.toFixed(2), 'max:', box2.max.y.toFixed(2));
        console.log('[Eisha] 📍 To teleport to Eisha, run: window.teleportToEisha()');

        // Add teleport helper
        window.teleportToEisha = () => {
          if (window.localPlayer && window.localPlayer.position) {
            window.localPlayer.position.set(TARGET_POSITION.x - 5, surfaceY, TARGET_POSITION.z);
            console.log('[Eisha] Teleported player to Eisha location');
          } else {
            console.warn('[Eisha] Player not available yet');
          }
        };

      resolve(model);
    } catch (error) {
      console.error('[Eisha] ❌ Failed to spawn:', error);
      console.error('[Eisha] Error details:', error?.message || error);
      reject(error);
    }
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
