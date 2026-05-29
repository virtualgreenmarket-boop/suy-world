// Character inventory panel — game-bag style UI

const STORAGE_KEY = 'suy_loadout_v8';

const DEFAULT_LOADOUT = {
  Body:     'Body_010.glb',
  Emotions: 'Male_emotion_usual_001.glb',
  Shirt:    'T-Shirt_009.glb',
  Pants:    'Pants_014.glb',
  Shoes:    'Shoe_Slippers_002.glb',
};

const SECTIONS = {
  Outfit: {
    label: 'Outfit',
    icon: '👔',
    categories: {
      'Shirt':    { icon: '👕', items: ['T-Shirt_009.glb'] },
      'Outwear':  { icon: '🧥', items: ['Outwear_029.glb', 'Outwear_036.glb'] },
      'Costume':  { icon: '🎭', items: ['Costume_6_001.glb', 'Costume_10_001.glb'] },
      'Pants':    { icon: '👖', items: ['Pants_010.glb', 'Pants_014.glb'] },
      'Shorts':   { icon: '🩳', items: ['Shorts_003.glb'] },
      'Shoes':    { icon: '👟', items: ['Shoe_Sneakers_009.glb', 'Shoe_Slippers_002.glb', 'Shoe_Slippers_005.glb'] },
      'Socks':    { icon: '🧦', items: ['Socks_008.glb'] },
      'Gloves':   { icon: '🧤', items: ['Gloves_006.glb', 'Gloves_014.glb'] },
    },
  },
  Accessories: {
    label: 'Accessories',
    icon: '💎',
    categories: {
      'Hair':       { icon: '💇', items: ['Hairstyle_male_010.glb', 'Hairstyle_male_012.glb'] },
      'Hat':        { icon: '🎩', items: ['Hat_010.glb', 'Hat_049.glb', 'Hat_057.glb'] },
      'Glasses':    { icon: '🕶️', items: ['Glasses_004.glb', 'Glasses_006.glb'] },
      'Headphones': { icon: '🎧', items: ['Headphones_002.glb'] },
      'Face':       { icon: '🥸', items: ['Moustache_001.glb', 'Moustache_002.glb', 'Clown_nose_001.glb', 'Pacifier_001.glb'] },
      'Jewelry':    { icon: '💍', items: [], placeholders: ['Necklace', 'Bracelet', 'Ring', 'Watch'] },
      'Bags':       { icon: '👜', items: [], placeholders: ['Backpack', 'Shoulder Bag', 'Handbag', 'Fanny Pack'] },
    },
  },
  Pets: {
    label: 'Pets & Companions',
    icon: '🐾',
    categories: {
      'Pets':            { icon: '🐶', items: [], placeholders: ['Dog', 'Cat', 'Rabbit', 'Dragon', 'Fox', 'Owl'] },
      'Pet Accessories': { icon: '🎀', items: [], placeholders: ['Collar', 'Leash', 'Outfit', 'Hat'] },
      'Pet Skins':       { icon: '🎨', items: [], placeholders: ['Fur Color', 'Pattern', 'Glow', 'Glitter'] },
    },
  },
  Profile: {
    label: 'Profile & Identity',
    icon: '🪪',
    categories: {
      'Emotions':  { icon: '😄', items: ['Male_emotion_happy_002.glb', 'Male_emotion_usual_001.glb', 'Male_emotion_angry_003.glb'] },
      'Body':      { icon: '🧍', items: ['Body_010.glb'] },
      'Badges':    { icon: '🏅', items: [], placeholders: ['Starter', 'Explorer', 'VIP', 'Creator', 'Legend'] },
      'Nameplate': { icon: '🔤', items: [], placeholders: ['Classic', 'Gold', 'Neon', 'Diamond'] },
      'Chat Skin': { icon: '💬', items: [], placeholders: ['Default', 'Bubble', 'Retro', 'Minimal'] },
    },
  },
  Vehicles: {
    label: 'Vehicles',
    icon: '🛹',
    categories: {
      'Hoverboard': { icon: '🛹', items: [], placeholders: ['Classic Board', 'Neon Board', 'Flame Board', 'Ice Board'] },
      'Bike':       { icon: '🚲', items: [], placeholders: ['City Bike', 'Mountain Bike', 'Electric Bike'] },
    },
  },
};

