// ── Layout ────────────────────────────────────────────────────────────
const LAYOUT_KEY = 'suy_controls';
const DEFAULT_LAYOUT = {
  joystick: { leftPct: 6,  bottomPct: 10, sizePx: 120 },
  jump:     { rightPct: 7, bottomPct: 10, sizePx: 72  },
};

const RUN_MAG    = 0.78;
const DEAD_ZONE  = 0.12;
const MIN_JOY_PX = 64;
const MAX_JOY_PX = 180;
const MIN_BTN_PX = 44;
const MAX_BTN_PX = 120;

let _layout = loadStoredLayout();

function loadStoredLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return structuredClone(DEFAULT_LAYOUT);
    const parsed = JSON.parse(raw);
    return {
      joystick: { ...DEFAULT_LAYOUT.joystick, ...parsed.joystick },
      jump:     { ...DEFAULT_LAYOUT.jump,     ...parsed.jump     },
    };
  } catch { return structuredClone(DEFAULT_LAYOUT); }
}

export function saveLayout(layout) {
  _layout = layout;
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

export function getLayout() { return _layout; }

export function applyLayoutToElements() {
  if (!joystickBaseEl) return;
  const w = window.innerWidth, h = window.innerHeight;
  const jl = _layout.joystick, jb = _layout.jump;
  const jR = jl.sizePx / 2, kR = 20;

  joystickBaseEl.style.width   = jl.sizePx + 'px';
  joystickBaseEl.style.height  = jl.sizePx + 'px';
  joystickBaseEl.style.left    = (w * jl.leftPct   / 100) + 'px';
  joystickBaseEl.style.bottom  = (h * jl.bottomPct / 100) + 'px';
  joystickKnobEl.style.left    = (jR - kR) + 'px';
  joystickKnobEl.style.top     = (jR - kR) + 'px';

  jumpBtnEl.style.width  = jb.sizePx + 'px';
  jumpBtnEl.style.height = jb.sizePx + 'px';
  jumpBtnEl.style.right  = (w * jb.rightPct  / 100) + 'px';
  jumpBtnEl.style.bottom = (h * jb.bottomPct / 100) + 'px';

}

// ── DOM elements (exported for controlsEditor) ────────────────────────
export let joystickBaseEl = null;
export let joystickKnobEl = null;
export let jumpBtnEl      = null;

function mkEl(tag, styles) {
  const e = document.createElement(tag);
  Object.assign(e.style, { position: 'fixed', userSelect: 'none', ...styles });
  return e;
}

// ── Input state ───────────────────────────────────────────────────────
export const joystick = { x: 0, y: 0, magnitude: 0 };

let _inputEnabled  = true;
let _joyTouch      = null;   // { id, ox, oy }
let _camTouch1     = null;   // { id, lx, ly } — primary camera touch (rotation)
let _camTouch2     = null;   // { id, lx, ly } — secondary camera touch (pinch-zoom)
let _prevPinchDist = 0;      // finger distance at previous frame
let _zoomDelta     = 0;      // accumulated zoom this frame (positive = zoom out)
let _jumpTouchId   = null;
let _jumpQueued    = false;
let _camDx = 0, _camDy = 0;

// ── Init ──────────────────────────────────────────────────────────────

export function initTouchControls() {
  _layout = loadStoredLayout();

  // Joystick
  joystickBaseEl = mkEl('div', {
    borderRadius: '50%', pointerEvents: 'all', zIndex: '150',
    background: 'rgba(255,255,255,0.10)',
    border: '2px solid rgba(255,255,255,0.30)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
  });
  joystickKnobEl = mkEl('div', {
    width: '40px', height: '40px',
    borderRadius: '50%', pointerEvents: 'none', position: 'absolute',
    background: 'rgba(255,255,255,0.55)',
    border: '2px solid rgba(255,255,255,0.9)',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.40)',
  });
  joystickBaseEl.appendChild(joystickKnobEl);
  document.body.appendChild(joystickBaseEl);

  // Jump button
  jumpBtnEl = mkEl('div', {
    borderRadius: '50%', pointerEvents: 'all', zIndex: '150',
    background: 'rgba(255,255,255,0.13)',
    border: '2px solid rgba(255,255,255,0.40)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '26px', color: 'rgba(255,255,255,0.85)',
    fontFamily: 'system-ui',
  });
  jumpBtnEl.textContent = '↑';
  document.body.appendChild(jumpBtnEl);

  applyLayoutToElements();

  window.addEventListener('touchstart',  _onStart,  { passive: false });
  window.addEventListener('touchmove',   _onMove,   { passive: false });
  window.addEventListener('touchend',    _onEnd,    { passive: false });
  window.addEventListener('touchcancel', _onEnd,    { passive: false });
  window.addEventListener('resize',      applyLayoutToElements);

  _initEditMode();
}

