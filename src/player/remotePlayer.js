import * as THREE from 'three';
import { getSurfaceY } from '../systems/terrain.js';
import { buildCharacter } from './CharacterBuilder.js';

const LERP_POS = 0.18;
const LERP_ROT = 0.22;

const remotePlayers = {};

let _scene;

export function initRemotePlayers(scene) {
  _scene = scene;
}

export function addRemotePlayer(id, data) {
  try {
    if (remotePlayers[id]) return;

    const group = new THREE.Group();

    // Default to plaza spawn instead of world origin (0,0,0)
    const sx = Number.isFinite(data.x) ? data.x : 0;
    const sy = Number.isFinite(data.y) ? data.y : 0;
    const sz = Number.isFinite(data.z) ? data.z : 55;

    group.position.set(sx, sy, sz);
    group.rotation.y = data.rotY || 0;

    const tag = createNameTag(data.name || id.slice(0, 6));
    group.add(tag);

    // Build actual character instead of placeholder cube
    const character = buildCharacter('boy');

    // Scale to 2.5m tall
    const bbox = new THREE.Box3().setFromObject(character);
    const size = bbox.getSize(new THREE.Vector3());
    const currentHeight = size.y;
    if (currentHeight > 0) {
      const scale = 2.5 / currentHeight;
      character.scale.setScalar(scale);
      character.updateMatrixWorld(true);
    }

    // Position at Y=0 (feet on ground)
    const bbox2 = new THREE.Box3().setFromObject(character);
    character.position.y = -bbox2.min.y;

    character.traverse(n => {
      if (n.isMesh) {
        n.material.needsUpdate = true;
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });

    group.add(character);

    // Register + add to scene with a valid interpolation target
    remotePlayers[id] = {
      group,
      target: { x: sx, y: sy, z: sz, rotY: data.rotY || 0 }
    };
    if (_scene) _scene.add(group);
  } catch (err) {
    console.error('[remotePlayer] addRemotePlayer error:', err);
  }
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
    // ── CRITICAL FIX: Lock X and Z rotation to prevent bone deformation ──
    group.rotation.x = 0;
    group.rotation.z = 0;

    const prevX = group.position.x;
    const prevZ = group.position.z;

    const clampedY = Math.max(target.y, getSurfaceY(target.x, target.z));
    group.position.lerp(new THREE.Vector3(target.x, clampedY, target.z), LERP_POS);

    // Only interpolate Y rotation, keep X and Z locked at 0
    const rotDiff = target.rotY - group.rotation.y;
    group.rotation.y += rotDiff * LERP_ROT;

    // Remote players use simple cubes for now (no animations needed)
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
  sprite.position.y = 2.9; // just above 2.5m model head
  return sprite;
}
