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
    if (isChatOpen()) return;
    if (e.code === 'KeyE' && _activeTarget?.callback) {
      e.preventDefault();
      _activeTarget.callback();
    }
    if (e.code === 'KeyG' && _activeTarget?.talkCallback) {
      e.preventDefault();
      _activeTarget.talkCallback();
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
    <div id="ib-row-e" class="ib-inner" style="display:none">
      <span class="ib-key">E</span>
      <span class="ib-label">Interact</span>
    </div>
    <div id="ib-row-g" class="ib-inner" style="display:none; margin-top:4px">
      <span class="ib-key">G</span>
      <span class="ib-label">Talk</span>
    </div>
    <div class="ib-tail"></div>
  `;
  _labelEl = _btnEl.querySelector('#ib-row-e .ib-label');
  _btnEl.addEventListener('click', () => {
    if (_activeTarget?.talkCallback) _activeTarget.talkCallback();
    else _activeTarget?.callback?.();
  });
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
export function registerInteraction(worldPos, label, range = 4.5, callback, talkCallback = null) {
  const pos = worldPos instanceof THREE.Vector3
    ? worldPos.clone()
    : new THREE.Vector3(...worldPos);
  _targets.push({ worldPos: pos, label, range, callback, talkCallback });
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

  const rowE = document.getElementById('ib-row-e');
  const rowG = document.getElementById('ib-row-g');
  if (rowE) rowE.style.display = best.callback    ? 'flex' : 'none';
  if (rowG) rowG.style.display = best.talkCallback ? 'flex' : 'none';

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

export function setActiveInteractionLabel(label) {
  if (!_activeTarget) return;
  _activeTarget.label = label;
  if (_labelEl) _labelEl.textContent = label;
}

// ── NPC Dialogue Modal ────────────────────────────────────────────────

export function showNpcDialog(paragraphs, title = 'Welcome to Suy-World') {
  if (document.getElementById('npc-dialog')) return;

  const style = document.createElement('style');
  style.id = 'npc-dialog-style';
  style.textContent = `
    #npc-dialog {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      z-index: 900;
      background: rgba(0,0,0,0.60);
      backdrop-filter: blur(4px);
      animation: npc-fade-in 0.25s ease;
    }
    @keyframes npc-fade-in { from { opacity:0 } to { opacity:1 } }
    #npc-dialog-box {
      background: rgba(10,12,26,0.97);
      border: 1.5px solid rgba(255,200,60,0.35);
      border-radius: 18px;
      box-shadow: 0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,200,60,0.08) inset;
      padding: 36px 40px 30px;
      max-width: 580px; width: 90%;
      max-height: 82vh;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,200,60,0.3) transparent;
      position: relative;
    }
    #npc-dialog-title {
      font-size: 20px; font-weight: 700;
      color: #FFB300;
      font-family: 'Segoe UI', Arial, sans-serif;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
      text-align: center;
    }
    #npc-dialog-body p {
      font-size: 14px; line-height: 1.75;
      color: rgba(255,255,255,0.88);
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0 0 12px;
    }
    #npc-dialog-body p:last-child { margin-bottom: 0; }
    #npc-dialog-close {
      display: block; margin: 24px auto 0;
      background: rgba(255,179,0,0.15);
      border: 1.5px solid rgba(255,179,0,0.45);
      border-radius: 30px;
      padding: 8px 32px;
      font-size: 13px; font-weight: 600;
      color: #FFB300;
      font-family: 'Segoe UI', Arial, sans-serif;
      cursor: pointer;
      transition: background 0.15s;
    }
    #npc-dialog-close:hover { background: rgba(255,179,0,0.28); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'npc-dialog';

  const lines = paragraphs
    .map(p => `<p>${p}</p>`)
    .join('');

  overlay.innerHTML = `
    <div id="npc-dialog-box">
      <div id="npc-dialog-title">${title}</div>
      <div id="npc-dialog-body">${lines}</div>
      <button id="npc-dialog-close">Close  [Esc]</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const box = overlay.querySelector('#npc-dialog-box');

  box.addEventListener('wheel', e => {
    e.stopPropagation();
    box.scrollTop += e.deltaY;
  }, { passive: true });

  const close = () => {
    overlay.remove();
    document.getElementById('npc-dialog-style')?.remove();
    window.removeEventListener('keydown', onKey);
  };
  const onKey = e => { if (e.code === 'Escape' || e.code === 'KeyE') close(); };
  overlay.querySelector('#npc-dialog-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  window.addEventListener('keydown', onKey);
}
