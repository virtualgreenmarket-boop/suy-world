/**
 * skateboard.js
 * Procedural skateboard — deck, grip tape, trucks and wheels built from THREE
 * primitives + a custom shaped deck mesh. MeshLambertMaterial only (MeshStandard
 * crashes EffectComposer in this project).
 *
 * Usage:
 *   import { initSkateboard, toggleRide, isRiding, updateSkateboard } from './world/skateboard.js';
 *   initSkateboard(scene);                         // once, at startup
 *   toggleRide(playerGroup);                       // mount / dismount  (V key)
 *   updateSkateboard(delta, playerGroup, moving);  // every frame
 */

import * as THREE from 'three';

// ── Tunables ──────────────────────────────────────────────────────────
export const RIDE_SPEED = 14;          // matches RUN_SPEED in localPlayer.js
const WHEEL_R   = 0.115;               // approved wheel radius
const DECK_Y    = 0.30;                // deck height in local model space
const DECK_LEN  = 3.0;
const BOARD_SCALE = 1.0;               // overall size; raise if it looks small next to the player

// How far the rider is lifted so their feet rest on the deck surface.
// Deck top ≈ DECK_Y (0.30) + half thickness (0.025) + grip (0.027) ≈ 0.35
// Increase if the feet sink into the board; decrease if they float above it.
// NOTE: localPlayer.js imports this and uses it as the gravity floor while riding.
export const RIDE_LIFT = 0.35;

// Colour presets — these match the four placeholders in inventoryPanel.js
export const SKATE_STYLES = {
  'קלאסי':  { deck: 0xD9A868, grip: 0x191919, wheel: 0x3FBF3F },
  'גרפיטי': { deck: 0x2E2E34, grip: 0x141414, wheel: 0xE8452F },
  'עץ':     { deck: 0xE0B77E, grip: 0x3A2C1E, wheel: 0xF2E4C4 },
  'ניאון':  { deck: 0x1A1A22, grip: 0x101018, wheel: 0x2BB3BD },
};

const METAL = 0xB8BFC7;

let _scene  = null;
let _board  = null;     // THREE.Group holding the model
let _riding = false;
let _style  = { ...SKATE_STYLES['קלאסי'] };
let _wheels = [];       // wheel meshes, spun while moving

// ── Deck shape helpers ────────────────────────────────────────────────
// Popsicle outline: straight through the middle, flaring then rounding at the tips.
function _halfWidth(t) {
  const a = Math.abs((t - 0.5) * 2);
  if (a < 0.60) return 0.35;
  const k = (a - 0.60) / 0.40;
  return 0.35 * (1 + 0.06 * Math.sin(k * Math.PI)) * Math.sqrt(Math.max(0, 1 - k * k * 0.94));
}

// Kicked nose and tail
function _kickHeight(t) {
  const a = Math.abs((t - 0.5) * 2);
  const e = Math.max(0, a - 0.58) / 0.42;
  return e * e * 0.30;
}

function _buildDeckGeometry() {
  const THICK = 0.05, SEG = 64;
  const verts = [], idx = [];
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, x = (t - 0.5) * DECK_LEN;
    const hw = _halfWidth(t), y = DECK_Y + _kickHeight(t);
    verts.push(x, y + THICK / 2,  hw,
               x, y + THICK / 2, -hw,
               x, y - THICK / 2,  hw,
               x, y - THICK / 2, -hw);
  }
  for (let i = 0; i < SEG; i++) {
    const o = i * 4, n = (i + 1) * 4;
    idx.push(o, n, o + 1,  o + 1, n, n + 1);              // top
    idx.push(o + 2, o + 3, n + 2,  o + 3, n + 3, n + 2);  // bottom
    idx.push(o, o + 2, n,  n, o + 2, n + 2);              // side A
    idx.push(o + 1, n + 1, o + 3,  n + 1, n + 3, o + 3);  // side B
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Thin grip-tape skin, inset so the wooden rim shows around it
function _buildGripGeometry() {
  const SEG = 64, verts = [], idx = [], uvs = [];
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, x = (t - 0.5) * DECK_LEN;
    const hw = _halfWidth(t) * 0.94, y = DECK_Y + _kickHeight(t) + 0.0265;
    verts.push(x, y, hw, x, y, -hw);
    uvs.push(t, 1, t, 0);
  }
  for (let i = 0; i < SEG; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1,  a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Speckled grip-tape texture generated from the chosen colour
function _gripTexture(hex) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  const col = new THREE.Color(hex);
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
  x.fillStyle = `rgb(${r},${g},${b})`;
  x.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 4200; i++) {
    const d = (Math.random() - 0.5) * 70;
    const cl = v => Math.max(0, Math.min(255, v + d));
    x.fillStyle = `rgba(${cl(r)},${cl(g)},${cl(b)},0.5)`;
    x.fillRect(Math.random() * 256, Math.random() * 64, 1.5, 1.5);
  }
  return new THREE.CanvasTexture(c);
}

