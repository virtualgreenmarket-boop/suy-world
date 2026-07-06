# Live Map System Design

**Date:** 2026-07-04  
**Author:** Claude Code  
**Status:** Draft

## Overview

Replace the existing hand-drawn Canvas 2D minimap (`src/ui/minimap.js`, 1046 lines) with a **live-rendered Three.js map system** that shows the actual 3D scene from a top-down orthographic camera view.

### Key Goals

1. **Real-time accuracy** - The map always shows exactly what exists in the 3D scene
2. **Performance** - 60fps rendering via WebGLRenderTarget
3. **Live multiplayer** - Show other players as colored markers in real-time
4. **Feature parity** - Preserve all existing features (zoom, rotation modes, fullscreen, pin, settings)
5. **Mobile-friendly** - Add explicit close button (✕) to fullscreen map

---

## User Requirements

### Minimap (Bottom-right corner)
- 360×360px circular map
- Shows **~200m radius** around the player (adjustable with zoom)
- **Live 3D render** from top-down orthographic camera
- **Player markers**:
  - Local player: Blue circle with direction arrow
  - Remote players: Colored circles (2D overlay)
- **Controls**:
  - `+/-` buttons for zoom (0.5x to 2x)
  - `🧭` button to toggle rotation mode (camera-follow vs north-up)
  - Settings gear button (top-right corner)
  - Online count display (e.g., "3 online")
- **Updates**: 60fps (every frame)

### Fullscreen Map (Modal overlay)
- Triggered by `M` key or click on minimap
- **Full-screen semi-transparent overlay**
- Large circular map showing **entire world (500m radius)**
- Same live 3D render, different camera frustum
- **Close methods**:
  - `✕` button (top-right, mobile-friendly)
  - `ESC` key
  - Click outside the circle
- **Pin feature**: Click on map to place red pin marker
  - Pin persists and shows on minimap too

---

## Technical Architecture

### Components

The system consists of **3 new modules** that replace the existing minimap:

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `src/ui/liveMap.js` | Core rendering: WebGLRenderTarget, orthographic camera, player markers | ~300 |
| `src/ui/liveMapUI.js` | DOM elements: canvas, buttons, event listeners | ~200 |
| `src/ui/liveMapFullscreen.js` | Fullscreen modal: overlay, close handlers, pin placement | ~150 |

**Total:** ~650 lines (vs 1046 in current `minimap.js`)

### Deleted Files
- `src/ui/minimap.js` (1046 lines) - hand-drawn Canvas 2D implementation
- `src/ui/minimapRegistry.js` - entity registration system (no longer needed)

---

## Core Rendering Pipeline

### WebGLRenderTarget Approach

```
┌─────────────────────────────────────────┐
│ Main Render Loop (animate)              │
│                                          │
│ 1. Update player position                │
│ 2. Get remote player data                │
│ 3. Position orthographic camera          │
│    ├─ Top-down view (y=1000, looking down)
│    ├─ Rotation: camera-follow OR north-up
│    └─ Frustum sized to zoom level        │
│ 4. Render scene to texture               │
│    ├─ renderer.setRenderTarget(mapRT)    │
│    ├─ renderer.render(scene, mapCamera)  │
│    └─ renderer.setRenderTarget(null)     │
│ 5. Copy texture to canvas                │
│ 6. Draw 2D player markers on canvas      │
│    ├─ Convert world (x,z) → screen (x,y) │
│    ├─ Draw local player (blue + arrow)   │
│    └─ Draw remote players (colored dots) │
└─────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **WebGLRenderTarget** over second renderer | More efficient (shared scene, single render pass per target), less GPU memory |
| **OrthographicCamera** | Top-down 2D projection perfect for maps |
| **2D Canvas overlay** for markers | Simpler than 3D sprites, easier to style, better performance |
| **60fps updates** | User requested smooth real-time view |
| **Layers** (optional) | Use Three.js `.layers` to hide UI elements from map view if needed |

---

## Data Flow

### Initialization (once)
```javascript
// In main.js startGame()
import { initLiveMap } from './ui/liveMap.js';

