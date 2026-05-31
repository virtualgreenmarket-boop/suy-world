import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _onSelectCallback = null;
let _scene = null;
let _camera = null;
let _renderer = null;
let _characterModels = [];
let _idleClip = null;
let _currentRotation = 0;
let _targetRotation = 0;
let _selectedIndex = 0;

const CHARACTER_COUNT = 6;
const CIRCLE_RADIUS = 3.5;
const ROTATION_SPEED = 0.08;

export function initCharacterSelection(onSelect) {
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
        height: 100%;
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
        top: 40px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 56px;
        font-weight: bold;
        text-shadow: 0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6);
        font-family: 'Segoe UI', Arial, sans-serif;
        letter-spacing: 2px;
      }

      .char-select-controls {
        position: absolute;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 40px;
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
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        padding: 20px 90px;
        font-size: 26px;
        font-weight: bold;
        color: white;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        border: none;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 8px 25px rgba(76, 175, 80, 0.6);
        text-transform: uppercase;
        letter-spacing: 2px;
        pointer-events: auto;
      }

      .char-select-enter:hover {
        transform: translateX(-50%) translateY(-3px);
        box-shadow: 0 12px 35px rgba(76, 175, 80, 0.8);
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

    <img id="char-select-bg" src="/images/מסך_בחירת_דמות.png" alt="Background">
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

  // Setup 3D scene
  const canvas = document.getElementById('char-select-canvas');
  _scene = new THREE.Scene();

  _camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 1.5, 5);
  _camera.lookAt(0, 1, 0);

  _renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  _scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(3, 4, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  _scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
  fillLight.position.set(-2, 2, -2);
  _scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x88ccff, 0.4);
  rimLight.position.set(0, 2, -3);
  _scene.add(rimLight);

  // Ground plane
  const groundGeo = new THREE.CircleGeometry(8, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0.3,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  _scene.add(ground);

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
  animate();
}

async function loadAllCharacters() {
  const loader = new GLTFLoader();

  // Load idle animation first
  try {
    const gltf = await new Promise((resolve, reject) =>
      loader.load('/models/player/animations/idle.glb', resolve, undefined, reject)
    );
    if (gltf.animations && gltf.animations.length > 0) {
      _idleClip = gltf.animations[0];
      console.log('[char-select] Idle animation loaded');
    }
  } catch (err) {
    console.warn('[char-select] Failed to load idle animation:', err);
  }

  // Load all 6 characters in a circle
  for (let i = 0; i < CHARACTER_COUNT; i++) {
    const modelPath = `/models/player/characters/model${i + 1}.glb`;

    try {
      const gltf = await new Promise((resolve, reject) =>
        loader.load(modelPath, resolve, undefined, reject)
      );

      const model = gltf.scene;

      // Scale to consistent height (1.8m)
      const box = new THREE.Box3().setFromObject(model);
      const height = box.getSize(new THREE.Vector3()).y;
      const scale = 1.8 / height;
      model.scale.setScalar(scale);

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;
      model.position.y = floorY;

      // Enable shadows
      model.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });

      // Create container for rotation
      const container = new THREE.Group();
      container.add(model);

      // Position in circle
      const angle = (i / CHARACTER_COUNT) * Math.PI * 2;
      container.position.x = Math.sin(angle) * CIRCLE_RADIUS;
      container.position.z = Math.cos(angle) * CIRCLE_RADIUS;
      container.rotation.y = -angle; // Face center

      _scene.add(container);

      // Setup animation
      let mixer = null;
      if (_idleClip) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(_idleClip);
        action.play();
      }

      _characterModels.push({ container, model, mixer });

    } catch (err) {
      console.warn(`[char-select] Failed to load model${i + 1}:`, err);
    }
  }

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

  // Cleanup
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

  // Rotate all characters around the circle
  _characterModels.forEach((char, index) => {
    const baseAngle = (index / CHARACTER_COUNT) * Math.PI * 2;
    const angle = baseAngle + _currentRotation;

    char.container.position.x = Math.sin(angle) * CIRCLE_RADIUS;
    char.container.position.z = Math.cos(angle) * CIRCLE_RADIUS;
    char.container.rotation.y = -angle;

    // Update animation
    if (char.mixer) {
      char.mixer.update(delta);
    }

    // Scale front character slightly larger
    const distFromFront = Math.abs(Math.sin(angle));
    const scale = 1.0 + (1.0 - distFromFront) * 0.2;
    char.container.scale.setScalar(scale);
  });

  // Render
  _renderer.render(_scene, _camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  if (!_camera || !_renderer) return;

  _camera.aspect = window.innerWidth / window.innerHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, window.innerHeight);
});
