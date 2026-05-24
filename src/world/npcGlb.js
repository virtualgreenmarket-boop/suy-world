import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { preloadAnimations, buildClipForSkeleton } from '../player/animations.js';

const NPC_URL      = '/models/characters/npcs/skylar_breeze_a_casual_summer_character_scan.glb';
const TARGET_HEIGHT = 1.75; // desired character height in metres

const loader    = new GLTFLoader();
let _template   = null;
let _floorY     = 0;        // amount to lift model so base sits at y = 0
let _hasSkel    = false;    // does the model have a skinned skeleton?
let _builtinClips = [];     // animations embedded in the GLB
let _promise    = null;

export function preloadNpc() {
  if (_promise) return _promise;
  _promise = new Promise((resolve, reject) =>
    loader.load(NPC_URL, gltf => {
      _template = gltf.scene;

      // Collect bones and enable shadows
      _template.traverse(n => {
        if (n.isMesh)       { n.castShadow = true; n.receiveShadow = true; }
        if (n.isBone)         _hasSkel = true;
        if (n.isSkinnedMesh)  _hasSkel = true;
      });

      // Normalise height if the model is at a wildly wrong scale
      const box1 = new THREE.Box3().setFromObject(_template);
      const h    = Math.max(box1.max.y - box1.min.y, 0.01);
      if (h < 0.5 || h > 4.0) _template.scale.setScalar(TARGET_HEIGHT / h);

      // Compute floor offset from the (possibly rescaled) bounding box
      const box2 = new THREE.Box3().setFromObject(_template);
      _floorY = -box2.min.y;

      _builtinClips = gltf.animations ?? [];

      console.log('[npc-glb] loaded — h:', h.toFixed(2),
                  '| built-in anims:', _builtinClips.length,
                  '| skeleton:', _hasSkel);
      resolve();
    }, undefined, reject)
  );
  return _promise;
}

/**
 * Spawn the GLB NPC into the scene.
 *   surfaceY — world Y of the surface she stands on (e.g. 0.7 for the plaza)
 *   rotY     — Y-axis rotation in radians
 *
 * Returns an object suitable for an update loop:
 *   { mixer, group, mode, idlePhase, baseY, idleTime }
 *
 * Modes:
 *   'builtin'   — AnimationMixer playing an embedded clip
 *   'retarget'  — AnimationMixer playing a remapped Mixamo idle
 *   'procedural'— no skeleton; handled by a gentle sway in the update helper
 */
export async function spawnNpc(scene, x, surfaceY, z, rotY = 0) {
  await preloadNpc();

  const clone = skeletonClone(_template);
  clone.position.set(x, _floorY + surfaceY, z);
  clone.rotation.y = rotY;
  scene.add(clone);

  const mixer = new THREE.AnimationMixer(clone);
  let mode = 'procedural';

  if (_builtinClips.length > 0) {
    // Priority 1: play the first embedded animation (usually idle / walk)
    const action = mixer.clipAction(_builtinClips[0]);
    action.play();
    mode = 'builtin';
    console.log('[npc-glb] using built-in anim:', _builtinClips[0].name || '(unnamed)');

  } else if (_hasSkel) {
    // Priority 2: retarget the Mixamo idle clip onto this skeleton
    await preloadAnimations();

    const boneNames = new Set();
    clone.traverse(n => {
      if (n.isBone)         boneNames.add(n.name);
      if (n.isSkinnedMesh)  n.skeleton.bones.forEach(b => boneNames.add(b.name));
    });

    if (boneNames.size > 0) {
      const clip = buildClipForSkeleton('idle', boneNames);
      if (clip && clip.tracks.length > 0) {
        mixer.clipAction(clip).play();
        mode = 'retarget';
        console.log('[npc-glb] retargeted Mixamo idle —', boneNames.size, 'bones,',
                    clip.tracks.length, 'tracks');
      } else {
        console.warn('[npc-glb] retarget yielded 0 tracks, falling back to procedural idle');
      }
    }
  }

  if (mode === 'procedural') {
    console.log('[npc-glb] no skeleton — using procedural idle sway');
  }

  return {
    mixer,
    group: clone,
    mode,
    idlePhase: Math.random() * Math.PI * 2,
    baseY:     _floorY + surfaceY,
    idleTime:  0,
  };
}

/**
 * Call this every frame. Works for all three modes.
 */
export function updateNpc(npc, delta) {
  if (!npc) return;

  if (npc.mode === 'builtin' || npc.mode === 'retarget') {
    npc.mixer.update(delta);
  } else {
    // Procedural idle: gentle breathing sway
    npc.idleTime += delta;
    const t = npc.idleTime;
    npc.group.rotation.z = Math.sin(t * 0.7  + npc.idlePhase) * 0.012;
    npc.group.position.y = npc.baseY
      + Math.sin(t * 1.1 + npc.idlePhase) * 0.006
      + Math.sin(t * 2.3 + npc.idlePhase * 1.3) * 0.003;
  }
}
