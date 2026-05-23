// sendChat is injected by main.js to avoid circular imports
let _sendChat = (_msg) => {};
export function bindSendChat(fn) { _sendChat = fn; }

const MAX_MESSAGES   = 60;
const BUBBLE_DURATION = 5000; // ms

let chatBox, inputEl, listEl;
const speechBubbles = {};   // remotePlayerId → { el, timer }
const localBubbles  = {};   // localBubble reference

// ── Init ──────────────────────────────────────────────────────────────

export function initChatUI() {
  chatBox = el('div', {
    position: 'fixed', bottom: '60px', left: '16px',
    width: '320px', maxHeight: '180px',
    display: 'flex', flexDirection: 'column', gap: '0px',
    pointerEvents: 'none', userSelect: 'none',
  });

  listEl = el('div', {
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
    gap: '3px', maxHeight: '160px',
    scrollbarWidth: 'none',
  });
  chatBox.appendChild(listEl);
  document.body.appendChild(chatBox);

  inputEl = el('input', {
    position: 'fixed', bottom: '16px', left: '16px',
    width: '290px', padding: '8px 14px',
    background: 'rgba(0,0,0,0.6)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px',
    fontSize: '14px', fontFamily: 'Segoe UI, Arial, sans-serif',
    outline: 'none', display: 'none',
    pointerEvents: 'all',
  });
  inputEl.placeholder = 'Say something…';
  document.body.appendChild(inputEl);

  // T to open chat, Enter to send, Escape to close
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
  const row = el('div', {
    fontSize: '13px', fontFamily: 'Segoe UI, Arial, sans-serif',
    color: '#fff', padding: '3px 0',
    pointerEvents: 'none',
  });
  row.innerHTML = `<span style="opacity:0.7;margin-right:4px">${escHtml(name)}:</span>${escHtml(message)}`;

  listEl.appendChild(row);
  while (listEl.children.length > MAX_MESSAGES) listEl.removeChild(listEl.firstChild);
  listEl.scrollTop = listEl.scrollHeight;
}

// ── Speech bubbles (3D-like overlay — positioned via 2D CSS) ──────────
// Note: true world-space bubbles require projecting 3D coords each frame.
// For Phase 1 we display them in the chat list only; full 3D bubbles are Phase 2.

export function addSpeechBubble(playerId, message) {
  // Phase 1 stub — speech bubble data stored for Phase 2 world-space rendering
  // For now just echo in the chat list (already done by addChatMessage)
  void playerId;
  void message;
}

// ── Internal ──────────────────────────────────────────────────────────

function openChat() {
  inputEl.style.display = 'block';
  inputEl.focus();
  chatBox.style.pointerEvents = 'all';
}

function closeChat() {
  inputEl.style.display = 'none';
  inputEl.value = '';
  chatBox.style.pointerEvents = 'none';
  inputEl.blur();
}

function submitChat() {
  const msg = inputEl.value.trim();
  if (msg) _sendChat(msg);
  closeChat();
}

function el(tag, styles) {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  return e;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