initLiveMap(scene, renderer);
// Creates:
// - Orthographic camera (mapCamera)
// - WebGLRenderTarget (720×720 for minimap, 1400×1400 for fullscreen)
// - Canvas DOM element
// - UI buttons (zoom, rotation, settings)
```

### Every Frame Update
```javascript
// In main.js animate()
import { updateLiveMap } from './ui/liveMap.js';

const playerPos = getLocalPlayerPosition(); // { x, z }
const remotePlayers = getRemotePlayersData(); // [{ id, x, z }, ...]

updateLiveMap(playerPos, remotePlayers);
// Does:
// 1. Position mapCamera above playerPos
// 2. Apply rotation (camera-follow or north-up)
// 3. Render scene to texture
// 4. Draw texture + player markers to canvas
```

---

## Component Details

### 1. liveMap.js

**Exports:**
```javascript
export function initLiveMap(scene, renderer)
export function updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw)
export function setMapZoom(zoomLevel) // 0.5 to 2.0
export function setMapRotationMode(mode) // 'camera' or 'north'
export function getMapRotationMode()
export function openFullscreenMap()
export function closeFullscreenMap()
export function setMapPin(worldX, worldZ)
export function clearMapPin()
```

**Internal State:**
```javascript
let _scene, _renderer;
let _mapCamera; // OrthographicCamera
let _mapRenderTarget; // WebGLRenderTarget (720×720)
let _canvas, _ctx; // HTML5 canvas for display
let _zoomLevel = 1.0; // 0.5 (close) to 2.0 (far)
let _rotationMode = 'camera'; // or 'north'
let _cameraYaw = 0; // Rotation from main camera
let _pinnedLocation = null; // { x, z } or null
```

**Rendering Logic:**
```javascript
function updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw) {
  if (!playerPos) return;
  
  _cameraYaw = cameraYaw; // Store for marker rotation

  // 1. Position camera above player
  _mapCamera.position.set(playerPos.x, 1000, playerPos.z);
  _mapCamera.lookAt(playerPos.x, 0, playerPos.z);

  // 2. Apply rotation
  if (_rotationMode === 'camera') {
    _mapCamera.rotation.z = -_cameraYaw; // Counter-rotate
  } else {
    _mapCamera.rotation.z = 0; // North always up
  }

  // 3. Update frustum for zoom
  const worldRadius = 200 * _zoomLevel;
  _mapCamera.left = -worldRadius;
  _mapCamera.right = worldRadius;
  _mapCamera.top = worldRadius;
  _mapCamera.bottom = -worldRadius;
  _mapCamera.updateProjectionMatrix();

  // 4. Render scene to texture
  _renderer.setRenderTarget(_mapRenderTarget);
  _renderer.render(_scene, _mapCamera);
  _renderer.setRenderTarget(null);

  // 5. Copy texture to canvas
  _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
  // Draw circular clip
  _ctx.save();
  _ctx.beginPath();
  _ctx.arc(_canvas.width/2, _canvas.height/2, _canvas.width/2, 0, Math.PI*2);
  _ctx.clip();
  // Draw texture from render target (use readPixels or drawImage from texture)
  _drawRenderTargetToCanvas();
  _ctx.restore();

  // 6. Draw player markers (2D overlay)
  _drawPlayerMarkers(playerPos, remotePlayers);
  if (_pinnedLocation) _drawPin(_pinnedLocation);
}
```

**Player Marker Drawing:**
```javascript
function _drawPlayerMarkers(playerPos, remotePlayers) {
  const scale = 2; // Retina
  const centerX = _canvas.width / 2;
  const centerY = _canvas.height / 2;
  const worldRadius = 200 * _zoomLevel;

  // Local player (blue + arrow)
  _ctx.beginPath();
  _ctx.arc(centerX, centerY, 8 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#4FC3F7';
  _ctx.fill();
  _ctx.strokeStyle = '#ffffff';
  _ctx.lineWidth = 2 * scale;
  _ctx.stroke();

  // Direction arrow (shows player facing direction)
  const arrowLength = 12 * scale;
  let arrowAngle = playerRotY;
  if (_rotationMode === 'camera') {
    arrowAngle -= _cameraYaw; // Adjust for map rotation
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
    const relX = player.x - playerPos.x;
    const relZ = player.z - playerPos.z;

    // Apply rotation transform if needed
    let screenX, screenY;
    if (_rotationMode === 'camera') {
      const rotated = rotatePoint(relX, relZ, _cameraYaw);
      screenX = centerX + (rotated.x / worldRadius) * (_canvas.width / 2);
      screenY = centerY + (rotated.z / worldRadius) * (_canvas.height / 2);
    } else {
      screenX = centerX + (relX / worldRadius) * (_canvas.width / 2);
      screenY = centerY + (relZ / worldRadius) * (_canvas.height / 2);
    }

    // Clip to circle
    const dist = Math.hypot(screenX - centerX, screenY - centerY);
    if (dist > _canvas.width / 2) continue;

    // Draw colored marker
    _ctx.beginPath();
    _ctx.arc(screenX, screenY, 6 * scale, 0, Math.PI * 2);
    _ctx.fillStyle = _getPlayerColor(player.id);
    _ctx.fill();
    _ctx.strokeStyle = '#ffffff';
    _ctx.lineWidth = 1.5 * scale;
    _ctx.stroke();
  }
}

function _getPlayerColor(playerId) {
  // Hash player ID to consistent color
  const colors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0'];
  const hash = playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```

---

### 2. liveMapUI.js

**Purpose:** Create and manage DOM elements and event listeners.

**Exports:**
```javascript
export function createLiveMapUI()
export function updateOnlineCount(count)
```

**DOM Structure:**
```html
<div id="live-map-container">
  <canvas id="live-map-canvas" width="720" height="720" style="width: 360px; height: 360px;"></canvas>
  <div id="live-map-count">3 online</div>
  <button id="live-map-zoom-in" title="Zoom In">+</button>
  <button id="live-map-zoom-out" title="Zoom Out">−</button>
  <button id="live-map-rotation-toggle" title="Toggle Rotation">🧭</button>
  <button id="live-map-settings" title="Settings">⚙️</button>
</div>
```

**CSS (injected):**
```css
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
}

#live-map-canvas {
  display: block;
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
  cursor: pointer;
}

