import * as THREE from 'three';
import { setInputEnabled } from './touchControls.js';
import { getSocket } from '../systems/multiplayer.js';

// sendChat injected by main.js to avoid circular imports
let _sendChat = (_msg) => {};
export function bindSendChat(fn) { _sendChat = fn; }

export function isChatOpen() { return _isExpanded; }

const MAX_MESSAGES = 100;
const VISIBLE_MESSAGES = 5;
const BUBBLE_DURATION = 5000;
const HEAD_Y_OFFSET = 2.1;

let chatContainer, collapsedBar, expandedPanel, messagesList, inputEl;
let localBubbleEl, typingEl;
let localHideAt = 0;
let _isTyping = false;
let _isExpanded = false;
let _messages = [];
let _lastHourlyMessage = -1;

// Remote player speech bubbles: id → { el, hideAt }
const remoteBubbles = new Map();

// Shared THREE.Vector3 for projection
const _v = new THREE.Vector3();

// ── Styles ────────────────────────────────────────────────────────────

const css = document.createElement('style');
css.textContent = `
  .chat-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    font-family: 'Segoe UI', Arial, sans-serif;
    direction: rtl;
  }

  .chat-collapsed {
    height: 40px;
    background: rgba(0, 0, 0, 0.7);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0 16px;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: background 0.2s;
  }

  .chat-collapsed:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .chat-collapsed-text {
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .chat-expanded {
    display: none;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.85);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    max-height: 400px;
  }

  .chat-expanded.visible {
    display: flex;
  }

  .chat-header {
    padding: 8px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chat-header-title {
    color: #fff;
    font-size: 14px;
    font-weight: 600;
  }

  .chat-close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 20px;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .chat-close-btn:hover {
    color: #fff;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 200px;
    max-height: 280px;
  }

  .chat-messages::-webkit-scrollbar {
    width: 6px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .chat-messages::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .chat-message {
    font-size: 14px;
    color: #fff;
    line-height: 1.4;
  }

  .chat-message.system {
    color: #4d9fff;
    font-style: italic;
  }

  .chat-message.hourly {
    color: #ffa500;
    text-align: center;
  }

  .chat-message.join {
    color: #50fa7b;
  }

  .chat-username {
    font-weight: 600;
    margin-left: 4px;
  }

  .chat-input-wrapper {
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .chat-input {
    width: 100%;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    color: #fff;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    direction: rtl;
  }

  .chat-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .chat-input:focus {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.15);
  }

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
    direction: rtl;
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
  // Main container
  chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';
  document.body.appendChild(chatContainer);

  // Collapsed bar
  collapsedBar = document.createElement('div');
  collapsedBar.className = 'chat-collapsed';
  collapsedBar.innerHTML = '<div class="chat-collapsed-text">לחץ להרחבת הצ\'אט...</div>';
  collapsedBar.addEventListener('click', expandChat);
  chatContainer.appendChild(collapsedBar);

  // Expanded panel
  expandedPanel = document.createElement('div');
  expandedPanel.className = 'chat-expanded';
  chatContainer.appendChild(expandedPanel);

  // Header
  const header = document.createElement('div');
  header.className = 'chat-header';
  header.innerHTML = `
    <div class="chat-header-title">צ'אט</div>
    <button class="chat-close-btn">×</button>
  `;
  header.querySelector('.chat-close-btn').addEventListener('click', collapseChat);
  expandedPanel.appendChild(header);

  // Messages list
  messagesList = document.createElement('div');
  messagesList.className = 'chat-messages';
  expandedPanel.appendChild(messagesList);

  // Input wrapper
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'chat-input-wrapper';
  expandedPanel.appendChild(inputWrapper);

  // Input field
  inputEl = document.createElement('input');
  inputEl.className = 'chat-input';
  inputEl.placeholder = 'הקלד הודעה...';
  inputEl.addEventListener('keydown', e => {
    if (e.code === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (inputEl.value.trim() === '') {
        collapseChat();
      } else {
        submitChat();
      }
    } else if (e.code === 'Escape') {
      e.preventDefault();
      collapseChat();
    }
  });
  inputWrapper.appendChild(inputEl);

  // Local speech bubble
  localBubbleEl = document.createElement('div');
  localBubbleEl.className = 'sp-bubble';
  document.body.appendChild(localBubbleEl);

  // Typing indicator
  typingEl = document.createElement('div');
  typingEl.className = 'typing-bubble';
  typingEl.innerHTML = '<div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div>';
  document.body.appendChild(typingEl);

  // Keyboard handler — Enter toggles chat open/closed (when input is not focused)
  window.addEventListener('keydown', e => {
    if (e.code === 'Enter' && document.activeElement !== inputEl) {
      e.preventDefault();
      _isExpanded ? collapseChat() : expandChat();
    }
  });

  // Add welcome message
  addSystemMessage('ברוך הבאה למרחב הוירטואלי של שוק ירוק 🌿');

  // Start hourly time messages
  setInterval(checkHourlyMessage, 60000); // Check every minute
}

// ── Expand/Collapse ───────────────────────────────────────────────────

function expandChat() {
  _isExpanded = true;
  collapsedBar.style.display = 'none';
  expandedPanel.classList.add('visible');
  inputEl.focus();
  setInputEnabled(false);
  scrollToBottom();
}

function collapseChat() {
  _isExpanded = false;
  expandedPanel.classList.remove('visible');
  collapsedBar.style.display = 'flex';
  inputEl.blur();
  setInputEnabled(true);
}

// ── Messages ──────────────────────────────────────────────────────────

function addSystemMessage(text) {
  const msg = {
    type: 'system',
    text,
    timestamp: Date.now()
  };
  _messages.push(msg);

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message system';
  msgEl.textContent = text;
  messagesList.appendChild(msgEl);

  updateCollapsedPreview(text);
  trimMessages();
  scrollToBottom();
}

function addJoinMessage(username) {
  const text = `👋 ${username} נכנס למשחק`;
  const msg = {
    type: 'join',
    text,
    timestamp: Date.now()
  };
  _messages.push(msg);

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message join';
  msgEl.textContent = text;
  messagesList.appendChild(msgEl);

  updateCollapsedPreview(text);
  trimMessages();
  scrollToBottom();
}

function addHourlyMessage() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const text = `🕐 השעה ${hours}:00`;

  const msg = {
    type: 'hourly',
    text,
    timestamp: Date.now()
  };
  _messages.push(msg);

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message hourly';
  msgEl.textContent = text;
  messagesList.appendChild(msgEl);

  updateCollapsedPreview(text);
  trimMessages();
  scrollToBottom();
}

export function addChatMessage({ name, message }) {
  const text = `${name}: ${message}`;
  const msg = {
    type: 'user',
    name,
    message,
    timestamp: Date.now()
  };
  _messages.push(msg);

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.innerHTML = `<span class="chat-username">${esc(name)}:</span> ${esc(message)}`;
  messagesList.appendChild(msgEl);

  updateCollapsedPreview(text);
  trimMessages();
  scrollToBottom();
}

export function addPlayerJoinedMessage(username) {
  addJoinMessage(username);
}

function updateCollapsedPreview(text) {
  const previewEl = collapsedBar.querySelector('.chat-collapsed-text');
  if (previewEl) {
    previewEl.textContent = text;
  }
}

function trimMessages() {
  while (_messages.length > MAX_MESSAGES) {
    _messages.shift();
    if (messagesList.firstChild) {
      messagesList.removeChild(messagesList.firstChild);
    }
  }
}

function scrollToBottom() {
  if (messagesList) {
    messagesList.scrollTop = messagesList.scrollHeight;
  }
}

function checkHourlyMessage() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Send message only at exactly HH:00 (first minute of each hour)
  if (currentMinute === 0 && currentHour !== _lastHourlyMessage) {
    _lastHourlyMessage = currentHour;
    addHourlyMessage();
  }
}

// ── Input handling ────────────────────────────────────────────────────

function submitChat() {
  const msg = inputEl.value.trim();
  if (!msg) return;

  // Cheat code: "תביא כסף" gives 50 coins
  if (msg === 'תביא כסף') {
    console.log('[chat] 💰 Cheat code activated: +50 coins');

    // Send cheat event to server
    const socket = getSocket();
    if (socket) {
      socket.emit('cheatCoins', { amount: 50 });
    } else {
      console.warn('[chat] Socket not available for cheat code');
    }

    // Show local feedback
    addSystemMessage('💰 קיבלת 50 מטבעות! 🎉');
    inputEl.value = '';
    collapseChat();
    return;
  }

  _sendChat(msg);
  showLocalSpeechBubble(msg);
  inputEl.value = '';
  collapseChat();
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

export function showTypingBubble(playerId) {
  // Not implemented in current version
}

export function hideTypingBubble(playerId) {
  // Not implemented in current version
}

// ── Bubble position updates ──────────────────────────────────────────

export function updateBubbles(camera, localPos, getRemotePlayerPosition) {
  const now = Date.now();

  // Local bubble
  if (localHideAt > 0) {
    if (now >= localHideAt) {
      localBubbleEl.style.display = 'none';
      localHideAt = 0;
    } else {
      _v.set(localPos.x, localPos.y + HEAD_Y_OFFSET, localPos.z);
      _v.project(camera);
      const x = ((_v.x + 1) / 2) * window.innerWidth;
      const y = ((1 - _v.y) / 2) * window.innerHeight;
      localBubbleEl.style.left = `${x}px`;
      localBubbleEl.style.top = `${y}px`;
    }
  }

  // Remote bubbles
  for (const [id, entry] of remoteBubbles) {
    if (now >= entry.hideAt) {
      entry.el.style.display = 'none';
    } else {
      const pos = getRemotePlayerPosition(id);
      if (pos) {
        _v.set(pos.x, pos.y + HEAD_Y_OFFSET, pos.z);
        _v.project(camera);
        const x = ((_v.x + 1) / 2) * window.innerWidth;
        const y = ((1 - _v.y) / 2) * window.innerHeight;
        entry.el.style.left = `${x}px`;
        entry.el.style.top = `${y}px`;
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
