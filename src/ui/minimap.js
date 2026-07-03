import { getAllMapEntities } from './minimapRegistry.js';
import { HANGAR_DIMS, HANGAR_CONFIGS } from '../world/hangars.js';

const MINIMAP_SIZE = 360; // Doubled from 180
let MINIMAP_WORLD_RADIUS = 200; // How many world units to show (adjustable with zoom)
const STORAGE_KEY_ROTATION = 'minimap_rotation_mode';
const STORAGE_KEY_ZOOM = 'minimap_zoom_level';

let _canvas, _ctx, _container;
let _playerPos = { x: 0, z: 0 };
let _playerRotY = 0;
let _cameraRotY = 0; // Camera rotation instead of player rotation
let _rotationMode = 'camera'; // 'camera' or 'north'
let _onlineCount = 1;
let _zoomLevel = 1; // 1 = default, 0.5 = zoomed in, 2 = zoomed out
let _isFullscreen = false;
let _pinnedLocation = null; // { x, z } for map pin

export function initMinimap() {
  // Cleanup existing minimap (HMR hot reload protection)
  const existing = document.getElementById('minimap-container');
  if (existing) {
    console.log('[minimap] Removing existing container (HMR cleanup)');
    existing.remove();
  }

  _loadRotationMode();
  _loadZoomLevel(); // Load zoom BEFORE creating UI
  _createMinimapUI();
  _injectStyles();
  console.log(`[minimap] Initialized with size=${MINIMAP_SIZE}px, radius=${MINIMAP_WORLD_RADIUS}m`);
}

function _loadRotationMode() {
  const saved = localStorage.getItem(STORAGE_KEY_ROTATION);
  if (saved === 'north' || saved === 'camera') {
    _rotationMode = saved;
  }
}

function _saveRotationMode() {
  localStorage.setItem(STORAGE_KEY_ROTATION, _rotationMode);
}

export function setMinimapRotationMode(mode) {
  if (mode === 'north' || mode === 'camera') {
    _rotationMode = mode;
    _saveRotationMode();
  }
}

export function getMinimapRotationMode() {
  return _rotationMode;
}

function _createMinimapUI() {
  // Container
  _container = document.createElement('div');
  _container.id = 'minimap-container';
  document.body.appendChild(_container);

  // Canvas
  _canvas = document.createElement('canvas');
  _canvas.width = MINIMAP_SIZE * 2; // 2x for retina
  _canvas.height = MINIMAP_SIZE * 2;
  _canvas.style.width = `${MINIMAP_SIZE}px`;
  _canvas.style.height = `${MINIMAP_SIZE}px`;
  _container.appendChild(_canvas);
  _ctx = _canvas.getContext('2d');

  // Online count display (inside minimap, left side)
  const countDisplay = document.createElement('div');
  countDisplay.id = 'minimap-count';
  countDisplay.textContent = '1';
  _container.appendChild(countDisplay);

  // Settings button (in top-right corner of circular minimap)
  if (window._createSettingsButton) {
    const gearBtn = window._createSettingsButton();
    gearBtn.id = 'minimap-settings-btn';
    _container.appendChild(gearBtn);
  }

  // Zoom controls (bottom-left of minimap)
  const zoomControls = document.createElement('div');
  zoomControls.id = 'minimap-zoom-controls';

  const zoomInBtn = document.createElement('button');
  zoomInBtn.id = 'minimap-zoom-in';
  zoomInBtn.title = 'Zoom In';
  zoomInBtn.textContent = '+';

  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.id = 'minimap-zoom-out';
  zoomOutBtn.title = 'Zoom Out';
  zoomOutBtn.textContent = '−';

  zoomControls.appendChild(zoomInBtn);
  zoomControls.appendChild(zoomOutBtn);
  _container.appendChild(zoomControls);

  // Fullscreen button (bottom-right of minimap)
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.id = 'minimap-fullscreen-btn';
  fullscreenBtn.title = 'Open Full Map';
  fullscreenBtn.innerHTML = '⛶';
  _container.appendChild(fullscreenBtn);

  // Event listeners for zoom - use direct references
  zoomInBtn.addEventListener('click', () => {
    console.log('[minimap] Zoom IN clicked, current:', _zoomLevel);
    _zoomLevel = Math.max(0.5, _zoomLevel - 0.25);
    _updateZoom();
  });

  zoomOutBtn.addEventListener('click', () => {
    console.log('[minimap] Zoom OUT clicked, current:', _zoomLevel);
    _zoomLevel = Math.min(3, _zoomLevel + 0.25);
    _updateZoom();
  });

  // Event listener for fullscreen
  fullscreenBtn.addEventListener('click', _toggleFullscreenMap);
}

