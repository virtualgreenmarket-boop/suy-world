// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fishing Rod 3D Model (Procedural)
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

const ROD_COLORS = {
  wood: 0xC98F14,
  fiberglass: 0xC9D4D8,
  carbon: 0x0D2428,
  golden: 0xF0B429
};

/**
 * Create a procedural 3D fishing rod
 * @param {string} rodId - 'wood' | 'fiberglass' | 'carbon' | 'golden'
 * @returns {THREE.Group} Rod model
 */
export function createFishingRod(rodId = 'wood') {
  const group = new THREE.Group();
  const rodColor = ROD_COLORS[rodId] || ROD_COLORS.wood;

  // Rod pole (long cylinder, angled)
  const poleGeometry = new THREE.CylinderGeometry(0.02, 0.015, 1.6, 8);
  const poleMaterial = new THREE.MeshLambertMaterial({ color: rodColor });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 0.8; // Center at middle of rod
  pole.rotation.z = Math.PI / 4; // 45 degree angle
  group.add(pole);

  // Handle (darker, thicker section at bottom)
  const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
  const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x3a2817 });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(-0.18, 0.18, 0); // Bottom of pole
  handle.rotation.z = Math.PI / 4;
  group.add(handle);

  // Reel (small box)
  const reelGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.06);
  const reelMaterial = new THREE.MeshLambertMaterial({ color: rodColor });
  const reel = new THREE.Mesh(reelGeometry, reelMaterial);
  reel.position.set(0, 0.4, 0);
  reel.rotation.z = Math.PI / 4;
  group.add(reel);

  // Fishing line (thin line from tip)
  const linePoints = [
    new THREE.Vector3(0.57, 1.13, 0), // Tip of rod
    new THREE.Vector3(0.65, 1.21, 0), // Slightly forward
    new THREE.Vector3(0.70, 1.25, 0)  // End point
  ];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: rodId === 'carbon' ? 0x147A82 : rodColor,
    linewidth: 1
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  group.add(line);

  // Accent for carbon/golden
  if (rodId === 'carbon' || rodId === 'golden') {
    const accentColor = rodId === 'carbon' ? 0x147A82 : 0xFFD700;
    const accentGeometry = new THREE.CylinderGeometry(0.018, 0.013, 1.6, 8);
    const accentMaterial = new THREE.MeshLambertMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.3
    });
    const accent = new THREE.Mesh(accentGeometry, accentMaterial);
    accent.position.y = 0.8;
    accent.rotation.z = Math.PI / 4;
    group.add(accent);
  }

  // Scale down to reasonable size
  group.scale.setScalar(0.6);

  return group;
}

/**
 * Attach fishing rod to player's right hand
 * @param {THREE.Group} playerGroup - Player group
 * @param {string} rodId - Rod type
 * @returns {THREE.Group|null} Attached rod or null if failed
 */
export function attachRodToPlayer(playerGroup, rodId) {
  try {
    if (!playerGroup || !playerGroup.userData._charModel) {
      console.warn('[fishingRodModel] No character model found');
      return null;
    }

    const rod = createFishingRod(rodId);
    const charModel = playerGroup.userData._charModel;

    // Try to find right hand bone
    let handBone = null;
    charModel.traverse(child => {
      if (child.isBone) {
        const name = child.name.toLowerCase();
        if (name.includes('hand') && name.includes('right') ||
            name.includes('r_hand') ||
            name.includes('righthand')) {
          handBone = child;
        }
      }
    });

    if (handBone) {
      // Attach to hand bone
      rod.position.set(0, 0.1, 0);
      rod.rotation.set(0, 0, -Math.PI / 6);
      handBone.add(rod);
      console.log('[fishingRodModel] Rod attached to hand bone:', handBone.name);
    } else {
      // Fallback: attach to bodyG with hand offset
      console.warn('[fishingRodModel] No hand bone found, using bodyG fallback');
      let bodyG = null;
      charModel.traverse(child => {
        if (child.name === 'bodyG' || (child.isGroup && child.children.length > 5)) {
          bodyG = child;
        }
      });

      if (bodyG) {
        rod.position.set(0.3, 0.8, 0.2); // Right hand approximate position
        rod.rotation.set(0, Math.PI / 4, -Math.PI / 6);
        bodyG.add(rod);
        console.log('[fishingRodModel] Rod attached to bodyG fallback');
      } else {
        console.error('[fishingRodModel] Could not find attachment point');
        return null;
      }
    }

    rod.userData.isRod = true;
    return rod;

  } catch (err) {
    console.error('[fishingRodModel] Failed to attach rod:', err);
    return null;
  }
}

/**
 * Remove fishing rod from player
 * @param {THREE.Group} playerGroup - Player group
 */
export function removeRodFromPlayer(playerGroup) {
  try {
    if (!playerGroup || !playerGroup.userData._charModel) return;

    const charModel = playerGroup.userData._charModel;
    const rodsToRemove = [];

    charModel.traverse(child => {
      if (child.userData.isRod) {
        rodsToRemove.push(child);
      }
    });

    rodsToRemove.forEach(rod => {
      if (rod.parent) {
        rod.parent.remove(rod);
      }
    });

    console.log('[fishingRodModel] Removed', rodsToRemove.length, 'rods');
  } catch (err) {
    console.error('[fishingRodModel] Failed to remove rod:', err);
  }
}
