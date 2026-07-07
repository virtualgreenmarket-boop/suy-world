// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fishing UI (meter, catch screen)
// ═══════════════════════════════════════════════════════════════════════

import { RARITY_CONFIG, getFishById } from '../systems/fishing.js';

let _meterPanel = null;
let _catchPanel = null;
let _onCatchCallback = null;

// Meter state
let _meterActive = false;
let _meterPosition = 0; // 0-100
let _meterDirection = 1; // 1 or -1
let _meterSpeed = 1.0;
let _centerZone = 0.30; // 30% default
let _animationFrame = null;

// ── Meter UI ──────────────────────────────────────────────────────────

export function showFishingMeter(rodSpeed, centerZone, onCatch) {
  if (_meterActive) return;

  _meterSpeed = rodSpeed;
  _centerZone = centerZone;
  _onCatchCallback = onCatch;
  _meterActive = true;
  _meterPosition = 50; // Start in center
  _meterDirection = 1;

  _createMeterPanel();
  _startMeterAnimation();
}

export function hideFishingMeter() {
  _meterActive = false;

  if (_animationFrame) {
    cancelAnimationFrame(_animationFrame);
    _animationFrame = null;
  }

  if (_meterPanel && _meterPanel.parentNode) {
    _meterPanel.parentNode.removeChild(_meterPanel);
  }
  _meterPanel = null;
}

function _createMeterPanel() {
  _meterPanel = document.createElement('div');
  _meterPanel.id = 'fishing-meter';
  _meterPanel.style.cssText = `
    position: fixed;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    width: 80px;
    height: 400px;
    background: rgba(13, 36, 40, 0.78);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    border-top-left-radius: 6px;
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.22), 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 10001;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
  `;

  // Title
  const title = document.createElement('div');
  title.textContent = 'משוך!';
  title.style.cssText = `
    font-family: Fredoka, sans-serif;
    font-size: 18px;
    color: #F4E7C3;
    margin-bottom: 12px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  `;
  _meterPanel.appendChild(title);

  // Meter track
  const track = document.createElement('div');
  track.id = 'fishing-meter-track';
  track.style.cssText = `
    position: relative;
    width: 40px;
    height: 300px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 20px;
    border: 2px solid rgba(244, 231, 195, 0.3);
    overflow: hidden;
  `;

  // Green zone (center)
  const greenZone = document.createElement('div');
  const zoneHeight = 300 * _centerZone;
  const zoneTop = (300 - zoneHeight) / 2;
  greenZone.style.cssText = `
    position: absolute;
    width: 100%;
    height: ${zoneHeight}px;
    top: ${zoneTop}px;
    background: rgba(122, 203, 94, 0.3);
    border-top: 2px solid #7ACB5E;
    border-bottom: 2px solid #7ACB5E;
  `;
  track.appendChild(greenZone);

  // Moving indicator
  const indicator = document.createElement('div');
  indicator.id = 'fishing-meter-indicator';
  indicator.style.cssText = `
    position: absolute;
    width: 100%;
    height: 12px;
    background: #FF6B4A;
    border-radius: 6px;
    box-shadow: 0 0 12px rgba(255, 107, 74, 0.8);
    top: 50%;
    transform: translateY(-50%);
    transition: top 0.05s linear;
  `;
  track.appendChild(indicator);

  _meterPanel.appendChild(track);

  // Pull button
  const pullBtn = document.createElement('button');
  pullBtn.textContent = 'משוך!';
  pullBtn.style.cssText = `
    margin-top: 12px;
    width: 100%;
    padding: 12px;
    background: #FF6B4A;
    border: 2px solid #E04B2A;
    border-radius: 8px;
    color: #F4E7C3;
    font-size: 16px;
    font-family: Fredoka, sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  `;
  pullBtn.addEventListener('mouseenter', () => {
    pullBtn.style.background = '#E85A4A';
    pullBtn.style.transform = 'scale(1.05)';
  });
  pullBtn.addEventListener('mouseleave', () => {
    pullBtn.style.background = '#FF6B4A';
    pullBtn.style.transform = 'scale(1)';
  });
  pullBtn.addEventListener('click', _handlePull);
  _meterPanel.appendChild(pullBtn);

  document.body.appendChild(_meterPanel);
}

