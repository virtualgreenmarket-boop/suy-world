import * as THREE from 'three';

// ── Private Module State ──────────────────────────────────────────────

let _scene = null;
let _renderer = null;
let _mapCamera = null;
let _mapRenderTarget = null;
let _canvas = null;
let _ctx = null;
let _cameraYaw = 0;
let _zoomLevel = 1.0;
let _rotationMode = 'camera'; // 'camera' | 'north'
let _isInitialized = false;
let _pinnedLocation = null; // {x, z} world coordinates
let _mapOverheadLight = null; // Overhead light for minimap rendering

// Performance monitoring
let _frameCount = 0;
let _totalRenderTime = 0;

// Reusable temp canvas for render-target copy (avoids per-frame allocation)
let _tempCanvas = null;
let _tempCtx = null;

// ── Constants ──────────────────────────────────────────────────────────

const RENDER_TARGET_SIZE = 720; // 720×720 (2x for 360px display)
const BASE_WORLD_RADIUS = 200; // meters
const CAMERA_HEIGHT = 1000; // y position
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const MAX_VISIBLE_PLAYERS = 50;

// ── Helper Functions ──────────────────────────────────────────────────

/**
 * Rotate a point around origin
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @param {number} angle - Rotation angle in radians
 * @returns {Object} Rotated point {x, z}
 */
function _rotatePoint(x, z, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - z * sin,
    z: x * sin + z * cos
  };
}

/**
 * Convert world coordinates to screen coordinates
 * @param {number} worldX - World X position
 * @param {number} worldZ - World Z position
 * @param {Object} playerPos - Player position {x, z}
 * @param {number} worldRadius - Current world radius based on zoom
 * @returns {Object} Screen coordinates {x, y}
 */
function _worldToScreen(worldX, worldZ, playerPos, worldRadius) {
  const centerX = _canvas.width / 2;
  const centerY = _canvas.height / 2;

  let relX = worldX - playerPos.x;
  let relZ = worldZ - playerPos.z;

  // Apply rotation if in camera mode
  if (_rotationMode === 'camera') {
    const rotated = _rotatePoint(relX, relZ, _cameraYaw);
    relX = rotated.x;
    relZ = rotated.z;
  }

  const screenX = centerX + (relX / worldRadius) * centerX;
  const screenY = centerY + (relZ / worldRadius) * centerY;

  return { x: screenX, y: screenY };
}

/**
 * Get consistent color for a player ID using hash-based palette selection
 * @param {string} playerId - Player identifier
 * @returns {string} Hex color
 */
