import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/sharedLoaders.js';
import { toggleSettingsPanel }  from './settingsPanel.js';

let countEl, slotEl, coinEl;

export function initHud() {
  // Initialize player coins from localStorage
  window.playerCoins = parseInt(localStorage.getItem('player_coins') || '500');

  _injectStyles();

  // Online count removed - now shown in minimap

  // ── Top-left: coin balance + action buttons ───────────────────────────
  const topLeft = el('div', { id: 'hud-topleft' });

  // Coin balance (top)
  coinEl = el('div', { id: 'hud-coin' });
  coinEl.innerHTML = '<span class="hud-coin-icon">🪙</span><span class="hud-coin-val">–</span>';
  topLeft.appendChild(coinEl);
  _init3DCoin(coinEl.querySelector('.hud-coin-icon'));

  // Action buttons row (below coins) - only emoji button
  const buttonsRow = el('div', { class: 'hud-action-buttons' });

  // Emoji button
  const emojiBtn = el('button', { id: 'hud-emoji' });
  emojiBtn.title = 'Emotions';
  emojiBtn.innerHTML = '😊';
  emojiBtn.addEventListener('click', toggleEmojiPicker);
  buttonsRow.appendChild(emojiBtn);

  topLeft.appendChild(buttonsRow);
  document.body.appendChild(topLeft);

  // Settings button will be added to minimap corner by minimap.js
  window._createSettingsButton = () => {
    const gearBtn = el('button', { id: 'hud-gear' });
    gearBtn.title = 'Settings';
    gearBtn.innerHTML = '⚙';
    gearBtn.addEventListener('click', toggleSettingsPanel);
    return gearBtn;
  };

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
    /* ═══ TOP LEFT CORNER: Coins + Action Buttons ═══ */
    #hud-topleft {
      position: fixed; top: 20px; left: 20px;
      display: flex; flex-direction: column; gap: 12px;
      z-index: 100;
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

    /* Action buttons row */
    .hud-action-buttons {
      display: flex; gap: 10px;
    }
    #hud-emoji, #hud-gear, #inventory-btn {
      background: rgba(15,15,30,0.85);
      border: 2px solid rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 50%;
      width: 56px;
      height: 56px;
      font-size: 26px;
      cursor: pointer;
      pointer-events: all;
      transition: all 0.2s ease;
      font-family: system-ui;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    #hud-emoji:hover, #hud-gear:hover, #inventory-btn:hover {
      background: rgba(40,40,60,0.95);
      border-color: rgba(255,255,255,0.4);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.5);
    }

    /* Settings button in minimap corner - styled by minimap.js */
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
    /* ═══ TOP CENTER: Level Display ═══ */
    .level-display-container {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      z-index: 100;
      pointer-events: none;
      user-select: none;
    }
    .level-badge {
      width: 34px;
      height: 34px;
      background: rgba(20, 20, 20, 0.75);
      border: 2px solid #e6b13d;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .level-number {
      font: 700 16px 'Segoe UI', Arial, sans-serif;
      color: #fff;
      line-height: 1;
    }
    .exp-bar-container {
      flex-shrink: 0;
    }
    .exp-bar-background {
      width: 130px;
      height: 16px;
      background: rgba(20, 20, 20, 0.6);
      border-radius: 8px;
      overflow: hidden;
      position: relative;
    }
    .exp-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: #4caf50;
      border-radius: 8px;
      transition: width 0.3s ease;
    }
    .exp-bar-text {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font: 700 11px 'Segoe UI', Arial, sans-serif;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      z-index: 1;
    }
    @media (max-width: 380px) {
      .exp-bar-background {
        width: 100px;
      }
    }
    /* Level Up Notification */
    .level-up-notification {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(255,215,0,0.95), rgba(255,165,0,0.95));
      border: 3px solid #FFD700;
      border-radius: 20px;
      padding: 30px 50px;
      z-index: 10000;
      animation: levelUpPop 0.5s ease;
      box-shadow: 0 10px 40px rgba(255,215,0,0.6);
    }
    @keyframes levelUpPop {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.1); }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    .level-up-notification.fade-out {
      animation: fadeOut 0.5s ease forwards;
    }
    @keyframes fadeOut {
      to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
    .level-up-content {
      text-align: center;
    }
    .level-up-icon {
      font-size: 60px;
      animation: spin 1s ease-in-out;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .level-up-text {
      font: 700 32px 'Segoe UI', Arial, sans-serif;
      color: #fff;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      margin: 10px 0;
    }
    .level-up-level {
      font: 600 24px 'Segoe UI', Arial, sans-serif;
      color: #FFF8DC;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
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