const _lam = c => new THREE.MeshLambertMaterial({ color: c });

/** Build the skateboard model as a THREE.Group (origin at ground level, board centred). */
export function buildSkateboard(style = _style) {
  const g = new THREE.Group();
  _wheels = [];

  // Deck + grip
  const deck = new THREE.Mesh(_buildDeckGeometry(), _lam(style.deck));
  deck.castShadow = true;
  g.add(deck);

  const grip = new THREE.Mesh(
    _buildGripGeometry(),
    new THREE.MeshLambertMaterial({ map: _gripTexture(style.grip), side: THREE.DoubleSide })
  );
  g.add(grip);

  // Trucks — hanger drops from the deck underside to the axle at wheel height
  const deckBottom = DECK_Y - 0.025;
  const axleY = WHEEL_R;
  const drop = Math.max(0.03, deckBottom - axleY);

  [-0.86, 0.86].forEach(tx => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.045, 0.34), _lam(METAL));
    base.position.set(tx, deckBottom - 0.022, 0);
    g.add(base);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.048, drop, 8), _lam(METAL));
    post.position.set(tx, axleY + drop / 2, 0);
    g.add(post);

    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.60, 10), _lam(METAL));
    axle.rotation.x = Math.PI / 2;
    axle.position.set(tx, axleY, 0);
    g.add(axle);
  });

  // Wheels
  [[-0.86, 0.29], [-0.86, -0.29], [0.86, 0.29], [0.86, -0.29]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_R * 0.88, 20), _lam(style.wheel));
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, WHEEL_R, wz);
    w.castShadow = true;
    g.add(w);
    _wheels.push(w);

    const bearing = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_R * 0.31, WHEEL_R * 0.31, WHEEL_R * 0.94, 12), _lam(0xDDE2E6));
    bearing.rotation.x = Math.PI / 2;
    bearing.position.set(wx, WHEEL_R, wz);
    g.add(bearing);
  });

  g.scale.setScalar(BOARD_SCALE);
  return g;
}

// ── Public API ────────────────────────────────────────────────────────

export function initSkateboard(scene) {
  _scene = scene;
  _board = buildSkateboard(_style);
  _board.visible = false;
  scene.add(_board);
  console.log('[skateboard] ready — press V to ride');
}

/** Swap colours (e.g. when the player picks a variant in the bag). */
export function setSkateboardStyle(styleName) {
  const s = SKATE_STYLES[styleName];
  if (!s) { console.warn('[skateboard] unknown style:', styleName); return; }
  _style = { ...s };
  if (!_scene) return;
  const wasVisible = _board?.visible;
  if (_board) _scene.remove(_board);
  _board = buildSkateboard(_style);
  _board.visible = !!wasVisible;
  _scene.add(_board);
}

export function isRiding() { return _riding; }

/** Mount / dismount. Returns the new riding state. */
export function toggleRide(playerGroup) {
  if (!_board || !playerGroup) return _riding;
  _riding = !_riding;
  _board.visible = _riding;

  if (_riding) {
    playerGroup.position.y += RIDE_LIFT;   // stand on the deck
    _syncBoard(playerGroup);
  } else {
    playerGroup.position.y -= RIDE_LIFT;   // step back down
  }

  console.log('[skateboard]', _riding ? 'riding' : 'off board');
  return _riding;
}

export function dismount() {
  _riding = false;
  if (_board) _board.visible = false;
}

// Keep the board under the player, facing the same way.
// The board's own origin is at ground level, and the player is lifted by
// RIDE_LIFT while riding — so matching the player's Y puts the deck right
// under their feet without pushing the board into the ground.
function _syncBoard(playerGroup) {
  if (!_board || !playerGroup) return;
  _board.position.set(
    playerGroup.position.x,
    playerGroup.position.y - RIDE_LIFT,
    playerGroup.position.z
  );
  // Player faces (sin(rotY), cos(rotY)); the deck's long axis is +X, so add 90°.
  _board.rotation.y = playerGroup.rotation.y + Math.PI / 2;
}

/** Call every frame from updateLocalPlayer. */
export function updateSkateboard(delta, playerGroup, moving) {
  if (!_riding || !_board || !playerGroup) return;
  _syncBoard(playerGroup);
  if (moving) {
    const spin = delta * (RIDE_SPEED / WHEEL_R) * 0.15;
    for (const w of _wheels) w.rotation.y += spin;
  }
}