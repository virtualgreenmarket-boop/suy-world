import * as THREE from 'three';
import { resolveCollision } from '../systems/collision.js';
import { getSurfaceY } from '../systems/terrain.js';
import { getSettings } from '../ui/settingsPanel.js';
import { spawnPlayerCharacter, setPlayerAnimState, updatePlayerCharacterMixer } from './playerCharacterLoader.js';
import { toggleInventoryPanel } from '../ui/inventoryPanel.js';
import { joystick, consumeJump, consumeCameraMovement, consumeCameraZoom, isRunning } from '../ui/touchControls.js';
import { isChatOpen } from '../ui/chatUI.js';
import { attachLabel } from '../ui/labels.js';
import { initActionButtons } from '../ui/actionButtons.js';
import { getAnimals } from '../world/AnimalSystem.js';
import { HANGAR_DIMS, HANGAR_CONFIGS } from '../world/hangars.js';
import { toggleRide, isRiding, updateSkateboard, RIDE_SPEED, RIDE_LIFT } from '../world/skateboard.js';

let _glbAnimalManager = null;
export function setGLBAnimalManager(manager) {
  _glbAnimalManager = manager;
}

const WALK_SPEED  = 6;
const RUN_SPEED   = 14;
const KB_SPEED    = 10;
const CAM_DIST_MIN = 3;
const CAM_DIST_MAX = 20;
const CAM_LOOK_H  = 1.6;
// Circular movement boundary. Derived from the base terrain radius and the farthest
// hangar corner (+ margin) so resizing a hangar (e.g. the North hangar's 330m length)
// can never trap the player short of a room they should be able to reach.
const ISLAND_R    = computeIslandRadius();
const GRAVITY     = -22;
const JUMP_FORCE  = 8;
const MAX_STEP    = 0.82;

let _scene, _camera;
let playerGroup;
let cameraYaw   = 0;
let cameraPitch = 0.42;
let _camDist    = 10;
let velocityY   = 0;
let _isJumping  = false;
let _isSitting  = false;
let _isPlayingSpecialAnim = false; // Prevents auto-overriding dance
let _isMoving   = false; // Track if player is currently moving
let _spawnLockUntil = 0; // While active, external repositions are ignored (marina spawn is authoritative)
let _playerSpawned = false; // Becomes true once character model has spawned
let _cameraInitialized = false; // Becomes true after first camera snap (prevents lerp from origin)

const keys = {};
let isDragging = false, lastMouseX = 0, lastMouseY = 0;

// ── Init ──────────────────────────────────────────────────────────────

