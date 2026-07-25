// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Market Stall Shop UI
// ═══════════════════════════════════════════════════════════════════════

let _socket = null;
let _shopPanel = null;
let _isOpen = false;
let _currentHangar = 'north';
let _myStall = null;  // { hangar, number, expiresAt } or null
let _onCoinUpdate = null;
let _currentStallCheck = { number: null, available: false, ownedByMe: false };

const STALL_PRICE = 1000;
const HANGARS = {
  north: 'צפון',
  east: 'מזרח',
  south: 'דרום'
};

// ── Initialization ────────────────────────────────────────────────────

export function initStallShop(socket, onCoinUpdate) {
  console.log('[stallShop] Initializing with socket:', socket ? 'OK' : 'MISSING');
  _socket = socket;
  _onCoinUpdate = onCoinUpdate;

  try {
    // Socket listeners
    _socket.on('stallStatus', _handleStallStatus);
    _socket.on('rentResult', _handleRentResult);
    _socket.on('stallDataLoaded', _handleStallDataLoaded);
    _socket.on('coinsUpdated', (data) => {
      if (_onCoinUpdate) _onCoinUpdate(data.coins);
    });

    // Load player's stall data on init
    _socket.emit('loadStallData');

    console.log('[stallShop] Socket listeners registered');
  } catch (err) {
    console.error('[stallShop] Init error:', err);
  }
}

export function openStallShop(hangarId) {
  try {
    console.log('[stallShop] Opening shop for hangar:', hangarId, 'socket:', _socket ? 'connected' : 'missing');
    if (_isOpen) return;
    _isOpen = true;
    _currentHangar = hangarId;

    _createShopPanel();
  } catch (err) {
    console.error('[stallShop] Open error:', err);
  }
}

export function closeStallShop() {
  try {
    if (!_isOpen) return;
    _isOpen = false;

    if (_shopPanel && _shopPanel.parentNode) {
      _shopPanel.parentNode.removeChild(_shopPanel);
    }
    _shopPanel = null;
    _currentStallCheck = { number: null, available: false, ownedByMe: false };
  } catch (err) {
    console.error('[stallShop] Close error:', err);
  }
}

// ── Socket Handlers ───────────────────────────────────────────────────

function _handleStallStatus(data) {
  try {
    console.log('[stallShop] Stall status:', data);
    _currentStallCheck = {
      number: data.number,
      available: data.available,
      ownedByMe: data.ownedByMe
    };
    _renderRentalScreen();
  } catch (err) {
    console.error('[stallShop] Handle status error:', err);
  }
}

function _handleRentResult(data) {
  try {
    console.log('[stallShop] Rent result:', data);

    if (data.success) {
      _myStall = {
        hangar: data.hangar,
        number: data.number,
        expiresAt: data.expiresAt
      };
      alert(`השכרת בהצלחה את דוכן מספר ${data.number} ב${HANGARS[data.hangar]}!`);
      _renderOwnerScreen();
    } else {
      const reasons = {
        invalid_number: 'מספר דוכן לא תקין (1-40)',
        already_owns: 'אתה כבר משכיר דוכן',
        taken: 'דוכן זה כבר תפוס',
        not_enough_coins: 'אין לך מספיק מטבעות',
        server_error: 'שגיאת שרת, נסה שוב'
      };
      alert(reasons[data.reason] || 'שגיאה לא ידועה');
    }
  } catch (err) {
    console.error('[stallShop] Handle rent result error:', err);
  }
}

function _handleStallDataLoaded(data) {
  try {
    console.log('[stallShop] Stall data loaded:', data);
    _myStall = data.myStall;

    // If shop is open, refresh view
    if (_isOpen) {
      if (_myStall) {
        _renderOwnerScreen();
      } else {
        _renderRentalScreen();
      }
    }
  } catch (err) {
    console.error('[stallShop] Handle stall data error:', err);
  }
}

// ── UI Creation ───────────────────────────────────────────────────────

