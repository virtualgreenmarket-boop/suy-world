// Character management / inventory panel.
// Shows equippable items from the ithappy Separate_assets_glb collection,
// categorised by slot. Uses localStorage to persist current loadout.

const STORAGE_KEY = 'suy_loadout';

// ── Item catalogue (from /models/characters/ithappy/Separate_assets_glb/) ──

const CATEGORIES = {
  'Hair':     ['Hairstyle_male_010.glb', 'Hairstyle_male_012.glb'],
  'Hat':      ['Hat_010.glb', 'Hat_049.glb', 'Hat_057.glb'],
  'Glasses':  ['Glasses_004.glb', 'Glasses_006.glb'],
  'Shirt':    ['T-Shirt_009.glb'],
  'Outwear':  ['Outwear_029.glb', 'Outwear_036.glb'],
  'Pants':    ['Pants_010.glb', 'Pants_014.glb'],
  'Shorts':   ['Shorts_003.glb'],
  'Shoes':    ['Shoe_Sneakers_009.glb', 'Shoe_Slippers_002.glb', 'Shoe_Slippers_005.glb'],
  'Gloves':   ['Gloves_006.glb', 'Gloves_014.glb'],
  'Costume':  ['Costume_6_001.glb', 'Costume_10_001.glb'],
  'Extra':    ['Headphones_002.glb', 'Moustache_001.glb', 'Moustache_002.glb', 'Pacifier_001.glb', 'Clown_nose_001.glb', 'Socks_008.glb'],
  'Emotion':  ['Male_emotion_happy_002.glb', 'Male_emotion_angry_003.glb', 'Male_emotion_usual_001.glb'],
};

const _BASE = '/models/characters/ithappy/Separate_assets_glb/';

let _loadout = _loadSaved();
let _visible = false;
let _panel = null;
let _onEquip = null; // external callback(category, filename|null)

function _loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function _saveCurrent() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_loadout));
}

export function getLoadout() { return { ..._loadout }; }

export function onEquipChange(cb) { _onEquip = cb; }

// ── Init ──────────────────────────────────────────────────────────────

export function initInventoryPanel() {
  _buildPanel();
}

function _buildPanel() {
  const style = document.createElement('style');
  style.textContent = `
    #inv-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.60);
      z-index: 310; display: none;
      justify-content: flex-end;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    #inv-overlay.inv-open { display: flex; }
    #inv-panel {
      width: min(380px, 92vw); height: 100dvh;
      background: rgba(12,12,24,0.98);
      border-left: 1px solid rgba(255,255,255,0.10);
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    #inv-header {
      padding: 20px 20px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    #inv-header h2 { margin: 0; font-size: 17px; font-weight: 700; color: #fff; }
    #inv-close {
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(255,255,255,0.10); border: none; color: #fff;
      font-size: 16px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    #inv-close:hover { background: rgba(255,255,255,0.20); }
    #inv-body {
      overflow-y: auto; flex: 1; padding: 16px 16px 24px;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
    }
    .inv-cat-label {
      font-size: 11px; font-weight: 700; letter-spacing: 1px;
      color: rgba(255,255,255,0.40); text-transform: uppercase;
      margin: 18px 0 8px 2px;
    }
    .inv-cat-label:first-child { margin-top: 4px; }
    .inv-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .inv-item {
      background: rgba(255,255,255,0.07);
      border: 1.5px solid rgba(255,255,255,0.10);
      border-radius: 10px; padding: 10px 6px 8px;
      cursor: pointer; text-align: center;
      transition: all 0.15s;
    }
    .inv-item:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.22); }
    .inv-item.equipped { background: rgba(124,106,247,0.22); border-color: #7c6af7; }
    .inv-item .inv-icon { font-size: 24px; display: block; margin-bottom: 4px; }
    .inv-item .inv-name {
      font-size: 10px; color: rgba(255,255,255,0.60); word-break: break-word;
      line-height: 1.3;
    }
    .inv-item.equipped .inv-name { color: #c4b8ff; }
    .inv-none-btn {
      background: rgba(255,255,255,0.05);
      border: 1.5px dashed rgba(255,255,255,0.15);
      border-radius: 10px; padding: 8px 6px;
      cursor: pointer; text-align: center;
      color: rgba(255,255,255,0.30); font-size: 11px;
      transition: all 0.15s;
    }
    .inv-none-btn:hover { border-color: rgba(255,255,255,0.30); color: rgba(255,255,255,0.50); }
    .inv-none-btn.equipped { border-color: #7c6af7; color: #c4b8ff; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'inv-overlay';

  _panel = document.createElement('div');
  _panel.id = 'inv-panel';

  const header = document.createElement('div');
  header.id = 'inv-header';
  header.innerHTML = '<h2>🎒 Character</h2>';
  const closeBtn = document.createElement('button');
  closeBtn.id = 'inv-close'; closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', hideInventoryPanel);
  header.appendChild(closeBtn);
  _panel.appendChild(header);

  const body = document.createElement('div');
  body.id = 'inv-body';

  // Build category sections
  const ICONS = {
    Hair: '💇', Hat: '🎩', Glasses: '🕶', Shirt: '👕', Outwear: '🧥',
    Pants: '👖', Shorts: '🩳', Shoes: '👟', Gloves: '🧤',
    Costume: '🎭', Extra: '✨', Emotion: '😊',
  };

  for (const [cat, files] of Object.entries(CATEGORIES)) {
    const catLabel = document.createElement('div');
    catLabel.className = 'inv-cat-label';
    catLabel.textContent = cat;
    body.appendChild(catLabel);

    const grid = document.createElement('div');
    grid.className = 'inv-grid';

    // "None" button to unequip
    const noneBtn = document.createElement('div');
    noneBtn.className = 'inv-none-btn' + (_loadout[cat] === null ? ' equipped' : '');
    noneBtn.textContent = '— None —';
    noneBtn.addEventListener('click', () => {
      _equip(cat, null);
      _refreshGrid(cat, grid, noneBtn);
    });
    grid.appendChild(noneBtn);

    for (const file of files) {
      const item = _makeItemEl(cat, file, ICONS[cat] ?? '📦');
      grid.appendChild(item);
    }

    body.appendChild(grid);
  }

  _panel.appendChild(body);
  overlay.appendChild(_panel);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) hideInventoryPanel(); });
}

function _makeItemEl(cat, file, icon) {
  const name = file.replace('.glb', '').replace(/_/g, ' ');
  const item = document.createElement('div');
  item.className = 'inv-item' + (_loadout[cat] === file ? ' equipped' : '');
  item.dataset.cat  = cat;
  item.dataset.file = file;
  item.innerHTML = `<span class="inv-icon">${icon}</span><span class="inv-name">${name}</span>`;
  item.addEventListener('click', () => {
    const same = _loadout[cat] === file;
    _equip(cat, same ? null : file);
    const grid = item.parentElement;
    _refreshGrid(cat, grid, grid.firstElementChild);
  });
  return item;
}

function _refreshGrid(cat, grid, noneBtn) {
  noneBtn.classList.toggle('equipped', _loadout[cat] == null);
  grid.querySelectorAll('.inv-item').forEach(el => {
    el.classList.toggle('equipped', el.dataset.file === _loadout[cat]);
  });
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