// ── Touch handlers ────────────────────────────────────────────────────

function _hits(el, x, y) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function _onStart(e) {
  if (!_inputEnabled) return;
  for (const t of e.changedTouches) {
    if (!_joyTouch && _hits(joystickBaseEl, t.clientX, t.clientY)) {
      _joyTouch = { id: t.identifier, ox: t.clientX, oy: t.clientY };
      joystickBaseEl.style.borderColor = 'rgba(255,255,255,0.65)';
      e.preventDefault();
    } else if (!_jumpTouchId && _hits(jumpBtnEl, t.clientX, t.clientY)) {
      _jumpTouchId = t.identifier;
      _jumpQueued  = true;
      jumpBtnEl.style.background = 'rgba(255,255,255,0.30)';
      e.preventDefault();
    } else {
      if (!_camTouch1) {
        _camTouch1 = { id: t.identifier, lx: t.clientX, ly: t.clientY };
        e.preventDefault();
      } else if (!_camTouch2) {
        // Second free finger = start pinch-to-zoom
        _camTouch2 = { id: t.identifier, lx: t.clientX, ly: t.clientY };
        _prevPinchDist = Math.hypot(
          _camTouch2.lx - _camTouch1.lx,
          _camTouch2.ly - _camTouch1.ly
        );
        e.preventDefault();
      }
    }
  }
}

function _onMove(e) {
  e.preventDefault();

  // Update all touch positions first, then compute pinch once
  for (const t of e.changedTouches) {
    if (_joyTouch && t.identifier === _joyTouch.id) {
      const dx  = t.clientX - _joyTouch.ox;
      const dy  = t.clientY - _joyTouch.oy;
      const jR  = _layout.joystick.sizePx / 2;
      const raw = Math.sqrt(dx * dx + dy * dy);
      const mag = Math.min(raw, jR) / jR;
      const ang = Math.atan2(dy, dx);
      const n   = mag > DEAD_ZONE ? mag : 0;

      joystick.x         = n > 0 ? Math.cos(ang) * n : 0;
      joystick.y         = n > 0 ? Math.sin(ang) * n : 0;
      joystick.magnitude = n;

      const kx = Math.cos(ang) * Math.min(raw, jR);
      const ky = Math.sin(ang) * Math.min(raw, jR);
      joystickKnobEl.style.left = (jR - 20 + kx) + 'px';
      joystickKnobEl.style.top  = (jR - 20 + ky) + 'px';
    }

    if (_camTouch1 && t.identifier === _camTouch1.id) {
      if (!_camTouch2) {
        // Single finger on camera area → rotate camera
        _camDx += t.clientX - _camTouch1.lx;
        _camDy += t.clientY - _camTouch1.ly;
      }
      _camTouch1.lx = t.clientX;
      _camTouch1.ly = t.clientY;
    }

    if (_camTouch2 && t.identifier === _camTouch2.id) {
      _camTouch2.lx = t.clientX;
      _camTouch2.ly = t.clientY;
    }
  }

  // Compute pinch zoom once per touchmove event (after both positions updated)
  if (_camTouch1 && _camTouch2) {
    const dist = Math.hypot(
      _camTouch2.lx - _camTouch1.lx,
      _camTouch2.ly - _camTouch1.ly
    );
    if (_prevPinchDist > 0) {
      // positive delta = fingers closer together = zoom out (increase cam distance)
      _zoomDelta += (_prevPinchDist - dist) * 0.04;
    }
    _prevPinchDist = dist;
  }
}

function _onEnd(e) {
  for (const t of e.changedTouches) {
    if (_joyTouch && t.identifier === _joyTouch.id) {
      _joyTouch = null;
      joystick.x = 0; joystick.y = 0; joystick.magnitude = 0;
      joystickBaseEl.style.borderColor = 'rgba(255,255,255,0.30)';
      const jR = _layout.joystick.sizePx / 2;
      joystickKnobEl.style.left = (jR - 20) + 'px';
      joystickKnobEl.style.top  = (jR - 20) + 'px';
    }
    if (_jumpTouchId && t.identifier === _jumpTouchId) {
      _jumpTouchId = null;
      jumpBtnEl.style.background = 'rgba(255,255,255,0.13)';
    }
    if (_camTouch1 && t.identifier === _camTouch1.id) {
      // Promote second touch to first so single-finger rotation resumes
      _camTouch1     = _camTouch2;
      _camTouch2     = null;
      _prevPinchDist = 0;
    } else if (_camTouch2 && t.identifier === _camTouch2.id) {
      _camTouch2     = null;
      _prevPinchDist = 0;
    }
  }
}

