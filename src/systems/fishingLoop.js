// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fishing Loop (casting, waiting, bite, meter, catch)
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

// ── Visual Elements ───────────────────────────────────────────────────

let _spotMarkers = [];
let _castingRod = null;
let _fishingLine = null;
let _bobber = null;

// ── State ─────────────────────────────────────────────────────────────

let _currentSpot = null;
let _fishingState = 'idle'; // 'idle' | 'casting' | 'waiting' | 'biting' | 'meter'
let _waitTimer = 0;
let _biteWindow = 0;
let _biteEffects = [];

// ── Initialization ────────────────────────────────────────────────────

export function initFishingSpots(scene) {
  try {
    // Fishing spots are now integrated with marina alcoves
    // No visual markers needed - the black squares serve as markers
    console.log('[fishingLoop] Initialized', FISHING_SPOTS.length, 'fishing spots (marina alcoves)');
  } catch (err) {
    console.error('[fishingLoop] Init error:', err);
  }
}

export function updateFishingSpots(delta) {
  try {
    // No visual markers to animate - alcoves are static

    // Update fishing state
    if (_fishingState === 'casting') {
      _updateCasting(delta);
    } else if (_fishingState === 'waiting') {
      _updateWaiting(delta);
    } else if (_fishingState === 'biting') {
      _updateBiting(delta);
    }

    // Update visual effects
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

  // Check if player has any bait
  const baits = ['worm', 'shrimp', 'squid'];
  return baits.some(b => hasBait(b));
}

export function tryStartFishing(spotIndex, scene, playerPos) {
  if (!canStartFishing(spotIndex)) {
    // Show "no bait" message
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

  // Start casting animation
  _startCasting(scene, playerPos);

  return true;
}

// ── Casting Phase ─────────────────────────────────────────────────────

function _startCasting(scene, playerPos) {
  _fishingState = 'casting';

  // Create simple rod (line from player to water)
  const rodGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z),
    new THREE.Vector3(_currentSpot.x, _currentSpot.y, _currentSpot.z)
  ]);
  _fishingLine = new THREE.Line(
    rodGeo,
    new THREE.LineBasicMaterial({ color: 0xF4E7C3, linewidth: 2 })
  );
  scene.add(_fishingLine);

  // Create bobber
  _bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xFF6B4A })
  );
  _bobber.position.set(_currentSpot.x, _currentSpot.y + 5, _currentSpot.z); // Start above, will fall
  scene.add(_bobber);

  // Animate bobber falling (parabolic arc)
  _bobber.userData.castTime = 0;
  _bobber.userData.castDuration = 0.8;
  _bobber.userData.startY = _bobber.position.y;
  _bobber.userData.targetY = _currentSpot.y - 0.5; // Slightly below surface
}

function _updateCasting(delta) {
  if (!_bobber) return;

  _bobber.userData.castTime += delta;
  const t = Math.min(1, _bobber.userData.castTime / _bobber.userData.castDuration);

  // Parabolic arc
  const startY = _bobber.userData.startY;
  const targetY = _bobber.userData.targetY;
  const arc = 4 * t * (1 - t); // Peaks at t=0.5
  _bobber.position.y = startY + (targetY - startY) * t + arc * 2;

  if (t >= 1) {
    // Splash effect (simple ripple)
    _createSplash(_bobber.position);

    // Transition to waiting
    _fishingState = 'waiting';
    _waitTimer = Math.random() * 5 + 5; // 5-10 seconds
    _bobber.position.y = targetY;
  }
}

// ── Waiting Phase ─────────────────────────────────────────────────────

function _updateWaiting(delta) {
  _waitTimer -= delta;

  // Bobber floating animation
  if (_bobber) {
    const time = Date.now() * 0.001;
    _bobber.position.y = _currentSpot.y - 0.5 + Math.sin(time * 2) * 0.1;
  }

  if (_waitTimer <= 0) {
    // Fish bites!
    _fishingState = 'biting';
    _biteWindow = 3.0; // 3 second window
    _startBiteEffects();
  }
}

