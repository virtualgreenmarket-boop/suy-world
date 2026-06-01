import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

let _onSelectCallback = null;
let _scene = null;
let _camera = null;
let _renderer = null;
let _characterModels = [];
let _idleClip = null;
let _currentRotation = 0;
let _targetRotation = 0;
let _selectedIndex = 0;
let _isInitialized = false;

const CHARACTER_COUNT = 6;
const CIRCLE_RADIUS = 4.29; // 30% larger (was 3.3)
const ROTATION_SPEED = 0.08;
const CHARACTER_TARGET_HEIGHT = 2.5; // Taller for better visibility
const GROUND_Y = 0; // Ground plane at Y=0

// Debug log to screen
function debugLog(msg) {
  console.log(msg);
  const logDiv = document.getElementById('debug-log');
  if (logDiv) {
    const line = document.createElement('div');
    line.textContent = msg;
    line.style.marginBottom = '2px';
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
  }
}

export function initCharacterSelection(onSelect) {
  if (_isInitialized) {
    debugLog('[char-select] ⚠️ Already initialized, ignoring duplicate call');
    return;
  }
  _isInitialized = true;
  debugLog('[char-select] ✅ Starting initialization...');

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
        opacity: 1;
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
        z-index: 3;
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
        text-shadow: 0 6px 20px rgba(0,0,0,0.9), 0 3px 8px rgba(0,0,0,0.7);
        font-family: 'Segoe UI', Arial, sans-serif;
        letter-spacing: 3px;
        z-index: 10;
      }

      .char-select-controls {
        position: absolute;
        bottom: 15%;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 50px;
        z-index: 10;
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
        box-shadow: 0 0 30px rgba(255,255,255,0.5);
      }

      .char-select-arrow svg {
        width: 32px;
        height: 32px;
        fill: white;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
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
        text-shadow: 0 2px 6px rgba(0,0,0,0.8);
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
        z-index: 10;
      }

      .char-select-enter:hover {
        transform: translateX(-50%) translateY(-4px);
        box-shadow: 0 14px 40px rgba(76, 175, 80, 0.9);
      }

      #debug-log {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 400px;
        max-height: 90vh;
        background: rgba(0,0,0,0.9);
        color: #0f0;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        overflow-y: auto;
        z-index: 999999;
        border: 2px solid #0f0;
        pointer-events: none;
      }

      @media (max-width: 768px) {
        .char-select-title { font-size: 36px; top: 20px; }
        .char-select-controls { bottom: 100px; gap: 25px; }
        .char-select-arrow { width: 55px; height: 55px; }
        .char-select-arrow svg { width: 24px; height: 24px; }
        .char-select-name { font-size: 24px; padding: 12px 35px; min-width: 200px; }
        .char-select-enter { font-size: 20px; padding: 16px 60px; }
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

      <div id="debug-log">
        <div style="color: #fff; font-weight: bold; margin-bottom: 5px;">DEBUG LOG:</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Setup 3D scene
  const canvas = document.getElementById('char-select-canvas');
  _scene = new THREE.Scene();
  _scene.background = null; // Transparent

  const canvasHeight = window.innerHeight;

  // Camera setup: very low angle (almost horizontal - 6°)
  _camera = new THREE.PerspectiveCamera(60, window.innerWidth / canvasHeight, 0.1, 100);
  _camera.position.set(0, 1, 10); // Y=1, Z=10 → 6° angle
  _camera.lookAt(0, 2, 0); // Look at Y=2 (above ground)

  _renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  _renderer.setSize(window.innerWidth, canvasHeight);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.setClearColor(0x000000, 0);

  debugLog('[char-select] 🎨 Renderer setup complete');

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  _scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(3, 5, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  _scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-2, 3, -2);
  _scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x88ccff, 0.6);
  rimLight.position.set(0, 3, -3);
  _scene.add(rimLight);

  // Ground plane at Y=0 - visible plaza floor
  const groundGeo = new THREE.CircleGeometry(CIRCLE_RADIUS + 2, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x555555, // Visible gray ground
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7, // Semi-transparent to see background
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2; // Horizontal plane (XZ)
  ground.position.y = GROUND_Y; // Y=0
  ground.receiveShadow = true;
  _scene.add(ground);

  debugLog('[char-select] ✅ Ground plane created at Y=0');

  // UI event handlers
  document.getElementById('char-prev').addEventListener('click', () => rotateCarousel(-1));
  document.getElementById('char-next').addEventListener('click', () => rotateCarousel(1));
  document.getElementById('char-enter').addEventListener('click', confirmSelection);

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') rotateCarousel(-1);
    if (e.code === 'ArrowRight') rotateCarousel(1);
    if (e.code === 'Enter') confirmSelection();
  });

  // Load characters
  loadAllCharacters();

  // Start animation loop
  debugLog('[char-select] 🎬 Starting animation loop...');
  animate();
}

