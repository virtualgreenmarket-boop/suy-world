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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ----------------------------------------------------------------
// Animal pack filenames -> .gltf on disk. Edit this map if your
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
  constructor(id, species, root, gltfAnimations) {
    this.id = id;
    this.species = species;
    this.root = root; // THREE.Group, add this to your scene
    this.mixer = new THREE.AnimationMixer(root);
    this.clips = gltfAnimations;
    this.actions = {}; // keyed by our normalized name: idle/walk/run/...
    this.currentAction = null;

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
    return true;
  }

  update(dt) {
    this.mixer.update(dt);
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

export class AnimalManager {
  /**
   * @param {Object} opts
   * @param {string} opts.basePath folder containing the .gltf files,
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

    this.loader = new GLTFLoader();
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
    const instance = new AnimalInstance(id, species, root, gltf.animations);
    this.instances.set(id, instance);

    instance.play(options.startAnimation || 'idle');

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
   * @param {string[]} [opts.animations] pool of animation names to
   *   randomly assign per instance, default ['idle','walk']
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

      // even-ish spread: random angle + random radius (sqrt for
      // uniform area density instead of clustering at center)
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const pos = {
        x: center.x + Math.cos(angle) * r,
        y: center.y,
        z: center.z + Math.sin(angle) * r
      };

      const scale = minScale + Math.random() * (maxScale - minScale);
      const rotationY = Math.random() * Math.PI * 2;
      const startAnimation = animPool[Math.floor(Math.random() * animPool.length)];

      try {
        const instance = await this.spawn(species, pos, { scale, rotationY, startAnimation });
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

  /** Call once per frame with deltaSeconds to advance all animations. */
  update(dt) {
    this.instances.forEach((instance) => instance.update(dt));
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
