import * as THREE from 'three';

// ── Private Module State ──────────────────────────────────────────────

let _scene = null;
let _renderer = null;
let _mapCamera = null;
let _mapRenderTarget = null;
let _zoomLevel = 1.0;
let _rotationMode = 'camera'; // 'camera' | 'north'
let _isInitialized = false;

// ── Constants ──────────────────────────────────────────────────────────

const RENDER_TARGET_SIZE = 720; // 720×720 (2x for 360px display)
const BASE_WORLD_RADIUS = 200; // meters
const CAMERA_HEIGHT = 1000; // y position
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

// ── Public API ────────────────────────────────────────────────────────

/**
 * Initialize the live map rendering system
 * @param {THREE.Scene} scene - The main game scene to render
 * @param {THREE.WebGLRenderer} renderer - The main WebGL renderer
 * @returns {boolean} Success status
 */
export function initLiveMap(scene, renderer) {
  if (!scene || !renderer) {
    console.error('[liveMap] Invalid scene or renderer');
    return false;
  }

  if (_isInitialized) {
    console.warn('[liveMap] Already initialized');
    return true;
  }

  _scene = scene;
  _renderer = renderer;

  // Create orthographic camera for top-down view
  // Z-up orientation (Three.js default is Y-up, so we rotate the camera)
  const worldRadius = BASE_WORLD_RADIUS;
  _mapCamera = new THREE.OrthographicCamera(
    -worldRadius, worldRadius,  // left, right
    worldRadius, -worldRadius,  // top, bottom
    0.1, 2000                    // near, far
  );

  _mapCamera.position.set(0, CAMERA_HEIGHT, 0);
  _mapCamera.lookAt(0, 0, 0);
  _mapCamera.up.set(0, 0, -1); // Z-up for top-down view

  // Create WebGLRenderTarget for render-to-texture
  try {
    _mapRenderTarget = new THREE.WebGLRenderTarget(
      RENDER_TARGET_SIZE,
      RENDER_TARGET_SIZE,
      {
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        stencilBuffer: false,
        depthBuffer: true
      }
    );
  } catch (err) {
    console.error('[liveMap] Failed to create WebGLRenderTarget:', err);
    return false;
  }

  _isInitialized = true;
  console.log('[liveMap] Initialized successfully');
  console.log(`[liveMap] - Render target: ${RENDER_TARGET_SIZE}×${RENDER_TARGET_SIZE}`);
  console.log(`[liveMap] - World radius: ${BASE_WORLD_RADIUS}m`);
  console.log(`[liveMap] - Camera height: ${CAMERA_HEIGHT}m`);

  return true;
}

/**
 * Update and render the live map
 * @param {Object} playerPos - Player position {x, z}
 * @param {number} playerRotY - Player rotation (radians, Y-axis)
 * @param {Array} remotePlayers - Array of remote player data
 * @param {number} cameraYaw - Camera yaw angle (radians)
 */
export function updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw) {
  if (!_isInitialized || !playerPos || !_mapCamera || !_mapRenderTarget) {
    if (!_isInitialized) {
      console.warn('[liveMap] updateLiveMap called before initialization');
    }
    return;
  }

  // Position camera above player
  _mapCamera.position.set(playerPos.x, CAMERA_HEIGHT, playerPos.z);
  _mapCamera.lookAt(playerPos.x, 0, playerPos.z);

  // Apply rotation mode
  if (_rotationMode === 'camera') {
    // Rotate map to match camera direction (camera-relative)
    _mapCamera.rotation.z = -cameraYaw;
  } else {
    // North always up (world-relative)
    _mapCamera.rotation.z = 0;
  }

  // Update frustum for zoom level
  const worldRadius = BASE_WORLD_RADIUS * _zoomLevel;
  _mapCamera.left = -worldRadius;
  _mapCamera.right = worldRadius;
  _mapCamera.top = worldRadius;
  _mapCamera.bottom = -worldRadius;
  _mapCamera.updateProjectionMatrix();

  // Render scene to texture
  const originalRenderTarget = _renderer.getRenderTarget();
  _renderer.setRenderTarget(_mapRenderTarget);
  _renderer.render(_scene, _mapCamera);
  _renderer.setRenderTarget(originalRenderTarget);
}

/**
 * Set the map zoom level
 * @param {number} zoomLevel - Zoom level (0.5 to 2.0)
 */
export function setMapZoom(zoomLevel) {
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel));
  if (clampedZoom !== _zoomLevel) {
    _zoomLevel = clampedZoom;
    console.log(`[liveMap] Zoom set to ${_zoomLevel.toFixed(2)}x`);
  }
}

/**
 * Set the map rotation mode
 * @param {string} mode - 'camera' (rotate with camera) or 'north' (north always up)
 */
export function setMapRotationMode(mode) {
  if (mode === 'camera' || mode === 'north') {
    if (mode !== _rotationMode) {
      _rotationMode = mode;
      console.log(`[liveMap] Rotation mode set to '${_rotationMode}'`);
    }
  } else {
    console.warn(`[liveMap] Invalid rotation mode: '${mode}'. Use 'camera' or 'north'.`);
  }
}

/**
 * Get the current map rotation mode
 * @returns {string} 'camera' | 'north'
 */
export function getMapRotationMode() {
  return _rotationMode;
}

/**
 * Get the render target texture (for Task 2 canvas display)
 * @returns {THREE.WebGLRenderTarget|null}
 */
export function getMapRenderTarget() {
  return _mapRenderTarget;
}

/**
 * Clean up resources
 */
export function disposeLiveMap() {
  if (_mapRenderTarget) {
    _mapRenderTarget.dispose();
    _mapRenderTarget = null;
  }

  _mapCamera = null;
  _scene = null;
  _renderer = null;
  _isInitialized = false;

  console.log('[liveMap] Disposed');
}
