// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Market Stall Shop UI
// ═══════════════════════════════════════════════════════════════════════

import { updateStallSigns } from '../world/hangars.js';
import { setStallsData } from '../systems/stores.js';

let _socket = null;
let _shopPanel = null;
let _isOpen = false;
let _currentHangar = 'north';
let _myStall = null;  // { hangar, number, name, expiresAt } or null
let _onCoinUpdate = null;
let _currentStallCheck = { number: null, available: false, ownedByMe: false };
let _pendingRent = null; // { hangar, number } waiting for name

const STALL_PRICE = 1000;
const HANGARS = {
  north: { name: 'צפון', letter: 'N', internal: 'north' },
  east: { name: 'מרכז', letter: 'C', internal: 'east' },  // Center hangar
  south: { name: 'דרום', letter: 'S', internal: 'south' }
};

// Helper: get stall ID (e.g. "N15", "C3")
function getStallId(hangar, number) {
  const letter = HANGARS[hangar]?.letter || '?';
  return `${letter}${number}`;
}

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
    _socket.on('allStallsLoaded', _handleAllStallsLoaded);
    _socket.on('stallUpdated', _handleStallUpdated);
    _socket.on('nameUpdateResult', _handleNameUpdateResult);
    _socket.on('sellResult', _handleSellResult);
    _socket.on('coinsUpdated', (data) => {
      if (_onCoinUpdate) _onCoinUpdate(data.coins);
    });

    // Load player's stall data on init
    _socket.emit('loadStallData');
    // Load all stalls for signs
    _socket.emit('loadAllStalls');

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
        name: data.name,
        expiresAt: data.expiresAt
      };
      const stallId = getStallId(data.hangar, data.number);
      const hangarName = HANGARS[data.hangar]?.name || data.hangar;
      alert(`🎉 השכרת בהצלחה את דוכן ${stallId} באנגר ${hangarName}!\n\nשם הדוכן: ${data.name}`);
      _renderOwnerScreen();
    } else {
      const reasons = {
        invalid_number: 'מספר דוכן לא תקין (1-40)',
        invalid_name: 'יש לבחור שם לדוכן',
        already_owns: 'אתה כבר משכיר דוכן',
        taken: 'דוכן זה כבר תפוס',
        not_enough_coins: 'אין לך מספיק מטבעות (דרושים 1000)',
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

function _handleAllStallsLoaded(data) {
  try {
    console.log('[stallShop] All stalls loaded:', Object.keys(data.stalls).length, 'stalls');
    updateStallSigns(data.stalls);
    setStallsData(data.stalls);  // Update ground labels too
  } catch (err) {
    console.error('[stallShop] Handle all stalls error:', err);
  }
}

function _handleStallUpdated(data) {
  try {
    console.log('[stallShop] Stall updated:', data);
    // Reload all stalls to update signs
    _socket.emit('loadAllStalls');
  } catch (err) {
    console.error('[stallShop] Handle stall updated error:', err);
  }
}

function _handleNameUpdateResult(data) {
  try {
    console.log('[stallShop] Name update result:', data);

    if (data.success) {
      alert(`✓ שם הדוכן עודכן בהצלחה ל-"${data.name}"`);
      // The stallDataLoaded event will come separately and update _myStall
      _renderOwnerScreen();
    } else {
      const reasons = {
        invalid_name: 'יש להזין שם תקין',
        no_stall: 'אין לך דוכן',
        server_error: 'שגיאת שרת, נסה שוב'
      };
      alert(reasons[data.reason] || 'שגיאה לא ידועה');
    }
  } catch (err) {
    console.error('[stallShop] Handle name update result error:', err);
  }
}

function _handleSellResult(data) {
  try {
    console.log('[stallShop] Sell result:', data);

    if (data.success) {
      alert(`✓ הדוכן נמכר בהצלחה!\nקיבלת החזר של ${data.refund} מטבעות.`);
      _myStall = null;
      _renderRentalScreen();
    } else {
      const reasons = {
        no_stall: 'אין לך דוכן למכירה',
        server_error: 'שגיאת שרת, נסה שוב'
      };
      alert(reasons[data.reason] || 'שגיאה לא ידועה');
    }
  } catch (err) {
    console.error('[stallShop] Handle sell result error:', err);
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

    // Hangar name with letter prefix
    const hangarInfo = HANGARS[_currentHangar];
    const hangarName = document.createElement('div');
    hangarName.textContent = `האנגר: ${hangarInfo.name} (${hangarInfo.letter})`;
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
        _pendingRent = { hangar: _currentHangar, number: _currentStallCheck.number };
        _renderConfirmationScreen();
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

function _renderConfirmationScreen() {
  try {
    if (!_pendingRent) return;

    const content = document.getElementById('stall-shop-content');
    if (!content) return;

    // Clear except close button
    const closeBtn = content.querySelector('button');
    content.innerHTML = '';
    if (closeBtn) content.appendChild(closeBtn);

    const stallId = getStallId(_pendingRent.hangar, _pendingRent.number);
    const hangarName = HANGARS[_pendingRent.hangar]?.name || _pendingRent.hangar;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'אישור השכרה';
    title.style.cssText = `
      margin: 40px 0 30px 0;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      color: #FFD700;
    `;
    content.appendChild(title);

    // Confirmation message
    const message = document.createElement('div');
    message.textContent = `האם אתה בטוח שברצונך להשכיר את דוכן ${stallId} מהאנגר ${hangarName}?`;
    message.style.cssText = `
      text-align: center;
      font-size: 20px;
      color: #F4E7C3;
      margin-bottom: 30px;
      line-height: 1.5;
    `;
    content.appendChild(message);

    // Price reminder
    const price = document.createElement('div');
    price.textContent = `מחיר: ${STALL_PRICE} מטבעות`;
    price.style.cssText = `
      text-align: center;
      font-size: 18px;
      color: #FFD700;
      margin-bottom: 30px;
    `;
    content.appendChild(price);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'ביטול';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(255, 107, 74, 0.2);
      border: 2px solid rgba(255, 107, 74, 0.5);
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    cancelBtn.onclick = () => {
      _pendingRent = null;
      _renderRentalScreen();
    };
    buttonsDiv.appendChild(cancelBtn);

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'אישור';
    confirmBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(122, 203, 94, 0.3);
      border: 2px solid #7ACB5E;
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    confirmBtn.onclick = () => {
      _renderNameScreen();
    };
    buttonsDiv.appendChild(confirmBtn);

    content.appendChild(buttonsDiv);
  } catch (err) {
    console.error('[stallShop] Render confirmation screen error:', err);
  }
}

function _renderNameScreen() {
  try {
    if (!_pendingRent) return;

    const content = document.getElementById('stall-shop-content');
    if (!content) return;

    // Clear except close button
    const closeBtn = content.querySelector('button');
    content.innerHTML = '';
    if (closeBtn) content.appendChild(closeBtn);

    const stallId = getStallId(_pendingRent.hangar, _pendingRent.number);

    // Title
    const title = document.createElement('h2');
    title.textContent = 'בחר שם לדוכן';
    title.style.cssText = `
      margin: 40px 0 20px 0;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      color: #FFD700;
    `;
    content.appendChild(title);

    // Stall ID reminder
    const stallInfo = document.createElement('div');
    stallInfo.textContent = `דוכן ${stallId}`;
    stallInfo.style.cssText = `
      text-align: center;
      font-size: 18px;
      color: #F4E7C3;
      margin-bottom: 30px;
    `;
    content.appendChild(stallInfo);

    // Name input label
    const inputLabel = document.createElement('div');
    inputLabel.textContent = 'שם החנות (עד 30 תווים):';
    inputLabel.style.cssText = `
      font-size: 16px;
      margin-bottom: 8px;
      color: #F4E7C3;
    `;
    content.appendChild(inputLabel);

    // Name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = '30';
    nameInput.placeholder = 'למשל: חנות הפירות של יוסי';
    nameInput.style.cssText = `
      width: 100%;
      padding: 12px;
      font-size: 18px;
      font-family: Heebo, sans-serif;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(244, 231, 195, 0.3);
      border-radius: 8px;
      color: #F4E7C3;
      margin-bottom: 20px;
      text-align: right;
      direction: rtl;
    `;
    content.appendChild(nameInput);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    `;

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'חזור';
    backBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(100, 100, 100, 0.2);
      border: 2px solid rgba(244, 231, 195, 0.3);
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    backBtn.onclick = () => {
      _renderConfirmationScreen();
    };
    buttonsDiv.appendChild(backBtn);

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'אשר והשכר';
    confirmBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(122, 203, 94, 0.3);
      border: 2px solid #7ACB5E;
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    confirmBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert('יש להזין שם לדוכן');
        return;
      }
      console.log('[stallShop] Renting stall:', _pendingRent.hangar, _pendingRent.number, 'name:', name);
      _socket.emit('rentStall', {
        hangar: _pendingRent.hangar,
        number: _pendingRent.number,
        name: name
      });
      _pendingRent = null;
    };
    buttonsDiv.appendChild(confirmBtn);

    content.appendChild(buttonsDiv);

    // Focus the input
    setTimeout(() => nameInput.focus(), 100);
  } catch (err) {
    console.error('[stallShop] Render name screen error:', err);
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

    const stallId = getStallId(_myStall.hangar, _myStall.number);
    const stallText = document.createElement('div');
    stallText.textContent = `הדוכן שלך: ${stallId}`;
    stallText.style.cssText = `
      font-size: 22px;
      font-weight: 700;
      color: #7ACB5E;
      margin-bottom: 8px;
    `;
    stallInfo.appendChild(stallText);

    if (_myStall.name) {
      const nameText = document.createElement('div');
      nameText.textContent = `${_myStall.name}`;
      nameText.style.cssText = `
        font-size: 24px;
        font-weight: 700;
        color: #FFD700;
        margin-bottom: 12px;
      `;
      stallInfo.appendChild(nameText);
    }

    const hangarText = document.createElement('div');
    hangarText.textContent = `האנגר: ${HANGARS[_myStall.hangar]?.name || _myStall.hangar}`;
    hangarText.style.cssText = `
      font-size: 18px;
      color: #F4E7C3;
    `;
    stallInfo.appendChild(hangarText);

    content.appendChild(stallInfo);

    // Management options
    const optionsTitle = document.createElement('div');
    optionsTitle.textContent = 'ניהול דוכן';
    optionsTitle.style.cssText = `
      font-size: 20px;
      font-weight: 700;
      color: #FFD700;
      margin-bottom: 16px;
      text-align: center;
    `;
    content.appendChild(optionsTitle);

    // Change name button
    const changeNameBtn = document.createElement('button');
    changeNameBtn.textContent = 'החלף שם';
    changeNameBtn.style.cssText = `
      width: 100%;
      padding: 14px;
      font-size: 18px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(66, 165, 245, 0.3);
      border: 2px solid #42A5F5;
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    `;
    changeNameBtn.onclick = () => {
      _renderChangeNameScreen();
    };
    content.appendChild(changeNameBtn);

    // Sell stall button
    const sellBtn = document.createElement('button');
    sellBtn.textContent = 'מכור דוכן בחזרה';
    sellBtn.style.cssText = `
      width: 100%;
      padding: 14px;
      font-size: 18px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(255, 107, 74, 0.2);
      border: 2px solid rgba(255, 107, 74, 0.5);
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    `;
    sellBtn.onclick = () => {
      _renderSellConfirmScreen();
    };
    content.appendChild(sellBtn);

    // Placeholder for future features
    const placeholder = document.createElement('div');
    placeholder.textContent = 'בקרוב: ציוד וקישוטים לדוכן';
    placeholder.style.cssText = `
      text-align: center;
      font-size: 14px;
      color: rgba(244, 231, 195, 0.5);
      padding: 20px;
    `;
    content.appendChild(placeholder);
  } catch (err) {
    console.error('[stallShop] Render owner screen error:', err);
  }
}

function _renderChangeNameScreen() {
  try {
    if (!_myStall) return;

    const content = document.getElementById('stall-shop-content');
    if (!content) return;

    // Clear except close button
    const closeBtn = content.querySelector('button');
    content.innerHTML = '';
    if (closeBtn) content.appendChild(closeBtn);

    const stallId = getStallId(_myStall.hangar, _myStall.number);

    // Title
    const title = document.createElement('h2');
    title.textContent = 'החלפת שם דוכן';
    title.style.cssText = `
      margin: 40px 0 20px 0;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      color: #FFD700;
    `;
    content.appendChild(title);

    // Stall ID
    const stallInfo = document.createElement('div');
    stallInfo.textContent = `דוכן ${stallId}`;
    stallInfo.style.cssText = `
      text-align: center;
      font-size: 18px;
      color: #F4E7C3;
      margin-bottom: 30px;
    `;
    content.appendChild(stallInfo);

    // Current name
    const currentName = document.createElement('div');
    currentName.textContent = `שם נוכחי: ${_myStall.name || 'לא הוגדר'}`;
    currentName.style.cssText = `
      text-align: center;
      font-size: 16px;
      color: rgba(244, 231, 195, 0.7);
      margin-bottom: 20px;
    `;
    content.appendChild(currentName);

    // Name input label
    const inputLabel = document.createElement('div');
    inputLabel.textContent = 'שם חדש (עד 30 תווים):';
    inputLabel.style.cssText = `
      font-size: 16px;
      margin-bottom: 8px;
      color: #F4E7C3;
    `;
    content.appendChild(inputLabel);

    // Name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = '30';
    nameInput.value = _myStall.name || '';
    nameInput.placeholder = 'הזן שם חדש';
    nameInput.style.cssText = `
      width: 100%;
      padding: 12px;
      font-size: 18px;
      font-family: Heebo, sans-serif;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(244, 231, 195, 0.3);
      border-radius: 8px;
      color: #F4E7C3;
      margin-bottom: 20px;
      text-align: right;
      direction: rtl;
    `;
    content.appendChild(nameInput);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'ביטול';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(100, 100, 100, 0.2);
      border: 2px solid rgba(244, 231, 195, 0.3);
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    cancelBtn.onclick = () => {
      _renderOwnerScreen();
    };
    buttonsDiv.appendChild(cancelBtn);

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'אשר שינוי';
    confirmBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(66, 165, 245, 0.3);
      border: 2px solid #42A5F5;
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    confirmBtn.onclick = () => {
      const newName = nameInput.value.trim();
      if (!newName) {
        alert('יש להזין שם לדוכן');
        return;
      }
      console.log('[stallShop] Updating stall name to:', newName);
      _socket.emit('updateStallName', { name: newName });
    };
    buttonsDiv.appendChild(confirmBtn);

    content.appendChild(buttonsDiv);

    // Focus the input
    setTimeout(() => nameInput.focus(), 100);
  } catch (err) {
    console.error('[stallShop] Render change name screen error:', err);
  }
}

function _renderSellConfirmScreen() {
  try {
    if (!_myStall) return;

    const content = document.getElementById('stall-shop-content');
    if (!content) return;

    // Clear except close button
    const closeBtn = content.querySelector('button');
    content.innerHTML = '';
    if (closeBtn) content.appendChild(closeBtn);

    const stallId = getStallId(_myStall.hangar, _myStall.number);
    const hangarName = HANGARS[_myStall.hangar]?.name || _myStall.hangar;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'מכירת דוכן';
    title.style.cssText = `
      margin: 40px 0 30px 0;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      color: #FF6B4A;
    `;
    content.appendChild(title);

    // Warning message
    const message = document.createElement('div');
    message.textContent = `האם אתה בטוח שברצונך למכור את הדוכן ${stallId} באנגר ${hangarName} בחזרה למערכת?`;
    message.style.cssText = `
      text-align: center;
      font-size: 20px;
      color: #F4E7C3;
      margin-bottom: 20px;
      line-height: 1.5;
    `;
    content.appendChild(message);

    // Refund info
    const refundInfo = document.createElement('div');
    refundInfo.textContent = 'תקבל החזר של 500 מטבעות (50% מהמחיר המקורי)';
    refundInfo.style.cssText = `
      text-align: center;
      font-size: 18px;
      color: #7ACB5E;
      margin-bottom: 30px;
    `;
    content.appendChild(refundInfo);

    // Warning
    const warning = document.createElement('div');
    warning.textContent = '⚠️ פעולה זו תמחק את הדוכן שלך ולא ניתן לבטל אותה';
    warning.style.cssText = `
      text-align: center;
      font-size: 16px;
      color: #FF6B4A;
      margin-bottom: 30px;
    `;
    content.appendChild(warning);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'ביטול';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(122, 203, 94, 0.3);
      border: 2px solid #7ACB5E;
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    cancelBtn.onclick = () => {
      _renderOwnerScreen();
    };
    buttonsDiv.appendChild(cancelBtn);

    // Confirm sell button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'אשר מכירה';
    confirmBtn.style.cssText = `
      flex: 1;
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
      font-family: Heebo, sans-serif;
      background: rgba(255, 107, 74, 0.3);
      border: 2px solid #FF6B4A;
      border-radius: 12px;
      color: #F4E7C3;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    confirmBtn.onclick = () => {
      console.log('[stallShop] Selling stall back');
      _socket.emit('sellStall');
    };
    buttonsDiv.appendChild(confirmBtn);

    content.appendChild(buttonsDiv);
  } catch (err) {
    console.error('[stallShop] Render sell confirm screen error:', err);
  }
}
