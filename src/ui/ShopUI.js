import { attachHat, attachHandItem, HATS, HAND_ITEMS } from '../player/CharacterBuilder.js';

// Shop items data - all 5 categories with 20 items each, sorted by price
const SHOP_ITEMS = {
  hats: [
    { id:'hat_cap_red',     name:'כומתה אדומה',      price:20,   type:'cap',    emoji:'🧢' },
    { id:'hat_cap_blue',    name:'כומתה כחולה',      price:20,   type:'cap',    emoji:'🧢' },
    { id:'hat_cap_green',   name:'כומתה ירוקה',      price:25,   type:'cap',    emoji:'🧢' },
    { id:'hat_straw',       name:'כובע קש',          price:35,   type:'straw',  emoji:'👒' },
    { id:'hat_beanie_red',  name:'כפה אדומה',        price:40,   type:'beanie', emoji:'🧤' },
    { id:'hat_beanie_wht',  name:'כפה לבנה',         price:40,   type:'beanie', emoji:'🧤' },
    { id:'hat_tophat_blk',  name:'כובע גבוה שחור',   price:60,   type:'tophat', emoji:'🎩' },
    { id:'hat_tophat_brn',  name:'כובע גבוה חום',    price:65,   type:'tophat', emoji:'🎩' },
    { id:'hat_farmer',      name:'קסדת חקלאי',       price:75,   type:'farmer', emoji:'🪖' },
    { id:'hat_cowboy',      name:'כובע קאובוי',      price:90,   type:'cowboy', emoji:'🤠' },
    { id:'hat_helmet',      name:'קסדת אופנוע',      price:120,  type:'helmet', emoji:'🪖' },
    { id:'hat_pirate',      name:'כובע פיראט',       price:150,  type:'pirate', emoji:'🏴‍☠️' },
    { id:'hat_viking',      name:'קסדת ויקינג',      price:200,  type:'viking', emoji:'⚔️' },
    { id:'hat_wizard',      name:'כובע קוסם',        price:180,  type:'wizard', emoji:'🧙' },
    { id:'hat_halo',        name:'הילה רגילה',       price:220,  type:'angelic',emoji:'👼' },
    { id:'hat_crown_slvr',  name:'כתר כסף',          price:300,  type:'crown',  emoji:'👑' },
    { id:'hat_crown_gold',  name:'כתר זהב',          price:400,  type:'crown',  emoji:'👑' },
    { id:'hat_crown_ruby',  name:'כתר רובי',         price:500,  type:'crown',  emoji:'👑' },
    { id:'hat_angelic',     name:'כתר מלאכי',        price:750,  type:'angelic',emoji:'👼' },
    { id:'hat_legendary',   name:'כתר אגדי ✨',      price:1000, type:'crown',  emoji:'👑' },
  ],

  shoes: [
    { id:'shoes_white',    name:'נעלי ספורט לבן',   price:20,  emoji:'👟' },
    { id:'shoes_black',    name:'נעלי ספורט שחור',  price:20,  emoji:'👟' },
    { id:'shoes_red',      name:'נעלי ספורט אדום',  price:25,  emoji:'👟' },
    { id:'shoes_blue',     name:'נעלי ספורט כחול',  price:25,  emoji:'👟' },
    { id:'shoes_green',    name:'נעלי ספורט ירוק',  price:30,  emoji:'👟' },
    { id:'shoes_yellow',   name:'נעליים צהובות',    price:35,  emoji:'👟' },
    { id:'shoes_boots_brn',name:'מגפיים חומים',     price:60,  emoji:'🥾' },
    { id:'shoes_boots_blk',name:'מגפיים שחורים',    price:65,  emoji:'🥾' },
    { id:'shoes_boots_red',name:'מגפיים אדומים',    price:70,  emoji:'🥾' },
    { id:'shoes_boots_cow',name:'מגפי קאובוי',      price:90,  emoji:'🥾' },
    { id:'shoes_sneaker_hi',name:'סניקרס גבוה',     price:80,  emoji:'👟' },
    { id:'shoes_platform', name:'נעלי פלטפורמה',   price:100, emoji:'👠' },
    { id:'shoes_knight',   name:'נעלי אביר',        price:150, emoji:'🥾' },
    { id:'shoes_golden',   name:'נעליים מוזהבות',   price:200, emoji:'👞' },
    { id:'shoes_fire',     name:'נעלי אש 🔥',       price:300, emoji:'👟' },
    { id:'shoes_ice',      name:'נעלי קרח ❄️',      price:300, emoji:'👟' },
    { id:'shoes_shadow',   name:'נעלי צל',          price:400, emoji:'👟' },
    { id:'shoes_cloud',    name:'נעלי ענן',         price:500, emoji:'👟' },
    { id:'shoes_rainbow',  name:'נעלי קשת',         price:750, emoji:'👟' },
    { id:'shoes_legendary',name:'נעלי אגדה ✨',     price:1000,emoji:'👟' },
  ],

  handItems: [
    { id:'hand_rake',      name:'מגרפה',            price:20,  type:'rake',     emoji:'🌾' },
    { id:'hand_broom',     name:'מטאטא',            price:20,  type:'broom',    emoji:'🧹' },
    { id:'hand_watering',  name:'קנקן השקיה',       price:30,  type:'watering', emoji:'🪣' },
    { id:'hand_shovel',    name:'מעדר',             price:30,  type:'shovel',   emoji:'⛏️' },
    { id:'hand_scythe',    name:'חרמש',             price:40,  type:'scythe',   emoji:'🌿' },
    { id:'hand_lantern',   name:'פנס',              price:50,  type:'lantern',  emoji:'🏮' },
    { id:'hand_basket',    name:'סל',               price:50,  type:'basket',   emoji:'🧺' },
    { id:'hand_fishing',   name:'חכת דיג',          price:60,  type:'fishing',  emoji:'🎣' },
    { id:'hand_sword',     name:'חרב',              price:80,  type:'sword',    emoji:'⚔️' },
    { id:'hand_shield',    name:'מגן',              price:80,  type:'shield',   emoji:'🛡️' },
    { id:'hand_bow',       name:'קשת',              price:100, type:'bow',      emoji:'🏹' },
    { id:'hand_axe',       name:'גרזן',             price:100, type:'axe',      emoji:'🪓' },
    { id:'hand_wand',      name:'שרביט קוסם',       price:120, type:'wand',     emoji:'🪄' },
    { id:'hand_staff',     name:'מטה קסום',         price:150, type:'staff',    emoji:'🪄' },
    { id:'hand_trident',   name:'טריידנט',          price:200, type:'trident',  emoji:'🔱' },
    { id:'hand_hammer',    name:'פטיש ענק',         price:200, type:'hammer',   emoji:'🔨' },
    { id:'hand_scythe_g',  name:'חרמש זהב',         price:300, type:'scythe_g', emoji:'✨' },
    { id:'hand_sword_f',   name:'חרב אש 🔥',        price:500, type:'sword_f',  emoji:'🔥' },
    { id:'hand_staff_arc', name:'מטה ארקאן ✨',     price:750, type:'staff_arc',emoji:'🔮' },
    { id:'hand_legendary', name:'נשק אגדי ⚡',      price:1000,type:'legendary',emoji:'⚡' },
  ],

  cloaks: [
    { id:'cloak_red',      name:'גלימה אדומה',      price:40,  shirt:'#C62828', pants:'#B71C1C', emoji:'👗' },
    { id:'cloak_blue',     name:'גלימה כחולה',      price:40,  shirt:'#1565C0', pants:'#0D47A1', emoji:'👗' },
    { id:'cloak_green',    name:'גלימה ירוקה',      price:45,  shirt:'#2E7D32', pants:'#1B5E20', emoji:'👗' },
    { id:'cloak_purple',   name:'גלימה סגולה',      price:50,  shirt:'#6A1B9A', pants:'#4A148C', emoji:'👗' },
    { id:'cloak_black',    name:'גלימה שחורה',      price:55,  shirt:'#111',    pants:'#111',    emoji:'👗' },
    { id:'cloak_white',    name:'גלימה לבנה',       price:55,  shirt:'#F5F5F5', pants:'#E0E0E0', emoji:'👗' },
    { id:'cloak_gold',     name:'חלוק זהב',         price:80,  shirt:'#FFD700', pants:'#FFA000', emoji:'👘' },
    { id:'cloak_ninja',    name:'תלבושת ניניה',     price:100, shirt:'#1a1a1a', pants:'#222',    emoji:'🥷' },
    { id:'cloak_pirate',   name:'תלבושת פיראט',     price:120, shirt:'#5D4037', pants:'#333',    emoji:'🏴‍☠️' },
    { id:'cloak_wizard',   name:'גלימת קוסם',       price:150, shirt:'#4A148C', pants:'#311B92', emoji:'🧙' },
    { id:'cloak_knight',   name:'שריון אביר',       price:200, shirt:'#9E9E9E', pants:'#757575', emoji:'⚔️' },
    { id:'cloak_samurai',  name:'שריון סמוראי',     price:250, shirt:'#C62828', pants:'#111',    emoji:'⚔️' },
    { id:'cloak_angel',    name:'גלימת מלאך',       price:300, shirt:'#E3F2FD', pants:'#BBDEFB', emoji:'👼' },
    { id:'cloak_demon',    name:'גלימת שד',         price:300, shirt:'#8B0000', pants:'#4a0000', emoji:'😈' },
    { id:'cloak_royal',    name:'גלימה מלכותית',    price:400, shirt:'#B8860B', pants:'#8B0000', emoji:'👑' },
    { id:'cloak_shadow',   name:'גלימת צל',         price:450, shirt:'#1A1A2E', pants:'#0D0D1A', emoji:'🌑' },
    { id:'cloak_fire',     name:'גלימת אש 🔥',      price:600, shirt:'#FF3D00', pants:'#DD2C00', emoji:'🔥' },
    { id:'cloak_ice',      name:'גלימת קרח ❄️',     price:600, shirt:'#80DEEA', pants:'#4DD0E1', emoji:'❄️' },
    { id:'cloak_rainbow',  name:'גלימת קשת 🌈',     price:800, shirt:'#FF4081', pants:'#E040FB', emoji:'🌈' },
    { id:'cloak_legendary',name:'גלימה אגדית ✨',   price:1000,shirt:'#FFD600', pants:'#FF6F00', emoji:'✨' },
  ],

  pets: [
    { id:'pet_cat_orange', name:'חתול כתום',        price:1000, type:'cat',    colorIndex:0, emoji:'🐱' },
    { id:'pet_cat_black',  name:'חתול שחור',        price:1000, type:'cat',    colorIndex:1, emoji:'🐱' },
    { id:'pet_dog_golden', name:'כלב זהוב',         price:1000, type:'dog',    colorIndex:0, emoji:'🐶' },
    { id:'pet_dog_white',  name:'כלב לבן',          price:1000, type:'dog',    colorIndex:1, emoji:'🐶' },
    { id:'pet_mouse_wht',  name:'עכבר לבן',         price:1000, type:'mouse',  colorIndex:0, emoji:'🐭' },
    { id:'pet_mouse_brn',  name:'עכבר חום',         price:1000, type:'mouse',  colorIndex:1, emoji:'🐭' },
    { id:'pet_snake_grn',  name:'נחש ירוק',         price:1500, type:'snake',  colorIndex:0, emoji:'🐍' },
    { id:'pet_cat_white',  name:'חתול לבן',         price:2000, type:'cat',    colorIndex:2, emoji:'🐱' },
    { id:'pet_cat_gray',   name:'חתול אפור',        price:2000, type:'cat',    colorIndex:3, emoji:'🐱' },
    { id:'pet_dog_black',  name:'כלב שחור',         price:2000, type:'dog',    colorIndex:2, emoji:'🐶' },
    { id:'pet_dog_brown',  name:'כלב חום',          price:2000, type:'dog',    colorIndex:3, emoji:'🐶' },
    { id:'pet_iguana_grn', name:'איגואנה ירוקה',    price:2000, type:'iguana', colorIndex:0, emoji:'🦎' },
    { id:'pet_snake_red',  name:'נחש אדום',         price:2000, type:'snake',  colorIndex:1, emoji:'🐍' },
    { id:'pet_snake_blk',  name:'נחש שחור',         price:2500, type:'snake',  colorIndex:2, emoji:'🐍' },
    { id:'pet_iguana_blu', name:'איגואנה כחולה',    price:2500, type:'iguana', colorIndex:1, emoji:'🦎' },
    { id:'pet_cat_calico', name:'חתול קלדי',        price:3000, type:'cat',    colorIndex:4, emoji:'🐱' },
    { id:'pet_dog_spotted',name:'כלב מנוקד',        price:3000, type:'dog',    colorIndex:4, emoji:'🐶' },
    { id:'pet_iguana_red', name:'איגואנה אדומה',    price:3000, type:'iguana', colorIndex:2, emoji:'🦎' },
    { id:'pet_dragon_grn', name:'דרקון ירוק 🐉',   price:5000, type:'dragon', colorIndex:0, emoji:'🐉' },
    { id:'pet_dragon_red', name:'דרקון אדום 🐉',   price:8000, type:'dragon', colorIndex:1, emoji:'🐉' },
  ],
};

