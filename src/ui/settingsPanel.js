import { isChatOpen } from './chatUI.js';
// STEP 2: Minimap disabled - stub out map rotation functions
// import { setMapRotationMode, getMapRotationMode } from './liveMap.js';
const setMapRotationMode = () => {}; // no-op stub
const getMapRotationMode = () => 'camera'; // stub default

const STORAGE_KEY = 'suy_settings';

const _defaults = {
  // Sound
  musicVolume:    80,
  sfxVolume:      75,
  voiceVolume:    70,
  muteAll:        false,
  // Graphics
  quality:        'high',
  frameRate:      60,
  batterySaver:   false,
  animations:     true,
  // Controls
  movementType:   'joystick',
  sensitivity:    1.0,
  invertCamera:   false,
  buttonSize:     'medium',
  // Notifications
  notifGame:      true,
  notifRoom:      true,
  notifMessages:  true,
  notifEvents:    true,
  // Language
  language:       'en',
  // Privacy & Safety
  chatPrivacy:    'everyone',
  friendRequests: 'everyone',
  showOnlineStatus: true,
  // Gameplay
  tutorialTips:   true,
  autoSave:       true,
  vibration:      true,
  showPlayerNames: true,
  minimapRotation: 'camera', // 'camera' or 'north'
};

let _settings = _load();
let _visible  = false;
let _renderer = null;
let _savePosCb = null;
let _onMusicVolume = null;
let _onMuteAll     = null;

export function setSavePositionCallback(fn)  { _savePosCb = fn; }
export function setMusicVolumeCallback(fn)   { _onMusicVolume = fn; }
export function setMuteAllCallback(fn)       { _onMuteAll = fn; }

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
    default:
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
  }
}

export function initSettingsPanel(renderer) {
  _renderer = renderer;
  _injectStyles();
  _buildPanel();
  _buildNavSheets();
  _buildProfileSheet();
  _buildRulesOverlay();
}

export function showSettingsPanel() {
  if (isChatOpen()) return;
  const ov = document.getElementById('sp-overlay');
  if (!ov) return;
  ov.classList.add('sp-open');
  _visible = true;
}

export function hideSettingsPanel() {
  const ov = document.getElementById('sp-overlay');
  if (!ov) return;
  ov.classList.remove('sp-open');
  _visible = false;
}

export function toggleSettingsPanel() {
  _visible ? hideSettingsPanel() : showSettingsPanel();
}

// ── Styles ────────────────────────────────────────────────────────────────