#live-map-zoom-out {
  bottom: 48px;
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
}
```

**Event Listeners:**
```javascript
// Zoom
document.getElementById('live-map-zoom-in').addEventListener('click', (e) => {
  e.stopPropagation();
  const newZoom = Math.max(0.5, _zoomLevel * 0.8);
  setMapZoom(newZoom);
  localStorage.setItem('liveMapZoom', newZoom);
});

document.getElementById('live-map-zoom-out').addEventListener('click', (e) => {
  e.stopPropagation();
  const newZoom = Math.min(2.0, _zoomLevel * 1.25);
  setMapZoom(newZoom);
  localStorage.setItem('liveMapZoom', newZoom);
});

// Rotation toggle
document.getElementById('live-map-rotation-toggle').addEventListener('click', (e) => {
  e.stopPropagation();
  const newMode = _rotationMode === 'camera' ? 'north' : 'camera';
  setMapRotationMode(newMode);
  localStorage.setItem('liveMapRotation', newMode);
});

// Open fullscreen on minimap click
document.getElementById('live-map-container').addEventListener('click', () => {
  openFullscreenMap();
});

// Settings button
document.getElementById('live-map-settings').addEventListener('click', (e) => {
  e.stopPropagation();
  if (window._openSettings) window._openSettings();
});