function _startMeterAnimation() {
  const update = () => {
    if (!_meterActive) return;

    // Update position
    _meterPosition += _meterDirection * _meterSpeed * 0.8;

    // Bounce at edges
    if (_meterPosition >= 100) {
      _meterPosition = 100;
      _meterDirection = -1;
    } else if (_meterPosition <= 0) {
      _meterPosition = 0;
      _meterDirection = 1;
    }

    // Update visual
    const indicator = document.getElementById('fishing-meter-indicator');
    if (indicator) {
      const topPercent = 100 - _meterPosition;
      indicator.style.top = `${topPercent}%`;
    }

    _animationFrame = requestAnimationFrame(update);
  };

  _animationFrame = requestAnimationFrame(update);
}

function _handlePull() {
  if (!_meterActive) return;

  // Calculate accuracy (0-1)
  const centerStart = 50 - (_centerZone * 50);
  const centerEnd = 50 + (_centerZone * 50);
  const inZone = _meterPosition >= centerStart && _meterPosition <= centerEnd;

  let accuracy = 0;
  if (inZone) {
    // Perfect = center (50), worst = edge of zone
    const distFromCenter = Math.abs(_meterPosition - 50);
    const maxDistInZone = _centerZone * 50;
    accuracy = 1 - (distFromCenter / maxDistInZone);
  } else {
    // Outside zone - calculate miss distance
    const distFromZone = _meterPosition < centerStart
      ? (centerStart - _meterPosition)
      : (_meterPosition - centerEnd);
    accuracy = Math.max(0, 1 - (distFromZone / 50));
  }

  hideFishingMeter();

  if (_onCatchCallback) {
    _onCatchCallback(inZone, accuracy);
  }
}

// ── Catch Screen ──────────────────────────────────────────────────────

export function showCatchScreen(fish, onClose) {
  if (_catchPanel) return;

  _catchPanel = document.createElement('div');
  _catchPanel.id = 'fishing-catch-screen';
  _catchPanel.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 500px;
    background: rgba(13, 36, 40, 0.95);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    border-top-left-radius: 6px;
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.22), 0 12px 48px rgba(0, 0, 0, 0.6);
    padding: 32px;
    text-align: center;
    animation: slideUp 0.4s ease;
  `;

  // Title
  const title = document.createElement('h2');
  title.textContent = 'כל הכבוד!';
  title.style.cssText = `
    font-family: Fredoka, sans-serif;
    font-size: 36px;
    color: #F0B429;
    margin: 0 0 16px 0;
    text-shadow: 0 3px 6px rgba(0, 0, 0, 0.8);
  `;
  panel.appendChild(title);

  // Fish name
  const fishName = document.createElement('div');
  fishName.textContent = `תפסת ${fish.nameHe}!`;
  fishName.style.cssText = `
    font-family: Heebo, sans-serif;
    font-size: 24px;
    color: #F4E7C3;
    margin-bottom: 24px;
  `;
  panel.appendChild(fishName);

  // Fish card
  const card = document.createElement('div');
  card.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border: 3px solid ${RARITY_CONFIG[fish.rarity].color};
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 0 20px ${RARITY_CONFIG[fish.rarity].color}40;
  `;

  // Fish SVG (procedural)
  const svg = _generateFishSVG(fish);
  card.appendChild(svg);

  // Rarity badge
  const rarityBadge = document.createElement('div');
  rarityBadge.textContent = RARITY_CONFIG[fish.rarity].nameHe;
  rarityBadge.style.cssText = `
    display: inline-block;
    margin-top: 16px;
    padding: 6px 16px;
    background: ${RARITY_CONFIG[fish.rarity].color};
    color: #2C3E50;
    font-family: Fredoka, sans-serif;
    font-size: 14px;
    border-radius: 20px;
    font-weight: bold;
  `;
  card.appendChild(rarityBadge);

  // Price
  const price = document.createElement('div');
  price.textContent = `שווי: ${fish.price} 🪙`;
  price.style.cssText = `
    font-family: Fredoka, sans-serif;
    font-size: 18px;
    color: #F0B429;
    margin-top: 12px;
  `;
  card.appendChild(price);

  panel.appendChild(card);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'המשך';
  closeBtn.style.cssText = `
    width: 100%;
    padding: 14px;
    background: #7ACB5E;
    border: 2px solid #5AAB3E;
    border-radius: 8px;
    color: #2C3E50;
    font-size: 18px;
    font-family: Fredoka, sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(122, 203, 94, 0.4);
  `;
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#8FDB73';
    closeBtn.style.transform = 'scale(1.02)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = '#7ACB5E';
    closeBtn.style.transform = 'scale(1)';
  });
  closeBtn.addEventListener('click', () => {
    hideCatchScreen();
    if (onClose) onClose();
  });
  panel.appendChild(closeBtn);

  _catchPanel.appendChild(panel);
  document.body.appendChild(_catchPanel);

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(40px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

export function hideCatchScreen() {
  if (_catchPanel && _catchPanel.parentNode) {
    _catchPanel.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => {
      if (_catchPanel && _catchPanel.parentNode) {
        _catchPanel.parentNode.removeChild(_catchPanel);
      }
      _catchPanel = null;
    }, 200);
  }
}

