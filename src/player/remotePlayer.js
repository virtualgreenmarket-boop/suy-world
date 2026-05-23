import * as THREE from 'three';
import { buildCharacter } from './localPlayer.js';

const LERP_POS = 0.18;
const LERP_ROT = 0.22;

const SHIRT_COLORS = [
  0xE53935, 0x8E24AA, 0x1E88E5, 0x43A047,
  0xF4511E, 0x00897B, 0xFFB300, 0x6D4C41,
];

const remotePlayers = {};

let _scene;

export function initRemotePlayers(scene) {
  _scene = scene;
}

export function addRemotePlayer(id, data) {
  if (remotePlayers[id]) return;

  const color = SHIRT_COLORS[hashId(id) % SHIRT_COLORS.length];
  const group = buildCharacter(color);
  group.position.set(data.x || 0, data.y || 0, data.z || 0);
  group.rotation.y = data.rotY || 0;

  const tag = createNameTag(data.name || id.slice(0, 6));
  group.add(tag);

  _scene.add(group);
  remotePlayers[id] = {
    group,
    target: { x: data.x || 0, y: data.y || 0, z: data.z || 0, rotY: data.rotY || 0 },
  };
}

export function updateRemotePlayerTarget(id, x, y, z, rotY) {
  if (!remotePlayers[id]) return;
  Object.assign(remotePlayers[id].target, { x, y, z, rotY });
}

export function removeRemotePlayer(id) {
  const rp = remotePlayers[id];
  if (!rp) return;
  _scene.remove(rp.group);
  delete remotePlayers[id];
}

export function updateRemotePlayers() {
  for (const { group, target } of Object.values(remotePlayers)) {
    group.position.lerp(new THREE.Vector3(target.x, target.y, target.z), LERP_POS);
    group.rotation.y += (target.rotY - group.rotation.y) * LERP_ROT;
  }
}

export function getRemotePlayerCount() {
  return Object.keys(remotePlayers).length;
}

export function getRemotePlayerPosition(id) {
  return remotePlayers[id]?.group.position ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────

function createNameTag(name) {
  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(4, 8, 248, 48, 10);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Segoe UI", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 34);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.6, 0.65, 1);
  sprite.position.y = 3.1;
  return sprite;
}

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
