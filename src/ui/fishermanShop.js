// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fisherman Shop UI (proximity interaction)
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

// ── Public API ────────────────────────────────────────────────────────

export function initFishermanShop(socket, onCoinUpdate) {
  console.log('[fishermanShop] Initializing with socket:', socket ? 'OK' : 'MISSING');
  _socket = socket;
  _onCoinUpdate = onCoinUpdate;

  // Socket listeners
  _socket.on('fishingPurchaseResult', _handlePurchaseResult);
  _socket.on('fishingSellResult', _handleSellResult);

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
    width: 600px;
    max-height: 80vh;
    background: rgba(13, 36, 40, 0.78);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    border-top-left-radius: 6px;
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.22), 0 8px 32px rgba(0, 0, 0, 0.4);
    padding: 24px;
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
    margin: 0 0 24px 0;
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
    margin-bottom: 20px;
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
    btn.style.background = isActive ? 'rgba(255, 107, 74, 0.3)' : 'transparent';
    btn.style.borderColor = isActive ? '#FF6B4A' : 'rgba(244, 231, 195, 0.2)';
  });

  if (tabId === 'rods') _renderRodsTab(content);
  else if (tabId === 'baits') _renderBaitsTab(content);
  else if (tabId === 'sell') _renderSellTab(content);
}

// ── Rods Tab ──────────────────────────────────────────────────────────

function _renderRodsTab(container) {
  ROD_DATA.forEach(rod => {
    const owned = hasRod(rod.id);

    const item = document.createElement('div');
    item.style.cssText = `
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid ${owned ? '#7ACB5E' : 'rgba(244, 231, 195, 0.2)'};
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
        ${rod.nameHe} ${owned ? '✓' : ''}
      </div>
      <div style="font-size: 14px; opacity: 0.8;">
        אזור מרכז: ${(rod.centerZone * 100).toFixed(0)}% | מהירות: ${rod.meterSpeed.toFixed(1)}x
      </div>
      <div style="font-size: 14px; opacity: 0.8;">
        עד נדירות: ${rod.maxRarity}
      </div>
    `;

    const buyBtn = document.createElement('button');
    buyBtn.textContent = owned ? 'בבעלותך' : `${rod.price} 🪙`;
    buyBtn.disabled = owned;
    buyBtn.style.cssText = `
      padding: 10px 20px;
      background: ${owned ? 'rgba(122, 203, 94, 0.3)' : '#FF6B4A'};
      border: 2px solid ${owned ? '#7ACB5E' : '#E04B2A'};
      border-radius: 8px;
      color: ${owned ? '#7ACB5E' : '#F4E7C3'};
      font-size: 16px;
      font-family: Fredoka, sans-serif;
      cursor: ${owned ? 'not-allowed' : 'pointer'};
      transition: all 0.2s ease;
    `;

    if (!owned) {
      buyBtn.addEventListener('mouseenter', () => {
        buyBtn.style.background = '#E85A4A';
      });
      buyBtn.addEventListener('mouseleave', () => {
        buyBtn.style.background = '#FF6B4A';
      });
      buyBtn.addEventListener('click', () => _buyRod(rod.id, rod.price));
    }

    item.appendChild(info);
    item.appendChild(buyBtn);
    container.appendChild(item);
  });
}

// ── Baits Tab ─────────────────────────────────────────────────────────

function _renderBaitsTab(container) {
  BAIT_DATA.forEach(bait => {
    const count = getBaitCount(bait.id);

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
        ${bait.nameHe}
      </div>
      <div style="font-size: 14px; opacity: 0.8;">
        בבעלותך: ${count}
      </div>
    `;

    const buyControls = document.createElement('div');
    buyControls.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;

    [1, 5, 10].forEach(qty => {
      const btn = document.createElement('button');
      btn.textContent = `${qty}x (${bait.price * qty} 🪙)`;
      btn.style.cssText = `
        padding: 8px 12px;
        background: #FF6B4A;
        border: 2px solid #E04B2A;
        border-radius: 8px;
        color: #F4E7C3;
        font-size: 14px;
        font-family: Heebo, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#E85A4A';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#FF6B4A';
      });
      btn.addEventListener('click', () => {
        console.log('[fishermanShop] Buy button clicked:', { baitId: bait.id, qty, totalPrice: bait.price * qty });
        _buyBait(bait.id, qty, bait.price * qty);
      });
      buyControls.appendChild(btn);
    });

    item.appendChild(info);
    item.appendChild(buyControls);
    container.appendChild(item);
  });
}

// ── Sell Tab ──────────────────────────────────────────────────────────

function _renderSellTab(container) {
  const caughtFish = getCaughtFish();

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
  _socket.emit('sellFish', { index, fishId, price });
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
  if (data.success) {
    console.log('[fishermanShop] Sell success:', data);
    if (_onCoinUpdate) _onCoinUpdate(data.newBalance);
    _renderTab('sell'); // Refresh sell tab
  } else {
    alert(data.message || 'מכירה נכשלה');
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
