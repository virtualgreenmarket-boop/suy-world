import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toggleSettingsPanel }  from './settingsPanel.js';

let countEl, slotEl, coinEl;

export function initHud() {
  // Initialize player coins from localStorage
  window.playerCoins = parseInt(localStorage.getItem('player_coins') || '500');

  _injectStyles();

  // ── Top-right: online count ───────────────────────────────────────────
  countEl = el('div', { id: 'hud-online' });
  countEl.textContent = '● 1 online';
  document.body.appendChild(countEl);

  // ── Top-left: coin balance + settings gear ────────────────────────────
  const topLeft = el('div', { id: 'hud-topleft' });

  // Coin balance
  coinEl = el('div', { id: 'hud-coin' });
  coinEl.innerHTML = '<span class="hud-coin-icon">🪙</span><span class="hud-coin-val">–</span>';
  topLeft.appendChild(coinEl);
  _init3DCoin(coinEl.querySelector('.hud-coin-icon'));

  // Emoji button
  const emojiBtn = el('button', { id: 'hud-emoji' });
  emojiBtn.title = 'Emotions';
  emojiBtn.innerHTML = '😊';
  emojiBtn.addEventListener('click', toggleEmojiPicker);
  topLeft.appendChild(emojiBtn);

  const gearBtn = el('button', { id: 'hud-gear' });
  gearBtn.title = 'Settings';
  gearBtn.innerHTML = '⚙';
  gearBtn.addEventListener('click', toggleSettingsPanel);
  topLeft.appendChild(gearBtn);

  document.body.appendChild(topLeft);

  // Emoji picker (hidden by default)
  const emojiPicker = el('div', { id: 'hud-emoji-picker' });
  emojiPicker.style.display = 'none';
  const emotions = [
    { emoji: '😐', key: 'neutral' },
    { emoji: '😊', key: 'happy' },
    { emoji: '😠', key: 'angry' },
    { emoji: '😍', key: 'love' },
    { emoji: '😢', key: 'sad' },
    { emoji: '😂', key: 'laugh' }
  ];
  emotions.forEach(({ emoji, key }) => {
    const btn = el('button', { class: 'emoji-option' });
    btn.textContent = emoji;
    btn.addEventListener('click', () => selectEmotion(key));
    emojiPicker.appendChild(btn);
  });
  document.body.appendChild(emojiPicker);

  // ── Centre: slot label ────────────────────────────────────────────────
  slotEl = el('div', { id: 'hud-slot' });
  slotEl.style.display = 'none';
  document.body.appendChild(slotEl);
}

function toggleEmojiPicker() {
  const picker = document.getElementById('hud-emoji-picker');
  if (picker.style.display === 'none') {
    picker.style.display = 'flex';
    picker.style.opacity = '0';
    setTimeout(() => { picker.style.opacity = '1'; }, 10);
  } else {
    picker.style.opacity = '0';
    setTimeout(() => { picker.style.display = 'none'; }, 200);
  }
}

function selectEmotion(emotionKey) {
  const picker = document.getElementById('hud-emoji-picker');
  picker.style.opacity = '0';
  setTimeout(() => { picker.style.display = 'none'; }, 200);

  if (window.setPlayerEmotion) {
    window.setPlayerEmotion(emotionKey);
    setTimeout(() => {
      if (window.clearPlayerEmotion) {
        window.clearPlayerEmotion();
      }
    }, 5000);
  }
}

