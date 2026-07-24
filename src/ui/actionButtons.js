let danceBtnEl = null;
let skateboardBtnEl = null;

let _onDanceCallback = null;
let _onSkateboardCallback = null;

function mkEl(tag, styles) {
  const e = document.createElement(tag);
  Object.assign(e.style, { position: 'fixed', userSelect: 'none', ...styles });
  return e;
}

export function initActionButtons(onAttack, onDance, onSkateboard) {
  _onDanceCallback = onDance;
  _onSkateboardCallback = onSkateboard;

  // Dance button (D) - positioned above jump button
  danceBtnEl = mkEl('div', {
    width: '64px',
    height: '64px',
    right: '7%',
    bottom: 'calc(10% + 90px)',
    borderRadius: '50%',
    pointerEvents: 'all',
    zIndex: '150',
    background: 'rgba(255,165,0,0.20)',
    border: '2px solid rgba(255,200,0,0.50)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 20px rgba(255,165,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'system-ui',
    cursor: 'pointer',
  });
  danceBtnEl.textContent = '💃';
  danceBtnEl.title = 'Dance (R)';
  document.body.appendChild(danceBtnEl);

  // Touch events
  danceBtnEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    danceBtnEl.style.background = 'rgba(255,165,0,0.40)';
    if (_onDanceCallback) _onDanceCallback();
  });

  danceBtnEl.addEventListener('touchend', (e) => {
    e.preventDefault();
    danceBtnEl.style.background = 'rgba(255,165,0,0.20)';
  });

  // Mouse events (for desktop)
  danceBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (_onDanceCallback) _onDanceCallback();
  });

  // Skateboard button (V) - positioned above dance button
  skateboardBtnEl = mkEl('div', {
    width: '64px',
    height: '64px',
    right: '7%',
    bottom: 'calc(10% + 170px)',
    borderRadius: '50%',
    pointerEvents: 'all',
    zIndex: '150',
    background: 'rgba(76,175,80,0.20)',
    border: '2px solid rgba(76,200,80,0.50)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 20px rgba(76,175,80,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'system-ui',
    cursor: 'pointer',
  });
  skateboardBtnEl.textContent = '🛹';
  skateboardBtnEl.title = 'Skateboard (V)';
  document.body.appendChild(skateboardBtnEl);

  // Touch events
  skateboardBtnEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    skateboardBtnEl.style.background = 'rgba(76,175,80,0.40)';
    if (_onSkateboardCallback) _onSkateboardCallback();
  });

  skateboardBtnEl.addEventListener('touchend', (e) => {
    e.preventDefault();
    skateboardBtnEl.style.background = 'rgba(76,175,80,0.20)';
  });

  // Mouse events (for desktop)
  skateboardBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (_onSkateboardCallback) _onSkateboardCallback();
  });

  console.log('[action-buttons] Dance & Skateboard buttons initialized');
}

export function setInputEnabled(enabled) {
  if (danceBtnEl) danceBtnEl.style.pointerEvents = enabled ? 'all' : 'none';
  if (skateboardBtnEl) skateboardBtnEl.style.pointerEvents = enabled ? 'all' : 'none';
}

// Show/hide skateboard button based on ownership
export function setSkateboardButtonVisible(visible) {
  if (skateboardBtnEl) {
    skateboardBtnEl.style.display = visible ? 'flex' : 'none';
  }
}
