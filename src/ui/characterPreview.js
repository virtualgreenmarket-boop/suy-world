import * as THREE from 'three';
import {
  preloadCharacter,
  spawnCharacter,
  equipItem,
  setAnimState,
  updateCharacterMixer,
} from '../player/characterLoader.js';

let _renderer = null;
let _scene    = null;
let _camera   = null;
let _group    = null;
let _clock    = new THREE.Clock(false);
let _raf      = null;
let _ready    = false;
let _initing  = false;

export async function initCharacterPreview(canvas) {
  if (_renderer || _initing) return;
  _initing = true;

  const cssW = canvas.offsetWidth  || 110;
  const cssH = canvas.offsetHeight || 190;
  const pr   = Math.min(window.devicePixelRatio, 2);

  canvas.width  = Math.round(cssW * pr);
  canvas.height = Math.round(cssH * pr);

  _renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  _renderer.setSize(canvas.width, canvas.height, false);
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
  _renderer.shadowMap.enabled = false;

  _scene = new THREE.Scene();
  _scene.background = new THREE.Color(0x0d0b1c);

  _camera = new THREE.PerspectiveCamera(42, cssW / cssH, 0.1, 20);
  _camera.position.set(0, 1.05, 3.1);
  _camera.lookAt(0, 0.9, 0);

  _scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const key = new THREE.DirectionalLight(0xfff4d6, 2.0);
  key.position.set(1.5, 3, 2.5);
  _scene.add(key);

  const rim = new THREE.DirectionalLight(0xaac8ff, 0.55);
  rim.position.set(-2, 1.5, -2);
  _scene.add(rim);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.03, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a1640, roughness: 0.9, metalness: 0.1 })
  );
  disc.position.y = -0.015;
  _scene.add(disc);

  _group = new THREE.Group();
  _scene.add(_group);

  try {
    await preloadCharacter();
    await spawnCharacter(_group);
    setAnimState(_group, 'idle', true);
    _ready = true;
  } catch (err) {
    console.warn('[preview] spawn failed:', err?.message ?? err);
  }
  _initing = false;
}

export async function applyPreviewItem(cat, file) {
  if (!_ready) return;
  try { await equipItem(_group, cat, file); } catch {}
}

export async function applyPreviewLoadout(loadout) {
  if (!_ready) return;
  for (const [cat, file] of Object.entries(loadout)) {
    if (file) await applyPreviewItem(cat, file);
  }
}

export function startPreviewRendering() {
  if (_raf) return;
  _clock.start();
  const tick = () => {
    _raf = requestAnimationFrame(tick);
    if (!_renderer || !_ready) return;
    const delta = Math.min(_clock.getDelta(), 0.05);
    updateCharacterMixer(_group, delta);
    _group.rotation.y += delta * 0.45;
    _renderer.render(_scene, _camera);
  };
  tick();
}

export function stopPreviewRendering() {
  if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  _clock.stop();
}
