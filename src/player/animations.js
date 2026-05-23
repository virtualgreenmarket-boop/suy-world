import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Mixamo (Remy) bone names → UE4 Mannequin bone names
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

const _clips  = {};
let   _promise = null;
const _loader  = new FBXLoader();

function loadFbx(url) {
  return new Promise((resolve, reject) =>
    _loader.load(url, resolve, undefined, reject));
}

function remapClip(fbxScene, name) {
  const src = fbxScene.animations[0];
  if (!src) throw new Error(`No animation in FBX: ${name}`);
  const tracks = [];
  for (const track of src.tracks) {
    const dot  = track.name.lastIndexOf('.');
    const bone = track.name.slice(0, dot);
    const prop = track.name.slice(dot + 1);
    if (prop !== 'quaternion') continue; // drop position/scale (root motion)
    const mapped = MIXAMO_TO_UE4[bone];
    if (!mapped) continue;
    const t = track.clone();
    t.name  = `${mapped}.${prop}`;
    tracks.push(t);
  }
  return new THREE.AnimationClip(name, src.duration, tracks);
}

export function preloadAnimations() {
  if (_promise) return _promise;
  const base = '/models/animations/';
  _promise = Promise.all([
    loadFbx(base + 'Remy@Idle.fbx'),
    loadFbx(base + 'Remy@Walking.fbx'),
    loadFbx(base + 'Remy@Running.fbx'),
    loadFbx(base + 'Remy@Jump.fbx'),
  ]).then(([idle, walk, run, jump]) => {
    _clips.idle = remapClip(idle, 'idle');
    _clips.walk = remapClip(walk, 'walk');
    _clips.run  = remapClip(run,  'run');
    _clips.jump = remapClip(jump, 'jump');
    console.log('[animations] 4 clips loaded and remapped');
  }).catch(err => console.error('[animations] FBX load failed:', err));
  return _promise;
}

export function getClip(name) { return _clips[name] ?? null; }
