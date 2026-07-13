// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fisherman Shop UI (proximity interaction)
// CARD EDITION: rods + baits render as detailed low-poly cards with
// SVG art and full stats. All socket/purchase logic unchanged.
// ═══════════════════════════════════════════════════════════════════════

import {
  ROD_DATA,
  BAIT_DATA,
  FISH_DATA,
  getPlayerInventory,
  hasRod,
  getBaitCount,
  getCaughtFish,
  getFishById
} from '../systems/fishing.js';

let _isOpen = false;
let _shopPanel = null;
let _currentTab = 'rods'; // 'rods' | 'baits' | 'sell'
let _socket = null;
let _onCoinUpdate = null;
let _serverFish = null;      // authoritative caught-fish list from the server
let _sellWatchdog = null;    // detects a server that never answers sellFish
let _sellPending = false;

// ── Display metadata (visual only — prices/logic stay server-side) ────

const ROD_META = {
  wood:       { tierHe: 'בסיסית',  capColor: '#7ACB5E', main: '#C98F14', light: '#E0AA2E', dark: '#8A6210',
                flavor: 'חכת הפתיחה של כל דייג' },
  fiberglass: { tierHe: 'משופרת',  capColor: '#4A90D9', main: '#C9D4D8', light: '#EDF2F4', dark: '#95A6AD',
                flavor: 'קלה וגמישה, שולטת טוב יותר במד' },
  carbon:     { tierHe: 'מקצועית', capColor: '#BA68C8', main: '#1C3A40', light: '#2E525A', dark: '#0D2428',
                flavor: 'סיבי קרבון עם ליפוף טורקיז', bands: '#2BB3BD' },
  golden:     { tierHe: 'אגדית',   capColor: '#F0B429', main: '#F0B429', light: '#FFDD75', dark: '#C07E0C',
                flavor: 'רק היא מסוגלת לתפוס את דג הזהב של SUY', sparkle: true }
};

const BAIT_META = {
  worm:   { effectHe: 'סיכויים רגילים',                    boostPct: 25,  boostColor: '#8DA6B8',
            flavor: 'הפיתיון הבסיסי — עובד תמיד' },
  shrimp: { effectHe: '×2 סיכוי לדגים נדירים (Rare)',       boostPct: 60,  boostColor: '#64B5F6',
            flavor: 'הדגים הגדולים לא מתאפקים' },
  squid:  { effectHe: '×3 סיכוי ל-Epic · ×4 ל-Legendary',   boostPct: 100, boostColor: '#BA68C8',
            flavor: 'הפיתיון של הציידים האמיתיים' }
};

// ── Public API ────────────────────────────────────────────────────────

export function initFishermanShop(socket, onCoinUpdate) {
  console.log('[fishermanShop] Initializing with socket:', socket ? 'OK' : 'MISSING');
  _socket = socket;
  _onCoinUpdate = onCoinUpdate;

  // Socket listeners
  _socket.on('fishingPurchaseResult', _handlePurchaseResult);
  _socket.on('fishingSellResult', _handleSellResult);
  _socket.on('fishingDataLoaded', (data) => {
    _serverFish = (data && data.caughtFish) ? data.caughtFish : [];
    console.log('[fishermanShop] Server fish list loaded:', _serverFish.length, 'fish');
    if (_isOpen && _currentTab === 'sell') _renderTab('sell');
  });

  console.log('[fishermanShop] Socket listeners registered');
}

export function openFishermanShop() {
  console.log('[fishermanShop] Opening shop, socket:', _socket ? 'connected' : 'missing');
  if (_isOpen) return;
  _isOpen = true;

  _createShopPanel();
  _renderTab(_currentTab);
}

export function closeFishermanShop() {
  if (!_isOpen) return;
  _isOpen = false;

  if (_shopPanel && _shopPanel.parentNode) {
    _shopPanel.parentNode.removeChild(_shopPanel);
  }
  _shopPanel = null;
}

export function isFishermanShopOpen() {
  return _isOpen;
}

// ── UI Construction ───────────────────────────────────────────────────

