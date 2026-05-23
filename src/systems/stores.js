import * as THREE from 'three';
import { allSlots } from '../world/hangars.js';
import { showSlotLabel, hideSlotLabel } from '../ui/hud.js';

const HIGHLIGHT_DIST  = 6.5;
const HIGHLIGHT_COLOR = new THREE.Color(0.28, 0.28, 0.0);  // warm yellow emissive
const DEFAULT_COLOR   = new THREE.Color(0, 0, 0);

let currentSlot = null;

export function updateStores(playerPos) {
  let nearest     = null;
  let nearestDist = Infinity;

  for (const slot of allSlots) {
    const dx   = playerPos.x - slot.worldPos.x;
    const dz   = playerPos.z - slot.worldPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < HIGHLIGHT_DIST && dist < nearestDist) {
      nearestDist = dist;
      nearest     = slot;
    }
  }

  if (nearest !== currentSlot) {
    if (currentSlot) dehighlight(currentSlot);
    if (nearest)     highlight(nearest);
    currentSlot = nearest;
  }

  if (nearest) {
    showSlotLabel(`Slot #${nearest.id + 1}  ·  FOR RENT`);
  } else {
    hideSlotLabel();
  }
}

function highlight(slot) {
  slot.signMesh.material.emissive = HIGHLIGHT_COLOR;
  slot.signMesh.material.emissiveIntensity = 1;
}

function dehighlight(slot) {
  slot.signMesh.material.emissive = DEFAULT_COLOR;
  slot.signMesh.material.emissiveIntensity = 0;
}