function _loadZoomLevel() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ZOOM);
    if (saved) {
      _zoomLevel = parseFloat(saved);
      _updateZoom();
    }
  } catch (e) {}
}

function _updateZoom() {
  MINIMAP_WORLD_RADIUS = 200 * _zoomLevel;
  localStorage.setItem(STORAGE_KEY_ZOOM, _zoomLevel.toString());
  console.log(`[minimap] Zoom updated: level=${_zoomLevel}, radius=${MINIMAP_WORLD_RADIUS}m`);
}

function _toggleFullscreenMap() {
  _isFullscreen = !_isFullscreen;

  if (_isFullscreen) {
    _createFullscreenMap();
  } else {
    _closeFullscreenMap();
  }
}

function _createFullscreenMap() {
  const overlay = document.createElement('div');
  overlay.id = 'minimap-fullscreen';
  overlay.innerHTML = `
    <div class="fullscreen-map-header">
      <h2>World Map</h2>
      <button id="fullscreen-map-close">✕</button>
    </div>
    <canvas id="fullscreen-map-canvas"></canvas>
    <div class="fullscreen-map-info">
      <p>Click on the map to place a pin marker</p>
      <button id="fullscreen-clear-pin">Clear Pin</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const canvas = document.getElementById('fullscreen-map-canvas');
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
  canvas.width = size * 2;
  canvas.height = size * 2;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  // Close button
  document.getElementById('fullscreen-map-close').addEventListener('click', () => {
    _isFullscreen = false;
    _closeFullscreenMap();
  });

  // Clear pin button
  document.getElementById('fullscreen-clear-pin').addEventListener('click', () => {
    _pinnedLocation = null;
    _renderFullscreenMap();
  });

  // Click to place pin
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert screen coords to world coords
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const relX = (x - centerX) / (size / 2) * 500; // Full world view
    const relZ = (y - centerY) / (size / 2) * 500;

    _pinnedLocation = {
      x: _playerPos.x + relX,
      z: _playerPos.z + relZ
    };

    _renderFullscreenMap();
  });

  _renderFullscreenMap();
}

function _closeFullscreenMap() {
  const overlay = document.getElementById('minimap-fullscreen');
  if (overlay) {
    overlay.remove();
  }
}

function _renderFullscreenMap() {
  const canvas = document.getElementById('fullscreen-map-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const scale = 2;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const mapRadius = (canvas.width / 2) - 20 * scale;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(centerX, centerY);

  // Draw full world view (fixed, no rotation)
  const worldRadius = 500; // Show entire world

  // Background
  ctx.beginPath();
  ctx.arc(0, 0, mapRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 25, 30, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3 * scale;
  ctx.stroke();

  // Draw all features (simplified versions)
  _drawFullscreenFeatures(ctx, mapRadius, worldRadius, scale);

  // Draw player position
  const playerScreenX = (-_playerPos.x / worldRadius) * mapRadius;
  const playerScreenY = (-_playerPos.z / worldRadius) * mapRadius;
  ctx.beginPath();
  ctx.arc(playerScreenX, playerScreenY, 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#4FC3F7';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Draw pin if exists
  if (_pinnedLocation) {
    const pinX = (-_pinnedLocation.x / worldRadius) * mapRadius;
    const pinY = (-_pinnedLocation.z / worldRadius) * mapRadius;

    // Pin marker
    ctx.fillStyle = '#FF5252';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * scale;

    // Pin base
    ctx.beginPath();
    ctx.arc(pinX, pinY, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pin top
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pinX, pinY, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawFullscreenFeatures(ctx, mapRadius, worldRadius, scale) {
  // Asymmetric expansion factors (same as island.js)
  const EAST_EXPANSION = 1.4;
  const NS_EXPANSION = 2.38;

  // Helper to draw asymmetric ellipse in fullscreen
  function drawAsymmetricEllipseFS(baseRadius, eastExp, nsExp, strokeStyle, lineWidth) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const baseX = Math.cos(angle) * baseRadius;
      const baseY = Math.sin(angle) * baseRadius;
      const xScale = baseX > 0 ? eastExp : 1.0;
      const x = baseX * xScale;
      const y = baseY * nsExp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw zone boundaries with asymmetric ellipses
  const grassR = (255 / worldRadius) * mapRadius;
  const beachR = (350 / worldRadius) * mapRadius;
  const shallowR = (500 / worldRadius) * mapRadius;

  drawAsymmetricEllipseFS(grassR, EAST_EXPANSION, NS_EXPANSION, 'rgba(76, 175, 80, 0.4)', 2 * scale);
  drawAsymmetricEllipseFS(beachR, EAST_EXPANSION, NS_EXPANSION, 'rgba(255, 235, 59, 0.4)', 2 * scale);
  drawAsymmetricEllipseFS(shallowR, EAST_EXPANSION, NS_EXPANSION, 'rgba(0, 188, 212, 0.3)', 2 * scale);

  // Draw plaza (center square)
  ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
  const plazaSize = (82 / worldRadius) * mapRadius; // 41m half-width = 82m full
  ctx.fillRect(-plazaSize/2, -plazaSize/2, plazaSize, plazaSize);

  // Draw hangars with labels
  HANGAR_CONFIGS.forEach((cfg, idx) => {
    const x = (cfg.x / worldRadius) * mapRadius;
    const z = (cfg.z / worldRadius) * mapRadius;

    ctx.fillStyle = 'rgba(100, 100, 120, 0.9)';
    ctx.fillRect(x - 12 * scale, z - 12 * scale, 24 * scale, 24 * scale);

    ctx.fillStyle = '#ffffff';
    ctx.font = `${10 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const names = ['North', 'Central', 'South'];
    ctx.fillText(names[idx] || 'Hangar', x, z + 14 * scale);
  });

  // Draw marina with label
  const marinaX = (-325.2 / worldRadius) * mapRadius;
  const marinaZ = 0;
  ctx.fillStyle = 'rgba(139, 115, 85, 0.9)';
  ctx.fillRect(marinaX - 16 * scale, marinaZ - 8 * scale, 32 * scale, 16 * scale);

  ctx.fillStyle = '#ffffff';
  ctx.font = `${10 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Marina', marinaX, marinaZ + 10 * scale);

  // Draw lighthouse with label
  const lighthouseX = (-272.19 / worldRadius) * mapRadius;
  const lighthouseZ = (107.62 / worldRadius) * mapRadius;

  // Lighthouse tower (red circle)
  ctx.fillStyle = 'rgba(198, 40, 40, 0.9)';
  ctx.beginPath();
  ctx.arc(lighthouseX, lighthouseZ, 5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Lighthouse beacon (yellow glow)
  ctx.fillStyle = 'rgba(255, 233, 140, 0.6)';
  ctx.beginPath();
  ctx.arc(lighthouseX, lighthouseZ, 8 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `${10 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Lighthouse', lighthouseX, lighthouseZ + 12 * scale);
}

