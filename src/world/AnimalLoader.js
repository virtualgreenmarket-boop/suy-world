/**
 * AnimalLoader.js
 * --------------------------------------------------------------------
 * Loads real GLB animal models ("Ultimate Animated Animals" pack) and
 * plays their BUILT-IN animations via THREE.AnimationMixer. This is a
 * deliberately SEPARATE system from CharacterBuilder.js (the
 * primitive-based human/zombie/demon/robot rig) — animals here keep
 * their original meshes, materials, textures, and animation clips
 * exactly as authored. Nothing is rebuilt from boxes/spheres.
 *
 * Requires three's GLTFLoader addon. If your project already imports
 * three from a CDN/bundler, import GLTFLoader from the matching path,
 * e.g.:
 *   import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
 *
 * Usage:
 *   import { AnimalManager } from './AnimalLoader.js';
 *
 *   const animals = new AnimalManager({ basePath: '/models/nature/animals/Ultimate Animated Animals - July 2021/glTF/' });
 *
 *   await animals.spawn('Horse', { x: 4, y: 0, z: -2 });
 *   await animals.spawn('Cow', { x: -3, y: 0, z: 5 }, { scale: 1.1, rotationY: Math.PI / 3 });
 *   await animals.spawnScattered(['Horse', 'Cow', 'Deer', 'Donkey'], { count: 12, radius: 18 });
 *
 *   // in your render loop:
 *   animals.update(deltaSeconds);
 *
 *   // optional: switch an animal's animation by name fragment
 *   animals.playAnimation(someInstanceId, 'walk');
 * --------------------------------------------------------------------
 */

import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/sharedLoaders.js';
import { isValidGrassPosition } from './mapZones.js';

// ----------------------------------------------------------------
// Animal pack filenames -> .glb on disk. Edit this map if your
// folder uses different casing/names than listed here.
// ----------------------------------------------------------------
export const ANIMAL_FILES = {
  Alpaca: 'Alpaca.gltf',
  Bull: 'Bull.gltf',
  Deer: 'Deer.gltf',
  Donkey: 'Donkey.gltf',
  Fox: 'Fox.gltf',
  Husky: 'Husky.gltf',
  ShibaInu: 'ShibaInu.gltf',
  Stag: 'Stag.gltf',
  Wolf: 'Wolf.gltf'
};

// ----------------------------------------------------------------
// Clip-name keyword groups, used to auto-pick a sensible default
// animation per animal. Asset packs from different artists name
// clips inconsistently ("Walk" vs "Walking" vs "walk_cycle"), so
// this matches by substring rather than exact name. If none of
// these match, the FIRST clip in the file is used as a fallback
// and the real clip name is logged so you can extend this list.
// ----------------------------------------------------------------
const CLIP_KEYWORDS = {
  idle: ['idle', 'breath', 'stand'],
  walk: ['walk'],
  run: ['run', 'gallop', 'sprint', 'canter'],
  eat: ['eat', 'graze'],
  jump: ['jump', 'leap'],
  attack: ['attack', 'bite', 'kick'],
  death: ['death', 'die']
};

function findClipByKeywords(clips, keywords) {
  const lower = clips.map((c) => c.name.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((n) => n.includes(kw));
    if (idx !== -1) return clips[idx];
  }
  return null;
}

/**
 * One loaded animal instance: the scene object + its own mixer +
 * its own action map, so multiple instances of the same species
 * (e.g. 3 cows) animate fully independently.
 */
class AnimalInstance {
  constructor(id, species, root, gltfAnimations, opts = {}) {
    this.id = id;
    this.species = species;
    this.root = root; // THREE.Group, add this to your scene
    this.mixer = new THREE.AnimationMixer(root);
    this.clips = gltfAnimations;
    this.actions = {}; // keyed by our normalized name: idle/walk/run/...
    this.currentAction = null;

    // ---- movement / wander state ----
    // colliderRadius: half-width used for both (a) blocking the
    // player from walking through this animal and (b) keeping this
    // animal from walking through OTHER animals/obstacles.
    this.colliderRadius = opts.colliderRadius != null ? opts.colliderRadius : 0.6;
    this.moveSpeed = { idle: 0, walk: opts.walkSpeed || 0.8, run: opts.runSpeed || 2.6 };
    this.wanderCenter = opts.wanderCenter
      ? new THREE.Vector3(opts.wanderCenter.x, 0, opts.wanderCenter.z)
      : new THREE.Vector3(root.position.x, 0, root.position.z);
    this.wanderRadius = opts.wanderRadius != null ? opts.wanderRadius : 6;
    this.wanderTarget = null;
    this._wanderPauseT = 0; // seconds remaining in a pause before picking a new target
    this._stateName = 'idle';

    this._buildActionMap();
  }

