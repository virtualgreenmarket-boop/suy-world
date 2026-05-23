let countEl, slotEl, controlsEl, coinEl;

export function initHud() {
  // ── Top-left: bag icon + coin balance ────────────────────────────────
  const topLeft = el('div', {
    position: 'fixed', top: '16px', left: '16px',
    display: 'flex', gap: '8px', alignItems: 'center',
    userSelect: 'none',
  });

  const bagEl = el('div', {
    background: 'rgba(0,0,0,0.5)', color: '#fff',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '16px', cursor: 'pointer',
    pointerEvents: 'all',
  });
  bagEl.textContent = '🛍';
  bagEl.title = 'Inventory (coming soon)';
  topLeft.appendChild(bagEl);

  coinEl = el('div', {
    background: 'rgba(0,0,0,0.5)', color: '#fff',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '14px', fontFamily: 'Segoe UI, Arial, sans-serif',
    pointerEvents: 'none',
  });
  coinEl.textContent = '🪙 –';
  topLeft.appendChild(coinEl);

  document.body.appendChild(topLeft);

  // ── Top-right: online count ───────────────────────────────────────────
  countEl = el('div', {
    position: 'fixed', top: '16px', right: '16px',
    background: 'rgba(0,0,0,0.5)', color: '#fff',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '14px', fontFamily: 'Segoe UI, Arial, sans-serif',
    userSelect: 'none', pointerEvents: 'none',
  });
  countEl.textContent = '● 1 online';
  document.body.appendChild(countEl);

  // ── Centre: slot label ────────────────────────────────────────────────
  slotEl = el('div', {
    position: 'fixed', bottom: '28%', left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.65)', color: '#fff',
    padding: '8px 22px', borderRadius: '8px',
    fontSize: '15px', letterSpacing: '0.5px',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    display: 'none', pointerEvents: 'none', userSelect: 'none',
  });
  document.body.appendChild(slotEl);

  // ── Bottom-left: controls hint ────────────────────────────────────────
  controlsEl = el('div', {
    position: 'fixed', bottom: '16px', left: '16px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px', lineHeight: '1.7',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    pointerEvents: 'none', userSelect: 'none',
  });
  controlsEl.innerHTML =
    'WASD / ↑↓←→ &mdash; Move<br>' +
    'Drag &mdash; Rotate camera<br>' +
    'T &mdash; Chat';
  document.body.appendChild(controlsEl);
}

export function updateCoinDisplay(n) {
  if (coinEl) coinEl.textContent = `🪙 ${n}`;
}

export function updateOnlineCount(total) {
  const n = total ?? (parseInt(countEl.textContent) || 1);
  countEl.textContent = `● ${n} online`;
}

export function showSlotLabel(text) {
  slotEl.textContent = text;
  slotEl.style.display = 'block';
}

export function hideSlotLabel() {
  slotEl.style.display = 'none';
}

function el(tag, styles) {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  return e;
}
