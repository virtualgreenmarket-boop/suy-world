// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fishing System Data & Logic
// ═══════════════════════════════════════════════════════════════════════

// ── Fish Data (20 fish, sorted by rarity) ─────────────────────────────

export const FISH_DATA = [
  // Common (rod 1+)
  { id: 'sardine', nameHe: 'סרדין', rarity: 'common', price: 1, minRod: 1, colors: { body: '#8CB4D4', fin: '#6A92B8', stripe: '#5B82A8' } },
  { id: 'anchovy', nameHe: 'אנשובי', rarity: 'common', price: 2, minRod: 1, colors: { body: '#A3C8E1', fin: '#7FA9C9', stripe: '#6891B1' } },
  { id: 'redMullet', nameHe: 'מולית אדומה', rarity: 'common', price: 3, minRod: 1, colors: { body: '#E87A73', fin: '#D65A53', stripe: '#C44A43' } },
  { id: 'mackerel', nameHe: 'מקרל', rarity: 'common', price: 3, minRod: 1, colors: { body: '#5A8CA8', fin: '#406C88', stripe: '#2E5468' } },
  { id: 'seaBream', nameHe: 'דניס', rarity: 'common', price: 4, minRod: 1, colors: { body: '#D4A57A', fin: '#B4855A', stripe: '#94653A' } },
  { id: 'seaBass', nameHe: 'לברק', rarity: 'common', price: 5, minRod: 1, colors: { body: '#8DA6B8', fin: '#6D86A8', stripe: '#4D6688' } },
  { id: 'trumpetfish', nameHe: 'דג חצוצרה', rarity: 'common', price: 6, minRod: 1, colors: { body: '#F0B469', fin: '#D09449', stripe: '#B07429' } },

  // Uncommon (rod 1+)
  { id: 'pufferfish', nameHe: 'אבו נפחא', rarity: 'uncommon', price: 8, minRod: 1, colors: { body: '#F4E7A3', fin: '#D4C783', stripe: '#B4A763' } },
  { id: 'clownfish', nameHe: 'דג ליצן', rarity: 'uncommon', price: 10, minRod: 1, colors: { body: '#FF6B4A', fin: '#E04B2A', stripe: '#FFFFFF' } },
  { id: 'rainbowfish', nameHe: 'דג קשת', rarity: 'uncommon', price: 11, minRod: 1, colors: { body: '#7ACB5E', fin: '#5AAB3E', stripe: '#F0B429' } },
  { id: 'angelfish', nameHe: 'דג מלאך', rarity: 'uncommon', price: 12, minRod: 1, colors: { body: '#FFD54F', fin: '#F0B429', stripe: '#2C3E50' } },
  { id: 'blueTang', nameHe: 'טאנג כחול', rarity: 'uncommon', price: 14, minRod: 1, colors: { body: '#4DD0E1', fin: '#2CB0C1', stripe: '#1C90A1' } },
  { id: 'parrotfish', nameHe: 'דג תוכי', rarity: 'uncommon', price: 16, minRod: 1, colors: { body: '#81C784', fin: '#5FA762', stripe: '#4E8751' } },

  // Rare (rod 2+)
  { id: 'coralTrout', nameHe: 'דקר אלמוגים', rarity: 'rare', price: 20, minRod: 2, colors: { body: '#E85A4A', fin: '#C83A2A', stripe: '#A81A0A' } },
  { id: 'barracuda', nameHe: 'ברקודה', rarity: 'rare', price: 24, minRod: 2, colors: { body: '#5C7A8A', fin: '#3C5A6A', stripe: '#2C3A4A' } },
  { id: 'moonfish', nameHe: 'דג ירח', rarity: 'rare', price: 28, minRod: 2, colors: { body: '#E8D4C4', fin: '#C8B4A4', stripe: '#A89484' } },
  { id: 'napoleonfish', nameHe: 'דג נפוליאון', rarity: 'rare', price: 32, minRod: 2, colors: { body: '#64B5F6', fin: '#4495D6', stripe: '#2475B6' } },

  // Epic (rod 3+)
  { id: 'swordfish', nameHe: 'דג חרב', rarity: 'epic', price: 38, minRod: 3, colors: { body: '#2C3E50', fin: '#1C2E40', stripe: '#0C1E30' } },
  { id: 'bluefinTuna', nameHe: 'טונה כחולת-סנפיר', rarity: 'epic', price: 42, minRod: 3, colors: { body: '#1E3A5F', fin: '#0E2A4F', stripe: '#041A3F' } },

  // Legendary (rod 4)
  { id: 'goldenSuy', nameHe: 'דג הזהב של SUY', rarity: 'legendary', price: 50, minRod: 4, colors: { body: '#F0B429', fin: '#D09409', stripe: '#FFD700' } }
];

// ── Rod Data (4 tiers) ────────────────────────────────────────────────

export const ROD_DATA = [
  { id: 'wood', nameHe: 'חכת עץ', price: 100, centerZone: 0.26, meterSpeed: 1.0, maxRarity: 'uncommon', tier: 1 },
  { id: 'fiberglass', nameHe: 'חכת פיברגלס', price: 400, centerZone: 0.30, meterSpeed: 0.9, maxRarity: 'rare', tier: 2 },
  { id: 'carbon', nameHe: 'חכת קרבון', price: 1000, centerZone: 0.34, meterSpeed: 0.8, maxRarity: 'epic', tier: 3 },
  { id: 'golden', nameHe: 'חכת הזהב', price: 2000, centerZone: 0.40, meterSpeed: 0.7, maxRarity: 'legendary', tier: 4 }
];