  _buildActionMap() {
    if (!this.clips || this.clips.length === 0) {
      console.warn(`[AnimalLoader] ${this.species} (${this.id}) has no animation clips in its GLB.`);
      return;
    }

    Object.entries(CLIP_KEYWORDS).forEach(([normName, keywords]) => {
      const clip = findClipByKeywords(this.clips, keywords);
      if (clip) this.actions[normName] = this.mixer.clipAction(clip);
    });

    // Fallback: if nothing matched any keyword group, expose every
    // raw clip under its own actual name AND log them so you can
    // see exactly what's available for that file.
    if (Object.keys(this.actions).length === 0) {
      console.log(
        `[AnimalLoader] ${this.species}: no keyword match, exposing raw clip names:`,
        this.clips.map((c) => c.name)
      );
      this.clips.forEach((clip) => {
        this.actions[clip.name] = this.mixer.clipAction(clip);
      });
    } else {
      console.log(
        `[AnimalLoader] ${this.species}: mapped animations ->`,
        Object.keys(this.actions),
        '(all raw clip names:',
        this.clips.map((c) => c.name),
        ')'
      );
    }
  }

  /** Play an animation by normalized name (idle/walk/run/eat/jump/attack/death)
   *  or by raw clip name if no keyword match was found for this species.
   *  Cross-fades from whatever is currently playing. */
  play(name, fadeSeconds = 0.3) {
    const next = this.actions[name];
    if (!next) {
      console.warn(`[AnimalLoader] ${this.species} (${this.id}) has no animation "${name}". Available:`, Object.keys(this.actions));
      return false;
    }
    if (this.currentAction === next) return true;

    next.reset().fadeIn(fadeSeconds).play();
    if (this.currentAction) this.currentAction.fadeOut(fadeSeconds);
    this.currentAction = next;
    this._stateName = name in this.moveSpeed ? name : this._stateName;
    return true;
  }

  /**
   * Picks a new random point inside the wander circle and walks
   * toward it. Call this once after spawn to start wandering; the
   * manager's update loop re-picks automatically on arrival.
   */
  pickNewWanderTarget() {
    let attempts = 0;
    let x, z;

    // Try to find a valid position (not in forbidden zones)
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this.wanderRadius;
      x = this.wanderCenter.x + Math.cos(angle) * r;
      z = this.wanderCenter.z + Math.sin(angle) * r;
      attempts++;
    } while (!isPositionValid(x, z) && attempts < 20);

    // If we couldn't find a valid position, stay near current position
    if (attempts >= 20) {
      const nearAngle = Math.random() * Math.PI * 2;
      const nearRadius = 2 + Math.random() * 4;
      x = this.root.position.x + Math.cos(nearAngle) * nearRadius;
      z = this.root.position.z + Math.sin(nearAngle) * nearRadius;
    }

