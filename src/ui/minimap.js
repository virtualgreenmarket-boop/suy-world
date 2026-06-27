import { getAllMapEntities } from './minimapRegistry.js';
import { HANGAR_DIMS, HANGAR_CONFIGS } from '../world/hangars.js';

const MINIMAP_SIZE = 180;
const MINIMAP_WORLD_RADIUS = 200; // How many world units to show
const STORAGE_KEY_ROTATION = 'minimap_rotation_mode';

let _canvas, _ctx, _container;
let _playerPos = { x: 0, z: 0 };
let _playerRotY = 0;
let _rotationMode = 'camera'; // 'camera' or 'north'
let _onlineCount = 1;

export function initMinimap() {
  _loadRotationMode();
  _createMinimapUI();
  _injectStyles();
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
}

export function updateMinimapPlayer(x, z, rotY) {
  _playerPos = { x, z };
  _playerRotY = rotY;
}

export function updateMinimapOnlineCount(count) {
  _onlineCount = count;
  const countEl = document.getElementById('minimap-count');
  if (countEl) {
    countEl.textContent = count.toString();
  }
}

export function renderMinimap() {
  if (!_ctx) return;

  const scale = 2; // Retina scaling
  const centerX = (_canvas.width / 2);
  const centerY = (_canvas.height / 2);
  const mapRadius = (_canvas.width / 2) - 10 * scale;

  _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

  _ctx.save();
  _ctx.translate(centerX, centerY);

  // Apply rotation based on mode
  if (_rotationMode === 'camera') {
    _ctx.rotate(-_playerRotY);
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

  // Draw buildings (hangars)
  _drawHangars(scale);

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

function _drawGrid(mapRadius, scale) {
  const gridSpacing = (MINIMAP_WORLD_RADIUS / 4);
  const gridScreenSpacing = (gridSpacing / MINIMAP_WORLD_RADIUS) * mapRadius;

  _ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  _ctx.lineWidth = 1 * scale;

  for (let i = -4; i <= 4; i++) {
    // Vertical lines
    _ctx.beginPath();
    _ctx.moveTo(i * gridScreenSpacing, -mapRadius);
    _ctx.lineTo(i * gridScreenSpacing, mapRadius);
    _ctx.stroke();

    // Horizontal lines
    _ctx.beginPath();
    _ctx.moveTo(-mapRadius, i * gridScreenSpacing);
    _ctx.lineTo(mapRadius, i * gridScreenSpacing);
    _ctx.stroke();
  }
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
      top: 60px;
      right: 16px;
      width: ${MINIMAP_SIZE}px;
      height: ${MINIMAP_SIZE}px;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 90;
      pointer-events: none;
    }
    #minimap-container canvas {
      display: block;
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
    }
  `;
  document.head.appendChild(style);
}