function _createShopPanel() {
  try {
    if (_shopPanel) {
      closeStallShop();
    }

    _shopPanel = document.createElement('div');
    _shopPanel.id = 'stall-shop';
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
    content.id = 'stall-shop-content';
    content.style.cssText = `
      width: min(500px, 94vw);
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
      direction: rtl;
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
    closeBtn.onclick = closeStallShop;
    content.appendChild(closeBtn);

    _shopPanel.appendChild(content);
    document.body.appendChild(_shopPanel);

    // Render appropriate screen
    if (_myStall) {
      _renderOwnerScreen();
    } else {
      _renderRentalScreen();
    }
  } catch (err) {
    console.error('[stallShop] Create panel error:', err);
  }
}

function _renderRentalScreen() {
  try {
    const content = document.getElementById('stall-shop-content');
    if (!content) return;

    // Clear except close button
    const closeBtn = content.querySelector('button');
    content.innerHTML = '';
    if (closeBtn) content.appendChild(closeBtn);

    // Title
    const title = document.createElement('h2');
    title.textContent = 'השכרת דוכן';
    title.style.cssText = `
      margin: 40px 0 20px 0;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      color: #FFD700;
    `;
    content.appendChild(title);

    // Hangar name
    const hangarName = document.createElement('div');
    hangarName.textContent = `האנגר: ${HANGARS[_currentHangar]}`;
    hangarName.style.cssText = `
      text-align: center;
      font-size: 18px;
      margin-bottom: 20px;
      color: #F4E7C3;
    `;
    content.appendChild(hangarName);

    // Number input
    const inputLabel = document.createElement('div');
    inputLabel.textContent = 'מספר דוכן (1-40):';
    inputLabel.style.cssText = `
      font-size: 16px;
      margin-bottom: 8px;
    `;
    content.appendChild(inputLabel);

    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.min = '1';
    numberInput.max = '40';
    numberInput.placeholder = 'הזן מספר';
    numberInput.style.cssText = `
      width: 100%;
      padding: 12px;
      font-size: 18px;
      font-family: Heebo, sans-serif;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(244, 231, 195, 0.3);
      border-radius: 8px;
      color: #F4E7C3;
      margin-bottom: 16px;
      text-align: center;
    `;
    numberInput.oninput = () => {
      const num = parseInt(numberInput.value);
      if (num >= 1 && num <= 40) {
        console.log('[stallShop] Checking stall:', _currentHangar, num, 'socket:', _socket ? 'OK' : 'NULL');
        _socket.emit('checkStall', { hangar: _currentHangar, number: num });
      } else {
        _currentStallCheck = { number: null, available: false, ownedByMe: false };
      }
    };
    content.appendChild(numberInput);

    // Status display
    const statusDiv = document.createElement('div');
    statusDiv.id = 'stall-status';
    statusDiv.style.cssText = `
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 16px;
      min-height: 80px;
      text-align: center;
    `;

    if (_currentStallCheck.number) {
      const statusText = document.createElement('div');
      statusText.style.cssText = `
        font-size: 18px;
        margin-bottom: 8px;
        color: ${_currentStallCheck.available ? '#7ACB5E' : '#FF6B4A'};
        font-weight: 700;
      `;
      statusText.textContent = _currentStallCheck.available ? 'פנוי ✓' : 'תפוס ✗';
      statusDiv.appendChild(statusText);

      if (_currentStallCheck.available) {
        const priceText = document.createElement('div');
        priceText.textContent = `מחיר: ${STALL_PRICE} מטבעות`;
        priceText.style.cssText = `
          font-size: 16px;
          color: #F4E7C3;
        `;
        statusDiv.appendChild(priceText);
      }
    } else {
      statusDiv.textContent = 'הזן מספר דוכן כדי לבדוק זמינות';
      statusDiv.style.color = 'rgba(244, 231, 195, 0.5)';
    }
    content.appendChild(statusDiv);

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'אשר השכרה';
    const canRent = _currentStallCheck.number && _currentStallCheck.available;
    confirmBtn.style.cssText = `
      width: 100%;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: ${canRent ? 'rgba(122, 203, 94, 0.3)' : 'rgba(100, 100, 100, 0.2)'};
      border: 2px solid ${canRent ? '#7ACB5E' : 'rgba(244, 231, 195, 0.2)'};
      border-radius: 12px;
      color: ${canRent ? '#F4E7C3' : 'rgba(244, 231, 195, 0.4)'};
      cursor: ${canRent ? 'pointer' : 'not-allowed'};
      margin-bottom: 16px;
      transition: all 0.2s ease;
    `;
    if (canRent) {
      confirmBtn.onclick = () => {
        console.log('[stallShop] Renting stall:', _currentHangar, _currentStallCheck.number);
        _socket.emit('rentStall', { hangar: _currentHangar, number: _currentStallCheck.number });
      };
    }
    content.appendChild(confirmBtn);

    // Info text
    const infoText = document.createElement('div');
    infoText.textContent = 'השכרת דוכן היא תשלום חד-פעמי לשנה שלמה';
    infoText.style.cssText = `
      text-align: center;
      font-size: 14px;
      color: rgba(244, 231, 195, 0.6);
    `;
    content.appendChild(infoText);
  } catch (err) {
    console.error('[stallShop] Render rental screen error:', err);
  }
}

function _renderOwnerScreen() {
  try {
    const content = document.getElementById('stall-shop-content');
    if (!content || !_myStall) return;

    // Clear except close button
    const closeBtn = content.querySelector('button');
    content.innerHTML = '';
    if (closeBtn) content.appendChild(closeBtn);

    // Title
    const title = document.createElement('h2');
    title.textContent = 'חנות בעלי דוכן';
    title.style.cssText = `
      margin: 40px 0 20px 0;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      color: #FFD700;
    `;
    content.appendChild(title);

    // My stall info
    const stallInfo = document.createElement('div');
    stallInfo.style.cssText = `
      background: rgba(122, 203, 94, 0.1);
      border: 2px solid rgba(122, 203, 94, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      text-align: center;
    `;

    const stallText = document.createElement('div');
    stallText.textContent = `הדוכן שלך: מספר ${_myStall.number}`;
    stallText.style.cssText = `
      font-size: 22px;
      font-weight: 700;
      color: #7ACB5E;
      margin-bottom: 8px;
    `;
    stallInfo.appendChild(stallText);

    const hangarText = document.createElement('div');
    hangarText.textContent = `האנגר: ${HANGARS[_myStall.hangar]}`;
    hangarText.style.cssText = `
      font-size: 18px;
      color: #F4E7C3;
    `;
    stallInfo.appendChild(hangarText);

    content.appendChild(stallInfo);

    // Placeholder for future features
    const placeholder = document.createElement('div');
    placeholder.textContent = 'בקרוב: ציוד וקישוטים לדוכן';
    placeholder.style.cssText = `
      text-align: center;
      font-size: 16px;
      color: rgba(244, 231, 195, 0.6);
      padding: 40px 20px;
    `;
    content.appendChild(placeholder);
  } catch (err) {
    console.error('[stallShop] Render owner screen error:', err);
  }
}
