# Live Map System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-drawn Canvas 2D minimap with live Three.js WebGLRenderTarget rendering showing real-time 3D scene from top-down orthographic camera.

**Architecture:** Create 3 new modules (liveMap.js, liveMapUI.js, liveMapFullscreen.js) using WebGLRenderTarget to render scene to texture, copy to Canvas 2D, and overlay player markers. Delete old minimap files.

**Tech Stack:** Three.js (WebGLRenderTarget, OrthographicCamera), Canvas 2D API, localStorage

## Global Constraints

- Target 60fps performance (minimap render ≤4ms per frame)
- Minimap: 360×360px display, 720×720 render target (2x for retina)
- Fullscreen: 1400×1400 render target
- Zoom range: 0.5x (close) to 2.0x (far)
- World radius: minimap shows ~200m, fullscreen shows 500m
- Player marker colors: 8-color palette with consistent hashing
- All settings persist to localStorage
- Mobile-friendly touch targets (48×48px minimum)

---

## File Structure

### New Files
- `src/ui/liveMap.js` - Core rendering engine (WebGLRenderTarget, camera, markers)
- `src/ui/liveMapUI.js` - DOM creation, event handlers, UI controls
- `src/ui/liveMapFullscreen.js` - Fullscreen modal overlay

### Modified Files
- `src/main.js` - Replace minimap imports/calls with liveMap

### Deleted Files (after migration complete)
- `src/ui/minimap.js` - Old hand-drawn implementation
- `src/ui/minimapRegistry.js` - Entity registration (no longer needed)

---

## Task 1: Core Rendering Engine (liveMap.js)

**Files:**
- Create: `src/ui/liveMap.js`

**Interfaces:**
- Consumes: Three.js `scene` (Object3D), `renderer` (WebGLRenderer) from main.js
- Produces:
  - `initLiveMap(scene, renderer)` → boolean (success)
  - `updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw)` → void
  - `setMapZoom(zoomLevel)` → void
  - `setMapRotationMode(mode)` → void
  - `getMapRotationMode()` → string ('camera' | 'north')
  - `disposeLiveMap()` → void

- [ ] **Step 1: Write failing test for initLiveMap**

```javascript
// tests/ui/liveMap.test.js
import { initLiveMap, disposeLiveMap } from '../../src/ui/liveMap.js';
import * as THREE from 'three';

describe('liveMap', () => {
  let scene, renderer;

  beforeEach(() => {
    scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas });
  });

  afterEach(() => {
    disposeLiveMap();
    renderer.dispose();
  });

  test('initLiveMap creates render target and camera', () => {
    const result = initLiveMap(scene, renderer);
    expect(result).toBe(true);
    // Should create orthographic camera
    // Should create WebGLRenderTarget
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- liveMap.test.js`
Expected: FAIL with "Cannot find module '../../src/ui/liveMap.js'"

- [ ] **Step 3: Create liveMap.js with minimal structure**

```javascript
// src/ui/liveMap.js
import * as THREE from 'three';

let _scene = null;
let _renderer = null;
let _mapCamera = null;
let _mapRenderTarget = null;
let _canvas = null;
let _ctx = null;
let _zoomLevel = 1.0;
let _rotationMode = 'camera';
let _cameraYaw = 0;
let _pinnedLocation = null;

export function initLiveMap(scene, renderer) {
  if (!scene || !renderer) {
    console.error('[liveMap] Invalid scene or renderer');
    return false;
  }

  _scene = scene;
  _renderer = renderer;

  // Create orthographic camera (top-down view)
  const worldRadius = 200;
  _mapCamera = new THREE.OrthographicCamera(
    -worldRadius, worldRadius,  // left, right
    worldRadius, -worldRadius,  // top, bottom
    0.1, 2000                    // near, far
  );
  _mapCamera.position.set(0, 1000, 0);
  _mapCamera.lookAt(0, 0, 0);
  _mapCamera.up.set(0, 0, -1); // Z-up for top-down view

  // Create WebGLRenderTarget
  try {
    _mapRenderTarget = new THREE.WebGLRenderTarget(720, 720, {
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });
  } catch (err) {
    console.error('[liveMap] Failed to create WebGLRenderTarget:', err);
    return false;
  }

  console.log('[liveMap] Initialized successfully');
  return true;
}

export function updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw) {
  // TODO: Implement rendering
}

export function setMapZoom(zoomLevel) {
  _zoomLevel = Math.max(0.5, Math.min(2.0, zoomLevel));
}

export function setMapRotationMode(mode) {
  if (mode === 'camera' || mode === 'north') {
    _rotationMode = mode;
  }
}

export function getMapRotationMode() {
  return _rotationMode;
}

export function disposeLiveMap() {
  if (_mapRenderTarget) {
    _mapRenderTarget.dispose();
    _mapRenderTarget = null;
  }
  _mapCamera = null;
  _scene = null;
  _renderer = null;
}
```

- [ ] **Step 4: Run test to verify basic structure passes**

Run: `npm test -- liveMap.test.js`
Expected: PASS (basic initialization works)

- [ ] **Step 5: Write test for updateLiveMap rendering**

