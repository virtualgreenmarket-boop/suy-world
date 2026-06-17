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

const WALK_SPEED  = 6;
const RUN_SPEED   = 14;
const KB_SPEED    = 10;
const CAM_DIST_MIN = 3;
const CAM_DIST_MAX = 20;
const CAM_LOOK_H  = 1.6;
const ISLAND_R    = 396;
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

const keys = {};
let isDragging = false, lastMouseX = 0, lastMouseY = 0;

// ── Init ──────────────────────────────────────────────────────────────

export function initLocalPlayer(scene, camera, name, characterId) {
  _scene  = scene;
  _camera = camera;

  playerGroup = new THREE.Group();
  const _savedSpawn = _loadSpawn();
  playerGroup.position.set(_savedSpawn.x, _savedSpawn.y, _savedSpawn.z);
  scene.add(playerGroup);
  attachLabel(playerGroup, name || 'Player', 3.0, 'player');

  // DEBUG: Log parentGroup details
  console.log('[debug] parentGroup position:', playerGroup.position);
  console.log('[debug] parentGroup in scene:', scene.children.includes(playerGroup));
  console.log('[debug] parentGroup visible:', playerGroup.visible);

  // Spawn the character model
  console.log(`[local-player] 🎭 Spawning character for player: ${name}`);
  spawnPlayerCharacter(playerGroup, characterId).then(() => {
    console.log('[debug] _charModel:', playerGroup.userData._charModel);
    console.log('[debug] _charModel children:', playerGroup.userData._charModel?.children?.length);
    console.log('[debug] _charModel visible:', playerGroup.userData._charModel?.visible);
  }).catch(err => {
    console.error('[local-player] Failed to spawn character:', err);
  });

  window.addEventListener('keydown', e => {
    if (isChatOpen()) return;
    keys[e.code] = true;
    if (e.code === 'Space') {
      e.preventDefault();
      const groundY = getSurfaceY(playerGroup.position.x, playerGroup.position.z);
      if (playerGroup.position.y <= groundY + 0.05) _triggerJump();
    }
    if (e.code === 'KeyI') toggleInventoryPanel();
    if (e.code === 'KeyR') _triggerDance();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  const canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown', e => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => _onMouseMove(e));
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('wheel', e => {
    e.preventDefault();
    _camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, _camDist + e.deltaY * 0.01));
  }, { passive: false });

  // Initialize action buttons (dance only)
  initActionButtons(null, _triggerDance);

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
    if (sprint) speed = RUN_SPEED;
    else if (kbMoving) speed = KB_SPEED;
    else speed = WALK_SPEED + (RUN_SPEED - WALK_SPEED) * Math.min(joystick.magnitude / 0.78, 1);

    move.normalize().multiplyScalar(speed * delta);
    const nx = playerGroup.position.x + move.x;
    const nz = playerGroup.position.z + move.z;
    const [rx, rz] = resolveCollision(nx, nz, playerGroup.position.x, playerGroup.position.z);

    // Check collision with animals (dogs, cats)
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

    if (!blockedByAnimal && rx * rx + rz * rz < ISLAND_R * ISLAND_R) {
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
    const groundY = getSurfaceY(playerGroup.position.x, playerGroup.position.z);
    if (playerGroup.position.y <= groundY + 0.05) _triggerJump();
  }

  // Gravity
  const groundY = getSurfaceY(playerGroup.position.x, playerGroup.position.z);
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
      const targetState = !isMoving ? 'idle' : sprint ? 'run' : 'walk';
      setPlayerAnimState(playerGroup, targetState);
    }
  }

  // Update character animations
  updatePlayerCharacterMixer(playerGroup, delta);

  syncCamera();
}

function syncCamera() {
  const p  = playerGroup.position;
  const cy = Math.cos(cameraPitch);
  const cx = p.x + Math.sin(cameraYaw) * _camDist * cy;
  const cz = p.z + Math.cos(cameraYaw) * _camDist * cy;
  let camY = p.y + CAM_LOOK_H + Math.sin(cameraPitch) * _camDist;

  const floorAtCam = getSurfaceY(cx, cz);
  if (camY < floorAtCam + 0.4) camY = floorAtCam + 0.4;

  _camera.position.set(cx, camY, cz);
  _camera.lookAt(p.x, p.y + CAM_LOOK_H * 0.65, p.z);
}

// ── Exports ───────────────────────────────────────────────────────────

export function getLocalPlayerPosition() { return playerGroup?.position; }
export function getLocalPlayerRotY() { return playerGroup?.rotation.y ?? 0; }

export function equipLocalPlayerItem() {
  // No equipment system for now
}

export function savePlayerPosition() {
  if (!playerGroup) return;
  const { x, y, z } = playerGroup.position;
  localStorage.setItem('suy_spawn', JSON.stringify({ x, y, z }));
}

function _loadSpawn() {
  try {
    const raw = localStorage.getItem('suy_spawn');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { x: 0, y: 0.7, z: 20 };
}

export function setLocalPlayerPosition(x, z) {
  const y = getSurfaceY(x, z);
  playerGroup.position.set(x, y, z);
  velocityY = 0;
  syncCamera();
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
