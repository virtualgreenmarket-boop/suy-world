import * as THREE from 'three';

// sendChat injected by main.js to avoid circular imports
let _sendChat = (_msg) => {};
export function bindSendChat(fn) { _sendChat = fn; }

const MAX_MESSAGES    = 60;
const BUBBLE_DURATION = 5000;
const HEAD_Y_OFFSET   = 2.1;   // world-units above player origin to anchor bubbles

let chatBox, inputEl, listEl;
let localBubbleEl, typingEl;
let localHideAt = 0;
let _isTyping   = false;

// Remote player speech bubbles: id → { el, hideAt }
const remoteBubbles = new Map();

// Shared THREE.Vector3 for projection (avoids per-frame allocation)
const _v = new THREE.Vector3();

// ── Styles ────────────────────────────────────────────────────────────

const css = document.createElement('style');
css.textContent = `
  .sp-bubble {
    position: fixed;
    background: rgba(255,255,255,0.96);
    border-radius: 14px;
    padding: 6px 12px;
    font-size: 13px;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #222;
    transform: translate(-50%, calc(-100% - 14px));
    pointer-events: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.22);
    max-width: 200px;
    word-wrap: break-word;
    white-space: pre-wrap;
    display: none;
    z-index: 200;
  }
  .sp-bubble::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border: 8px solid transparent;
    border-top-color: rgba(255,255,255,0.96);
    border-bottom: 0;
  }
  .typing-bubble {
    position: fixed;
    background: rgba(255,255,255,0.96);
    border-radius: 14px;
    padding: 9px 14px;
    display: none;
    flex-direction: row;
    gap: 5px;
    align-items: center;
    transform: translate(-50%, calc(-100% - 14px));
    pointer-events: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.22);
    z-index: 200;
  }
  .typing-bubble::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border: 8px solid transparent;
    border-top-color: rgba(255,255,255,0.96);
    border-bottom: 0;
  }
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
    40%            { transform: translateY(-5px); opacity: 1.0; }
  }
  .t-dot {
    width: 7px; height: 7px;
    background: #777;
    border-radius: 50%;
    animation: dot-bounce 1.2s infinite;
  }
  .t-dot:nth-child(1) { animation-delay: 0.00s; }
  .t-dot:nth-child(2) { animation-delay: 0.15s; }
  .t-dot:nth-child(3) { animation-delay: 0.30s; }
`;
document.head.appendChild(css);

// ── Init ──────────────────────────────────────────────────────────────

export function initChatUI() {
  // Chat list box
  chatBox = mkEl('div', {
    position: 'fixed', bottom: '60px', left: '16px',
    width: '320px', maxHeight: '180px',
    display: 'flex', flexDirection: 'column', gap: '0px',
    pointerEvents: 'none', userSelect: 'none',
  });

  listEl = mkEl('div', {
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
    gap: '3px', maxHeight: '160px', scrollbarWidth: 'none',
  });
  chatBox.appendChild(listEl);
  document.body.appendChild(chatBox);

  // Chat input
  inputEl = mkEl('input', {
    position: 'fixed', bottom: '16px', left: '16px',
    width: '290px', padding: '8px 14px',
    background: 'rgba(0,0,0,0.6)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px',
    fontSize: '14px', fontFamily: 'Segoe UI, Arial, sans-serif',
    outline: 'none', display: 'none', pointerEvents: 'all',
  });
  inputEl.placeholder = 'Say something…';
  document.body.appendChild(inputEl);

  // Local speech bubble
  localBubbleEl = document.createElement('div');
  localBubbleEl.className = 'sp-bubble';
  document.body.appendChild(localBubbleEl);

  // Typing indicator
  typingEl = document.createElement('div');
  typingEl.className = 'typing-bubble';
  typingEl.innerHTML = '<div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div>';
  document.body.appendChild(typingEl);

  // Keyboard handlers
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyT' && inputEl.style.display === 'none') {
      e.preventDefault();
      openChat();
    } else if (e.code === 'Enter' && inputEl.style.display !== 'none') {
      submitChat();
    } else if (e.code === 'Escape' && inputEl.style.display !== 'none') {
      closeChat();
    }
  });
}

