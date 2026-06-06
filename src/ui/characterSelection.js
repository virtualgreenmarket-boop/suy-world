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
let _selectedCharacterSpinTime = 0;

const CHARACTER_COUNT = 6;
const CIRCLE_RADIUS = 4.29;
const ROTATION_SPEED = 0.08;
const CHARACTER_TARGET_HEIGHT = 2.5;
const GROUND_Y = 0;

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

  const canvas = document.getElementById('char-select-canvas');
  _scene = new THREE.Scene();
  _scene.background = null;

  const canvasHeight = window.innerHeight;

  // EXACT settings from when red boxes worked
  _camera = new THREE.PerspectiveCamera(60, window.innerWidth / canvasHeight, 0.1, 100);
  _camera.position.set(0, 1, 10);
  _camera.lookAt(0, 2, 0);

  _renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  _renderer.setSize(window.innerWidth, canvasHeight);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.setClearColor(0x000000, 0);

  debugLog('[char-select] 🎨 Renderer setup complete');

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

  const groundGeo = new THREE.CircleGeometry(CIRCLE_RADIUS + 2, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  _scene.add(ground);

  debugLog('[char-select] ✅ Ground plane created at Y=0');

  document.getElementById('char-prev').addEventListener('click', () => rotateCarousel(1));
  document.getElementById('char-next').addEventListener('click', () => rotateCarousel(-1));
  document.getElementById('char-enter').addEventListener('click', confirmSelection);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') rotateCarousel(1);
    if (e.code === 'ArrowRight') rotateCarousel(-1);
    if (e.code === 'Enter') confirmSelection();
  });

  loadAllCharacters();
  debugLog('[char-select] 🎬 Starting animation loop...');
  animate();
}

async function loadAllCharacters() {
  const loader = new GLTFLoader();

  debugLog('[char-select] Starting to load characters...');

  try {
    debugLog('[char-select] Loading idle animation...');
    const gltf = await new Promise((resolve, reject) =>
      loader.load('/models/player/animations/idle.glb', resolve, undefined, reject)
    );
    if (gltf.animations && gltf.animations.length > 0) {
      _idleClip = gltf.animations[0];
      debugLog('[char-select] ✅ Idle animation loaded successfully');
    }
  } catch (err) {
    debugLog('❌ [char-select] Failed to load idle animation');
  }

  for (let i = 0; i < CHARACTER_COUNT; i++) {
    const modelPath = `/models/player/characters/model${i + 1}.glb`;
    debugLog(`[char-select] Loading character ${i + 1}...`);

    try {
      const gltf = await new Promise((resolve, reject) =>
        loader.load(modelPath, resolve, undefined, reject)
      );

      const model = skeletonClone(gltf.scene);

      // Get original size for logging
      const box = new THREE.Box3().setFromObject(model);
      const originalHeight = box.getSize(new THREE.Vector3()).y;
      debugLog(`[char-select] Model ${i + 1} original height: ${originalHeight.toFixed(6)}m`);

      // FIXED SCALE - test small values
      const FIXED_SCALE = 1.0;
      model.scale.setScalar(FIXED_SCALE);
      model.updateMatrixWorld(true);

      // Position so bottom is at Y=0
      const box2 = new THREE.Box3().setFromObject(model);
      const floorOffset = -box2.min.y;
      const finalHeight = box2.getSize(new THREE.Vector3()).y;
      model.position.y = floorOffset;

      debugLog(`[char-select] FIXED scale=${FIXED_SCALE}, final height=${finalHeight.toFixed(3)}m`);

      model.castShadow = true;
      model.receiveShadow = true;

      // Container
      const container = new THREE.Group();
      container.add(model);

      const angle = (i / CHARACTER_COUNT) * Math.PI * 2;
      container.position.x = Math.sin(angle) * CIRCLE_RADIUS;
      container.position.y = GROUND_Y;
      container.position.z = Math.cos(angle) * CIRCLE_RADIUS;
      container.rotation.y = angle + Math.PI;

      _scene.add(container);

      let mixer = null;
      if (_idleClip) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(_idleClip);
        action.play();
        mixer.update(0);
      }

      _characterModels.push({ container, model, mixer });

      debugLog(`[char-select] ✅ Character ${i + 1} loaded`);

    } catch (err) {
      debugLog(`❌ [char-select] Failed to load model${i + 1}`);
    }
  }

  debugLog(`[char-select] ✅ All ${_characterModels.length} characters loaded!`);
  updateCharacterName();
}

function rotateCarousel(direction) {
  _selectedIndex = (_selectedIndex - direction + CHARACTER_COUNT) % CHARACTER_COUNT;
  _targetRotation += direction * (Math.PI * 2 / CHARACTER_COUNT);
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

let lastTime = 0;
function animate(time = 0) {
  if (!_scene) return;

  requestAnimationFrame(animate);

  const delta = (time - lastTime) / 1000;
  lastTime = time;

  const rotDiff = _targetRotation - _currentRotation;
  _currentRotation += rotDiff * ROTATION_SPEED;

  _selectedCharacterSpinTime += delta;

  let frontCharIndex = -1;
  let maxZ = -Infinity;

  _characterModels.forEach((char, index) => {
    const baseAngle = (index / CHARACTER_COUNT) * Math.PI * 2;
    const angle = baseAngle + _currentRotation;

    char.container.position.x = Math.sin(angle) * CIRCLE_RADIUS;
    char.container.position.y = GROUND_Y;
    char.container.position.z = Math.cos(angle) * CIRCLE_RADIUS;

    if (char.container.position.z > maxZ) {
      maxZ = char.container.position.z;
      frontCharIndex = index;
    }

    let faceRotation = angle + Math.PI;
    char.container.rotation.y = faceRotation;

    if (char.model) {
      char.model.rotation.x = 0;
      char.model.rotation.z = 0;
    }

    if (char.mixer) {
      char.mixer.update(delta);
    }
  });

  _characterModels.forEach((char, index) => {
    if (index === frontCharIndex) {
      const spinCycle = Math.sin(_selectedCharacterSpinTime * (Math.PI / 3)) * Math.PI;
      char.container.rotation.y += spinCycle;
    }
  });

  if (_renderer && _scene && _camera) {
    _renderer.render(_scene, _camera);
  }
}

window.addEventListener('resize', () => {
  if (!_camera || !_renderer) return;

  const canvasHeight = window.innerHeight;
  _camera.aspect = window.innerWidth / canvasHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, canvasHeight);
});