function _getPlayerColor(playerId) {
  // Soft, natural colors that blend with tropical theme
  const colors = [
    '#E57373', // Soft coral
    '#FFD54F', // Warm sand
    '#81C784', // Soft palm green
    '#64B5F6', // Ocean blue
    '#BA68C8', // Soft purple (tropical flower)
    '#FFB74D', // Sunset orange
    '#4DD0E1', // Lagoon cyan
    '#F06292'  // Hibiscus pink
  ];
  const hash = playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Copy WebGLRenderTarget texture to canvas with Y-flip
 */
function _copyRenderTargetToCanvas() {
  const size = _canvas.width;

  // Read pixels from render target
  const buffer = new Uint8Array(size * size * 4);
  _renderer.readRenderTargetPixels(_mapRenderTarget, 0, 0, size, size, buffer);

  // Create ImageData and put on canvas
  const imageData = new ImageData(new Uint8ClampedArray(buffer), size, size);

  // Flip Y (WebGL to Canvas coordinate system) — temp canvas is reused across frames
  if (!_tempCanvas || _tempCanvas.width !== size) {
    _tempCanvas = document.createElement('canvas');
    _tempCanvas.width = size;
    _tempCanvas.height = size;
    _tempCtx = _tempCanvas.getContext('2d');
  }
  _tempCtx.putImageData(imageData, 0, 0);

  _ctx.save();
  _ctx.translate(0, size);
  _ctx.scale(1, -1);
  _ctx.drawImage(_tempCanvas, 0, 0);
  _ctx.restore();
}

/**
 * Draw pin marker on the canvas
 * @param {Object} playerPos - Player position {x, z}
 * @param {number} worldRadius - Current world radius based on zoom
 */
function _drawPin(playerPos, worldRadius) {
  if (!_pinnedLocation) return;

  const scale = 2;
  const screen = _worldToScreen(_pinnedLocation.x, _pinnedLocation.z, playerPos, worldRadius);
  const centerX = _canvas.width / 2;
  const centerY = _canvas.height / 2;

  // Check if pin is visible
  const dist = Math.hypot(screen.x - centerX, screen.y - centerY);
  if (dist > centerX) return;

  // Draw red pin (island red)
  _ctx.fillStyle = '#E8564A';
  _ctx.strokeStyle = '#ffffff';
  _ctx.lineWidth = 2 * scale;

  _ctx.beginPath();
  _ctx.arc(screen.x, screen.y, 8 * scale, 0, Math.PI * 2);
  _ctx.fill();
  _ctx.stroke();

  // White center
  _ctx.fillStyle = '#ffffff';
  _ctx.beginPath();
  _ctx.arc(screen.x, screen.y, 3 * scale, 0, Math.PI * 2);
  _ctx.fill();
}

/**
 * Draw player markers on the canvas
 * @param {Object} playerPos - Player position {x, z}
 * @param {number} playerRotY - Player rotation in radians
 * @param {Array} remotePlayers - Array of remote player data [{id, x, z}, ...]
 * @param {Array} npcs - Array of NPC data [{x, z, name}, ...]
 */
function _drawPlayerMarkers(playerPos, playerRotY, remotePlayers, npcs = []) {
  const scale = 2;
  const centerX = _canvas.width / 2;
  const centerY = _canvas.height / 2;
  const worldRadius = BASE_WORLD_RADIUS * _zoomLevel;

  // Player marker culling: limit to 50 closest players
  let playersToRender = remotePlayers;
  if (remotePlayers.length > MAX_VISIBLE_PLAYERS) {
    playersToRender = remotePlayers
      .map(p => ({
        ...p,
        dist: Math.hypot(p.x - playerPos.x, p.z - playerPos.z)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, MAX_VISIBLE_PLAYERS);
  }

  // NPCs — leaf green (island language). npc.static === true → diamond (standing), else dot (wandering)
  for (const npc of npcs) {
    const screen = _worldToScreen(npc.x, npc.z, playerPos, worldRadius);

    // Clip to circle
    const dist = Math.hypot(screen.x - centerX, screen.y - centerY);
    if (dist > centerX) continue;

    // Soft glow background (subtle, leaf-toned)
    _ctx.beginPath();
    _ctx.arc(screen.x, screen.y, 7 * scale, 0, Math.PI * 2);
    const gradient = _ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, 7 * scale);
    gradient.addColorStop(0, 'rgba(122, 203, 94, 0.25)');
    gradient.addColorStop(1, 'rgba(122, 203, 94, 0)');
    _ctx.fillStyle = gradient;
    _ctx.fill();

    _ctx.fillStyle = '#7ACB5E';
    _ctx.strokeStyle = 'rgba(244, 231, 195, 0.7)'; // sand border
    _ctx.lineWidth = 1.2 * scale;

    if (npc.static) {
      // Standing NPC — diamond
      const r = 4.5 * scale;
      _ctx.save();
      _ctx.translate(screen.x, screen.y);
      _ctx.rotate(Math.PI / 4);
      _ctx.beginPath();
      _ctx.rect(-r * 0.78, -r * 0.78, r * 1.56, r * 1.56);
      _ctx.fill();
      _ctx.stroke();
      _ctx.restore();
    } else {
      // Wandering NPC — dot
      _ctx.beginPath();
      _ctx.arc(screen.x, screen.y, 4.5 * scale, 0, Math.PI * 2);
      _ctx.fill();
      _ctx.stroke();
    }
  }

  // Local player — coral direction arrow with white outline (island language)
  let arrowAngle = playerRotY;
  if (_rotationMode === 'camera') {
    arrowAngle -= _cameraYaw;
  }
  const aSize = 9 * scale;
  _ctx.save();
  _ctx.translate(centerX, centerY);
  _ctx.rotate(arrowAngle);
  _ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  _ctx.shadowBlur = 4 * scale;
  _ctx.fillStyle = '#FF6B4A';
  _ctx.strokeStyle = '#ffffff';
  _ctx.lineWidth = 1.6 * scale;
  _ctx.beginPath();
  _ctx.moveTo(0, -aSize * 1.35);          // tip (forward)
  _ctx.lineTo(aSize * 0.9, aSize);         // right base
  _ctx.lineTo(0, aSize * 0.45);            // notch
  _ctx.lineTo(-aSize * 0.9, aSize);        // left base
  _ctx.closePath();
  _ctx.fill();
  _ctx.stroke();
  _ctx.restore();

  // Remote players
  for (const player of playersToRender) {
    const screen = _worldToScreen(player.x, player.z, playerPos, worldRadius);

    // Clip to circle
    const dist = Math.hypot(screen.x - centerX, screen.y - centerY);
    if (dist > centerX) continue;

    _ctx.beginPath();
    _ctx.arc(screen.x, screen.y, 6 * scale, 0, Math.PI * 2);
    _ctx.fillStyle = _getPlayerColor(player.id);
    _ctx.fill();
    _ctx.strokeStyle = '#ffffff';
    _ctx.lineWidth = 1.5 * scale;
    _ctx.stroke();
  }
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Load pinned location from localStorage
 */
function _loadPinnedLocation() {
  const saved = localStorage.getItem('liveMapPin');
  if (saved) {
    const [x, z] = saved.split(',').map(parseFloat);
    if (!isNaN(x) && !isNaN(z)) {
      _pinnedLocation = { x, z };
      console.log(`[liveMap] Loaded pin from localStorage: (${x.toFixed(1)}, ${z.toFixed(1)})`);
    }
  }
}

/**
 * Initialize the live map rendering system
 * @param {THREE.Scene} scene - The main game scene to render
 * @param {THREE.WebGLRenderer} renderer - The main WebGL renderer
 * @returns {HTMLCanvasElement|null} The created canvas element, or null on failure
 */
export function initLiveMap(scene, renderer) {
  if (!scene || !renderer) {
    console.error('[liveMap] Invalid scene or renderer');
    return null;
  }

  if (_isInitialized) {
    console.warn('[liveMap] Already initialized');
    return _canvas;
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

  // Create overhead directional light for minimap rendering
  // This ensures objects are visible from above (main lights are angled for ground view)
  _mapOverheadLight = new THREE.DirectionalLight(0xffffff, 2.5);
  _mapOverheadLight.position.set(0, CAMERA_HEIGHT - 100, 0); // Directly above
  _mapOverheadLight.layers.enableAll(); // See all layers
  _mapOverheadLight.visible = false; // Only enabled during minimap render
  scene.add(_mapOverheadLight);

  // Load pinned location from localStorage
  _loadPinnedLocation();

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
    return null;
  }

  // Create canvas for display
  _canvas = document.createElement('canvas');
  _canvas.id = 'live-map-canvas';
  _canvas.width = 720;
  _canvas.height = 720;
  // Sized by the UI container (ring adds padding); inline px here would override the stylesheet
  _canvas.style.width = '100%';
  _canvas.style.height = '100%';
  _ctx = _canvas.getContext('2d');

  _isInitialized = true;
  console.log('[liveMap] Initialized successfully');
  console.log(`[liveMap] - Render target: ${RENDER_TARGET_SIZE}×${RENDER_TARGET_SIZE}`);
  console.log(`[liveMap] - Canvas created: 720×720`);
  console.log(`[liveMap] - World radius: ${BASE_WORLD_RADIUS}m`);
  console.log(`[liveMap] - Camera height: ${CAMERA_HEIGHT}m`);

  return _canvas;
}

/**
 * Update and render the live map
 * @param {Object} playerPos - Player position {x, z}
 * @param {number} playerRotY - Player rotation (radians, Y-axis)
 * @param {Array} remotePlayers - Array of remote player data
 * @param {number} cameraYaw - Camera yaw angle (radians)
 * @param {Array} npcs - Array of NPC data [{x, z, name}, ...]
 */
// STEP 1: Internal throttle timer for safety net (100ms)
let _lastRenderTime = 0;

export function updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw, npcs = []) {
  if (!_isInitialized || !playerPos || !_mapCamera || !_mapRenderTarget) {
    if (!_isInitialized) {
      console.warn('[liveMap] updateLiveMap called before initialization');
    }
    return;
  }

  // Safety net: self-throttle expensive render to 100ms regardless of caller
  const now = performance.now();
  const shouldRender = (now - _lastRenderTime) >= 100;

  const startTime = performance.now();

  // Store camera yaw for coordinate conversions
  _cameraYaw = cameraYaw;

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

  // Render scene to texture with optimizations for overhead view
  const originalRenderTarget = _renderer.getRenderTarget();
  const originalFog = _scene.fog;

  // Temporarily disable fog for minimap (prevents objects from being hidden at distance)
  _scene.fog = null;

  // Enable overhead light for better visibility from above
  if (_mapOverheadLight) {
    _mapOverheadLight.visible = true;
    _mapOverheadLight.position.set(playerPos.x, CAMERA_HEIGHT - 100, playerPos.z);
  }

  // STEP 1: Only render if throttle timer elapsed
  if (shouldRender) {
    try {
      _renderer.setRenderTarget(_mapRenderTarget);
      _renderer.render(_scene, _mapCamera);
      _renderer.setRenderTarget(originalRenderTarget);
      _lastRenderTime = now;
    } catch (err) {
      console.error('[liveMap] Render error:', err);
      _renderer.setRenderTarget(originalRenderTarget);
    }
  }

  // Restore original state
  _scene.fog = originalFog;
  if (_mapOverheadLight) {
    _mapOverheadLight.visible = false;
  }

  // Clear canvas
  _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

  // Apply circular clip
  _ctx.save();
  _ctx.beginPath();
  _ctx.arc(_canvas.width / 2, _canvas.height / 2, _canvas.width / 2, 0, Math.PI * 2);
  _ctx.clip();

  // Copy render target to canvas
  _copyRenderTargetToCanvas();

  // Draw player markers and NPCs
  _drawPlayerMarkers(playerPos, playerRotY, remotePlayers || [], npcs);

  // Draw pin
  _drawPin(playerPos, worldRadius);

  _ctx.restore();

  // Performance monitoring
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  _totalRenderTime += renderTime;
  _frameCount++;

  if (_frameCount % 60 === 0) {
    const avgTime = _totalRenderTime / 60;
    if (avgTime > 4) {
      console.warn(`[liveMap] Performance: avg ${avgTime.toFixed(2)}ms per frame (target: <4ms)`);
    }
    _totalRenderTime = 0;
  }
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
 * Get the current camera yaw (radians) — used by the UI north-compass
 * @returns {number}
 */
export function getCameraYaw() {
  return _cameraYaw;
}

/**
 * Get the render target texture (for debugging/testing)
 * @returns {THREE.WebGLRenderTarget|null}
 */
export function getMapRenderTarget() {
  return _mapRenderTarget;
}

/**
 * Get the canvas element (for UI integration)
 * @returns {HTMLCanvasElement|null}
 */
export function getMapCanvas() {
  return _canvas;
}

/**
 * Set a pin marker on the map
 * @param {number} worldX - World X coordinate
 * @param {number} worldZ - World Z coordinate
 */
export function setMapPin(worldX, worldZ) {
  _pinnedLocation = { x: worldX, z: worldZ };
  localStorage.setItem('liveMapPin', `${worldX},${worldZ}`);
  console.log(`[liveMap] Pin set at (${worldX.toFixed(1)}, ${worldZ.toFixed(1)})`);
}

/**
 * Clear the pin marker
 */
export function clearMapPin() {
  _pinnedLocation = null;
  localStorage.removeItem('liveMapPin');
  console.log('[liveMap] Pin cleared');
}

/**
 * Get the current pin location
 * @returns {{x: number, z: number}|null}
 */
export function getMapPin() {
  return _pinnedLocation;
}

/**
 * Clean up resources
 */
export function disposeLiveMap() {
  if (_mapRenderTarget) {
    _mapRenderTarget.dispose();
    _mapRenderTarget = null;
  }

  if (_canvas && _canvas.parentNode) {
    _canvas.parentNode.removeChild(_canvas);
  }
  _canvas = null;
  _ctx = null;

  // Remove overhead light from scene
  if (_mapOverheadLight && _scene) {
    _scene.remove(_mapOverheadLight);
    _mapOverheadLight = null;
  }

  _mapCamera = null;
  _scene = null;
  _renderer = null;
  _isInitialized = false;

  console.log('[liveMap] Disposed');
}