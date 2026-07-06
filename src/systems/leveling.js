// Player leveling system with EXP tracking and rate limiting

const SAVE_KEY = 'suy_player_level';

let _currentLevel = 0;
let _currentEXP = 0;
let _dailyLimits = {
  npcChats: { count: 0, lastReset: Date.now() },      // 3 per hour
  steps: { count: 0, lastReset: Date.now() },          // 100 per hour for 10 EXP
  chatMessages: { count: 0, lastReset: Date.now() }    // 25 per day
};

// EXP required for each level (doubles each level)
function getRequiredEXP(level) {
  if (level === 0) return 10;
  return 10 * Math.pow(2, level);
}

// Initialize leveling system
export function initLeveling() {
  _loadProgress();
  _updateUI();
  console.log(`[leveling] Player level ${_currentLevel}, EXP: ${_currentEXP}/${getRequiredEXP(_currentLevel)}`);
}

// Load progress from localStorage
function _loadProgress() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      _currentLevel = parsed.level || 0;
      _currentEXP = parsed.exp || 0;
      _dailyLimits = parsed.limits || _dailyLimits;
    }
  } catch (err) {
    console.warn('[leveling] Failed to load progress:', err);
  }
}

// Save progress to localStorage
function _saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      level: _currentLevel,
      exp: _currentEXP,
      limits: _dailyLimits
    }));
  } catch (err) {
    console.warn('[leveling] Failed to save progress:', err);
  }
}

// Reset rate limit if period has elapsed
function _checkRateLimit(limitType, periodMs) {
  const limit = _dailyLimits[limitType];
  const now = Date.now();
  if (now - limit.lastReset >= periodMs) {
    limit.count = 0;
    limit.lastReset = now;
  }
}

// Add EXP and handle level-ups
function _addEXP(amount, source) {
  if (amount <= 0) return;

  _currentEXP += amount;
  console.log(`[leveling] +${amount} EXP from ${source} (total: ${_currentEXP})`);

  // Check for level up
  let leveledUp = false;
  while (_currentEXP >= getRequiredEXP(_currentLevel)) {
    _currentEXP -= getRequiredEXP(_currentLevel);
    _currentLevel++;
    leveledUp = true;
    console.log(`[leveling] 🎉 LEVEL UP! Now level ${_currentLevel}`);
    _showLevelUpNotification();
  }

  _saveProgress();
  _updateUI();

  return leveledUp;
}

// Show level-up notification
function _showLevelUpNotification() {
  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-icon">⭐</div>
      <div class="level-up-text">LEVEL UP!</div>
      <div class="level-up-level">Level ${_currentLevel}</div>
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Update UI display - now calls the UI module directly
function _updateUI() {
  // Call the external UI update function if available
  if (window.updateLevelDisplayNow) {
    window.updateLevelDisplayNow();
    return;
  }

  // Fallback: direct DOM update (for backwards compatibility)
  const levelDisplay = document.getElementById('player-level-display');
  const expBar = document.getElementById('player-exp-bar');
  const expText = document.getElementById('player-exp-text');

  if (levelDisplay) {
    levelDisplay.textContent = `Level ${_currentLevel}`;
  }

  if (expBar) {
    const required = getRequiredEXP(_currentLevel);
    const percentage = (_currentEXP / required) * 100;
    expBar.style.width = `${Math.min(100, percentage)}%`;
  }

  if (expText) {
    const required = getRequiredEXP(_currentLevel);
    expText.textContent = `${_currentEXP} / ${required} EXP`;
  }
}

// ── EXP Sources ───────────────────────────────────────────────────────

// NPC chat: 4 EXP, max 3 per hour
export function awardNPCChatEXP(npcName) {
  _checkRateLimit('npcChats', 60 * 60 * 1000); // 1 hour

  if (_dailyLimits.npcChats.count >= 3) {
    console.log('[leveling] NPC chat EXP limit reached (3/hour)');
    return false;
  }

  _dailyLimits.npcChats.count++;
  _addEXP(4, `NPC chat with ${npcName}`);
  _saveProgress();
  return true;
}

// Steps: 10 EXP per 100 steps, max 100 steps per hour
export function awardStepEXP(steps) {
  _checkRateLimit('steps', 60 * 60 * 1000); // 1 hour

  const remaining = Math.max(0, 100 - _dailyLimits.steps.count);
  const countable = Math.min(steps, remaining);

  if (countable === 0) {
    console.log('[leveling] Step EXP limit reached (100/hour)');
    return;
  }

  _dailyLimits.steps.count += countable;

  // Award 10 EXP per 100 steps
  const expAmount = Math.floor((countable / 100) * 10);
  if (expAmount > 0) {
    _addEXP(expAmount, `${countable} steps`);
  }

  _saveProgress();
}

// Purchase: 1 EXP per coin spent
export function awardPurchaseEXP(coinAmount) {
  if (coinAmount <= 0) return;
  _addEXP(coinAmount, `purchase (${coinAmount} coins)`);
}

// Chat message: 1 EXP, max 25 per day
export function awardChatMessageEXP() {
  _checkRateLimit('chatMessages', 24 * 60 * 60 * 1000); // 1 day

  if (_dailyLimits.chatMessages.count >= 25) {
    console.log('[leveling] Chat message EXP limit reached (25/day)');
    return false;
  }

  _dailyLimits.chatMessages.count++;
  _addEXP(1, 'chat message');
  _saveProgress();
  return true;
}

// ── Getters ───────────────────────────────────────────────────────────

export function getCurrentLevel() {
  return _currentLevel;
}

export function getCurrentEXP() {
  return _currentEXP;
}

export function getEXPToNextLevel() {
  return getRequiredEXP(_currentLevel) - _currentEXP;
}

export function getLimitsStatus() {
  return {
    npcChats: `${_dailyLimits.npcChats.count}/3 per hour`,
    steps: `${_dailyLimits.steps.count}/100 per hour`,
    chatMessages: `${_dailyLimits.chatMessages.count}/25 per day`
  };
}

export function getRequiredEXPForLevel(level) {
  return getRequiredEXP(level);
}
