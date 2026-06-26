import * as THREE from 'three';
import { buildCharacter, attachHat, attachHandItem, attachShoes, attachGloves, attachWings, HATS, HAND_ITEMS, SHOES, GLOVES, WINGS } from '../player/CharacterBuilder.js';

let _previewScene = null;
let _previewCamera = null;
let _previewRenderer = null;
let _previewCharacter = null;
let _animationFrame = null;

// Module-level so both initInventoryButton and initCharacterPreview can access it
let selectedColors = {
  skin:  '#FFCC99',
  shirt: '#2196F3',
  pants: '#333333',
  shoes: '#5D4037'
};

export function initInventoryButton() {
  console.log('[inventory] Initializing inventory button...');

  try {
    // Test imports
    console.log('[inventory] Testing imports:', {
      HATS: !!HATS,
      HAND_ITEMS: !!HAND_ITEMS,
      SHOES: !!SHOES,
      GLOVES: !!GLOVES,
      WINGS: !!WINGS
    });
  } catch (err) {
    console.error('[inventory] Import test failed:', err);
    return;
  }

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
        direction: rtl;
        overflow: hidden;
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
        overflow: hidden;
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
        gap: 10px;
        overflow: hidden;
      }

      .color-picker-label {
        font-size: 16px;
        flex-shrink: 0;
        min-width: 60px;
      }

      .color-picker-input {
        width: 60px;
        height: 40px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 8px;
        cursor: pointer;
        background: transparent;
      }

      .color-palette {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
        max-width: 100%;
      }

      .color-palette-slider {
        display: flex;
        gap: 4px;
        overflow: hidden;
        flex: 1;
        min-width: 0;
      }

      .color-palette-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.3);
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .color-palette-btn:hover {
        background: rgba(255,255,255,0.2);
        border-color: rgba(255,255,255,0.5);
      }

      .color-palette-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .color-swatch {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 2px solid rgba(255,255,255,0.2);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .color-swatch:hover {
        transform: scale(1.15);
        border-color: rgba(255,255,255,0.6);
      }

      .color-swatch.selected {
        border: 3px solid #fff;
        box-shadow: 0 0 8px rgba(255,255,255,0.6);
        transform: scale(1.1);
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
        position: relative;
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

      .use-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        background: #4CAF50;
        color: white;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        pointer-events: none;
      }

      .customization-buttons {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .save-btn, .reset-btn {
        flex: 1;
        border: none;
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 16px;
        font-weight: bold;
        font-family: inherit;
      }

      .save-btn {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      }

      .save-btn:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }

      .save-btn:active {
        transform: scale(0.98);
      }

      .reset-btn {
        background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
      }

      .reset-btn:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
      }

      .reset-btn:active {
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
        <button class="inventory-tab" data-tab="shoes">נעליים</button>
        <button class="inventory-tab" data-tab="gloves">כפפות</button>
        <button class="inventory-tab" data-tab="wings">כנפיים</button>
      </div>

      <div class="inventory-content">
        <!-- Character preview canvas -->
        <canvas id="character-preview"></canvas>

        <!-- Options area -->
        <div class="inventory-options">
        <!-- Clothes tab -->
        <div class="inventory-section active" data-section="clothes">
          <div class="color-picker-row">
            <span class="color-picker-label">חולצה</span>
            <div class="color-palette" id="palette-shirt"></div>
          </div>
          <div class="color-picker-row">
            <span class="color-picker-label">מכנסיים</span>
            <div class="color-palette" id="palette-pants"></div>
          </div>
          <div class="color-picker-row">
            <span class="color-picker-label">נעליים</span>
            <div class="color-palette" id="palette-shoes"></div>
          </div>
          <div class="customization-buttons">
            <button class="reset-btn" id="reset-colors-btn">🔄 איפוס</button>
            <button class="save-btn" id="save-customization-btn">💾 שמירה</button>
          </div>
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

        <!-- Shoes tab -->
        <div class="inventory-section" data-section="shoes">
          <div class="item-grid" id="shoes-grid"></div>
        </div>

        <!-- Gloves tab -->
        <div class="inventory-section" data-section="gloves">
          <div class="item-grid" id="gloves-grid"></div>
        </div>

        <!-- Wings tab -->
        <div class="inventory-section" data-section="wings">
          <div class="item-grid" id="wings-grid"></div>
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
  btn.addEventListener('click', (e) => {
    console.log('[inventory] Bag button clicked, panel open:', panel.classList.contains('open'));

    // Check if shop overlay is blocking
    const shopOverlay = document.getElementById('shop-overlay');
    if (shopOverlay && shopOverlay.style.display === 'flex') {
      console.warn('[inventory] Shop overlay is still open! Closing it first.');
      if (window.closeMainShop) {
        window.closeMainShop();
      }
      return; // Don't open bag until next click
    }

    const isOpening = !panel.classList.contains('open');
    panel.classList.toggle('open');

    if (isOpening) {
      console.log('[inventory] Opening bag panel');
      startPreviewAnimation();
    } else {
      console.log('[inventory] Closing bag panel');
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

  // 20-color palette
  const COLOR_PALETTE = [
    '#FF0000', '#0000FF', '#FFFF00', '#00FF00', // Primary
    '#FF00FF', '#00FFFF', '#FF8800', // Secondary
    '#FFFFFF', '#CCCCCC', '#888888', '#000000', // Neutrals
    '#FFB6C1', '#E6E6FA', '#FFDAB9', '#B0E0E6', '#98FB98', // Pastels
    '#8B4513', '#800080', '#2F4F4F', '#DC143C' // Rich/Dark
  ];

  // selectedColors is declared at module scope (shared with initCharacterPreview)

  // Load saved customization from localStorage
  const CUSTOMIZATION_KEY = 'suy_character_customization';
  const savedCustomization = loadCustomization();
  if (savedCustomization) {
    if (savedCustomization.skin) selectedColors.skin = savedCustomization.skin;
    if (savedCustomization.shirt) selectedColors.shirt = savedCustomization.shirt;
    if (savedCustomization.pants) selectedColors.pants = savedCustomization.pants;
    if (savedCustomization.shoes) selectedColors.shoes = savedCustomization.shoes;
    // Apply saved colors when player is ready
    if (window.updatePlayerAppearance) {
      window.updatePlayerAppearance(savedCustomization);
    }
  }

  // Equipped items state management
  const EQUIPPED_KEY = 'player_equipped_items';

  function loadEquippedItems() {
    try {
      const raw = localStorage.getItem(EQUIPPED_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[inventory] Failed to load equipped items:', err);
    }
    // Default fallback
    return {
      hat: 'none',
      handItem: 'none',
      shoes: 'none',
      gloves: 'none',
      wings: 'none'
    };
  }

  function saveEquippedItems(equipped) {
    try {
      localStorage.setItem(EQUIPPED_KEY, JSON.stringify(equipped));
      console.log('[inventory] Saved equipped items:', equipped);
    } catch (err) {
      console.error('[inventory] Failed to save equipped items:', err);
    }
  }

  const equippedItems = loadEquippedItems();
  console.log('[inventory] Loaded equipped items:', equippedItems);

  // Create color palettes with slider (5 colors at a time)
  const paletteCategories = ['shirt', 'pants', 'shoes'];
  const paletteStates = {}; // Track current offset for each palette

  console.log('[inventory] Creating color palettes...');
  paletteCategories.forEach(category => {
    const paletteEl = document.getElementById(`palette-${category}`);
    if (!paletteEl) {
      console.warn(`[inventory] Palette element not found: palette-${category}`);
      return;
    }
    console.log(`[inventory] Creating palette for: ${category}`);

    paletteStates[category] = { offset: 0 };

    // Create structure: [< button] [slider with 5 swatches] [> button]
    const prevBtn = document.createElement('button');
    prevBtn.className = 'color-palette-btn';
    prevBtn.textContent = '‹';
    prevBtn.type = 'button';

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'color-palette-slider';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'color-palette-btn';
    nextBtn.textContent = '›';
    nextBtn.type = 'button';

    const updatePalette = () => {
      const offset = paletteStates[category].offset;
      sliderContainer.innerHTML = '';

      // Show 5 colors starting from offset
      for (let i = 0; i < 5; i++) {
        const colorIndex = (offset + i) % COLOR_PALETTE.length;
        const color = COLOR_PALETTE[colorIndex];

        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        swatch.dataset.category = category;

        // Mark selected
        if (color === selectedColors[category]) {
          swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
        console.log('[inventory] Color swatch clicked:', category, color);

        // Remove previous selection from this slider
        sliderContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');

        // Update selected color
        selectedColors[category] = color;

        // Update preview - rebuild preview character with new color
        if (_previewCharacter && _previewScene) {
          const currentType = _previewCharacter.userData._charType || 'boy';
          const newPreview = buildCharacter(currentType, selectedColors);

          // Scale and position for preview
          const bbox = new THREE.Box3().setFromObject(newPreview);
          const size = bbox.getSize(new THREE.Vector3());
          if (size.y > 0) {
            const scale = 2.0 / size.y;
            newPreview.scale.setScalar(scale);
          }

          // Remove old preview
          _previewScene.remove(_previewCharacter);

          // Add new preview
          _previewCharacter = newPreview;
          _previewCharacter.userData._charType = currentType;
          _previewScene.add(_previewCharacter);

          console.log('[inventory] Preview character rebuilt with new color');
        }

        // Update player
        const changes = {};
        changes[category] = color;
        console.log('[inventory] Calling window.updatePlayerAppearance with:', changes);
        if (window.updatePlayerAppearance) {
          window.updatePlayerAppearance(changes);
        } else {
          console.error('[inventory] window.updatePlayerAppearance not found!');
        }

        // Update all palettes to reflect new selection
        paletteCategories.forEach(cat => {
          const state = paletteStates[cat];
          if (state && state.updateFn) state.updateFn();
        });
      });

        sliderContainer.appendChild(swatch);
      }

      // Update button states
      prevBtn.disabled = false; // Always enabled (wraps around)
      nextBtn.disabled = false;
    };

    // Arrow button handlers
    prevBtn.addEventListener('click', () => {
      paletteStates[category].offset = (paletteStates[category].offset - 5 + COLOR_PALETTE.length) % COLOR_PALETTE.length;
      updatePalette();
    });

    nextBtn.addEventListener('click', () => {
      paletteStates[category].offset = (paletteStates[category].offset + 5) % COLOR_PALETTE.length;
      updatePalette();
    });

    // Store update function for later use
    paletteStates[category].updateFn = updatePalette;

    // Assemble palette
    paletteEl.appendChild(prevBtn);
    paletteEl.appendChild(sliderContainer);
    paletteEl.appendChild(nextBtn);

    // Initial render
    updatePalette();
  });


  // SAVE button functionality
  const saveBtn = document.getElementById('save-customization-btn');
  const saveFeedback = document.getElementById('save-feedback');

  saveBtn.addEventListener('click', () => {
    const customization = {
      skin: selectedColors.skin,
      shirt: selectedColors.shirt,
      pants: selectedColors.pants,
      shoes: selectedColors.shoes
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

  // RESET button functionality
  const resetBtn = document.getElementById('reset-colors-btn');

  resetBtn.addEventListener('click', () => {
    console.log('[inventory] 🔄 Resetting colors to defaults');

    // Default colors
    const defaultColors = {
      skin: '#FFCC99',
      shirt: '#2196F3',
      pants: '#333333',
      shoes: '#5D4037'
    };

    // Update selectedColors
    selectedColors.skin = defaultColors.skin;
    selectedColors.shirt = defaultColors.shirt;
    selectedColors.pants = defaultColors.pants;
    selectedColors.shoes = defaultColors.shoes;

    // Update preview character
    if (_previewCharacter && _previewScene) {
      const currentType = _previewCharacter.userData._charType || 'boy';
      const newPreview = buildCharacter(currentType, selectedColors);

      // Scale and position for preview
      const bbox = new THREE.Box3().setFromObject(newPreview);
      const size = bbox.getSize(new THREE.Vector3());
      if (size.y > 0) {
        const scale = 2.0 / size.y;
        newPreview.scale.setScalar(scale);
      }

      // Remove old preview
      _previewScene.remove(_previewCharacter);

      // Add new preview
      _previewCharacter = newPreview;
      _previewCharacter.userData._charType = currentType;
      _previewScene.add(_previewCharacter);
    }

    // Update player
    if (window.updatePlayerAppearance) {
      window.updatePlayerAppearance(defaultColors);
    }

    // Update all color palette selections
    paletteCategories.forEach(cat => {
      const state = paletteStates[cat];
      if (state && state.updateFn) state.updateFn();
    });

    // Show feedback
    saveFeedback.textContent = '🔄 צבעים אופסו!';
    saveFeedback.classList.add('show');
    setTimeout(() => {
      saveFeedback.classList.remove('show');
      saveFeedback.textContent = '✓ נשמר בהצלחה!';
    }, 2000);

    console.log('[inventory] ✅ Colors reset to defaults');
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

  function renderHandItems() {
    try {
      console.log('[inventory] renderHandItems called, HAND_ITEMS:', HAND_ITEMS);
      handItemsGrid.innerHTML = '';
      Object.entries(HAND_ITEMS).forEach(([key, item]) => {
      // Filter: only show 'none' or owned items
      // If isItemOwned doesn't exist yet, show all items
      if (key !== 'none' && typeof window.isItemOwned === 'function' && !window.isItemOwned(`hand_${key}`)) {
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'item-btn';
      btn.dataset.handItem = key;

      let content = `<div>${key === 'none' ? '❌' : item.name.split(' ')[1] || '🔧'}</div><div class="item-btn-label">${item.name.split(' ')[0]}</div>`;

      // Add USE badge if this item is equipped
      if (key === equippedItems.handItem) {
        content += '<span class="use-badge">USE</span>';
        btn.classList.add('equipped');
      }

      btn.innerHTML = content;
      handItemsGrid.appendChild(btn);
    });

    // Re-attach event listeners
    handItemsGrid.querySelectorAll('[data-hand-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemKey = btn.dataset.handItem;

        // Update equipped state
        equippedItems.handItem = itemKey;
        saveEquippedItems(equippedItems);

        // Update preview
        if (_previewCharacter && _previewCharacter.userData.parts) {
          attachHandItem(_previewCharacter.userData.parts.rArmG, itemKey);
        }

        // Update player
        if (window.applyPlayerHandItem) {
          window.applyPlayerHandItem(itemKey);
        }

        // Re-render to update badges
        renderHandItems();
      });
    });
    } catch (err) {
      console.error('[inventory] renderHandItems error:', err);
    }
  }

  try {
    renderHandItems();
  } catch (err) {
    console.error('[inventory] Failed to render hand items:', err);
  }

  // Populate Hats grid
  const hatsGrid = document.getElementById('hats-grid');

  function renderHats() {
    hatsGrid.innerHTML = '';
    Object.entries(HATS).forEach(([key, item]) => {
      // Filter: only show 'none' or owned items
      // If isItemOwned doesn't exist yet, show all items
      if (key !== 'none' && typeof window.isItemOwned === 'function' && !window.isItemOwned(`hat_${key}`)) {
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'item-btn';
      btn.dataset.hat = key;

      let content = `<div>${key === 'none' ? '❌' : item.name.split(' ')[1] || '🎩'}</div><div class="item-btn-label">${item.name.split(' ')[0]}</div>`;

      // Add USE badge if this item is equipped
      if (key === equippedItems.hat) {
        content += '<span class="use-badge">USE</span>';
        btn.classList.add('equipped');
      }

      btn.innerHTML = content;
      hatsGrid.appendChild(btn);
    });

    // Re-attach event listeners
    hatsGrid.querySelectorAll('[data-hat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const hatKey = btn.dataset.hat;

        // Update equipped state
        equippedItems.hat = hatKey;
        saveEquippedItems(equippedItems);

        // Update preview
        if (_previewCharacter && _previewCharacter.userData.parts) {
          attachHat(_previewCharacter.userData.parts.headG, hatKey);
        }

        // Update player
        if (window.applyPlayerHat) {
          window.applyPlayerHat(hatKey);
        }

        // Re-render to update badges
        renderHats();
      });
    });
  }

  renderHats();

  // Populate Shoes grid
  const shoesGrid = document.getElementById('shoes-grid');

  function renderShoes() {
    shoesGrid.innerHTML = '';
    Object.entries(SHOES).forEach(([key, item]) => {
      // Filter: only show 'none' or owned items
      // If isItemOwned doesn't exist yet, show all items
      if (key !== 'none' && typeof window.isItemOwned === 'function' && !window.isItemOwned(`shoes_${key}`)) {
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'item-btn';
      btn.dataset.shoe = key;

      let content = `<div>${key === 'none' ? '❌' : '👟'}</div><div class="item-btn-label">${item.name}</div>`;

      // Add USE badge if this item is equipped
      if (key === equippedItems.shoes) {
        content += '<span class="use-badge">USE</span>';
        btn.classList.add('equipped');
      }

      btn.innerHTML = content;
      shoesGrid.appendChild(btn);
    });

    // Re-attach event listeners
    shoesGrid.querySelectorAll('[data-shoe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const shoeKey = btn.dataset.shoe;

        // Update equipped state
        equippedItems.shoes = shoeKey;
        saveEquippedItems(equippedItems);

        // Update preview
        if (_previewCharacter && _previewCharacter.userData.parts) {
          attachShoes(_previewCharacter.userData.parts, shoeKey);
        }

        // Update player
        if (window.applyPlayerShoes) {
          window.applyPlayerShoes(shoeKey);
        }

        // Re-render to update badges
        renderShoes();
      });
    });
  }

  renderShoes();

  // Populate Gloves grid
  const glovesGrid = document.getElementById('gloves-grid');

  function renderGloves() {
    glovesGrid.innerHTML = '';
    Object.entries(GLOVES).forEach(([key, item]) => {
      // Filter: only show 'none' or owned items
      // If isItemOwned doesn't exist yet, show all items
      if (key !== 'none' && typeof window.isItemOwned === 'function' && !window.isItemOwned(`glove_${key}`)) {
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'item-btn';
      btn.dataset.glove = key;

      let content = `<div>${key === 'none' ? '❌' : '🧤'}</div><div class="item-btn-label">${item.name}</div>`;

      // Add USE badge if this item is equipped
      if (key === equippedItems.gloves) {
        content += '<span class="use-badge">USE</span>';
        btn.classList.add('equipped');
      }

      btn.innerHTML = content;
      glovesGrid.appendChild(btn);
    });

    // Re-attach event listeners
    glovesGrid.querySelectorAll('[data-glove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gloveKey = btn.dataset.glove;

        // Update equipped state
        equippedItems.gloves = gloveKey;
        saveEquippedItems(equippedItems);

        // Update preview
        if (_previewCharacter && _previewCharacter.userData.parts) {
          attachGloves(_previewCharacter.userData.parts, gloveKey);
        }

        // Update player
        if (window.applyPlayerGloves) {
          window.applyPlayerGloves(gloveKey);
        }

        // Re-render to update badges
        renderGloves();
      });
    });
  }

  renderGloves();

  // Populate Wings grid
  const wingsGrid = document.getElementById('wings-grid');

  function renderWings() {
    wingsGrid.innerHTML = '';
    Object.entries(WINGS).forEach(([key, item]) => {
      // Filter: only show 'none' or owned items
      // If isItemOwned doesn't exist yet, show all items
      if (key !== 'none' && typeof window.isItemOwned === 'function' && !window.isItemOwned(`wing_${key}`)) {
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'item-btn';
      btn.dataset.wing = key;

      let content = `<div>${key === 'none' ? '❌' : '🪽'}</div><div class="item-btn-label">${item.name}</div>`;

      // Add USE badge if this item is equipped
      if (key === equippedItems.wings) {
        content += '<span class="use-badge">USE</span>';
        btn.classList.add('equipped');
      }

      btn.innerHTML = content;
      wingsGrid.appendChild(btn);
    });

    // Re-attach event listeners
    wingsGrid.querySelectorAll('[data-wing]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wingKey = btn.dataset.wing;

        // Update equipped state
        equippedItems.wings = wingKey;
        saveEquippedItems(equippedItems);

        // Update preview
        if (_previewCharacter && _previewCharacter.userData.parts) {
          attachWings(_previewCharacter.userData.parts, wingKey);
        }

        // Update player
        if (window.applyPlayerWings) {
          window.applyPlayerWings(wingKey);
        }

        // Re-render to update badges
        renderWings();
      });
    });
  }

  renderWings();

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

  // Create character - use player's actual character type
  let playerType = 'boy';
  if (window.localPlayer && window.localPlayer.userData && window.localPlayer.userData._charType) {
    playerType = window.localPlayer.userData._charType;
  }
  console.log('[inventory] Creating preview with character type:', playerType);

  _previewCharacter = buildCharacter(playerType, selectedColors);
  _previewCharacter.userData._charType = playerType;

  // Scale to fit in preview (smaller than game size)
  const bbox = new THREE.Box3().setFromObject(_previewCharacter);
  const size = bbox.getSize(new THREE.Vector3());
  const scale = 2.0 / size.y;
  _previewCharacter.scale.setScalar(scale);

  // Position at ground
  _previewCharacter.updateMatrixWorld(true);
  const bbox2 = new THREE.Box3().setFromObject(_previewCharacter);
  _previewCharacter.position.y = -bbox2.min.y;

  _previewScene.add(_previewCharacter);

  // Add drag-to-rotate interaction
  let isDragging = false;
  let previousMouseX = 0;
  let cameraAngle = 0;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMouseX;
    previousMouseX = e.clientX;

    // Rotate camera around character
    cameraAngle -= deltaX * 0.01;

    const radius = 3.5;
    _previewCamera.position.x = Math.sin(cameraAngle) * radius;
    _previewCamera.position.z = Math.cos(cameraAngle) * radius;
    _previewCamera.lookAt(0, 1.2, 0);
  });

  canvas.addEventListener('pointerup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('pointerleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.style.cursor = 'grab';

  console.log('[inventory] Character preview initialized with type:', playerType);
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