export function updateMinimapPlayer(x, z, rotY, cameraRotY) {
  _playerPos = { x, z };
  _playerRotY = rotY;
  if (cameraRotY !== undefined) {
    _cameraRotY = cameraRotY;
  }
}

export function updateMinimapOnlineCount(count) {
  _onlineCount = count;
  const countEl = document.getElementById('minimap-count');
  if (countEl) {
    countEl.textContent = count.toString();
  }
}

let _renderCount = 0;
export function renderMinimap() {
  if (!_ctx) {
    console.warn('[minimap] renderMinimap called but _ctx is null');
    return;
  }

  _renderCount++;
  if (_renderCount % 60 === 0) {
    console.log(`[minimap] Rendering (${_renderCount} frames), playerPos: (${_playerPos.x.toFixed(1)}, ${_playerPos.z.toFixed(1)}), radius: ${MINIMAP_WORLD_RADIUS}m`);
  }

  const scale = 2; // Retina scaling
  const centerX = (_canvas.width / 2);
  const centerY = (_canvas.height / 2);
  const mapRadius = (_canvas.width / 2) - 10 * scale;

  _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

  _ctx.save();
  _ctx.translate(centerX, centerY);

  // Apply rotation based on mode
  if (_rotationMode === 'camera') {
    _ctx.rotate(-_cameraRotY);
  }

  // Draw world bounds circle
  _ctx.beginPath();
  _ctx.arc(0, 0, mapRadius, 0, Math.PI * 2);
  _ctx.fillStyle = 'rgba(20, 25, 30, 0.85)';
  _ctx.fill();
  _ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  _ctx.lineWidth = 2 * scale;
  _ctx.stroke();

  // Draw grid
  _drawGrid(mapRadius, scale);

  // Draw zone boundaries (grass/beach/shallow water)
  _drawZoneBoundaries(mapRadius, scale);

  // Draw paths (stone paths connecting buildings)
  _drawPaths(scale);

  // Draw buildings (hangars + marina + lighthouse)
  _drawHangars(scale);
  _drawMarina(scale);
  _drawLighthouse(scale);

  // Draw entities from registry
  const entities = getAllMapEntities();
  entities.forEach(entity => {
    const relX = entity.position.x - _playerPos.x;
    const relZ = entity.position.z - _playerPos.z;
    const screenX = (relX / MINIMAP_WORLD_RADIUS) * mapRadius;
    const screenY = (relZ / MINIMAP_WORLD_RADIUS) * mapRadius;

    // Check if in bounds
    const dist = Math.sqrt(screenX * screenX + screenY * screenY);
    if (dist > mapRadius) return;

    switch (entity.type) {
      case 'npc':
        _drawNpc(screenX, screenY, scale);
        break;
      case 'roaming_npc':
        _drawRoamingNpc(screenX, screenY, scale);
        break;
      case 'tree':
        _drawTree(screenX, screenY, scale);
        break;
      case 'building':
        _drawBuilding(screenX, screenY, scale, entity.metadata);
        break;
      case 'zone':
        _drawZone(screenX, screenY, scale, entity.metadata);
        break;
    }
  });

  _ctx.restore();

  // Draw player at center (always on top, not rotated)
  _ctx.save();
  _ctx.translate(centerX, centerY);
  _drawPlayer(0, 0, scale);
  _ctx.restore();
}