// Keyboard shortcut
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    if (!_isFullscreenOpen) openFullscreenMap();
  }
});
```

**LocalStorage Persistence:**
```javascript
function _loadSettings() {
  const savedZoom = localStorage.getItem('liveMapZoom');
  if (savedZoom) _zoomLevel = parseFloat(savedZoom);

  const savedRotation = localStorage.getItem('liveMapRotation');
  if (savedRotation === 'north' || savedRotation === 'camera') {
    _rotationMode = savedRotation;
  }
}
```

---

### 3. liveMapFullscreen.js

**Purpose:** Fullscreen map modal with close button and pin placement.

**Exports:**
```javascript
export function openFullscreenMap(scene, renderer, playerPos, remotePlayers)
export function closeFullscreenMap()
```

**DOM Structure:**
```html
<div id="live-map-fullscreen" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000;">
  <button id="live-map-fullscreen-close" style="position: absolute; top: 20px; right: 20px; ...">✕</button>
  <canvas id="live-map-fullscreen-canvas" width="1400" height="1400" style="..."></canvas>
</div>
```

**Rendering:**
- Same `WebGLRenderTarget` approach, but with larger render target (1400×1400)
- Shows entire world (500m radius) - fixed frustum, no zoom
- Always "north-up" rotation (no camera-follow in fullscreen)
- Same player marker drawing logic

**Pin Placement:**
```javascript
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Convert screen coords to world coords
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const relX = (x - centerX) / (rect.width / 2) * 500;
  const relZ = (y - centerY) / (rect.height / 2) * 500;

  const worldX = playerPos.x + relX;
  const worldZ = playerPos.z + relZ;

  setMapPin(worldX, worldZ);
  _renderFullscreenMap(); // Redraw with pin
});
```

**Close Handlers:**
```javascript
// ✕ button
document.getElementById('live-map-fullscreen-close').addEventListener('click', closeFullscreenMap);

// ESC key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _isFullscreenOpen) {
    closeFullscreenMap();
  }
});

// Click outside circle
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    closeFullscreenMap();
  }
});
```

**Mobile-Friendly Close Button:**
```css
#live-map-fullscreen-close {
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
}

#live-map-fullscreen-close:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

#live-map-fullscreen-close:active {
  transform: scale(0.95);
}
```

---

## Integration with main.js

### Changes Required

**Before (old minimap):**
```javascript
import { 
  initMinimap, 
  updateMinimapPlayer, 
  renderMinimap,
  updateMinimapOnlineCount 
} from './ui/minimap.js';
import { registerMapEntity } from './ui/minimapRegistry.js';

// In startGame()
initMinimap();

// In animate()
const playerPos = getLocalPlayerPosition();
if (playerPos) {
  const playerRotY = getLocalPlayerRotY();
  const cameraYaw = getCameraYaw();
  updateMinimapPlayer(playerPos.x, playerPos.z, playerRotY, cameraYaw);
}
renderMinimap();

// In updateOnlineCount()
updateMinimapOnlineCount(count);
```

**After (new live map):**
```javascript
import { 
  initLiveMap, 
  updateLiveMap,
  updateOnlineCount 
} from './ui/liveMap.js';

// In startGame() - AFTER scene and renderer are created
initLiveMap(scene, renderer);

// In animate()
const playerPos = getLocalPlayerPosition();
if (playerPos) {
  const playerRotY = getLocalPlayerRotY(); // Player facing direction
  const remotePlayers = getRemotePlayersData(); // NEW: [{id, x, z}, ...]
  const cameraYaw = getCameraYaw(); // Camera rotation for map rotation
  updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw);
}

// In updateOnlineCount()
updateOnlineCount(count);
```

**New Helper Function Needed:**
```javascript
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

---

## Error Handling & Fallbacks

