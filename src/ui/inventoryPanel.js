// Character inventory panel — game-bag style UI

const STORAGE_KEY = 'suy_loadout';

const CATEGORIES = {
  'Hair':    { icon: '💇', items: ['Hairstyle_male_010.glb', 'Hairstyle_male_012.glb'] },
  'Hat':     { icon: '🎩', items: ['Hat_010.glb', 'Hat_049.glb', 'Hat_057.glb'] },
  'Glasses': { icon: '🕶️', items: ['Glasses_004.glb', 'Glasses_006.glb'] },
  'Shirt':   { icon: '👕', items: ['T-Shirt_009.glb'] },
  'Outwear': { icon: '🧥', items: ['Outwear_029.glb', 'Outwear_036.glb'] },
  'Pants':   { icon: '👖', items: ['Pants_010.glb', 'Pants_014.glb'] },
  'Shorts':  { icon: '🩳', items: ['Shorts_003.glb'] },
  'Shoes':   { icon: '👟', items: ['Shoe_Sneakers_009.glb', 'Shoe_Slippers_002.glb', 'Shoe_Slippers_005.glb'] },
  'Gloves':  { icon: '🧤', items: ['Gloves_006.glb', 'Gloves_014.glb'] },
  'Costume': { icon: '🎭', items: ['Costume_6_001.glb', 'Costume_10_001.glb'] },
  'Extra':   { icon: '✨', items: ['Headphones_002.glb', 'Moustache_001.glb', 'Moustache_002.glb', 'Pacifier_001.glb', 'Clown_nose_001.glb', 'Socks_008.glb'] },
  'Emotion': { icon: '😊', items: ['Male_emotion_happy_002.glb', 'Male_emotion_angry_003.glb', 'Male_emotion_usual_001.glb'] },
};

let _loadout = _loadSaved();
let _visible  = false;
let _onEquip  = null;
let _activeCategory = Object.keys(CATEGORIES)[0];

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

// ── Init ──────────────────────────────────────────────────────────────────

export function initInventoryPanel() { _buildPanel(); }