// ── Biting Phase ──────────────────────────────────────────────────────

function _startBiteEffects() {
  if (!_bobber) return;

  // Bobber shakes
  _bobber.userData.shaking = true;
  _bobber.userData.shakeTime = 0;

  // Expanding ripples
  const pos = _bobber.position;
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      _createRipple(pos.clone());
    }, i * 300);
  }
}

function _updateBiting(delta) {
  _biteWindow -= delta;

  // Shake bobber
  if (_bobber && _bobber.userData.shaking) {
    _bobber.userData.shakeTime += delta * 10;
    _bobber.position.x = _currentSpot.x + Math.sin(_bobber.userData.shakeTime) * 0.2;
    _bobber.position.z = _currentSpot.z + Math.cos(_bobber.userData.shakeTime * 1.3) * 0.15;
  }

  // Line vibration
  if (_fishingLine) {
    const positions = _fishingLine.geometry.attributes.position;
    positions.array[3] += (Math.random() - 0.5) * 0.1; // End point x
    positions.array[5] += (Math.random() - 0.5) * 0.1; // End point z
    positions.needsUpdate = true;
  }

  if (_biteWindow <= 0) {
    // Missed the bite!
    _fishEscaped();
  }
}

export function pullRod(scene) {
  if (_fishingState !== 'biting') return;

  // Successfully caught the bite window - show meter
  _fishingState = 'meter';

  const rod = getCurrentRod();
  showFishingMeter(rod.meterSpeed, rod.centerZone, (success, accuracy) => {
    if (success) {
      _catchFish(scene, accuracy);
    } else {
      _fishEscaped();
    }
  });
}

// ── Catch Success ─────────────────────────────────────────────────────

function _catchFish(scene, accuracy) {
  const rod = getCurrentRod();
  const bait = getBaitById(getCurrentBait());

  // Select fish based on rod, bait, accuracy
  const fish = selectFish(rod.tier, bait.effect, accuracy);

  // Consume bait
  consumeCurrentBait();

  // Tell server
  getSocket().emit('consumeBait', { baitId: getCurrentBait() });
  getSocket().emit('catchFish', { fishId: fish.id });

  // Add to local inventory
  addCaughtFish(fish.id);

  // Award EXP
  const expAmounts = { common: 2, uncommon: 4, rare: 8, epic: 15, legendary: 30 };
  const exp = expAmounts[fish.rarity] || 2;
  if (window.awardStepEXP) {
    window.awardStepEXP(exp);
  }

  // Clean up visuals
  _cleanupFishing(scene);

  // Show catch screen
  showCatchScreen(fish, () => {
    endFishing();
  });

  console.log(`[fishingLoop] Caught ${fish.nameHe} (${fish.rarity}) - accuracy: ${(accuracy * 100).toFixed(1)}%`);
}

// ── Fish Escaped ──────────────────────────────────────────────────────

function _fishEscaped() {
  // Consume bait even on failure
  consumeCurrentBait();
  getSocket().emit('consumeBait', { baitId: getCurrentBait() });

  // Clean up
  _cleanupFishing();

  // Show escape message
  showEscapeScreen(() => {
    endFishing();
  });

  console.log('[fishingLoop] Fish escaped!');
}

// ── Cleanup ───────────────────────────────────────────────────────────

function _cleanupFishing(scene) {
  if (_fishingLine && scene) {
    scene.remove(_fishingLine);
    _fishingLine.geometry.dispose();
    _fishingLine.material.dispose();
    _fishingLine = null;
  }

  if (_bobber && scene) {
    scene.remove(_bobber);
    _bobber.geometry.dispose();
    _bobber.material.dispose();
    _bobber = null;
  }

  _fishingState = 'idle';
  _currentSpot = null;
  _waitTimer = 0;
  _biteWindow = 0;

  hideFishingMeter();
}

// ── Visual Effects (reused pool) ──────────────────────────────────────

function _createSplash(position) {
  // Simple particle splash (pooled)
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
