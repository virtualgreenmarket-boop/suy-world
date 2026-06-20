import * as THREE from 'three';
import { buildCharacter, attachHat, attachHandItem, HATS, HAND_ITEMS } from '../player/CharacterBuilder.js';

let _previewScene = null;
let _previewCamera = null;
let _previewRenderer = null;
let _previewCharacter = null;
let _animationFrame = null;

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
        display: flex;
        gap: 20px;
        min-height: 300px;
      }

      #character-preview {
        width: 200px;
        height: 300px;
        background: rgba(0,0,0,0.3);
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        flex-shrink: 0;
      }

      .inventory-options {
        flex: 1;
        min-width: 0;
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

      .save-btn {
        width: 100%;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        border: none;
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 16px;
        font-weight: bold;
        margin-top: 20px;
        font-family: inherit;
      }

      .save-btn:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }

      .save-btn:active {
        transform: scale(0.98);
      }

      .save-feedback {
        text-align: center;
        color: #4CAF50;
        font-size: 14px;
        margin-top: 10px;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .save-feedback.show {
        opacity: 1;
      }

      @media (max-width: 600px) {
        #inventory-panel {
          width: 95vw;
          padding: 20px;
        }

        .inventory-title {
          font-size: 22px;
        }

        .inventory-content {
          flex-direction: column;
        }

        #character-preview {
          width: 100%;
          height: 200px;
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
        <button class="inventory-tab" data-tab="hand-items">פריטי יד</button>
        <button class="inventory-tab" data-tab="hats">כובעים</button>
      </div>

      <div class="inventory-content">
        <!-- Character preview canvas -->
        <canvas id="character-preview"></canvas>

        <!-- Options area -->
        <div class="inventory-options">
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
          <button class="save-btn" id="save-customization-btn">💾 שמור התאמה אישית</button>
          <div class="save-feedback" id="save-feedback">✓ נשמר בהצלחה!</div>
        </div>

        <!-- Hand Items tab -->
        <div class="inventory-section" data-section="hand-items">
          <div class="item-grid" id="hand-items-grid"></div>
        </div>

        <!-- Hats tab -->
        <div class="inventory-section" data-section="hats">
          <div class="item-grid" id="hats-grid"></div>
        </div>
        </div>
        <!-- End of inventory-options -->
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

  // Initialize 3D preview
  initCharacterPreview();

  // Toggle panel
  btn.addEventListener('click', () => {
    const isOpening = !panel.classList.contains('open');
    panel.classList.toggle('open');

    if (isOpening) {
      startPreviewAnimation();
    } else {
      stopPreviewAnimation();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    stopPreviewAnimation();
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

  // Load saved customization from localStorage
  const CUSTOMIZATION_KEY = 'suy_character_customization';
  const savedCustomization = loadCustomization();
  if (savedCustomization) {
    if (savedCustomization.skin) colorInputs.skin.value = savedCustomization.skin;
    if (savedCustomization.shirt) colorInputs.shirt.value = savedCustomization.shirt;
    if (savedCustomization.pants) colorInputs.pants.value = savedCustomization.pants;
    if (savedCustomization.shoes) colorInputs.shoes.value = savedCustomization.shoes;
    // Apply saved colors immediately
    updatePlayerAppearance(savedCustomization);
  }

  Object.entries(colorInputs).forEach(([part, input]) => {
    input.addEventListener('input', () => {
      updatePlayerAppearance({ [part]: input.value });
    });
  });

  // SAVE button functionality
  const saveBtn = document.getElementById('save-customization-btn');
  const saveFeedback = document.getElementById('save-feedback');

  saveBtn.addEventListener('click', () => {
    const customization = {
      skin: colorInputs.skin.value,
      shirt: colorInputs.shirt.value,
      pants: colorInputs.pants.value,
      shoes: colorInputs.shoes.value
    };

    // Save to localStorage
    localStorage.setItem(CUSTOMIZATION_KEY, JSON.stringify(customization));

    // Show feedback
    saveFeedback.classList.add('show');
    setTimeout(() => {
      saveFeedback.classList.remove('show');
    }, 2000);

    console.log('[inventory] Customization saved:', customization);
  });

  function loadCustomization() {
    try {
      const raw = localStorage.getItem(CUSTOMIZATION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('[inventory] Failed to load customization:', err);
    }
    return null;
  }

  // Populate Hand Items grid
  const handItemsGrid = document.getElementById('hand-items-grid');
  Object.entries(HAND_ITEMS).forEach(([key, item]) => {
    const btn = document.createElement('button');
    btn.className = 'item-btn';
    btn.dataset.handItem = key;
    btn.innerHTML = `<div>${key === 'none' ? '❌' : item.name.split(' ')[1] || '🔧'}</div><div class="item-btn-label">${item.name.split(' ')[0]}</div>`;
    handItemsGrid.appendChild(btn);
  });

  // Hand Item buttons
  let currentHandItem = 'none';
  handItemsGrid.querySelectorAll('[data-hand-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemKey = btn.dataset.handItem;

      handItemsGrid.querySelectorAll('[data-hand-item]').forEach(b => b.classList.remove('equipped'));
      btn.classList.add('equipped');

      currentHandItem = itemKey;

      // Update preview
      if (_previewCharacter && _previewCharacter.userData.parts) {
        attachHandItem(_previewCharacter.userData.parts.rArmG, itemKey);
      }

      // Update player
      if (window.applyPlayerHandItem) {
        window.applyPlayerHandItem(itemKey);
      }
    });
  });

  // Set default hand item
  handItemsGrid.querySelector('[data-hand-item="none"]').classList.add('equipped');

  // Populate Hats grid
  const hatsGrid = document.getElementById('hats-grid');
  Object.entries(HATS).forEach(([key, item]) => {
    const btn = document.createElement('button');
    btn.className = 'item-btn';
    btn.dataset.hat = key;
    btn.innerHTML = `<div>${key === 'none' ? '❌' : item.name.split(' ')[1] || '🎩'}</div><div class="item-btn-label">${item.name.split(' ')[0]}</div>`;
    hatsGrid.appendChild(btn);
  });

  // Hat buttons
  let currentHat = 'none';
  hatsGrid.querySelectorAll('[data-hat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hatKey = btn.dataset.hat;

      hatsGrid.querySelectorAll('[data-hat]').forEach(b => b.classList.remove('equipped'));
      btn.classList.add('equipped');

      currentHat = hatKey;

      // Update preview
      if (_previewCharacter && _previewCharacter.userData.parts) {
        attachHat(_previewCharacter.userData.parts.headG, hatKey);
      }

      // Update player
      if (window.applyPlayerHat) {
        window.applyPlayerHat(hatKey);
      }
    });
  });

  // Set default hat
  hatsGrid.querySelector('[data-hat="none"]').classList.add('equipped');

  console.log('[inventory] Inventory button initialized');
}

