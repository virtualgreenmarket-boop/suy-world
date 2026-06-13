export function initInventoryButton() {
  console.log('[inventory] Initializing inventory button...');

  const container = document.createElement('div');
  container.id = 'inventory-container';
  container.innerHTML = `
    <style>
      #inventory-btn {
        background: rgba(0,0,0,0.50);
        border: 1px solid rgba(255,255,255,0.18);
        color: #fff;
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 18px;
        cursor: pointer;
        pointer-events: all;
        transition: background 0.15s;
        font-family: system-ui;
      }

      #inventory-btn:hover {
        background: rgba(255,255,255,0.18);
      }

      #inventory-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-width: 90vw;
        background: rgba(0,0,0,0.95);
        backdrop-filter: blur(20px);
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 20px;
        padding: 30px;
        z-index: 10000;
        display: none;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
      }

      #inventory-panel.open {
        display: block;
      }

      .inventory-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
      }

      .inventory-title {
        font-size: 28px;
        font-weight: bold;
      }

      .inventory-close {
        width: 35px;
        height: 35px;
        background: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 24px;
        transition: all 0.2s;
      }

      .inventory-close:hover {
        background: rgba(255,255,255,0.2);
        transform: scale(1.1);
      }

      .inventory-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 25px;
        border-bottom: 2px solid rgba(255,255,255,0.2);
        padding-bottom: 10px;
      }

      .inventory-tab {
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 16px;
      }

      .inventory-tab:hover {
        background: rgba(255,255,255,0.2);
      }

      .inventory-tab.active {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      }

      .inventory-content {
        min-height: 200px;
      }

      .inventory-section {
        display: none;
      }

      .inventory-section.active {
        display: block;
      }

      .color-picker-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
      }

      .color-picker-label {
        font-size: 16px;
      }

      .color-picker-input {
        width: 60px;
        height: 40px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 8px;
        cursor: pointer;
        background: transparent;
      }

      .item-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 10px;
      }

      .item-btn {
        aspect-ratio: 1;
        background: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 32px;
        color: white;
      }

      .item-btn:hover {
        background: rgba(255,255,255,0.2);
        transform: scale(1.05);
      }

      .item-btn.equipped {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.3);
        box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
      }

      .item-btn-label {
        font-size: 12px;
        margin-top: 5px;
      }

      @media (max-width: 600px) {
        #inventory-panel {
          width: 95vw;
          padding: 20px;
        }

        .inventory-title {
          font-size: 22px;
        }

        .item-grid {
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        }

        .item-btn {
          font-size: 24px;
        }
      }
    </style>

    <div id="inventory-panel">
      <div class="inventory-header">
        <div class="inventory-title">תיק</div>
        <button class="inventory-close">×</button>
      </div>

      <div class="inventory-tabs">
        <button class="inventory-tab active" data-tab="clothes">בגדים</button>
        <button class="inventory-tab" data-tab="equipment">ציוד</button>
        <button class="inventory-tab" data-tab="hats">כובעים</button>
      </div>

      <div class="inventory-content">
        <!-- Clothes tab -->
        <div class="inventory-section active" data-section="clothes">
          <div class="color-picker-row">
            <span class="color-picker-label">עור</span>
            <input type="color" class="color-picker-input" id="color-skin" value="#FFCC99">
          </div>
          <div class="color-picker-row">
            <span class="color-picker-label">חולצה</span>
            <input type="color" class="color-picker-input" id="color-shirt" value="#2196F3">
          </div>
          <div class="color-picker-row">
            <span class="color-picker-label">מכנסיים</span>
            <input type="color" class="color-picker-input" id="color-pants" value="#333333">
          </div>
          <div class="color-picker-row">
            <span class="color-picker-label">נעליים</span>
            <input type="color" class="color-picker-input" id="color-shoes" value="#5D4037">
          </div>
        </div>

        <!-- Equipment tab -->
        <div class="inventory-section" data-section="equipment">
          <div class="item-grid">
            <button class="item-btn" data-equipment="none">
              <div>❌</div>
              <div class="item-btn-label">ללא</div>
            </button>
            <button class="item-btn" data-equipment="sword">
              <div>⚔️</div>
              <div class="item-btn-label">חרב</div>
            </button>
            <button class="item-btn" data-equipment="wand">
              <div>✨</div>
              <div class="item-btn-label">שרביט</div>
            </button>
            <button class="item-btn" data-equipment="shield">
              <div>🛡️</div>
              <div class="item-btn-label">מגן</div>
            </button>
            <button class="item-btn" data-equipment="staff">
              <div>🔮</div>
              <div class="item-btn-label">מטה</div>
            </button>
          </div>
        </div>

        <!-- Hats tab -->
        <div class="inventory-section" data-section="hats">
          <div class="item-grid">
            <button class="item-btn" data-hat="none">
              <div>❌</div>
              <div class="item-btn-label">ללא</div>
            </button>
            <button class="item-btn" data-hat="crown">
              <div>👑</div>
              <div class="item-btn-label">כתר</div>
            </button>
            <button class="item-btn" data-hat="tophat">
              <div>🎩</div>
              <div class="item-btn-label">כובע</div>
            </button>
            <button class="item-btn" data-hat="cap">
              <div>🧢</div>
              <div class="item-btn-label">כומתה</div>
            </button>
            <button class="item-btn" data-hat="halo">
              <div>😇</div>
              <div class="item-btn-label">הילה</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Create and insert the button into the HUD top-left area
  const hudTopLeft = document.getElementById('hud-topleft');
  if (!hudTopLeft) {
    console.error('[inventory] hud-topleft not found! Make sure initHud() is called first.');
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'inventory-btn';
  btn.title = 'תיק';
  btn.textContent = '🎒';

  // Insert after coin display (before gear button)
  const gearBtn = document.getElementById('hud-gear');
  if (gearBtn) {
    hudTopLeft.insertBefore(btn, gearBtn);
  } else {
    hudTopLeft.appendChild(btn);
  }

  const panel = document.getElementById('inventory-panel');
  const closeBtn = panel.querySelector('.inventory-close');

  // Toggle panel
  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
  });

  // Close on ESC
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && panel.classList.contains('open')) {
      panel.classList.remove('open');
    }
  });

  // Tab switching
  const tabs = panel.querySelectorAll('.inventory-tab');
  const sections = panel.querySelectorAll('.inventory-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      tab.classList.add('active');
      panel.querySelector(`[data-section="${targetTab}"]`).classList.add('active');
    });
  });

  // Color pickers
  const colorInputs = {
    skin: document.getElementById('color-skin'),
    shirt: document.getElementById('color-shirt'),
    pants: document.getElementById('color-pants'),
    shoes: document.getElementById('color-shoes')
  };

  Object.entries(colorInputs).forEach(([part, input]) => {
    input.addEventListener('input', () => {
      updatePlayerAppearance({ [part]: input.value });
    });
  });

  // Equipment buttons
  let currentEquipment = 'none';
  panel.querySelectorAll('[data-equipment]').forEach(btn => {
    btn.addEventListener('click', () => {
      const equipment = btn.dataset.equipment;

      panel.querySelectorAll('[data-equipment]').forEach(b => b.classList.remove('equipped'));
      btn.classList.add('equipped');

      currentEquipment = equipment;
      updatePlayerAppearance({ equipment });
    });
  });

  // Set default equipped
  panel.querySelector('[data-equipment="none"]').classList.add('equipped');

  // Hat buttons
  let currentHat = 'none';
  panel.querySelectorAll('[data-hat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hat = btn.dataset.hat;

      panel.querySelectorAll('[data-hat]').forEach(b => b.classList.remove('equipped'));
      btn.classList.add('equipped');

      currentHat = hat;
      updatePlayerAppearance({ hat });
    });
  });

  // Set default equipped
  panel.querySelector('[data-hat="none"]').classList.add('equipped');

  console.log('[inventory] Inventory button initialized');
}

function updatePlayerAppearance(changes) {
  if (window.updatePlayerAppearance) {
    window.updatePlayerAppearance(changes);
  } else {
    console.log('[inventory] updatePlayerAppearance not available yet, changes:', changes);
  }
}
