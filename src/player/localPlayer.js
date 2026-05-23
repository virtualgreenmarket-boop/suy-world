import * as THREE from 'three';
import { resolveCollision } from '../systems/collision.js';

const MOVE_SPEED   = 10;
const CAM_DIST     = 10;
const CAM_LOOK_H   = 1.6;
const ISLAND_R     = 233;

let _scene, _camera;
let playerGroup;
let cameraYaw   = 0;
let cameraPitch = 0.42;

const keys = {};
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let localName  = 'Player';

// ── Init ──────────────────────────────────────────────────────────────

export function initLocalPlayer(scene, camera, name) {
  _scene  = scene;
  _camera = camera;
  localName = name || 'Player';

  playerGroup = buildCharacter(0x00BCD4);
  playerGroup.position.set(0, 0, 55);
  scene.add(playerGroup);

  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });

  const canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown',   e => { isDragging = true;  lastMouseX = e.clientX; lastMouseY = e.clientY; });
  window.addEventListener('mouseup',     ()  => { isDragging = false; });
  window.addEventListener('mousemove',   e  => onMouseMove(e));
  canvas.addEventListener('contextmenu', e  => e.preventDefault());

  syncCamera();
}

function onMouseMove(e) {
  if (!isDragging) return;
  cameraYaw   -= (e.clientX - lastMouseX) * 0.0045;
  cameraPitch  = Math.max(0.12, Math.min(1.1, cameraPitch - (e.clientY - lastMouseY) * 0.0045));
  lastMouseX   = e.clientX;
  lastMouseY   = e.clientY;
}

// ── Character mesh ────────────────────────────────────────────────────

export function buildCharacter(shirtColor) {
  const skinMat  = std(0xF5CBA7);
  const shirtMat = std(shirtColor);
  const pantsMat = std(0x37474F);

  const g = new THREE.Group();

  // Head
  mesh(g, new THREE.SphereGeometry(0.38, 10, 8),    skinMat,  0,     2.25, 0);
  // Body
  mesh(g, new THREE.CapsuleGeometry(0.25, 0.5, 6, 12), shirtMat, 0,  1.38, 0);
  // Arms (slight angle)
  const armG = new THREE.CapsuleGeometry(0.09, 0.44, 4, 10);
  const armL = mesh(g, armG, shirtMat, -0.42, 1.35, 0);
  const armR = mesh(g, armG, shirtMat,  0.42, 1.35, 0);
  armL.rotation.z =  0.22;
  armR.rotation.z = -0.22;
  // Legs
  const legG = new THREE.CapsuleGeometry(0.11, 0.58, 4, 10);
  mesh(g, legG, pantsMat, -0.15, 0.49, 0);
  mesh(g, legG, pantsMat,  0.15, 0.49, 0);

  return g;
}

// ── Update ────────────────────────────────────────────────────────────

export function updateLocalPlayer(delta) {
  const fwd   = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right  = new THREE.Vector3( Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
  const move  = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp'])    move.add(fwd);
  if (keys['KeyS'] || keys['ArrowDown'])  move.sub(fwd);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(MOVE_SPEED * delta);
    const nx = playerGroup.position.x + move.x;
    const nz = playerGroup.position.z + move.z;
    const [rx, rz] = resolveCollision(nx, nz, playerGroup.position.x, playerGroup.position.z);
    if (rx * rx + rz * rz < ISLAND_R * ISLAND_R) {
      playerGroup.position.x = rx;
      playerGroup.position.z = rz;
    }
    playerGroup.rotation.y = Math.atan2(move.x, move.z);
  }

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
  playerGroup.position.set(x, 0, z);
  syncCamera();
}

// ── Internal helpers ──────────────────────────────────────────────────

function std(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.04 });
}

function mesh(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
