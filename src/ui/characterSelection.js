import * as THREE from 'three';
import { buildCharacter, CHARACTERS } from '../player/CharacterBuilder.js';

let _onSelectCallback = null;
let _scene = null;
let _camera = null;
let _renderer = null;
let _selectedIndex = 0;
let _characters = [];
let _selectionRing = null;
let _animTime = 0;

const CHARACTER_TYPES = ['boy', 'girl', 'zombie', 'demon', 'robot'];

export function initCharacterSelection(onSelect) {
  console.log('[char-select] Initializing character selection...');
  _onSelectCallback = onSelect;

  const container = document.createElement('div');
  container.id = 'character-selection';
  container.innerHTML = `
    <style>
      #character-selection {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 15000;
        overflow: hidden;
      }

      #char-select-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
      }

      #char-select-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        z-index: 2;
      }

      .char-select-ui {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: 1000;
        pointer-events: none;
      }

      .char-select-title {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 28px;
        font-weight: bold;
        text-shadow: 0 4px 12px rgba(0,0,0,0.9);
        font-family: 'Segoe UI', Arial, sans-serif;
        pointer-events: none;
      }

      .char-info-card {
        position: absolute;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
        border-radius: 12px;
        padding: 10px 20px;
        max-width: 280px;
        text-align: center;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }

      .char-info-name {
        font-size: 24px;
        font-weight: bold;
        color: #FFD700;
        margin-bottom: 4px;
      }

      .char-info-personality {
        font-size: 14px;
        color: #B0B0B0;
        font-weight: normal;
      }

      .char-nav-controls {
        position: absolute;
        bottom: 140px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 30px;
        align-items: center;
      }

      .char-nav-btn {
        min-width: 60px;
        min-height: 60px;
        width: 60px;
        height: 60px;
        background: rgba(255,255,255,0.2);
        border: 3px solid rgba(255,255,255,0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        pointer-events: auto;
        backdrop-filter: blur(10px);
        -webkit-tap-highlight-color: transparent;
      }

      .char-nav-btn:active {
        background: rgba(255,255,255,0.4);
        transform: scale(0.95);
      }

      .char-nav-btn svg {
        width: 28px;
        height: 28px;
        fill: white;
        pointer-events: none;
      }

      .char-nav-indicator {
        color: white;
        font-size: 22px;
        font-weight: bold;
        padding: 12px 24px;
        background: rgba(0,0,0,0.5);
        border-radius: 15px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .char-select-enter {
        position: absolute;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 60px;
        min-height: 56px;
        font-size: 22px;
        font-weight: bold;
        color: white;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        border: none;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 8px 24px rgba(76, 175, 80, 0.6);
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
      }

      .char-select-enter:active {
        transform: translateX(-50%) translateY(2px);
        box-shadow: 0 4px 16px rgba(76, 175, 80, 0.8);
      }

      @media (max-width: 768px) {
        .char-select-title {
          font-size: 24px;
          top: 16px;
        }

        .char-info-card {
          top: 60px;
          max-width: 260px;
          padding: 8px 16px;
        }

        .char-info-name {
          font-size: 20px;
        }

        .char-info-personality {
          font-size: 13px;
        }

        .char-nav-controls {
          bottom: 130px;
          gap: 20px;
        }

        .char-nav-btn {
          min-width: 56px;
          min-height: 56px;
          width: 56px;
          height: 56px;
        }

        .char-select-enter {
          bottom: 40px;
          padding: 14px 50px;
          font-size: 20px;
          min-height: 52px;
        }
      }

      @media (max-width: 480px) {
        .char-select-title {
          font-size: 20px;
        }

        .char-info-card {
          top: 50px;
          max-width: 240px;
        }

        .char-info-name {
          font-size: 18px;
        }

        .char-info-personality {
          font-size: 12px;
        }

        .char-nav-controls {
          bottom: 120px;
        }

        .char-nav-btn {
          min-width: 50px;
          min-height: 50px;
          width: 50px;
          height: 50px;
        }

        .char-nav-indicator {
          font-size: 18px;
          padding: 10px 20px;
        }

        .char-select-enter {
          padding: 12px 40px;
          font-size: 18px;
          min-height: 48px;
        }
      }
    </style>

    <img id="char-select-bg" src="/images/מסך בחירת דמות.png" alt="Background">
    <canvas id="char-select-canvas"></canvas>

    <div class="char-select-ui">
      <div class="char-select-title">בחר את הדמות שלך</div>

      <div class="char-info-card" id="char-info-card">
        <div class="char-info-name" id="char-name"></div>
        <div class="char-info-personality" id="char-personality"></div>
      </div>

      <div class="char-nav-controls">
        <button class="char-nav-btn" id="char-prev" aria-label="Previous character">
          <svg viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>

        <div class="char-nav-indicator">
          <span id="char-index">1</span> / 5
        </div>

        <button class="char-nav-btn" id="char-next" aria-label="Next character">
          <svg viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>

      <button class="char-select-enter" id="char-enter">
        כנס למשחק ✓
      </button>
    </div>
  `;

  document.body.appendChild(container);

  // Setup Three.js scene
  const canvas = document.getElementById('char-select-canvas');
  _scene = new THREE.Scene();

  _camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 2.5, 8);
  _camera.lookAt(0, 1.8, 0);

  _renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.setClearColor(0x000000, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  _scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(3, 5, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  _scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-3, 3, 3);
  _scene.add(fillLight);

  // Create selection ring
  const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  _selectionRing = new THREE.Mesh(ringGeo, ringMat);
  _selectionRing.rotation.x = -Math.PI / 2;
  _selectionRing.position.y = 0.01;
  _scene.add(_selectionRing);

  // Create all 5 characters in a row
  const spacing = 2.2;
  const startX = -(CHARACTER_TYPES.length - 1) * spacing / 2;

  CHARACTER_TYPES.forEach((type, index) => {
    const charGroup = buildCharacter(type);

    // Scale to reasonable size
    const bbox = new THREE.Box3().setFromObject(charGroup);
    const size = bbox.getSize(new THREE.Vector3());
    const scale = 1.8 / size.y;
    charGroup.scale.setScalar(scale);
    charGroup.updateMatrixWorld(true);

    // Position on ground
    const bbox2 = new THREE.Box3().setFromObject(charGroup);
    const offset = -bbox2.min.y;
    charGroup.position.set(startX + index * spacing, offset, 0);

    _scene.add(charGroup);
    _characters.push({
      group: charGroup,
      type: type,
      index: index,
      baseX: startX + index * spacing
    });
  });

  // Event listeners
  document.getElementById('char-prev').addEventListener('click', () => changeSelection(-1));
  document.getElementById('char-next').addEventListener('click', () => changeSelection(1));
  document.getElementById('char-enter').addEventListener('click', confirmSelection);

  // Keyboard
  window.addEventListener('keydown', handleKeyboard);

  // Touch swipe
  let touchStartX = 0;
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  canvas.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      changeSelection(diff > 0 ? 1 : -1);
    }
  });

  // Click on character
  canvas.addEventListener('click', (e) => {
    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, _camera);

    for (let i = 0; i < _characters.length; i++) {
      const intersects = raycaster.intersectObject(_characters[i].group, true);
      if (intersects.length > 0) {
        _selectedIndex = i;
        updateSelection();
        break;
      }
    }
  });

  // Resize
  window.addEventListener('resize', () => {
    if (!_camera || !_renderer) return;
    _camera.aspect = window.innerWidth / window.innerHeight;
    _camera.updateProjectionMatrix();
    _renderer.setSize(window.innerWidth, window.innerHeight);
  });

  updateSelection();
  animate();
}