// State
let _overlay = null;
let _ownedItems = new Set();

/**
 * Initialize shop UI
 */
export function initShopUI() {
  // Load player coins and owned items from localStorage
  window.playerCoins = parseInt(localStorage.getItem('player_coins') || '500');
  _ownedItems = new Set(JSON.parse(localStorage.getItem('owned_items') || '[]'));

  // Create shop overlay
  _createShopOverlay();

  // Set global functions
  window.openMainShop = _openShop;
  window.closeMainShop = _closeShop;

  console.log('[ShopUI] Initialized with', window.playerCoins, 'coins and', _ownedItems.size, 'owned items');
}

/**
 * Create shop overlay DOM
 */
function _createShopOverlay() {
  _overlay = document.createElement('div');
  _overlay.id = 'shop-overlay';
  _overlay.style.display = 'none';

  _overlay.innerHTML = `
    <style>
      #shop-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.92);
        backdrop-filter: blur(10px);
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Arial, sans-serif;
        direction: rtl;
      }

      .shop-container {
        width: 90%;
        max-width: 1200px;
        height: 85%;
        max-height: 800px;
        background: rgba(20, 20, 30, 0.95);
        border-radius: 20px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .shop-header {
        background: linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%);
        padding: 20px 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
      }

      .shop-title {
        font-size: 28px;
        font-weight: bold;
        color: white;
      }

      .shop-balance {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(0, 0, 0, 0.3);
        padding: 8px 20px;
        border-radius: 20px;
        font-size: 18px;
        font-weight: 600;
        color: #FFD700;
      }

      .shop-close {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 28px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .shop-close:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }

      .shop-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .shop-categories {
        width: 200px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        padding: 20px 0;
        overflow-y: auto;
      }

      .shop-category {
        padding: 15px 25px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        font-weight: 500;
        transition: all 0.2s;
        border-right: 3px solid transparent;
      }

      .shop-category:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }

      .shop-category.active {
        background: rgba(138, 43, 226, 0.2);
        color: white;
        border-right-color: #9C27B0;
      }

      .shop-items {
        flex: 1;
        padding: 30px;
        overflow-y: auto;
      }

      .shop-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }

      .shop-item {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
      }

      .shop-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(138, 43, 226, 0.5);
        transform: translateY(-2px);
      }

      .shop-item.owned::after {
        content: '✓ נקנה';
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }

      .shop-item-emoji {
        font-size: 48px;
        margin-bottom: 10px;
      }

      .shop-item-name {
        color: white;
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 10px;
      }

      .shop-item-price {
        color: #FFD700;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
      }

      .shop-item-btn {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .shop-item-btn.buy {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
      }

      .shop-item-btn.buy:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }

      .shop-item-btn.cant-afford {
        background: rgba(100, 100, 100, 0.5);
        color: rgba(255, 255, 255, 0.5);
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .shop-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .shop-categories {
          width: 150px;
        }

        .shop-category {
          padding: 12px 15px;
          font-size: 14px;
        }
      }

      @media (max-width: 600px) {
        .shop-container {
          width: 95%;
          height: 90%;
        }

        .shop-header {
          padding: 15px 20px;
        }

        .shop-title {
          font-size: 20px;
        }

        .shop-balance {
          font-size: 14px;
          padding: 6px 12px;
        }

        .shop-categories {
          width: 100px;
        }

        .shop-category {
          padding: 10px 8px;
          font-size: 12px;
        }

        .shop-items {
          padding: 15px;
        }

        .shop-grid {
          gap: 15px;
        }
      }
    </style>

    <div class="shop-container">
      <div class="shop-header">
        <div class="shop-title">🏪 חנות ראשית</div>
        <div class="shop-balance">
          <span>💰 <span id="shop-balance-value">0</span> SUY COIN</span>
        </div>
        <button class="shop-close" onclick="window.closeMainShop()">×</button>
      </div>

      <div class="shop-body">
        <div class="shop-categories">
          <div class="shop-category active" data-category="hats">🎩 כובעים</div>
          <div class="shop-category" data-category="shoes">👟 נעליים</div>
          <div class="shop-category" data-category="handItems">🛠 ציוד יד</div>
          <div class="shop-category" data-category="cloaks">👗 גלימות</div>
          <div class="shop-category" data-category="pets">🐾 חיות</div>
        </div>

        <div class="shop-items">
          <div class="shop-grid" id="shop-grid"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(_overlay);

  // Setup category switching
  _overlay.querySelectorAll('.shop-category').forEach(cat => {
    cat.addEventListener('click', () => {
      _overlay.querySelectorAll('.shop-category').forEach(c => c.classList.remove('active'));
      cat.classList.add('active');
      _renderItems(cat.dataset.category);
    });
  });
}

/**
 * Open shop
 */
function _openShop() {
  if (!_overlay) return;
  _overlay.style.display = 'flex';
  _updateBalanceDisplay();
  _renderItems('hats'); // Default category
}

/**
 * Close shop
 */
function _closeShop() {
  if (!_overlay) return;
  _overlay.style.display = 'none';
}

/**
 * Update balance display
 */
function _updateBalanceDisplay() {
  const balanceEl = _overlay?.querySelector('#shop-balance-value');
  if (balanceEl) {
    balanceEl.textContent = window.playerCoins.toLocaleString();
  }

  // Update HUD coin display if available
  if (window.updateCoinDisplay) {
    window.updateCoinDisplay(window.playerCoins);
  }
}

/**
 * Render items for a category
 */
function _renderItems(category) {
  const grid = _overlay?.querySelector('#shop-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const items = SHOP_ITEMS[category] || [];

  items.forEach(item => {
    const owned = _ownedItems.has(item.id);
    const canAfford = window.playerCoins >= item.price;

    const card = document.createElement('div');
    card.className = `shop-item ${owned ? 'owned' : ''}`;
    card.innerHTML = `
      <div class="shop-item-emoji">${item.emoji}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-price">💰 ${item.price} COIN</div>
    `;

    if (!owned) {
      const btn = document.createElement('button');
      btn.className = `shop-item-btn ${canAfford ? 'buy' : 'cant-afford'}`;
      btn.textContent = canAfford ? 'קנה' : `💰 חסר ${item.price - window.playerCoins}`;

      if (canAfford) {
        btn.addEventListener('click', () => _buyItem(item, category));
      }

      card.appendChild(btn);
    }

    grid.appendChild(card);
  });
}

/**
 * Buy an item
 */
function _buyItem(item, category) {
  // Deduct coins
  window.playerCoins -= item.price;
  _ownedItems.add(item.id);

  // Save to localStorage
  localStorage.setItem('player_coins', window.playerCoins);
  localStorage.setItem('owned_items', JSON.stringify([..._ownedItems]));

  // Update display
  _updateBalanceDisplay();

  // Apply item immediately
  _applyItem(item, category);

  // Re-render current category
  const activeCategory = _overlay?.querySelector('.shop-category.active')?.dataset.category;
  if (activeCategory) {
    _renderItems(activeCategory);
  }

  console.log('[ShopUI] Bought', item.name, 'for', item.price, 'coins. Balance:', window.playerCoins);
}

/**
 * Apply purchased item to player
 */
function _applyItem(item, category) {
  switch (category) {
    case 'hats':
      if (window.applyPlayerHat) {
        window.applyPlayerHat(item.type);
      }
      break;

    case 'handItems':
      if (window.applyPlayerHandItem) {
        window.applyPlayerHandItem(item.type);
      }
      break;

    case 'cloaks':
      if (window.applyPlayerAppearance) {
        window.applyPlayerAppearance({
          shirt: item.shirt,
          pants: item.pants
        });
      }
      break;

    case 'pets':
      if (window.spawnPlayerPet) {
        window.spawnPlayerPet({
          type: item.type,
          colorIndex: item.colorIndex
        });
      }
      break;

    case 'shoes':
      // Shoes would need a new function window.applyPlayerShoes()
      console.log('[ShopUI] Shoes not implemented yet:', item.name);
      break;
  }
}
