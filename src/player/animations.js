import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Mixamo FBX track names arrive as "mixamorig:Hips.quaternion".
// Normalise to "mixamorigHips" so the table below stays readable.
function normBone(raw) {
  return raw.replace('mixamorig:', 'mixamorig');
}

// Fallback table for UE4 / Unreal-style skeletons (old Superhero_Male model).
// Used only when the skeleton's bone names don't match Mixamo naming directly.
const MIXAMO_TO_UE4 = {
  mixamorigHips:          'pelvis',
  mixamorigSpine:         'spine_01',
  mixamorigSpine1:        'spine_02',
  mixamorigSpine2:        'spine_03',
  mixamorigNeck:          'neck_01',
  mixamorigHead:          'Head',
  mixamorigLeftShoulder:  'clavicle_l',
  mixamorigLeftArm:       'upperarm_l',
  mixamorigLeftForeArm:   'lowerarm_l',
  mixamorigLeftHand:      'hand_l',
  mixamorigRightShoulder: 'clavicle_r',
  mixamorigRightArm:      'upperarm_r',
  mixamorigRightForeArm:  'lowerarm_r',
  mixamorigRightHand:     'hand_r',
  mixamorigLeftUpLeg:     'thigh_l',
  mixamorigLeftLeg:       'calf_l',
  mixamorigLeftFoot:      'foot_l',
  mixamorigLeftToeBase:   'ball_l',
  mixamorigRightUpLeg:    'thigh_r',
  mixamorigRightLeg:      'calf_r',
  mixamorigRightFoot:     'foot_r',
  mixamorigRightToeBase:  'ball_r',
};

const _fbxScenes  = {};
const _clips      = {};
let   _loadPromise = null;
const _loader     = new FBXLoader();

function loadFbx(url) {
  return new Promise((resolve, reject) =>
    _loader.load(url, resolve, undefined, reject));
}

// Stage 1: download the FBX files only. Does NOT build clips yet.
// Safe to call in parallel with the character model download.
export function preloadAnimations() {
  if (_loadPromise) return _loadPromise;
  const base = '/models/animations/';
  _loadPromise = Promise.all([
    loadFbx(base + 'Remy@Idle.fbx').then(s    => { _fbxScenes.idle = s; }),
    loadFbx(base + 'Remy@Walking.fbx').then(s  => { _fbxScenes.walk = s; }),
    loadFbx(base + 'Remy@Running.fbx').then(s  => { _fbxScenes.run  = s; }),
    loadFbx(base + 'Remy@Jump.fbx').then(s     => { _fbxScenes.jump = s; }),
  ]).then(() => console.log('[animations] FBX files loaded'));
  return _loadPromise;
}

// Stage 2: remap Mixamo tracks onto the skeleton's actual bone names.
// Called by characterLoader after the character GLB is loaded and bones are known.
export function buildClipsForSkeleton(boneNames) {
  for (const [name, scene] of Object.entries(_fbxScenes)) {
    _clips[name] = remapClip(scene, name, boneNames);
  }
  console.log('[animations] clips built —', Object.keys(_clips).length, 'clips,',
              boneNames.size, 'bones');
}

export function getClip(name) { return _clips[name] ?? null; }

// Remap a single named FBX clip for an arbitrary skeleton without touching
// the global _clips (used by NPCs that may have different bone names).
export function buildClipForSkeleton(clipName, boneNames) {
  const scene = _fbxScenes[clipName];
  if (!scene) return null;
  return remapClip(scene, clipName, boneNames);
}

// Remap Mixamo animation tracks onto the target skeleton.
// Priority: exact raw name → normalised name → UE4 mapping → skip.
function remapClip(fbxScene, name, boneNames) {
  const src = fbxScene.animations[0];
  if (!src) throw new Error(`No animation in FBX: ${name}`);

  const tracks = [];
  for (const track of src.tracks) {
    const dot  = track.name.lastIndexOf('.');
    const prop = track.name.slice(dot + 1);
    if (prop !== 'quaternion') continue; // drop position/scale — no root motion

    const rawBone  = track.name.slice(0, dot); // "mixamorig:Hips"
    const normName = normBone(rawBone);          // "mixamorigHips"

    let targetBone = null;

    if (boneNames.has(rawBone)) {
      targetBone = rawBone;                         // skeleton uses Mixamo colon naming
    } else if (boneNames.has(normName)) {
      targetBone = normName;                        // skeleton uses normalised Mixamo naming
    } else {
      const ue4 = MIXAMO_TO_UE4[normName];
      if (ue4 && boneNames.has(ue4)) targetBone = ue4; // UE4 / custom skeleton
    }

    if (!targetBone) continue;

    const t = track.clone();
    t.name  = `${targetBone}.${prop}`;
    tracks.push(t);
  }

  if (tracks.length === 0) {
    console.warn(`[animations] zero tracks remapped for "${name}" — bone name mismatch`);
  }
  return new THREE.AnimationClip(name, src.duration, tracks);
}