function _drawZoneBoundaries(mapRadius, scale) {
  // Zone radii (from mapZones.js)
  const GRASS_RADIUS = 255;
  const BEACH_RADIUS = 350;
  const SHALLOW_WATER_RADIUS = 500;

  // Asymmetric expansion factors (from island.js)
  const EAST_EXPANSION = 1.4;
  const NS_EXPANSION = 2.38;

  // Convert world radii to minimap screen radii
  const grassScreenRadius = (GRASS_RADIUS / MINIMAP_WORLD_RADIUS) * mapRadius;
  const beachScreenRadius = (BEACH_RADIUS / MINIMAP_WORLD_RADIUS) * mapRadius;
  const shallowWaterScreenRadius = (SHALLOW_WATER_RADIUS / MINIMAP_WORLD_RADIUS) * mapRadius;

  // IMPORTANT: Set up clipping to prevent lines from extending beyond minimap circle
  _ctx.save();
  _ctx.beginPath();
  _ctx.arc(0, 0, mapRadius, 0, Math.PI * 2);
  _ctx.clip();

  // Fill zones with colors (outermost to innermost - larger circles first)

  // 1. Deep water (background - full circle)
  _ctx.fillStyle = 'rgba(0, 105, 148, 0.2)'; // Dark blue water
  _ctx.beginPath();
  _ctx.arc(0, 0, mapRadius, 0, Math.PI * 2);
  _ctx.fill();

  // 2. Shallow water zone (on top of deep water)
  if (shallowWaterScreenRadius < mapRadius * 0.95) {
    _ctx.fillStyle = 'rgba(0, 188, 212, 0.25)'; // Cyan shallow water
    _drawAsymmetricEllipseFilled(shallowWaterScreenRadius, EAST_EXPANSION, NS_EXPANSION);
  }

  // 3. Beach zone (on top of water)
  _ctx.fillStyle = 'rgba(255, 235, 59, 0.3)'; // Yellow sand
  _drawAsymmetricEllipseFilled(beachScreenRadius, EAST_EXPANSION, NS_EXPANSION);

  // 4. Grass zone (innermost - on top of beach)
  _ctx.fillStyle = 'rgba(76, 175, 80, 0.35)'; // Green grass
  _drawAsymmetricEllipseFilled(grassScreenRadius, EAST_EXPANSION, NS_EXPANSION);

  // Now draw zone boundary lines
  _ctx.save();
  _ctx.beginPath();
  _ctx.arc(0, 0, mapRadius, 0, Math.PI * 2);
  _ctx.clip(); // Clip all drawing to minimap circle

  // Draw grass boundary (green line)
  _ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)'; // Reduced opacity from 0.6 to 0.4
  _ctx.lineWidth = 1.5 * scale; // Thinner lines
  _drawAsymmetricEllipse(grassScreenRadius, EAST_EXPANSION, NS_EXPANSION, mapRadius);

  // Draw beach boundary (yellow line)
  _ctx.strokeStyle = 'rgba(255, 235, 59, 0.4)'; // Reduced opacity
  _ctx.lineWidth = 1.5 * scale;
  _drawAsymmetricEllipse(beachScreenRadius, EAST_EXPANSION, NS_EXPANSION, mapRadius);

  // Draw shallow water boundary (cyan line) - ONLY if it fits within minimap
  if (shallowWaterScreenRadius < mapRadius * 0.95) { // Only draw if reasonably inside
    _ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)'; // Reduced opacity
    _ctx.lineWidth = 1 * scale;
    _drawAsymmetricEllipse(shallowWaterScreenRadius, EAST_EXPANSION, NS_EXPANSION, mapRadius);
  }

  _ctx.restore(); // Remove clipping
}

