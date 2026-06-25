import * as THREE from 'three';
import { buildCharacter, animateCharacter, CHARACTERS, setCharacterEmotion, clearCharacterEmotion, setCharacterEmoji, updateCharacterEmoji, attachHat, attachHandItem, attachShoes, attachGloves, attachWings } from './CharacterBuilder.js';

let _characterType = 'boy';
let _localPlayerGroup = null;

function getTypeFromId(characterId) {
  const types = ['boy', 'girl', 'zombie', 'demon', 'robot'];
  return types[characterId - 1] || 'boy';
}

export async function preloadPlayerCharacter(characterId) {
  _characterType = getTypeFromId(characterId);
  console.log(`[player] 🎭 Character type ready: ${_characterType}`);
  return Promise.resolve();
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
  console.log(`[player] ✅ Character group created`);

  // Ensure all meshes have proper settings
  let meshCount = 0;
  charGroup.traverse(n => {
    if (n.isMesh) {
      meshCount++;
      n.visible = true;
      n.material.needsUpdate = true;
      n.castShadow = true;
      n.receiveShadow = false; // Prevents self-shadowing artifacts (dark pixel/triangle artifacts on the character's own body)
    }
  });
  console.log(`[player] 🎨 Applied settings to ${meshCount} meshes`);

  // Measure height and scale to 2.5 units (same as NPC height)
  const bbox = new THREE.Box3().setFromObject(charGroup);
  const size = bbox.getSize(new THREE.Vector3());
  const currentHeight = size.y;

  console.log(`[player] 📏 Original height: ${currentHeight.toFixed(2)}m`);

  if (currentHeight > 0) {
    const scale = 2.5 / currentHeight;
    charGroup.scale.setScalar(scale);
    charGroup.updateMatrixWorld(true);
    console.log(`[player] 📏 Scaled to 2.5m (scale factor: ${scale.toFixed(2)})`);
  }

  // Position at Y=0 (feet on ground)
  const bbox2 = new THREE.Box3().setFromObject(charGroup);
  const offset = -bbox2.min.y;
  charGroup.position.y = offset;
  charGroup.userData._groundY = offset;

  console.log(`[player] 📍 Positioned at Y=${offset.toFixed(2)}`);

  // Add to parent group
  parentGroup.add(charGroup);
  parentGroup.userData._charModel = charGroup;
  parentGroup.userData._charType = type;
  parentGroup.userData._animState = 'idle';
  parentGroup.userData._animT = 0;

  // Store reference for emotion system
  _localPlayerGroup = parentGroup;

  console.log('═══════════════════════════════════════════');
  console.log(`[player] ✅ CHARACTER SPAWNED SUCCESSFULLY!`);
  console.log(`[player]    Name: ${CHARACTERS[type].name}`);
  console.log(`[player]    Type: ${type}`);
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

  // Update emoji animations (required for 6 of 15 emojis to animate)
  updateCharacterEmoji(group.userData._charModel, delta);
}

export function getCharacterModelPath(charId) {
  return null; // No GLB needed
}

// Global emotion/emoji functions
window.setPlayerEmotion = (emotion) => {
  // Backward compatibility: old 6-emotion system still works
  if (_localPlayerGroup && _localPlayerGroup.userData._charModel) {
    setCharacterEmotion(_localPlayerGroup.userData._charModel, emotion);
  }
};

window.setPlayerEmoji = (emojiKey) => {
  // New 15-emoji system
  if (_localPlayerGroup && _localPlayerGroup.userData._charModel) {
    setCharacterEmoji(_localPlayerGroup.userData._charModel, emojiKey);
  }
};

window.clearPlayerEmotion = () => {
  if (_localPlayerGroup && _localPlayerGroup.userData._charModel) {
    clearCharacterEmotion(_localPlayerGroup.userData._charModel);
  }
};

// Global appearance update function
window.updatePlayerAppearance = (changes) => {
  const group = _localPlayerGroup;
  if (!group) return;

  // Rebuild the character with new colors
  const currentType = group.userData._charType || 'boy';
  const newModel = buildCharacter(currentType, changes);

  // Ensure all meshes have proper settings
  // FIX: receiveShadow was previously set to true here, inconsistent with
  // spawnPlayerCharacter's false (the self-shadow-artifact fix) -- meaning
  // changing clothing color in the bag silently reintroduced the dark
  // pixel/triangle self-shadow bug on the character. Now matches spawn.
  newModel.traverse(n => {
    if (n.isMesh) {
      n.visible = true;
      n.material.needsUpdate = true;
      n.castShadow = true;
      n.receiveShadow = false; // Must match spawnPlayerCharacter's setting — prevents self-shadowing artifacts
    }
  });

  // Scale to match existing character size
  const bbox = new THREE.Box3().setFromObject(newModel);
  const size = bbox.getSize(new THREE.Vector3());
  const currentHeight = size.y;

  if (currentHeight > 0) {
    const scale = 2.5 / currentHeight;
    newModel.scale.setScalar(scale);
    newModel.updateMatrixWorld(true);
  }

  // Position at Y=0 (feet on ground)
  const bbox2 = new THREE.Box3().setFromObject(newModel);
  const offset = -bbox2.min.y;
  newModel.position.y = offset;
  newModel.userData._groundY = offset; // FIX: also missing before — without this, the rebuilt model's resetPose() would fall back to _groundY=0 every frame, undoing the correct ground offset (the same root-cause class of bug fixed earlier for hover) the moment any animation played after a clothing-color change.

  // Remove old model, add new one
  if (group.userData._charModel) {
    group.remove(group.userData._charModel);
  }
  group.add(newModel);
  group.userData._charModel = newModel;

  console.log('[player] 🎨 Appearance updated with changes:', changes);
};

// Global hat attachment function
window.applyPlayerHat = (hatKey) => {
  const model = _localPlayerGroup?.userData?._charModel;
  if(!model || !model.userData.parts) return;
  attachHat(model.userData.parts.headG, hatKey);
  console.log('[player] 🎩 Hat applied:', hatKey);
};

// Global hand item attachment function
window.applyPlayerHandItem = (itemKey) => {
  const model = _localPlayerGroup?.userData?._charModel;
  if(!model || !model.userData.parts) return;
  attachHandItem(model.userData.parts.rArmG, itemKey);
  console.log('[player] 🔧 Hand item applied:', itemKey);
};

// Global shoes attachment function
window.applyPlayerShoes = (shoeKey) => {
  const model = _localPlayerGroup?.userData?._charModel;
  if(!model || !model.userData.parts) return;
  attachShoes(model.userData.parts, shoeKey);
  console.log('[player] 👟 Shoes applied:', shoeKey);
};

// Global gloves attachment function
window.applyPlayerGloves = (gloveKey) => {
  const model = _localPlayerGroup?.userData?._charModel;
  if(!model || !model.userData.parts) return;
  attachGloves(model.userData.parts, gloveKey);
  console.log('[player] 🧤 Gloves applied:', gloveKey);
};

// Global wings attachment function
window.applyPlayerWings = (wingKey) => {
  const model = _localPlayerGroup?.userData?._charModel;
  if(!model || !model.userData.parts) return;
  attachWings(model.userData.parts, wingKey);
  console.log('[player] 🪽 Wings applied:', wingKey);
};