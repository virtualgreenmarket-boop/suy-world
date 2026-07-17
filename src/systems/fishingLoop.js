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

// ── Fishing Spots (6 alcoves on marina pier) ──────────────────────────
// Positions match the black square fishing alcoves
// North side (worldZ≈+24), South side (worldZ≈-24)

export const FISHING_SPOTS = [
  { x: -397.9, y: 0.9, z: 24.0, name: 'North Alcove 1' },
  { x: -383.9, y: 0.9, z: 24.0, name: 'North Alcove 2' },
  { x: -369.9, y: 0.9, z: 24.0, name: 'North Alcove 3' },
  { x: -397.9, y: 0.9, z: -24.0, name: 'South Alcove 1' },
  { x: -383.9, y: 0.9, z: -24.0, name: 'South Alcove 2' },
  { x: -369.9, y: 0.9, z: -24.0, name: 'South Alcove 3' }
];

const SPOT_RADIUS = 4.5;   // metres — horizontal distance for the button to appear
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

function _ensureRod() {
  const playerGroup = window._localPlayerGroup;
  if (!playerGroup) return null;
  if (_rodGroup && _rodGroup.parent === playerGroup) return _rodGroup;

  try {
    const { id, color } = _currentRodColor();

    _rodGroup = new THREE.Group();
    _rodGroup.name = 'fishingRod';

    // Shaft — 1.6m tapered cylinder along +Y
    const shaftMat = new THREE.MeshLambertMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 1.6, 6), shaftMat);
    shaft.position.y = 0.8;
    _rodGroup.add(shaft);

    // Handle — 0.25m darker grip at the base
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.032, 0.25, 6),
      new THREE.MeshLambertMaterial({ color: 0x4A3018 })
    );
    handle.position.y = 0.125;
    _rodGroup.add(handle);

    // Reel — small box near the handle
    const reel = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.09, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x0D2428 })
    );
    reel.position.set(0, 0.32, 0.05);
    _rodGroup.add(reel);

    // Tip marker — world anchor for the fishing line
    _rodTip = new THREE.Object3D();
    _rodTip.position.y = 1.6;
    _rodGroup.add(_rodTip);

    // 50% larger rod
    _rodGroup.scale.setScalar(1.5);

    // Held at the right hip, tilted forward (player forward = -Z)
    _rodGroup.position.set(0.3, 1.2, 0.25);
    _rodGroup.rotation.x = ROD_REST_TILT;
    _rodGroup.visible = false;

    playerGroup.add(_rodGroup);
    _rodColorId = id;
    console.log('[fishingLoop] Rod model attached to player (' + id + ')');
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

  // Visible only near a fishing spot or while fishing
  rod.visible = _nearAnySpot || _fishingState !== 'idle';
  if (!rod.visible) { _castAnim = null; return; }

  _refreshRodColor();

  const time = Date.now() * 0.001;

  if (_castAnim) {
    // Cast swing: back (~60°) then forward, 0.8s total
    _castAnim.t += delta;
    const t = Math.min(1, _castAnim.t / 0.8);
    if (t < 0.35) {
      const k = t / 0.35;                                   // wind back (up-behind)
      rod.rotation.x = ROD_REST_TILT - k * 1.05;
    } else if (t < 0.65) {
      const k = (t - 0.35) / 0.3;                           // swing forward
      rod.rotation.x = (ROD_REST_TILT - 1.05) + k * 1.75;
    } else {
      const k = (t - 0.65) / 0.35;                          // settle to rest
      rod.rotation.x = (ROD_REST_TILT + 0.7) - k * 0.7;
    }
    if (t >= 1) { _castAnim = null; rod.rotation.x = ROD_REST_TILT; }
  } else if (_fishingState === 'waiting') {
    rod.rotation.x = ROD_REST_TILT + Math.sin(time * 1.5) * 0.05;   // gentle hold
    rod.rotation.z = 0;
  } else if (_fishingState === 'biting') {
    rod.rotation.x = ROD_REST_TILT + Math.sin(time * 30) * 0.08;    // tip shaking
    rod.rotation.z = Math.sin(time * 37) * 0.06;
  } else if (_fishingState === 'meter') {
    rod.rotation.x = ROD_REST_TILT - 0.35 + Math.sin(time * 8) * 0.05; // straining
    rod.rotation.z = 0;
  } else {
    rod.rotation.x = ROD_REST_TILT + Math.sin(time * 1.2) * 0.03;   // idle sway
    rod.rotation.z = 0;
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

export function initFishingSpots(scene) {
  try {
    _scene = scene;
    _ensureActionButton();
    console.log('[fishingLoop] Initialized', FISHING_SPOTS.length, 'fishing spots (marina alcoves)');
  } catch (err) {
    console.error('[fishingLoop] Init error:', err);
  }
}

export function updateFishingSpots(delta) {
  try {
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

  if (!canStartFishing(spotIndex)) {
    if (window.showTemporaryMessage) {
      window.showTemporaryMessage('אין פיתיונות! קנה אצל הדייג 🎣');
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
  const outward = _currentSpot.z >= 0 ? 1 : -1;   // north spots cast +Z, south cast -Z
  _castTarget = new THREE.Vector3(
    _currentSpot.x + (Math.random() - 0.5) * 4,
    WATER_Y,
    _currentSpot.z + outward * dist
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
  showFishingMeter(rod.meterSpeed, rod.centerZone, (success, accuracy) => {
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