function _drawAsymmetricEllipse(baseRadius, eastExpansion, nsExpansion, mapRadius) {
  // Draw asymmetric ellipse by sampling points around the perimeter
  // Skip drawing if ellipse would extend far beyond minimap bounds
  const maxExtent = baseRadius * Math.max(eastExpansion, nsExpansion);
  if (maxExtent > mapRadius * 1.5) return; // Don't draw if too large

  _ctx.beginPath();
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const baseX = Math.cos(angle) * baseRadius;
    const baseY = Math.sin(angle) * baseRadius;

    // Apply asymmetric expansions
    // East (x > 0) expands by eastExpansion
    // West (x < 0) stays at 1.0
    // North/South (y) expands by nsExpansion
    const xScale = baseX > 0 ? eastExpansion : 1.0;
    const x = baseX * xScale;
    const y = baseY * nsExpansion;

    if (i === 0) {
      _ctx.moveTo(x, y);
    } else {
      _ctx.lineTo(x, y);
    }
  }
  _ctx.closePath();
  _ctx.stroke();
}

function _drawAsymmetricEllipseFilled(baseRadius, eastExpansion, nsExpansion) {
  // Same as above but for filling
  _ctx.beginPath();
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const baseX = Math.cos(angle) * baseRadius;
    const baseY = Math.sin(angle) * baseRadius;

    // Apply asymmetric expansions
    // East (x > 0) expands by eastExpansion
    // West (x < 0) stays at 1.0
    // North/South (y) expands by nsExpansion
    const xScale = baseX > 0 ? eastExpansion : 1.0;
    const x = baseX * xScale;
    const y = baseY * nsExpansion;

    if (i === 0) {
      _ctx.moveTo(x, y);
    } else {
      _ctx.lineTo(x, y);
    }
  }
  _ctx.closePath();
  _ctx.fill();
}

