// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fishing Loop (casting, waiting, bite, meter, catch)
// FIXED VERSION:
//   1. Self-managed mobile "לדוג 🎣" button — appears whenever the player
//      stands near any FISHING_SPOT. No dependency on interactionUI/E key.
//   2. Same button becomes "משוך!" during the bite window and calls
//      pullRod() — previously nothing called pullRod, so every fish
//      escaped after 3 seconds.
//   3. Scene-leak fix: _fishEscaped() called _cleanupFishing() without a
//      scene, so the line + bobber were never removed and floated forever.
//      The scene is now stored once and cleanup always works.
//   4. NEW: procedural low-poly rod in the player's hand (color by owned
//      rod tier) + full fishing animation: cast swing, waiting sway, bite
//      shake, meter strain. The line follows the rod tip every frame.
//   5. v8: FOUR west-edge stations (worldZ −18/−6/+6/+18, matching the
//      new fence openings in marina.js) + cladding and stair railings
//      repositioned to the real 34 m stair width (|z| ≤ 17).
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import {
  getCurrentRod,
  hasBait,
  getBaitById,
  selectFish,
  startFishing,
  endFishing,
  isActiveFishing,
  getCurrentBait,
  consumeCurrentBait,
  addCaughtFish
} from './fishing.js';
import { showFishingMeter, hideFishingMeter, showCatchScreen, showEscapeScreen } from '../ui/fishingUI.js';
import { getSocket } from './multiplayer.js';

// ── Fishing Spots (marina pier alcoves + west edge) ───────────────────
// Positions match the black square fishing alcoves
// North side (worldZ≈+24), South side (worldZ≈-24), West edge (worldX≈-403.8)

export const FISHING_SPOTS = [
  { x: -397.9, y: 0.9, z: 24.0,  name: 'North Alcove 1', dir: { x: 0, z: 1 } },
  { x: -383.9, y: 0.9, z: 24.0,  name: 'North Alcove 2', dir: { x: 0, z: 1 } },
  { x: -369.9, y: 0.9, z: 24.0,  name: 'North Alcove 3', dir: { x: 0, z: 1 } },
  { x: -397.9, y: 0.9, z: -24.0, name: 'South Alcove 1', dir: { x: 0, z: -1 } },
  { x: -383.9, y: 0.9, z: -24.0, name: 'South Alcove 2', dir: { x: 0, z: -1 } },
  { x: -369.9, y: 0.9, z: -24.0, name: 'South Alcove 3', dir: { x: 0, z: -1 } },
  // West edge (pier end, casting into open sea toward -X) — 4 stations
  // aligned with the fence openings built in marina.js
  { x: -403.8, y: 0.9, z: -18.0, name: 'West Edge 1', dir: { x: -1, z: 0 } },
  { x: -403.8, y: 0.9, z: -6.0,  name: 'West Edge 2', dir: { x: -1, z: 0 } },
  { x: -403.8, y: 0.9, z: 6.0,   name: 'West Edge 3', dir: { x: -1, z: 0 } },
  { x: -403.8, y: 0.9, z: 18.0,  name: 'West Edge 4', dir: { x: -1, z: 0 } }
];

const SPOT_RADIUS = 4.5;   // metres — horizontal distance for the button to appear
const METER_SPEED_MULT = 3.0; // pull-meter difficulty (higher = faster bar)
const PROX_INTERVAL = 0.2; // seconds between proximity checks

// ── Visual Elements ───────────────────────────────────────────────────

let _fishingLine = null;
let _bobber = null;

// ── State ─────────────────────────────────────────────────────────────

let _scene = null;                // stored once — used by cleanup + button
let _currentSpot = null;
let _castTarget = null;           // where this cast landed (random 5–30m out)
const WATER_Y = 0.05;             // water surface — the bobber floats here
let _fishingState = 'idle';       // 'idle' | 'casting' | 'waiting' | 'biting' | 'meter'
let _waitTimer = 0;
let _biteWindow = 0;
let _biteEffects = [];
let _proxTimer = 0;
let _nearestSpotIndex = -1;
let _nearAnySpot = false;

