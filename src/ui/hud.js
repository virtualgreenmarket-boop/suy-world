import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/sharedLoaders.js';
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

  // Emoji picker (hidden by default) - 8 custom emoji expressions
  const emojiPicker = el('div', { id: 'hud-emoji-picker' });
  emojiPicker.style.display = 'none';
  const emotions = [
    { emoji: '😂', key: 'laugh_tears' },
    { emoji: '😉', key: 'wink' },
    { emoji: '😋', key: 'yummy' },
    { emoji: '🤫', key: 'shh' },
    { emoji: '[NO]', key: 'shake_no' },
    { emoji: '[YES]', key: 'nod_yes' },
    { emoji: '😠', key: 'angry' },
    { emoji: '😭', key: 'crying' }
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
  console.log('[hud] 😊 selectEmotion called:', emotionKey);

  const picker = document.getElementById('hud-emoji-picker');
  picker.style.opacity = '0';
  setTimeout(() => { picker.style.display = 'none'; }, 200);

  // Use new emoji system
  if (window.setPlayerEmoji) {
    console.log('[hud] ✅ Calling window.setPlayerEmoji');
    window.setPlayerEmoji(emotionKey);
    setTimeout(() => {
      if (window.clearPlayerEmotion) {
        window.clearPlayerEmotion();
      }
    }, 5000);
  } else {
    console.warn('[hud] ⚠️ window.setPlayerEmoji not available!');
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
      display: flex; gap: 12px; z-index: 100;
    }
    #hud-emoji, #hud-gear {
      background: rgba(0,0,0,0.50);
      border: 1.5px solid rgba(255,255,255,0.18);
      color: #fff; border-radius: 30px;
      padding: 9px 21px; font-size: 27px;
      cursor: pointer; pointer-events: all;
      transition: background 0.15s;
      font-family: system-ui;
    }
    #hud-emoji:hover, #hud-gear:hover {
      background: rgba(255,255,255,0.18);
    }
    #hud-emoji-picker {
      position: fixed;
      top: 90px;
      left: 16px;
      display: flex;
      gap: 10px;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(10px);
      border: 1.75px solid rgba(255,255,255,0.2);
      border-radius: 35px;
      padding: 14px 21px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 9999;
      flex-wrap: wrap;
      max-width: 875px;
    }
    .emoji-option {
      background: linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
      border: 3.5px solid rgba(255,255,255,0.2);
      border-radius: 25px;
      width: 98px;
      height: 98px;
      font-size: 49px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: all;
      box-shadow: 0 7px 21px rgba(0,0,0,0.3),
                  inset 0 1.75px 0 rgba(255,255,255,0.15);
      position: relative;
    }
    .emoji-option::before {
      content: '';
      position: absolute;
      top: -3.5px;
      left: -3.5px;
      right: -3.5px;
      bottom: -3.5px;
      background: linear-gradient(145deg, rgba(255,255,255,0.1), transparent);
      border-radius: 25px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .emoji-option:hover {
      background: linear-gradient(145deg, rgba(255,255,255,0.3), rgba(255,255,255,0.15));
      transform: translateY(-3.5px) scale(1.05);
      box-shadow: 0 10.5px 31.5px rgba(0,0,0,0.4),
                  inset 0 3.5px 0 rgba(255,255,255,0.25);
    }
    .emoji-option:hover::before {
      opacity: 1;
    }
    .emoji-option:active {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 3.5px 14px rgba(0,0,0,0.3),
                  inset 0 1.75px 3.5px rgba(0,0,0,0.2);
    }
    #hud-coin {
      background: rgba(10,8,22,0.88);
      border: 2.25px solid rgba(255,200,50,0.35);
      border-radius: 36px;
      padding: 12px 27px 12px 21px;
      display: flex; align-items: center; gap: 12px;
      backdrop-filter: blur(10px);
      box-shadow: 0 6px 27px rgba(0,0,0,0.45);
      pointer-events: none; user-select: none;
    }
    .hud-coin-icon { font-size: 30px; line-height: 1; }
    .hud-coin-val  {
      font: 700 24px 'Segoe UI', Arial, sans-serif;
      color: #FFD54F; letter-spacing: 0.75px;
      min-width: 42px; text-align: right;
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

  createGLTFLoader().load('/models/ui/coin.glb', gltf => {
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
    // Always sync to localStorage when coins are updated
    localStorage.setItem('player_coins', n.toString());
    console.log('[hud] updateCoinDisplay: coins =', n);
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