// ── Fish SVG Generation ───────────────────────────────────────────────

function _generateFishSVG(fish) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '200');
  svg.setAttribute('height', '120');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.style.cssText = 'display: block; margin: 0 auto;';

  const colors = fish.colors;

  // Body (ellipse)
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  body.setAttribute('cx', '100');
  body.setAttribute('cy', '60');
  body.setAttribute('rx', '60');
  body.setAttribute('ry', '35');
  body.setAttribute('fill', colors.body);
  body.setAttribute('stroke', colors.stripe);
  body.setAttribute('stroke-width', '2');
  svg.appendChild(body);

  // Tail fin (triangle)
  const tail = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  tail.setAttribute('points', '40,60 10,40 10,80');
  tail.setAttribute('fill', colors.fin);
  tail.setAttribute('stroke', colors.stripe);
  tail.setAttribute('stroke-width', '2');
  svg.appendChild(tail);

  // Dorsal fin (top)
  const dorsal = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  dorsal.setAttribute('points', '100,25 80,10 120,10');
  dorsal.setAttribute('fill', colors.fin);
  dorsal.setAttribute('stroke', colors.stripe);
  dorsal.setAttribute('stroke-width', '2');
  svg.appendChild(dorsal);

  // Stripes (decorative)
  for (let i = 0; i < 3; i++) {
    const stripe = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    stripe.setAttribute('x1', `${80 + i * 15}`);
    stripe.setAttribute('y1', '35');
    stripe.setAttribute('x2', `${80 + i * 15}`);
    stripe.setAttribute('y2', '85');
    stripe.setAttribute('stroke', colors.stripe);
    stripe.setAttribute('stroke-width', '2');
    stripe.setAttribute('opacity', '0.6');
    svg.appendChild(stripe);
  }

  // Eye
  const eye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  eye.setAttribute('cx', '140');
  eye.setAttribute('cy', '50');
  eye.setAttribute('r', '5');
  eye.setAttribute('fill', '#2C3E50');
  svg.appendChild(eye);

  return svg;
}

// ── Escape Screen ─────────────────────────────────────────────────────

export function showEscapeScreen(onClose) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(13, 36, 40, 0.95);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    border: 3px solid #E85A4A;
    padding: 32px;
    z-index: 10002;
    text-align: center;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
    animation: shake 0.5s ease;
  `;

  const text = document.createElement('div');
  text.textContent = 'הדג ברח! 🐟💨';
  text.style.cssText = `
    font-family: Fredoka, sans-serif;
    font-size: 28px;
    color: #E85A4A;
    margin-bottom: 16px;
  `;
  panel.appendChild(text);

  const subtext = document.createElement('div');
  subtext.textContent = 'נסה שוב!';
  subtext.style.cssText = `
    font-family: Heebo, sans-serif;
    font-size: 18px;
    color: #F4E7C3;
    opacity: 0.8;
  `;
  panel.appendChild(subtext);

  document.body.appendChild(panel);

  // Shake animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
      25% { transform: translate(-50%, -50%) rotate(-5deg); }
      75% { transform: translate(-50%, -50%) rotate(5deg); }
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    if (onClose) onClose();
  }, 2000);
}