// ── Chat messages ─────────────────────────────────────────────────────

export function addChatMessage({ name, message }) {
  const row = mkEl('div', {
    fontSize: '13px', fontFamily: 'Segoe UI, Arial, sans-serif',
    color: '#fff', padding: '3px 0', pointerEvents: 'none',
  });
  row.innerHTML = `<span style="opacity:0.7;margin-right:4px">${esc(name)}:</span>${esc(message)}`;
  listEl.appendChild(row);
  while (listEl.children.length > MAX_MESSAGES) listEl.removeChild(listEl.firstChild);
  listEl.scrollTop = listEl.scrollHeight;
}

// ── Speech bubbles ────────────────────────────────────────────────────

export function addSpeechBubble(playerId, message) {
  let entry = remoteBubbles.get(playerId);
  if (!entry) {
    const el = document.createElement('div');
    el.className = 'sp-bubble';
    document.body.appendChild(el);
    entry = { el };
    remoteBubbles.set(playerId, entry);
  }
  entry.el.textContent = message;
  entry.el.style.display = 'block';
  entry.hideAt = Date.now() + BUBBLE_DURATION;
}

function showLocalSpeechBubble(message) {
  localBubbleEl.textContent = message;
  localBubbleEl.style.display = 'block';
  localHideAt = Date.now() + BUBBLE_DURATION;
}

/**
 * Called every frame from main.js.
 * @param {THREE.Camera} camera
 * @param {THREE.Vector3|null} localPos  — local player world position
 * @param {function(id):THREE.Vector3|null} getRemotePos — from remotePlayer.js
 */
export function updateBubbles(camera, localPos, getRemotePos) {
  const now = Date.now();

  if (localPos) {
    const x = localPos.x, y = localPos.y + HEAD_Y_OFFSET, z = localPos.z;

    if (_isTyping) {
      typingEl.style.display      = 'flex';
      localBubbleEl.style.display = 'none';
      projectBubble(typingEl, x, y, z, camera);
    } else {
      typingEl.style.display = 'none';
      if (now < localHideAt) {
        localBubbleEl.style.display = 'block';
        projectBubble(localBubbleEl, x, y, z, camera);
      } else {
        localBubbleEl.style.display = 'none';
      }
    }
  }

  remoteBubbles.forEach((entry, id) => {
    const rPos = getRemotePos ? getRemotePos(id) : null;
    if (!rPos || now >= entry.hideAt) {
      entry.el.style.display = 'none';
    } else {
      entry.el.style.display = 'block';
      projectBubble(entry.el, rPos.x, rPos.y + HEAD_Y_OFFSET, rPos.z, camera);
    }
  });
}

function projectBubble(el, x, y, z, camera) {
  _v.set(x, y, z).project(camera);
  if (_v.z > 1) { el.style.display = 'none'; return; }
  el.style.left = ((_v.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
  el.style.top  = ((_v.y * -0.5 + 0.5) * window.innerHeight) + 'px';
}

// ── Internal ──────────────────────────────────────────────────────────

function openChat() {
  _isTyping = true;
  inputEl.style.display = 'block';
  inputEl.focus();
  chatBox.style.pointerEvents = 'all';
}

function closeChat() {
  _isTyping = false;
  inputEl.style.display = 'none';
  inputEl.value = '';
  chatBox.style.pointerEvents = 'none';
  inputEl.blur();
}

function submitChat() {
  const msg = inputEl.value.trim();
  if (msg) {
    _sendChat(msg);
    showLocalSpeechBubble(msg);
  }
  closeChat();
}

function mkEl(tag, styles) {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  return e;
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