export function initLocalPlayer(scene, camera, name, characterId) {
  _scene  = scene;
  _camera = camera;

  playerGroup = new THREE.Group();
  const _savedSpawn = _loadSpawn();
  playerGroup.position.set(_savedSpawn.x, _savedSpawn.y, _savedSpawn.z);
  console.log('[local-player] Initial spawn position set:', _savedSpawn);

  // BOOT SPAWN LOCK: Extended to 15s to handle slow world loading.
  // Lock stays active until BOTH conditions are met:
  // 1. 15 seconds have passed since init
  // 2. Character model has actually spawned (_playerSpawned = true)
  _spawnLockUntil = Date.now() + 15000;
  _playerSpawned = false;

  scene.add(playerGroup);
  attachLabel(playerGroup, name || 'Player', 3.0, 'player');

  // CRITICAL: Snap camera to player position IMMEDIATELY to prevent "jump" on first frame
  // Without this, camera starts at origin (0,0,0) and snaps to spawn after first render
  try {
    _snapCameraToPlayer();
    console.log('[local-player] Camera pre-positioned at spawn (prevents spawn jump)');
  } catch (err) {
    console.error('[local-player] Failed to pre-position camera:', err);
  }

  // DEBUG: Log parentGroup details
  console.log('[debug] parentGroup position:', playerGroup.position);
  console.log('[debug] parentGroup in scene:', scene.children.includes(playerGroup));
  console.log('[debug] parentGroup visible:', playerGroup.visible);

  // Spawn the character model
  console.log(`[local-player] 🎭 Spawning character for player: ${name}`);
  spawnPlayerCharacter(playerGroup, characterId).then(() => {
    _playerSpawned = true;
    console.log('[local-player] ✅ Character spawned, spawn lock can now expire');
    console.log('[debug] _charModel:', playerGroup.userData._charModel);
    console.log('[debug] _charModel children:', playerGroup.userData._charModel?.children?.length);
    console.log('[debug] _charModel visible:', playerGroup.userData._charModel?.visible);
  }).catch(err => {
    console.error('[local-player] Failed to spawn character:', err);
    _playerSpawned = true; // Allow repositions even if spawn failed
  });

  // Wire up global function for inventory customization
  window.updatePlayerAppearance = (changes) => {
    updatePlayerAppearance(changes);
  };

  window.addEventListener('keydown', e => {
    // CRITICAL: Ignore ALL game keys while typing in text inputs (stall shop, etc.)
    if (window.isInputFocused && window.isInputFocused()) return;
    if (isChatOpen()) return;
    keys[e.code] = true;
    if (e.code === 'Space') {
      e.preventDefault();
      const groundY = getSurfaceY(playerGroup.position.x, playerGroup.position.z);
      if (playerGroup.position.y <= groundY + 0.05) _triggerJump();
    }
    if (e.code === 'KeyI') toggleInventoryPanel();
    if (e.code === 'KeyR') _triggerDance();
    if (e.code === 'KeyV' && !_isSitting) toggleRide(playerGroup);
  });
  window.addEventListener('keyup', e => {
    // Don't clear keys if typing (prevents race conditions)
    if (window.isInputFocused && window.isInputFocused()) return;
    keys[e.code] = false;
  });

  // ── Stuck-key guard ──────────────────────────────────────────────
  // If the window loses focus while a movement key is held (Alt-Tab, clicking the
  // minimap or a dialog, switching tabs), the OS delivers the matching keyup to
  // whatever has focus instead of this window — so keys[...] would stay true and the
  // character keeps walking on its own. Clearing every held key on blur / tab-hide /
  // chat-open prevents that. It only ever RELEASES keys, so it can't cause movement.
  const _clearHeldKeys = () => { for (const k in keys) keys[k] = false; };
  window.addEventListener('blur', _clearHeldKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') _clearHeldKeys();
  });
  // When chat opens, keydown early-returns but keyup still fires; clear now so a key
  // pressed just before opening chat can't get stranded in the held state.
  window.addEventListener('keydown', e => { if (isChatOpen()) _clearHeldKeys(); }, true);

  const canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown', e => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => _onMouseMove(e));
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('wheel', e => {
    e.preventDefault();
    _camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, _camDist + e.deltaY * 0.01));
  }, { passive: false });

  // Initialize action buttons (dance + skateboard)
  initActionButtons(null, _triggerDance, () => toggleRide(playerGroup));

  syncCamera();
}

function _onMouseMove(e) {
  if (!isDragging || isChatOpen()) return;
  const sens   = getSettings().sensitivity * 0.0045;
  cameraYaw   -= (e.clientX - lastMouseX) * sens;
  cameraPitch  = Math.max(-1.45, Math.min(1.55, cameraPitch - (e.clientY - lastMouseY) * sens));
  lastMouseX   = e.clientX;
  lastMouseY   = e.clientY;
}

function _triggerJump() {
  velocityY  = JUMP_FORCE;
  _isJumping = true;
  _isPlayingSpecialAnim = false; // Cancel dance on jump
  setPlayerAnimState(playerGroup, 'jump');
}

function _triggerDance() {
  // Don't allow dance during sitting, jumping, walking, or running
  if (_isSitting || _isJumping || _isMoving) return;

  // Toggle dance on/off
  if (_isPlayingSpecialAnim && playerGroup.userData._animState === 'dance') {
    _isPlayingSpecialAnim = false;
    setPlayerAnimState(playerGroup, 'idle');
  } else {
    _isPlayingSpecialAnim = true;
    setPlayerAnimState(playerGroup, 'dance');
  }
}

// ── Update ────────────────────────────────────────────────────────────