### WebGL Capability Check
```javascript
export function initLiveMap(scene, renderer) {
  // Check if WebGLRenderTarget is supported
  if (!renderer.capabilities.isWebGL2 && !renderer.capabilities.isWebGL) {
    console.error('[liveMap] WebGL not supported, disabling live map');
    _showFallbackMessage();
    return false;
  }

  // Check max texture size
  const maxSize = renderer.capabilities.maxTextureSize;
  if (maxSize < 1024) {
    console.warn('[liveMap] Low max texture size:', maxSize);
    // Reduce render target resolution
    _renderTargetSize = 512;
  }

  try {
    _mapRenderTarget = new THREE.WebGLRenderTarget(720, 720, {
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });
  } catch (err) {
    console.error('[liveMap] Failed to create WebGLRenderTarget:', err);
    _showFallbackMessage();
    return false;
  }

  // ... rest of initialization
  return true;
}

function _showFallbackMessage() {
  const msg = document.createElement('div');
  msg.textContent = 'Map unavailable (WebGL error)';
  msg.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:20px;background:rgba(255,0,0,0.8);color:white;border-radius:8px;';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 5000);
}
```

### Memory Management
```javascript
// Cleanup on HMR reload or page unload
export function disposeLiveMap() {
  if (_mapRenderTarget) {
    _mapRenderTarget.dispose();
    _mapRenderTarget = null;
  }
  if (_fullscreenRenderTarget) {
    _fullscreenRenderTarget.dispose();
    _fullscreenRenderTarget = null;
  }
  // Remove DOM elements
  document.getElementById('live-map-container')?.remove();
  closeFullscreenMap();
}

// HMR cleanup
if (module.hot) {
  module.hot.dispose(() => {
    disposeLiveMap();
  });
}
```

---

## Performance Considerations

### Target Frame Budget
- **Main game render:** ~12ms (60fps = 16.67ms total budget)
- **Map render (both targets):** ~3ms
- **Canvas 2D drawing:** ~1ms
- **Total overhead:** ~4ms (25% of frame budget)

### Optimizations

1. **Render Target Resolution**
   - Minimap: 720×720 (2x for retina) → reasonable quality
   - Fullscreen: 1400×1400 → high quality for large view
   - Alternative: use 512×512 on low-end devices

