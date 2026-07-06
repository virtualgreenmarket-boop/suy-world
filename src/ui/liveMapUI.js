import { setMapZoom, setMapRotationMode, getMapRotationMode } from './liveMap.js';

// ── Private Module State ──────────────────────────────────────────────

let _container = null;
let _countDisplay = null;
let _zoomLevel = 0.6; // Default closer zoom to see more details
let _onFullscreenRequest = null; // Callback when user clicks to open fullscreen

// ── Constants ──────────────────────────────────────────────────────────

const MINIMAP_SIZE = 360; // 360×360px circular container
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_IN_FACTOR = 0.8; // Zoom in = smaller worldRadius
const ZOOM_OUT_FACTOR = 1.25; // Zoom out = larger worldRadius

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Create the live map UI container with controls
 * @param {HTMLCanvasElement} canvas - The map canvas element
 * @param {Function} onFullscreenRequest - Optional callback when user requests fullscreen
 * @returns {HTMLElement} The container element
 */
export function createLiveMapUI(canvas, onFullscreenRequest = null) {
  if (!canvas) {
    console.error('[liveMapUI] Canvas is required');
    return null;
  }

  // Remove existing UI if present
  removeLiveMapUI();

  // Store callback
  _onFullscreenRequest = onFullscreenRequest;

  // Load saved settings
  _loadSettings();

  // Create container
  _container = document.createElement('div');
  _container.id = 'live-map-container';

  // Add canvas to container
  _container.appendChild(canvas);

  // Click handler for fullscreen
  if (_onFullscreenRequest) {
    _container.addEventListener('click', _handleContainerClick);
  }

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
  rotationToggle.title = 'Toggle Rotation Mode';
  rotationToggle.textContent = '🧭';
  rotationToggle.addEventListener('click', _handleRotationToggle);
  _container.appendChild(rotationToggle);

  // Inject styles
  _injectStyles();

  // Add to document
  document.body.appendChild(_container);

  console.log('[liveMapUI] UI created with zoom:', _zoomLevel, 'rotation:', getMapRotationMode());
  return _container;
}

/**
 * Update the online player count display
 * @param {number} count - Number of online players
 */
export function updateOnlineCount(count) {
  if (_countDisplay) {
    _countDisplay.textContent = `${count} online`;
  }
}

/**
 * Remove the live map UI from the DOM
 */
export function removeLiveMapUI() {
  if (_container && _container.parentNode) {
    _container.parentNode.removeChild(_container);
  }
  _container = null;
  _countDisplay = null;
}

// ── Private Functions ──────────────────────────────────────────────────

/**
 * Load saved settings from localStorage
 */
function _loadSettings() {
  const savedZoom = localStorage.getItem('liveMapZoom');
  if (savedZoom) {
    _zoomLevel = parseFloat(savedZoom);
    _zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, _zoomLevel));
    setMapZoom(_zoomLevel);
  }

  const savedRotation = localStorage.getItem('liveMapRotation');
  if (savedRotation === 'north' || savedRotation === 'camera') {
    setMapRotationMode(savedRotation);
  }
}

/**
 * Handle zoom in button click
 */
function _handleZoomIn(e) {
  e.stopPropagation();
  _zoomLevel = Math.max(MIN_ZOOM, _zoomLevel * ZOOM_IN_FACTOR);
  setMapZoom(_zoomLevel);
  localStorage.setItem('liveMapZoom', _zoomLevel);
  console.log('[liveMapUI] Zoom in:', _zoomLevel.toFixed(2));
}

/**
 * Handle zoom out button click
 */
function _handleZoomOut(e) {
  e.stopPropagation();
  _zoomLevel = Math.min(MAX_ZOOM, _zoomLevel * ZOOM_OUT_FACTOR);
  setMapZoom(_zoomLevel);
  localStorage.setItem('liveMapZoom', _zoomLevel);
  console.log('[liveMapUI] Zoom out:', _zoomLevel.toFixed(2));
}

/**
 * Handle rotation toggle button click
 */
function _handleRotationToggle(e) {
  e.stopPropagation();
  const current = getMapRotationMode();
  const newMode = current === 'camera' ? 'north' : 'camera';
  setMapRotationMode(newMode);
  localStorage.setItem('liveMapRotation', newMode);
  console.log('[liveMapUI] Rotation mode:', newMode);
}

/**
 * Handle container click (opens fullscreen)
 */
function _handleContainerClick(e) {
  // Don't trigger if clicking a button
  if (e.target.tagName === 'BUTTON') return;

  if (_onFullscreenRequest) {
    _onFullscreenRequest();
  }
}

/**
 * Inject CSS styles into the document
 */
function _injectStyles() {
  if (document.getElementById('live-map-styles')) return;

  const style = document.createElement('style');
  style.id = 'live-map-styles';
  style.textContent = `
    #live-map-container {
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${MINIMAP_SIZE}px;
      height: ${MINIMAP_SIZE}px;
      border-radius: 50%;
      overflow: visible;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      background: rgba(20, 25, 30, 0.9);
      cursor: pointer;
      z-index: 9999;
      transition: transform 0.2s ease;
    }

    #live-map-container:hover {
      transform: scale(1.02);
    }

    #live-map-canvas {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #live-map-zoom-in,
    #live-map-zoom-out {
      position: absolute;
      bottom: 10px;
      left: 10px;
      width: 48px;
      height: 48px;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid rgba(255,255,255,0.8);
      border-radius: 8px;
      color: white;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.2s ease;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }

    #live-map-zoom-out {
      bottom: 64px;
    }

    #live-map-zoom-in:hover,
    #live-map-zoom-out:hover {
      background: rgba(255, 255, 255, 0.95);
      color: black;
      border-color: white;
      transform: scale(1.1);
    }

    #live-map-zoom-in:active,
    #live-map-zoom-out:active {
      transform: scale(0.95);
    }

    #live-map-rotation-toggle {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 48px;
      height: 48px;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid rgba(255,255,255,0.8);
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.2s ease;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }

    #live-map-rotation-toggle:hover {
      background: rgba(255, 255, 255, 0.95);
      border-color: white;
      transform: scale(1.1);
    }

    #live-map-rotation-toggle:active {
      transform: scale(0.95);
    }

    /* Mobile-friendly adjustments */
    @media (max-width: 768px) {
      #live-map-container {
        top: 10px;
        right: 10px;
        width: 280px;
        height: 280px;
      }
    }
  `;
  document.head.appendChild(style);
}
