import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
let _arrowY = 5.0;
let _characterScale = 10.0;
let _characterPosY = 0.0;
let _characterPosZ = 0.0;
let _cameraZ = 1.5;

const CHARACTER_COUNT = 1;
const CHARACTER_SPACING = 4;
const CHARACTER_MODELS = ['cuteman.glb'];

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

      .controls-panel {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 15px;
        padding: 20px;
        z-index: 10000;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .control-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .control-label {
        color: white;
        font-size: 14px;
        font-weight: bold;
        min-width: 80px;
      }

      .control-btn {
        width: 40px;
        height: 40px;
        background: rgba(33, 150, 243, 0.4);
        border: 2px solid rgba(33, 150, 243, 0.7);
        border-radius: 8px;
        color: white;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .control-btn:hover {
        background: rgba(33, 150, 243, 0.7);
        transform: scale(1.1);
      }

      .control-value {
        color: #64B5F6;
        font-family: monospace;
        font-size: 14px;
        font-weight: bold;
        min-width: 60px;
        text-align: center;
      }

    </style>

    <img id="char-select-bg" src="/images/מסך בחירת דמות.png" alt="Background">
    <canvas id="char-select-canvas"></canvas>

    <div class="char-select-ui">
      <div class="char-select-title">Choose Your Character</div>

      <button class="char-select-enter" id="char-enter">
        Enter Game
      </button>

    </div>
  `;

  document.body.appendChild(container);

  const canvas = document.getElementById('char-select-canvas');
  _scene = new THREE.Scene();
  _scene.background = null;

  // Camera positioned to see character at ground level
  _camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 0.5, _cameraZ); // Look at character height
  _camera.lookAt(0, 0.3, 0); // Center of character

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

  // No arrow needed for single character

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

  document.getElementById('char-enter').addEventListener('click', confirmSelection);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') confirmSelection();
  });

  // No controls needed - character will float automatically

  loadAllCharacters();
  animate();
}

function updateAllCharacterScales() {
  _characterModels.forEach((char) => {
    if (char.model) {
      char.model.scale.setScalar(_characterScale);
      char.model.updateMatrixWorld(true);

      // Recalculate floor position with new scale
      const box = new THREE.Box3().setFromObject(char.model);
      char.originalFloorOffset = -box.min.y;
      char.model.position.y = char.originalFloorOffset + _characterPosY;
    }
  });
}

function updateAllCharacterPositions() {
  console.log(`[UPDATE-POS] Called with Y=${_characterPosY}, models=${_characterModels.length}`);
  _characterModels.forEach((char, i) => {
    console.log(`[UPDATE-POS] Model ${i}: has model=${!!char.model}, has container=${!!char.container}, originalFloor=${char.originalFloorOffset}`);
    if (char.model && char.container) {
      const newY = char.originalFloorOffset + _characterPosY;
      char.model.position.y = newY;
      console.log(`[UPDATE-POS] Model ${i} moved to Y=${newY.toFixed(2)}`);
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
    console.warn('[char-select] Idle animation not found - will display T-pose:', err.message);
    _idleClip = null;
  }

  console.log('[char-select] Loading characters...');

  for (let i = 0; i < CHARACTER_COUNT; i++) {
    const modelPath = `/models/player/characters/${CHARACTER_MODELS[i]}`;

    try {
      const gltf = await new Promise((resolve, reject) =>
        loader.load(modelPath, resolve, undefined, reject)
      );

      const model = gltf.scene.clone(true);

      // Configure meshes
      model.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
          n.frustumCulled = false;
        }
      });

      // Apply scale
      console.log(`[char-select] Applying scale: ${_characterScale}`);
      model.scale.setScalar(_characterScale);
      model.updateMatrixWorld(true);
      console.log(`[char-select] Model scale applied: ${model.scale.x}`);

      // Position on ground
      const box = new THREE.Box3().setFromObject(model);
      const floorOffset = -box.min.y;
      const finalSize = box.getSize(new THREE.Vector3());
      model.position.y = floorOffset;

      console.log(`FINAL: height=${finalSize.y.toFixed(2)}m, position=(0,${floorOffset.toFixed(2)},0)`);
      console.log(`CAMERA: position=(0,0.5,${_cameraZ}), lookAt=(0,0.3,0)`);

      // Add to scene
      const container = new THREE.Group();
      container.add(model);
      container.position.set(0, 0, 0);
      _scene.add(container);

      // Store floor offset for updates
      const originalFloorOffset = floorOffset;

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

      _characterModels.push({ container, model, mixer, originalFloorOffset });


    } catch (err) {
      console.error(`[char-select] Failed to load character ${i + 1} from ${modelPath}:`, err);
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

// Single character mode - no need for changeCharacter function

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
    nameEl.textContent = 'Cuteman';
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

  // Floating animation - smooth and natural
  if (_characterModels.length > 0) {
    _characterModels.forEach((char) => {
      if (char.model) {
        // Slow, smooth sine wave for natural floating
        const cycle = Math.sin(time * 0.0008); // Very slow cycle ~1.5 min per cycle
        // Apply easing for smoother motion at peaks
        const eased = cycle * Math.abs(cycle); // Ease in/out effect
        const floatAmount = eased * 0.25; // Visible 25cm movement

        const baseY = char.originalFloorOffset || 0;
        char.model.position.y = baseY + floatAmount;
      }
    });
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
