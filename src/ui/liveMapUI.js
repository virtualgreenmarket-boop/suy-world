import { setMapZoom, setMapRotationMode, getMapRotationMode, getCameraYaw } from './liveMap.js';

// ── Private Module State ──────────────────────────────────────────────

let _container = null;
let _countDisplay = null;
let _zoomLevel = 0.6; // Default closer zoom to see more details
let _onFullscreenRequest = null; // Callback when user clicks to open fullscreen
let _northPin = null;            // North compass pin element
let _compassInterval = null;     // Interval syncing the N pin in camera mode

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

  // North compass pin (rotates to true north in camera mode)
  _northPin = document.createElement('div');
  _northPin.id = 'live-map-north';
  _northPin.textContent = 'N';
  _container.appendChild(_northPin);

  // Fullscreen affordance chip (same action as clicking the map)
  if (_onFullscreenRequest) {
    const expandBtn = document.createElement('button');
    expandBtn.id = 'live-map-expand';
    expandBtn.title = 'Full Map';
    expandBtn.textContent = '⛶';
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _onFullscreenRequest();
    });
    _container.appendChild(expandBtn);
  }

  // Compass sync — in camera mode the map rotates, so N must point to true north
  _compassInterval = setInterval(() => {
    if (!_northPin) return;
    const yaw = getMapRotationMode() === 'camera' ? getCameraYaw() : 0;
    _northPin.style.transform = `rotate(${yaw}rad) translateY(-${MINIMAP_SIZE / 2 - 2}px) rotate(${-yaw}rad)`;
  }, 100);

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
  if (_compassInterval) {
    clearInterval(_compassInterval);
    _compassInterval = null;
  }
  if (_container && _container.parentNode) {
    _container.parentNode.removeChild(_container);
  }
  _container = null;
  _countDisplay = null;
  _northPin = null;
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
    /* ═══ SUY WORLD live map — lifebuoy edition ═══
       Language: lagoon glass rgba(13,36,40,.78) · facet corner cut ·
       sun highlight · Coral #FF6B4A · Leaf #7ACB5E · Gold #F0B429 · Wood #C98F14 */

    #live-map-container {
      box-sizing: border-box; /* padding = ring thickness, total stays ${MINIMAP_SIZE}px */
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${MINIMAP_SIZE}px;
      height: ${MINIMAP_SIZE}px;
      border-radius: 50%;
      overflow: visible;
      /* Lifebuoy ring: 8 × 45° muted red/cream segments, wood inner rim */
      background: conic-gradient(
        rgba(232, 86, 74, 0.92) 0deg 45deg,   rgba(246, 241, 228, 0.92) 45deg 90deg,
        rgba(232, 86, 74, 0.92) 90deg 135deg,  rgba(246, 241, 228, 0.92) 135deg 180deg,
        rgba(232, 86, 74, 0.92) 180deg 225deg, rgba(246, 241, 228, 0.92) 225deg 270deg,
        rgba(232, 86, 74, 0.92) 270deg 315deg, rgba(246, 241, 228, 0.92) 315deg 360deg
      );
      padding: 10px; /* ring thickness */
      cursor: pointer;
      z-index: 9999;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow:
        0 8px 28px rgba(8, 24, 27, 0.4),
        inset 0 2px 0 rgba(255, 255, 255, 0.35);
    }

    #live-map-container::before {
      /* thin wood rim between the lifebuoy and the map — bridges the old brass look */
      content: '';
      position: absolute;
      inset: 7px;
      border-radius: 50%;
      border: 2.5px solid rgba(201, 143, 20, 0.85);
      pointer-events: none;
      z-index: 1000;
    }

    #live-map-container:hover {
      transform: scale(1.02);
      box-shadow:
        0 12px 36px rgba(8, 24, 27, 0.45),
        inset 0 2px 0 rgba(255, 255, 255, 0.4),
        0 0 46px rgba(240, 180, 41, 0.1);
    }

    #live-map-canvas {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      box-shadow: inset 0 0 30px rgba(8, 24, 27, 0.45);
      mask-image: radial-gradient(circle, black 0%, black 96%, transparent 100%);
      -webkit-mask-image: radial-gradient(circle, black 0%, black 96%, transparent 100%);
    }

    #live-map-north {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 26px;
      height: 26px;
      margin: -13px 0 0 -13px;
      border-radius: 50%;
      background: rgba(13, 36, 40, 0.92);
      border: 2px solid #F0B429;
      color: #F0B429;
      font-family: 'Fredoka', -apple-system, sans-serif;
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 1001;
      transform: translateY(-${MINIMAP_SIZE / 2 - 2}px);
      box-shadow: 0 2px 8px rgba(8, 24, 27, 0.5);
    }

    #live-map-count {
      position: absolute;
      top: 16px;
      left: 22px;
      color: #F4E7C3;
      font-size: 13px;
      font-weight: 600;
      text-shadow: 0 2px 4px rgba(8, 24, 27, 0.7);
      pointer-events: none;
      z-index: 1001;
      font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.3px;
    }

    /* ── shared chip look: lagoon glass + facet corner (the signature) ── */
    #live-map-zoom-in,
    #live-map-zoom-out,
    #live-map-rotation-toggle,
    #live-map-expand {
      position: absolute;
      background: rgba(13, 36, 40, 0.78);
      border: 1.5px solid rgba(244, 231, 195, 0.28);
      border-radius: 11px;
      clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
      color: #F4E7C3;
      font-family: 'Fredoka', -apple-system, sans-serif;
      font-weight: 600;
      cursor: pointer;
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.2s ease;
      user-select: none;
      box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.2);
    }

    #live-map-zoom-in,
    #live-map-zoom-out {
      bottom: 14px;
      left: 14px;
      width: 40px;
      height: 40px;
      font-size: 21px;
    }

    #live-map-zoom-out { bottom: 62px; }

    #live-map-rotation-toggle {
      top: 14px;
      right: 14px;
      width: 44px;
      height: 44px;
      font-size: 20px;
    }

    #live-map-expand {
      bottom: 14px;
      right: 14px;
      width: 40px;
      height: 40px;
      font-size: 17px;
    }

    #live-map-zoom-in:hover,
    #live-map-zoom-out:hover,
    #live-map-rotation-toggle:hover,
    #live-map-expand:hover {
      color: #F0B429;
      border-color: #F0B429;
      box-shadow:
        inset 0 2px 0 rgba(255, 255, 255, 0.25),
        0 0 14px rgba(240, 180, 41, 0.25);
    }

    #live-map-zoom-in:active,
    #live-map-zoom-out:active,
    #live-map-rotation-toggle:active,
    #live-map-expand:active {
      transform: scale(0.94);
    }

    /* Mobile-friendly adjustments */
    @media (max-width: 768px) {
      #live-map-container {
        top: 10px;
        right: 10px;
        width: 280px;
        height: 280px;
      }
      #live-map-north {
        transform: translateY(-138px);
      }
    }
  `;
  document.head.appendChild(style);
}