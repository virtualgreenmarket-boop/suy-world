/**
 * Coordinates Display
 * Small floating window showing player position (X, Y, Z)
 */

let _coordsContainer = null;
let _xText = null;
let _yText = null;
let _zText = null;
let _isVisible = true;

export function initCoordinatesDisplay() {
  _coordsContainer = document.createElement('div');
  _coordsContainer.id = 'coords-display';
  _coordsContainer.innerHTML = `
    <style>
      #coords-display {
        position: fixed;
        top: 80px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px 12px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        color: #00ff00;
        z-index: 1000;
        user-select: text;
        cursor: move;
        transition: opacity 0.2s;
      }

      #coords-display.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .coord-row {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
        gap: 10px;
      }

      .coord-label {
        color: #ffaa00;
        font-weight: bold;
        min-width: 12px;
      }

      .coord-value {
        color: #00ff00;
        text-align: right;
        min-width: 80px;
      }

      .coords-header {
        color: #ffffff;
        font-size: 11px;
        margin-bottom: 4px;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 3px;
      }

      .coords-toggle {
        position: absolute;
        top: 2px;
        right: 4px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 10px;
        cursor: pointer;
        padding: 2px 4px;
      }

      .coords-toggle:hover {
        color: #ffffff;
      }

      @media (max-width: 768px) {
        #coords-display {
          top: 60px;
          font-size: 11px;
          padding: 6px 10px;
        }
        .coord-value {
          min-width: 70px;
        }
      }
    </style>

    <button class="coords-toggle" id="coords-toggle-btn" title="Toggle coordinates (C key)">×</button>
    <div class="coords-header">COORDINATES</div>
    <div class="coord-row">
      <span class="coord-label">X:</span>
      <span class="coord-value" id="coord-x">0.00</span>
    </div>
    <div class="coord-row">
      <span class="coord-label">Y:</span>
      <span class="coord-value" id="coord-y">0.00</span>
    </div>
    <div class="coord-row">
      <span class="coord-label">Z:</span>
      <span class="coord-value" id="coord-z">0.00</span>
    </div>
  `;

  document.body.appendChild(_coordsContainer);

  _xText = document.getElementById('coord-x');
  _yText = document.getElementById('coord-y');
  _zText = document.getElementById('coord-z');

  // Toggle button
  const toggleBtn = document.getElementById('coords-toggle-btn');
  toggleBtn.addEventListener('click', toggleVisibility);

  // Keyboard shortcut (C key)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      // Only if chat is not open
      const chatInput = document.querySelector('#chat-input');
      if (!chatInput || chatInput !== document.activeElement) {
        toggleVisibility();
      }
    }
  });

  // Make draggable
  makeDraggable(_coordsContainer);

  console.log('[coords] 📍 Coordinates display initialized (press C to toggle)');
}

export function updateCoordinates(position) {
  if (!_xText || !_yText || !_zText || !position) return;

  _xText.textContent = position.x.toFixed(2);
  _yText.textContent = position.y.toFixed(2);
  _zText.textContent = position.z.toFixed(2);
}

export function toggleVisibility() {
  _isVisible = !_isVisible;
  if (_coordsContainer) {
    if (_isVisible) {
      _coordsContainer.classList.remove('hidden');
    } else {
      _coordsContainer.classList.add('hidden');
    }
  }
}

export function setCoordinatesVisible(visible) {
  _isVisible = visible;
  if (_coordsContainer) {
    if (visible) {
      _coordsContainer.classList.remove('hidden');
    } else {
      _coordsContainer.classList.add('hidden');
    }
  }
}

// Simple drag functionality
function makeDraggable(element) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  element.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    // Don't drag if clicking the toggle button
    if (e.target.id === 'coords-toggle-btn') return;

    initialX = e.clientX - (parseInt(element.style.left) || element.offsetLeft);
    initialY = e.clientY - (parseInt(element.style.top) || element.offsetTop);

    isDragging = true;
    element.style.cursor = 'grabbing';
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();

    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    // Keep within viewport bounds
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;

    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));

    element.style.left = currentX + 'px';
    element.style.top = currentY + 'px';
  }

  function dragEnd() {
    if (isDragging) {
      isDragging = false;
      element.style.cursor = 'move';
    }
  }
}