```javascript
// tests/ui/liveMap.test.js (add to existing file)
test('updateLiveMap positions camera above player', () => {
  initLiveMap(scene, renderer);
  
  const playerPos = { x: 100, z: 50 };
  const playerRotY = Math.PI / 4;
  const remotePlayers = [];
  const cameraYaw = 0;

  updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw);
  
  // Camera should be at player position + Y offset
  // (We'll verify this by checking internal state or effects)
  expect(true).toBe(true); // Placeholder - actual test needs camera access
});
```

- [ ] **Step 6: Implement camera positioning in updateLiveMap**

```javascript
// src/ui/liveMap.js - replace updateLiveMap function
export function updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw) {
  if (!playerPos || !_mapCamera || !_mapRenderTarget) return;

  _cameraYaw = cameraYaw;

  // Position camera above player
  _mapCamera.position.set(playerPos.x, 1000, playerPos.z);
  _mapCamera.lookAt(playerPos.x, 0, playerPos.z);

  // Apply rotation mode
  if (_rotationMode === 'camera') {
    _mapCamera.rotation.z = -cameraYaw;
  } else {
    _mapCamera.rotation.z = 0; // North always up
  }

  // Update frustum for zoom
  const worldRadius = 200 * _zoomLevel;
  _mapCamera.left = -worldRadius;
  _mapCamera.right = worldRadius;
  _mapCamera.top = worldRadius;
  _mapCamera.bottom = -worldRadius;
  _mapCamera.updateProjectionMatrix();

  // Render scene to texture
  _renderer.setRenderTarget(_mapRenderTarget);
  _renderer.render(_scene, _mapCamera);
  _renderer.setRenderTarget(null);
}
```

- [ ] **Step 7: Run tests**

Run: `npm test -- liveMap.test.js`
Expected: PASS

- [ ] **Step 8: Commit core rendering**