function _drawGrid(mapRadius, scale) {
  const gridSpacing = 50; // World units - 50m grid
  const gridScreenSpacing = (gridSpacing / MINIMAP_WORLD_RADIUS) * mapRadius;

  _ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  _ctx.lineWidth = 1 * scale;

  // Calculate offset based on player position to make grid scroll
  const offsetX = ((_playerPos.x % gridSpacing) / MINIMAP_WORLD_RADIUS) * mapRadius;
  const offsetZ = ((_playerPos.z % gridSpacing) / MINIMAP_WORLD_RADIUS) * mapRadius;

  // Draw vertical lines
  for (let i = -6; i <= 6; i++) {
    const x = i * gridScreenSpacing - offsetX;
    if (Math.abs(x) > mapRadius) continue; // Skip if outside circle

    _ctx.beginPath();
    _ctx.moveTo(x, -mapRadius);
    _ctx.lineTo(x, mapRadius);
    _ctx.stroke();
  }

  // Draw horizontal lines
  for (let i = -6; i <= 6; i++) {
    const z = i * gridScreenSpacing - offsetZ;
    if (Math.abs(z) > mapRadius) continue; // Skip if outside circle

    _ctx.beginPath();
    _ctx.moveTo(-mapRadius, z);
    _ctx.lineTo(mapRadius, z);
    _ctx.stroke();
  }
}

function _drawPaths(scale) {
  const mapRadius = (_canvas.width / 2) - 10 * scale;

  // Path data from paths.js
  const paths = [
    { ax: -50, az: -41, bx: -50, bz: -123, width: 9 },    // Plaza to North hangar
    { ax: -9, az: 0, bx: 123, bz: 0, width: 9 },          // Plaza to East hangar
    { ax: -50, az: 41, bx: -50, bz: 123, width: 9 },      // Plaza to South hangar
    { ax: -91, az: 0, bx: -297, bz: 0, width: 9.5 }       // Plaza to Marina
  ];

  _ctx.strokeStyle = 'rgba(200, 190, 170, 0.4)'; // Stone path color
  _ctx.lineWidth = 2 * scale;
  _ctx.lineCap = 'round';

  paths.forEach(path => {
    const relX1 = path.ax - _playerPos.x;
    const relZ1 = path.az - _playerPos.z;
    const relX2 = path.bx - _playerPos.x;
    const relZ2 = path.bz - _playerPos.z;

    const screenX1 = (relX1 / MINIMAP_WORLD_RADIUS) * mapRadius;
    const screenY1 = (relZ1 / MINIMAP_WORLD_RADIUS) * mapRadius;
    const screenX2 = (relX2 / MINIMAP_WORLD_RADIUS) * mapRadius;
    const screenY2 = (relZ2 / MINIMAP_WORLD_RADIUS) * mapRadius;

    _ctx.beginPath();
    _ctx.moveTo(screenX1, screenY1);
    _ctx.lineTo(screenX2, screenY2);
    _ctx.stroke();
  });
}

function _drawMarina(scale) {
  const mapRadius = (_canvas.width / 2) - 10 * scale;

  // Marina position (from marina.js: group at -325.2, 0, 0)
  const marinaX = -325.2;
  const marinaZ = 0;

  const relX = marinaX - _playerPos.x;
  const relZ = marinaZ - _playerPos.z;
  const screenX = (relX / MINIMAP_WORLD_RADIUS) * mapRadius;
  const screenY = (relZ / MINIMAP_WORLD_RADIUS) * mapRadius;

  _ctx.save();
  _ctx.translate(screenX, screenY);
  _ctx.rotate(Math.PI / 2); // Marina rotated 90 degrees

  // Elevated deck (upper level) - DW=130, DL=44
  const deckWidth = 130;
  const deckLength = 44;
  const deckW = (deckWidth / MINIMAP_WORLD_RADIUS) * mapRadius;
  const deckH = (deckLength / MINIMAP_WORLD_RADIUS) * mapRadius;

  _ctx.fillStyle = 'rgba(139, 115, 85, 0.8)'; // Brown wood
  _ctx.strokeStyle = 'rgba(180, 160, 130, 0.9)';
  _ctx.lineWidth = 1.5 * scale;
  _ctx.fillRect(-deckW / 2, -deckH / 2, deckW, deckH);
  _ctx.strokeRect(-deckW / 2, -deckH / 2, deckW, deckH);

  // Fishing pier (lower level) - extends from deck toward sea
  // PIER_W=45, PIER_LEN=52, starts at front edge and extends forward
  const pierWidth = 45;
  const pierLength = 52;
  const pierW = (pierWidth / MINIMAP_WORLD_RADIUS) * mapRadius;
  const pierL = (pierLength / MINIMAP_WORLD_RADIUS) * mapRadius;

  // Pier starts at front edge (z = -21 local, after rotation)
  const pierOffsetZ = -deckH / 2 - pierL / 2;

  _ctx.fillStyle = 'rgba(120, 100, 75, 0.7)'; // Darker brown for pier
  _ctx.strokeStyle = 'rgba(160, 140, 110, 0.8)';
  _ctx.lineWidth = 1 * scale;
  _ctx.fillRect(-pierW / 2, pierOffsetZ - pierL / 2, pierW, pierL);
  _ctx.strokeRect(-pierW / 2, pierOffsetZ - pierL / 2, pierW, pierL);

  _ctx.restore();
}