// ── Exported input API ────────────────────────────────────────────────

export function consumeJump() {
  if (!_jumpQueued) return false;
  _jumpQueued = false;
  return true;
}

export function consumeCameraMovement() {
  const dx = _camDx, dy = _camDy;
  _camDx = 0; _camDy = 0;
  return { dx, dy };
}

/** Returns accumulated zoom delta this frame; positive = zoom out, negative = zoom in */
export function consumeCameraZoom() {
  const z = _zoomDelta;
  _zoomDelta = 0;
  return z;
}

export function isRunning() { return joystick.magnitude >= RUN_MAG; }

export function setInputEnabled(v) {
  _inputEnabled = v;
  if (!v) {
    joystick.x = 0; joystick.y = 0; joystick.magnitude = 0;
    _joyTouch = null; _camTouch1 = null; _camTouch2 = null; _jumpTouchId = null;
    _prevPinchDist = 0; _zoomDelta = 0;
    if (joystickBaseEl) {
      const jR = _layout.joystick.sizePx / 2;
      joystickKnobEl.style.left = (jR - 20) + 'px';
      joystickKnobEl.style.top  = (jR - 20) + 'px';
      joystickBaseEl.style.borderColor = 'rgba(255,255,255,0.30)';
    }
  }
}

// ── Edit mode ─────────────────────────────────────────────────────────

let _editOverlay = null, _saveBar = null;
let _handles = {};
let _savedLayout = null;

function _initEditMode() {
  const gear = mkEl('div', {
    top: '52px', right: '16px',
    width: '32px', height: '32px',
    borderRadius: '50%', zIndex: '160', pointerEvents: 'all', cursor: 'pointer',
    background: 'rgba(0,0,0,0.50)',
    border: '1px solid rgba(255,255,255,0.22)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '15px', color: 'rgba(255,255,255,0.65)',
    fontFamily: 'system-ui',
  });
  gear.textContent = '⚙';
  gear.title = 'Customize controls';
  gear.addEventListener('click', _enterEditMode);
  document.body.appendChild(gear);
}

function _enterEditMode() {
  _savedLayout = JSON.parse(JSON.stringify(_layout));
  setInputEnabled(false);

  _editOverlay = mkEl('div', {
    inset: '0', background: 'rgba(0,0,0,0.48)', zIndex: '170', pointerEvents: 'none',
  });

  const banner = mkEl('div', {
    top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    background: '#7c6af7', color: '#fff', padding: '6px 22px',
    borderRadius: '20px', fontSize: '14px', fontWeight: '700',
    letterSpacing: '1px', fontFamily: 'system-ui', zIndex: '175',
  });
  banner.textContent = '✏️  EDIT CONTROLS  —  drag to move · pinch to resize';
  _editOverlay.appendChild(banner);
  document.body.appendChild(_editOverlay);

  _saveBar = mkEl('div', {
    bottom: '0', left: '0', right: '0', height: '56px',
    background: 'rgba(16,16,28,0.96)',
    borderTop: '1px solid rgba(124,106,247,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '20px', zIndex: '180', pointerEvents: 'all',
  });

  const mkBtn = (label, bg, fn) => {
    const b = document.createElement('button');
    Object.assign(b.style, {
      padding: '10px 36px', borderRadius: '26px', border: 'none',
      background: bg, color: '#fff', fontSize: '15px', fontWeight: '700',
      cursor: 'pointer', fontFamily: 'system-ui', letterSpacing: '0.5px',
    });
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  };
  _saveBar.appendChild(mkBtn('✕  Cancel', '#444455', _cancelEdit));
  _saveBar.appendChild(mkBtn('✓  Save',   '#7c6af7', _saveEdit));
  document.body.appendChild(_saveBar);

  _makeHandle('joystick', joystickBaseEl);
  _makeHandle('jump',     jumpBtnEl);
}