function _buildPanel() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Overlay ── */
    #inv-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      z-index: 310; display: none;
      align-items: flex-end; justify-content: center;
      font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
    }
    #inv-overlay.inv-open { display: flex; }

    /* ── Panel ── */
    #inv-panel {
      width: 100%; max-width: 480px;
      height: 92dvh;
      background: rgba(12,10,24,0.98);
      border: 1px solid rgba(255,200,80,0.12);
      border-bottom: none;
      border-radius: 24px 24px 0 0;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.7);
      animation: inv-slidein .28s cubic-bezier(.32,1,.45,1);
    }
    @keyframes inv-slidein {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    /* ── Drag handle ── */
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
      background: rgba(255,200,80,0.1);
      border: 1px solid rgba(255,200,80,0.2);
      border-radius: 20px; padding: 3px 10px; font-weight: 600;
    }
    #inv-close {
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.6);
      font-size: 14px; cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: background .15s;
    }
    #inv-close:hover { background: rgba(255,255,255,0.16); }

    /* ── Category tabs ── */
    #inv-tabs {
      display: flex; gap: 6px;
      padding: 10px 14px 0;
      overflow-x: auto; flex-shrink: 0;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    #inv-tabs::-webkit-scrollbar { display: none; }
    .inv-tab {
      display: flex; align-items: center; gap: 5px;
      padding: 7px 12px; border-radius: 20px; flex-shrink: 0;
      border: 1.5px solid rgba(255,255,255,0.10);
      background: transparent; color: rgba(255,255,255,0.45);
      font-family: inherit; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all .18s; white-space: nowrap;
    }
    .inv-tab .inv-tab-icon { font-size: 14px; }
    .inv-tab.active {
      background: rgba(124,106,247,0.2);
      border-color: #7c6af7; color: #c4b8ff;
    }
    .inv-tab-equipped-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #f59e0b; flex-shrink: 0;
    }

    /* ── Separator ── */
    .inv-sep {
      height: 1px; background: rgba(255,200,80,0.08);
      margin: 10px 14px 0; flex-shrink: 0;
    }

    /* ── Body / grid ── */
    #inv-body {
      flex: 1; overflow-y: auto; padding: 14px 14px 32px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }

    /* ── Category header inside body ── */
    .inv-cat-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 12px;
    }
    .inv-cat-header-icon { font-size: 20px; }
    .inv-cat-header-name {
      font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9);
    }
    .inv-cat-header-count {
      font-size: 11px; color: rgba(255,255,255,0.35);
    }

    /* ── Item grid ── */
    .inv-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    }

    /* ── Item slot ── */
    .inv-slot {
      position: relative;
      aspect-ratio: 1;
      background: rgba(255,255,255,0.05);
      border: 1.5px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      cursor: pointer; text-align: center;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 5px;
      padding: 8px 4px 6px;
      transition: all .15s;
    }
    .inv-slot:hover {
      background: rgba(255,255,255,0.10);
      border-color: rgba(255,255,255,0.22);
    }
    .inv-slot.equipped {
      background: rgba(124,106,247,0.18);
      border-color: #7c6af7;
      box-shadow: 0 0 12px rgba(124,106,247,0.25);
    }
    .inv-slot-icon { font-size: 26px; line-height: 1; }
    .inv-slot-name {
      font-size: 9px; color: rgba(255,255,255,0.45);
      line-height: 1.2; word-break: break-word; text-align: center;
      max-width: 100%;
    }
    .inv-slot.equipped .inv-slot-name { color: #c4b8ff; }

    /* ── Equipped badge (✓ corner) ── */
    .inv-badge {
      position: absolute; top: 5px; right: 5px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #7c6af7; color: #fff;
      font-size: 9px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── None slot ── */
    .inv-slot-none {
      aspect-ratio: 1;
      background: transparent;
      border: 1.5px dashed rgba(255,255,255,0.12);
      border-radius: 14px;
      cursor: pointer; text-align: center;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 3px;
      padding: 8px 4px;
      transition: all .15s;
      color: rgba(255,255,255,0.25); font-size: 10px; font-weight: 600;
    }
    .inv-slot-none:hover { border-color: rgba(255,255,255,0.28); color: rgba(255,255,255,0.45); }
    .inv-slot-none.equipped {
      border-color: #7c6af7; color: #c4b8ff;
      background: rgba(124,106,247,0.10);
    }
    .inv-slot-none-icon { font-size: 18px; opacity: .4; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'inv-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) hideInventoryPanel(); });

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
  headerIcon.textContent = '🎒';
  const headerTitle = document.createElement('h2');
  headerTitle.textContent = 'Bag';
  const equippedCount = document.createElement('span');
  equippedCount.id = 'inv-equipped-count';
  equippedCount.textContent = _equippedCount() + ' equipped';
  const closeBtn = document.createElement('button');
  closeBtn.id = 'inv-close'; closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', hideInventoryPanel);
  header.append(headerIcon, headerTitle, equippedCount, closeBtn);
  panel.appendChild(header);

  // Category tabs
  const tabsRow = document.createElement('div');
  tabsRow.id = 'inv-tabs';
  const tabEls = {};

  for (const [cat, { icon }] of Object.entries(CATEGORIES)) {
    const tab = document.createElement('button');
    tab.className = 'inv-tab' + (cat === _activeCategory ? ' active' : '');
    tab.dataset.cat = cat;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'inv-tab-icon';
    iconSpan.textContent = icon;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = cat;
    tab.append(iconSpan, nameSpan);

    if (_loadout[cat]) {
      const dot = document.createElement('span');
      dot.className = 'inv-tab-equipped-dot';
      tab.appendChild(dot);
    }

    tab.addEventListener('click', () => {
      _activeCategory = cat;
      Object.values(tabEls).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _renderGrid(gridArea);
      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });

    tabEls[cat] = tab;
    tabsRow.appendChild(tab);
  }

  const sep = document.createElement('div');
  sep.className = 'inv-sep';

  panel.appendChild(tabsRow);
  panel.appendChild(sep);

  // Grid body
  const body = document.createElement('div');
  body.id = 'inv-body';
  const gridArea = document.createElement('div');
  body.appendChild(gridArea);
  panel.appendChild(body);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  _renderGrid(gridArea);

  // expose for refresh after equip
  panel._tabEls    = tabEls;
  panel._gridArea  = gridArea;
  panel._countEl   = equippedCount;
}

function _renderGrid(container) {
  container.innerHTML = '';
  const { icon, items } = CATEGORIES[_activeCategory];

  const catHeader = document.createElement('div');
  catHeader.className = 'inv-cat-header';
  catHeader.innerHTML = `
    <span class="inv-cat-header-icon">${icon}</span>
    <span class="inv-cat-header-name">${_activeCategory}</span>
    <span class="inv-cat-header-count">${items.length} items</span>`;
  container.appendChild(catHeader);

  const grid = document.createElement('div');
  grid.className = 'inv-grid';

  // None slot
  const noneSlot = document.createElement('div');
  noneSlot.className = 'inv-slot-none' + (_loadout[_activeCategory] == null ? ' equipped' : '');
  noneSlot.innerHTML = `<span class="inv-slot-none-icon">✕</span><span>None</span>`;
  noneSlot.addEventListener('click', () => {
    _equip(_activeCategory, null);
    _afterEquip(container);
  });
  grid.appendChild(noneSlot);

  for (const file of items) {
    const slot = _makeSlot(_activeCategory, file, icon);
    grid.appendChild(slot);
  }

  container.appendChild(grid);
}

function _makeSlot(cat, file, icon) {
  const name = file.replace('.glb', '').replace(/_/g, ' ');
  const equipped = _loadout[cat] === file;

  const slot = document.createElement('div');
  slot.className = 'inv-slot' + (equipped ? ' equipped' : '');
  slot.dataset.cat  = cat;
  slot.dataset.file = file;

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
    const isEquipped = _loadout[cat] === file;
    _equip(cat, isEquipped ? null : file);
    _afterEquip(slot.closest('#inv-body > div'));
  });

  return slot;
}

function _afterEquip(container) {
  const panel = document.getElementById('inv-panel');

  // refresh grid
  _renderGrid(container);

  // refresh tab dots
  for (const [cat, tabEl] of Object.entries(panel._tabEls)) {
    const dot = tabEl.querySelector('.inv-tab-equipped-dot');
    if (_loadout[cat]) {
      if (!dot) {
        const d = document.createElement('span');
        d.className = 'inv-tab-equipped-dot';
        tabEl.appendChild(d);
      }
    } else {
      dot?.remove();
    }
  }

  // refresh equipped count
  panel._countEl.textContent = _equippedCount() + ' equipped';
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