async function loadAllCharacters() {
  const loader = new GLTFLoader();

  debugLog('[char-select] Starting to load characters...');

  // Load idle animation first
  try {
    debugLog('[char-select] Loading idle animation...');
    const gltf = await new Promise((resolve, reject) =>
      loader.load('/models/player/animations/idle.glb', resolve, undefined, reject)
    );
    if (gltf.animations && gltf.animations.length > 0) {
      _idleClip = gltf.animations[0];
      debugLog('[char-select] ✅ Idle animation loaded successfully');
    } else {
      debugLog('[char-select] ⚠️ Idle animation loaded but no animations found');
    }
  } catch (err) {
    debugLog('❌ [char-select] ❌ Failed to load idle animation:', err);
  }

  // Load all 6 characters in a FLAT circle on the ground
  for (let i = 0; i < CHARACTER_COUNT; i++) {
    const modelPath = `/models/player/characters/model${i + 1}.glb`;

    debugLog(`[char-select] Loading character ${i + 1} from ${modelPath}...`);

    try {
      const gltf = await new Promise((resolve, reject) =>
        loader.load(modelPath, resolve, undefined, reject)
      );

      debugLog(`[char-select] ✅ Character ${i + 1} GLB loaded, cloning scene...`);

      // Clone using SkeletonUtils
      const model = skeletonClone(gltf.scene);

      // Scale to normal height
      const box = new THREE.Box3().setFromObject(model);
      const height = box.getSize(new THREE.Vector3()).y;
      const scale = CHARACTER_TARGET_HEIGHT / height;
      model.scale.setScalar(scale);

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;
      model.position.y = floorY;

      // Keep upright - no rotation
      model.rotation.set(0, 0, 0);

      // Enable shadows
      model.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });

      // Create container at ground level (Y=0)
      const container = new THREE.Group();
      container.add(model);

      // Position in FLAT circle on XZ plane, radius=3, Y=0
      // Selected character (index 0) is at FRONT (positive Z, closest to camera)
      const angle = (i / CHARACTER_COUNT) * Math.PI * 2;
      container.position.x = Math.sin(angle) * CIRCLE_RADIUS;
      container.position.y = GROUND_Y; // Y=0 - ground plane
      container.position.z = Math.cos(angle) * CIRCLE_RADIUS;

      // Face OUTWARD from center (toward camera)
      container.rotation.y = angle + Math.PI;

      _scene.add(container);

      // Setup animation
      let mixer = null;
      if (_idleClip) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(_idleClip);
        action.play();
        mixer.update(0);
      }

      _characterModels.push({ container, model, mixer });

      debugLog(`[char-select] ✅ Character ${i + 1} loaded at (${container.position.x.toFixed(2)}, ${container.position.y.toFixed(2)}, ${container.position.z.toFixed(2)})`);

    } catch (err) {
      debugLog(`❌ [char-select] Failed to load model${i + 1}: ${err.message}`);
    }
  }

  debugLog(`[char-select] ✅ All characters loaded! Total: ${_characterModels.length}`);
  updateCharacterName();
}

function rotateCarousel(direction) {
  _selectedIndex = (_selectedIndex - direction + CHARACTER_COUNT) % CHARACTER_COUNT;
  _targetRotation = (_selectedIndex / CHARACTER_COUNT) * Math.PI * 2;
  updateCharacterName();
}

function updateCharacterName() {
  const nameEl = document.getElementById('char-name');
  if (nameEl) {
    nameEl.textContent = `Character ${_selectedIndex + 1}`;
  }
}

function confirmSelection() {
  const characterId = _selectedIndex + 1;
  saveCharacterChoice(characterId);
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

function saveCharacterChoice(charId) {
  localStorage.setItem('selected_character', charId.toString());
}

export function getSavedCharacter() {
  const saved = localStorage.getItem('selected_character');
  return saved ? parseInt(saved) : null;
}

export function clearSavedCharacter() {
  localStorage.removeItem('selected_character');
}

export function getCharacterModelPath(charId) {
  return `/models/player/characters/model${charId}.glb`;
}

// Animation loop
let lastTime = 0;
function animate(time = 0) {
  if (!_scene) return;

  requestAnimationFrame(animate);

  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // Smooth rotation interpolation
  const rotDiff = _targetRotation - _currentRotation;
  _currentRotation += rotDiff * ROTATION_SPEED;

  // Rotate all characters around Y axis (vertical)
  _characterModels.forEach((char, index) => {
    const baseAngle = (index / CHARACTER_COUNT) * Math.PI * 2;
    const angle = baseAngle + _currentRotation;

    // Position in flat circle on XZ plane at Y=0
    char.container.position.x = Math.sin(angle) * CIRCLE_RADIUS;
    char.container.position.y = GROUND_Y; // Keep at ground level (Y=0)
    char.container.position.z = Math.cos(angle) * CIRCLE_RADIUS;

    // Face outward from center
    char.container.rotation.y = angle + Math.PI;

    // Lock X/Z rotation (keep standing upright)
    if (char.model) {
      char.model.rotation.x = 0;
      char.model.rotation.z = 0;
    }

    // Update animation
    if (char.mixer) {
      char.mixer.update(delta);
    }

    // Scale front character slightly larger
    const distFromFront = Math.abs(Math.sin(angle));
    const scale = 1.0 + (1.0 - distFromFront) * 0.15;
    char.container.scale.setScalar(scale);
  });

  // Render
  if (_renderer && _scene && _camera) {
    _renderer.render(_scene, _camera);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (!_camera || !_renderer) return;

  const canvasHeight = window.innerHeight;
  _camera.aspect = window.innerWidth / canvasHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, canvasHeight);
});
