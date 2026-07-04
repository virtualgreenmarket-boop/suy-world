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
  if (_canvas) {
    _canvas.removeEventListener('click', _handleCanvasClick);
  }

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
  const originalRenderTarget = _renderer.getRenderTarget();
  _renderer.setRenderTarget(_renderTarget);
  _renderer.render(_scene, _camera);
  _renderer.setRenderTarget(originalRenderTarget);

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
  const playerScreenX = centerX + (_playerPos.x / worldRadius) * centerX;
  const playerScreenY = centerY + (_playerPos.z / worldRadius) * centerY;

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
    const screenX = centerX + (player.x / worldRadius) * centerX;
    const screenY = centerY + (player.z / worldRadius) * centerY;

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
    const pinX = centerX + (pin.x / worldRadius) * centerX;
    const pinY = centerY + (pin.z / worldRadius) * centerY;

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