export function updateLocalPlayer(delta) {
  // Lock X/Z rotation to prevent skeleton drift
  if (playerGroup && !_isSitting) {
    playerGroup.rotation.x = 0;
    playerGroup.rotation.z = 0;
  }

  // Pinch-to-zoom
  const zoomDelta = consumeCameraZoom();
  if (zoomDelta !== 0) {
    _camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, _camDist + zoomDelta));
  }

  // Camera rotation from touch
  const { dx, dy } = consumeCameraMovement();
  if (dx || dy) {
    const sens = getSettings().sensitivity * 0.005;
    cameraYaw   -= dx * sens;
    cameraPitch  = Math.max(-1.45, Math.min(1.55, cameraPitch - dy * sens));
  }

  // Sitting: locked to bench
  if (_isSitting) {
    setPlayerAnimState(playerGroup, 'sit');
    updatePlayerCharacterMixer(playerGroup, delta);
    syncCamera();
    return;
  }

  // Block movement while chat open
  if (isChatOpen()) {
    updatePlayerCharacterMixer(playerGroup, delta);
    syncCamera();
    return;
  }

  const fwd   = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right = new THREE.Vector3( Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
  const move  = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp'])    move.add(fwd);
  if (keys['KeyS'] || keys['ArrowDown'])  move.sub(fwd);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);

  if (joystick.magnitude > 0) {
    move.addScaledVector(right, joystick.x);
    move.addScaledVector(fwd, -joystick.y);
  }

  const kbMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] ||
                   keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'];
  const sprint   = (kbMoving && (keys['ShiftLeft'] || keys['ShiftRight'])) || isRunning();
  const isMoving = move.lengthSq() > 0;
  _isMoving = isMoving; // Update global movement state

 if (isMoving) {
    let speed;
    if (isRiding()) speed = RIDE_SPEED;
    else if (sprint) speed = RUN_SPEED;
    else if (kbMoving) speed = KB_SPEED;
    else speed = WALK_SPEED + (RUN_SPEED - WALK_SPEED) * Math.min(joystick.magnitude / 0.78, 1);

    move.normalize().multiplyScalar(speed * delta);
    const nx = playerGroup.position.x + move.x;
    const nz = playerGroup.position.z + move.z;
    const [rx, rz] = resolveCollision(nx, nz, playerGroup.position.x, playerGroup.position.z);

    // Check collision with primitive animals (dogs, cats from AnimalSystem)
    let blockedByAnimal = false;
    const animals = getAnimals();
    const allAnimals = animals || [];

    if (allAnimals.length > 0) {
      for (const animal of allAnimals) {
        if (animal.userData.collider) {
          const dx = rx - animal.position.x;
          const dz = rz - animal.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 0.8) {
            blockedByAnimal = true;
            break;
          }
        }
      }
    }

    // Check collision with GLB animals (horses, cows, deer, etc. from AnimalLoader)
    const PLAYER_RADIUS = 0.4;
    if (!blockedByAnimal && _glbAnimalManager && _glbAnimalManager.wouldCollide({ x: rx, z: rz }, PLAYER_RADIUS)) {
      blockedByAnimal = true;
    }

    // FIXED: Use asymmetric ellipse boundary instead of simple circle
    // This allows players to swim/walk 20-50m into deep water around the entire island
    if (!blockedByAnimal && isWithinPlayableBounds(rx, rz)) {
      const destGroundY = getSurfaceY(rx, rz);
      const stepDelta   = destGroundY - playerGroup.position.y;
      if (!_isJumping && stepDelta > 0 && stepDelta <= MAX_STEP) {
        playerGroup.position.y = destGroundY;
        velocityY = 0;
      }
      playerGroup.position.x = rx;
      playerGroup.position.z = rz;
    }
    playerGroup.rotation.y = Math.atan2(move.x, move.z);
  }

  if (consumeJump()) {
    const rideOffsetJ = isRiding() ? RIDE_LIFT : 0;
    const groundY = getSurfaceY(playerGroup.position.x, playerGroup.position.z, playerGroup.position.y) + rideOffsetJ;
    if (playerGroup.position.y <= groundY + 0.05) _triggerJump();
  }

  // Gravity — while riding, the floor is the deck surface (RIDE_LIFT above ground)
  const rideOffset = isRiding() ? RIDE_LIFT : 0;
  const groundY = getSurfaceY(playerGroup.position.x, playerGroup.position.z, playerGroup.position.y) + rideOffset;
  velocityY += GRAVITY * delta;
  playerGroup.position.y = Math.max(groundY, playerGroup.position.y + velocityY * delta);
  if (playerGroup.position.y <= groundY) {
    if (velocityY < 0) velocityY = 0;
    if (_isJumping) _isJumping = false;
  }

  // Update animation state based on movement
  if (!_isJumping) {
    // Cancel dance/attack if player starts moving
    if (isMoving && _isPlayingSpecialAnim) {
      _isPlayingSpecialAnim = false;
    }

    // Set animation only if not playing special animation
    if (!_isPlayingSpecialAnim) {
      const targetState = isRiding() ? 'idle' : (!isMoving ? 'idle' : sprint ? 'run' : 'walk');
      setPlayerAnimState(playerGroup, targetState);
   }
  }

  // Update character animations
  updatePlayerCharacterMixer(playerGroup, delta);

  updateSkateboard(delta, playerGroup, isMoving);

  syncCamera();
}

