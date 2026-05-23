import * as THREE from 'three';
import { resolveCollision } from '../systems/collision.js';
import { spawnCharacter, setAnimState, updateCharacterMixer } from './characterLoader.js';
import { joystick, consumeJump, consumeCameraMovement, isRunning } from '../ui/touchControls.js';

const WALK_SPEED = 6;
const RUN_SPEED  = 14;
const KB_SPEED   = 10;  // keyboard walk speed
const CAM_DIST   = 10;
const CAM_LOOK_H = 1.6;
const ISLAND_R   = 233;
const GRAVITY    = -22;
const JUMP_FORCE = 8;
const GROUND_Y   = 0;

let _scene, _camera;
let playerGroup;
let cameraYaw   = 0;
let cameraPitch = 0.42;
let velocityY   = 0;
let _isJumping  = false;

// Keyboard kept as dev fallback
const keys = {};
let isDragging = false, lastMouseX = 0, lastMouseY = 0;

// ── Init ──────────────────────────────────────────────────────────────

export function initLocalPlayer(scene, camera, name) {
  _scene  = scene;
  _camera = camera;

  playerGroup = new THREE.Group();
  playerGroup.position.set(0, 0, 55);
  scene.add(playerGroup);

  spawnCharacter(playerGroup);

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' && playerGroup.position.y <= GROUND_Y + 0.05) {
      e.preventDefault();
      _triggerJump();
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  const canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown',   e => { isDragging = true;  lastMouseX = e.clientX; lastMouseY = e.clientY; });
  window.addEventListener('mouseup',     () => { isDragging = false; });
  window.addEventListener('mousemove',   e => _onMouseMove(e));
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  syncCamera();
}

function _onMouseMove(e) {
  if (!isDragging) return;
  cameraYaw   -= (e.clientX - lastMouseX) * 0.0045;
  cameraPitch  = Math.max(0.12, Math.min(1.1, cameraPitch - (e.clientY - lastMouseY) * 0.0045));
  lastMouseX   = e.clientX;
  lastMouseY   = e.clientY;
}

function _triggerJump() {
  velocityY  = JUMP_FORCE;
  _isJumping = true;
  setAnimState(playerGroup, 'jump');
}

// ── Update ────────────────────────────────────────────────────────────

export function updateLocalPlayer(delta) {
  // Camera from touch (consumed each frame)
  const { dx, dy } = consumeCameraMovement();
  if (dx || dy) {
    cameraYaw   -= dx * 0.005;
    cameraPitch  = Math.max(0.12, Math.min(1.1, cameraPitch - dy * 0.005));
  }

  // Build movement vector (keyboard + joystick combined)
  const fwd   = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right  = new THREE.Vector3( Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
  const move  = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp'])    move.add(fwd);
  if (keys['KeyS'] || keys['ArrowDown'])  move.sub(fwd);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);

  if (joystick.magnitude > 0) {
    move.addScaledVector(right, joystick.x);
    move.addScaledVector(fwd,  -joystick.y); // screen-Y down = move backward
  }

  const kbMoving  = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] ||
                    keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'];
  const sprint    = (kbMoving && (keys['ShiftLeft'] || keys['ShiftRight'])) || isRunning();
  const isMoving  = move.lengthSq() > 0;

  if (isMoving) {
    // Speed scales with joystick magnitude for analogue feel; keyboard is fixed
    let speed;
    if (sprint)    speed = RUN_SPEED;
    else if (kbMoving) speed = KB_SPEED;
    else speed = WALK_SPEED + (RUN_SPEED - WALK_SPEED) * Math.min(joystick.magnitude / 0.78, 1);

    move.normalize().multiplyScalar(speed * delta);
    const nx = playerGroup.position.x + move.x;
    const nz = playerGroup.position.z + move.z;
    const [rx, rz] = resolveCollision(nx, nz, playerGroup.position.x, playerGroup.position.z);
    if (rx * rx + rz * rz < ISLAND_R * ISLAND_R) {
      playerGroup.position.x = rx;
      playerGroup.position.z = rz;
    }
    playerGroup.rotation.y = Math.atan2(move.x, move.z);
  }

  // Jump input (touch and keyboard Space share this path)
  if (consumeJump() && playerGroup.position.y <= GROUND_Y + 0.05) _triggerJump();

  // Gravity
  velocityY += GRAVITY * delta;
  playerGroup.position.y = Math.max(GROUND_Y, playerGroup.position.y + velocityY * delta);
  if (playerGroup.position.y <= GROUND_Y) {
    if (velocityY < 0) velocityY = 0;
    if (_isJumping) _isJumping = false;
  }

  // Animation state machine
  if (!_isJumping) {
    const target = !isMoving ? 'idle' : sprint ? 'run' : 'walk';
    setAnimState(playerGroup, target); // no-op if already in this state
  }

  updateCharacterMixer(playerGroup, delta);
  syncCamera();
}

function syncCamera() {
  const p  = playerGroup.position;
  const cy = Math.cos(cameraPitch);
  _camera.position.set(
    p.x + Math.sin(cameraYaw) * CAM_DIST * cy,
    p.y + CAM_LOOK_H + Math.sin(cameraPitch) * CAM_DIST,
    p.z + Math.cos(cameraYaw) * CAM_DIST * cy
  );
  _camera.lookAt(p.x, p.y + CAM_LOOK_H * 0.65, p.z);
}

// ── Exports ───────────────────────────────────────────────────────────

export function getLocalPlayerPosition() { return playerGroup?.position; }
export function getLocalPlayerRotY()     { return playerGroup?.rotation.y ?? 0; }

export function setLocalPlayerPosition(x, z) {
  playerGroup.position.set(x, GROUND_Y, z);
  velocityY = 0;
  syncCamera();
}