    this.wanderTarget = new THREE.Vector3(x, 0, z);
  }

  /**
   * Advances movement toward the current wander target at the speed
   * implied by the current animation state ('idle' speed is 0, so
   * an idling animal naturally stands still even with a target set).
   * otherAnimals: array of other AnimalInstance to avoid walking into.
   */
  _updateMovement(dt, otherAnimals) {
    const speed = this.moveSpeed[this._stateName] || 0;

    if (speed === 0) return; // idle / eat / sit-equivalent — no translation

    if (this._wanderPauseT > 0) {
      this._wanderPauseT -= dt;
      return;
    }
    if (!this.wanderTarget) {
      this.pickNewWanderTarget();
      return;
    }

    const pos = this.root.position;
    const dx = this.wanderTarget.x - pos.x;
    const dz = this.wanderTarget.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.15) {
      // arrived — pause briefly, then pick a new target next tick
      this._wanderPauseT = 1 + Math.random() * 2;
      this.wanderTarget = null;
      return;
    }

    const stepLen = Math.min(speed * dt, dist);
    let moveX = (dx / dist) * stepLen;
    let moveZ = (dz / dist) * stepLen;

    // ---- collision avoidance against other animals ----
    // Predict next position; if it would land inside another
    // animal's collider, cancel this frame's move (simple stop,
    // not a full steering/avoidance system — sufficient to stop
    // visible clipping between animals).
    const nextX = pos.x + moveX;
    const nextZ = pos.z + moveZ;
    for (const other of otherAnimals) {
      if (other === this) continue;
      const odx = nextX - other.root.position.x;
      const odz = nextZ - other.root.position.z;
      const minDist = this.colliderRadius + other.colliderRadius;
      if (odx * odx + odz * odz < minDist * minDist) {
        moveX = 0;
        moveZ = 0;
        this._wanderPauseT = 0.4; // brief pause then re-route via a new target
        this.wanderTarget = null;
        break;
      }
    }

    if (moveX !== 0 || moveZ !== 0) {
      // Check if new position is valid (not in forbidden zone)
      if (isPositionValid(nextX, nextZ)) {
        pos.x += moveX;
        pos.z += moveZ;

        // face the direction of travel, smoothly
        const targetAngle = Math.atan2(moveX, moveZ);
        this.root.rotation.y = lerpAngle(this.root.rotation.y, targetAngle, 0.12);
      } else {
        // Hit forbidden zone, pick new target
        this._wanderPauseT = 0.3;
        this.wanderTarget = null;
      }
    }
  }

  update(dt, otherAnimals) {
    this.mixer.update(dt);
    this._updateMovement(dt, otherAnimals || []);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          Object.values(m).forEach((v) => {
            if (v && v.isTexture) v.dispose();
          });
          m.dispose();
        });
      }
    });
  }
}