// Helper: Snap camera to player position (extracted for reuse)
function _snapCameraToPlayer() {
  try {
    const p  = playerGroup.position;
    const cy = Math.cos(cameraPitch);
    const cx = p.x + Math.sin(cameraYaw) * _camDist * cy;
    const cz = p.z + Math.cos(cameraYaw) * _camDist * cy;
    let camY = p.y + CAM_LOOK_H + Math.sin(cameraPitch) * _camDist;

    const floorAtCam = getSurfaceY(cx, cz);
    if (camY < floorAtCam + 0.4) camY = floorAtCam + 0.4;

    _camera.position.set(cx, camY, cz);
    _camera.lookAt(p.x, p.y + CAM_LOOK_H * 0.65, p.z);

    if (!_cameraInitialized) {
      console.log('[local-player] Camera initialized at:', { x: cx.toFixed(2), y: camY.toFixed(2), z: cz.toFixed(2) });
      _cameraInitialized = true;
    }
  } catch (err) {
    console.error('[local-player] _snapCameraToPlayer error:', err);
  }
}

function syncCamera() {
  _snapCameraToPlayer();
}

// ── Exports ───────────────────────────────────────────────────────────

export function getLocalPlayerPosition() { return playerGroup?.position; }
export function getLocalPlayerRotY() { return playerGroup?.rotation.y ?? 0; }
export function getCameraYaw() { return cameraYaw; }

export function equipLocalPlayerItem(cat, file) {
  const cm = playerGroup?.userData?._charModel;
  if (!cm) return;

  if (cat === 'Shirt') {
    const isColor = typeof file === 'string' && file.startsWith('#');
    const bare = file == null;

    cm.traverse(ch => {
      if (!ch.isMesh) return;
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      mats.forEach(m => {
        if (!m || !m.userData || !m.userData.isShirt) return;
        if (m.userData._shirtColor === undefined) {
          m.userData._shirtColor = m.color.getHex();
        }
        if (bare) {
          const skinHex = playerGroup.userData._skinColor ?? 0xFFCC99;
          m.color.setHex(skinHex);
        } else if (isColor) {
          m.color.set(file);              // apply chosen shirt colour
          m.userData._shirtColor = m.color.getHex();  // remember as the new base
        } else {
          m.color.setHex(m.userData._shirtColor);
        }
      });
    });
    console.log('[equip] shirt →', bare ? 'bare' : (isColor ? file : 'default'));
  }
}

export function savePlayerPosition() {
  // Position saving disabled - always spawn at plaza
  // Clean up old saved position once
  if (localStorage.getItem('suy_spawn')) {
    localStorage.removeItem('suy_spawn');
    console.log('[local-player] Cleaned up old saved position');
  }
}

function updatePlayerAppearance(changes) {
  if (!playerGroup || !playerGroup.userData._charModel) {
    console.warn('[local-player] Cannot update appearance: character not loaded yet');
    return;
  }

  const charModel = playerGroup.userData._charModel;

  // Update materials by traversing the character model
  charModel.traverse(child => {
    if (!child.isMesh || !child.material) return;
    console.log('[MESH]', child.name, '| parent:', child.parent?.name, '| color:', child.material.color?.getHexString());
  

    // Get the material - handle both single material and material arrays
    const materials = Array.isArray(child.material) ? child.material : [child.material];

    materials.forEach(mat => {
      if (!mat) return;

      // Match material to body part by checking its current color
      const currentColor = mat.color.getHexString().toLowerCase();

      // Skin color update
      if (changes.skin && (currentColor === 'ffcc99' || currentColor.startsWith('ff') || currentColor.startsWith('7c') || currentColor.startsWith('cc') || currentColor.startsWith('90'))) {
        // Check if this looks like a skin material (common skin tones)
        if (child.parent?.name !== 'headG' || !child.geometry?.parameters || child.geometry.parameters.radius > 0.2) {
          mat.color.set(changes.skin);
        }
      }

      // Shirt color update
      if (changes.shirt && (currentColor === '2196f3' || currentColor === '666' || currentColor === '8b0000' || currentColor === '455a64' || currentColor === 'e91e63')) {
        mat.color.set(changes.shirt);
      }

      // Pants color update
      if (changes.pants && (currentColor === '333' || currentColor === '444' || currentColor === '9c27b0' || currentColor === '4a0000' || currentColor === '37474f')) {
        mat.color.set(changes.pants);
      }

      // Shoes color update
      if (changes.shoes && (currentColor === '5d4037' || currentColor === '333333' || currentColor === 'e91e63' || currentColor === '222' || currentColor === '263238')) {
        mat.color.set(changes.shoes);
      }
    });
  });

  console.log('[local-player] Character appearance updated:', changes);
}