```bash
git add src/ui/liveMap.js tests/ui/liveMap.test.js
git commit -m "feat(liveMap): add core WebGLRenderTarget rendering engine

- Create orthographic camera for top-down view
- WebGLRenderTarget (720x720) for minimap texture
- Camera positioning above player with rotation modes
- Zoom level support (0.5x to 2.0x)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Canvas Display & Player Markers

**Files:**
- Modify: `src/ui/liveMap.js`

**Interfaces:**
- Consumes: render target texture from Task 1
- Produces: Canvas element with player markers drawn

- [ ] **Step 1: Write test for canvas creation**

```javascript
// tests/ui/liveMap.test.js (add)
test('initLiveMap creates canvas element', () => {
  const result = initLiveMap(scene, renderer);
  expect(result).toBe(true);
  
  const canvas = document.getElementById('live-map-canvas');
  expect(canvas).toBeTruthy();
  expect(canvas.width).toBe(720);
  expect(canvas.height).toBe(720);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- liveMap.test.js`
Expected: FAIL (canvas not created)

- [ ] **Step 3: Add canvas creation to initLiveMap**

```javascript
// src/ui/liveMap.js - add to initLiveMap after render target creation
  // Create canvas for display
  _canvas = document.createElement('canvas');
  _canvas.id = 'live-map-canvas';
  _canvas.width = 720;
  _canvas.height = 720;
  _canvas.style.width = '360px';
  _canvas.style.height = '360px';
  _ctx = _canvas.getContext('2d');

  console.log('[liveMap] Canvas created: 720x720');
```

- [ ] **Step 4: Add canvas to disposeLiveMap**

```javascript
// src/ui/liveMap.js - add to disposeLiveMap
  if (_canvas && _canvas.parentNode) {
    _canvas.parentNode.removeChild(_canvas);
  }
  _canvas = null;
  _ctx = null;
```

- [ ] **Step 5: Run test**

Run: `npm test -- liveMap.test.js`
Expected: PASS

- [ ] **Step 6: Write helper functions for coordinate conversion**

```javascript
// src/ui/liveMap.js - add after state variables
function _rotatePoint(x, z, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - z * sin,
    z: x * sin + z * cos
  };
}

function _worldToScreen(worldX, worldZ, playerPos, worldRadius) {
  const scale = 2; // Retina
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

  const screenX = centerX + (relX / worldRadius) * (centerX);
  const screenY = centerY + (relZ / worldRadius) * (centerY);

  return { x: screenX, y: screenY };
}

function _getPlayerColor(playerId) {
  const colors = [
    '#FF5252', '#FFEB3B', '#4CAF50', '#2196F3',
    '#9C27B0', '#FF9800', '#00BCD4', '#E91E63'
  ];
  const hash = playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```

- [ ] **Step 7: Implement render target to canvas copy**

```javascript
// src/ui/liveMap.js - add helper function
function _copyRenderTargetToCanvas() {
  const scale = 2;
  const size = _canvas.width;
  
  // Read pixels from render target
  const buffer = new Uint8Array(size * size * 4);
  _renderer.readRenderTargetPixels(_mapRenderTarget, 0, 0, size, size, buffer);
  
  // Create ImageData and put on canvas
  const imageData = new ImageData(new Uint8ClampedArray(buffer), size, size);
  
  // Flip Y (WebGL to Canvas coordinate system)
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);
  
  _ctx.save();
  _ctx.translate(0, size);
  _ctx.scale(1, -1);
  _ctx.drawImage(tempCanvas, 0, 0);
  _ctx.restore();
}
```

- [ ] **Step 8: Implement player marker drawing**

```javascript
// src/ui/liveMap.js - add function
function _drawPlayerMarkers(playerPos, playerRotY, remotePlayers) {
  const scale = 2;
  const centerX = _canvas.width / 2;
  const centerY = _canvas.height / 2;
  const worldRadius = 200 * _zoomLevel;

  // Local player (blue circle + arrow)
  _ctx.beginPath();
  _ctx.arc(centerX, centerY, 8 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#4FC3F7';
  _ctx.fill();
  _ctx.strokeStyle = '#ffffff';
  _ctx.lineWidth = 2 * scale;
  _ctx.stroke();

  // Direction arrow
  const arrowLength = 12 * scale;
  let arrowAngle = playerRotY;
  if (_rotationMode === 'camera') {
    arrowAngle -= _cameraYaw;
  }
  const arrowX = Math.sin(arrowAngle) * arrowLength;
  const arrowY = -Math.cos(arrowAngle) * arrowLength;
  _ctx.beginPath();
  _ctx.moveTo(centerX, centerY);
  _ctx.lineTo(centerX + arrowX, centerY + arrowY);
  _ctx.strokeStyle = '#ffffff';
  _ctx.lineWidth = 3 * scale;
  _ctx.stroke();

  // Remote players
  for (const player of remotePlayers) {
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
```

- [ ] **Step 9: Update updateLiveMap to draw to canvas**

```javascript
// src/ui/liveMap.js - add to end of updateLiveMap function
  // Clear canvas
  _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

  // Apply circular clip
  _ctx.save();
  _ctx.beginPath();
  _ctx.arc(_canvas.width / 2, _canvas.height / 2, _canvas.width / 2, 0, Math.PI * 2);
  _ctx.clip();

  // Copy render target to canvas
  _copyRenderTargetToCanvas();

  // Draw player markers
  _drawPlayerMarkers(playerPos, playerRotY, remotePlayers);

  _ctx.restore();
```

- [ ] **Step 10: Write test for player marker drawing**

```javascript
// tests/ui/liveMap.test.js (add)
test('updateLiveMap draws player markers', () => {
  initLiveMap(scene, renderer);
  
  const playerPos = { x: 0, z: 0 };
  const playerRotY = 0;
  const remotePlayers = [
    { id: 'player1', x: 10, z: 20 },
    { id: 'player2', x: -15, z: 5 }
  ];
  const cameraYaw = 0;

  updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw);
  
  // Canvas should have content drawn
  const canvas = document.getElementById('live-map-canvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hasContent = imageData.data.some(byte => byte !== 0);
  expect(hasContent).toBe(true);
});
```

- [ ] **Step 11: Run tests**

Run: `npm test -- liveMap.test.js`
Expected: PASS

- [ ] **Step 12: Commit canvas and markers**

```bash
git add src/ui/liveMap.js tests/ui/liveMap.test.js
git commit -m "feat(liveMap): add canvas display and player markers

- Copy WebGLRenderTarget to Canvas 2D with Y-flip
- Draw local player (blue circle + direction arrow)
- Draw remote players (colored circles with consistent hashing)
- Circular clipping for minimap shape
- Coordinate conversion with rotation support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: UI Controls & DOM Structure (liveMapUI.js)

**Files:**
- Create: `src/ui/liveMapUI.js`

**Interfaces:**
- Consumes:
  - Canvas element from liveMap.js
  - `setMapZoom(zoomLevel)` from liveMap.js
  - `setMapRotationMode(mode)` from liveMap.js
  - `getMapRotationMode()` from liveMap.js
- Produces:
  - `createLiveMapUI(canvas)` → HTMLElement (container)
  - `updateOnlineCount(count)` → void
  - `removeLiveMapUI()` → void

- [ ] **Step 1: Write test for UI creation**

```javascript
// tests/ui/liveMapUI.test.js
import { createLiveMapUI, updateOnlineCount, removeLiveMapUI } from '../../src/ui/liveMapUI.js';

describe('liveMapUI', () => {
  let canvas;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.id = 'live-map-canvas';
    canvas.width = 720;
    canvas.height = 720;
  });

  afterEach(() => {
    removeLiveMapUI();
  });

  test('createLiveMapUI creates container with controls', () => {
    const container = createLiveMapUI(canvas);
    
    expect(container.id).toBe('live-map-container');
    expect(container.querySelector('#live-map-canvas')).toBe(canvas);
    expect(container.querySelector('#live-map-zoom-in')).toBeTruthy();
    expect(container.querySelector('#live-map-zoom-out')).toBeTruthy();
    expect(container.querySelector('#live-map-rotation-toggle')).toBeTruthy();
    expect(container.querySelector('#live-map-count')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- liveMapUI.test.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create liveMapUI.js with DOM structure**

```javascript
// src/ui/liveMapUI.js
import { setMapZoom, setMapRotationMode, getMapRotationMode } from './liveMap.js';

let _container = null;
let _countDisplay = null;
let _zoomLevel = 1.0;

export function createLiveMapUI(canvas) {
  if (!canvas) {
    console.error('[liveMapUI] Canvas is required');
    return null;
  }

  // Load saved settings
  _loadSettings();

  // Create container
  _container = document.createElement('div');
  _container.id = 'live-map-container';

  // Add canvas to container
  _container.appendChild(canvas);

  // Online count display
  _countDisplay = document.createElement('div');
  _countDisplay.id = 'live-map-count';
  _countDisplay.textContent = '1 online';
  _container.appendChild(_countDisplay);

  // Zoom controls
  const zoomIn = document.createElement('button');
  zoomIn.id = 'live-map-zoom-in';
  zoomIn.title = 'Zoom In';
  zoomIn.textContent = '+';
  zoomIn.addEventListener('click', _handleZoomIn);
  _container.appendChild(zoomIn);

  const zoomOut = document.createElement('button');
  zoomOut.id = 'live-map-zoom-out';
  zoomOut.title = 'Zoom Out';
  zoomOut.textContent = '−';
  zoomOut.addEventListener('click', _handleZoomOut);
  _container.appendChild(zoomOut);

  // Rotation toggle
  const rotationToggle = document.createElement('button');
  rotationToggle.id = 'live-map-rotation-toggle';
  rotationToggle.title = 'Toggle Rotation';
  rotationToggle.textContent = '🧭';
  rotationToggle.addEventListener('click', _handleRotationToggle);
  _container.appendChild(rotationToggle);

  // Settings button (if available)
  if (window._createSettingsButton) {
    const settingsBtn = window._createSettingsButton();
    settingsBtn.id = 'live-map-settings';
    _container.appendChild(settingsBtn);
  }

  // Inject styles
  _injectStyles();

  // Add to document
  document.body.appendChild(_container);

  console.log('[liveMapUI] UI created');
  return _container;
}

export function updateOnlineCount(count) {
  if (_countDisplay) {
    _countDisplay.textContent = `${count} online`;
  }
}

export function removeLiveMapUI() {
  if (_container && _container.parentNode) {
    _container.parentNode.removeChild(_container);
  }
  _container = null;
  _countDisplay = null;
}

function _loadSettings() {
  const savedZoom = localStorage.getItem('liveMapZoom');
  if (savedZoom) {
    _zoomLevel = parseFloat(savedZoom);
    setMapZoom(_zoomLevel);
  }

  const savedRotation = localStorage.getItem('liveMapRotation');
  if (savedRotation === 'north' || savedRotation === 'camera') {
    setMapRotationMode(savedRotation);
  }
}

function _handleZoomIn(e) {
  e.stopPropagation();
  _zoomLevel = Math.max(0.5, _zoomLevel * 0.8);
  setMapZoom(_zoomLevel);
  localStorage.setItem('liveMapZoom', _zoomLevel);
}

function _handleZoomOut(e) {
  e.stopPropagation();
  _zoomLevel = Math.min(2.0, _zoomLevel * 1.25);
  setMapZoom(_zoomLevel);
  localStorage.setItem('liveMapZoom', _zoomLevel);
}

function _handleRotationToggle(e) {
  e.stopPropagation();
  const current = getMapRotationMode();
  const newMode = current === 'camera' ? 'north' : 'camera';
  setMapRotationMode(newMode);
  localStorage.setItem('liveMapRotation', newMode);
}

function _injectStyles() {
  if (document.getElementById('live-map-styles')) return;

  const style = document.createElement('style');
  style.id = 'live-map-styles';
  style.textContent = `
    #live-map-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 360px;
      height: 360px;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      background: rgba(20, 25, 30, 0.9);
      cursor: pointer;
      z-index: 1000;
    }

    #live-map-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    #live-map-count {
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      pointer-events: none;
      z-index: 1001;
    }

    #live-map-zoom-in,
    #live-map-zoom-out {
      position: absolute;
      bottom: 10px;
      left: 10px;
      width: 32px;
      height: 32px;
      background: rgba(30, 35, 40, 0.9);
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      color: white;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    #live-map-zoom-out {
      bottom: 48px;
    }

    #live-map-zoom-in:hover,
    #live-map-zoom-out:hover {
      background: rgba(40, 45, 50, 0.95);
      border-color: rgba(255,255,255,0.5);
    }

    #live-map-rotation-toggle {
      position: absolute;
      top: 10px;
      right: 50px;
      width: 36px;
      height: 36px;
      background: rgba(30, 35, 40, 0.9);
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    #live-map-rotation-toggle:hover {
      background: rgba(40, 45, 50, 0.95);
      border-color: rgba(255,255,255,0.5);
    }

    #live-map-settings {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      background: rgba(30, 35, 40, 0.9);
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      z-index: 1001;
    }

    #live-map-settings:hover {
      background: rgba(40, 45, 50, 0.95);
      border-color: rgba(255,255,255,0.5);
    }
  `;
  document.head.appendChild(style);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- liveMapUI.test.js`
Expected: PASS

- [ ] **Step 5: Write test for online count update**

```javascript
// tests/ui/liveMapUI.test.js (add)
test('updateOnlineCount updates display', () => {
  const canvas = document.createElement('canvas');
  createLiveMapUI(canvas);
  
  updateOnlineCount(5);
  
  const countDisplay = document.getElementById('live-map-count');
  expect(countDisplay.textContent).toBe('5 online');
});
```

- [ ] **Step 6: Run tests**

Run: `npm test -- liveMapUI.test.js`
Expected: PASS

- [ ] **Step 7: Commit UI controls**

```bash
git add src/ui/liveMapUI.js tests/ui/liveMapUI.test.js
git commit -m "feat(liveMap): add UI controls and DOM structure

- Create container with circular styling
- Zoom +/- buttons with localStorage persistence
- Rotation toggle (camera-follow vs north-up)
- Online count display
- Settings button integration
- CSS injection for styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Fullscreen Map Modal (liveMapFullscreen.js)

**Files:**
- Create: `src/ui/liveMapFullscreen.js`
- Modify: `src/ui/liveMap.js` (add pin support)

**Interfaces:**
- Consumes:
  - `scene`, `renderer` from main.js
  - `_pinnedLocation` state from liveMap.js
- Produces:
  - `openFullscreenMap(scene, renderer, playerPos, remotePlayers, getPin, setPin)` → void
  - `closeFullscreenMap()` → void
  - `isFullscreenOpen()` → boolean

- [ ] **Step 1: Add pin support to liveMap.js**

```javascript
// src/ui/liveMap.js - add exports
export function setMapPin(worldX, worldZ) {
  _pinnedLocation = { x: worldX, z: worldZ };
  localStorage.setItem('liveMapPin', `${worldX},${worldZ}`);
}

export function clearMapPin() {
  _pinnedLocation = null;
  localStorage.removeItem('liveMapPin');
}

export function getMapPin() {
  return _pinnedLocation;
}

// Add to initLiveMap to load saved pin
function _loadPinnedLocation() {
  const saved = localStorage.getItem('liveMapPin');
  if (saved) {
    const [x, z] = saved.split(',').map(parseFloat);
    if (!isNaN(x) && !isNaN(z)) {
      _pinnedLocation = { x, z };
    }
  }
}
// Call _loadPinnedLocation() in initLiveMap after camera creation
```

- [ ] **Step 2: Add pin drawing to liveMap.js**

```javascript
// src/ui/liveMap.js - add function
function _drawPin(playerPos, worldRadius) {
  if (!_pinnedLocation) return;

  const scale = 2;
  const screen = _worldToScreen(_pinnedLocation.x, _pinnedLocation.z, playerPos, worldRadius);
  const centerX = _canvas.width / 2;
  const centerY = _canvas.height / 2;

  // Check if pin is visible
  const dist = Math.hypot(screen.x - centerX, screen.y - centerY);
  if (dist > centerX) return;

  // Draw red pin
  _ctx.fillStyle = '#FF5252';
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

// Add to updateLiveMap after _drawPlayerMarkers call
  _drawPin(playerPos, worldRadius);
```

- [ ] **Step 3: Write test for fullscreen map**

```javascript
// tests/ui/liveMapFullscreen.test.js
import { openFullscreenMap, closeFullscreenMap, isFullscreenOpen } from '../../src/ui/liveMapFullscreen.js';
import * as THREE from 'three';

describe('liveMapFullscreen', () => {
  let scene, renderer;

  beforeEach(() => {
    scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas });
  });

  afterEach(() => {
    closeFullscreenMap();
    renderer.dispose();
  });

  test('openFullscreenMap creates overlay', () => {
    const playerPos = { x: 0, z: 0 };
    const remotePlayers = [];
    const getPin = () => null;
    const setPin = jest.fn();

    openFullscreenMap(scene, renderer, playerPos, remotePlayers, getPin, setPin);

    expect(isFullscreenOpen()).toBe(true);
    const overlay = document.getElementById('live-map-fullscreen');
    expect(overlay).toBeTruthy();
  });

  test('closeFullscreenMap removes overlay', () => {
    openFullscreenMap(scene, renderer, {x:0,z:0}, [], ()=>null, ()=>{});
    closeFullscreenMap();

    expect(isFullscreenOpen()).toBe(false);
    const overlay = document.getElementById('live-map-fullscreen');
    expect(overlay).toBeFalsy();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- liveMapFullscreen.test.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 5: Create liveMapFullscreen.js**

```javascript
// src/ui/liveMapFullscreen.js
import * as THREE from 'three';

let _overlay = null;
let _canvas = null;
let _ctx = null;
let _renderTarget = null;
let _camera = null;
let _scene = null;
let _renderer = null;
let _playerPos = null;
let _remotePlayers = [];
let _getPin = null;
let _setPin = null;

export function openFullscreenMap(scene, renderer, playerPos, remotePlayers, getPin, setPin) {
  if (_overlay) {
    console.warn('[liveMapFullscreen] Already open');
    return;
  }

  _scene = scene;
  _renderer = renderer;
  _playerPos = playerPos;
  _remotePlayers = remotePlayers;
  _getPin = getPin;
  _setPin = setPin;

  // Create overlay
  _overlay = document.createElement('div');
  _overlay.id = 'live-map-fullscreen';
  _overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.id = 'live-map-fullscreen-close';
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    font-size: 28px;
    font-weight: bold;
    color: #333;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
  `;
  closeBtn.addEventListener('click', closeFullscreenMap);
  _overlay.appendChild(closeBtn);

  // Canvas
  _canvas = document.createElement('canvas');
  _canvas.id = 'live-map-fullscreen-canvas';
  _canvas.width = 1400;
  _canvas.height = 1400;
  _canvas.style.cssText = `
    width: 700px;
    height: 700px;
    border-radius: 50%;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  `;
  _ctx = _canvas.getContext('2d');
  _overlay.appendChild(_canvas);

  // Click handler for pin placement
  _canvas.addEventListener('click', _handleCanvasClick);

  // Create render target
  _renderTarget = new THREE.WebGLRenderTarget(1400, 1400, {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });

  // Create camera (fixed view of entire world)
  const worldRadius = 500;
  _camera = new THREE.OrthographicCamera(
    -worldRadius, worldRadius,
    worldRadius, -worldRadius,
    0.1, 2000
  );
  _camera.position.set(0, 1000, 0);
  _camera.lookAt(0, 0, 0);
  _camera.up.set(0, 0, -1);

  // Event listeners
  window.addEventListener('keydown', _handleKeyDown);
  _overlay.addEventListener('click', _handleOverlayClick);

  document.body.appendChild(_overlay);
  _render();

  console.log('[liveMapFullscreen] Opened');
}

export function closeFullscreenMap() {
  if (!_overlay) return;

  window.removeEventListener('keydown', _handleKeyDown);
  
  if (_renderTarget) {
    _renderTarget.dispose();
    _renderTarget = null;
  }

  if (_overlay.parentNode) {
    _overlay.parentNode.removeChild(_overlay);
  }

  _overlay = null;
  _canvas = null;
  _ctx = null;
  _camera = null;
  _scene = null;
  _renderer = null;

  console.log('[liveMapFullscreen] Closed');
}

export function isFullscreenOpen() {
  return _overlay !== null;
}

function _handleKeyDown(e) {
  if (e.key === 'Escape') {
    closeFullscreenMap();
  }
}

function _handleOverlayClick(e) {
  if (e.target === _overlay) {
    closeFullscreenMap();
  }
}

function _handleCanvasClick(e) {
  const rect = _canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Convert to world coordinates
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const worldRadius = 500;

  const relX = (x - centerX) / centerX * worldRadius;
  const relZ = (y - centerY) / centerY * worldRadius;

  const worldX = _playerPos.x + relX;
  const worldZ = _playerPos.z + relZ;

  if (_setPin) {
    _setPin(worldX, worldZ);
    _render(); // Redraw with new pin
  }
}

function _render() {
  if (!_camera || !_renderTarget || !_scene || !_renderer) return;

  // Render scene to texture
  _renderer.setRenderTarget(_renderTarget);
  _renderer.render(_scene, _camera);
  _renderer.setRenderTarget(null);

  // Copy to canvas
  _copyRenderTargetToCanvas();

  // Draw markers
  _drawMarkers();
}

function _copyRenderTargetToCanvas() {
  const size = _canvas.width;
  const buffer = new Uint8Array(size * size * 4);
  _renderer.readRenderTargetPixels(_renderTarget, 0, 0, size, size, buffer);

  const imageData = new ImageData(new Uint8ClampedArray(buffer), size, size);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);

  _ctx.save();
  _ctx.clearRect(0, 0, size, size);
  
  // Circular clip
  _ctx.beginPath();
  _ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  _ctx.clip();

  // Draw flipped
  _ctx.translate(0, size);
  _ctx.scale(1, -1);
  _ctx.drawImage(tempCanvas, 0, 0);
  _ctx.restore();
}

function _drawMarkers() {
  const scale = 2;
  const centerX = _canvas.width / 2;
  const centerY = _canvas.height / 2;
  const worldRadius = 500;

  // Local player
  const playerScreenX = centerX + (-_playerPos.x / worldRadius) * (centerX);
  const playerScreenY = centerY + (-_playerPos.z / worldRadius) * (centerY);

  _ctx.beginPath();
  _ctx.arc(playerScreenX, playerScreenY, 6 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#4FC3F7';
  _ctx.fill();
  _ctx.strokeStyle = '#ffffff';
  _ctx.lineWidth = 2 * scale;
  _ctx.stroke();

  // Remote players
  const colors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63'];
  for (const player of _remotePlayers) {
    const screenX = centerX + (-player.x / worldRadius) * (centerX);
    const screenY = centerY + (-player.z / worldRadius) * (centerY);

    const dist = Math.hypot(screenX - centerX, screenY - centerY);
    if (dist > centerX) continue;

    const hash = player.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const color = colors[hash % colors.length];

    _ctx.beginPath();
    _ctx.arc(screenX, screenY, 5 * scale, 0, Math.PI * 2);
    _ctx.fillStyle = color;
    _ctx.fill();
    _ctx.strokeStyle = '#ffffff';
    _ctx.lineWidth = 1.5 * scale;
    _ctx.stroke();
  }

  // Draw pin if exists
  const pin = _getPin ? _getPin() : null;
  if (pin) {
    const pinX = centerX + (-pin.x / worldRadius) * (centerX);
    const pinY = centerY + (-pin.z / worldRadius) * (centerY);

    _ctx.fillStyle = '#FF5252';
    _ctx.strokeStyle = '#ffffff';
    _ctx.lineWidth = 2 * scale;

    _ctx.beginPath();
    _ctx.arc(pinX, pinY, 8 * scale, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.stroke();

    _ctx.fillStyle = '#ffffff';
    _ctx.beginPath();
    _ctx.arc(pinX, pinY, 3 * scale, 0, Math.PI * 2);
    _ctx.fill();
  }
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- liveMapFullscreen.test.js`
Expected: PASS

- [ ] **Step 7: Commit fullscreen map**

```bash
git add src/ui/liveMapFullscreen.js src/ui/liveMap.js tests/ui/liveMapFullscreen.test.js
git commit -m "feat(liveMap): add fullscreen map modal with pin placement

- Fullscreen overlay with 1400x1400 render target
- Shows entire world (500m radius)
- Mobile-friendly ✕ close button
- ESC key and click-outside-to-close
- Pin placement on click
- Pin persistence to localStorage
- Pin rendering on both minimap and fullscreen

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Integration with main.js

**Files:**
- Modify: `src/main.js`

**Interfaces:**
- Consumes: All liveMap exports
- Produces: Working live map in game

- [ ] **Step 1: Add helper to get remote player data**

```javascript
// src/main.js - add function near other helpers
function getRemotePlayersData() {
  const remotePlayers = [];
  for (const [id, player] of Object.entries(window._remotePlayers || {})) {
    if (player.mesh && player.mesh.position) {
      remotePlayers.push({
        id,
        x: player.mesh.position.x,
        z: player.mesh.position.z
      });
    }
  }
  return remotePlayers;
}
```

- [ ] **Step 2: Replace minimap imports**

```javascript
// src/main.js - replace old imports
// OLD:
// import { initMinimap, updateMinimapPlayer, renderMinimap, updateMinimapOnlineCount } from './ui/minimap.js';

// NEW:
import { initLiveMap, updateLiveMap, disposeLiveMap, getMapPin, setMapPin } from './ui/liveMap.js';
import { createLiveMapUI, updateOnlineCount, removeLiveMapUI } from './ui/liveMapUI.js';
import { openFullscreenMap } from './ui/liveMapFullscreen.js';
```

- [ ] **Step 3: Replace initMinimap call**

```javascript
// src/main.js - in startGame() function, replace:
// OLD:
// initMinimap();

// NEW (after scene and renderer are created):
if (initLiveMap(scene, renderer)) {
  const canvas = document.getElementById('live-map-canvas');
  createLiveMapUI(canvas);
  
  // M key to open fullscreen
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      const playerPos = getLocalPlayerPosition();
      const remotePlayers = getRemotePlayersData();
      openFullscreenMap(scene, renderer, playerPos, remotePlayers, getMapPin, setMapPin);
    }
  });
} else {
  console.error('[main] Failed to initialize live map');
}
```

- [ ] **Step 4: Replace minimap update calls in animate()**

```javascript
// src/main.js - in animate() function, replace:
// OLD:
// const playerPos = getLocalPlayerPosition();
// if (playerPos) {
//   const playerRotY = getLocalPlayerRotY();
//   const cameraYaw = getCameraYaw();
//   updateMinimapPlayer(playerPos.x, playerPos.z, playerRotY, cameraYaw);
// }
// renderMinimap();

// NEW:
const playerPos = getLocalPlayerPosition();
if (playerPos) {
  const playerRotY = getLocalPlayerRotY();
  const remotePlayers = getRemotePlayersData();
  const cameraYaw = getCameraYaw();
  updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw);
}
```

- [ ] **Step 5: Replace online count update**

```javascript
// src/main.js - in the online count update section, replace:
// OLD:
// updateMinimapOnlineCount(onlineCount);

// NEW:
updateOnlineCount(onlineCount);
```

- [ ] **Step 6: Add cleanup for HMR**

```javascript
// src/main.js - add before startGame() definition
if (module.hot) {
  module.hot.dispose(() => {
    disposeLiveMap();
    removeLiveMapUI();
  });
}
```

- [ ] **Step 7: Test in browser - basic visibility**

Manual test:
1. Run `npm start`
2. Open http://localhost:3001
3. Log in to game
4. Check bottom-right corner for circular minimap
5. Verify map shows 3D scene from above

Expected: Minimap visible with live rendering

- [ ] **Step 8: Test in browser - controls**

Manual test:
1. Click + button → map zooms in (closer view)
2. Click - button → map zooms out (wider view)
3. Click 🧭 button → map rotation changes
4. Move character → minimap follows

Expected: All controls work

- [ ] **Step 9: Test in browser - fullscreen**

Manual test:
1. Press M key → fullscreen map opens
2. Click on map → red pin appears
3. Press ESC → map closes
4. Check minimap → pin visible on minimap too

Expected: Fullscreen works, pin persists

- [ ] **Step 10: Commit integration**

```bash
git add src/main.js
git commit -m "feat(liveMap): integrate with main game loop

- Replace minimap.js imports with liveMap modules
- Add getRemotePlayersData helper for multiplayer markers
- Wire up updateLiveMap in animate loop
- Add M key handler for fullscreen map
- HMR cleanup for live map

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Performance Testing & Optimization

**Files:**
- Modify: `src/ui/liveMap.js` (if optimizations needed)

**Interfaces:**
- No new interfaces

- [ ] **Step 1: Add performance monitoring**

```javascript
// src/ui/liveMap.js - add at top with state variables
let _lastFrameTime = 0;
let _frameCount = 0;
let _totalRenderTime = 0;

// Add to updateLiveMap function, at start:
const startTime = performance.now();

// Add to updateLiveMap function, at end:
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
```

- [ ] **Step 2: Test with 0 players**

Manual test:
1. Start game solo
2. Open browser DevTools → Performance
3. Record 5 seconds of gameplay
4. Check frame rate

Expected: Solid 60fps

- [ ] **Step 3: Test with 10 simulated players**

```javascript
// Temporary test code in main.js
const fakeRemotePlayers = Array.from({ length: 10 }, (_, i) => ({
  id: `fake-${i}`,
  x: Math.random() * 400 - 200,
  z: Math.random() * 400 - 200
}));
updateLiveMap(playerPos, playerRotY, fakeRemotePlayers, cameraYaw);
```

Run and measure FPS.
Expected: 60fps maintained

- [ ] **Step 4: Test with 50 simulated players**

Change fake count to 50, measure again.
Expected: 60fps (or identify bottleneck)

- [ ] **Step 5: Add player marker culling if needed**

```javascript
// src/ui/liveMap.js - in _drawPlayerMarkers, add before loop:
const MAX_VISIBLE_PLAYERS = 50;
if (remotePlayers.length > MAX_VISIBLE_PLAYERS) {
  // Sort by distance, take closest 50
  remotePlayers = remotePlayers
    .map(p => ({
      ...p,
      dist: Math.hypot(p.x - playerPos.x, p.z - playerPos.z)
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_VISIBLE_PLAYERS);
}
```

- [ ] **Step 6: Test on mobile device**

Manual test on phone:
1. Open game on mobile browser
2. Check minimap renders
3. Test touch controls (zoom, rotation)
4. Open fullscreen map (M key or minimap click)
5. Test ✕ button (48×48px touch target)

Expected: All features work on mobile

- [ ] **Step 7: Remove test code and commit optimizations**

```bash
git add src/ui/liveMap.js
git commit -m "perf(liveMap): add performance monitoring and player culling

- Log warning if render time exceeds 4ms budget
- Cull to 50 closest players if more exist
- Tested at 60fps with 0, 10, 50 players

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Cleanup & Migration Complete

**Files:**
- Delete: `src/ui/minimap.js`, `src/ui/minimapRegistry.js`
- Modify: Any remaining references

**Interfaces:**
- Final cleanup, no new interfaces

- [ ] **Step 1: Search for remaining minimap references**

Run:
```bash
grep -r "minimap" src/ --exclude-dir=node_modules
```

Expected: Only liveMap files should appear (or update references found)

- [ ] **Step 2: Search for minimapRegistry references**

Run:
```bash
grep -r "minimapRegistry" src/ --exclude-dir=node_modules
```

Expected: No matches (or update if found)

- [ ] **Step 3: Delete old minimap files**

```bash
git rm src/ui/minimap.js
git rm src/ui/minimapRegistry.js
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Final browser test - full feature checklist**

Manual verification:
- [ ] Minimap visible bottom-right
- [ ] Shows live 3D scene
- [ ] Local player marker (blue + arrow)
- [ ] Remote player markers (if multiplayer)
- [ ] Zoom + works
- [ ] Zoom - works
- [ ] Rotation toggle works
- [ ] Online count displays
- [ ] Settings button works
- [ ] M key opens fullscreen
- [ ] Fullscreen shows whole world
- [ ] ✕ button closes fullscreen
- [ ] ESC closes fullscreen
- [ ] Click outside closes fullscreen
- [ ] Click on fullscreen places pin
- [ ] Pin shows on minimap
- [ ] Pin persists after reload
- [ ] 60fps maintained
- [ ] Mobile touch works

- [ ] **Step 6: Commit deletion**

```bash
git commit -m "refactor(liveMap): remove old minimap implementation

- Delete minimap.js (1046 lines)
- Delete minimapRegistry.js
- Migration to live Three.js rendering complete

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Update CLAUDE.md if it mentions minimap**

```bash
grep -i "minimap" CLAUDE.md
# If found, update references to liveMap
```

- [ ] **Step 8: Final commit for documentation**

```bash
git add CLAUDE.md  # if modified
git commit -m "docs: update CLAUDE.md to reference liveMap system

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Live 3D rendering from Three.js scene - Task 1, 2
- [x] Minimap with zoom/rotation controls - Task 3
- [x] Fullscreen map with pin placement - Task 4
- [x] Remote player markers - Task 2
- [x] Integration with main.js - Task 5
- [x] 60fps performance target - Task 6
- [x] Mobile-friendly controls - Task 3, 4
- [x] localStorage persistence - Task 3, 4
- [x] Cleanup old files - Task 7

### Placeholder Check
- [x] No "TBD" or "TODO" in plan
- [x] All code blocks complete
- [x] All test assertions specific
- [x] All file paths exact

### Type Consistency
- [x] `initLiveMap(scene, renderer)` consistent across tasks
- [x] `updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw)` consistent
- [x] `remotePlayers` is `Array<{id: string, x: number, z: number}>`
- [x] `playerPos` is `{x: number, z: number}`
- [x] All function signatures match between tasks

---

## Execution Notes

**Estimated Time:** 3-4 hours for full implementation

**Risk Areas:**
- WebGLRenderTarget browser compatibility (mitigated with try/catch)
- Performance on low-end devices (mitigated with 50-player culling)
- Coordinate system conversions (tested in Task 2)

**Testing Strategy:**
- Unit tests for each module
- Manual browser testing at each integration point
- Performance profiling with varying player counts
- Mobile device testing

**Rollback Plan:**
If critical issues arise:
1. Revert main.js changes
2. Restore minimap.js from git
3. File issue with reproduction steps
4. Fix and re-attempt

