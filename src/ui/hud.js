import { toggleInventoryPanel } from './inventoryPanel.js';
import { toggleSettingsPanel }  from './settingsPanel.js';

let countEl, slotEl, coinEl;

export function initHud() {
  _injectStyles();

  // ── Top-right: online count ───────────────────────────────────────────
  countEl = el('div', { id: 'hud-online' });
  countEl.textContent = '● 1 online';
  document.body.appendChild(countEl);

  // ── Top-left: inventory bag + settings gear ───────────────────────────
  const topLeft = el('div', { id: 'hud-topleft' });

  const bagBtn = el('button', { id: 'hud-bag' });
  bagBtn.title = 'Character / Inventory';
  bagBtn.innerHTML = '🎒';
  bagBtn.addEventListener('click', toggleInventoryPanel);
  topLeft.appendChild(bagBtn);

  const gearBtn = el('button', { id: 'hud-gear' });
  gearBtn.title = 'Settings';
  gearBtn.innerHTML = '⚙';
  gearBtn.addEventListener('click', toggleSettingsPanel);
  topLeft.appendChild(gearBtn);

  document.body.appendChild(topLeft);

  // ── Bottom-right: coin balance ────────────────────────────────────────
  coinEl = el('div', { id: 'hud-coin' });
  coinEl.innerHTML = '<span class="hud-coin-icon">🪙</span><span class="hud-coin-val">–</span>';
  document.body.appendChild(coinEl);

  // ── Centre: slot label ────────────────────────────────────────────────
  slotEl = el('div', { id: 'hud-slot' });
  slotEl.style.display = 'none';
  document.body.appendChild(slotEl);
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
    #hud-bag, #hud-gear {
      background: rgba(0,0,0,0.50);
      border: 1px solid rgba(255,255,255,0.18);
      color: #fff; border-radius: 20px;
      padding: 6px 14px; font-size: 18px;
      cursor: pointer; pointer-events: all;
      transition: background 0.15s;
      font-family: system-ui;
    }
    #hud-bag:hover, #hud-gear:hover {
      background: rgba(255,255,255,0.18);
    }
    #hud-coin {
      position: fixed; bottom: 20px; right: 18px;
      background: rgba(10,8,22,0.88);
      border: 1.5px solid rgba(255,200,50,0.35);
      border-radius: 24px;
      padding: 8px 18px 8px 14px;
      display: flex; align-items: center; gap: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 18px rgba(0,0,0,0.45);
      pointer-events: none; user-select: none; z-index: 100;
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

export function updateCoinDisplay(n) {
  const v = coinEl?.querySelector('.hud-coin-val');
  if (v) v.textContent = n != null ? n.toLocaleString() : '–';
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