/** Shortest-path angle interpolation (350deg -> 10deg takes the short way, not the long way around). */
function lerpAngle(current, target, t) {
  let diff = target - current;
  diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

// ----------------------------------------------------------------
// Forbidden zones — animals avoid these areas (plaza, hangars, etc.)
// ----------------------------------------------------------------
const FORBIDDEN_ZONES = [
  // Plaza area (central circle)
  { x: 0, z: 0, radius: 65 },

  // Hangars (4 cardinal directions)
  { x: -50, z: -271.075, radius: 95 },    // North hangar
  { x: 212.6, z: 0, radius: 95 },         // East hangar
  { x: -50, z: 262.6, radius: 95 },       // South hangar
  { x: -162.6, z: 0, radius: 95 },        // West hangar (Marina)

  // Paths (expanded to keep animals off roads)
  { x: 0, z: -100, radius: 15 },  // North path
  { x: 0, z: 100, radius: 15 },   // South path
  { x: 100, z: 0, radius: 15 },   // East path
  { x: -100, z: 0, radius: 15 },  // West path
];

/**
 * Check if a position is valid for animal spawn/movement
 * (not in forbidden zones, not too close to island edge)
 */
function isPositionValid(x, z) {
  // FIXED: Use zone-aware validation from mapZones.js
  // This ensures animals NEVER spawn in water (beach/shallow/deep zones)
  // and respects the asymmetric ellipse island shape
  return isValidGrassPosition(x, z);
}

export class AnimalManager {
  /**
   * @param {Object} opts
   * @param {string} opts.basePath folder containing the .glb files,
   *   trailing slash required, e.g.
   *   '/models/nature/animals/Ultimate Animated Animals - July 2021/glTF/'
   * @param {THREE.Scene} [opts.scene] if provided, spawn() auto-adds
   *   to this scene; otherwise you add instance.root yourself.
   */
  constructor(opts = {}) {
    if (!opts.basePath) {
      throw new Error('[AnimalLoader] AnimalManager requires opts.basePath pointing at the glTF folder.');
    }
    this.basePath = opts.basePath;
    this.scene = opts.scene || null;

    this.loader = createGLTFLoader();
    this._gltfCache = new Map(); // species -> Promise<GLTF> (so repeated spawns reuse the parsed file)
    this.instances = new Map(); // id -> AnimalInstance
    this._nextId = 1;
  }

  _loadSpecies(species) {
    if (!ANIMAL_FILES[species]) {
      return Promise.reject(new Error(`[AnimalLoader] Unknown species "${species}". Valid: ${Object.keys(ANIMAL_FILES).join(', ')}`));
    }
    if (this._gltfCache.has(species)) return this._gltfCache.get(species);

    const url = this.basePath + ANIMAL_FILES[species];
    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(new Error(`[AnimalLoader] Failed to load ${species} from ${url}: ${err.message || err}`))
      );
    });
    this._gltfCache.set(species, promise);
    return promise;
  }

  /**
   * Spawn one animal instance at a position.
   * @param {string} species one of ANIMAL_FILES keys, e.g. 'Horse'
   * @param {{x:number,y:number,z:number}} position
   * @param {Object} [options]
   * @param {number} [options.scale=1]
   * @param {number} [options.rotationY=0] radians
   * @param {string} [options.startAnimation='idle']
   * @param {boolean} [options.castShadow=true]
   * @param {number} [options.colliderRadius=0.6] half-width used to
   *   block both the player and other animals from walking through it
   * @param {number} [options.walkSpeed=0.8] world units/second while in 'walk'
   * @param {number} [options.runSpeed=2.6] world units/second while in 'run'
   * @param {{x:number,z:number}} [options.wanderCenter] defaults to spawn position
   * @param {number} [options.wanderRadius=6] how far from wanderCenter it roams
   * @returns {Promise<AnimalInstance>}
   */
  async spawn(species, position, options = {}) {
    const gltf = await this._loadSpecies(species);

    // Clone the scene graph (SkeletonUtils-safe clone for skinned
    // meshes) so multiple instances of the same species don't share
    // a single skeleton/pose.
    const root = cloneSkinned(gltf.scene);

    root.position.set(position.x || 0, position.y || 0, position.z || 0);
    root.rotation.y = options.rotationY || 0;
    const scale = options.scale != null ? options.scale : 1;
    root.scale.setScalar(scale);

    const castShadow = options.castShadow !== false;
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = castShadow;
        obj.receiveShadow = true;
        // Explicitly do NOT touch obj.material here — original
        // colors/textures from the GLB are preserved untouched.
      }
    });

    const id = `${species}_${this._nextId++}`;
    const instance = new AnimalInstance(id, species, root, gltf.animations, {
      colliderRadius: options.colliderRadius,
      walkSpeed: options.walkSpeed,
      runSpeed: options.runSpeed,
      wanderCenter: options.wanderCenter || position,
      wanderRadius: options.wanderRadius
    });
    this.instances.set(id, instance);

    const startAnim = options.startAnimation || 'idle';
    instance.play(startAnim);
    if (startAnim === 'walk' || startAnim === 'run') {
      instance.pickNewWanderTarget();
    }

    if (this.scene) this.scene.add(root);

    return instance;
  }

  /**
   * Convenience: scatter multiple animals (random species from the
   * given list) across a circular area on the ground, with random
   * rotation and a default walk/idle mix so a field doesn't look
   * frozen. Returns the array of spawned instances.
   *
   * @param {string[]} speciesList e.g. ['Horse','Cow','Deer','Donkey']
   * @param {Object} opts
   * @param {number} [opts.count=10]
   * @param {number} [opts.radius=15] meters from origin
   * @param {{x:number,y:number,z:number}} [opts.center] default {0,0,0}
   * @param {number} [opts.minScale=0.9]
   * @param {number} [opts.maxScale=1.15]
   * @param {string[]} opts.animations pool of animation names to
   *   randomly assign per instance, default ['idle','walk']
   * @param {number} [opts.colliderRadius] passed through to spawn()
   * @param {number} [opts.walkSpeed] passed through to spawn()
   * @param {number} [opts.runSpeed] passed through to spawn()
   * @param {number} [opts.wanderRadius] passed through to spawn() —
   *   how far each animal roams from ITS OWN spawn point
   */
  async spawnScattered(speciesList, opts = {}) {
    const count = opts.count || 10;
    const radius = opts.radius || 15;
    const center = opts.center || { x: 0, y: 0, z: 0 };
    const minScale = opts.minScale != null ? opts.minScale : 0.9;
    const maxScale = opts.maxScale != null ? opts.maxScale : 1.15;
    const animPool = opts.animations || ['idle', 'walk'];

    const spawned = [];
    for (let i = 0; i < count; i++) {
      const species = speciesList[Math.floor(Math.random() * speciesList.length)];

      // Find valid spawn position (avoid forbidden zones)
      let validPos = false;
      let attempts = 0;
      let x, z;
      while (!validPos && attempts < 30) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        x = center.x + Math.cos(angle) * r;
        z = center.z + Math.sin(angle) * r;
        validPos = isPositionValid(x, z);
        attempts++;
      }

      if (!validPos) {
        console.warn(`[AnimalLoader] Could not find valid spawn position for ${species} after ${attempts} attempts, skipping`);
        continue;
      }

      const pos = { x, y: center.y, z };
      const scale = minScale + Math.random() * (maxScale - minScale);
      const rotationY = Math.random() * Math.PI * 2;
      const startAnimation = animPool[Math.floor(Math.random() * animPool.length)];

      try {
        const instance = await this.spawn(species, pos, {
          scale,
          rotationY,
          startAnimation,
          colliderRadius: opts.colliderRadius,
          walkSpeed: opts.walkSpeed,
          runSpeed: opts.runSpeed,
          wanderRadius: opts.wanderRadius
        });
        spawned.push(instance);
      } catch (err) {
        console.error(err);
      }
    }
    return spawned;
  }

  /** Switch an existing instance's animation. See AnimalInstance.play(). */
  playAnimation(id, name, fadeSeconds = 0.3) {
    const instance = this.instances.get(id);
    if (!instance) {
      console.warn(`[AnimalLoader] No instance with id "${id}"`);
      return false;
    }
    return instance.play(name, fadeSeconds);
  }

  /** Remove and dispose one instance (geometry/material/texture cleanup). */
  remove(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    if (this.scene) this.scene.remove(instance.root);
    instance.dispose();
    this.instances.delete(id);
  }

  /** Remove and dispose every spawned instance. */
  removeAll() {
    Array.from(this.instances.keys()).forEach((id) => this.remove(id));
  }

  /** Call once per frame with deltaSeconds to advance all animations and movement. */
  update(dt) {
    const all = Array.from(this.instances.values());
    all.forEach((instance) => instance.update(dt, all));
  }

  /**
   * Checks whether a proposed player position would overlap any
   * animal's collider. Call this from your player movement code
   * BEFORE committing a position update, e.g.:
   *
   *   const next = { x: player.x + moveX, z: player.z + moveZ };
   *   if (!animalManager.wouldCollide(next, PLAYER_RADIUS)) {
   *     player.position.x = next.x;
   *     player.position.z = next.z;
   *   }
   *
   * @param {{x:number,z:number}} position proposed next position
   * @param {number} [otherRadius=0.4] the moving entity's own radius
   * @returns {boolean} true if it would overlap an animal
   */
  wouldCollide(position, otherRadius = 0.4) {
    for (const instance of this.instances.values()) {
      const dx = position.x - instance.root.position.x;
      const dz = position.z - instance.root.position.z;
      const minDist = instance.colliderRadius + otherRadius;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
  }
}