function initCharacterPreview() {
  const canvas = document.getElementById('character-preview');
  if (!canvas) return;

  // Setup Three.js scene
  _previewScene = new THREE.Scene();
  _previewScene.background = new THREE.Color(0x1a1a1a);

  _previewCamera = new THREE.PerspectiveCamera(45, 200 / 300, 0.1, 100);
  _previewCamera.position.set(0, 1.2, 3.5);
  _previewCamera.lookAt(0, 1.2, 0);

  _previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  _previewRenderer.setSize(200, 300);
  _previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _previewRenderer.shadowMap.enabled = true;

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  _previewScene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(2, 3, 2);
  keyLight.castShadow = true;
  _previewScene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-2, 2, -1);
  _previewScene.add(fillLight);

  // Create character (default 'boy')
  _previewCharacter = buildCharacter('boy');

  // Scale to fit in preview (smaller than game size)
  const bbox = new THREE.Box3().setFromObject(_previewCharacter);
  const size = bbox.getSize(new THREE.Vector3());
  const scale = 2.2 / size.y;
  _previewCharacter.scale.setScalar(scale);

  // Position at ground
  _previewCharacter.updateMatrixWorld(true);
  const bbox2 = new THREE.Box3().setFromObject(_previewCharacter);
  _previewCharacter.position.y = -bbox2.min.y;

  _previewScene.add(_previewCharacter);

  console.log('[inventory] Character preview initialized');
}

function startPreviewAnimation() {
  let t = 0;

  function animate() {
    if (!_previewRenderer || !_previewScene) return;

    _animationFrame = requestAnimationFrame(animate);

    t += 0.016;

    // Rotate character slowly
    if (_previewCharacter) {
      _previewCharacter.rotation.y = t * 0.5;
    }

    _previewRenderer.render(_previewScene, _previewCamera);
  }

  animate();
}

function stopPreviewAnimation() {
  if (_animationFrame) {
    cancelAnimationFrame(_animationFrame);
    _animationFrame = null;
  }
}

// Track current customization
let _currentCustomization = {};

function updatePlayerAppearance(changes) {
  // Merge changes into current customization
  _currentCustomization = { ..._currentCustomization, ...changes };

  // Rebuild preview character with new colors
  if (_previewScene && _previewCharacter) {
    // Remove old preview character
    _previewScene.remove(_previewCharacter);

    // Build new character with updated colors
    _previewCharacter = buildCharacter('boy', _currentCustomization);

    // Scale to fit in preview
    const bbox = new THREE.Box3().setFromObject(_previewCharacter);
    const size = bbox.getSize(new THREE.Vector3());
    const scale = 2.2 / size.y;
    _previewCharacter.scale.setScalar(scale);

    // Position at ground
    _previewCharacter.updateMatrixWorld(true);
    const bbox2 = new THREE.Box3().setFromObject(_previewCharacter);
    _previewCharacter.position.y = -bbox2.min.y;

    // Add to scene
    _previewScene.add(_previewCharacter);

    // Re-render immediately
    if (_previewRenderer && _animationFrame) {
      _previewRenderer.render(_previewScene, _previewCamera);
    }

    console.log('[inventory] Preview character updated with:', _currentCustomization);
  }

  // Update actual player in game
  if (window.updatePlayerAppearance) {
    window.updatePlayerAppearance(changes);
  } else {
    console.log('[inventory] updatePlayerAppearance not available yet, changes:', changes);
  }
}