function _drawLighthouse(scale) {
  const mapRadius = (_canvas.width / 2) - 10 * scale;

  // Lighthouse position (from lighthouse.js)
  const lighthouseX = -272.19;
  const lighthouseZ = 107.62;

  const relX = lighthouseX - _playerPos.x;
  const relZ = lighthouseZ - _playerPos.z;
  const screenX = (relX / MINIMAP_WORLD_RADIUS) * mapRadius;
  const screenY = (relZ / MINIMAP_WORLD_RADIUS) * mapRadius;

  // Check if in bounds
  const dist = Math.sqrt(screenX * screenX + screenY * screenY);
  if (dist > mapRadius) return;

  _ctx.save();
  _ctx.translate(screenX, screenY);

  // Lighthouse tower (red and white stripes - simplified to red circle)
  _ctx.fillStyle = 'rgba(198, 40, 40, 0.9)'; // Red
  _ctx.beginPath();
  _ctx.arc(0, 0, 3 * scale, 0, Math.PI * 2);
  _ctx.fill();

  // Beacon glow (yellow)
  _ctx.fillStyle = 'rgba(255, 233, 140, 0.5)';
  _ctx.beginPath();
  _ctx.arc(0, 0, 5 * scale, 0, Math.PI * 2);
  _ctx.fill();

  _ctx.restore();
}

function _drawHangars(scale) {
  HANGAR_CONFIGS.forEach((cfg, idx) => {
    const dims = HANGAR_DIMS[idx];
    if (!dims) return;

    const relX = cfg.x - _playerPos.x;
    const relZ = cfg.z - _playerPos.z;
    const screenX = (relX / MINIMAP_WORLD_RADIUS) * ((_canvas.width / 2) - 10 * scale);
    const screenY = (relZ / MINIMAP_WORLD_RADIUS) * ((_canvas.width / 2) - 10 * scale);

    const w = (dims.W / MINIMAP_WORLD_RADIUS) * ((_canvas.width / 2) - 10 * scale);
    const h = (dims.D / MINIMAP_WORLD_RADIUS) * ((_canvas.width / 2) - 10 * scale);

    _ctx.save();
    _ctx.translate(screenX, screenY);
    _ctx.rotate(cfg.rotY);
    _ctx.fillStyle = 'rgba(100, 100, 120, 0.6)';
    _ctx.strokeStyle = 'rgba(180, 180, 200, 0.8)';
    _ctx.lineWidth = 1.5 * scale;
    _ctx.fillRect(-w / 2, -h / 2, w, h);
    _ctx.strokeRect(-w / 2, -h / 2, w, h);
    _ctx.restore();
  });
}