2. **Update Frequency**
   - Minimap: Every frame (60fps) as requested
   - Fullscreen: Could reduce to 30fps if needed (user won't notice in static view)

3. **Player Marker Count**
   - Limit to 50 visible markers (cull distant players)
   - Hash colors instead of computing each frame

4. **Layer Culling (Future)**
   - Use Three.js layers to hide UI elements (HUD, name tags) from map camera
   - Reduces geometry processed in map render pass

5. **Texture Reuse**
   - Fullscreen shares same technique, just different render target
   - Don't create new render targets on each fullscreen open

### Performance Testing Plan
1. Test on low-end laptop (Intel integrated GPU)
2. Measure frame times with 50 players visible
3. Check memory usage after 10 minutes
4. Test on mobile (iOS Safari, Android Chrome)

---

## Testing Checklist

### Functional Tests

**Minimap:**
- [ ] Map displays live 3D scene (buildings, terrain, water visible)
- [ ] Local player marker (blue circle) centered and visible
- [ ] Remote player markers (colored circles) accurate positions
- [ ] Zoom + increases zoom (closer view)
- [ ] Zoom - decreases zoom (wider view)
- [ ] Zoom persists after page reload (localStorage)
- [ ] Rotation toggle switches between camera-follow and north-up
- [ ] Rotation mode persists after page reload
- [ ] Online count updates correctly
- [ ] Settings button opens settings panel
- [ ] Click on minimap opens fullscreen map

**Fullscreen Map:**
- [ ] M key opens fullscreen map
- [ ] Map shows entire world (500m radius)
- [ ] ✕ button closes map
- [ ] ESC key closes map
- [ ] Click outside circle closes map
- [ ] Click on map places red pin
- [ ] Pin shows on minimap after closing fullscreen
- [ ] Pin persists until cleared or new pin placed

**Multiplayer:**
- [ ] Remote player markers appear at correct world positions
- [ ] Markers update smoothly as players move
- [ ] Each player has consistent color (same ID = same color)
- [ ] Player count matches actual connected players

### Performance Tests
- [ ] 60fps maintained with 0 other players
- [ ] 60fps maintained with 10 other players
- [ ] 60fps maintained with 50 other players
- [ ] No memory leaks after 10 minutes
- [ ] No stuttering when opening fullscreen map
- [ ] Works on mobile (iOS/Android)

### Edge Cases
- [ ] Map works before other players join
- [ ] Map works if WebGL errors (shows fallback message)
- [ ] HMR reload cleans up old render targets
- [ ] Map still works after alt-tab (context loss recovery)
- [ ] Zoom limits enforced (0.5x min, 2.0x max)

---

## Migration Strategy

### Phase 1: Build New System (Parallel)
1. Create `src/ui/liveMap.js` with basic rendering
2. Create `src/ui/liveMapUI.js` with DOM/CSS
3. Create `src/ui/liveMapFullscreen.js` with modal
4. Test in isolation (separate HTML page if needed)

### Phase 2: Integration
1. Add `initLiveMap()` call to `main.js`
2. Add `getRemotePlayersData()` helper
3. Replace `updateMinimapPlayer()` with `updateLiveMap()`
4. Remove old minimap imports (but keep files for rollback)

### Phase 3: Validation
1. Run functional tests
2. Performance profiling
3. User testing (if available)

### Phase 4: Cleanup
1. Delete `src/ui/minimap.js`
2. Delete `src/ui/minimapRegistry.js`
3. Remove any remaining references
4. Update CLAUDE.md if it mentions minimap

### Rollback Plan
If critical issues found:
1. Revert `main.js` changes
2. Re-import old minimap
3. File bug report with details
4. Fix new system before re-attempting

---

## Future Enhancements (Out of Scope)

These are **not** part of this design, but could be added later:

1. **Map markers for POIs**
   - Quest markers, shops, NPCs
   - Requires registry system (like old minimapRegistry)

2. **Fog of War**
   - Only show areas player has visited
   - Requires visited-area tracking + shader

3. **Minimap drag to pan**
   - Click+drag to view different area
   - Adds complexity to interaction model

4. **Custom zoom on fullscreen map**
   - Scroll wheel to zoom in/out
   - Requires separate zoom state for fullscreen

5. **Player name labels**
   - Show player names on hover
   - Requires tooltip system

6. **Terrain-only mode**
   - Toggle to hide buildings/objects
   - Requires layer management

---

## Open Questions

None - all requirements clarified during brainstorming.

---

## Appendices

### A. Coordinate System Reference

**World Space (Three.js):**
- X: East (+) / West (-)
- Y: Up (+) / Down (-)
- Z: North (-) / South (+)  *(Note: Three.js default)*

**Map Space (Canvas 2D):**
- X: Right (+) / Left (-)
- Y: Down (+) / Up (-)  *(Note: Canvas Y is inverted)*

**Conversion Formula:**
```javascript
function worldToScreen(worldX, worldZ, playerPos, worldRadius, canvasSize) {
  const relX = worldX - playerPos.x;
  const relZ = worldZ - playerPos.z;
  
  const screenX = (canvasSize / 2) + (relX / worldRadius) * (canvasSize / 2);
  const screenY = (canvasSize / 2) + (relZ / worldRadius) * (canvasSize / 2);
  
  return { x: screenX, y: screenY };
}
```

### B. Color Palette for Player Markers

```javascript
const PLAYER_COLORS = [
  '#FF5252', // Red
  '#FFEB3B', // Yellow
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#00BCD4', // Cyan
  '#E91E63', // Pink
];

function getPlayerColor(playerId) {
  const hash = playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PLAYER_COLORS[hash % PLAYER_COLORS.length];
}
```

### C. LocalStorage Schema

```javascript
{
  "liveMapZoom": "1.0",           // float 0.5 to 2.0
  "liveMapRotation": "camera",    // "camera" or "north"
  "liveMapPin": "123.45,-67.89"   // "x,z" or null
}
```

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-07-04 | Claude Code | Initial draft |

