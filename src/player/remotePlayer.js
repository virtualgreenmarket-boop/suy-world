import * as THREE from 'three';
import { spawnCharacter, setAnimState, updateCharacterMixer } from './characterLoader.js';

const LERP_POS = 0.18;
const LERP_ROT = 0.22;

const remotePlayers = {};

let _scene;

export function initRemotePlayers(scene) {
  _scene = scene;
}

export function addRemotePlayer(id, data) {
  if (remotePlayers[id]) return;

  const group = new THREE.Group();
  group.position.set(data.x || 0, data.y || 0, data.z || 0);
  group.rotation.y = data.rotY || 0;

  const tag = createNameTag(data.name || id.slice(0, 6));
  group.add(tag);

  _scene.add(group);
  remotePlayers[id] = {
    group,
    target: { x: data.x || 0, y: data.y || 0, z: data.z || 0, rotY: data.rotY || 0 },
  };

  spawnCharacter(group); // async; model appears once loaded
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

export function updateRemotePlayers(delta) {
  for (const { group, target } of Object.values(remotePlayers)) {
    const prevX = group.position.x;
    const prevZ = group.position.z;

    group.position.lerp(new THREE.Vector3(target.x, target.y, target.z), LERP_POS);
    group.rotation.y += (target.rotY - group.rotation.y) * LERP_ROT;

    const dx = group.position.x - prevX;
    const dz = group.position.z - prevZ;
    const speed = Math.sqrt(dx * dx + dz * dz) / delta;

    let animTarget;
    if (speed < 0.5)  animTarget = 'idle';
    else if (speed < 10) animTarget = 'walk';
    else               animTarget = 'run';

    setAnimState(group, animTarget);
    updateCharacterMixer(group, delta);
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
  sprite.position.y = 2.1; // just above 1.82 m model head
  return sprite;
}
