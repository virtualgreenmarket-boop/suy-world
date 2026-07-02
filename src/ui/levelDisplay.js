// Level and EXP bar display UI

import { getCurrentLevel, getCurrentEXP, getEXPToNextLevel } from '../systems/leveling.js';

export function initLevelDisplay() {
  const container = document.createElement('div');
  container.className = 'level-display-container';
  container.innerHTML = `
    <div class="level-badge">
      <div class="level-icon">⭐</div>
      <div id="player-level-display" class="level-number">Level 0</div>
    </div>
    <div class="exp-bar-container">
      <div class="exp-bar-background">
        <div id="player-exp-bar" class="exp-bar-fill"></div>
      </div>
      <div id="player-exp-text" class="exp-bar-text">0 / 10 EXP</div>
    </div>
  `;
  document.body.appendChild(container);

  // Update every second
  setInterval(() => {
    updateLevelDisplay();
  }, 1000);
}

export function updateLevelDisplay() {
  const levelDisplay = document.getElementById('player-level-display');
  const expBar = document.getElementById('player-exp-bar');
  const expText = document.getElementById('player-exp-text');

  if (!levelDisplay || !expBar || !expText) return;

  const level = getCurrentLevel();
  const currentExp = getCurrentEXP();
  const expToNext = getEXPToNextLevel();
  const totalRequired = currentExp + expToNext;
  const percentage = (currentExp / totalRequired) * 100;

  levelDisplay.textContent = `Level ${level}`;
  expBar.style.width = `${Math.min(100, percentage)}%`;
  expText.textContent = `${currentExp} / ${totalRequired} EXP`;
}