// ── Bait Data (3 types) ───────────────────────────────────────────────

export const BAIT_DATA = [
  { id: 'worm', nameHe: 'תולעת', price: 1, effect: 'base' },
  { id: 'shrimp', nameHe: 'שרימפס', price: 4, effect: 'rare' },
  { id: 'squid', nameHe: 'קלמארי', price: 10, effect: 'epic' }
];

// ── Rarity Config ─────────────────────────────────────────────────────

export const RARITY_CONFIG = {
  common: { weight: 62, color: '#8DA6B8', nameHe: 'רגיל' },
  uncommon: { weight: 24, color: '#81C784', nameHe: 'לא שכיח' },
  rare: { weight: 10, color: '#64B5F6', nameHe: 'נדיר' },
  epic: { weight: 3.5, color: '#BA68C8', nameHe: 'אפי' },
  legendary: { weight: 0.5, color: '#F0B429', nameHe: 'אגדי' }
};

// ── Player State (managed by server, cached on client) ────────────────

let _playerInventory = {
  ownedRods: ['wood'], // Start with basic rod
  currentRod: 'wood',
  baits: { worm: 0, shrimp: 0, squid: 0 },
  caughtFish: [] // [{fishId, timestamp}, ...]
};

export function getPlayerInventory() {
  return _playerInventory;
}

export function setPlayerInventory(data) {
  _playerInventory = { ..._playerInventory, ...data };
}

export function getCurrentRod() {
  const rodId = _playerInventory.currentRod;
  return ROD_DATA.find(r => r.id === rodId) || ROD_DATA[0];
}

export function hasRod(rodId) {
  return _playerInventory.ownedRods.includes(rodId);
}

export function hasBait(baitId) {
  return (_playerInventory.baits[baitId] || 0) > 0;
}

export function getBaitCount(baitId) {
  return _playerInventory.baits[baitId] || 0;
}

export function addCaughtFish(fishId) {
  _playerInventory.caughtFish.push({ fishId, timestamp: Date.now() });
}

export function getCaughtFish() {
  return _playerInventory.caughtFish;
}

export function removeCaughtFish(index) {
  if (index >= 0 && index < _playerInventory.caughtFish.length) {
    _playerInventory.caughtFish.splice(index, 1);
  }
}

// ── Fish Selection Logic ──────────────────────────────────────────────

export function selectFish(rodTier, baitEffect, accuracy) {
  // Build pool based on rod tier
  const availableFish = FISH_DATA.filter(f => f.minRod <= rodTier);

  // Calculate weights
  const weights = availableFish.map(fish => {
    let weight = RARITY_CONFIG[fish.rarity].weight;

    // Bait modifiers
    if (baitEffect === 'rare' && fish.rarity === 'rare') weight *= 2;
    if (baitEffect === 'epic' && fish.rarity === 'epic') weight *= 3;
    if (baitEffect === 'epic' && fish.rarity === 'legendary') weight *= 4;

    // Accuracy bonus (>90% = 1.5x for rare+)
    if (accuracy > 0.9 && ['rare', 'epic', 'legendary'].includes(fish.rarity)) {
      weight *= 1.5;
    }

    return weight;
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < availableFish.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return availableFish[i];
    }
  }

  return availableFish[0]; // Fallback
}

// ── Helper Functions ──────────────────────────────────────────────────

export function getFishById(fishId) {
  return FISH_DATA.find(f => f.id === fishId);
}

export function getRodById(rodId) {
  return ROD_DATA.find(r => r.id === rodId);
}

export function getBaitById(baitId) {
  return BAIT_DATA.find(b => b.id === baitId);
}

export function getRarityMaxForRod(rodId) {
  const rod = getRodById(rodId);
  return rod ? rod.maxRarity : 'common';
}

// ── Active Fishing State ──────────────────────────────────────────────

let _activeFishing = false;
let _currentBait = null;

export function startFishing(baitId) {
  if (_activeFishing) return false;
  if (!hasBait(baitId)) return false;

  _activeFishing = true;
  _currentBait = baitId;
  return true;
}

export function endFishing() {
  _activeFishing = false;
  _currentBait = null;
}

export function isActiveFishing() {
  return _activeFishing;
}

export function getCurrentBait() {
  return _currentBait;
}

export function consumeCurrentBait() {
  if (!_currentBait) return;

  // Decrease bait count locally
  if (_playerInventory.baits[_currentBait] > 0) {
    _playerInventory.baits[_currentBait]--;
  }
}

// ── Initialization ────────────────────────────────────────────────────

export function initFishingSystem() {
  console.log('[fishing] System initialized');
  console.log('[fishing] Fish data loaded:', FISH_DATA.length, 'species');
  console.log('[fishing] Rod data loaded:', ROD_DATA.length, 'tiers');
  console.log('[fishing] Bait data loaded:', BAIT_DATA.length, 'types');
}
