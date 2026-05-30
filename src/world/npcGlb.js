import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { preloadAnimations, buildClipForSkeleton } from '../player/animations.js';
import { getSurfaceY } from '../systems/terrain.js';
import { registerInteraction } from '../ui/interactionUI.js';
import { attachLabel } from '../ui/labels.js';

// ── NPC catalogue ─────────────────────────────────────────────────────
// All GLB files in public/models/characters/npcs/.
// Scale target: 1.75 m × 1.2 = 2.10 m (20% larger than standard height).
const TARGET_HEIGHT = 3.1;

const NPC_URLS = [
  // NPC 0 (Skylar Breeze) moved to center hangar
  '/models/characters/npcs/starfish_necklace_blue_bodysuit_portrait.glb',
  '/models/characters/npcs/texting_while_walking.glb',
  '/models/characters/npcs/jeny_tpose_riged.glb',
  // NPC 4 (GardenGirl) removed
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
  { x:  14, z:   0, rot: Math.PI / 2    }, // GardenGirl — overridden by circle logic
];


const _plazaNpcs    = [];
let _sitBenches     = [];
let _npcLabelCount  = 0;

export function registerSitBenches(benches) {
  _sitBenches = benches;
}

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

    _npcLabelCount++;
    attachLabel(npc.group, `NPC ${_npcLabelCount}`, 4.0);

    if (i === 3) {
      // Jeny patrols along the marina deck (deck y=3.2, world x≈-222, z from -50 to +50)
      const deckY = 3.2 + npc.floorOffset;
      npc.group.position.set(-222, deckY, -45);
      npc.baseY        = deckY;
      npc.walkMode     = 'patrol';
      npc.patrolA      = new THREE.Vector3(-222, deckY, -45);
      npc.patrolB      = new THREE.Vector3(-222, deckY,  45);
      npc.patrolForward = true;
      npc.patrolPause  = 0;
      if (npc.walkAction) {
        npc.idleAction?.stop();
        npc.walkAction.reset().play();
      } else {
        npc.idleAction?.reset().play();
      }

      registerInteraction([-222, deckY + 2, 0], 'Talk', 3, null, () => {});
    } else if (i === 2) {
      // Walks straight forward, turns 145° at plaza edge
      npc.walkMode = 'straight';
      npc.straightDirection = 0; // rotation in radians
      npc.canWalk = false;

      // Calculate exact distance from animation root motion
      const slowdownFactor = 1.5; // 3x faster than base (was 0.5 for half speed)
      let animSpeed = 1.0; // default m/s
      if (npc.walkAction) {
        npc.walkAction.timeScale = slowdownFactor; // Slow down animation
        const clip = npc.walkAction.getClip();

        if (clip && clip.duration > 0) {
          // Find position tracks to calculate actual distance traveled
          let distanceTraveled = 0;

          for (const track of clip.tracks) {
            // Look for root position tracks (usually .position[x] or .position[z])
            if (track.name.includes('.position') && (track.name.includes('[z]') || track.name.includes('[x]'))) {
              const values = track.values;
              if (values.length >= 2) {
                // Calculate total distance: |end - start|
                const start = values[0];
                const end = values[values.length - 1];
                const delta = Math.abs(end - start);
                distanceTraveled += delta * delta; // sum of squares for 3D distance
              }
            }
          }

          // If we found position tracks, use actual distance
          if (distanceTraveled > 0) {
            distanceTraveled = Math.sqrt(distanceTraveled);
            animSpeed = (distanceTraveled / clip.duration) * slowdownFactor;
            console.log('[NPC 3] animation distance:', distanceTraveled.toFixed(3), 'm in', clip.duration.toFixed(3), 's → speed:', animSpeed.toFixed(3), 'm/s (with', (slowdownFactor * 100).toFixed(0), '% slowdown)');
          } else {
            // Fallback: use manual tuning for no root motion animation
            // Texting animation likely has no root motion, so manually set stride
            const manualStride = 1.0; // tuned manually (adjust if needed)
            animSpeed = (manualStride / clip.duration) * slowdownFactor;
            console.log('[NPC 3] no root motion detected, using manual stride:', manualStride, 'm → speed:', animSpeed.toFixed(3), 'm/s');
          }
        }
      }
      npc.straightSpeed = animSpeed;

      // Set position at floor level (no offset - feet on ground)
      const surfaceY = getSurfaceY(npc.group.position.x, npc.group.position.z);
      npc.group.position.y = surfaceY;
      npc.baseY = surfaceY;

      // Fix material brightness - add emissive light
      npc.group.traverse(n => {
        if (n.isMesh && n.material) {
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(m => {
            if (m.isMeshStandardMaterial) {
              m.emissive.setHex(0x333333); // Add subtle emissive glow
              m.emissiveIntensity = 0.3;
            }
          });
        }
      });

      // Play walk animation
      if (npc.walkAction) {
        npc.idleAction?.stop();
        npc.walkAction.reset().play();
      } else if (npc.idleAction) {
        npc.idleAction.reset().play();
      }
    } else if (i === 0 || i === 1) {
      const bench = _sitBenches[i];
      if (bench) {
        const sp     = bench.sitPoints[i];
        const wx     = bench.position.x + sp.localX;
        const wz     = bench.position.z;
        const wy     = bench.seatY + npc.floorOffset;
        const facing = bench.rotation.y - Math.PI / 2;

        npc.group.position.set(wx, wy, wz);
        npc.group.rotation.y = facing;
        npc.baseY    = wy;
        npc.walkMode = 'sit';

        if (!npc.sitAction) {
          await preloadAnimations();
          const boneNames = new Set();
          npc.group.traverse(n => {
            if (n.isBone)        boneNames.add(n.name);
            if (n.isSkinnedMesh) n.skeleton.bones.forEach(b => boneNames.add(b.name));
          });
          const sitClip = buildClipForSkeleton('sit', boneNames);
          if (sitClip?.tracks.length > 0) {
            npc.sitAction = npc.mixer.clipAction(sitClip);
          }
        }

        npc.idleAction?.stop();
        if (npc.sitAction) {
          npc.sitAction.reset().play();
        } else {
          npc.idleAction?.reset().play();
        }
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
  // m.clone() copies all texture references onto a fresh material instance.
  // Textures are GPU-immutable at runtime so sharing them across instances is
  // safe and avoids the re-upload cycle that caused white meshes on FBX→GLB
  // models (deep-cloning textures and re-setting colorSpace broke GLTFLoader's
  // already-correct color space assignments).
  const c = m.clone();
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

  // Compute floor offset from geometry bounding boxes (reliable for SkinnedMesh)
  clone.updateWorldMatrix(true, true);
  let lowestY = Infinity;
  clone.traverse(n => {
    if (!n.isMesh && !n.isSkinnedMesh) return;
    if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
    const tmp = n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld);
    if (tmp.min.y < lowestY) lowestY = tmp.min.y;
  });
  const cloneFloorY = isFinite(lowestY) ? -lowestY : floorY;

  clone.position.set(x, cloneFloorY + surfaceY, z);
  clone.rotation.y = rotY;
  scene.add(clone);

  const mixer = new THREE.AnimationMixer(clone);
  let mode = 'procedural', idleAction = null, walkAction = null, sitAction = null;

  if (builtinClips.length > 0) {
    // Use built-in animations — find idle + walk + sit by name
    const findClip = (...keywords) => builtinClips.find(c => {
      const n = c.name.toLowerCase();
      return keywords.some(k => n.includes(k));
    });

    const idleClip = findClip('idle', 'stand', 'breathing', 'tpose', 't-pose') ?? builtinClips[0];
    const walkClip = findClip('walk', 'run', 'walking', 'jog', 'move', 'locomotion')
                  ?? (builtinClips.length > 1 ? builtinClips[1] : builtinClips[0])
                  ?? null;
    const sitClip  = findClip('sit', 'sitting', 'seated', 'chair') ?? null;

    idleAction = mixer.clipAction(idleClip);
    idleAction.play();
    if (walkClip) walkAction = mixer.clipAction(walkClip);
    if (sitClip)  sitAction  = mixer.clipAction(sitClip);
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
    idleAction, walkAction, sitAction,
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

  // Sitting — just tick the animation, no movement
  if (npc.walkMode === 'sit') {
    npc.mixer.update(delta);
    return;
  }

  // Patrol walk (back-and-forth between two points)
  if (npc.walkMode === 'patrol') {
    npc.mixer.update(delta);
    if (npc.patrolPause > 0) {
      npc.patrolPause -= delta;
      if (npc.patrolPause <= 0) {
        npc.idleAction?.fadeOut(0.3);
        npc.walkAction?.reset().fadeIn(0.3).play();
      }
      return;
    }
    const target = npc.patrolForward ? npc.patrolB : npc.patrolA;
    const dx = target.x - npc.group.position.x;
    const dz = target.z - npc.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.5) {
      npc.patrolForward = !npc.patrolForward;
      npc.patrolPause   = 1.5 + Math.random() * 2;
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
    return;
  }

  // Straight walk (texting NPC) - walks forward, turns 145° at plaza edge
  if (npc.walkMode === 'straight') {
    npc.mixer.update(delta);

    // Calculate movement direction
    const dx = Math.sin(npc.straightDirection) * npc.straightSpeed * delta;
    const dz = Math.cos(npc.straightDirection) * npc.straightSpeed * delta;

    const newX = npc.group.position.x + dx;
    const newZ = npc.group.position.z + dz;

    // Check if at plaza edge (radius 36)
    const distFromCenter = Math.sqrt(newX * newX + newZ * newZ);

    if (distFromCenter > 36) {
      // Hit edge - turn 145 degrees (2.53 radians)
      npc.straightDirection += 2.53;
      // Normalize angle
      if (npc.straightDirection > Math.PI * 2) {
        npc.straightDirection -= Math.PI * 2;
      }
    } else {
      // Move forward
      npc.group.position.x = newX;
      npc.group.position.z = newZ;
    }

    // Always at floor level (no offset - feet on ground)
    npc.group.position.y = getSurfaceY(npc.group.position.x, npc.group.position.z);
    npc.group.rotation.y = npc.straightDirection;
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
