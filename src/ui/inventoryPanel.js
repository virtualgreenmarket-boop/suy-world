// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Unified Bag (single inventory for the whole game)
// NEW UI: wide lagoon-glass bottom sheet, RTL Hebrew, colored sections,
// catalog-style rod/bait card renders. All original features preserved:
// loadout equip/unequip + persistence, paper-doll zones, clear all,
// fishing (equip rod / baits / caught fish + sell), Escape handling,
// and the 🎒 HUD button takeover (one bag).
// ═══════════════════════════════════════════════════════════════════════

import { isChatOpen } from './chatUI.js';
import { getPlayerInventory, getRodById, getFishById } from '../systems/fishing.js';
import { getSocket } from '../systems/multiplayer.js';

const STORAGE_KEY = 'suy_loadout_v8';

const DEFAULT_LOADOUT = {
  Body:     'Body_010.glb',
  Emotions: 'Male_emotion_usual_001.glb',
  Shirt:    'T-Shirt_009.glb',
  Pants:    'Pants_014.glb',
  Shoes:    'Shoe_Slippers_002.glb',
};

// Internal category keys stay in English (loadout compatibility);
// everything the player sees is Hebrew.
const CAT_HE = {
  Shirt: 'חולצות', Outwear: 'מעילים', Costume: 'תחפושות', Pants: 'מכנסיים',
  Shorts: 'שורטים', Shoes: 'נעליים', Socks: 'גרביים', Gloves: 'כפפות',
  Hair: 'שיער', Hat: 'כובעים', Glasses: 'משקפיים', Headphones: 'אוזניות',
  Face: 'פנים', Jewelry: 'תכשיטים', Bags: 'תיקים',
  Pets: 'חיות מחמד', 'Pet Accessories': 'אביזרי חיות', 'Pet Skins': 'מראה חיות',
  Emotions: 'הבעות', Body: 'גוף', Badges: 'תגים', Nameplate: 'שלט שם', 'Chat Skin': 'סקין צ׳אט',
  Hoverboard: 'הוברבורד', Bike: 'אופניים', Skateboard: 'סקייטבורד',
  Rods: 'חכות', Baits: 'פיתיונות', Caught: 'דגים',
};

const SECTIONS = {
  Outfit: {
    label: 'ביגוד', icon: '👕', accent: '#7ACB5E',
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
    label: 'אקססוריז', icon: '💎', accent: '#F0B429',
    categories: {
      'Hair':       { icon: '💇', items: ['Hairstyle_male_010.glb', 'Hairstyle_male_012.glb'] },
      'Hat':        { icon: '🎩', items: ['Hat_010.glb', 'Hat_049.glb', 'Hat_057.glb'] },
      'Glasses':    { icon: '🕶️', items: ['Glasses_004.glb', 'Glasses_006.glb'] },
      'Headphones': { icon: '🎧', items: ['Headphones_002.glb'] },
      'Face':       { icon: '🥸', items: ['Moustache_001.glb', 'Moustache_002.glb', 'Clown_nose_001.glb', 'Pacifier_001.glb'] },
      'Jewelry':    { icon: '💍', items: [], placeholders: ['שרשרת', 'צמיד', 'טבעת', 'שעון'] },
      'Bags':       { icon: '👜', items: [], placeholders: ['תיק גב', 'תיק צד', 'פאוץ׳'] },
    },
  },
  Pets: {
    label: 'חיות', icon: '🐾', accent: '#FF9E7D',
    categories: {
      'Pets':            { icon: '🐶', items: [], placeholders: ['כלב', 'חתול', 'ארנב', 'דרקון', 'שועל', 'ינשוף'] },
      'Pet Accessories': { icon: '🎀', items: [], placeholders: ['קולר', 'רצועה', 'תלבושת', 'כובע'] },
      'Pet Skins':       { icon: '🎨', items: [], placeholders: ['צבע פרווה', 'דוגמה', 'זוהר', 'נצנצים'] },
    },
  },
  Vehicles: {
    label: 'רכבים', icon: '🛹', accent: '#BA68C8',
    categories: {
     'Hoverboard': { icon: _hoverboardSVG(30), items: [], placeholders: ['קלאסי', 'ניאון', 'להבות', 'קרח'] },
      'Bike':       { icon: '🚲', items: [], placeholders: ['עירוניים', 'הרים', 'חשמליים'] },
      'Skateboard': { icon: '🛹', items: [], placeholders: ['קלאסי', 'גרפיטי', 'עץ', 'ניאון'] },
    },
  },
  Fishing: {
    label: 'כלי דייג', icon: '🎣', accent: '#2BB3BD',
    categories: {
      'Rods':   { icon: '🎣', items: [], dynamic: true },
      'Baits':  { icon: '🪱', items: [], dynamic: true },
      'Caught': { icon: '🐟', items: [], dynamic: true },
    },
  },
};

// ── Fishing display metadata (matches the shop catalog) ───────────────

const ROD_META = {
  wood:       { tierHe: 'בסיסית',  capColor: '#7ACB5E', main: '#C98F14', light: '#E0AA2E', dark: '#8A6210' },
  fiberglass: { tierHe: 'משופרת',  capColor: '#4A90D9', main: '#C9D4D8', light: '#EDF2F4', dark: '#95A6AD' },
  carbon:     { tierHe: 'מקצועית', capColor: '#BA68C8', main: '#1C3A40', light: '#2E525A', dark: '#0D2428', bands: '#2BB3BD' },
  golden:     { tierHe: 'אגדית',   capColor: '#F0B429', main: '#F0B429', light: '#FFDD75', dark: '#C07E0C', sparkle: true }
};

const BAIT_META = {
  worm:   { nameHe: 'תולעת',  effectHe: 'סיכויים רגילים',                  boostColor: '#8DA6B8' },
  shrimp: { nameHe: 'שרימפס', effectHe: '×2 סיכוי ל-Rare',                 boostColor: '#64B5F6' },
  squid:  { nameHe: 'קלמארי', effectHe: '×3 ל-Epic · ×4 ל-Legendary',      boostColor: '#BA68C8' }
};

const RARITY_COLORS = {
  common: '#8DA6B8', uncommon: '#81C784', rare: '#64B5F6', epic: '#BA68C8', legendary: '#F0B429'
};
const RARITY_HE = {
  common: 'רגיל', uncommon: 'לא שכיח', rare: 'נדיר', epic: 'אפי', legendary: 'אגדי'
};

// ── State ─────────────────────────────────────────────────────────────

let _loadout        = _loadSaved();
let _visible        = false;
let _onEquip        = null;
let _activeSection  = 'Outfit';
let _activeCategory = null; // null = list view, string = grid view
let _gridArea       = null;
let _equippedStrip  = null;
let _previewCanvas  = null;