function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    :root {
      --sp-bg:       rgba(10,9,20,0.96);
      --sp-surface:  rgba(255,255,255,0.05);
      --sp-border:   rgba(255,255,255,0.09);
      --sp-text:     rgba(255,255,255,0.90);
      --sp-muted:    rgba(255,255,255,0.45);
      --sp-accent:   #7c6af7;
      --sp-danger:   #f87171;
      --sp-on:       #7c6af7;
      --sp-off:      rgba(255,255,255,0.15);
    }

    /* ── Overlay ── */
    #sp-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 310;
      display: none;
      align-items: flex-end;
      justify-content: center;
      font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
    }
    #sp-overlay.sp-open { display: flex; }

    /* ── Panel ── */
    #sp-panel {
      width: 100%;
      height: 100%;
      height: 100dvh;
      max-width: 480px;
      background: var(--sp-bg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
      animation: sp-slidein .28s cubic-bezier(.32,1,.45,1);
    }
    @keyframes sp-slidein {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    /* ── Drag handle ── */
    #sp-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.2);
      margin: 10px auto 0; flex-shrink: 0;
    }

    /* ── Header ── */
    #sp-header {
      display: flex; align-items: center; gap: 10px;
      padding: 0 14px;
      height: 48px;
      border-bottom: 1px solid var(--sp-border);
      flex-shrink: 0;
    }
    #sp-close-btn {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 50%;
      border: none; background: var(--sp-surface);
      color: var(--sp-muted); font-size: 16px; cursor: pointer;
      flex-shrink: 0; transition: background .15s;
    }
    #sp-close-btn:hover { background: rgba(255,255,255,0.12); }
    #sp-header h2 {
      flex: 1; text-align: center;
      font-size: 16px; font-weight: 600; color: var(--sp-text);
      margin: 0; letter-spacing: -.01em;
    }
    #sp-header-spacer { width: 32px; flex-shrink: 0; }

    /* ── Body ── */
    #sp-body {
      flex: 1; overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding: 12px 12px 56px;
      display: flex; flex-direction: column; gap: 14px;
    }

    /* ── Section ── */
    .sp-sec-label {
      font-size: 11px; font-weight: 700; letter-spacing: .07em;
      text-transform: uppercase; color: var(--sp-muted);
      padding: 0 4px; margin-bottom: -12px;
    }
    .sp-card {
      background: var(--sp-surface);
      border: 1px solid var(--sp-border);
      border-radius: 14px; overflow: hidden;
    }

    /* ── Rows ── */
    .sp-row {
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 13px 14px; gap: 10px; min-height: 48px;
    }
    .sp-row + .sp-row,
    .sp-slider-row + .sp-row,
    .sp-row + .sp-slider-row,
    .sp-slider-row + .sp-slider-row,
    .sp-pill-row + .sp-row,
    .sp-row + .sp-pill-row,
    .sp-pill-row + .sp-pill-row,
    .sp-pill-row + .sp-slider-row,
    .sp-slider-row + .sp-pill-row,
    .sp-disc + .sp-pill-row,
    .sp-pill-row + .sp-disc {
      border-top: 1px solid var(--sp-border);
    }
    .sp-row-label {
      font-size: 13px; font-weight: 500; color: var(--sp-text);
      flex: 1; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Pill row (stacked: label above, pills below) ── */
    .sp-pill-row {
      display: flex; flex-direction: column;
      padding: 12px 14px 13px; gap: 10px;
    }
    .sp-pill-row-label {
      font-size: 13px; font-weight: 500; color: var(--sp-text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Account info ── */
    .sp-account-info {
      padding: 16px 14px 14px;
      border-bottom: 1px solid var(--sp-border);
    }
    .sp-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #7c6af7, #a78bfa);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; margin-bottom: 10px;
    }
    .sp-account-name {
      font-size: 15px; font-weight: 700; color: var(--sp-text);
      margin-bottom: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sp-account-detail {
      font-size: 12px; color: var(--sp-muted); margin-bottom: 1px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* ── Action buttons (Edit Profile, Change Password, etc.) ── */
    .sp-action-btn {
      display: block; width: 100%;
      padding: 12px 14px;
      background: none; border: none;
      font-family: inherit; font-size: 13px; font-weight: 500;
      color: var(--sp-text); text-align: left; cursor: pointer;
      transition: background .1s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sp-action-btn:active { background: rgba(255,255,255,0.06); }
    .sp-action-btn + .sp-action-btn { border-top: 1px solid var(--sp-border); }
    .sp-action-btn.accent { color: var(--sp-accent); }
    .sp-action-btn.danger { color: var(--sp-danger); }

    /* ── Toggle ── */
    .sp-tog {
      position: relative; width: 46px; height: 27px; flex-shrink: 0;
    }
    .sp-tog input { position: absolute; opacity: 0; width: 0; height: 0; }
    .sp-tog-track {
      position: absolute; inset: 0; border-radius: 14px;
      background: var(--sp-off); transition: background .2s; cursor: pointer;
    }
    .sp-tog input:checked ~ .sp-tog-track { background: var(--sp-on); }
    .sp-tog-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 21px; height: 21px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35);
      transition: transform .2s cubic-bezier(.34,1.56,.64,1);
      pointer-events: none;
    }
    .sp-tog input:checked ~ .sp-tog-thumb { transform: translateX(19px); }

    /* ── Slider row ── */
    .sp-slider-row { padding: 10px 14px 12px; }
    .sp-slider-head {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 9px;
    }
    .sp-slider-name {
      font-size: 13px; font-weight: 500; color: var(--sp-text);
      flex: 1; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sp-slider-val {
      font-size: 12px; color: var(--sp-muted);
      font-variant-numeric: tabular-nums; min-width: 30px; text-align: right;
      flex-shrink: 0;
    }
    .sp-range {
      -webkit-appearance: none; appearance: none;
      display: block; width: 100%; height: 3px; border-radius: 999px;
      background: linear-gradient(
        to right,
        var(--sp-accent) 0%,
        var(--sp-accent) var(--pct, 50%),
        rgba(255,255,255,0.18) var(--pct, 50%),
        rgba(255,255,255,0.18) 100%
      );
      outline: none; cursor: pointer;
    }
    .sp-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px; height: 20px; border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 5px rgba(0,0,0,.4), 0 0 0 .5px rgba(0,0,0,.1);
      cursor: pointer;
      transition: transform .12s cubic-bezier(.34,1.56,.64,1);
    }
    .sp-range:active::-webkit-slider-thumb { transform: scale(1.15); }

    /* ── Pill group (multi-option selector) ── */
    .sp-pills {
      display: flex; gap: 6px; width: 100%;
    }
    .sp-pill {
      flex: 1; padding: 8px 4px; border-radius: 10px;
      font-size: 12px; font-weight: 600; text-align: center;
      cursor: pointer; border: 1.5px solid var(--sp-border);
      background: transparent; color: var(--sp-muted);
      font-family: inherit; transition: all .15s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sp-pill.active {
      background: var(--sp-accent); border-color: var(--sp-accent); color: #fff;
    }

    /* ── Select dropdown ── */
    .sp-select-wrap { position: relative; flex-shrink: 0; }
    .sp-select-wrap::after {
      content: ''; position: absolute; right: 9px; top: 50%;
      transform: translateY(-50%);
      border: 4px solid transparent;
      border-top-color: var(--sp-muted); border-bottom: none;
      pointer-events: none;
    }
    .sp-select {
      -webkit-appearance: none; appearance: none;
      background: rgba(255,255,255,0.08);
      border: 1.5px solid var(--sp-border);
      color: var(--sp-text); font-family: inherit;
      font-size: 13px; font-weight: 500;
      padding: 6px 26px 6px 10px; border-radius: 10px;
      cursor: pointer; outline: none; min-width: 80px; max-width: 160px;
    }

    /* ── Disclosure row (chevron, for "Open" items) ── */
    .sp-disc {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 14px; gap: 10px; min-height: 44px;
      background: none; border: none; width: 100%;
      font-family: inherit; color: var(--sp-text); text-align: left;
      cursor: pointer; transition: background .1s;
    }
    .sp-disc + .sp-disc,
    .sp-disc + .sp-row,
    .sp-row + .sp-disc,
    .sp-disc + .sp-slider-row,
    .sp-slider-row + .sp-disc { border-top: 1px solid var(--sp-border); }
    .sp-disc:active { background: rgba(255,255,255,0.05); }
    .sp-disc-label {
      font-size: 13px; font-weight: 500;
      flex: 1; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sp-disc-chevron { color: var(--sp-muted); flex-shrink: 0; }

    /* ── Version card ── */
    .sp-version-card {
      background: var(--sp-surface);
      border: 1px solid var(--sp-border);
      border-radius: 14px;
      padding: 14px;
    }
    .sp-version-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 0; font-size: 13px;
    }
    .sp-version-row:first-child { padding-top: 0; }
    .sp-version-row:last-child  { padding-bottom: 0; }
    .sp-version-key   { color: var(--sp-muted); }
    .sp-version-val   { color: var(--sp-text); font-weight: 600; }
    .sp-server-online { color: #4ade80; font-weight: 700; }

    /* ── Player info strip ── */
    #sp-player-wrap {
      flex-shrink: 0;
      padding: 8px 12px 0;
    }

    /* ── Tab bar ── */
    #sp-tabs {
      display: flex; gap: 6px;
      padding: 10px 12px 0;
      flex-shrink: 0;
    }
    .sp-tab {
      flex: 1; padding: 8px 4px;
      border: 1.5px solid var(--sp-border);
      border-radius: 10px;
      background: transparent;
      color: var(--sp-muted);
      font-family: inherit; font-size: 12px; font-weight: 600;
      text-align: center; cursor: pointer;
      transition: all .18s; white-space: nowrap;
    }
    .sp-tab.active {
      background: var(--sp-accent);
      border-color: var(--sp-accent);
      color: #fff;
    }

    /* ── Tab panels ── */
    .sp-tab-panel { display: none; }
    .sp-tab-panel.active { display: contents; }

    /* ── Save position footer ── */
    #sp-pos-footer {
      flex-shrink: 0;
      padding: 10px 14px 22px;
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid var(--sp-border);
    }
    #sp-pos-logout-btn {
      flex-shrink: 0;
      padding: 8px 18px; border-radius: 10px;
      border: 1.5px solid var(--sp-danger);
      background: transparent;
      color: var(--sp-danger); font-family: inherit;
      font-size: 13px; font-weight: 700;
      cursor: pointer; transition: opacity .15s;
    }
    #sp-pos-logout-btn:active { opacity: .75; }
    #sp-pos-save-btn {
      flex-shrink: 0;
      padding: 8px 18px; border-radius: 10px;
      border: none; background: var(--sp-accent);
      color: #fff; font-family: inherit;
      font-size: 13px; font-weight: 700;
      cursor: pointer; transition: opacity .15s;
    }
    #sp-pos-save-btn:active { opacity: .75; }
    #sp-pos-save-btn.saved  { background: #4ade80; }

    /* ── Save button ── */
    .sp-save-btn {
      display: block; width: 100%;
      padding: 14px; border-radius: 14px;
      border: none; background: var(--sp-accent);
      color: #fff; font-family: inherit;
      font-size: 15px; font-weight: 700;
      cursor: pointer; transition: opacity .15s, transform .1s;
      margin-top: 4px;
    }
    .sp-save-btn:active { opacity: .8; transform: scale(.98); }
    .sp-save-btn.saved  { background: #4ade80; }

    /* ── System sub-sheets ── */
    .sp-sub-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.72);
      z-index: 325;
      display: none; align-items: flex-end; justify-content: center;
      font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
    }
    .sp-sub-overlay.open { display: flex; }
    .sp-sub-sheet {
      background: rgba(14,14,26,0.98);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 20px 20px 0 0;
      width: min(480px, 100vw);
      max-height: 88vh;
      display: flex; flex-direction: column;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.6);
    }
    .sp-sub-sheet .ssh-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.18);
      margin: 12px auto 0; flex-shrink: 0;
    }
    .sp-sub-sheet .ssh-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    .sp-sub-sheet .ssh-close {
      width: 28px; height: 28px; border-radius: 50%;
      border: none; background: rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.7); font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background .15s;
    }
    .sp-sub-sheet .ssh-close:hover { background: rgba(255,255,255,0.22); }
    .sp-sub-sheet .ssh-title {
      flex: 1; font-size: 16px; font-weight: 700; color: #fff;
    }
    .sp-sub-sheet .ssh-spacer { width: 28px; flex-shrink: 0; }
    .sp-sub-body {
      overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 14px 14px 4px;
      display: flex; flex-direction: column; gap: 14px;
      flex: 1;
    }
    .sp-sub-footer {
      padding: 10px 14px 28px;
      flex-shrink: 0;
    }

    /* ── Profile sheet ── */
    #sp-profile-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.72);
      z-index: 320;
      display: none; align-items: flex-end; justify-content: center;
      font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
    }
    #sp-profile-overlay.open { display: flex; }
    #sp-profile-sheet {
      background: rgba(14,14,26,0.98);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 20px 20px 0 0;
      width: min(480px, 100vw);
      display: flex; flex-direction: column;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.6);
      padding-bottom: 32px;
    }
    #sp-profile-sheet .psh-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.18);
      margin: 12px auto 0; flex-shrink: 0;
    }
    #sp-profile-sheet .psh-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    #sp-profile-sheet .psh-title { font-size: 16px; font-weight: 700; color: #fff; }
    #sp-profile-sheet .psh-close {
      width: 28px; height: 28px; border-radius: 50%;
      border: none; background: rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.7); font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    #sp-profile-sheet .psh-close:hover { background: rgba(255,255,255,0.22); }
    #sp-profile-body { padding: 14px 14px 4px; }

    /* ── Rules overlay ── */
    #sp-rules-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.72);
      z-index: 320;
      display: none; align-items: flex-end; justify-content: center;
      font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
    }
    #sp-rules-overlay.open { display: flex; }
    #sp-rules-sheet {
      background: rgba(14,14,26,0.98);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 20px 20px 0 0;
      width: min(480px, 100vw);
      max-height: 88vh;
      display: flex; flex-direction: column;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.6);
    }
    #sp-rules-sheet .rsh-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.18);
      margin: 12px auto 0; flex-shrink: 0;
    }
    #sp-rules-sheet .rsh-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    #sp-rules-sheet .rsh-title { font-size: 16px; font-weight: 700; color: #fff; }
    #sp-rules-sheet .rsh-close {
      width: 28px; height: 28px; border-radius: 50%;
      border: none; background: rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.7); font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    #sp-rules-sheet .rsh-close:hover { background: rgba(255,255,255,0.22); }
    #sp-rules-body {
      overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 18px 20px 36px; flex: 1;
      color: rgba(255,255,255,0.82); font-size: 13.5px; line-height: 1.65;
    }
    #sp-rules-body .ri { color: rgba(255,255,255,0.55); margin-bottom: 20px; }
    #sp-rules-body h3 {
      font-size: 11px; font-weight: 700; letter-spacing: .07em;
      text-transform: uppercase; color: #9a8aff; margin: 20px 0 7px;
    }
    #sp-rules-body p  { margin-bottom: 8px; }
    #sp-rules-body ul { padding-left: 16px; margin: 4px 0 8px; }
    #sp-rules-body ul li { margin-bottom: 4px; }
    #sp-rules-body a  { color: #9a8aff; text-decoration: none; }
  `;
  document.head.appendChild(s);
}

// ── Panel DOM ─────────────────────────────────────────────────────────────

function _buildPanel() {
  const overlay = document.createElement('div');
  overlay.id = 'sp-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) hideSettingsPanel(); });

  const panel = document.createElement('div');
  panel.id = 'sp-panel';

  // Drag handle
  const handle = document.createElement('div');
  handle.id = 'sp-handle';
  panel.appendChild(handle);

  // Header
  const header = document.createElement('div');
  header.id = 'sp-header';
  const closeBtn = document.createElement('button');
  closeBtn.id = 'sp-close-btn';
  closeBtn.innerHTML = '✕';
  closeBtn.addEventListener('click', hideSettingsPanel);
  const title = document.createElement('h2');
  title.textContent = 'Settings';
  const spacer = document.createElement('div');
  spacer.id = 'sp-header-spacer';
  header.append(closeBtn, title, spacer);

  // Player info (always visible, above tabs)
  const playerWrap = document.createElement('div');
  playerWrap.id = 'sp-player-wrap';
  playerWrap.appendChild(_accountCard());

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.id = 'sp-tabs';
  const tabDefs = ['System', 'General', 'Graphics'];
  const tabs = tabDefs.map(name => {
    const btn = document.createElement('button');
    btn.className = 'sp-tab';
    btn.textContent = name;
    tabBar.appendChild(btn);
    return btn;
  });

  // Body
  const body = document.createElement('div');
  body.id = 'sp-body';

  // ── System Settings panel ─────────────────────────────────────────────
  const sysPanel = document.createElement('div');
  sysPanel.className = 'sp-tab-panel active';
  sysPanel.append(
    _card([
      _discRow('Language',         () => _showSubSheet('sp-lang')),
      _discRow('Notifications',    () => _showSubSheet('sp-notif')),
      _discRow('Privacy & Safety', () => _showSubSheet('sp-privacy')),
      _discRow('Support',          () => _showSubSheet('sp-support')),
      _discRow('Legal',            () => _showSubSheet('sp-legal')),
      _discRow('Version',          () => _showSubSheet('sp-version')),
    ])
  );

  // ── General Settings panel ────────────────────────────────────────────
  const genPanel = document.createElement('div');
  genPanel.className = 'sp-tab-panel';
  genPanel.append(
    _card([
      _discRow('Sound',    () => _showSubSheet('sp-sound')),
      _discRow('Controls', () => _showSubSheet('sp-controls')),
      _discRow('Gameplay', () => _showSubSheet('sp-gameplay')),
    ])
  );

  // ── Graphics panel ────────────────────────────────────────────────────
  const gfxPanel = document.createElement('div');
  gfxPanel.className = 'sp-tab-panel';
  gfxPanel.append(
    _secLabel('Graphics'), _card([
      _pillRow('Graphics Quality', 'quality', ['Low','Medium','High'], _settings.quality.charAt(0).toUpperCase() + _settings.quality.slice(1)),
      _pillRow('Frame Rate',       'frameRate', ['30 FPS','60 FPS'],   _settings.frameRate === 30 ? '30 FPS' : '60 FPS'),
      _toggleRow('Battery Saver Mode', 'batterySaver', _settings.batterySaver),
      _toggleRow('Animations',         'animations',   _settings.animations),
    ])
  );

  body.append(sysPanel, genPanel, gfxPanel);

  // Tab switching
  const panels = [sysPanel, genPanel, gfxPanel];
  tabs[0].classList.add('active');
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panels[i].classList.add('active');
    });
  });

  // Save position footer
  const posFooter = document.createElement('div');
  posFooter.id = 'sp-pos-footer';

  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'sp-pos-logout-btn';
  logoutBtn.textContent = 'Log Out';
  logoutBtn.addEventListener('click', () => {
    if (confirm('Log out?')) alert('Logged out.');
  });

  const posSaveBtn = document.createElement('button');
  posSaveBtn.id = 'sp-pos-save-btn';
  posSaveBtn.textContent = 'Save Position';
  posSaveBtn.addEventListener('click', () => {
    if (_savePosCb) {
      _savePosCb();
      posSaveBtn.textContent = '✓ Saved';
      posSaveBtn.classList.add('saved');
      setTimeout(() => {
        posSaveBtn.textContent = 'Save Position';
        posSaveBtn.classList.remove('saved');
      }, 1200);
    }
  });

  posFooter.append(logoutBtn, posSaveBtn);

  panel.append(header, playerWrap, tabBar, body, posFooter);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

// ── DOM helpers ───────────────────────────────────────────────────────────

function _secLabel(text) {
  const p = document.createElement('p');
  p.className = 'sp-sec-label';
  p.textContent = text;
  return p;
}

function _card(rows) {
  const div = document.createElement('div');
  div.className = 'sp-card';
  rows.forEach(r => div.appendChild(r));
  return div;
}

function _toggleRow(label, key, initial) {
  const row = document.createElement('div');
  row.className = 'sp-row';

  const lbl = document.createElement('span');
  lbl.className = 'sp-row-label';
  lbl.textContent = label;

  const tog = document.createElement('label');
  tog.className = 'sp-tog';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.checked = !!initial;
  inp.addEventListener('change', () => {
    _settings[key] = inp.checked;
    _save();
    if (key === 'muteAll' && _onMuteAll) _onMuteAll(inp.checked);
  });
  const track = document.createElement('span');
  track.className = 'sp-tog-track';
  const thumb = document.createElement('span');
  thumb.className = 'sp-tog-thumb';
  tog.append(inp, track, thumb);

  row.append(lbl, tog);
  return row;
}

function _sliderRow(label, key, initial, opts = {}) {
  const min = opts.min ?? 0, max = opts.max ?? 100;
  const pct  = ((initial - min) / (max - min)) * 100;
  const fmt  = opts.label ?? (v => v + '%');

  const wrap = document.createElement('div');
  wrap.className = 'sp-slider-row';

  const head = document.createElement('div');
  head.className = 'sp-slider-head';

  const name = document.createElement('span');
  name.className = 'sp-slider-name';
  name.textContent = label;

  const val = document.createElement('span');
  val.className = 'sp-slider-val';
  val.textContent = fmt(initial);

  head.append(name, val);

  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'sp-range';
  input.min = min; input.max = max; input.value = initial;
  input.style.setProperty('--pct', pct + '%');

  input.addEventListener('input', () => {
    const v = Number(input.value);
    const p = ((v - min) / (max - min)) * 100;
    input.style.setProperty('--pct', p + '%');
    val.textContent = fmt(v);

    if (key === 'sensitivity') {
      _settings.sensitivity = 0.3 + (v / 100) * 1.7;
    } else {
      _settings[key] = v;
    }
    _save();
    if (key === 'musicVolume' && _onMusicVolume) _onMusicVolume(v / 100);
  });

  wrap.append(head, input);
  return wrap;
}

function _pillRow(label, key, options, current) {
  const row = document.createElement('div');
  row.className = 'sp-pill-row';

  const lbl = document.createElement('span');
  lbl.className = 'sp-pill-row-label';
  lbl.textContent = label;

  const pills = document.createElement('div');
  pills.className = 'sp-pills';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'sp-pill' + (opt === current ? ' active' : '');
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      pills.querySelectorAll('.sp-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      // map display label back to stored value
      if (key === 'quality')       _settings.quality       = opt.toLowerCase();
      else if (key === 'frameRate')     _settings.frameRate     = opt === '30 FPS' ? 30 : 60;
      else if (key === 'movementType')  _settings.movementType  = opt === 'Joystick' ? 'joystick' : 'tap';
      else if (key === 'buttonSize')    _settings.buttonSize    = opt.toLowerCase();
      else if (key === 'chatPrivacy' || key === 'friendRequests') {
        _settings[key] = opt === 'Everyone' ? 'everyone' : opt === 'Friends' ? 'friends' : 'off';
      }
      _save();
      if (key === 'quality' && _renderer) applyQualitySettings(_renderer);
    });
    pills.appendChild(btn);
  });

  row.append(lbl, pills);
  return row;
}

function _selectRow(label, key, options, current) {
  const row = document.createElement('div');
  row.className = 'sp-row';

  const lbl = document.createElement('span');
  lbl.className = 'sp-row-label';
  lbl.textContent = label;

  const wrap = document.createElement('div');
  wrap.className = 'sp-select-wrap';

  const sel = document.createElement('select');
  sel.className = 'sp-select';
  options.forEach(({ value, label: optLabel }) => {
    const o = document.createElement('option');
    o.value = value; o.textContent = optLabel;
    if (value === current) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    _settings[key] = sel.value;
    _save();
  });
  wrap.appendChild(sel);
  row.append(lbl, wrap);
  return row;
}

function _minimapRotationRow() {
  const row = document.createElement('div');
  row.className = 'sp-row';

  const lbl = document.createElement('span');
  lbl.className = 'sp-row-label';
  lbl.textContent = 'Minimap Rotation';

  const wrap = document.createElement('div');
  wrap.className = 'sp-select-wrap';

  const sel = document.createElement('select');
  sel.className = 'sp-select';
  [
    { value: 'camera', label: 'Camera Direction' },
    { value: 'north', label: 'North Fixed' }
  ].forEach(({ value, label }) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    if (value === _settings.minimapRotation) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    _settings.minimapRotation = sel.value;
    setMapRotationMode(sel.value);
    _save();
  });
  wrap.appendChild(sel);
  row.append(lbl, wrap);
  return row;
}

function _discRow(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'sp-disc';
  btn.innerHTML = `
    <span class="sp-disc-label">${label}</span>
    <svg class="sp-disc-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  btn.addEventListener('click', onClick);
  return btn;
}