function _makeHandle(name, targetEl) {
  const isJoy  = name === 'joystick';
  const sizePx = _layout[name]?.sizePx ?? 60;
  const r      = targetEl.getBoundingClientRect();

  const h = mkEl('div', {
    left: r.left + 'px', top: r.top + 'px',
    width: sizePx + 'px', height: sizePx + 'px',
    borderRadius: '50%', zIndex: '176', pointerEvents: 'all',
    border: '2.5px dashed #7c6af7',
    background: 'rgba(124,106,247,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '24px', color: 'rgba(124,106,247,0.85)',
    cursor: 'grab', touchAction: 'none', boxSizing: 'border-box',
  });
  h.textContent = '⠿';

  let dragId = null, pinchIds = [], pinch0Dist = 0, pinch0Size = 0;

  h.addEventListener('touchstart', e => {
    e.stopPropagation(); e.preventDefault();
    const changed = [...e.changedTouches];
    for (const t of changed) {
      if (pinchIds.length < 2 && !pinchIds.includes(t.identifier)) {
        pinchIds.push(t.identifier);
      }
    }
    if (pinchIds.length === 2) {
      const all = [...e.targetTouches];
      const t0  = all.find(t => t.identifier === pinchIds[0]);
      const t1  = all.find(t => t.identifier === pinchIds[1]);
      if (t0 && t1) {
        pinch0Dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        pinch0Size = _layout[name]?.sizePx ?? 60;
        dragId = null;
      }
    } else if (pinchIds.length === 1) {
      dragId = pinchIds[0];
    }
  }, { passive: false });

  h.addEventListener('touchmove', e => {
    e.stopPropagation(); e.preventDefault();
    const all = [...e.targetTouches];

    if (pinchIds.length === 2) {
      const t0 = all.find(t => t.identifier === pinchIds[0]);
      const t1 = all.find(t => t.identifier === pinchIds[1]);
      if (t0 && t1) {
        const dist  = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const newSz = Math.max(
          isJoy ? MIN_JOY_PX : MIN_BTN_PX,
          Math.min(isJoy ? MAX_JOY_PX : MAX_BTN_PX, pinch0Size * dist / pinch0Dist)
        );
        if (_layout[name]) _layout[name].sizePx = newSz;
        applyLayoutToElements();
        _syncHandle(name, h);
      }
      return;
    }

    if (dragId === null) return;
    const t = all.find(t => t.identifier === dragId);
    if (!t) return;

    const w = window.innerWidth, wh = window.innerHeight;
    const lk = _layout[name];
    if (!lk) return;
    const sz = lk.sizePx;
    const halfSz = sz / 2;

    if (isJoy) {
      lk.leftPct   = Math.max(0, Math.min((w  - sz) / w  * 100, (t.clientX - halfSz) / w  * 100));
      lk.bottomPct = Math.max(0, Math.min((wh - sz) / wh * 100, (wh - t.clientY - halfSz) / wh * 100));
    } else {
      lk.rightPct  = Math.max(0, Math.min((w  - sz) / w  * 100, (w  - t.clientX - halfSz) / w  * 100));
      lk.bottomPct = Math.max(0, Math.min((wh - sz) / wh * 100, (wh - t.clientY - halfSz) / wh * 100));
    }
    applyLayoutToElements();
    _syncHandle(name, h);
  }, { passive: false });

  h.addEventListener('touchend', e => {
    e.stopPropagation(); e.preventDefault();
    [...e.changedTouches].forEach(t => {
      if (t.identifier === dragId) { dragId = null; h.style.cursor = 'grab'; }
      pinchIds = pinchIds.filter(id => id !== t.identifier);
      if (pinchIds.length < 2) pinch0Dist = 0;
    });
  }, { passive: false });

  document.body.appendChild(h);
  _handles[name] = h;
}

function _syncHandle(name, h) {
  let el;
  if (name === 'joystick') el = joystickBaseEl;
  else el = jumpBtnEl;
  const rect = el.getBoundingClientRect();
  const sz   = _layout[name]?.sizePx ?? 60;
  h.style.left   = rect.left + 'px';
  h.style.top    = rect.top  + 'px';
  h.style.width  = sz + 'px';
  h.style.height = sz + 'px';
}

function _exitEditCleanup() {
  _editOverlay?.remove(); _editOverlay = null;
  _saveBar?.remove();     _saveBar     = null;
  Object.values(_handles).forEach(h => h.remove());
  _handles = {};
  setInputEnabled(true);
}

function _saveEdit() {
  saveLayout(_layout);
  _exitEditCleanup();
}

function _cancelEdit() {
  _layout = _savedLayout;
  applyLayoutToElements();
  _exitEditCleanup();
}