function handleKeyboard(e) {
  if (e.code === 'ArrowLeft') {
    changeSelection(-1);
  } else if (e.code === 'ArrowRight') {
    changeSelection(1);
  } else if (e.code === 'Enter') {
    confirmSelection();
  }
}

function changeSelection(direction) {
  _selectedIndex = (_selectedIndex + direction + CHARACTER_TYPES.length) % CHARACTER_TYPES.length;
  updateSelection();
}

function updateSelection() {
  const selectedChar = _characters[_selectedIndex];
  const config = CHARACTERS[selectedChar.type];

  const infoCard = document.getElementById('char-info-card');

  // Fade out
  infoCard.style.opacity = '0';

  // Update content after brief delay
  setTimeout(() => {
    document.getElementById('char-name').textContent = config.name;
    document.getElementById('char-personality').textContent = config.personality;
    document.getElementById('char-index').textContent = _selectedIndex + 1;

    // Fade in
    infoCard.style.opacity = '1';
  }, 100);

  // Move selection ring
  _selectionRing.position.x = selectedChar.baseX;

  console.log(`[char-select] Selected: ${config.name} (${selectedChar.type})`);
}

function confirmSelection() {
  const characterId = _selectedIndex + 1;
  localStorage.setItem('selected_character', characterId.toString());
  hideCharacterSelection();
  _onSelectCallback(characterId);
}

function hideCharacterSelection() {
  window.removeEventListener('keydown', handleKeyboard);

  const container = document.getElementById('character-selection');
  if (container) {
    container.remove();
  }

  if (_renderer) {
    _renderer.dispose();
    _renderer = null;
  }
  _scene = null;
  _camera = null;
  _characters = [];
}

function animate() {
  if (!_scene) return;

  requestAnimationFrame(animate);

  _animTime += 0.016;

  // Rotate selected character
  _characters.forEach((char, index) => {
    if (index === _selectedIndex) {
      char.group.rotation.y = _animTime * 0.5;
    } else {
      char.group.rotation.y = 0;
    }
  });

  // Pulse selection ring
  if (_selectionRing) {
    _selectionRing.material.opacity = 0.6 + Math.sin(_animTime * 3) * 0.2;
  }

  if (_renderer && _scene && _camera) {
    _renderer.render(_scene, _camera);
  }
}

export function getSavedCharacter() {
  const saved = localStorage.getItem('selected_character');
  return saved ? parseInt(saved) : null;
}

export function clearSavedCharacter() {
  localStorage.removeItem('selected_character');
}

export function getCharacterModelPath(charId) {
  return null;
}
