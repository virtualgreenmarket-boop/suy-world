// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fishing Icons (Procedural SVG)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate procedural SVG icon for fishing rod
 * @param {string} rodId - 'wood' | 'fiberglass' | 'carbon' | 'golden'
 * @returns {string} SVG data URL
 */
export function generateRodIcon(rodId) {
  const colors = {
    wood: '#C98F14',
    fiberglass: '#C9D4D8',
    carbon: '#0D2428',
    golden: '#F0B429'
  };

  const color = colors[rodId] || colors.wood;
  const hasAccent = rodId === 'carbon' || rodId === 'golden';
  const accentColor = rodId === 'carbon' ? '#147A82' : '#FFD700';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <!-- Rod pole (diagonal) -->
      <line x1="12" y1="52" x2="52" y2="12" stroke="${color}" stroke-width="3" stroke-linecap="round"/>

      <!-- Handle (dark section at bottom) -->
      <line x1="12" y1="52" x2="20" y2="44" stroke="#3a2817" stroke-width="4" stroke-linecap="round"/>

      <!-- Reel (small box) -->
      <rect x="22" y="34" width="8" height="6" fill="${color}" stroke="#2a2010" stroke-width="1" rx="1"/>

      <!-- Fishing line -->
      <path d="M 52 12 Q 56 8, 60 6" stroke="${hasAccent ? accentColor : color}" stroke-width="1" fill="none"/>

      ${hasAccent ? `
      <!-- Accent line for carbon/golden -->
      <line x1="28" y1="36" x2="48" y2="16" stroke="${accentColor}" stroke-width="1" opacity="0.6"/>
      ` : ''}

      ${rodId === 'golden' ? `
      <!-- Sparkle for golden rod -->
      <circle cx="48" cy="16" r="2" fill="#FFD700" opacity="0.8"/>
      <circle cx="40" cy="24" r="1.5" fill="#FFF" opacity="0.6"/>
      ` : ''}
    </svg>
  `;

  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Generate procedural SVG icon for bait
 * @param {string} baitId - 'worm' | 'shrimp' | 'squid'
 * @returns {string} SVG data URL
 */
export function generateBaitIcon(baitId) {
  let svg = '';

  if (baitId === 'worm') {
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <!-- Worm body (wavy line) -->
        <path d="M 20 40 Q 25 35, 30 38 T 40 36 T 44 40"
              stroke="#D85A30" stroke-width="4" stroke-linecap="round" fill="none"/>
        <circle cx="20" cy="40" r="2.5" fill="#3a2817"/>
        <circle cx="44" cy="40" r="2.5" fill="#3a2817"/>
      </svg>
    `;
  } else if (baitId === 'shrimp') {
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <!-- Shrimp body (curved) -->
        <ellipse cx="32" cy="34" rx="10" ry="14" fill="#FF8C69" stroke="#D85A30" stroke-width="1.5"/>
        <!-- Tail -->
        <path d="M 32 48 L 30 54 L 34 54 Z" fill="#FF8C69" stroke="#D85A30" stroke-width="1"/>
        <!-- Segments -->
        <line x1="26" y1="28" x2="38" y2="28" stroke="#D85A30" stroke-width="1" opacity="0.6"/>
        <line x1="26" y1="34" x2="38" y2="34" stroke="#D85A30" stroke-width="1" opacity="0.6"/>
        <line x1="26" y1="40" x2="38" y2="40" stroke="#D85A30" stroke-width="1" opacity="0.6"/>
        <!-- Eyes -->
        <circle cx="28" cy="22" r="1.5" fill="#2a2010"/>
        <circle cx="36" cy="22" r="1.5" fill="#2a2010"/>
      </svg>
    `;
  } else if (baitId === 'squid') {
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <!-- Squid mantle (triangle-ish) -->
        <ellipse cx="32" cy="28" rx="12" ry="10" fill="#E8A4C4" stroke="#D85A98" stroke-width="1.5"/>
        <!-- Tentacles (4 lines) -->
        <line x1="26" y1="38" x2="24" y2="50" stroke="#D85A98" stroke-width="2" stroke-linecap="round"/>
        <line x1="30" y1="38" x2="28" y2="52" stroke="#D85A98" stroke-width="2" stroke-linecap="round"/>
        <line x1="34" y1="38" x2="36" y2="52" stroke="#D85A98" stroke-width="2" stroke-linecap="round"/>
        <line x1="38" y1="38" x2="40" y2="50" stroke="#D85A98" stroke-width="2" stroke-linecap="round"/>
        <!-- Eyes -->
        <circle cx="28" cy="26" r="2" fill="#2a2010"/>
        <circle cx="36" cy="26" r="2" fill="#2a2010"/>
      </svg>
    `;
  }

  return 'data:image/svg+xml;base64,' + btoa(svg);
}
