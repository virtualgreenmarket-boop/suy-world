let attackBtnEl = null;
let danceBtnEl = null;

let _onAttackCallback = null;
let _onDanceCallback = null;

function mkEl(tag, styles) {
  const e = document.createElement(tag);
  Object.assign(e.style, { position: 'fixed', userSelect: 'none', ...styles });
  return e;
}

export function initActionButtons(onAttack, onDance) {
  _onAttackCallback = onAttack;
  _onDanceCallback = onDance;

  // Attack button (R) - positioned above jump button
  attackBtnEl = mkEl('div', {
    width: '64px',
    height: '64px',
    right: '7%',
    bottom: 'calc(10% + 90px)',
    borderRadius: '50%',
    pointerEvents: 'all',
    zIndex: '150',
    background: 'rgba(255,50,50,0.20)',
    border: '2px solid rgba(255,100,100,0.50)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 20px rgba(255,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'system-ui',
    cursor: 'pointer',
  });
  attackBtnEl.textContent = '⚔';
  attackBtnEl.title = 'Attack (R)';
  document.body.appendChild(attackBtnEl);

  // Dance button (D) - positioned to the left of attack button
  danceBtnEl = mkEl('div', {
    width: '64px',
    height: '64px',
    right: 'calc(7% + 80px)',
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
  danceBtnEl.title = 'Dance (D)';
  document.body.appendChild(danceBtnEl);

  // Touch events
  attackBtnEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    attackBtnEl.style.background = 'rgba(255,50,50,0.40)';
    if (_onAttackCallback) _onAttackCallback();
  });

  attackBtnEl.addEventListener('touchend', (e) => {
    e.preventDefault();
    attackBtnEl.style.background = 'rgba(255,50,50,0.20)';
  });

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
  attackBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (_onAttackCallback) _onAttackCallback();
  });

  danceBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (_onDanceCallback) _onDanceCallback();
  });

  console.log('[action-buttons] Attack and Dance buttons initialized');
}

export function setInputEnabled(enabled) {
  if (attackBtnEl) attackBtnEl.style.pointerEvents = enabled ? 'all' : 'none';
  if (danceBtnEl) danceBtnEl.style.pointerEvents = enabled ? 'all' : 'none';
}