function _drawPlayer(x, y, scale) {
  _ctx.beginPath();
  _ctx.arc(x, y, 4 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#4FC3F7';
  _ctx.fill();
  _ctx.strokeStyle = '#ffffff';
  _ctx.lineWidth = 1.5 * scale;
  _ctx.stroke();
}

function _drawNpc(x, y, scale) {
  _ctx.beginPath();
  _ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#ffffff';
  _ctx.fill();
  _ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  _ctx.lineWidth = 1 * scale;
  _ctx.stroke();
}

function _drawRoamingNpc(x, y, scale) {
  // White dot for roaming NPCs (Alex, Maya, Sam, Dana)
  // No surrounding ring - that's only for the player
  _ctx.beginPath();
  _ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#ffffff';
  _ctx.fill();
  _ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  _ctx.lineWidth = 1 * scale;
  _ctx.stroke();
}

function _drawTree(x, y, scale) {
  // Draw tree icon (circle with darker center)
  _ctx.beginPath();
  _ctx.arc(x, y, 3.5 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#4CAF50';
  _ctx.fill();
  _ctx.beginPath();
  _ctx.arc(x, y, 1.5 * scale, 0, Math.PI * 2);
  _ctx.fillStyle = '#2E7D32';
  _ctx.fill();
}

function _drawBuilding(x, y, scale, metadata) {
  const size = (metadata?.size || 10) * scale;
  _ctx.fillStyle = 'rgba(100, 100, 120, 0.6)';
  _ctx.strokeStyle = 'rgba(180, 180, 200, 0.8)';
  _ctx.lineWidth = 1 * scale;
  _ctx.fillRect(x - size / 2, y - size / 2, size, size);
  _ctx.strokeRect(x - size / 2, y - size / 2, size, size);
}

function _drawZone(x, y, scale, metadata) {
  if (!metadata?.radius) return;
  const radius = (metadata.radius / MINIMAP_WORLD_RADIUS) * ((_canvas.width / 2) - 10 * scale);
  _ctx.beginPath();
  _ctx.arc(x, y, radius, 0, Math.PI * 2);
  _ctx.strokeStyle = metadata.color || 'rgba(255, 255, 100, 0.5)';
  _ctx.lineWidth = 2 * scale;
  _ctx.stroke();
}

function _injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #minimap-container {
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${MINIMAP_SIZE}px;
      height: ${MINIMAP_SIZE}px;
      border-radius: 50%;
      overflow: visible;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 90;
      pointer-events: none;
    }
    #minimap-container canvas {
      display: block;
      border-radius: 50%;
      position: relative;
      z-index: 1;
    }
    #minimap-count {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 4px 8px;
      border-radius: 10px;
      font: 700 12px 'Segoe UI', Arial, sans-serif;
      pointer-events: none;
      user-select: none;
      z-index: 10;
    }
    #minimap-settings-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(15, 15, 30, 0.85);
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      font-size: 22px;
      cursor: pointer;
      pointer-events: all;
      transition: all 0.2s ease;
      font-family: system-ui;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
      z-index: 10;
    }
    #minimap-settings-btn:hover {
      background: rgba(40, 40, 60, 0.95);
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    /* Zoom controls */
    #minimap-zoom-controls {
      position: absolute;
      bottom: 8px;
      left: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      pointer-events: all;
      z-index: 10;
    }
    #minimap-zoom-in, #minimap-zoom-out {
      background: rgba(15, 15, 30, 0.85);
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }
    #minimap-zoom-in:hover, #minimap-zoom-out:hover {
      background: rgba(40, 40, 60, 0.95);
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.1);
    }

    /* Fullscreen button */
    #minimap-fullscreen-btn {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(15, 15, 30, 0.85);
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 18px;
      cursor: pointer;
      pointer-events: all;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      z-index: 10;
    }
    #minimap-fullscreen-btn:hover {
      background: rgba(40, 40, 60, 0.95);
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.1);
    }

    /* Fullscreen map overlay */
    #minimap-fullscreen {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .fullscreen-map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 800px;
      margin-bottom: 20px;
    }
    .fullscreen-map-header h2 {
      color: #fff;
      font-size: 32px;
      margin: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    #fullscreen-map-close {
      background: rgba(255, 50, 50, 0.8);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #fff;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      font-size: 28px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    #fullscreen-map-close:hover {
      background: rgba(255, 80, 80, 0.95);
      transform: scale(1.1);
    }
    #fullscreen-map-canvas {
      border-radius: 50%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
      border: 3px solid rgba(255, 255, 255, 0.3);
      cursor: crosshair;
    }
    .fullscreen-map-info {
      margin-top: 20px;
      text-align: center;
      color: #fff;
    }
    .fullscreen-map-info p {
      font-size: 16px;
      margin: 10px 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    #fullscreen-clear-pin {
      background: rgba(100, 100, 120, 0.8);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #fff;
      border-radius: 20px;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 10px;
    }
    #fullscreen-clear-pin:hover {
      background: rgba(120, 120, 140, 0.95);
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);
}