let _loadout        = _loadSaved();
let _visible        = false;
let _onEquip        = null;
let _activeSection  = 'Outfit';
let _activeCategory = null; // null = list view, string = grid view
let _gridArea       = null;
let _equippedStrip  = null;

function _loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_LOADOUT, ...JSON.parse(raw) };
  } catch {}
  const def = { ...DEFAULT_LOADOUT };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
  return def;
}

function _saveCurrent() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_loadout));
}

export function getLoadout() { return { ..._loadout }; }
export function getDefaultLoadout() { return { ...DEFAULT_LOADOUT }; }
export function onEquipChange(cb) { _onEquip = cb; }

// ── Init ──────────────────────────────────────────────────────────────────

export function initInventoryPanel() {
  _buildPanel();
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && _visible) {
      if (_activeCategory !== null) {
        _activeCategory = null;
        _renderBody();
      } else {
        hideInventoryPanel();
      }
    }
  });
}

// ── Build DOM ─────────────────────────────────────────────────────────────

function _buildPanel() {
  const style = document.createElement('style');
  style.textContent = `
    #inv-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      z-index: 310; display: none;
      align-items: flex-end; justify-content: center;
      font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
    }
    #inv-overlay.inv-open { display: flex; }

    #inv-panel {
      width: 100%; max-width: 480px; height: 92dvh;
      background: rgba(12,10,24,0.98);
      border: 1px solid rgba(255,200,80,0.12); border-bottom: none;
      border-radius: 24px 24px 0 0;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.7);
      animation: inv-slidein .28s cubic-bezier(.32,1,.45,1);
    }
    @keyframes inv-slidein {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    #inv-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.18);
      margin: 10px auto 0; flex-shrink: 0;
    }

    /* ── Header ── */
    #inv-header {
      display: flex; align-items: center; gap: 10px;
      padding: 0 16px; height: 50px; flex-shrink: 0;
      border-bottom: 1px solid rgba(255,200,80,0.10);
    }
    #inv-header-icon { font-size: 22px; }
    #inv-header h2 {
      flex: 1; margin: 0; font-size: 17px; font-weight: 700;
      color: rgba(255,255,255,0.95); letter-spacing: -.01em;
    }
    #inv-equipped-count {
      font-size: 11px; color: rgba(255,200,80,0.7);
      background: rgba(255,200,80,0.1); border: 1px solid rgba(255,200,80,0.2);
      border-radius: 20px; padding: 3px 10px; font-weight: 600;
    }
    #inv-clear-all {
      font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
      color: rgba(255,80,80,0.65); background: rgba(255,80,80,0.08);
      border: 1px solid rgba(255,80,80,0.18); border-radius: 20px;
      padding: 3px 9px; cursor: pointer; transition: all .15s; white-space: nowrap;
      font-family: inherit;
    }
    #inv-clear-all:hover { background: rgba(255,80,80,0.18); color: rgba(255,100,100,0.95); border-color: rgba(255,80,80,0.4); }
    #inv-close {
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.6);
      font-size: 14px; cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: background .15s;
    }
    #inv-close:hover { background: rgba(255,255,255,0.16); }

    /* ── Section pills (4-col grid) ── */
    #inv-sections {
      display: grid; grid-template-columns: repeat(5, 1fr);
      gap: 6px; padding: 10px 14px 0; flex-shrink: 0;
    }
    .inv-section-pill {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; padding: 8px 4px; border-radius: 12px;
      border: 1.5px solid rgba(255,255,255,0.10);
      background: transparent; color: rgba(255,255,255,0.45);
      font-family: inherit; cursor: pointer; transition: all .18s;
    }
    .inv-section-icon { font-size: 20px; line-height: 1; }
    .inv-section-label { font-size: 10px; font-weight: 700; white-space: nowrap; }
    .inv-section-pill.active { background: rgba(124,106,247,0.22); border-color: #7c6af7; color: #c4b8ff; }
    .inv-section-pill:hover:not(.active) { border-color: rgba(255,255,255,0.22); color: rgba(255,255,255,0.65); }

    .inv-sep {
      height: 1px; background: rgba(255,200,80,0.08);
      margin: 10px 14px 0; flex-shrink: 0;
    }

    /* ── Scrollable body ── */
    #inv-body {
      flex: 1; overflow-y: auto; padding: 12px 14px 32px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }

    /* ── Category list ── */
    .inv-cat-list { display: flex; flex-direction: column; gap: 6px; }
    .inv-cat-row {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 14px; border-radius: 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      cursor: pointer; transition: all .15s;
    }
    .inv-cat-row:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
    .inv-cat-row-iconbox {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      background: rgba(124,106,247,0.14);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .inv-cat-row-info { flex: 1; min-width: 0; }
    .inv-cat-row-name {
      font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9);
    }
    .inv-cat-row-sub {
      font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 2px;
    }
    .inv-cat-row-equipped-badge {
      font-size: 10px; font-weight: 700; color: #f59e0b;
      background: rgba(245,158,11,0.12); border-radius: 20px; padding: 2px 9px;
      flex-shrink: 0;
    }
    .inv-cat-row-chevron { color: rgba(255,255,255,0.2); font-size: 15px; flex-shrink: 0; }

    /* ── Back button ── */
    .inv-back-row {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 14px; padding: 6px 2px;
      background: none; border: none; color: rgba(255,255,255,0.5);
      font-family: inherit; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: color .15s;
    }
    .inv-back-row:hover { color: rgba(255,255,255,0.85); }

    /* ── Grid header (inside body) ── */
    .inv-cat-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .inv-cat-header-icon { font-size: 20px; }
    .inv-cat-header-name { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); }
    .inv-cat-header-count { font-size: 11px; color: rgba(255,255,255,0.35); }

    /* ── Item grid ── */
    .inv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

    .inv-slot {
      position: relative; aspect-ratio: 1;
      background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.09);
      border-radius: 14px; cursor: pointer; text-align: center;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 5px;
      padding: 8px 4px 6px; transition: all .15s;
    }
    .inv-slot:hover { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.22); }
    .inv-slot.equipped {
      background: rgba(124,106,247,0.18); border-color: #7c6af7;
      box-shadow: 0 0 12px rgba(124,106,247,0.25);
    }
    .inv-slot-icon { font-size: 26px; line-height: 1; }
    .inv-slot-name {
      font-size: 9px; color: rgba(255,255,255,0.45);
      line-height: 1.2; word-break: break-word; text-align: center; max-width: 100%;
    }
    .inv-slot.equipped .inv-slot-name { color: #c4b8ff; }

    .inv-badge {
      position: absolute; top: 5px; right: 5px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #7c6af7; color: #fff; font-size: 9px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }

    .inv-slot-none {
      aspect-ratio: 1; background: transparent;
      border: 1.5px dashed rgba(255,255,255,0.12); border-radius: 14px;
      cursor: pointer; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 3px;
      padding: 8px 4px; transition: all .15s;
      color: rgba(255,255,255,0.25); font-size: 10px; font-weight: 600;
    }
    .inv-slot-none:hover { border-color: rgba(255,255,255,0.28); color: rgba(255,255,255,0.45); }
    .inv-slot-none.equipped {
      border-color: #7c6af7; color: #c4b8ff; background: rgba(124,106,247,0.10);
    }
    .inv-slot-none-icon { font-size: 18px; opacity: .4; }

    /* ── Locked / coming-soon slot ── */
    .inv-slot-locked {
      aspect-ratio: 1; background: rgba(255,255,255,0.02);
      border: 1.5px dashed rgba(255,255,255,0.07); border-radius: 14px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px;
      padding: 8px 4px 6px; cursor: default; user-select: none;
    }
    .inv-slot-locked-icon { font-size: 22px; line-height: 1; opacity: .22; }
    .inv-slot-locked-name {
      font-size: 9px; color: rgba(255,255,255,0.22);
      line-height: 1.2; word-break: break-word; text-align: center; max-width: 100%;
    }
    .inv-slot-locked-soon {
      font-size: 8px; font-weight: 700; letter-spacing: 0.5px;
      color: rgba(255,200,80,0.28); text-transform: uppercase;
    }

    /* ── Paper doll ── */
    #inv-wearing-wrap {
      padding: 10px 14px 6px; flex-shrink: 0;
    }
    #inv-wearing-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
      text-transform: uppercase; color: rgba(255,200,80,0.55);
      margin-bottom: 8px;
    }
    #inv-doll {
      display: flex; gap: 10px; align-items: flex-start;
    }
    #inv-doll-figure { flex-shrink: 0; }
    #inv-doll-zones {
      flex: 1; display: flex; flex-direction: column; gap: 5px;
    }
    .inv-zone {
      border-radius: 10px; padding: 5px 8px 6px;
      background: rgba(255,255,255,0.03);
      border-left: 3px solid transparent;
    }
    .inv-zone-label {
      font-size: 9px; font-weight: 800; letter-spacing: 0.7px;
      text-transform: uppercase; margin-bottom: 5px;
    }
    .inv-zone-slots { display: flex; flex-wrap: wrap; gap: 4px; }
    .inv-zone-slot {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 7px; border-radius: 7px;
      border: 1px dashed rgba(255,255,255,0.13);
      background: none; cursor: pointer; transition: all .15s;
      font-family: inherit;
    }
    .inv-zone-slot:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.25); }
    .inv-zone-slot.on {
      border-style: solid; border-color: rgba(255,200,80,0.42);
      background: rgba(255,200,80,0.09);
    }
    .inv-zone-slot.on:hover { background: rgba(255,200,80,0.17); }
    .inv-zone-slot-icon { font-size: 13px; line-height: 1; flex-shrink: 0; }
    .inv-zone-slot-name {
      font-size: 10px; font-weight: 600; max-width: 72px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      color: rgba(255,255,255,0.28);
    }
    .inv-zone-slot.on .inv-zone-slot-name { color: rgba(255,215,90,0.92); }
    .inv-zone-remove {
      background: none; border: none; cursor: pointer; padding: 0;
      color: rgba(255,200,80,0.38); font-size: 9px; flex-shrink: 0;
      line-height: 1; transition: color .15s;
    }
    .inv-zone-remove:hover { color: rgba(255,60,60,0.90); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'inv-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) hideInventoryPanel(); });
  overlay.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  overlay.addEventListener('pointerdown', e => e.stopPropagation());
  overlay.addEventListener('pointermove', e => e.stopPropagation());

  const panel = document.createElement('div');
  panel.id = 'inv-panel';

  // Handle
  const handle = document.createElement('div');
  handle.id = 'inv-handle';
  panel.appendChild(handle);

  // Header
  const header = document.createElement('div');
  header.id = 'inv-header';
  const headerIcon = document.createElement('span');
  headerIcon.id = 'inv-header-icon';
  headerIcon.innerHTML = `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 13 C11 7 21 7 21 13" stroke="#5C2D0E" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="3" y="13" width="26" height="17" rx="5" fill="#8B4513"/>
    <rect x="3" y="24" width="26" height="6" rx="5" fill="#7A3C10"/>
    <path d="M3 20 L3 16 Q3 13 7 13 L25 13 Q29 13 29 16 L29 20 Q29 24 16 24 Q3 24 3 20Z" fill="#9E5520"/>
    <path d="M4 20.5 Q16 25 28 20.5" fill="none" stroke="#7A3C10" stroke-width="1" opacity="0.5"/>
    <path d="M6 16 Q16 17.5 26 16" fill="none" stroke="#7A3F18" stroke-width="0.8" stroke-dasharray="2,1.5" opacity="0.7"/>
    <rect x="12" y="20" width="8" height="5.5" rx="1.5" fill="#C8861A" stroke="#9B6515" stroke-width="1"/>
    <rect x="14" y="21.5" width="4" height="2.5" rx="0.8" fill="#9B6515"/>
    <circle cx="7.5" cy="21" r="1.4" fill="#C8861A" stroke="#9B6515" stroke-width="0.7"/>
    <circle cx="24.5" cy="21" r="1.4" fill="#C8861A" stroke="#9B6515" stroke-width="0.7"/>
    <rect x="5" y="15" width="22" height="13" rx="3.5" fill="none" stroke="#7A3F18" stroke-width="0.7" stroke-dasharray="2,2" opacity="0.3"/>
  </svg>`;
  const headerTitle = document.createElement('h2');
  headerTitle.textContent = 'Bag';
  const equippedCount = document.createElement('span');
  equippedCount.id = 'inv-equipped-count';
  equippedCount.textContent = _equippedCount() + ' equipped';
  const clearAllBtn = document.createElement('button');
  clearAllBtn.id = 'inv-clear-all';
  clearAllBtn.textContent = 'Clear all';
  clearAllBtn.addEventListener('click', () => {
    for (const sec of Object.values(SECTIONS)) {
      for (const cat of Object.keys(sec.categories)) {
        _equip(cat, null);
      }
    }
    _renderEquipped();
    _renderBody();
    panel._countEl.textContent = '0 equipped';
  });

  const closeBtn = document.createElement('button');
  closeBtn.id = 'inv-close'; closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', hideInventoryPanel);
  header.append(headerIcon, headerTitle, equippedCount, clearAllBtn, closeBtn);
  panel.appendChild(header);

  // Currently-wearing strip
  const wearingWrap = document.createElement('div');
  wearingWrap.id = 'inv-wearing-wrap';
  const wearingLabel = document.createElement('div');
  wearingLabel.id = 'inv-wearing-label';
  wearingLabel.textContent = 'Currently wearing';
  const wearingChips = document.createElement('div');
  wearingChips.id = 'inv-wearing-chips';
  wearingWrap.append(wearingLabel, wearingChips);
  panel.appendChild(wearingWrap);
  _equippedStrip = wearingChips;

  // Section pills
  const sectionsRow = document.createElement('div');
  sectionsRow.id = 'inv-sections';
  const sectionEls = {};

  for (const [secKey, { icon }] of Object.entries(SECTIONS)) {
    const pill = document.createElement('button');
    pill.className = 'inv-section-pill' + (secKey === _activeSection ? ' active' : '');
    pill.dataset.section = secKey;
    pill.innerHTML = `<span class="inv-section-icon">${icon}</span><span class="inv-section-label">${secKey}</span>`;
    pill.addEventListener('click', () => {
      if (_activeSection === secKey) return;
      _activeSection = secKey;
      _activeCategory = null;
      Object.values(sectionEls).forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      _renderBody();
    });
    sectionEls[secKey] = pill;
    sectionsRow.appendChild(pill);
  }
  panel.appendChild(sectionsRow);

  const sep = document.createElement('div');
  sep.className = 'inv-sep';
  panel.appendChild(sep);

  // Body
  const body = document.createElement('div');
  body.id = 'inv-body';
  _gridArea = document.createElement('div');
  body.appendChild(_gridArea);
  panel.appendChild(body);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  panel._countEl = equippedCount;

  _renderEquipped();
  _renderBody();
}

// ── Paper doll ────────────────────────────────────────────────────────────

function _getCatIcon(cat) {
  for (const sec of Object.values(SECTIONS)) {
    if (sec.categories[cat]) return sec.categories[cat].icon;
  }
  return '👜';
}

function _findSection(cat) {
  for (const [key, sec] of Object.entries(SECTIONS)) {
    if (sec.categories[cat]) return key;
  }
  return null;
}

function _renderEquipped() {
  if (!_equippedStrip) return;
  _equippedStrip.innerHTML = '';

  const ZONES = [
    { label: 'Head',       color: '#6B8FF8', cats: ['Hair', 'Hat', 'Glasses', 'Face', 'Headphones'] },
    { label: 'Body',       color: '#5BD4B0', cats: ['Shirt', 'Outwear', 'Costume', 'Gloves'] },
    { label: 'Lower Body', color: '#F0A050', cats: ['Pants', 'Shorts', 'Socks'] },
    { label: 'Feet',       color: '#B07EF0', cats: ['Shoes'] },
  ];

  const _unequip = (cat) => {
    _equip(cat, null);
    _renderEquipped();
    _renderBody();
    const panel = document.getElementById('inv-panel');
    if (panel?._countEl) panel._countEl.textContent = _equippedCount() + ' equipped';
  };

  const _goTo = (cat) => {
    const sec = _findSection(cat);
    if (!sec) return;
    _activeSection = sec;
    _activeCategory = cat;
    document.querySelectorAll('.inv-section-pill').forEach(p =>
      p.classList.toggle('active', p.dataset.section === sec)
    );
    _renderBody();
  };

  const doll = document.createElement('div');
  doll.id = 'inv-doll';

  // ── Body silhouette SVG with 4 colour-coded zones ──
  const figure = document.createElement('div');
  figure.id = 'inv-doll-figure';
  figure.innerHTML = `<svg viewBox="0 0 70 210" width="72" height="216" xmlns="http://www.w3.org/2000/svg">
    <!-- HEAD zone -->
    <circle cx="35" cy="17" r="14" fill="rgba(107,143,248,0.14)" stroke="#6B8FF8" stroke-width="1.8" stroke-opacity="0.55"/>
    <rect x="31" y="30" width="8" height="7" rx="2" fill="rgba(107,143,248,0.10)"/>
    <!-- BODY zone -->
    <path d="M18 37 Q35 33 52 37 L49 92 Q35 95 21 92 Z" fill="rgba(91,212,176,0.13)" stroke="#5BD4B0" stroke-width="1.8" stroke-opacity="0.50"/>
    <path d="M18 40 L6 80 Q4 85 9 86 L20 50" fill="rgba(91,212,176,0.09)" stroke="#5BD4B0" stroke-width="1.6" stroke-opacity="0.40" stroke-linejoin="round"/>
    <path d="M52 40 L64 80 Q66 85 61 86 L50 50" fill="rgba(91,212,176,0.09)" stroke="#5BD4B0" stroke-width="1.6" stroke-opacity="0.40" stroke-linejoin="round"/>
    <!-- LOWER BODY zone -->
    <path d="M21 92 L18 140 Q17 145 22 145 L31 145 Q34 145 34 140 L35 92" fill="rgba(240,160,80,0.12)" stroke="#F0A050" stroke-width="1.8" stroke-opacity="0.48"/>
    <path d="M49 92 L52 140 Q53 145 48 145 L39 145 Q36 145 36 140 L35 92" fill="rgba(240,160,80,0.12)" stroke="#F0A050" stroke-width="1.8" stroke-opacity="0.48"/>
    <!-- FEET zone -->
    <path d="M22 143 L19 178 Q18 183 23 183 L30 183 Q33 183 33 178 L31 143" fill="rgba(176,126,240,0.11)" stroke="#B07EF0" stroke-width="1.8" stroke-opacity="0.45"/>
    <path d="M48 143 L51 178 Q52 183 47 183 L40 183 Q37 183 37 178 L39 143" fill="rgba(176,126,240,0.11)" stroke="#B07EF0" stroke-width="1.8" stroke-opacity="0.45"/>
    <path d="M15 179 Q10 179 9 184 L9 191 Q9 194 14 194 L29 194 Q32 193 31 189 L31 179" fill="rgba(176,126,240,0.14)" stroke="#B07EF0" stroke-width="1.8" stroke-opacity="0.50"/>
    <path d="M55 179 Q60 179 61 184 L61 191 Q61 194 56 194 L41 194 Q38 193 39 189 L39 179" fill="rgba(176,126,240,0.14)" stroke="#B07EF0" stroke-width="1.8" stroke-opacity="0.50"/>
  </svg>`;

  // ── Right-side zone blocks ──
  const zonesEl = document.createElement('div');
  zonesEl.id = 'inv-doll-zones';

  for (const zone of ZONES) {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'inv-zone';
    zoneEl.style.borderLeftColor = zone.color + 'AA';

    const labelEl = document.createElement('div');
    labelEl.className = 'inv-zone-label';
    labelEl.style.color = zone.color;
    labelEl.textContent = zone.label;
    zoneEl.appendChild(labelEl);

    const slotsEl = document.createElement('div');
    slotsEl.className = 'inv-zone-slots';

    for (const cat of zone.cats) {
      const icon  = _getCatIcon(cat);
      const file  = _loadout[cat] ?? null;
      const label = file
        ? file.replace('.glb', '').replace(/_\d{1,3}$/, '').replace(/_/g, ' ')
        : cat;

      const slot = document.createElement('button');
      slot.className = 'inv-zone-slot' + (file ? ' on' : '');
      slot.type = 'button';
      slot.title = cat;

      const iconEl = document.createElement('span');
      iconEl.className = 'inv-zone-slot-icon';
      iconEl.textContent = icon;

      const nameEl = document.createElement('span');
      nameEl.className = 'inv-zone-slot-name';
      nameEl.textContent = label;

      slot.append(iconEl, nameEl);

      if (file) {
        const rm = document.createElement('button');
        rm.className = 'inv-zone-remove';
        rm.textContent = '✕';
        rm.type = 'button';
        rm.addEventListener('click', e => { e.stopPropagation(); _unequip(cat); });
        slot.appendChild(rm);
      }

      slot.addEventListener('click', () => _goTo(cat));
      slotsEl.appendChild(slot);
    }

    zoneEl.appendChild(slotsEl);
    zonesEl.appendChild(zoneEl);
  }

  doll.append(figure, zonesEl);
  _equippedStrip.appendChild(doll);
}

// ── Render body (list or grid) ─────────────────────────────────────────────

function _renderBody() {
  if (_activeCategory === null) {
    _renderList();
  } else {
    _renderGrid();
  }
}

function _renderList() {
  _gridArea.innerHTML = '';
  const cats = SECTIONS[_activeSection].categories;

  const list = document.createElement('div');
  list.className = 'inv-cat-list';

  for (const [cat, { icon, items, placeholders }] of Object.entries(cats)) {
    const row = document.createElement('button');
    row.className = 'inv-cat-row';

    const iconBox = document.createElement('div');
    iconBox.className = 'inv-cat-row-iconbox';
    iconBox.textContent = icon;

    const info = document.createElement('div');
    info.className = 'inv-cat-row-info';

    const name = document.createElement('div');
    name.className = 'inv-cat-row-name';
    name.textContent = cat;

    const sub = document.createElement('div');
    sub.className = 'inv-cat-row-sub';
    if (items.length > 0) {
      sub.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
    } else if (placeholders?.length) {
      sub.textContent = 'Coming soon';
    } else {
      sub.textContent = 'Empty';
    }

    info.append(name, sub);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0';

    if (_loadout[cat]) {
      const badge = document.createElement('span');
      badge.className = 'inv-cat-row-equipped-badge';
      badge.textContent = 'Equipped';
      right.appendChild(badge);
    }

    const chevron = document.createElement('span');
    chevron.className = 'inv-cat-row-chevron';
    chevron.textContent = '›';
    right.appendChild(chevron);

    row.append(iconBox, info, right);
    row.addEventListener('click', () => {
      _activeCategory = cat;
      _renderBody();
    });

    list.appendChild(row);
  }

  _gridArea.appendChild(list);
}

function _renderGrid() {
  _gridArea.innerHTML = '';
  const { icon, items, placeholders } = SECTIONS[_activeSection].categories[_activeCategory];

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'inv-back-row';
  backBtn.innerHTML = `‹ <span style="margin-left:2px">${_activeCategory}</span>`;
  backBtn.addEventListener('click', () => {
    _activeCategory = null;
    _renderBody();
  });
  _gridArea.appendChild(backBtn);

  // Category header
  const catHeader = document.createElement('div');
  catHeader.className = 'inv-cat-header';
  catHeader.innerHTML = `
    <span class="inv-cat-header-icon">${icon}</span>
    <span class="inv-cat-header-name">${_activeCategory}</span>
    <span class="inv-cat-header-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>`;
  _gridArea.appendChild(catHeader);

  if (items.length === 0) {
    if (placeholders?.length) {
      const grid = document.createElement('div');
      grid.className = 'inv-grid';
      for (const pname of placeholders) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot-locked';
        slot.innerHTML = `
          <span class="inv-slot-locked-icon">${icon}</span>
          <span class="inv-slot-locked-name">${pname}</span>
          <span class="inv-slot-locked-soon">Soon</span>`;
        grid.appendChild(slot);
      }
      _gridArea.appendChild(grid);
    }
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'inv-grid';

  const noneSlot = document.createElement('div');
  noneSlot.className = 'inv-slot-none' + (_loadout[_activeCategory] == null ? ' equipped' : '');
  noneSlot.innerHTML = `<span class="inv-slot-none-icon">✕</span><span>None</span>`;
  noneSlot.addEventListener('click', () => { _equip(_activeCategory, null); _afterEquip(); });
  grid.appendChild(noneSlot);

  for (const file of items) grid.appendChild(_makeSlot(_activeCategory, file, icon));

  _gridArea.appendChild(grid);
}