function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #hud-online {
      position: fixed; top: 16px; right: 16px;
      background: rgba(0,0,0,0.50); color: #fff;
      padding: 6px 14px; border-radius: 20px;
      font: 700 13px 'Segoe UI', Arial, sans-serif;
      pointer-events: none; user-select: none; z-index: 100;
    }
    #hud-topleft {
      position: fixed; top: 16px; left: 16px;
      display: flex; gap: 8px; z-index: 100;
    }
    #hud-emoji, #hud-gear {
      background: rgba(0,0,0,0.50);
      border: 1px solid rgba(255,255,255,0.18);
      color: #fff; border-radius: 20px;
      padding: 6px 14px; font-size: 18px;
      cursor: pointer; pointer-events: all;
      transition: background 0.15s;
      font-family: system-ui;
    }
    #hud-emoji:hover, #hud-gear:hover {
      background: rgba(255,255,255,0.18);
    }
    #hud-emoji-picker {
      position: fixed;
      top: 60px;
      left: 16px;
      display: flex;
      gap: 6px;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 8px 12px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 100;
    }
    .emoji-option {
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      font-size: 24px;
      cursor: pointer;
      transition: all 0.15s;
      pointer-events: all;
    }
    .emoji-option:hover {
      background: rgba(255,255,255,0.25);
      transform: scale(1.1);
    }
    .emoji-option:active {
      transform: scale(0.95);
    }
    #hud-coin {
      background: rgba(10,8,22,0.88);
      border: 1.5px solid rgba(255,200,50,0.35);
      border-radius: 24px;
      padding: 8px 18px 8px 14px;
      display: flex; align-items: center; gap: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 18px rgba(0,0,0,0.45);
      pointer-events: none; user-select: none;
    }
    .hud-coin-icon { font-size: 20px; line-height: 1; }
    .hud-coin-val  {
      font: 700 16px 'Segoe UI', Arial, sans-serif;
      color: #FFD54F; letter-spacing: 0.5px;
      min-width: 28px; text-align: right;
    }
    #hud-slot {
      position: fixed; bottom: 28%; left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.65); color: #fff;
      padding: 8px 22px; border-radius: 8px;
      font: 500 15px 'Segoe UI', Arial, sans-serif;
      letter-spacing: 0.5px;
      pointer-events: none; user-select: none; z-index: 100;
    }
  `;
  document.head.appendChild(s);
}

function _init3DCoin(iconEl) {
  const W = 56, H = 56;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  cvs.style.cssText = 'width:28px;height:28px;display:block;border-radius:4px;';

  const rndr = new THREE.WebGLRenderer({ canvas: cvs, alpha: true, antialias: true });
  rndr.setSize(W, H, false);
  rndr.setClearColor(0, 0);
  rndr.toneMapping = THREE.ACESFilmicToneMapping;
  rndr.toneMappingExposure = 1.4;
  rndr.outputColorSpace = THREE.SRGBColorSpace;

  const coinScene = new THREE.Scene();
  const coinCam   = new THREE.PerspectiveCamera(44, 1, 0.1, 20);
  coinCam.position.set(0, 0.4, 3.8);
  coinCam.lookAt(0, 0, 0);

  coinScene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const sun = new THREE.DirectionalLight(0xFFD060, 3.5);
  sun.position.set(2, 3, 4);
  coinScene.add(sun);
  const fill = new THREE.DirectionalLight(0xC8E8FF, 0.8);
  fill.position.set(-2, 1, -2);
  coinScene.add(fill);

  new GLTFLoader().load('/models/ui/coin.glb', gltf => {
    const coin = gltf.scene;
    const box  = new THREE.Box3().setFromObject(coin);
    const ctr  = box.getCenter(new THREE.Vector3());
    const sz   = box.getSize(new THREE.Vector3());
    const sc   = 1.8 / Math.max(sz.x, sz.y, sz.z, 0.01);
    coin.scale.setScalar(sc);
    coin.position.copy(ctr.multiplyScalar(-sc));
    coinScene.add(coin);

    let t = 0;
    (function loop() {
      requestAnimationFrame(loop);
      t += 0.016;
      coin.rotation.y = t * 1.6;
      coin.rotation.x = Math.sin(t * 0.5) * 0.12;
      rndr.render(coinScene, coinCam);
    })();

    iconEl.innerHTML = '';
    iconEl.appendChild(cvs);
  }, undefined, () => { /* keep emoji fallback */ });
}

export function updateCoinDisplay(n) {
  // Update window.playerCoins if value provided
  if (n != null) {
    window.playerCoins = n;
  }

  const v = coinEl?.querySelector('.hud-coin-val');
  if (v) v.textContent = (window.playerCoins || 0).toLocaleString();
}

export function updateOnlineCount(total) {
  if (countEl) countEl.textContent = `● ${total ?? 1} online`;
}

export function showSlotLabel(text) {
  if (!slotEl) return;
  slotEl.textContent = text;
  slotEl.style.display = 'block';
}

export function hideSlotLabel() {
  if (slotEl) slotEl.style.display = 'none';
}

function el(tag, props = {}) {
  const e = document.createElement(tag);
  const { id, ...rest } = props;
  if (id) e.id = id;
  return e;
}