function _accountCard() {
  const card = document.createElement('div');
  card.className = 'sp-card';
  card.appendChild(_discRow('Profile Settings', _showProfileSheet));
  return card;
}

function _versionCard() {
  const div = document.createElement('div');
  div.className = 'sp-version-card';
  div.innerHTML = `
    <div class="sp-version-row">
      <span class="sp-version-key">Suy-world Version</span>
      <span class="sp-version-val">1.0.0</span>
    </div>
    <div class="sp-version-row">
      <span class="sp-version-key">Server</span>
      <span class="sp-version-val sp-server-online">● Online</span>
    </div>`;
  return div;
}

function _savedPosLabel() {
  try {
    const raw = localStorage.getItem('suy_spawn');
    if (raw) {
      const { x, y, z } = JSON.parse(raw);
      return `Last saved: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
    }
  } catch {}
  return 'Not saved yet';
}

function _privLabel(val) {
  return val === 'everyone' ? 'Everyone' : val === 'friends' ? 'Friends' : 'Off';
}

// ── System sub-sheet helpers ──────────────────────────────────────────────

function _buildSubSheet(id, title, buildBody, buildFooter) {
  const ov = document.createElement('div');
  ov.id = id + '-overlay';
  ov.className = 'sp-sub-overlay';
  ov.addEventListener('click', e => { if (e.target === ov) _hideSubSheet(id); });

  const sheet = document.createElement('div');
  sheet.className = 'sp-sub-sheet';
  const closeId = id + '-close';
  sheet.innerHTML = `
    <div class="ssh-handle"></div>
    <div class="ssh-header">
      <button class="ssh-close" id="${closeId}">✕</button>
      <span class="ssh-title">${title}</span>
      <div class="ssh-spacer"></div>
    </div>`;

  const body = document.createElement('div');
  body.className = 'sp-sub-body';
  buildBody(body);
  sheet.appendChild(body);

  if (buildFooter) {
    const footer = document.createElement('div');
    footer.className = 'sp-sub-footer';
    buildFooter(footer);
    sheet.appendChild(footer);
  }

  ov.appendChild(sheet);
  document.body.appendChild(ov);
  document.getElementById(closeId).addEventListener('click', () => _hideSubSheet(id));
}

function _showSubSheet(id) {
  document.getElementById(id + '-overlay')?.classList.add('open');
}

function _hideSubSheet(id) {
  document.getElementById(id + '-overlay')?.classList.remove('open');
}

function _saveBtnEl(sheetId) {
  const btn = document.createElement('button');
  btn.className = 'sp-save-btn';
  btn.textContent = 'Save';
  btn.addEventListener('click', () => {
    _save();
    btn.textContent = 'Saved ✓';
    btn.classList.add('saved');
    setTimeout(() => {
      btn.textContent = 'Save';
      btn.classList.remove('saved');
      _hideSubSheet(sheetId);
    }, 900);
  });
  return btn;
}

function _buildNavSheets() {
  // Language
  _buildSubSheet('sp-lang', 'Language', body => {
    body.append(_card([
      _selectRow('Language', 'language', [
        { value: 'en',    label: 'English'  },
        { value: 'he',    label: 'עברית'    },
        { value: 'es',    label: 'Español'  },
        { value: 'fr',    label: 'Français' },
        { value: 'ar',    label: 'العربية'  },
        { value: 'other', label: 'Other'    },
      ], _settings.language),
    ]));
  });

  // Notifications
  _buildSubSheet('sp-notif', 'Notifications', body => {
    body.append(_card([
      _toggleRow('Game Notifications', 'notifGame',     _settings.notifGame),
      _toggleRow('Messages',           'notifMessages', _settings.notifMessages),
      _toggleRow('Events & Rewards',   'notifEvents',   _settings.notifEvents),
    ]));
  });

  // Privacy & Safety
  _buildSubSheet('sp-privacy', 'Privacy & Safety', body => {
    body.append(_card([
      _pillRow('Chat',                  'chatPrivacy',       ['Everyone','Friends','Off'], _privLabel(_settings.chatPrivacy)),
      _toggleRow('Show Online Status',  'showOnlineStatus',  _settings.showOnlineStatus),
      _discRow('Block List',    () => alert('Block list coming soon.')),
      _discRow('Report Player', () => alert('Report Player coming soon.')),
    ]));
  });

  // Support
  _buildSubSheet('sp-support', 'Support', body => {
    body.append(_card([
      _discRow('Help Center',     () => alert('Help Center coming soon.')),
      _discRow('Contact Support', () => alert('Contact Support coming soon.')),
      _discRow('Report a Bug',    () => alert('Report a Bug coming soon.')),
      _discRow('Feedback',        () => alert('Feedback coming soon.')),
    ]));
  });

  // Legal
  _buildSubSheet('sp-legal', 'Legal', body => {
    body.append(_card([
      _discRow('Game Rules',           _showRules),
      _discRow('Terms and Conditions', () => alert('Terms and Conditions coming soon.')),
      _discRow('Privacy Policy',       () => alert('Privacy Policy coming soon.')),
      _discRow('Licenses',             () => alert('Licenses coming soon.')),
    ]));
  });

  // Version
  _buildSubSheet('sp-version', 'Version', body => {
    body.appendChild(_versionCard());
  });

  // Sound
  _buildSubSheet('sp-sound', 'Sound',
    body => {
      body.append(_card([
        _sliderRow('Music Volume',             'musicVolume',  _settings.musicVolume),
        _sliderRow('Sound Effects',            'sfxVolume',    _settings.sfxVolume),
        _sliderRow('Voice / Character Sounds', 'voiceVolume',  _settings.voiceVolume),
        _toggleRow('Mute All',                 'muteAll',      _settings.muteAll),
      ]));
    },
    footer => footer.appendChild(_saveBtnEl('sp-sound'))
  );

  // Controls
  _buildSubSheet('sp-controls', 'Controls',
    body => {
      body.append(_card([
        _pillRow('Movement Type', 'movementType', ['Joystick','Tap to Move'], _settings.movementType === 'joystick' ? 'Joystick' : 'Tap to Move'),
        _sliderRow('Camera Sensitivity', 'sensitivity', Math.round((_settings.sensitivity - 0.3) / 1.7 * 100), { min: 0, max: 100, label: v => ['Low','Mid','High'][v < 34 ? 0 : v < 67 ? 1 : 2] }),
        _toggleRow('Invert Camera', 'invertCamera', _settings.invertCamera),
        _pillRow('Button Size', 'buttonSize', ['Small','Medium','Large'], _settings.buttonSize.charAt(0).toUpperCase() + _settings.buttonSize.slice(1)),
      ]));
    },
    footer => footer.appendChild(_saveBtnEl('sp-controls'))
  );

  // Gameplay
  _buildSubSheet('sp-gameplay', 'Gameplay',
    body => {
      body.append(_card([
        _toggleRow('Tutorial Tips',     'tutorialTips',    _settings.tutorialTips),
        _toggleRow('Auto Save',         'autoSave',        _settings.autoSave),
        _toggleRow('Vibration',         'vibration',       _settings.vibration),
        _toggleRow('Show Player Names', 'showPlayerNames', _settings.showPlayerNames),
      ]));
      body.append(_card([
        _minimapRotationRow(),
      ]));
    },
    footer => footer.appendChild(_saveBtnEl('sp-gameplay'))
  );
}

// ── Profile Settings sheet ────────────────────────────────────────────────

function _buildProfileSheet() {
  const ov = document.createElement('div');
  ov.id = 'sp-profile-overlay';
  ov.addEventListener('click', e => { if (e.target === ov) _hideProfileSheet(); });

  const sheet = document.createElement('div');
  sheet.id = 'sp-profile-sheet';
  sheet.innerHTML = `
    <div class="psh-handle"></div>
    <div class="psh-header">
      <span class="psh-title">Profile Settings</span>
      <button class="psh-close" id="sp-profile-close">✕</button>
    </div>
    <div class="psh-body" id="sp-profile-body"></div>`;

  ov.appendChild(sheet);
  document.body.appendChild(ov);
  document.getElementById('sp-profile-close').addEventListener('click', _hideProfileSheet);

  const body = document.getElementById('sp-profile-body');

  const infoCard = document.createElement('div');
  infoCard.className = 'sp-card';
  infoCard.style.marginBottom = '10px';
  infoCard.innerHTML = `
    <div class="sp-account-info" style="border-bottom:none">
      <div class="sp-avatar">🧑</div>
      <div class="sp-account-name">[Player Name]</div>
      <div class="sp-account-detail">[Player Email]</div>
      <div class="sp-account-detail">ID: [ID Number]</div>
    </div>`;
  body.appendChild(infoCard);

  const card = document.createElement('div');
  card.className = 'sp-card';
  const actions = [
    { label: 'Edit Profile',    cls: '',       fn: () => alert('Edit Profile coming soon.') },
    { label: 'Change Password', cls: '',       fn: () => alert('Change Password coming soon.') },
    { label: 'Log Out',         cls: 'accent', fn: () => { if (confirm('Log out?')) alert('Logged out.'); } },
    { label: 'Delete Account',  cls: 'danger', fn: () => { if (confirm('Delete your account? This cannot be undone.')) alert('Account deletion coming soon.'); } },
  ];
  actions.forEach(({ label, cls, fn }) => {
    const btn = document.createElement('button');
    btn.className = 'sp-action-btn' + (cls ? ' ' + cls : '');
    btn.textContent = label;
    btn.addEventListener('click', fn);
    card.appendChild(btn);
  });
  body.appendChild(card);
}

function _showProfileSheet() {
  document.getElementById('sp-profile-overlay')?.classList.add('open');
}

function _hideProfileSheet() {
  document.getElementById('sp-profile-overlay')?.classList.remove('open');
}

// ── Game Rules overlay ────────────────────────────────────────────────────

function _buildRulesOverlay() {
  const ov = document.createElement('div');
  ov.id = 'sp-rules-overlay';
  ov.addEventListener('click', e => { if (e.target === ov) _hideRules(); });

  const sheet = document.createElement('div');
  sheet.id = 'sp-rules-sheet';

  sheet.innerHTML = `
    <div class="rsh-handle"></div>
    <div class="rsh-header">
      <span class="rsh-title">Game Rules</span>
      <button class="rsh-close" id="sp-rules-close">✕</button>
    </div>
    <div id="sp-rules-body">
      <p class="ri">Welcome to Suy-world.<br><br>
      These Game Rules explain how to play the game, what is allowed, what is not allowed, and how players are expected to behave while using the game.<br><br>
      By playing Suy-world, you agree to follow these rules.</p>

      <h3>1. General Gameplay</h3>
      <p>Suy-world is a virtual game where players can explore different areas, enter rooms, interact with virtual spaces, view products or items, customize their character, and enjoy different in-game features.</p>
      <p>Players may progress by exploring, completing actions, collecting items, unlocking features, purchasing virtual content, or interacting with other players or sellers.</p>
      <p>The game may include different zones, rooms, characters, virtual items, decorations, upgrades, pets, signs, advertisements, and other interactive elements.</p>

      <h3>2. Player Account</h3>
      <p>Each player is responsible for their own account. You must not share your login details with others.</p>
      <p>The game team is not responsible for lost progress, purchases, or rewards caused by sharing your account, using unofficial software, or breaking the rules.</p>
      <p>You must provide correct information when creating or managing your account.</p>

      <h3>3. Fair Play</h3>
      <p>Players must play fairly and honestly. The following actions are not allowed:</p>
      <ul>
        <li>Using cheats, hacks, bots, scripts, modified apps, or unauthorized software.</li>
        <li>Exploiting bugs or technical errors to gain an unfair advantage.</li>
        <li>Selling, buying, or trading accounts outside the official game system.</li>
        <li>Manipulating the game economy, rankings, rewards, or other players.</li>
        <li>Trying to access another player's account.</li>
        <li>Using multiple accounts to abuse rewards, promotions, or voting systems.</li>
      </ul>
      <p>If you find a bug, report it to the game team rather than exploiting it.</p>

      <h3>4. Player Behavior</h3>
      <p>Players must treat each other with respect. The following behavior is not allowed:</p>
      <ul>
        <li>Harassment, bullying, threats, or abusive language.</li>
        <li>Hate speech, racism, discrimination, or offensive content.</li>
        <li>Sexual, violent, or inappropriate messages or images.</li>
        <li>Impersonating another player, seller, moderator, or game team member.</li>
        <li>Spamming, advertising outside allowed areas, or sending misleading messages.</li>
        <li>Sharing personal information of yourself or others.</li>
      </ul>

      <h3>5. Virtual Items and Customization</h3>
      <p>Virtual items may include character designs, clothing, pets, room decorations, signs, backgrounds, furniture, visual effects, advertisements, or other digital content.</p>
      <p>Virtual items do not have real-world ownership value unless clearly stated by the game team. The game team may update, change, remove, or limit virtual items if needed.</p>
      <p>Players are not allowed to sell virtual items for real money outside the official game system.</p>

      <h3>6. Rooms, Stores, and Virtual Spaces</h3>
      <p>Room owners are responsible for the content they display. The following content is not allowed:</p>
      <ul>
        <li>Illegal products or services.</li>
        <li>False or misleading information.</li>
        <li>Offensive, hateful, sexual, violent, or inappropriate images or text.</li>
        <li>Content that violates intellectual property rights.</li>
        <li>External links or contact details, unless officially allowed.</li>
      </ul>

      <h3>7. Advertising and Promotions</h3>
      <p>Advertising content must be accurate, appropriate, and permitted. The game team may reject or remove advertisements that are misleading, offensive, illegal, or unsuitable.</p>
      <p>Payment for advertising does not guarantee player engagement, sales, ranking, or visibility beyond what is clearly described.</p>

      <h3>8. Purchases and Payments</h3>
      <p>All purchases must be made through official payment methods. Prices and available items may change from time to time.</p>
      <p>Purchases are usually final and non-refundable, except where required by law or app store rules.</p>
      <p>Players must not use unauthorized payment methods, stolen payment details, chargeback abuse, or payment fraud.</p>

      <h3>9. Rewards, Progress, and Game Balance</h3>
      <p>Rewards and progress may be changed, adjusted, reset, or removed if there is a technical issue, cheating, abuse, or balancing update.</p>
      <p>No player is guaranteed to keep the same rank, progress speed, item value, or game advantage forever.</p>

      <h3>10. User-Generated Content</h3>
      <p>By uploading content, you confirm that you have the right to use it. You must not upload content that belongs to someone else without permission.</p>
      <p>The game team may remove or limit user-generated content if it violates the rules or creates risk for the game or other players.</p>

      <h3>11. Safety and Privacy</h3>
      <p>Never share passwords, home addresses, phone numbers, payment details, or other private information in the game.</p>
      <p>The game team will never ask for your password inside the game chat.</p>
      <p>Parents or guardians should supervise younger players and review privacy settings, purchases, and communication features.</p>

      <h3>12. Technical Issues</h3>
      <p>The game may sometimes be unavailable due to maintenance, updates, server problems, internet issues, or bugs. Uninterrupted access is not guaranteed.</p>
      <p>The game team is not responsible for connection problems, device issues, app store issues, or third-party service failures.</p>

      <h3>13. Updates and Changes</h3>
      <p>Updates may include new features, removed features, balance changes, visual changes, new areas, new rules, security improvements, bug fixes, or changes to virtual items.</p>
      <p>By continuing to play after an update, you accept the updated version of the game and its rules.</p>

      <h3>14. Rule Violations</h3>
      <p>If a player breaks the rules, the game team may take action, including:</p>
      <ul>
        <li>Warning the player.</li>
        <li>Removing content.</li>
        <li>Limiting access to features.</li>
        <li>Suspending the account.</li>
        <li>Banning the account permanently.</li>
        <li>Removing virtual items, rewards, or progress gained unfairly.</li>
        <li>Blocking payments or promotional features.</li>
      </ul>
      <p>Serious violations may lead to immediate suspension or permanent removal.</p>

      <h3>15. Reporting Problems</h3>
      <p>Players can report inappropriate behavior, bugs, cheating, offensive content, payment issues, or technical problems through the official support system.</p>
      <p>False reports, repeated spam reports, or abuse of the reporting system are not allowed.</p>

      <h3>16. Final Decision</h3>
      <p>The game team has the right to interpret and apply these rules to protect the game, the players, and the community. The purpose of these rules is to keep the game fair, safe, respectful, and enjoyable for everyone.</p>

      <h3>17. Contact</h3>
      <p>Support: <a href="mailto:[support email]">[support email]</a></p>
      <p>Website: <a href="[website link]">[website link]</a></p>
      <p>Company: [company name]</p>
    </div>
  `;

  ov.appendChild(sheet);
  document.body.appendChild(ov);
  document.getElementById('sp-rules-close').addEventListener('click', _hideRules);
}

function _showRules() {
  document.getElementById('sp-rules-overlay')?.classList.add('open');
  const body = document.getElementById('sp-rules-body');
  if (body) body.scrollTop = 0;
}

function _hideRules() {
  document.getElementById('sp-rules-overlay')?.classList.remove('open');
}
