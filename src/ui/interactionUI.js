import * as THREE from 'three';
import { isChatOpen } from './chatUI.js';

// Floating interaction button — appears in world space when the local player
// walks within range of an NPC, bench, or other interactable.

const _targets = [];
let _activeTarget = null;
let _btnEl        = null;
let _labelEl      = null;

const _v = new THREE.Vector3();

// ── Init ──────────────────────────────────────────────────────────────

export function initInteractionUI() {
  _buildDom();
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && _activeTarget && !isChatOpen()) {
      e.preventDefault();
      _activeTarget.callback?.();
    }
  });
}

function _buildDom() {
  const style = document.createElement('style');
  style.textContent = `
    #ib-wrap {
      position: fixed;
      display: none;
      transform: translate(-50%, calc(-100% - 8px));
      pointer-events: all;
      z-index: 190;
      cursor: pointer;
    }
    #ib-wrap:hover .ib-inner { border-color: rgba(255,255,255,0.65); }
    .ib-inner {
      background: rgba(12,12,22,0.90);
      border: 1.5px solid rgba(255,255,255,0.28);
      border-radius: 24px;
      padding: 7px 16px 7px 12px;
      display: flex; align-items: center; gap: 9px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 22px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.04) inset;
      transition: border-color 0.15s;
      white-space: nowrap;
    }
    .ib-key {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.38);
      border-radius: 6px;
      padding: 1px 7px;
      font-size: 11px; font-weight: 700;
      color: rgba(255,255,255,0.90);
      font-family: 'Segoe UI', system-ui, monospace;
      letter-spacing: 0.5px;
      line-height: 18px;
    }
    .ib-label {
      font-size: 13px; font-weight: 600;
      color: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      letter-spacing: 0.2px;
    }
    #ib-wrap .ib-tail {
      width: 0; height: 0;
      margin: 0 auto;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid rgba(12,12,22,0.90);
    }
  `;
  document.head.appendChild(style);

  _btnEl = document.createElement('div');
  _btnEl.id = 'ib-wrap';
  _btnEl.innerHTML = `
    <div class="ib-inner">
      <span class="ib-key">E</span>
      <span class="ib-label">Interact</span>
    </div>
    <div class="ib-tail"></div>
  `;
  _labelEl = _btnEl.querySelector('.ib-label');
  _btnEl.addEventListener('click', () => { _activeTarget?.callback?.(); });
  document.body.appendChild(_btnEl);
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Register a world-space interaction target.
 *   worldPos  — THREE.Vector3 or [x,y,z] array
 *   label     — button text, e.g. "Talk", "Shop", "Sit"
 *   range     — activation radius in metres (default 4.5)
 *   callback  — called when player presses E or taps the button
 */
export function registerInteraction(worldPos, label, range = 4.5, callback) {
  const pos = worldPos instanceof THREE.Vector3
    ? worldPos.clone()
    : new THREE.Vector3(...worldPos);
  _targets.push({ worldPos: pos, label, range, callback });
}

/**
 * Call every frame from main.js after the local player position is known.
 */
export function updateInteractions(camera, playerPos) {
  if (!playerPos || !_btnEl) { _hide(); return; }

  let best = null, bestDist = Infinity;
  for (const t of _targets) {
    const d = playerPos.distanceTo(t.worldPos);
    if (d < t.range && d < bestDist) {
      best = t;
      bestDist = d;
    }
  }

  if (!best) { _activeTarget = null; _hide(); return; }

  _activeTarget = best;
  _labelEl.textContent = best.label;

  // Project the interaction anchor (slightly above the target) to screen space
  _v.copy(best.worldPos).y += best.anchorY ?? 2.5;
  _v.project(camera);

  if (_v.z > 1) { _hide(); return; } // behind camera

  const sx = (_v.x *  0.5 + 0.5) * window.innerWidth;
  const sy = (_v.y * -0.5 + 0.5) * window.innerHeight;
  _btnEl.style.left    = sx + 'px';
  _btnEl.style.top     = sy + 'px';
  _btnEl.style.display = 'block';
}

function _hide() {
  if (_btnEl) _btnEl.style.display = 'none';
}
