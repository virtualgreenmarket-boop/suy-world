import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

let _onSelectCallback = null;
let _scene = null;
let _camera = null;
let _renderer = null;
let _characterModels = [];
let _idleClip = null;
let _selectedIndex = 0;
let _isInitialized = false;
let _selectionLight = null;
let _selectionArrow = null;
let _arrowY = 4.8; // Global arrow Y position (user-finalized)
let _characterScale = 0.35; // Global character scale (user-finalized: 0.35x)

const CHARACTER_COUNT = 1; // Single character
const CHARACTER_SPACING = 4; // Distance between characters
const CAMERA_Z = 13.0; // User-specified camera distance
const CHARACTER_MODELS = ['Muscular.glb']; // New model filename

function debugLog(msg) {
  console.log(msg);
}

export function initCharacterSelection(onSelect) {
  if (_isInitialized) {
    console.log('[char-select] Already initialized');
    return;
  }
  _isInitialized = true;
  console.log('[char-select] Starting...');

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
        pointer-events: none; /* Let UI elements receive clicks */
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
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 64px;
        font-weight: bold;
        text-shadow: 0 6px 20px rgba(0,0,0,0.9);
        font-family: 'Segoe UI', Arial, sans-serif;
        z-index: 1001;
        pointer-events: none;
      }

      .char-select-controls {
        position: absolute;
        bottom: 15%;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 50px;
        z-index: 1002;
      }

      .char-select-arrow {
        width: 70px;
        height: 70px;
        background: rgba(255,255,255,0.15);
        border: 3px solid rgba(255,255,255,0.4);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        pointer-events: auto;
        backdrop-filter: blur(10px);
      }

      .char-select-arrow:hover {
        background: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.8);
        transform: scale(1.1);
      }

      .char-select-arrow svg {
        width: 32px;
        height: 32px;
        fill: white;
      }

      .char-select-name {
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(12px);
        padding: 15px 50px;
        border-radius: 50px;
        border: 2px solid rgba(255,255,255,0.3);
        color: white;
        font-size: 32px;
        font-weight: bold;
        min-width: 280px;
        text-align: center;
      }

      .char-select-enter {
        position: absolute;
        bottom: 5%;
        left: 50%;
        transform: translateX(-50%);
        padding: 22px 100px;
        font-size: 28px;
        font-weight: bold;
        color: white;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        border: none;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 10px 30px rgba(76, 175, 80, 0.7);
        text-transform: uppercase;
        letter-spacing: 2.5px;
        pointer-events: auto;
        z-index: 1003;
      }

      .char-select-enter:hover {
        transform: translateX(-50%) translateY(-4px);
        box-shadow: 0 14px 40px rgba(76, 175, 80, 0.9);
      }

      .zoom-controls {
        position: absolute;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 1004;
      }

      .zoom-btn {
        width: 60px;
        height: 60px;
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.5);
        border-radius: 50%;
        color: white;
        font-size: 32px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        pointer-events: auto;
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .zoom-btn:hover {
        background: rgba(255,255,255,0.4);
        transform: scale(1.1);
      }

      .zoom-info {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 14px;
        z-index: 1005;
        pointer-events: none;
      }

      .height-controls {
        position: absolute;
        top: 50%;
        left: 20px;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 1004;
      }

      .height-btn {
        width: 60px;
        height: 60px;
        background: rgba(76, 175, 80, 0.3);
        border: 2px solid rgba(76, 175, 80, 0.6);
        border-radius: 50%;
        color: white;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        pointer-events: auto;
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .height-btn:hover {
        background: rgba(76, 175, 80, 0.5);
        transform: scale(1.1);
      }

      .arrow-controls {
        position: absolute;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 10000;
        pointer-events: auto;
      }

      .arrow-btn {
        width: 60px;
        height: 60px;
        background: rgba(255, 193, 7, 0.3);
        border: 2px solid rgba(255, 193, 7, 0.6);
        border-radius: 50%;
        color: white;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        pointer-events: auto;
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .arrow-btn:hover {
        background: rgba(255, 193, 7, 0.5);
        transform: scale(1.1);
      }

      .arrow-info {
        position: absolute;
        top: 60px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: #ffeb3b;
        padding: 10px 20px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 14px;
        z-index: 10001;
        pointer-events: none;
      }

      .size-controls {
        position: absolute;
        bottom: 20%;
        right: 20px;
        display: flex;
        gap: 10px;
        z-index: 10000;
        pointer-events: auto;
      }

      .size-btn {
        width: 70px;
        height: 50px;
        background: rgba(33, 150, 243, 0.3);
        border: 2px solid rgba(33, 150, 243, 0.6);
        border-radius: 10px;
        color: white;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        pointer-events: auto;
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .size-btn:hover {
        background: rgba(33, 150, 243, 0.5);
        transform: scale(1.1);
      }

      .size-info {
        position: absolute;
        bottom: 20%;
        right: 170px;
        background: rgba(0,0,0,0.8);
        color: #2196f3;
        padding: 10px 20px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 14px;
        z-index: 10001;
        pointer-events: none;
      }

    </style>

    <img id="char-select-bg" src="/images/מסך בחירת דמות.png" alt="Background">
    <canvas id="char-select-canvas"></canvas>

    <div class="char-select-ui">
      <div class="char-select-title">Choose Your Character</div>

      <div class="char-select-controls">
        <button class="char-select-arrow" id="char-prev">
          <svg viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>

        <div class="char-select-name" id="char-name">Character 1</div>

        <button class="char-select-arrow" id="char-next">
          <svg viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>

      <button class="char-select-enter" id="char-enter">
        Enter Game
      </button>

      <div class="size-controls">
        <button class="size-btn" id="size-down">−</button>
        <button class="size-btn" id="size-up">+</button>
      </div>
      <div class="size-info" id="size-info">Size: 0.35x</div>
    </div>
  `;

  document.body.appendChild(container);

  const canvas = document.getElementById('char-select-canvas');
  _scene = new THREE.Scene();
  _scene.background = null;

  // Camera positioned to see all 6 characters
  // Characters are at X: -10, -6, -2, 2, 6, 10 (total width ~20)
  _camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 3.0, CAMERA_Z); // User-adjusted: Y=3.0
  _camera.lookAt(0, 3.0, 0);

  _renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.setClearColor(0x000000, 0);

  console.log('[char-select] Renderer ready');

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 1.5);
  _scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(2, 3, 5);
  keyLight.castShadow = true;
  _scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
  fillLight.position.set(-2, 2, 3);
  _scene.add(fillLight);

  // Selection spotlight (initially hidden)
  _selectionLight = new THREE.SpotLight(0x00ff00, 5, 10, Math.PI / 6, 0.5, 1);
  _selectionLight.position.set(0, 5, 0);
  _selectionLight.target.position.set(0, 0, 0);
  _scene.add(_selectionLight);
  _scene.add(_selectionLight.target);

  // Selection arrow (3D arrow pointing down)
  const arrowShape = new THREE.ConeGeometry(0.3, 0.6, 8);
  const arrowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
  });
  _selectionArrow = new THREE.Mesh(arrowShape, arrowMaterial);
  _selectionArrow.rotation.x = Math.PI; // Point down
  _selectionArrow.position.set(0, _arrowY, 0); // Use global _arrowY
  _scene.add(_selectionArrow);
  console.log(`[char-select] Arrow created at Y=${_arrowY}`);

  // Ground plane (wider to fit all characters)
  const groundGeo = new THREE.PlaneGeometry(30, 10);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.8,
    transparent: true,
    opacity: 0.3,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  _scene.add(ground);

  document.getElementById('char-prev').addEventListener('click', () => changeCharacter(-1));
  document.getElementById('char-next').addEventListener('click', () => changeCharacter(1));
  document.getElementById('char-enter').addEventListener('click', confirmSelection);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') changeCharacter(-1);
    if (e.code === 'ArrowRight') changeCharacter(1);
    if (e.code === 'Enter') confirmSelection();
  });

  // Size controls (adjust uniform scale)
  const updateSizeInfo = () => {
    document.getElementById('size-info').textContent = `Size: ${_characterScale.toFixed(1)}x`;
  };

  document.getElementById('size-up').addEventListener('click', () => {
    _characterScale += 0.1; // Small steps - models are already big
    updateAllCharacterScales();
    updateSizeInfo();
    console.log(`[char-select] Size: ${_characterScale.toFixed(1)}x`);
  });

  document.getElementById('size-down').addEventListener('click', () => {
    _characterScale = Math.max(0.1, _characterScale - 0.1); // Min 0.1, step 0.1
    updateAllCharacterScales();
    updateSizeInfo();
    console.log(`[char-select] Size: ${_characterScale.toFixed(1)}x`);
  });

  loadAllCharacters();
  animate();
}

function updateAllCharacterScales() {
  _characterModels.forEach((char, i) => {
    if (char.model) {
      char.model.scale.setScalar(_characterScale);
      char.model.updateMatrixWorld(true);

      // Recalculate floor position
      const box = new THREE.Box3().setFromObject(char.model);
      const floorOffset = -box.min.y;
      char.model.position.y = floorOffset;

      console.log(`[char-select] Char ${i + 1} rescaled to ${_characterScale.toFixed(1)}x`);
    }
  });
}

async function loadAllCharacters() {
  const loader = new GLTFLoader();

  console.log('[char-select] Loading idle animation...');
  try {
    const gltf = await new Promise((resolve, reject) =>
      loader.load('/models/player/animations/idle.glb', resolve, undefined, reject)
    );
    if (gltf.animations && gltf.animations.length > 0) {
      _idleClip = gltf.animations[0];
      console.log('[char-select] Idle animation loaded');
    }
  } catch (err) {
    console.log('[char-select] Failed to load idle animation');
  }

  console.log('[char-select] Loading characters...');

  for (let i = 0; i < CHARACTER_COUNT; i++) {
    const modelPath = `/models/player/characters/${CHARACTER_MODELS[i]}`;

    try {
      const gltf = await new Promise((resolve, reject) =>
        loader.load(modelPath, resolve, undefined, reject)
      );

      const model = skeletonClone(gltf.scene);

      // Apply global scale
      model.scale.setScalar(_characterScale);
      model.updateMatrixWorld(true);

      // Position on ground
      const box = new THREE.Box3().setFromObject(model);
      const floorOffset = -box.min.y;
      const size = box.getSize(new THREE.Vector3());
      model.position.y = floorOffset;

      console.log(`[char-select] Char ${i + 1} loaded: scale=${_characterScale.toFixed(1)}x, size=${size.x.toFixed(3)}×${size.y.toFixed(3)}×${size.z.toFixed(3)}m`);

      model.castShadow = true;
      model.receiveShadow = true;

      // Position characters in a LINE
      // Center them: Character 0,1,2,3,4,5 → positions -10,-6,-2,2,6,10
      const container = new THREE.Group();
      container.add(model);
      const totalWidth = (CHARACTER_COUNT - 1) * CHARACTER_SPACING;
      container.position.x = (i * CHARACTER_SPACING) - (totalWidth / 2);
      container.position.z = 0;
      container.position.y = 0;

      _scene.add(container);

      console.log(`[char-select] Character ${i + 1} at X=${container.position.x}`);

      let mixer = null;
      if (_idleClip) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(_idleClip);
        action.setLoop(THREE.LoopRepeat);
        action.clampWhenFinished = false;
        action.enabled = true;
        action.timeScale = 1.0;
        action.reset();
        action.play();

        // Force first frame
        mixer.update(0.01);

        console.log(`[char-select] Char ${i + 1}: IDLE animation ACTIVE (clip duration: ${_idleClip.duration.toFixed(2)}s)`);
      } else {
        console.log(`[char-select] Char ${i + 1}: NO idle clip!`);
      }

      _characterModels.push({ container, model, mixer });


    } catch (err) {
      console.log(`[char-select] Failed to load model${i + 1}`);
    }
  }

  console.log(`[char-select] ✅ ${_characterModels.length} characters ready with IDLE animations!`);
  updateCharacterName();
  updateSelection(); // Position arrow and light on first character
}

// Debug: Check mixer state every 2 seconds
let _debugTimer = 0;
setInterval(() => {
  if (_characterModels.length > 0 && _characterModels[0].mixer) {
    _debugTimer++;
    if (_debugTimer % 1 === 0) {
      const mixer = _characterModels[0].mixer;
      const time = mixer.time.toFixed(2);
      console.log(`[char-select] ✅ Idle animation time: ${time}s (running)`);
    }
  }
}, 2000);

function changeCharacter(direction) {
  _selectedIndex = (_selectedIndex + direction + CHARACTER_COUNT) % CHARACTER_COUNT;
  updateCharacterName();
  updateSelection();
}

function updateSelection() {
  if (!_characterModels[_selectedIndex]) return;

  // Move spotlight and arrow to selected character
  const selectedChar = _characterModels[_selectedIndex];
  const x = selectedChar.container.position.x;

  if (_selectionLight) {
    _selectionLight.position.x = x;
    _selectionLight.target.position.x = x;
  }

  if (_selectionArrow) {
    _selectionArrow.position.x = x;
    _selectionArrow.position.y = _arrowY; // Preserve Y position!
  }

  console.log(`[char-select] Selected character ${_selectedIndex + 1} at X=${x}`);
}

function updateCharacterName() {
  const nameEl = document.getElementById('char-name');
  if (nameEl) {
    nameEl.textContent = `Character ${_selectedIndex + 1}`;
  }
}

function confirmSelection() {
  const characterId = _selectedIndex + 1;
  localStorage.setItem('selected_character', characterId.toString());
  hideCharacterSelection();
  _onSelectCallback(characterId);
}

function hideCharacterSelection() {
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
  _characterModels = [];
  _idleClip = null;
}

export function getSavedCharacter() {
  const saved = localStorage.getItem('selected_character');
  return saved ? parseInt(saved) : null;
}

export function clearSavedCharacter() {
  localStorage.removeItem('selected_character');
}

export function getCharacterModelPath(charId) {
  // charId is 1-based (1 or 2), array is 0-based
  const modelIndex = charId - 1;
  if (modelIndex >= 0 && modelIndex < CHARACTER_MODELS.length) {
    return `/models/player/characters/${CHARACTER_MODELS[modelIndex]}`;
  }
  // Fallback
  return `/models/player/characters/BowGirl.glb`;
}

let lastTime = 0;
function animate(time = 0) {
  if (!_scene) return;

  requestAnimationFrame(animate);

  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // Animate arrow (bob up and down) - use _arrowY as base!
  if (_selectionArrow) {
    _selectionArrow.position.y = _arrowY + Math.sin(time * 0.003) * 0.2;
  }

  // Update animations - FORCE update even if delta is 0
  const clampedDelta = Math.max(delta, 0.001); // Ensure minimum delta
  _characterModels.forEach((char) => {
    if (char.mixer) {
      char.mixer.update(clampedDelta);
    }
  });

  if (_renderer && _scene && _camera) {
    _renderer.render(_scene, _camera);
  }
}

window.addEventListener('resize', () => {
  if (!_camera || !_renderer) return;

  _camera.aspect = window.innerWidth / window.innerHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, window.innerHeight);
});