function _createShopPanel() {
  _shopPanel = document.createElement('div');
  _shopPanel.id = 'fisherman-shop';
  _shopPanel.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Heebo, sans-serif;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    width: min(640px, 94vw);
    max-height: 84vh;
    background: rgba(13, 36, 40, 0.78);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    border-top-left-radius: 6px;
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.22), 0 8px 32px rgba(0, 0, 0, 0.4);
    padding: 20px;
    color: #F4E7C3;
    overflow-y: auto;
    position: relative;
  `;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 16px;
    left: 16px;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.4);
    border: 2px solid rgba(244, 231, 195, 0.3);
    border-radius: 8px;
    color: #F4E7C3;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 2;
  `;
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(255, 107, 74, 0.3)';
    closeBtn.style.borderColor = '#FF6B4A';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(0, 0, 0, 0.4)';
    closeBtn.style.borderColor = 'rgba(244, 231, 195, 0.3)';
  });
  closeBtn.addEventListener('click', closeFishermanShop);
  content.appendChild(closeBtn);

  // Title
  const title = document.createElement('h2');
  title.textContent = 'דייג המרינה 🎣';
  title.style.cssText = `
    font-family: Fredoka, sans-serif;
    font-size: 28px;
    margin: 0 0 20px 0;
    text-align: center;
    color: #F4E7C3;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  `;
  content.appendChild(title);

  // Tabs
  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText = `
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    border-bottom: 2px solid rgba(244, 231, 195, 0.2);
    padding-bottom: 8px;
  `;

  const tabs = [
    { id: 'rods', label: 'חכות' },
    { id: 'baits', label: 'פתיונות' },
    { id: 'sell', label: 'מכירת דגים' }
  ];

  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.style.cssText = `
      flex: 1;
      padding: 10px;
      background: ${_currentTab === tab.id ? 'rgba(255, 107, 74, 0.3)' : 'transparent'};
      border: 2px solid ${_currentTab === tab.id ? '#FF6B4A' : 'rgba(244, 231, 195, 0.2)'};
      border-radius: 8px;
      color: #F4E7C3;
      font-size: 16px;
      font-family: Heebo, sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    btn.addEventListener('click', () => {
      _currentTab = tab.id;
      _renderTab(tab.id);
    });
    tabsContainer.appendChild(btn);
  });

  content.appendChild(tabsContainer);

  // Tab content area
  const tabContent = document.createElement('div');
  tabContent.id = 'fisherman-shop-content';
  tabContent.setAttribute('dir', 'rtl');
  content.appendChild(tabContent);

  _shopPanel.appendChild(content);
  document.body.appendChild(_shopPanel);
}

function _renderTab(tabId) {
  const content = document.getElementById('fisherman-shop-content');
  if (!content) return;

  content.innerHTML = '';

  // Update tab buttons
  const tabs = _shopPanel.querySelectorAll('button');
  tabs.forEach(btn => {
    const isActive = (btn.textContent === 'חכות' && tabId === 'rods') ||
                     (btn.textContent === 'פתיונות' && tabId === 'baits') ||
                     (btn.textContent === 'מכירת דגים' && tabId === 'sell');
    if (btn.textContent === 'חכות' || btn.textContent === 'פתיונות' || btn.textContent === 'מכירת דגים') {
      btn.style.background = isActive ? 'rgba(255, 107, 74, 0.3)' : 'transparent';
      btn.style.borderColor = isActive ? '#FF6B4A' : 'rgba(244, 231, 195, 0.2)';
    }
  });

  if (tabId === 'rods') _renderRodsTab(content);
  else if (tabId === 'baits') _renderBaitsTab(content);
  else if (tabId === 'sell') _renderSellTab(content);
}

// ── SVG art generators (low-poly card renders) ───────────────────────

function _rodSVG(meta) {
  const B = { x: 28, y: 108 }, T = { x: 84, y: 12 };
  const dx = T.x - B.x, dy = T.y - B.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const P = (t, o) => ({ x: B.x + dx * t + px * o, y: B.y + dy * t + py * o });
  const pts = a => a.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const wAt = t => 3.8 - 2.7 * t;

  const facet = (o1, o2, fill) => {
    const b1 = P(0, o1 * wAt(0)), b2 = P(0, o2 * wAt(0)), t2 = P(1, o2 * wAt(1)), t1 = P(1, o1 * wAt(1));
    return '<polygon points="' + pts([b1, b2, t2, t1]) + '" fill="' + fill + '"/>';
  };
  let s = facet(-1, -0.15, meta.light) + facet(-0.15, 0.45, meta.main) + facet(0.45, 1, meta.dark);

  // Grip with wraps
  const gripEnd = { x: B.x - ux * 20, y: B.y - uy * 20 };
  const g1 = P(0, -4.6), g2 = P(0, 4.6);
  const g3 = { x: gripEnd.x + px * 4.6, y: gripEnd.y + py * 4.6 };
  const g4 = { x: gripEnd.x - px * 4.6, y: gripEnd.y - py * 4.6 };
  s += '<polygon points="' + pts([g1, g2, g3, g4]) + '" fill="#4A3018"/>';
  s += '<polygon points="' + pts([g1, P(0, 0), gripEnd, g4]) + '" fill="#5E4024"/>';
  for (let i = 1; i <= 3; i++) {
    const c = { x: B.x - ux * 5 * i, y: B.y - uy * 5 * i };
    s += '<line x1="' + (c.x + px * 4.4) + '" y1="' + (c.y + py * 4.4) + '" x2="' + (c.x - px * 4.4) + '" y2="' + (c.y - py * 4.4) + '" stroke="#3A2410" stroke-width="1.4"/>';
  }
  s += '<circle cx="' + gripEnd.x + '" cy="' + gripEnd.y + '" r="4.4" fill="#2A1A08"/>';

  // Reel with crank
  const rc = P(0.15, 7.5);
  s += '<line x1="' + P(0.15, 0).x + '" y1="' + P(0.15, 0).y + '" x2="' + rc.x + '" y2="' + rc.y + '" stroke="#16333A" stroke-width="2.6"/>';
  s += '<circle cx="' + rc.x + '" cy="' + rc.y + '" r="6.6" fill="#16333A"/>';
  s += '<circle cx="' + rc.x + '" cy="' + rc.y + '" r="3" fill="#AFC3C9"/>';
  s += '<line x1="' + rc.x + '" y1="' + rc.y + '" x2="' + (rc.x + 7) + '" y2="' + (rc.y + 4.5) + '" stroke="#16333A" stroke-width="1.8"/>';
  s += '<circle cx="' + (rc.x + 7) + '" cy="' + (rc.y + 4.5) + '" r="2.1" fill="' + meta.main + '"/>';

  // Line guides
  [0.42, 0.64, 0.85].forEach((t, i) => {
    const gp = P(t, 4.8 - t * 1.8);
    s += '<circle cx="' + gp.x + '" cy="' + gp.y + '" r="' + (2.6 - i * 0.5) + '" fill="none" stroke="' + meta.dark + '" stroke-width="1"/>';
  });

  // Tier extras
  if (meta.bands) [0.3, 0.5, 0.7].forEach(t => {
    const a = P(t, wAt(t)), b = P(t, -wAt(t));
    s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + meta.bands + '" stroke-width="2.2"/>';
  });
  if (meta.sparkle) {
    s += '<path d="M92 22 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z" fill="#FFF3C4"/>';
    s += '<path d="M70 46 l1.1 3 3 1.1 -3 1.1 -1.1 3 -1.1 -3 -3 -1.1 3 -1.1 Z" fill="#FFF3C4"/>';
  }

  // Line + bobber
  s += '<path d="M' + T.x + ' ' + T.y + ' Q ' + (T.x + 12) + ' ' + (T.y + 28) + ' ' + (T.x + 7) + ' ' + (T.y + 54) + '" fill="none" stroke="#8FA0A6" stroke-width="1"/>';
  s += '<circle cx="' + (T.x + 7) + '" cy="' + (T.y + 58) + '" r="4" fill="#FF6B4A"/><circle cx="' + (T.x + 5.8) + '" cy="' + (T.y + 56.4) + '" r="1.4" fill="#FFD9CE"/>';

  return '<svg viewBox="0 0 108 124" width="100%" height="104" aria-hidden="true">' + s + '</svg>';
}

function _baitSVG(id) {
  if (id === 'worm') {
    // Segmented worm on soil
    let s = '<ellipse cx="54" cy="66" rx="34" ry="7" fill="#5A3C20"/>';
    const seg = [[26,52],[36,44],[47,42],[58,45],[68,52],[77,46],[84,37]];
    for (let i = seg.length - 1; i >= 0; i--) {
      s += '<circle cx="' + seg[i][0] + '" cy="' + seg[i][1] + '" r="' + (8 - i * 0.55) + '" fill="' + (i % 2 ? '#D98868' : '#C4724F') + '"/>';
      s += '<circle cx="' + (seg[i][0] - 2) + '" cy="' + (seg[i][1] - 2.4) + '" r="' + (8 - i * 0.55) * 0.42 + '" fill="#E8A183"/>';
    }
    s += '<circle cx="24" cy="49.5" r="1.5" fill="#0D2428"/>';
    return '<svg viewBox="0 0 108 78" width="100%" height="72" aria-hidden="true">' + s + '</svg>';
  }
  if (id === 'shrimp') {
    // Curved segmented shrimp with tail fan + antennae
    let s = '';
    s += '<path d="M28 30 Q10 22 6 12" fill="none" stroke="#E07B58" stroke-width="1.6"/>';
    s += '<path d="M28 33 Q12 30 4 26" fill="none" stroke="#E07B58" stroke-width="1.6"/>';
    const seg = [[30,32,11],[43,28,11.5],[56,30,10.5],[67,37,9],[75,46,7.5],[79,55,6]];
    for (let i = seg.length - 1; i >= 0; i--) {
      s += '<circle cx="' + seg[i][0] + '" cy="' + seg[i][1] + '" r="' + seg[i][2] + '" fill="' + (i % 2 ? '#FF9E7D' : '#F08461') + '"/>';
      s += '<path d="M' + (seg[i][0] - seg[i][2]) + ' ' + seg[i][1] + ' A' + seg[i][2] + ' ' + seg[i][2] + ' 0 0 1 ' + (seg[i][0] + seg[i][2] * 0.2) + ' ' + (seg[i][1] - seg[i][2]) + '" fill="none" stroke="#D96B47" stroke-width="1.4"/>';
    }
    s += '<polygon points="79,55 96,48 92,60 96,66 82,62" fill="#F08461"/>';
    s += '<polygon points="79,55 92,52 88,60 82,60" fill="#FFB79B"/>';
    s += '<circle cx="27" cy="29" r="2.2" fill="#0D2428"/>';
    for (let lx = 36; lx <= 62; lx += 9) s += '<line x1="' + lx + '" y1="41" x2="' + (lx - 4) + '" y2="50" stroke="#E07B58" stroke-width="1.6"/>';
    return '<svg viewBox="0 0 108 78" width="100%" height="72" aria-hidden="true">' + s + '</svg>';
  }
  if (id === 'squid') {
    // Low-poly squid: mantle + fins + tentacles
    let s = '';
    s += '<polygon points="54,6 70,34 38,34" fill="#C9A0D0"/>';
    s += '<polygon points="54,6 70,34 54,34" fill="#B183BC"/>';
    s += '<polygon points="54,10 78,22 70,32" fill="#B183BC"/>';
    s += '<polygon points="54,10 30,22 38,32" fill="#D8B7DE"/>';
    s += '<rect x="38" y="33" width="32" height="14" rx="4" fill="#C9A0D0"/>';
    s += '<circle cx="47" cy="40" r="3.4" fill="#FFFFFF"/><circle cx="47" cy="40" r="1.7" fill="#0D2428"/>';
    s += '<circle cx="61" cy="40" r="3.4" fill="#FFFFFF"/><circle cx="61" cy="40" r="1.7" fill="#0D2428"/>';
    const tent = [[40,-14],[46,-6],[52,-16],[58,-6],[64,-14],[68,-8]];
    tent.forEach((t, i) => {
      s += '<path d="M' + t[0] + ' 46 q ' + t[1] * 0.3 + ' 10 ' + t[1] * 0.6 + ' 22" fill="none" stroke="' + (i % 2 ? '#B183BC' : '#C9A0D0') + '" stroke-width="3.6" stroke-linecap="round"/>';
    });
    return '<svg viewBox="0 0 108 78" width="100%" height="72" aria-hidden="true">' + s + '</svg>';
  }
  return '<svg viewBox="0 0 108 78" width="100%" height="72" aria-hidden="true"><circle cx="54" cy="39" r="18" fill="#8DA6B8"/></svg>';
}

function _statBar(pct, color) {
  return '<div style="height:6px; border-radius:4px; background:rgba(244,231,195,0.15); overflow:hidden; margin-top:3px;">' +
    '<div style="width:' + Math.max(0, Math.min(100, pct)) + '%; height:100%; border-radius:4px; background:' + color + ';"></div></div>';
}

function _statRow(label, value, barHtml) {
  return '<div style="margin-top:7px;">' +
    '<div style="display:flex; justify-content:space-between; font-size:11.5px; opacity:0.8;">' +
    '<span>' + label + '</span><span style="font-weight:700; opacity:1;">' + value + '</span></div>' +
    (barHtml || '') + '</div>';
}

// ── Rods Tab (cards) ──────────────────────────────────────────────────

function _renderRodsTab(container) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;';

  ROD_DATA.forEach(rod => {
    const owned = hasRod(rod.id);
    const meta = ROD_META[rod.id] || { tierHe: '', capColor: '#F4E7C3', main: '#C98F14', light: '#E0AA2E', dark: '#8A6210', flavor: '' };
    const speedPct = Math.round((1.05 - rod.meterSpeed) / 0.4 * 100);

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid ${owned ? '#7ACB5E' : 'rgba(244, 231, 195, 0.2)'};
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
    `;

    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="font-family:Fredoka,sans-serif; font-size:17px;">${rod.nameHe} ${owned ? '✓' : ''}</span>
        <span style="font-size:10px; font-weight:700; color:#0D2428; background:${meta.capColor}; padding:2px 8px; border-radius:8px;">${meta.tierHe}</span>
      </div>
      ${_rodSVG(meta)}
      ${_statRow('דיוק — Sweet Spot', (rod.centerZone * 100).toFixed(0) + '%', _statBar(rod.centerZone * 100 / 0.4, meta.main === '#1C3A40' ? '#2BB3BD' : meta.main))}
      ${_statRow('שליטה במד (' + rod.meterSpeed.toFixed(1) + 'x)', speedPct + '%', _statBar(speedPct, '#2BB3BD'))}
      <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:12px;">
        <span style="opacity:0.8;">עד נדירות</span>
        <span style="font-weight:700; color:${meta.capColor};">${rod.maxRarity}</span>
      </div>
      <div style="font-size:10.5px; opacity:0.55; margin-top:6px; line-height:1.35; min-height:26px;">${meta.flavor}</div>
    `;

    const buyBtn = document.createElement('button');
    buyBtn.textContent = owned ? 'בבעלותך' : `${rod.price} 🪙`;
    buyBtn.disabled = owned;
    buyBtn.style.cssText = `
      margin-top: 8px;
      padding: 9px 0;
      width: 100%;
      background: ${owned ? 'rgba(122, 203, 94, 0.3)' : '#FF6B4A'};
      border: 2px solid ${owned ? '#7ACB5E' : '#E04B2A'};
      border-radius: 8px;
      color: ${owned ? '#7ACB5E' : '#F4E7C3'};
      font-size: 15px;
      font-family: Fredoka, sans-serif;
      cursor: ${owned ? 'not-allowed' : 'pointer'};
      transition: all 0.2s ease;
    `;

    if (!owned) {
      buyBtn.addEventListener('mouseenter', () => { buyBtn.style.background = '#E85A4A'; });
      buyBtn.addEventListener('mouseleave', () => { buyBtn.style.background = '#FF6B4A'; });
      buyBtn.addEventListener('click', () => _buyRod(rod.id, rod.price));
    }

    card.appendChild(buyBtn);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ── Baits Tab (cards) ─────────────────────────────────────────────────

function _renderBaitsTab(container) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;';

  BAIT_DATA.forEach(bait => {
    const count = getBaitCount(bait.id);
    const meta = BAIT_META[bait.id] || { effectHe: '', boostPct: 25, boostColor: '#8DA6B8', flavor: '' };

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(244, 231, 195, 0.2);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
    `;

    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="font-family:Fredoka,sans-serif; font-size:17px;">${bait.nameHe}</span>
        <span style="font-size:11px; font-weight:700; color:#F4E7C3; background:rgba(244,231,195,0.15); padding:2px 9px; border-radius:8px;">בבעלותך: ${count}</span>
      </div>
      ${_baitSVG(bait.id)}
      ${_statRow('בונוס נדירות', '', _statBar(meta.boostPct, meta.boostColor))}
      <div style="font-size:12px; font-weight:600; color:${meta.boostColor}; margin-top:4px;">${meta.effectHe}</div>
      <div style="font-size:10.5px; opacity:0.55; margin-top:5px; line-height:1.35; min-height:15px;">${meta.flavor}</div>
      <div style="display:flex; justify-content:space-between; margin-top:7px; font-size:12px;">
        <span style="opacity:0.8;">מחיר ליחידה</span>
        <span style="font-weight:800; color:#F0B429;">${bait.price} 🪙</span>
      </div>
    `;

    const buyControls = document.createElement('div');
    buyControls.style.cssText = 'display:flex; gap:6px; margin-top:8px;';

    [1, 5, 10].forEach(qty => {
      const btn = document.createElement('button');
      btn.innerHTML = `<div style="font-size:13px; font-weight:700;">${qty}x</div><div style="font-size:10.5px; opacity:0.85;">${bait.price * qty} 🪙</div>`;
      btn.style.cssText = `
        flex: 1;
        padding: 6px 0;
        background: #FF6B4A;
        border: 2px solid #E04B2A;
        border-radius: 8px;
        color: #F4E7C3;
        font-family: Heebo, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
        line-height: 1.2;
      `;
      btn.addEventListener('mouseenter', () => { btn.style.background = '#E85A4A'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#FF6B4A'; });
      btn.addEventListener('click', () => {
        console.log('[fishermanShop] Buy button clicked:', { baitId: bait.id, qty, totalPrice: bait.price * qty });
        _buyBait(bait.id, qty, bait.price * qty);
      });
      buyControls.appendChild(btn);
    });

    card.appendChild(buyControls);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ── Sell Tab ──────────────────────────────────────────────────────────

function _notify(msg) {
  if (window.showTemporaryMessage) window.showTemporaryMessage(msg);
  else alert(msg);
}

function _renderSellTab(container) {
  // Ask the server for its authoritative list (sell indices must match it)
  if (_socket) _socket.emit('loadFishingData');
  const caughtFish = (_serverFish !== null) ? _serverFish : getCaughtFish();

  if (caughtFish.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'אין דגים למכירה. לך לדוג! 🎣';
    empty.style.cssText = `
      text-align: center;
      padding: 40px;
      font-size: 18px;
      opacity: 0.6;
    `;
    container.appendChild(empty);
    return;
  }

  caughtFish.forEach((entry, index) => {
    const fish = getFishById(entry.fishId);
    if (!fish) return;

    const item = document.createElement('div');
    item.style.cssText = `
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(244, 231, 195, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const info = document.createElement('div');
    info.innerHTML = `
      <div style="font-family: Fredoka, sans-serif; font-size: 20px; margin-bottom: 4px;">
        ${fish.nameHe}
      </div>
      <div style="font-size: 14px; opacity: 0.8; color: ${_getRarityColor(fish.rarity)};">
        ${_getRarityNameHe(fish.rarity)}
      </div>
    `;

    const sellBtn = document.createElement('button');
    sellBtn.textContent = `מכור: ${fish.price} 🪙`;
    sellBtn.style.cssText = `
      padding: 10px 20px;
      background: #F0B429;
      border: 2px solid #D09409;
      border-radius: 8px;
      color: #2C3E50;
      font-size: 16px;
      font-family: Fredoka, sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    sellBtn.addEventListener('mouseenter', () => {
      sellBtn.style.background = '#FFD54F';
    });
    sellBtn.addEventListener('mouseleave', () => {
      sellBtn.style.background = '#F0B429';
    });
    sellBtn.addEventListener('click', () => _sellFish(index, entry.fishId, fish.price));

    item.appendChild(info);
    item.appendChild(sellBtn);
    container.appendChild(item);
  });
}

// ── Purchase/Sell Actions ─────────────────────────────────────────────

function _buyRod(rodId, price) {
  console.log('[fishermanShop] Buying rod:', { rodId, price });
  _socket.emit('buyRod', { rodId, price });
}

function _buyBait(baitId, qty, totalPrice) {
  console.log('[fishermanShop] _buyBait called:', { baitId, qty, totalPrice });
  console.log('[fishermanShop] Socket status:', _socket ? 'EXISTS' : 'NULL');
  if (!_socket) {
    console.error('[fishermanShop] ERROR: Socket is null!');
    alert('שגיאה: אין חיבור לשרת');
    return;
  }
  _socket.emit('buyBait', { baitId, qty, totalPrice });
  console.log('[fishermanShop] buyBait event emitted to server');
}

function _sellFish(index, fishId, price) {
  console.log('[fishermanShop] _sellFish called:', { index, fishId, price });
  if (!_socket) {
    console.error('[fishermanShop] ERROR: Socket is null!');
    _notify('שגיאה: אין חיבור לשרת');
    return;
  }
  if (_sellPending) { console.log('[fishermanShop] sell already pending, ignoring click'); return; }
  _sellPending = true;
  _socket.emit('sellFish', { index, fishId, price });
  console.log('[fishermanShop] sellFish event emitted to server');
  _sellWatchdog = setTimeout(() => {
    _sellPending = false;
    console.error('[fishermanShop] No fishingSellResult from server after 3s');
    _notify('השרת לא הגיב למכירה — בדוק את טרמינל השרת');
  }, 3000);
}

function _handlePurchaseResult(data) {
  console.log('[fishermanShop] Received purchase result:', JSON.stringify(data));
  if (data.success) {
    console.log('[fishermanShop] Purchase success:', JSON.stringify(data));
    if (_onCoinUpdate) _onCoinUpdate(data.newBalance);

    // Update local inventory
    if (data.ownedRods) {
      // Rod purchase
      if (window.updateFishingInventory) {
        window.updateFishingInventory({
          ownedRods: data.ownedRods,
          currentRod: data.currentRod
        });
      }
    } else if (data.baitId && data.newQty !== undefined) {
      // Bait purchase - update with TOTAL count from server
      if (window.updateFishingInventory) {
        const baitUpdate = {
          worm: data.baitId === 'worm' ? data.newQty : undefined,
          shrimp: data.baitId === 'shrimp' ? data.newQty : undefined,
          squid: data.baitId === 'squid' ? data.newQty : undefined
        };
        // Remove undefined values
        Object.keys(baitUpdate).forEach(key => {
          if (baitUpdate[key] === undefined) delete baitUpdate[key];
        });
        window.updateFishingInventory({ baits: baitUpdate });
        console.log('[fishermanShop] Bait updated:', baitUpdate);
      }
    }

    // Small delay to ensure state updates before re-render
    setTimeout(() => {
      _renderTab(_currentTab); // Refresh current tab
    }, 50);
  } else {
    alert(data.message || 'לא מספיק מטבעות!');
  }
}

function _handleSellResult(data) {
  console.log('[fishermanShop] Received sell result:', JSON.stringify(data));
  if (_sellWatchdog) { clearTimeout(_sellWatchdog); _sellWatchdog = null; }
  _sellPending = false;
  if (data.success) {
    if (_onCoinUpdate) _onCoinUpdate(data.newBalance);
    _notify('נמכר! +' + data.price + ' 🪙');
    if (_socket) _socket.emit('loadFishingData');   // refresh authoritative list → re-renders tab
  } else {
    _notify(data.message || 'מכירה נכשלה');
    if (_socket) _socket.emit('loadFishingData');   // resync after failure (fixes index desync)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function _getRarityColor(rarity) {
  const colors = {
    common: '#8DA6B8',
    uncommon: '#81C784',
    rare: '#64B5F6',
    epic: '#BA68C8',
    legendary: '#F0B429'
  };
  return colors[rarity] || '#F4E7C3';
}

function _getRarityNameHe(rarity) {
  const names = {
    common: 'רגיל',
    uncommon: 'לא שכיח',
    rare: 'נדיר',
    epic: 'אפי',
    legendary: 'אגדי'
  };
  return names[rarity] || rarity;
}