// ── Rod-in-hand + animation state ─────────────────────────────────────
let _rodGroup = null;      // THREE.Group attached to the player
let _rodTip = null;        // Object3D marker at the rod tip (for the line)
let _rodColorId = null;    // which rod the current material color matches
let _castAnim = null;      // { t } while the cast swing is playing
const ROD_COLORS = { wood: 0xC98F14, fiberglass: 0xC9D4D8, carbon: 0x0D2428, golden: 0xF0B429 };
const ROD_REST_TILT = Math.PI / 4; // rod points forward-up at rest (model forward = +Z)

// ── Action Button (self-managed, mobile-friendly) ────────────────────

let _actionBtn = null;
let _btnMode = null; // null | 'fish' | 'pull'

function _ensureActionButton() {
  if (_actionBtn) return _actionBtn;

  if (!document.getElementById('fishing-btn-style')) {
    const style = document.createElement('style');
    style.id = 'fishing-btn-style';
    style.textContent = `
      @keyframes fishing-pull-pulse {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50%      { transform: translateX(-50%) scale(1.08); }
      }
      #fishing-action-btn {
        position: fixed;
        left: 50%;
        bottom: 130px;
        transform: translateX(-50%);
        display: none;
        padding: 14px 34px;
        border: 1px solid rgba(244, 231, 195, 0.35);
        border-radius: 12px;
        background: rgba(13, 36, 40, 0.78);
        box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.22), 0 6px 20px rgba(0, 0, 0, 0.45);
        color: #F4E7C3;
        font-family: Heebo, sans-serif;
        font-size: 20px;
        font-weight: 700;
        z-index: 10002;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      #fishing-action-btn.pull {
        background: #FF6B4A;
        color: #0D2428;
        border-color: rgba(255, 255, 255, 0.5);
        animation: fishing-pull-pulse 0.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  _actionBtn = document.createElement('button');
  _actionBtn.id = 'fishing-action-btn';
  _actionBtn.type = 'button';
  _actionBtn.addEventListener('click', () => {
    try {
      if (_btnMode === 'pull') {
        pullRod(_scene);
      } else if (_btnMode === 'fish' && _nearestSpotIndex >= 0) {
        const playerGroup = window._localPlayerGroup;
        if (!playerGroup) return;
        tryStartFishing(_nearestSpotIndex, _scene, playerGroup.position);
      }
    } catch (err) {
      console.error('[fishingLoop] Action button error:', err);
    }
  });
  document.body.appendChild(_actionBtn);
  return _actionBtn;
}

function _setButtonMode(mode) {
  if (mode === _btnMode) return;
  _btnMode = mode;
  const btn = _ensureActionButton();
  if (mode === 'fish') {
    btn.textContent = 'לדוג 🎣';
    btn.classList.remove('pull');
    btn.style.display = 'block';
  } else if (mode === 'pull') {
    btn.textContent = 'משוך!';
    btn.classList.add('pull');
    btn.style.display = 'block';
  } else {
    btn.style.display = 'none';
  }
}

function _updateProximity(delta) {
  _proxTimer += delta;
  if (_proxTimer < PROX_INTERVAL) return;
  _proxTimer = 0;

  // Button is state-driven outside idle
  if (_fishingState === 'biting') { _setButtonMode('pull'); return; }
  if (_fishingState !== 'idle')   { _setButtonMode(null);   return; }

  // Session still active (catch/escape screen open, or state not fully released):
  // keep the button hidden instead of showing "לדוג" that would fail.
  try {
    if (isActiveFishing()) {
      _setButtonMode(null);
      // Self-heal: if the active flag is stuck for a while with no state, release it
      if (!window.__fishingStuckSince) window.__fishingStuckSince = Date.now();
      else if (Date.now() - window.__fishingStuckSince > 6000) {
        console.warn('[fishingLoop] active-fishing flag stuck — releasing');
        try { endFishing(); } catch (_) {}
        window.__fishingStuckSince = 0;
      }
      return;
    }
    window.__fishingStuckSince = 0;
  } catch (_) {}

  const playerGroup = window._localPlayerGroup;
  if (!playerGroup) { _setButtonMode(null); return; }

  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;

  let best = -1;
  let bestDist = SPOT_RADIUS;
  for (let i = 0; i < FISHING_SPOTS.length; i++) {
    const s = FISHING_SPOTS[i];
    const d = Math.hypot(px - s.x, pz - s.z);
    if (d <= bestDist) { bestDist = d; best = i; }
  }

  _nearestSpotIndex = best;
  _nearAnySpot = best >= 0;
  _setButtonMode(best >= 0 ? 'fish' : null);
}

// ── Rod in hand (procedural low-poly model + animation) ──────────────

function _currentRodColor() {
  try {
    const rod = getCurrentRod();
    const id = rod && (rod.id || rod.rodId || rod.name);
    return { id: id || 'wood', color: ROD_COLORS[id] !== undefined ? ROD_COLORS[id] : ROD_COLORS.wood };
  } catch (_) {
    return { id: 'wood', color: ROD_COLORS.wood };
  }
}

let _arm = null;      // { shoulder, foreArm, hand, other, rest } — the character's real arm pivots
let _poseOn = false;

// The blocky character has real pivot groups: shoulder Group (|x|≈0.54, y≈0.42)
// → forearm Group (elbow) → hand mesh (0.22³ box). Calibrated live in-game.
function _findArm(playerGroup) {
  let shoulder = null, other = null;
  playerGroup.traverse(o => {
    if (o.type !== 'Group') return;
    if (Math.abs(Math.abs(o.position.x) - 0.54) < 0.08 && Math.abs(o.position.y - 0.42) < 0.12) {
      if (o.position.x < 0 && !shoulder) shoulder = o;
      else if (o.position.x > 0 && !other) other = o;
    }
  });
  if (!shoulder) return null;
  const foreArm = shoulder.children.find(c => c.type === 'Group');
  if (!foreArm) return null;
  const hand = foreArm.children.find(c =>
    c.isMesh && c.geometry && c.geometry.type === 'BoxGeometry' &&
    Math.abs((c.geometry.parameters.width || 0) - 0.22) < 0.04 &&
    Math.abs((c.geometry.parameters.height || 0) - 0.22) < 0.04);
  if (!hand) return null;
  return {
    shoulder, foreArm, hand, other,
    rest: {
      sx: shoulder.rotation.x, sz: shoulder.rotation.z,
      fx: foreArm.rotation.x,
      ox: other ? other.rotation.x : 0
    }
  };
}

function _setFishingPose(on) {
  if (!_arm) return;
  if (on && !_poseOn) {
    _poseOn = true;
  } else if (!on && _poseOn) {
    _poseOn = false;
    _arm.shoulder.rotation.x = _arm.rest.sx;
    _arm.shoulder.rotation.z = _arm.rest.sz;
    _arm.foreArm.rotation.x = _arm.rest.fx;
    if (_arm.other) _arm.other.rotation.x = _arm.rest.ox;
  }
}

function _ensureRod() {
  const playerGroup = window._localPlayerGroup;
  if (!playerGroup) return null;
  const wantedParent = _arm ? _arm.hand : playerGroup;
  if (_rodGroup && _rodGroup.parent === wantedParent) return _rodGroup;

  try {
    if (!_arm) _arm = _findArm(playerGroup);

    const { id, color } = _currentRodColor();

    _rodGroup = new THREE.Group();
    _rodGroup.name = 'fishingRod';

    const shaftMat = new THREE.MeshLambertMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 1.6, 6), shaftMat);
    shaft.position.y = 0.8;
    _rodGroup.add(shaft);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.032, 0.25, 6),
      new THREE.MeshLambertMaterial({ color: 0x4A3018 })
    );
    handle.position.y = 0.125;
    _rodGroup.add(handle);

    const reel = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.09, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x0D2428 })
    );
    reel.position.set(0, 0.32, 0.05);
    _rodGroup.add(reel);

    _rodTip = new THREE.Object3D();
    _rodTip.position.y = 1.6;
    _rodGroup.add(_rodTip);

    _rodGroup.scale.setScalar(1.5);   // 50% larger rod
    _rodGroup.visible = false;

    if (_arm) {
      // In the hand: butt at the palm, tip forward-up (values calibrated live)
      _rodGroup.position.set(0, -0.05, 0);
      _rodGroup.rotation.set(2.5, 0, 0);
      _arm.hand.add(_rodGroup);
      console.log('[fishingLoop] Rod attached to the character hand (' + id + ')');
    } else {
      // Fallback: no arm structure found — attach to the player group
      _rodGroup.position.set(0.3, 1.2, 0.25);
      _rodGroup.rotation.x = ROD_REST_TILT;
      playerGroup.add(_rodGroup);
      console.log('[fishingLoop] Rod attached to player group fallback (' + id + ')');
    }
    _rodColorId = id;
    return _rodGroup;
  } catch (err) {
    console.error('[fishingLoop] Rod build error:', err);
    _rodGroup = null;
    return null;
  }
}

function _refreshRodColor() {
  if (!_rodGroup) return;
  const { id, color } = _currentRodColor();
  if (id === _rodColorId) return;
  const shaft = _rodGroup.children[0];
  if (shaft && shaft.material) shaft.material.color.setHex(color);
  _rodColorId = id;
}

function _updateRod(delta) {
  const rod = _ensureRod();
  if (!rod) return;

  rod.visible = _nearAnySpot || _fishingState !== 'idle';
  if (!rod.visible) { _castAnim = null; _setFishingPose(false); return; }

  _refreshRodColor();
  _setFishingPose(true);

  const time = Date.now() * 0.001;

  if (_arm) {
    // ── Real arm animation (shoulder + elbow pivots, live-calibrated) ──
    const S = _arm.shoulder, F = _arm.foreArm;
    F.rotation.x = -0.9;
    if (_arm.other) _arm.other.rotation.x = -0.45;  // second hand joins the hold
    rod.rotation.set(2.5, 0, 0);

    if (_castAnim) {
      _castAnim.t += delta;
      const t = Math.min(1, _castAnim.t / 0.8);
      if (t < 0.35) {
        const k = t / 0.35;                       // wind up-back over the head
        S.rotation.x = -0.55 - k * 1.35;
      } else if (t < 0.65) {
        const k = (t - 0.35) / 0.3;               // swing forward-down
        S.rotation.x = -1.9 + k * 1.8;
        F.rotation.x = -0.9 + k * 0.5;            // elbow extends with the throw
      } else {
        const k = (t - 0.65) / 0.35;              // settle to hold
        S.rotation.x = -0.1 - k * 0.45;
        F.rotation.x = -0.4 - k * 0.5;
      }
      if (t >= 1) { _castAnim = null; S.rotation.x = -0.55; F.rotation.x = -0.9; }
    } else if (_fishingState === 'waiting') {
      S.rotation.x = -0.55 + Math.sin(time * 1.5) * 0.04;
    } else if (_fishingState === 'biting') {
      S.rotation.x = -0.55 + Math.sin(time * 30) * 0.05;
      rod.rotation.z = Math.sin(time * 37) * 0.08;
    } else if (_fishingState === 'meter') {
      S.rotation.x = -0.8 + Math.sin(time * 8) * 0.05;   // straining pull
    } else {
      S.rotation.x = -0.55 + Math.sin(time * 1.2) * 0.03;
    }
  } else {
    // ── Fallback: animate the rod itself (no arm pivots found) ──
    if (_castAnim) {
      _castAnim.t += delta;
      const t = Math.min(1, _castAnim.t / 0.8);
      if (t < 0.35) {
        const k = t / 0.35;
        rod.rotation.x = ROD_REST_TILT - k * 1.05;
      } else if (t < 0.65) {
        const k = (t - 0.35) / 0.3;
        rod.rotation.x = (ROD_REST_TILT - 1.05) + k * 1.75;
      } else {
        const k = (t - 0.65) / 0.35;
        rod.rotation.x = (ROD_REST_TILT + 0.7) - k * 0.7;
      }
      if (t >= 1) { _castAnim = null; rod.rotation.x = ROD_REST_TILT; }
    } else if (_fishingState === 'waiting') {
      rod.rotation.x = ROD_REST_TILT + Math.sin(time * 1.5) * 0.05;
      rod.rotation.z = 0;
    } else if (_fishingState === 'biting') {
      rod.rotation.x = ROD_REST_TILT + Math.sin(time * 30) * 0.08;
      rod.rotation.z = Math.sin(time * 37) * 0.06;
    } else if (_fishingState === 'meter') {
      rod.rotation.x = ROD_REST_TILT - 0.35 + Math.sin(time * 8) * 0.05;
      rod.rotation.z = 0;
    } else {
      rod.rotation.x = ROD_REST_TILT + Math.sin(time * 1.2) * 0.03;
      rod.rotation.z = 0;
    }
  }

  // Keep the fishing line anchored to the rod tip
  if (_fishingLine && _rodTip) {
    try {
      const tipPos = new THREE.Vector3();
      _rodTip.getWorldPosition(tipPos);
      const positions = _fishingLine.geometry.attributes.position;
      positions.array[0] = tipPos.x;
      positions.array[1] = tipPos.y;
      positions.array[2] = tipPos.z;
      if (_bobber) {
        positions.array[3] = _bobber.position.x;
        positions.array[4] = _bobber.position.y;
        positions.array[5] = _bobber.position.z;
      }
      positions.needsUpdate = true;
    } catch (_) { /* line update is cosmetic */ }
  }
}

// ── Initialization ────────────────────────────────────────────────────

let _serverSyncDone = false;

function _syncInventoryFromServer() {
  if (_serverSyncDone) return;
  try {
    const s = getSocket();
    if (!s) return;
    _serverSyncDone = true;
    s.on('fishingDataLoaded', (data) => {
      try {
        if (!data || !window.updateFishingInventory) return;
        window.updateFishingInventory({
          ownedRods: data.ownedRods,
          currentRod: data.currentRod,
          baits: data.baits
        });
        console.log('[fishingLoop] Inventory synced from server:', JSON.stringify(data.baits || {}));
      } catch (err) { console.error('[fishingLoop] sync apply error:', err); }
    });
    s.emit('loadFishingData');
    console.log('[fishingLoop] Requested inventory sync from server');
  } catch (_) { /* socket not ready yet — retried from update */ }
}

// ── Marina extras (pure additions — marina.js handles the structure) ──
// 1. Four fishing pads on the pier's west edge (black squares like the
//    side alcoves; casting goes over the end rail into open sea).
//    Aligned with the 4 fence openings marina.js builds in the end rail.
// 2. Wood cladding closing the exposed gap between the upper deck and
//    the fishing pier — OUTSIDE the (now 34 m wide) stairs: |z| 17–22.5.
// 3. Sloped railings with posts + ball caps at the real stair edges z≈±16.9.

function _buildMarinaExtras(scene) {
  try {
    const M = (c) => new THREE.MeshLambertMaterial({ color: c });
    const WOOD = 0xC98F14, WOOD_D = 0x8A6210, WOOD_DD = 0x5C3A10, PAD = 0x1A1208;

    // 1. West fishing pads (black squares) — 4 stations facing the
    //    fence openings at worldZ −18 / −6 / +6 / +18
    for (const z of [-18, -6, 6, 18]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 1.7), M(PAD));
      pad.position.set(-403.8, 0.94, z);
      scene.add(pad);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.03, 1.9), M(WOOD_DD));
      trim.position.set(-403.8, 0.905, z);
      scene.add(trim);
    }

    // 2. Cladding between the floors (deck edge X≈-346.4, deck y=3.2 → pier y=0.9)
    //    The stairs are 34 m wide (worldZ −17..+17); the pier ends at |z|=22.5,
    //    so each cladding section covers only |z| 17–22.5 (5.5 m).
    for (const zc of [19.75, -19.75]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.3, 5.5), M(WOOD_D));
      wall.position.set(-346.4, 2.05, zc);
      scene.add(wall);
      // Plank lines (thin darker strips for a paneled look)
      for (let i = 0; i < 3; i++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.05, 5.5), M(WOOD_DD));
        strip.position.set(-346.4, 1.35 + i * 0.7, zc);
        scene.add(strip);
      }
      // Top trim aligned with the deck edge
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 5.7), M(WOOD));
      trim.position.set(-346.4, 3.14, zc);
      scene.add(trim);
    }
    // Frame cheeks around the stair opening (at the stair edges)
    for (const zc of [17, -17]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.35, 0.35), M(WOOD));
      cheek.position.set(-346.4, 2.05, zc);
      scene.add(cheek);
    }

    // 3. Stair railings — sloped handrail + posts + ball caps, both sides
    //    Stairs descend X -346.4 (top, y 3.2) → -353.4 (bottom, y 0.9),
    //    railings sit at the stair edges (z ≈ ±16.9, just inside ±17).
    const railLen = Math.hypot(7, 2.3);
    const slope = Math.atan2(2.3, 7);
    for (const zs of [16.9, -16.9]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.12, 0.12), M(WOOD));
      rail.position.set(-349.9, 3.0, zs);
      rail.rotation.z = slope;
      scene.add(rail);
      const mid = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.07, 0.07), M(WOOD_D));
      mid.position.set(-349.9, 2.45, zs);
      mid.rotation.z = slope;
      scene.add(mid);
      for (const px of [-352.6, -350.8, -349.0, -347.2]) {
        const railY = 1.85 + ((px + 353.4) / 7) * 2.3;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.95, 6), M(WOOD_D));
        post.position.set(px, railY - 0.47, zs);
        scene.add(post);
      }
      for (const [ex, ey] of [[-346.4, 4.15], [-353.4, 1.85]]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), M(WOOD_DD));
        cap.position.set(ex, ey + 0.08, zs);
        scene.add(cap);
      }
    }

    console.log('[fishingLoop] Marina extras built: 4 west pads, stairs cladding + railings (34m stairs)');
  } catch (err) {
    console.error('[fishingLoop] Marina extras error:', err);
  }
}

export function initFishingSpots(scene) {
  try {
    _scene = scene;
    _ensureActionButton();
    _syncInventoryFromServer();
    _buildMarinaExtras(scene);
    console.log('[fishingLoop] Initialized', FISHING_SPOTS.length, 'fishing spots (marina alcoves)');
  } catch (err) {
    console.error('[fishingLoop] Init error:', err);
  }
}

export function updateFishingSpots(delta) {
  try {
    if (!_serverSyncDone) _syncInventoryFromServer();
    _updateProximity(delta);
    _updateRod(delta);

    if (_fishingState === 'casting') {
      _updateCasting(delta);
    } else if (_fishingState === 'waiting') {
      _updateWaiting(delta);
    } else if (_fishingState === 'biting') {
      _updateBiting(delta);
    }

    _updateVisualEffects(delta);
  } catch (err) {
    if (!window._fishingUpdateError) {
      console.error('[fishingLoop] Update error:', err);
      window._fishingUpdateError = true;
    }
  }
}

// ── Start Fishing ─────────────────────────────────────────────────────

export function canStartFishing(spotIndex) {
  if (isActiveFishing()) return false;
  if (spotIndex < 0 || spotIndex >= FISHING_SPOTS.length) return false;

  const baits = ['worm', 'shrimp', 'squid'];
  return baits.some(b => hasBait(b));
}

export function tryStartFishing(spotIndex, scene, playerPos) {
  if (scene) _scene = scene;

  if (isActiveFishing()) {
    // Already mid-session (e.g. result screen still open) — ignore silently
    return false;
  }

  if (!canStartFishing(spotIndex)) {
    const anyBait = ['worm', 'shrimp', 'squid'].some(b => { try { return hasBait(b); } catch (_) { return false; } });
    if (window.showTemporaryMessage) {
      window.showTemporaryMessage(anyBait ? 'אי אפשר לדוג כרגע' : 'אין פיתיונות! קנה אצל הדייג 🎣');
    }
    return false;
  }

  _currentSpot = FISHING_SPOTS[spotIndex];

  // Select bait (prefer squid > shrimp > worm)
  let selectedBait = null;
  if (hasBait('squid')) selectedBait = 'squid';
  else if (hasBait('shrimp')) selectedBait = 'shrimp';
  else if (hasBait('worm')) selectedBait = 'worm';

  if (!selectedBait) return false;

  if (!startFishing(selectedBait)) return false;

  _startCasting(_scene, playerPos);
  _castAnim = { t: 0 };   // play the rod swing animation
  _setButtonMode(null);

  return true;
}

// ── Casting Phase ─────────────────────────────────────────────────────

function _startCasting(scene, playerPos) {
  _fishingState = 'casting';
  if (!scene) return;

  // Random cast distance: 5–30m outward into the water + small sideways drift
  const dist = 5 + Math.random() * 25;
  const dir = _currentSpot.dir || { x: 0, z: _currentSpot.z >= 0 ? 1 : -1 };
  const side = (Math.random() - 0.5) * 4;
  _castTarget = new THREE.Vector3(
    _currentSpot.x + dir.x * dist + dir.z * side,
    WATER_Y,
    _currentSpot.z + dir.z * dist + dir.x * side
  );

  const startPos = new THREE.Vector3(playerPos.x, playerPos.y + 1.6, playerPos.z);

  const rodGeo = new THREE.BufferGeometry().setFromPoints([
    startPos.clone(),
    startPos.clone()
  ]);
  _fishingLine = new THREE.Line(
    rodGeo,
    new THREE.LineBasicMaterial({ color: 0xF4E7C3, linewidth: 2 })
  );
  scene.add(_fishingLine);

  _bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xFF6B4A })
  );
  _bobber.position.copy(startPos);
  scene.add(_bobber);

  _bobber.userData.castTime = 0;
  _bobber.userData.castDuration = 0.7 + dist * 0.02;   // farther casts fly a bit longer
  _bobber.userData.startPos = startPos;
}

function _updateCasting(delta) {
  if (!_bobber || !_castTarget) { _fishingState = 'waiting'; _waitTimer = Math.random() * 5 + 5; return; }

  _bobber.userData.castTime += delta;
  const t = Math.min(1, _bobber.userData.castTime / _bobber.userData.castDuration);

  // Horizontal flight with a parabolic height arc
  const s = _bobber.userData.startPos;
  const arc = 4 * t * (1 - t);
  _bobber.position.x = s.x + (_castTarget.x - s.x) * t;
  _bobber.position.z = s.z + (_castTarget.z - s.z) * t;
  _bobber.position.y = s.y + (_castTarget.y - s.y) * t + arc * 3;

  if (t >= 1) {
    _createSplash(_bobber.position);
    _fishingState = 'waiting';
    _waitTimer = Math.random() * 5 + 5; // 5-10 seconds
    _bobber.position.copy(_castTarget);
  }
}

// ── Waiting Phase ─────────────────────────────────────────────────────

function _updateWaiting(delta) {
  _waitTimer -= delta;

  if (_bobber && _castTarget) {
    const time = Date.now() * 0.001;
    // Bobber floats ON the water surface
    _bobber.position.y = WATER_Y + Math.sin(time * 2) * 0.08;
  }

  if (_waitTimer <= 0) {
    _fishingState = 'biting';
    _biteWindow = 3.0;
    _startBiteEffects();
    _setButtonMode('pull');
  }
}

// ── Biting Phase ──────────────────────────────────────────────────────

function _startBiteEffects() {
  if (!_bobber) return;

  _bobber.userData.shaking = true;
  _bobber.userData.shakeTime = 0;

  const pos = _bobber.position;
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      _createRipple(pos.clone());
    }, i * 300);
  }
}

function _updateBiting(delta) {
  _biteWindow -= delta;

  if (_bobber && _bobber.userData.shaking) {
    _bobber.userData.shakeTime += delta * 10;
    const cx = _castTarget ? _castTarget.x : _currentSpot.x;
    const cz = _castTarget ? _castTarget.z : _currentSpot.z;
    _bobber.position.x = cx + Math.sin(_bobber.userData.shakeTime) * 0.2;
    _bobber.position.z = cz + Math.cos(_bobber.userData.shakeTime * 1.3) * 0.15;
    _bobber.position.y = WATER_Y + Math.sin(_bobber.userData.shakeTime * 2) * 0.06;
  }

  if (_fishingLine && _bobber) {
    const positions = _fishingLine.geometry.attributes.position;
    positions.array[3] = _bobber.position.x;
    positions.array[4] = _bobber.position.y;
    positions.array[5] = _bobber.position.z;
    positions.needsUpdate = true;
  }

  if (_biteWindow <= 0) {
    _fishEscaped();
  }
}

export function pullRod(scene) {
  if (scene) _scene = scene;
  if (_fishingState !== 'biting') return;

  _fishingState = 'meter';
  _setButtonMode(null);

  const rod = getCurrentRod();
  // Meter challenge tuning: fishingUI moves the bar speed*0.8 per frame.
  // x3.0 ≈ full sweep in ~0.7s on the wood rod (golden ≈ 1s). Raise/lower to taste.
  showFishingMeter(rod.meterSpeed * METER_SPEED_MULT, rod.centerZone, (success, accuracy) => {
    if (success) {
      _catchFish(_scene, accuracy);
    } else {
      _fishEscaped();
    }
  });
}

// ── Catch Success ─────────────────────────────────────────────────────

function _catchFish(scene, accuracy) {
  const rod = getCurrentRod();
  const bait = getBaitById(getCurrentBait());

  const fish = selectFish(rod.tier, bait.effect, accuracy);

  consumeCurrentBait();

  getSocket().emit('consumeBait', { baitId: getCurrentBait() });
  getSocket().emit('catchFish', { fishId: fish.id });

  addCaughtFish(fish.id);

  const expAmounts = { common: 2, uncommon: 4, rare: 8, epic: 15, legendary: 30 };
  const exp = expAmounts[fish.rarity] || 2;
  if (window.awardStepEXP) {
    window.awardStepEXP(exp);
  }

  _cleanupFishing(scene);

  showCatchScreen(fish, () => {
    endFishing();
  });

  console.log(`[fishingLoop] Caught ${fish.nameHe} (${fish.rarity}) - accuracy: ${(accuracy * 100).toFixed(1)}%`);
}

// ── Fish Escaped ──────────────────────────────────────────────────────

function _fishEscaped() {
  // Consume bait even on failure — emit BEFORE endFishing clears the bait
  consumeCurrentBait();
  getSocket().emit('consumeBait', { baitId: getCurrentBait() });

  _cleanupFishing(_scene);

  showEscapeScreen(() => {
    endFishing();
  });

  console.log('[fishingLoop] Fish escaped!');
}

// ── Cleanup ───────────────────────────────────────────────────────────

function _cleanupFishing(scene) {
  const sc = scene || _scene;

  if (_fishingLine) {
    if (sc) sc.remove(_fishingLine);
    _fishingLine.geometry.dispose();
    _fishingLine.material.dispose();
    _fishingLine = null;
  }

  if (_bobber) {
    if (sc) sc.remove(_bobber);
    _bobber.geometry.dispose();
    _bobber.material.dispose();
    _bobber = null;
  }

  _fishingState = 'idle';
  _currentSpot = null;
  _waitTimer = 0;
  _biteWindow = 0;
  _castAnim = null;
  _castTarget = null;
  _setButtonMode(null);

  hideFishingMeter();
}

// ── Visual Effects (reused pool) ──────────────────────────────────────

function _createSplash(position) {
  const splash = {
    position: position.clone(),
    life: 0.5,
    maxLife: 0.5,
    type: 'splash'
  };
  _biteEffects.push(splash);
}

function _createRipple(position) {
  const ripple = {
    position: position.clone(),
    life: 1.0,
    maxLife: 1.0,
    radius: 0,
    type: 'ripple'
  };
  _biteEffects.push(ripple);
}

function _updateVisualEffects(delta) {
  for (let i = _biteEffects.length - 1; i >= 0; i--) {
    const effect = _biteEffects[i];
    effect.life -= delta;

    if (effect.life <= 0) {
      _biteEffects.splice(i, 1);
    } else if (effect.type === 'ripple') {
      effect.radius += delta * 2;
    }
  }
}

// ── Temporary Message Helper ──────────────────────────────────────────

if (!window.showTemporaryMessage) {
  window.showTemporaryMessage = (text) => {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(13, 36, 40, 0.95);
      color: #F4E7C3;
      padding: 20px 32px;
      border-radius: 12px;
      font-family: Heebo, sans-serif;
      font-size: 18px;
      z-index: 10003;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    `;
    document.body.appendChild(msg);
    setTimeout(() => {
      if (msg.parentNode) {
        msg.parentNode.removeChild(msg);
      }
    }, 2500);
  };
}