function computeIslandRadius() {
  // DEPRECATED: Simple circular boundary is replaced by asymmetric ellipse check
  // This function kept for backward compatibility but is no longer used
  const BASE_R = 396;
  const MARGIN = 20;

  let maxCornerDist = 0;
  HANGAR_CONFIGS.forEach(({ x, z }, i) => {
    const { W, D } = HANGAR_DIMS[i];
    const hw = W / 2, hd = D / 2;
    [[x - hw, z - hd], [x - hw, z + hd], [x + hw, z - hd], [x + hw, z + hd]]
      .forEach(([cx, cz]) => { maxCornerDist = Math.max(maxCornerDist, Math.hypot(cx, cz)); });
  });

  return Math.max(BASE_R, maxCornerDist + MARGIN);
}

/**
 * Tests if position (x, z) is within playable bounds.
 * Uses asymmetric ellipse shape matching the actual island geometry.
 * Boundary positioned in deep water, allowing free movement on island, beach, and shallow water.
 */
function isWithinPlayableBounds(x, z) {
  // Island expansion factors (from island.js)
  const EAST_EXPANSION = 1.4;
  const NORTH_SOUTH_EXPANSION = 2.38;

  // Playable boundary: far into deep water
  // Grass: 255, Beach: 350, Shallow water: 500
  // Boundary at 650 allows full access to island + beach + shallow water + swimming room
  const PLAYABLE_RADIUS = 650;

  // Normalize coordinates for asymmetric ellipse
  const normalizedX = x > 0 ? x / EAST_EXPANSION : x;
  const normalizedZ = z / NORTH_SOUTH_EXPANSION;
  const distance = Math.hypot(normalizedX, normalizedZ);

  return distance <= PLAYABLE_RADIUS;
}

function _loadSpawn() {
  // Always spawn at central plaza (original spawn) - ignoring localStorage
  // South of central plaza at ground level
  return { x: 0, y: 0, z: 55 };
}

export function setLocalPlayerPosition(x, z) {
  try {
    // BOOT SPAWN LOCK: Active until BOTH conditions are met:
    // 1. Character model has spawned (_playerSpawned = true)
    // 2. At least 15 seconds have passed since init
    const lockActive = !_playerSpawned || Date.now() < _spawnLockUntil;

    if (lockActive) {
      // Plaza whitelist: Allow repositions to the plaza itself (within 10 units of 0, 55)
      const PLAZA_X = 0;
      const PLAZA_Z = 55;
      const PLAZA_RADIUS = 10;
      const distToPlaza = Math.hypot(x - PLAZA_X, z - PLAZA_Z);

      if (distToPlaza > PLAZA_RADIUS) {
        // Not the plaza — block this reposition
        console.log(`[local-player] 🔒 blocked reposition to (${x.toFixed(1)}, ${z.toFixed(1)}) — lock active, not plaza`);
        console.trace('[local-player] setLocalPlayerPosition called from:');
        return;
      }

      // It IS the marina — allow it through
      console.log(`[local-player] ✓ Allowing marina reposition (${x.toFixed(1)}, ${z.toFixed(1)}) despite active lock`);
    }

    const y = getSurfaceY(x, z);
    console.log('[local-player] ⚠️ Position changed externally to:', { x, y, z });
    console.trace('[local-player] setLocalPlayerPosition called from:');
    playerGroup.position.set(x, y, z);
    velocityY = 0;
    syncCamera();
  } catch (err) {
    console.error('[local-player] setLocalPlayerPosition error:', err);
  }
}

export function isPlayerSitting() { return _isSitting; }

export function sitOnBench(x, y, z, facingY) {
  if (!playerGroup || _isSitting) return;
  _isSitting = true;
  velocityY  = 0;
  const ox = x + Math.sin(facingY) * 0.3;
  const oz = z + Math.cos(facingY) * 0.3;
  playerGroup.position.set(ox, y, oz);
  playerGroup.rotation.set(0, facingY, 0);
  playerGroup.scale.set(1.2, 1.2, 1.2);
}

export function standUp() {
  if (!playerGroup || !_isSitting) return;
  _isSitting = false;
  playerGroup.scale.set(1.0, 1.0, 1.0);
  playerGroup.rotation.set(0, playerGroup.rotation.y, 0);
}
