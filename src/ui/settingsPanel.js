// Settings panel — music, sfx, graphics quality, look sensitivity.
// Settings are persisted in localStorage.

const STORAGE_KEY = 'suy_settings';

const _defaults = {
  musicMuted:   false,
  sfxMuted:     false,
  quality:      'high',   // 'low' | 'medium' | 'high'
  sensitivity:  1.0,      // multiplier for mouse/touch camera rotation (0.3–2.0)
};

let _settings = _load();
let _panel    = null;
let _visible  = false;

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ..._defaults, ...JSON.parse(raw) } : { ..._defaults };
  } catch { return { ..._defaults }; }
}

function _save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
}

export function getSettings() { return _settings; }

// ── Apply quality settings to the renderer ────────────────────────────

export function applyQualitySettings(renderer) {
  if (!renderer) return;
  switch (_settings.quality) {
    case 'low':
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      break;
    case 'medium':
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      break;
    case 'high':
    default:
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      break;
  }
}

// ── Init ──────────────────────────────────────────────────────────────

export function initSettingsPanel(renderer) {
  _buildPanel(renderer);
}

function _buildPanel(renderer) {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #sp-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.60);
      z-index: 310;
      display: none;
      align-items: center; justify-content: center;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    #sp-overlay.sp-open { display: flex; }
    #sp-panel {
      background: rgba(14,14,26,0.97);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      padding: 28px 32px 24px;
      width: min(420px, 90vw);
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      backdrop-filter: blur(18px);
      color: #fff;
    }
    #sp-panel h2 {
      margin: 0 0 22px;
      font-size: 18px; font-weight: 700; letter-spacing: 0.5px;
      color: #fff;
    }
    .sp-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 0;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .sp-row:last-of-type { border-bottom: none; }
    .sp-label {
      font-size: 14px; color: rgba(255,255,255,0.80);
    }
    .sp-toggle {
      width: 44px; height: 24px; border-radius: 12px;
      background: rgba(255,255,255,0.15);
      border: 1.5px solid rgba(255,255,255,0.22);
      cursor: pointer; position: relative; transition: background 0.2s;
      flex-shrink: 0;
    }
    .sp-toggle.on { background: #7c6af7; border-color: #9a8aff; }
    .sp-toggle::after {
      content: '';
      position: absolute; top: 3px; left: 3px;
      width: 16px; height: 16px;
      border-radius: 50%; background: #fff;
      transition: transform 0.2s;
    }
    .sp-toggle.on::after { transform: translateX(20px); }
    .sp-quality-btns { display: flex; gap: 6px; }
    .sp-qbtn {
      padding: 5px 13px; border-radius: 12px; font-size: 12px;
      font-weight: 600; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.22);
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.65);
      transition: all 0.15s;
    }
    .sp-qbtn.active {
      background: #7c6af7; border-color: #9a8aff; color: #fff;
    }
    .sp-slider {
      -webkit-appearance: none; appearance: none;
      width: 140px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.18); outline: none; cursor: pointer;
    }
    .sp-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 18px; height: 18px;
      border-radius: 50%; background: #7c6af7; cursor: pointer;
      border: 2px solid #9a8aff;
    }
    .sp-close-btn {
      margin-top: 22px; width: 100%;
      padding: 11px; border-radius: 26px;
      background: rgba(124,106,247,0.85); color: #fff;
      font-size: 14px; font-weight: 700; border: none; cursor: pointer;
      letter-spacing: 0.5px;
      transition: background 0.15s;
    }
    .sp-close-btn:hover { background: #7c6af7; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'sp-overlay';

  _panel = document.createElement('div');
  _panel.id = 'sp-panel';

  _panel.innerHTML = `<h2>⚙ Settings</h2>`;

  // Music mute
  _panel.appendChild(_makeToggleRow('Music', 'sp-music', _settings.musicMuted, v => {
    _settings.musicMuted = v; _save();
  }));

  // SFX mute
  _panel.appendChild(_makeToggleRow('Sound Effects', 'sp-sfx', _settings.sfxMuted, v => {
    _settings.sfxMuted = v; _save();
  }));

  // Graphics quality
  const qRow = _makeRow('Graphics Quality');
  const qBtns = document.createElement('div');
  qBtns.className = 'sp-quality-btns';
  ['low', 'medium', 'high'].forEach(q => {
    const b = document.createElement('button');
    b.className = 'sp-qbtn' + (q === _settings.quality ? ' active' : '');
    b.textContent = q.charAt(0).toUpperCase() + q.slice(1);
    b.addEventListener('click', () => {
      _settings.quality = q;
      _save();
      qBtns.querySelectorAll('.sp-qbtn').forEach(x => x.classList.toggle('active', x === b));
      applyQualitySettings(renderer);
    });
    qBtns.appendChild(b);
  });
  qRow.appendChild(qBtns);
  _panel.appendChild(qRow);

  // Sensitivity
  const sensRow = _makeRow('Look Sensitivity');
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0.3'; slider.max = '2.0'; slider.step = '0.05';
  slider.value = String(_settings.sensitivity);
  slider.className = 'sp-slider';
  slider.addEventListener('input', () => {
    _settings.sensitivity = parseFloat(slider.value);
    _save();
  });
  sensRow.appendChild(slider);
  _panel.appendChild(sensRow);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'sp-close-btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', hideSettingsPanel);
  _panel.appendChild(closeBtn);

  overlay.appendChild(_panel);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) hideSettingsPanel(); });
}

function _makeRow(label) {
  const row = document.createElement('div');
  row.className = 'sp-row';
  const lbl = document.createElement('span');
  lbl.className = 'sp-label'; lbl.textContent = label;
  row.appendChild(lbl);
  return row;
}

function _makeToggleRow(label, id, initialValue, onChange) {
  const row = _makeRow(label);
  const tog = document.createElement('div');
  tog.className = 'sp-toggle' + (initialValue ? '' : ' on');
  // "muted" starts as false → show as ON (enabled)
  tog.classList.toggle('on', !initialValue);
  tog.addEventListener('click', () => {
    const muted = tog.classList.toggle('on');
    // on = NOT muted
    onChange(!muted);
  });
  row.appendChild(tog);
  return row;
}

export function showSettingsPanel() {
  document.getElementById('sp-overlay')?.classList.add('sp-open');
  _visible = true;
}

export function hideSettingsPanel() {
  document.getElementById('sp-overlay')?.classList.remove('sp-open');
  _visible = false;
}

export function toggleSettingsPanel() {
  _visible ? hideSettingsPanel() : showSettingsPanel();
}