// ----------------------------------------------------------------
// Minimal skinned-mesh-safe clone. THREE's built-in Object3D.clone()
// does NOT correctly clone skinned meshes (bones end up shared
// across clones, so animating one instance moves all of them). This
// is a small inline version of the common SkeletonUtils.clone
// pattern so the file has no extra addon dependency beyond
// GLTFLoader itself.
// ----------------------------------------------------------------
function cloneSkinned(source) {
  // clone(true) DOES deep-clone bones (verified: cloned Bone objects
  // are distinct instances from the originals), but it does NOT
  // rebuild SkinnedMesh.skeleton to point at the cloned bones — that
  // still references the original skeleton/bones unless we rebind
  // it ourselves below. Matching source node <-> clone node can't
  // use uuid (clone() assigns new uuids); traversal order is stable
  // for an unmodified clone, so we walk both trees in parallel and
  // pair nodes by position instead.
  const clone = source.clone(true);

  const sourceNodes = [];
  const cloneNodes = [];
  source.traverse((node) => sourceNodes.push(node));
  clone.traverse((node) => cloneNodes.push(node));

  const boneMap = new Map(); // source bone -> clone bone
  for (let i = 0; i < sourceNodes.length; i++) {
    if (sourceNodes[i].isBone) boneMap.set(sourceNodes[i], cloneNodes[i]);
  }

  for (let i = 0; i < sourceNodes.length; i++) {
    const node = sourceNodes[i];
    if (!node.isSkinnedMesh) continue;
    const cloneNode = cloneNodes[i];

    const skeleton = node.skeleton;
    const newBones = skeleton.bones.map((bone) => boneMap.get(bone) || bone);
    cloneNode.bind(new THREE.Skeleton(newBones, skeleton.boneInverses), node.bindMatrix);
  }

  return clone;
}