function _makeSlot(cat, file, icon) {
  const name = file.replace('.glb', '').replace(/_\d{1,3}$/, '').replace(/_/g, ' ');
  const equipped = _loadout[cat] === file;

  const slot = document.createElement('div');
  slot.className = 'inv-slot' + (equipped ? ' equipped' : '');

  const iconEl = document.createElement('span');
  iconEl.className = 'inv-slot-icon';
  iconEl.textContent = icon;

  const nameEl = document.createElement('span');
  nameEl.className = 'inv-slot-name';
  nameEl.textContent = name;

  slot.append(iconEl, nameEl);

  if (equipped) {
    const badge = document.createElement('div');
    badge.className = 'inv-badge';
    badge.textContent = '✓';
    slot.appendChild(badge);
  }

  slot.addEventListener('click', () => {
    _equip(cat, _loadout[cat] === file ? null : file);
    _afterEquip();
  });

  return slot;
}

function _afterEquip() {
  _renderEquipped();
  _renderGrid();
  const panel = document.getElementById('inv-panel');
  if (panel?._countEl) panel._countEl.textContent = _equippedCount() + ' equipped';
}

function _equippedCount() {
  return Object.values(_loadout).filter(v => v != null).length;
}

function _equip(cat, file) {
  _loadout[cat] = file;
  _saveCurrent();
  if (_onEquip) _onEquip(cat, file);
}

export function showInventoryPanel() {
  document.getElementById('inv-overlay')?.classList.add('inv-open');
  _visible = true;
}

export function hideInventoryPanel() {
  document.getElementById('inv-overlay')?.classList.remove('inv-open');
  _visible = false;
}

export function toggleInventoryPanel() {
  _visible ? hideInventoryPanel() : showInventoryPanel();
}
