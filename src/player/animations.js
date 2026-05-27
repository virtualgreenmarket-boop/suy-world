import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Mixamo FBX track names arrive as "mixamorig:Hips.quaternion".
// Normalise to "mixamorigHips" so the tables below stay readable.
function normBone(raw) {
  return raw.replace('mixamorig:', 'mixamorig');
}

// ── Bone-name mapping tables ──────────────────────────────────────────
// Each tier is tried in order until a match is found.

// Tier 3: UE4 / Unreal-style skeletons (old Superhero_Male model)
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

// Tier 4: no-prefix Mixamo (Blender → GLB export; bones keep Mixamo names
// but the "mixamorig" prefix is stripped by the exporter)
const MIXAMO_TO_NOPFX = {
  mixamorigHips:          'Hips',
  mixamorigSpine:         'Spine',
  mixamorigSpine1:        'Spine1',
  mixamorigSpine2:        'Spine2',
  mixamorigNeck:          'Neck',
  mixamorigHead:          'Head',
  mixamorigLeftShoulder:  'LeftShoulder',
  mixamorigLeftArm:       'LeftArm',
  mixamorigLeftForeArm:   'LeftForeArm',
  mixamorigLeftHand:      'LeftHand',
  mixamorigRightShoulder: 'RightShoulder',
  mixamorigRightArm:      'RightArm',
  mixamorigRightForeArm:  'RightForeArm',
  mixamorigRightHand:     'RightHand',
  mixamorigLeftUpLeg:     'LeftUpLeg',
  mixamorigLeftLeg:       'LeftLeg',
  mixamorigLeftFoot:      'LeftFoot',
  mixamorigLeftToeBase:   'LeftToeBase',
  mixamorigRightUpLeg:    'RightUpLeg',
  mixamorigRightLeg:      'RightLeg',
  mixamorigRightFoot:     'RightFoot',
  mixamorigRightToeBase:  'RightToeBase',
};

// Tier 5: Unity Humanoid avatar naming (Unity/ithappy asset store packages)
const MIXAMO_TO_UNITY = {
  mixamorigHips:          'Hips',
  mixamorigSpine:         'Spine',
  mixamorigSpine1:        'Chest',
  mixamorigSpine2:        'UpperChest',
  mixamorigNeck:          'Neck',
  mixamorigHead:          'Head',
  mixamorigLeftShoulder:  'LeftShoulder',
  mixamorigLeftArm:       'LeftUpperArm',
  mixamorigLeftForeArm:   'LeftLowerArm',
  mixamorigLeftHand:      'LeftHand',
  mixamorigRightShoulder: 'RightShoulder',
  mixamorigRightArm:      'RightUpperArm',
  mixamorigRightForeArm:  'RightLowerArm',
  mixamorigRightHand:     'RightHand',
  mixamorigLeftUpLeg:     'LeftUpperLeg',
  mixamorigLeftLeg:       'LeftLowerLeg',
  mixamorigLeftFoot:      'LeftFoot',
  mixamorigLeftToeBase:   'LeftToes',
  mixamorigRightUpLeg:    'RightUpperLeg',
  mixamorigRightLeg:      'RightLowerLeg',
  mixamorigRightFoot:     'RightFoot',
  mixamorigRightToeBase:  'RightToes',
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
export function preloadAnimations() {
  if (_loadPromise) return _loadPromise;
  const base = '/models/animations/';
  _loadPromise = Promise.all([
    loadFbx(base + 'Remy@Idle.fbx').then(s        => { _fbxScenes.idle = s; }),
    loadFbx(base + 'Remy@Walking.fbx').then(s      => { _fbxScenes.walk = s; }),
    loadFbx(base + 'Remy@Running.fbx').then(s      => { _fbxScenes.run  = s; }),
    loadFbx(base + 'Remy@Jump.fbx').then(s         => { _fbxScenes.jump = s; }),
    loadFbx(base + 'Remy@SittingIdle.fbx')
      .then(s => { _fbxScenes.sit = s; })
      .catch(() => { /* optional — gracefully absent */ }),
  ]).then(() => console.log('[animations] FBX files loaded'));
  return _loadPromise;
}

// Stage 2: remap Mixamo tracks onto the skeleton's actual bone names.
export function buildClipsForSkeleton(boneNames) {
  for (const [name, scene] of Object.entries(_fbxScenes)) {
    _clips[name] = remapClip(scene, name, boneNames);
  }
  const trackCounts = Object.entries(_clips)
    .map(([n, c]) => `${n}:${c.tracks.length}`)
    .join(' ');
  console.log('[animations] clips built —', Object.keys(_clips).length,
              'clips,', boneNames.size, 'bones |', trackCounts);
  if (Object.values(_clips).every(c => c.tracks.length === 0)) {
    console.warn('[animations] ALL clips have 0 tracks — bone name mismatch.',
                 'Skeleton bones:', [...boneNames].slice(0, 12).join(', '));
  }
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
// Priority: raw name → normalised → UE4 → no-prefix Mixamo → Unity Humanoid
//           → case-insensitive bare-name match
function remapClip(fbxScene, name, boneNames) {
  const src = fbxScene.animations[0];
  if (!src) throw new Error(`No animation in FBX: ${name}`);

  // Pre-compute a lowercase → original-name map for O(1) fuzzy lookup
  const boneNamesLower = new Map([...boneNames].map(b => [b.toLowerCase(), b]));

  const tracks = [];
  for (const track of src.tracks) {
    const dot  = track.name.lastIndexOf('.');
    const prop = track.name.slice(dot + 1);
    if (prop !== 'quaternion') continue; // drop position/scale — no root motion

    const rawBone  = track.name.slice(0, dot); // "mixamorig:Hips"
    const normName = normBone(rawBone);          // "mixamorigHips"

    let targetBone = null;

    if (boneNames.has(rawBone)) {
      targetBone = rawBone;                              // tier 1: exact raw
    } else if (boneNames.has(normName)) {
      targetBone = normName;                             // tier 2: normalised
    } else {
      const ue4 = MIXAMO_TO_UE4[normName];
      if (ue4 && boneNames.has(ue4)) {
        targetBone = ue4;                                // tier 3: UE4
      } else {
        const nopfx = MIXAMO_TO_NOPFX[normName];
        if (nopfx && boneNames.has(nopfx)) {
          targetBone = nopfx;                            // tier 4: no-prefix Mixamo
        } else {
          const unity = MIXAMO_TO_UNITY[normName];
          if (unity && boneNames.has(unity)) {
            targetBone = unity;                          // tier 5: Unity Humanoid
          } else {
            // Tier 6: case-insensitive match on bare bone name (strips "mixamorig")
            const bare = normName.slice('mixamorig'.length).toLowerCase();
            const ci   = boneNamesLower.get(bare);
            if (ci) {
              targetBone = ci;
            } else {
              // Tier 7: match against the part after any "_" prefix
              // Catches bones named "chr_Hips", "rig_Spine", "Char_LeftArm", etc.
              for (const [lower, orig] of boneNamesLower) {
                const afterUnderscore = lower.includes('_')
                  ? lower.slice(lower.lastIndexOf('_') + 1)
                  : lower;
                if (afterUnderscore === bare) { targetBone = orig; break; }
              }
            }
          }
        }
      }
    }

    if (!targetBone) continue;

    const t = track.clone();
    t.name  = `${targetBone}.${prop}`;
    tracks.push(t);
  }

  if (tracks.length === 0) {
    console.warn(`[animations] 0 tracks remapped for "${name}" — bone name mismatch`);
  }
  return new THREE.AnimationClip(name, src.duration, tracks);
}