function _loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const merged = {};
      for (const cat of Object.keys(DEFAULT_LOADOUT)) {
        const savedVal = saved[cat];
        if ((cat === 'Body' || cat === 'Emotions') && !savedVal) {
          merged[cat] = DEFAULT_LOADOUT[cat];
        } else {
          merged[cat] = savedVal || DEFAULT_LOADOUT[cat];
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
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

// ── Init ──────────────────────────────────────────────────────────────

export function initInventoryPanel() {
  _buildPanel();
  _takeOverBagButton();
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

// ── SVG art (catalog-style renders) ───────────────────────────────────

function _rodSVG(meta) {
  const B = { x: 28, y: 96 }, T = { x: 82, y: 10 };
  const dx = T.x - B.x, dy = T.y - B.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const P = (t, o) => ({ x: B.x + dx * t + px * o, y: B.y + dy * t + py * o });
  const pts = a => a.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const wAt = t => 3.6 - 2.5 * t;
  const facet = (o1, o2, fill) => {
    const b1 = P(0, o1 * wAt(0)), b2 = P(0, o2 * wAt(0)), t2 = P(1, o2 * wAt(1)), t1 = P(1, o1 * wAt(1));
    return '<polygon points="' + pts([b1, b2, t2, t1]) + '" fill="' + fill + '"/>';
  };
  let s = facet(-1, -0.15, meta.light) + facet(-0.15, 0.45, meta.main) + facet(0.45, 1, meta.dark);

  const gripEnd = { x: B.x - ux * 18, y: B.y - uy * 18 };
  s += '<polygon points="' + pts([P(0, -4.4), P(0, 4.4),
        { x: gripEnd.x + px * 4.4, y: gripEnd.y + py * 4.4 },
        { x: gripEnd.x - px * 4.4, y: gripEnd.y - py * 4.4 }]) + '" fill="#4A3018"/>';
  for (let i = 1; i <= 3; i++) {
    const c = { x: B.x - ux * 4.5 * i, y: B.y - uy * 4.5 * i };
    s += '<line x1="' + (c.x + px * 4.2) + '" y1="' + (c.y + py * 4.2) + '" x2="' + (c.x - px * 4.2) + '" y2="' + (c.y - py * 4.2) + '" stroke="#3A2410" stroke-width="1.3"/>';
  }
  s += '<circle cx="' + gripEnd.x + '" cy="' + gripEnd.y + '" r="4.2" fill="#2A1A08"/>';

  const rc = P(0.16, 7);
  s += '<line x1="' + P(0.16, 0).x + '" y1="' + P(0.16, 0).y + '" x2="' + rc.x + '" y2="' + rc.y + '" stroke="#16333A" stroke-width="2.4"/>';
  s += '<circle cx="' + rc.x + '" cy="' + rc.y + '" r="6" fill="#16333A"/><circle cx="' + rc.x + '" cy="' + rc.y + '" r="2.7" fill="#AFC3C9"/>';
  s += '<circle cx="' + (rc.x + 6.5) + '" cy="' + (rc.y + 4) + '" r="1.9" fill="' + meta.main + '"/>';

  [0.42, 0.66, 0.86].forEach((t, i) => {
    const gp = P(t, 4.5 - t * 1.7);
    s += '<circle cx="' + gp.x + '" cy="' + gp.y + '" r="' + (2.4 - i * 0.5) + '" fill="none" stroke="' + meta.dark + '" stroke-width="1"/>';
  });

  if (meta.bands) [0.3, 0.5, 0.7].forEach(t => {
    const a = P(t, wAt(t)), b = P(t, -wAt(t));
    s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + meta.bands + '" stroke-width="2"/>';
  });
  if (meta.sparkle) s += '<path d="M89 20 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" fill="#FFF3C4"/>';

  s += '<path d="M' + T.x + ' ' + T.y + ' Q ' + (T.x + 10) + ' ' + (T.y + 24) + ' ' + (T.x + 6) + ' ' + (T.y + 46) + '" fill="none" stroke="#8FA0A6" stroke-width="1"/>';
  s += '<circle cx="' + (T.x + 6) + '" cy="' + (T.y + 50) + '" r="3.6" fill="#FF6B4A"/><circle cx="' + (T.x + 4.9) + '" cy="' + (T.y + 48.6) + '" r="1.2" fill="#FFD9CE"/>';

  return '<svg viewBox="0 0 104 110" width="86" height="92" aria-hidden="true">' + s + '</svg>';
}

function _baitSVG(id) {
  if (id === 'worm') {
    let s = '<ellipse cx="44" cy="52" rx="27" ry="5.5" fill="#5A3C20"/>';
    const seg = [[21,42],[29,35],[38,33],[46,36],[54,42],[61,37],[66,30]];
    for (let i = seg.length - 1; i >= 0; i--) {
      s += '<circle cx="' + seg[i][0] + '" cy="' + seg[i][1] + '" r="' + (6.4 - i * 0.45) + '" fill="' + (i % 2 ? '#D98868' : '#C4724F') + '"/>';
      s += '<circle cx="' + (seg[i][0] - 1.6) + '" cy="' + (seg[i][1] - 1.9) + '" r="' + (6.4 - i * 0.45) * 0.4 + '" fill="#E8A183"/>';
    }
    s += '<circle cx="19.5" cy="40" r="1.2" fill="#0D2428"/>';
    return '<svg viewBox="0 0 88 62" width="72" height="52" aria-hidden="true">' + s + '</svg>';
  }
  if (id === 'shrimp') {
    let s = '<path d="M23 24 Q9 17 6 9" fill="none" stroke="#E07B58" stroke-width="1.4"/>';
    s += '<path d="M23 27 Q11 24 4 21" fill="none" stroke="#E07B58" stroke-width="1.4"/>';
    const seg = [[25,26,8.8],[35,23,9.2],[45,24,8.4],[54,30,7.2],[60,37,6],[63,44,4.8]];
    for (let i = seg.length - 1; i >= 0; i--) {
      s += '<circle cx="' + seg[i][0] + '" cy="' + seg[i][1] + '" r="' + seg[i][2] + '" fill="' + (i % 2 ? '#FF9E7D' : '#F08461') + '"/>';
    }
    s += '<polygon points="63,44 77,38 74,48 77,53 66,50" fill="#F08461"/>';
    s += '<circle cx="22" cy="23" r="1.8" fill="#0D2428"/>';
    for (let lx = 29; lx <= 50; lx += 7) s += '<line x1="' + lx + '" y1="33" x2="' + (lx - 3) + '" y2="40" stroke="#E07B58" stroke-width="1.4"/>';
    return '<svg viewBox="0 0 88 62" width="72" height="52" aria-hidden="true">' + s + '</svg>';
  }
  if (id === 'squid') {
    let s = '<polygon points="44,4 57,27 31,27" fill="#C9A0D0"/>';
    s += '<polygon points="44,4 57,27 44,27" fill="#B183BC"/>';
    s += '<polygon points="44,8 63,17 57,26" fill="#B183BC"/>';
    s += '<polygon points="44,8 25,17 31,26" fill="#D8B7DE"/>';
    s += '<rect x="31" y="26" width="26" height="11" rx="3.5" fill="#C9A0D0"/>';
    s += '<circle cx="38" cy="31.5" r="2.7" fill="#FFFFFF"/><circle cx="38" cy="31.5" r="1.4" fill="#0D2428"/>';
    s += '<circle cx="50" cy="31.5" r="2.7" fill="#FFFFFF"/><circle cx="50" cy="31.5" r="1.4" fill="#0D2428"/>';
    [[33,-11],[38,-5],[43,-13],[48,-5],[53,-11],[56,-6]].forEach((t, i) => {
      s += '<path d="M' + t[0] + ' 37 q ' + t[1] * 0.3 + ' 8 ' + t[1] * 0.55 + ' 17" fill="none" stroke="' + (i % 2 ? '#B183BC' : '#C9A0D0') + '" stroke-width="3" stroke-linecap="round"/>';
    });
    return '<svg viewBox="0 0 88 62" width="72" height="52" aria-hidden="true">' + s + '</svg>';
  }
  return '<svg viewBox="0 0 88 62" width="72" height="52" aria-hidden="true"><circle cx="44" cy="31" r="14" fill="#8DA6B8"/></svg>';
}

function _fishSVG(color) {
  return '<svg viewBox="0 0 44 26" width="40" height="24" aria-hidden="true">' +
    '<polygon points="4,13 22,3 32,8 32,18 22,23" fill="' + color + '"/>' +
    '<polygon points="4,13 22,3 22,23" fill="rgba(13,36,40,0.25)"/>' +
    '<polygon points="32,8 41,3 41,23 32,18" fill="' + color + '" opacity="0.75"/>' +
    '<circle cx="12" cy="11" r="1.6" fill="#0D2428"/></svg>';
}
function _hoverboardSVG(size = 30) {
  const h = Math.round(size * 0.5);
  return '<svg viewBox="0 0 120 60" width="' + size + '" height="' + h + '" aria-hidden="true">' +
    '<rect x="8" y="16" width="18" height="28" rx="8" fill="#2E333B"/>' +
    '<rect x="10" y="19" width="6" height="22" rx="3" fill="#4A525C"/>' +
    '<rect x="94" y="16" width="18" height="28" rx="8" fill="#2E333B"/>' +
    '<rect x="96" y="19" width="6" height="22" rx="3" fill="#4A525C"/>' +
    '<path d="M26 24 Q44 26 58 30 Q44 34 26 36 Z" fill="#BA68C8"/>' +
    '<path d="M94 24 Q76 26 62 30 Q76 34 94 36 Z" fill="#9C4FAB"/>' +
    '<rect x="57" y="23" width="6" height="14" rx="2" fill="#2E333B"/>' +
    '<g stroke="#F4E7C3" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.95">' +
    '<path d="M34 27 l4 3 -4 3"/><path d="M40 27 l4 3 -4 3"/><path d="M46 27 l4 3 -4 3"/>' +
    '<path d="M86 27 l-4 3 4 3"/><path d="M80 27 l-4 3 4 3"/><path d="M74 27 l-4 3 4 3"/>' +
    '</g></svg>';
}
// ── Build DOM ─────────────────────────────────────────────────────────

function _buildPanel() {
  const style = document.createElement('style');
  style.textContent = `
    #inv-overlay {
      position: fixed; inset: 0;
      background: rgba(6, 20, 23, 0.55);
      backdrop-filter: blur(2px);
      z-index: 310; display: none;
      align-items: center; justify-content: center; padding: 14px;
      font-family: Heebo, 'Segoe UI', Arial, sans-serif;
    }
    #inv-overlay.inv-open { display: flex; }

    #inv-panel {
      width: min(980px, 100%); height: min(600px, 100%);
      background: rgba(13, 36, 40, 0.82);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(244, 231, 195, 0.20);
      border-radius: 22px;
      box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.20), 0 -12px 50px rgba(0, 0, 0, 0.6);
      display: flex; flex-direction: column; overflow: hidden;
      color: #F4E7C3;
      animation: inv-slidein .28s cubic-bezier(.32,1,.45,1);
    }
    @keyframes inv-slidein { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { #inv-panel { animation: none; } }

    #inv-handle {
      width: 40px; height: 4px; border-radius: 2px;
      background: rgba(244, 231, 195, 0.28);
      margin: 10px auto 0; flex-shrink: 0;
    }

    #inv-header {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 18px 10px; flex-shrink: 0;
      border-bottom: 1px solid rgba(244, 231, 195, 0.12);
    }
    #inv-header h2 {
      flex: 1; margin: 0; font-family: Fredoka, Heebo, sans-serif;
      font-size: 21px; font-weight: 600; color: #F4E7C3;
      text-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }
    #inv-equipped-count {
      font-size: 12px; color: #F0B429;
      background: rgba(240, 180, 41, 0.14); border: 1px solid rgba(240, 180, 41, 0.35);
      border-radius: 20px; padding: 4px 12px; font-weight: 700;
    }
    #inv-save {
      font-size: 12px; font-weight: 700;
      color: #7ACB5E; background: rgba(122, 203, 94, 0.14);
      border: 1px solid rgba(122, 203, 94, 0.4); border-radius: 20px;
      padding: 4px 12px; cursor: pointer; transition: all .15s; white-space: nowrap;
      font-family: inherit;
    }
    #inv-save:hover { background: rgba(122, 203, 94, 0.28); }
    #inv-chips { flex: 1; display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; }
    .inv-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 10px;
      border: 1px solid rgba(240, 180, 41, 0.5); background: rgba(240, 180, 41, 0.1);
      color: #F0B429; font-family: inherit; font-size: 11.5px; font-weight: 700;
      cursor: pointer; transition: all .15s;
    }
    .inv-chip:hover { background: rgba(240, 180, 41, 0.2); }
    .inv-chip-name { max-width: 88px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .inv-chip-x { color: rgba(255, 107, 74, 0.7); font-size: 10px; }
    .inv-chip-x:hover { color: #FF6B4A; }
    #inv-clear-all {
      font-size: 12px; font-weight: 700;
      color: #FF8A6E; background: rgba(255, 107, 74, 0.12);
      border: 1px solid rgba(255, 107, 74, 0.35); border-radius: 20px;
      padding: 4px 12px; cursor: pointer; transition: all .15s; white-space: nowrap;
      font-family: inherit;
    }
    #inv-clear-all:hover { background: rgba(255, 107, 74, 0.28); color: #FFD9CE; }
    #inv-close {
      width: 34px; height: 34px; border-radius: 10px;
      background: rgba(0,0,0,0.35); border: 1px solid rgba(244,231,195,0.25);
      color: #F4E7C3; font-size: 16px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all .15s;
    }
    #inv-close:hover { background: rgba(255, 107, 74, 0.3); border-color: #FF6B4A; }
    #inv-close:focus-visible, .inv-section-pill:focus-visible, .inv-cat-row:focus-visible { outline: 2px solid #F0B429; outline-offset: 2px; }

    /* Paper doll */
    #inv-wearing-wrap { padding: 10px 16px 2px; flex-shrink: 0; }
    #inv-doll { display: flex; gap: 10px; align-items: flex-start; }
    #inv-doll-figure {
      width: 100%; height: 150px; flex-shrink: 0;
      border-radius: 14px; overflow: hidden;
      background: rgba(9, 26, 29, 0.85);
      border: 1px solid rgba(43, 179, 189, 0.35);
    }
    #inv-preview-canvas { width: 100%; height: 100%; display: block; }
    #inv-doll-zones { flex: 1; display: flex; flex-direction: column; gap: 5px; }
    .inv-zone {
      border-radius: 12px; padding: 6px 9px 7px;
      background: rgba(244, 231, 195, 0.05);
      border-right: 3px solid transparent;
    }
    .inv-zone-label {
      font-size: 10px; font-weight: 800; letter-spacing: 0.4px; margin-bottom: 5px;
    }
    .inv-zone-slots { display: flex; flex-wrap: wrap; gap: 4px; }
    .inv-zone-slot {
      display: flex; align-items: center; gap: 5px;
      padding: 4px 8px; border-radius: 8px;
      border: 1px dashed rgba(244, 231, 195, 0.22);
      background: none; cursor: pointer; transition: all .15s;
      font-family: inherit; color: inherit;
    }
    .inv-zone-slot:hover { background: rgba(244, 231, 195, 0.08); }
    .inv-zone-slot.on {
      border-style: solid; border-color: rgba(240, 180, 41, 0.55);
      background: rgba(240, 180, 41, 0.12);
    }
    .inv-zone-slot-icon { font-size: 13px; line-height: 1; }
    .inv-zone-slot-name {
      font-size: 10.5px; font-weight: 600; max-width: 76px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      color: rgba(244, 231, 195, 0.45);
    }
    .inv-zone-slot.on .inv-zone-slot-name { color: #F0B429; }
    .inv-zone-remove {
      background: none; border: none; cursor: pointer; padding: 0;
      color: rgba(255, 107, 74, 0.6); font-size: 10px; line-height: 1;
    }
    .inv-zone-remove:hover { color: #FF6B4A; }

    /* Section pills */
    #inv-sections {
      display: flex; flex-direction: column;
      gap: 6px; padding: 0; flex: 1; overflow-y: auto; min-height: 0;
    }
    .inv-section-pill {
      display: flex; flex-direction: row; align-items: center; justify-content: flex-start;
      gap: 9px; padding: 10px 12px; border-radius: 12px;
      border: 1.5px solid rgba(244, 231, 195, 0.15);
      background: rgba(244, 231, 195, 0.04);
      color: rgba(244, 231, 195, 0.6);
      font-family: inherit; cursor: pointer; transition: all .18s;
    }
    .inv-section-icon { font-size: 21px; line-height: 1; }
    .inv-section-label { font-size: 12.5px; font-weight: 700; white-space: nowrap; }
    .inv-section-pill.active {
      background: color-mix(in srgb, var(--sec-accent) 22%, transparent);
      border-color: var(--sec-accent);
      color: #FFFFFF;
      box-shadow: 0 0 14px color-mix(in srgb, var(--sec-accent) 35%, transparent);
    }
    .inv-section-pill:hover:not(.active) { border-color: rgba(244,231,195,0.35); color: #F4E7C3; }

    .inv-sep { height: 1px; background: rgba(244, 231, 195, 0.10); margin: 10px 18px 0; flex-shrink: 0; }

    #inv-layout { flex: 1; display: flex; min-height: 0; }
    #inv-side {
      width: 190px; flex-shrink: 0; display: flex; flex-direction: column;
      gap: 10px; padding: 12px 14px 14px;
      border-left: 1px solid rgba(244, 231, 195, 0.12);
      min-height: 0;
    }
    #inv-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    /* Body */
    #inv-body {
      flex: 1; overflow-y: auto; padding: 10px 16px 24px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin; scrollbar-color: rgba(244,231,195,0.18) transparent;
    }

    .inv-cat-list { display: flex; flex-direction: column; gap: 7px; }
    .inv-cat-row {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 14px; border-radius: 16px;
      background: rgba(244, 231, 195, 0.05);
      border: 1px solid rgba(244, 231, 195, 0.10);
      cursor: pointer; transition: all .15s; color: inherit; font-family: inherit;
      text-align: right; width: 100%;
    }
    .inv-cat-row:hover { background: rgba(244, 231, 195, 0.10); transform: translateY(-1px); }
    .inv-cat-row-iconbox {
      width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
      background: color-mix(in srgb, var(--row-accent, #2BB3BD) 18%, transparent);
      border: 1px solid color-mix(in srgb, var(--row-accent, #2BB3BD) 40%, transparent);
      display: flex; align-items: center; justify-content: center; font-size: 22px;
    }
    .inv-cat-row-info { flex: 1; min-width: 0; }
    .inv-cat-row-name { font-size: 15px; font-weight: 700; color: #F4E7C3; }
    .inv-cat-row-sub { font-size: 11.5px; color: rgba(244, 231, 195, 0.45); margin-top: 2px; }
    .inv-cat-row-equipped-badge {
      font-size: 10px; font-weight: 700; color: #0D2428;
      background: #F0B429; border-radius: 20px; padding: 3px 10px; flex-shrink: 0;
    }
    .inv-cat-row-chevron { color: rgba(244, 231, 195, 0.3); font-size: 16px; flex-shrink: 0; }

    .inv-back-row {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 14px; padding: 8px 12px; border-radius: 10px;
      background: rgba(244,231,195,0.06); border: 1px solid rgba(244,231,195,0.14);
      color: #F4E7C3; font-family: inherit; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: all .15s;
    }
    .inv-back-row:hover { background: rgba(244,231,195,0.12); }

    .inv-cat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .inv-cat-header-icon { font-size: 21px; }
    .inv-cat-header-name { font-family: Fredoka, Heebo, sans-serif; font-size: 17px; font-weight: 600; color: #F4E7C3; }
    .inv-cat-header-count { font-size: 12px; color: rgba(244, 231, 195, 0.45); }

    .inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 9px; }
    .inv-slot {
      position: relative; aspect-ratio: 1;
      background: rgba(244, 231, 195, 0.06); border: 1.5px solid rgba(244, 231, 195, 0.12);
      border-radius: 16px; cursor: pointer; text-align: center;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; padding: 8px 4px 6px; transition: all .15s;
    }
    .inv-slot:hover { background: rgba(244, 231, 195, 0.12); transform: translateY(-2px); }
    .inv-slot.equipped {
      background: rgba(240, 180, 41, 0.15); border-color: #F0B429;
      box-shadow: 0 0 14px rgba(240, 180, 41, 0.30);
    }
    .inv-slot-icon { font-size: 27px; line-height: 1; }
    .inv-slot-name {
      font-size: 9.5px; color: rgba(244, 231, 195, 0.55);
      line-height: 1.2; word-break: break-word; max-width: 100%;
    }
    .inv-slot.equipped .inv-slot-name { color: #F0B429; }
    .inv-badge {
      position: absolute; top: 6px; left: 6px;
      width: 17px; height: 17px; border-radius: 50%;
      background: #F0B429; color: #0D2428; font-size: 10px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }
    .inv-slot-none {
      aspect-ratio: 1; background: transparent;
      border: 1.5px dashed rgba(244, 231, 195, 0.18); border-radius: 16px;
      cursor: pointer; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px;
      color: rgba(244, 231, 195, 0.35); font-size: 11px; font-weight: 600; transition: all .15s;
    }
    .inv-slot-none:hover { border-color: rgba(244,231,195,0.4); color: rgba(244,231,195,0.6); }
    .inv-slot-none.equipped { border-color: #F0B429; color: #F0B429; background: rgba(240,180,41,0.08); }
    .inv-slot-locked {
      aspect-ratio: 1; background: rgba(244, 231, 195, 0.025);
      border: 1.5px dashed rgba(244, 231, 195, 0.10); border-radius: 16px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; padding: 8px 4px 6px; cursor: default; user-select: none;
    }
    .inv-slot-locked-icon { font-size: 22px; opacity: .25; }
    .inv-slot-locked-name { font-size: 9.5px; color: rgba(244,231,195,0.3); text-align: center; }
    .inv-slot-locked-soon { font-size: 9px; font-weight: 700; color: rgba(240, 180, 41, 0.5); }

    /* Fishing cards */
    .inv-fish-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .inv-rod-card, .inv-bait-card {
      background: rgba(244, 231, 195, 0.055);
      border: 1.5px solid rgba(244, 231, 195, 0.12);
      border-radius: 16px; padding: 12px;
      display: flex; flex-direction: column; transition: all .15s;
    }
    .inv-rod-card:hover, .inv-bait-card:hover { background: rgba(244, 231, 195, 0.09); }
    .inv-rod-card.equipped { border-color: #F0B429; box-shadow: 0 0 16px rgba(240, 180, 41, 0.25); background: rgba(240,180,41,0.09); }
    .inv-card-top { display: flex; align-items: center; justify-content: space-between; }
    .inv-card-name { font-family: Fredoka, Heebo, sans-serif; font-size: 15.5px; font-weight: 600; }
    .inv-tier-chip { font-size: 10px; font-weight: 800; color: #0D2428; padding: 2px 9px; border-radius: 8px; }
    .inv-card-art { display: flex; justify-content: center; padding: 4px 0 2px; }
    .inv-stat-row { display: flex; justify-content: space-between; font-size: 11.5px; opacity: 0.85; margin-top: 6px; }
    .inv-stat-bar { height: 6px; border-radius: 4px; background: rgba(244,231,195,0.14); overflow: hidden; margin-top: 3px; }
    .inv-stat-fill { height: 100%; border-radius: 4px; }
    .inv-equip-btn {
      margin-top: 10px; padding: 9px 0; width: 100%;
      background: #2BB3BD; border: 1px solid rgba(255,255,255,0.25); border-radius: 10px;
      color: #0D2428; font-family: Fredoka, Heebo, sans-serif; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all .15s;
    }
    .inv-equip-btn:hover { filter: brightness(1.12); }
    .inv-equipped-tag {
      margin-top: 10px; padding: 8px 0; width: 100%; text-align: center;
      background: rgba(240, 180, 41, 0.16); border: 1px solid #F0B429; border-radius: 10px;
      color: #F0B429; font-size: 13px; font-weight: 800;
    }
    .inv-sell-btn {
      padding: 8px 16px; background: #FF6B4A; border: 1px solid #E04B2A; border-radius: 10px;
      color: #FFF; font-family: Fredoka, Heebo, sans-serif; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all .15s; flex-shrink: 0;
    }
    .inv-sell-btn:hover { background: #E85A4A; }
    .inv-caught-row {
      display: flex; align-items: center; gap: 12px;
      background: rgba(244, 231, 195, 0.055); border: 1px solid rgba(244, 231, 195, 0.12);
      border-radius: 14px; padding: 11px 13px; margin-bottom: 8px;
    }
    .inv-empty { padding: 34px 10px; text-align: center; color: rgba(244,231,195,0.5); font-size: 15px; }
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
  panel.setAttribute('dir', 'rtl');

  // Header
  const header = document.createElement('div');
  header.id = 'inv-header';
  const headerTitle = document.createElement('h2');
  headerTitle.textContent = '🎒 התיק שלי';
  const equippedCount = document.createElement('span');
  equippedCount.id = 'inv-equipped-count';
  equippedCount.textContent = _equippedCount() + ' פריטים לבושים';
  const saveBtn = document.createElement('button');
  saveBtn.id = 'inv-save';
  saveBtn.textContent = '💾 שמירה';
  saveBtn.addEventListener('click', () => {
    _saveCurrent();
    saveBtn.textContent = '✓ נשמר!';
    setTimeout(() => { saveBtn.textContent = '💾 שמירה'; }, 1600);
  });
  const clearAllBtn = document.createElement('button');
  clearAllBtn.id = 'inv-clear-all';
  clearAllBtn.textContent = 'נקה הכל';
  clearAllBtn.addEventListener('click', () => {
    for (const sec of Object.values(SECTIONS)) {
      for (const cat of Object.keys(sec.categories)) {
        if (SECTIONS.Fishing.categories[cat]) continue; // fishing isn't a loadout
        _equip(cat, DEFAULT_LOADOUT[cat] ?? null);
      }
    }
    _renderEquipped();
    _renderBody();
    panel._countEl.textContent = _equippedCount() + ' פריטים לבושים';
  });
  const closeBtn = document.createElement('button');
  closeBtn.id = 'inv-close'; closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'סגירת התיק');
  closeBtn.addEventListener('click', hideInventoryPanel);
  header.append(headerTitle, equippedCount, saveBtn, clearAllBtn, closeBtn);
  panel.appendChild(header);

  // Currently-wearing strip
  const wearingWrap = document.createElement('div');
  wearingWrap.id = 'inv-wearing-wrap';
  const wearingChips = document.createElement('div');
  wearingChips.id = 'inv-wearing-chips';
  wearingWrap.append(wearingChips);
  _equippedStrip = wearingChips;

  // Section pills
  const sectionsRow = document.createElement('div');
  sectionsRow.id = 'inv-sections';
  const sectionEls = {};
  for (const [secKey, { icon, label, accent }] of Object.entries(SECTIONS)) {
    const pill = document.createElement('button');
    pill.className = 'inv-section-pill' + (secKey === _activeSection ? ' active' : '');
    pill.dataset.section = secKey;
    pill.style.setProperty('--sec-accent', accent);
    pill.innerHTML = `<span class="inv-section-icon">${icon}</span><span class="inv-section-label">${label}</span>`;
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

  // Body
  const body = document.createElement('div');
  body.id = 'inv-body';
  _gridArea = document.createElement('div');
  body.appendChild(_gridArea);

  const layout = document.createElement('div');
  layout.id = 'inv-layout';
  const side = document.createElement('div');
  side.id = 'inv-side';
  const figureBox = document.createElement('div');
  figureBox.id = 'inv-doll-figure';
  side.append(figureBox, sectionsRow);
  const main = document.createElement('div');
  main.id = 'inv-main';
  main.append(wearingWrap, body);
  layout.append(side, main);
  panel.appendChild(layout);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  panel._countEl = equippedCount;

  _renderEquipped();
  _renderBody();
}

// ── Paper doll ────────────────────────────────────────────────────────

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

  // Live avatar — redraws from the current loadout on every equip change
  const fig = document.getElementById('inv-doll-figure');
  if (fig) fig.innerHTML = _avatarSVG();

  const chips = document.createElement('div');
  chips.id = 'inv-chips';

  const WEARABLE = ['Hat','Hair','Glasses','Headphones','Face','Shirt','Outwear','Costume','Gloves','Pants','Shorts','Socks','Shoes'];
  let anyOn = false;
  for (const cat of WEARABLE) {
    const file = _loadout[cat] ?? null;
    if (!file) continue;
    anyOn = true;
    const chip = document.createElement('button');
    chip.className = 'inv-chip';
    chip.type = 'button';
    const label = file.replace('.glb','').replace(/_\d{1,3}$/,'').replace(/_/g,' ');
    chip.innerHTML = `<span>${_getCatIcon(cat)}</span><span class="inv-chip-name">${label}</span><span class="inv-chip-x">✕</span>`;
    chip.querySelector('.inv-chip-x').addEventListener('click', e => {
      e.stopPropagation();
      _equip(cat, null);
      _renderEquipped(); _renderBody();
      const panel = document.getElementById('inv-panel');
      if (panel?._countEl) panel._countEl.textContent = _equippedCount() + ' פריטים לבושים';
    });
    chip.addEventListener('click', () => {
      const sec = _findSection(cat);
      if (!sec) return;
      _activeSection = sec; _activeCategory = cat;
      document.querySelectorAll('.inv-section-pill').forEach(p => p.classList.toggle('active', p.dataset.section === sec));
      _renderBody();
    });
    chips.appendChild(chip);
  }
  if (!anyOn) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;opacity:0.5;padding:6px 2px';
    empty.textContent = 'עוד לא לבשת כלום — בחר פריטים מהקטגוריות';
    chips.appendChild(empty);
  }

  _equippedStrip.appendChild(chips);
}

// Low-poly avatar preview that reflects the equipped loadout
function _avatarSVG() {
  const has = c => !!_loadout[c];
  let s = '';
  s += '<rect x="40" y="108" width="11" height="34" rx="2" fill="#23272E"/><rect x="54" y="108" width="11" height="34" rx="2" fill="#2E333B"/>';
  if (has('Shoes')) s += '<rect x="37" y="138" width="15" height="8" rx="3" fill="#FF6B4A"/><rect x="53" y="138" width="15" height="8" rx="3" fill="#FF6B4A"/>';
  if (has('Socks')) s += '<rect x="40" y="130" width="11" height="8" fill="#F4E7C3"/><rect x="54" y="130" width="11" height="8" fill="#F4E7C3"/>';
  const torso = has('Costume') ? '#BA68C8' : has('Outwear') ? '#F0B429' : '#3B6FD4';
  s += '<rect x="34" y="66" width="37" height="46" rx="5" fill="' + torso + '"/>';
  s += '<rect x="34" y="66" width="12" height="46" rx="5" fill="rgba(255,255,255,0.16)"/>';
  if (has('Gloves')) s += '<rect x="26" y="97" width="9" height="9" rx="2" fill="#7ACB5E"/><rect x="70" y="97" width="9" height="9" rx="2" fill="#7ACB5E"/>';
  s += '<rect x="37" y="30" width="31" height="30" rx="5" fill="#E8B98A"/>';
  s += '<rect x="37" y="30" width="10" height="30" rx="5" fill="#F2CBA2"/>';
  s += '<rect x="35" y="24" width="35" height="11" rx="4" fill="#2A2014"/>';
  if (has('Hat')) s += '<rect x="32" y="17" width="41" height="10" rx="4" fill="#F0B429"/><rect x="38" y="8" width="29" height="11" rx="4" fill="#C98F14"/>';
  if (has('Glasses')) {
    s += '<rect x="40" y="40" width="10" height="7" rx="2" fill="#0D2428"/><rect x="55" y="40" width="10" height="7" rx="2" fill="#0D2428"/><line x1="50" y1="43" x2="55" y2="43" stroke="#0D2428" stroke-width="2"/>';
  } else {
    s += '<rect x="43" y="41" width="4" height="4" rx="1" fill="#1A1D22"/><rect x="58" y="41" width="4" height="4" rx="1" fill="#1A1D22"/>';
  }
  if (has('Headphones')) s += '<path d="M36 38 Q52 18 69 38" fill="none" stroke="#FF6B4A" stroke-width="4"/><rect x="31" y="38" width="7" height="12" rx="3" fill="#FF6B4A"/><rect x="67" y="38" width="7" height="12" rx="3" fill="#FF6B4A"/>';
  if (has('Face')) s += '<rect x="46" y="52" width="13" height="3.5" rx="1.7" fill="#4A3018"/>';
  s += '<path d="M46 51 Q52.5 55 59 51" fill="none" stroke="#B8895E" stroke-width="1.6" stroke-linecap="round"/>';
  return '<svg viewBox="0 0 105 152" width="100%" height="100%" aria-hidden="true">' + s + '</svg>';
}

// ── Fishing rendering ─────────────────────────────────────────────────

function _renderFishingGrid() {
  const { icon } = SECTIONS.Fishing.categories[_activeCategory];

  const backBtn = document.createElement('button');
  backBtn.className = 'inv-back-row';
  backBtn.textContent = '‹ חזרה לכלי דייג';
  backBtn.addEventListener('click', () => { _activeCategory = null; _renderBody(); });
  _gridArea.appendChild(backBtn);

  const inv = _inv();
  const catHeader = document.createElement('div');
  catHeader.className = 'inv-cat-header';

  if (_activeCategory === 'Rods') {
    const rods = inv.ownedRods || [];
    catHeader.innerHTML = `<span class="inv-cat-header-icon">${icon}</span>
      <span class="inv-cat-header-name">חכות</span>
      <span class="inv-cat-header-count">${rods.length} בבעלותך</span>`;
    _gridArea.appendChild(catHeader);

    if (rods.length === 0) {
      _gridArea.innerHTML += '<div class="inv-empty">אין חכות עדיין — קנה אצל הדייג במרינה 🎣</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'inv-fish-grid';

    rods.forEach(rodId => {
      const rodData = _rodData(rodId);
      const meta = ROD_META[rodId] || { tierHe: '', capColor: '#F4E7C3', main: '#C98F14', light: '#E0AA2E', dark: '#8A6210' };
      const equipped = inv.currentRod === rodId;
      const zone = Math.round((rodData?.centerZone || 0.26) * 100);
      const speed = rodData?.meterSpeed ?? 1.0;
      const controlPct = Math.round((1.05 - speed) / 0.4 * 100);

      const card = document.createElement('div');
      card.className = 'inv-rod-card' + (equipped ? ' equipped' : '');
      card.innerHTML = `
        <div class="inv-card-top">
          <span class="inv-card-name">${rodData?.nameHe || rodId}</span>
          <span class="inv-tier-chip" style="background:${meta.capColor}">${meta.tierHe}</span>
        </div>
        <div class="inv-card-art">${_rodSVG(meta)}</div>
        <div class="inv-stat-row"><span>דיוק Sweet Spot</span><b>${zone}%</b></div>
        <div class="inv-stat-bar"><div class="inv-stat-fill" style="width:${zone / 0.4}%;background:${meta.main === '#1C3A40' ? '#2BB3BD' : meta.main}"></div></div>
        <div class="inv-stat-row"><span>שליטה במד</span><b>${controlPct}%</b></div>
        <div class="inv-stat-bar"><div class="inv-stat-fill" style="width:${controlPct}%;background:#2BB3BD"></div></div>
        <div class="inv-stat-row"><span>עד נדירות</span><b style="color:${meta.capColor}">${rodData?.maxRarity || ''}</b></div>
      `;

      if (equipped) {
        const tag = document.createElement('div');
        tag.className = 'inv-equipped-tag';
        tag.textContent = '✓ מצוידת';
        card.appendChild(tag);
      } else {
        const btn = document.createElement('button');
        btn.className = 'inv-equip-btn';
        btn.textContent = 'צייד חכה';
        btn.addEventListener('click', (e) => { e.stopPropagation(); _equipRod(rodId); });
        card.appendChild(btn);
      }

      grid.appendChild(card);
    });

    _gridArea.appendChild(grid);

  } else if (_activeCategory === 'Baits') {
    const baits = inv.baits || {};
    const totalBaits = (baits.worm || 0) + (baits.shrimp || 0) + (baits.squid || 0);

    catHeader.innerHTML = `<span class="inv-cat-header-icon">${icon}</span>
      <span class="inv-cat-header-name">פיתיונות</span>
      <span class="inv-cat-header-count">${totalBaits} סה״כ</span>`;
    _gridArea.appendChild(catHeader);

    const grid = document.createElement('div');
    grid.className = 'inv-fish-grid';

    ['worm', 'shrimp', 'squid'].forEach(id => {
      const meta = BAIT_META[id];
      const count = baits[id] || 0;

      const card = document.createElement('div');
      card.className = 'inv-bait-card';
      card.style.opacity = count > 0 ? '1' : '0.55';
      card.innerHTML = `
        <div class="inv-card-top">
          <span class="inv-card-name">${meta.nameHe}</span>
          <span class="inv-tier-chip" style="background:${count > 0 ? '#7ACB5E' : 'rgba(244,231,195,0.35)'}">${count} יח׳</span>
        </div>
        <div class="inv-card-art">${_baitSVG(id)}</div>
        <div class="inv-stat-row"><span>אפקט</span><b style="color:${meta.boostColor}">${meta.effectHe}</b></div>
        ${count === 0 ? '<div style="font-size:11px;opacity:0.55;margin-top:6px;text-align:center">אזל — קנה אצל הדייג</div>' : ''}
      `;
      grid.appendChild(card);
    });

    _gridArea.appendChild(grid);

  } else if (_activeCategory === 'Caught') {
    const caught = inv.caughtFish || [];
    catHeader.innerHTML = `<span class="inv-cat-header-icon">${icon}</span>
      <span class="inv-cat-header-name">דגים שנתפסו</span>
      <span class="inv-cat-header-count">${caught.length} דגים</span>`;
    _gridArea.appendChild(catHeader);

    if (caught.length === 0) {
      _gridArea.innerHTML += '<div class="inv-empty">עוד לא תפסת דגים — לך לרציף הדיג! 🎣</div>';
      return;
    }

    caught.forEach(({ fishId }) => {
      const fishData = _fishData(fishId);
      const rarityColor = RARITY_COLORS[fishData?.rarity] || '#8DA6B8';

      const row = document.createElement('div');
      row.className = 'inv-caught-row';

      const art = document.createElement('span');
      art.innerHTML = _fishSVG(rarityColor);

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0';
      info.innerHTML = `
        <div style="font-weight:700;font-size:14.5px">${fishData?.nameHe || fishId}</div>
        <div style="font-size:11.5px;margin-top:2px;color:${rarityColor};font-weight:600">
          ${RARITY_HE[fishData?.rarity] || fishData?.rarity || ''} · ${fishData?.price || 0} 🪙
        </div>`;

      const sellBtn = document.createElement('button');
      sellBtn.className = 'inv-sell-btn';
      sellBtn.textContent = 'מכירה אצל הדייג';
      sellBtn.addEventListener('click', () => {
        hideInventoryPanel();
        if (window.openFishermanShop) window.openFishermanShop('sell');
      });

      row.append(art, info, sellBtn);
      _gridArea.appendChild(row);
    });
  }
}

function _inv() { try { return getPlayerInventory() || {}; } catch { return {}; } }
function _rodData(id) { try { return getRodById(id); } catch { return null; } }
function _fishData(id) { try { return getFishById(id); } catch { return null; } }

function _getFishingCategoryData(category) {
  const inv = _inv();
  if (category === 'Rods') {
    const count = inv.ownedRods?.length || 0;
    return count > 0 ? count + ' חכות' : 'ריק';
  } else if (category === 'Baits') {
    const total = (inv.baits?.worm || 0) + (inv.baits?.shrimp || 0) + (inv.baits?.squid || 0);
    return total > 0 ? total + ' פיתיונות' : 'ריק';
  } else if (category === 'Caught') {
    const count = inv.caughtFish?.length || 0;
    return count > 0 ? count + ' דגים' : 'ריק';
  }
  return 'ריק';
}

// ── Render body (list or grid) ────────────────────────────────────────

function _renderBody() {
  if (_activeCategory === null) {
    _renderList();
  } else {
    _renderGrid();
  }
}

function _renderList() {
  _gridArea.innerHTML = '';
  const section = SECTIONS[_activeSection];
  const cats = section.categories;

  const list = document.createElement('div');
  list.className = 'inv-cat-list';

  for (const [cat, { icon, items, placeholders }] of Object.entries(cats)) {
    const row = document.createElement('button');
    row.className = 'inv-cat-row';
    row.style.setProperty('--row-accent', section.accent);

    const iconBox = document.createElement('div');
    iconBox.className = 'inv-cat-row-iconbox';
    if (typeof icon === 'string' && icon.trim().startsWith('<svg')) {
      iconBox.innerHTML = icon;
    } else {
      iconBox.textContent = icon;
    }

    const info = document.createElement('div');
    info.className = 'inv-cat-row-info';

    const name = document.createElement('div');
    name.className = 'inv-cat-row-name';
    name.textContent = CAT_HE[cat] || cat;

    const sub = document.createElement('div');
    sub.className = 'inv-cat-row-sub';

    if (_activeSection === 'Fishing') {
      sub.textContent = _getFishingCategoryData(cat);
    } else if (items.length > 0) {
      sub.textContent = items.length + ' פריטים';
    } else if (placeholders?.length) {
      sub.textContent = 'בקרוב';
    } else {
      sub.textContent = 'ריק';
    }

    info.append(name, sub);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0';

    if (_loadout[cat]) {
      const badge = document.createElement('span');
      badge.className = 'inv-cat-row-equipped-badge';
      badge.textContent = 'לבוש';
      right.appendChild(badge);
    }

    const chevron = document.createElement('span');
    chevron.className = 'inv-cat-row-chevron';
    chevron.textContent = '‹';
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

  if (_activeSection === 'Fishing') {
    _renderFishingGrid();
    return;
  }

  const { icon, items, placeholders } = SECTIONS[_activeSection].categories[_activeCategory];

  const backBtn = document.createElement('button');
  backBtn.className = 'inv-back-row';
  backBtn.textContent = '‹ חזרה ל' + SECTIONS[_activeSection].label;
  backBtn.addEventListener('click', () => { _activeCategory = null; _renderBody(); });
  _gridArea.appendChild(backBtn);

  const catHeader = document.createElement('div');
  catHeader.className = 'inv-cat-header';
  catHeader.innerHTML = `
    <span class="inv-cat-header-icon">${icon}</span>
    <span class="inv-cat-header-name">${CAT_HE[_activeCategory] || _activeCategory}</span>
    <span class="inv-cat-header-count">${items.length} פריטים</span>`;
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
          <span class="inv-slot-locked-soon">בקרוב</span>`;
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
  noneSlot.innerHTML = `<span style="font-size:18px;opacity:.5">✕</span><span>בלי</span>`;
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
    if (typeof icon === 'string' && icon.trim().startsWith('<svg')) {
    iconEl.innerHTML = icon;
  } else {
    iconEl.textContent = icon;
  }

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
  if (panel?._countEl) panel._countEl.textContent = _equippedCount() + ' פריטים לבושים';
}

function _equippedCount() {
  return Object.values(_loadout).filter(v => v != null).length;
}

function _equip(cat, file) {
  _loadout[cat] = file;
  _saveCurrent();
  if (_onEquip) _onEquip(cat, file);
}

// ── One-bag unification ───────────────────────────────────────────────
// The HUD bag button (🎒) used to open a separate, older bag UI. This
// panel is the single bag: find that button, strip its old listeners by
// cloning it, and wire it here. Retries while the HUD builds during boot.

function _takeOverBagButton() {
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    const btn = [...document.querySelectorAll('button')]
      .find(b => b.textContent.trim() === '🎒' && !b.dataset.invBound);
    if (btn) {
      const clone = btn.cloneNode(true);
      clone.dataset.invBound = '1';
      clone.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        toggleInventoryPanel();
      });
      btn.replaceWith(clone);
      console.log('[inventory] 🎒 HUD button now opens the unified bag');
      clearInterval(timer);
    } else if (tries > 40) {
      clearInterval(timer);
    }
  }, 500);
}

export function showInventoryPanel() {
  if (isChatOpen()) return;
  document.getElementById('inv-overlay')?.classList.add('inv-open');
  _visible = true;
  _renderEquipped();
  _renderBody();
}

export function hideInventoryPanel() {
  document.getElementById('inv-overlay')?.classList.remove('inv-open');
  _visible = false;
}

export function toggleInventoryPanel() {
  _visible ? hideInventoryPanel() : showInventoryPanel();
}

// ── Equip Rod ─────────────────────────────────────────────────────────

function _equipRod(rodId) {
  console.log('[inventory] Equipping rod:', rodId);

  try {
    const s = getSocket();
    if (s) s.emit('equipRod', { rodId });
  } catch (_) {}
  if (window.updateFishingInventory) {
    window.updateFishingInventory({ currentRod: rodId });
  }
  setTimeout(() => { _renderBody(); }, 100);
}