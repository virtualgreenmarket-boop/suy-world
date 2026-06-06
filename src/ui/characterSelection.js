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
let _cameraTargetX = 0;
let _currentCameraX = 0;

const CHARACTER_COUNT = 6;
const CHARACTER_SPACING = 3; // Distance between characters
const CAMERA_SMOOTH = 0.1;

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
        text-shadow: 0 6px 20px rgba(0,0,0,0.9);
        font-family: 'Segoe UI', Arial, sans-serif;
      }

      .char-select-controls {
        position: absolute;
        bottom: 15%;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 50px;
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
      }

      .char-select-enter:hover {
        transform: translateX(-50%) translateY(-4px);
        box-shadow: 0 14px 40px rgba(76, 175, 80, 0.9);
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
    </div>
  `;

  document.body.appendChild(container);

  const canvas = document.getElementById('char-select-canvas');
  _scene = new THREE.Scene();
  _scene.background = null;

  // Simple camera - straight view from front
  _camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 1, 5); // Straight in front
  _camera.lookAt(0, 1, 0);

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

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(50, 10);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.8,
    transparent: true,
    opacity: 0.5,
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

  loadAllCharacters();
  animate();
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
    const modelPath = `/models/player/characters/model${i + 1}.glb`;

    try {
      const gltf = await new Promise((resolve, reject) =>
        loader.load(modelPath, resolve, undefined, reject)
      );

      const model = skeletonClone(gltf.scene);

      // Simple scale - test with 1.0
      model.scale.setScalar(1.0);
      model.updateMatrixWorld(true);

      // Position on ground
      const box = new THREE.Box3().setFromObject(model);
      const floorOffset = -box.min.y;
      model.position.y = floorOffset;

      model.castShadow = true;
      model.receiveShadow = true;

      // Position in a LINE (not circle)
      // Character 0 at X=0, Character 1 at X=3, etc.
      const container = new THREE.Group();
      container.add(model);
      container.position.x = i * CHARACTER_SPACING;
      container.position.z = 0;
      container.position.y = 0;

      _scene.add(container);

      let mixer = null;
      if (_idleClip) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(_idleClip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
        mixer.update(0);
        console.log(`[char-select] Character ${i + 1}: Idle animation PLAYING`);
      } else {
        console.log(`[char-select] Character ${i + 1}: NO idle animation (clip not loaded)`);
      }

      _characterModels.push({ container, model, mixer });

      console.log(`[char-select] Character ${i + 1} loaded at X=${i * CHARACTER_SPACING}`);

    } catch (err) {
      console.log(`[char-select] Failed to load model${i + 1}`);
    }
  }

  console.log(`[char-select] ✅ ${_characterModels.length} characters ready with IDLE animations!`);
  updateCharacterName();
}

// Test - log every second to confirm animations are updating
let _debugCounter = 0;
setInterval(() => {
  if (_characterModels.length > 0 && _characterModels[0].mixer) {
    _debugCounter++;
    if (_debugCounter % 60 === 0) { // Every 60 frames
      console.log('[char-select] Animations still running...');
    }
  }
}, 16);

function changeCharacter(direction) {
  _selectedIndex = (_selectedIndex + direction + CHARACTER_COUNT) % CHARACTER_COUNT;
  _cameraTargetX = _selectedIndex * CHARACTER_SPACING;
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
  return `/models/player/characters/model${charId}.glb`;
}

let lastTime = 0;
function animate(time = 0) {
  if (!_scene) return;

  requestAnimationFrame(animate);

  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // Smooth camera movement
  _currentCameraX += (_cameraTargetX - _currentCameraX) * CAMERA_SMOOTH;
  _camera.position.x = _currentCameraX;

  // Update animations
  _characterModels.forEach((char) => {
    if (char.mixer) {
      char.mixer.update(delta);
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
