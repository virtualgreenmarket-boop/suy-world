import * as THREE from 'three';
import { buildCharacter, animateCharacter, CHARACTERS } from './CharacterBuilder.js';

let _characterType = 'boy';

function getTypeFromId(characterId) {
  const types = ['boy', 'girl', 'zombie', 'demon', 'robot'];
  return types[characterId - 1] || 'boy';
}

export async function preloadPlayerCharacter(characterId) {
  _characterType = getTypeFromId(characterId);
  console.log(`[player] 🎭 Preloaded character type: ${_characterType}`);
}

export async function spawnPlayerCharacter(parentGroup, characterId) {
  console.log('═══════════════════════════════════════════');
  console.log('[player] 🎭 SPAWNING PLAYER CHARACTER');
  console.log('═══════════════════════════════════════════');

  // Remove old character if exists
  if (parentGroup.userData._charModel) {
    parentGroup.remove(parentGroup.userData._charModel);
    console.log('[player] 🗑️ Removed old character');
  }

  const type = getTypeFromId(characterId);
  console.log(`[player] 🎯 Building character type: ${type}`);

  const charGroup = buildCharacter(type);
  console.log(`[player] ✅ Character group created, children: ${charGroup.children.length}`);

  // Ensure all materials are applied correctly and meshes are visible
  let meshCount = 0;
  charGroup.traverse(n => {
    if (n.isMesh) {
      meshCount++;
      n.visible = true;
      n.material.needsUpdate = true;
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  console.log(`[player] 🎨 Applied materials to ${meshCount} meshes`);
  console.log(`[player] Character spawned with ${charGroup.children.length} children`);

  // Measure height and scale to 1.8 units
  const bbox = new THREE.Box3().setFromObject(charGroup);
  const size = bbox.getSize(new THREE.Vector3());
  const currentHeight = size.y;

  console.log(`[player] 📏 Original height: ${currentHeight.toFixed(2)}m`);

  if (currentHeight > 0) {
    const scale = 1.8 / currentHeight;
    charGroup.scale.setScalar(scale);
    charGroup.updateMatrixWorld(true);
    console.log(`[player] 📏 Scaled to 1.8m (scale factor: ${scale.toFixed(2)})`);
  }

  // Position at Y=0 (feet on ground)
  const bbox2 = new THREE.Box3().setFromObject(charGroup);
  const offset = -bbox2.min.y;
  charGroup.position.y = offset;

  console.log(`[player] 📍 Positioned at Y=${offset.toFixed(2)}`);

  // Add to parent group
  parentGroup.add(charGroup);
  parentGroup.userData._charModel = charGroup;
  parentGroup.userData._charType = type;
  parentGroup.userData._animState = 'idle';
  parentGroup.userData._animT = 0;

  console.log('═══════════════════════════════════════════');
  console.log(`[player] ✅ CHARACTER SPAWNED SUCCESSFULLY!`);
  console.log(`[player]    Name: ${CHARACTERS[type].name}`);
  console.log(`[player]    Type: ${type}`);
  console.log(`[player]    Parent children count: ${parentGroup.children.length}`);
  console.log(`[player]    Character visible: ${charGroup.visible}`);
  console.log(`[player]    Character position: (${charGroup.position.x.toFixed(2)}, ${charGroup.position.y.toFixed(2)}, ${charGroup.position.z.toFixed(2)})`);
  console.log('═══════════════════════════════════════════');
}

export function setPlayerAnimState(group, state, immediate = false) {
  if (group.userData._animState !== state) {
    group.userData._animState = state;
    if (immediate) {
      group.userData._animT = 0;
    }
  }
}

export function updatePlayerCharacterMixer(group, delta) {
  if (!group.userData._charModel) return;

  group.userData._animT = (group.userData._animT || 0) + delta;

  const state = group.userData._animState || 'idle';
  animateCharacter(group.userData._charModel, state, group.userData._animT, delta);
}

export function getCharacterModelPath(charId) {
  return null; // No GLB needed
}
