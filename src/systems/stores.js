import * as THREE from 'three';
import { allSlots } from '../world/hangars.js';
import { showSlotLabel, hideSlotLabel } from '../ui/hud.js';

const HIGHLIGHT_DIST  = 6.5;
const HIGHLIGHT_COLOR = new THREE.Color(0.28, 0.28, 0.0);  // warm yellow emissive
const DEFAULT_COLOR   = new THREE.Color(0, 0, 0);
const HANGAR_LETTERS = ['N', 'C', 'S'];  // North, Center, South

let currentSlot = null;
let _stallsData = {};  // Map of "hangar-number" → { name, taken }

// Update stalls data from server
export function setStallsData(stallsData) {
  try {
    _stallsData = stallsData || {};
  } catch (err) {
    console.error('[stores] Error setting stalls data:', err);
  }
}

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
    try {
      // Get stall ID with hangar letter (N15, C3, S22, etc.)
      const hangarLetter = HANGAR_LETTERS[nearest.hangarIndex] || '?';
      const stallNumber = nearest.slotIndex + 1; // slotIndex is 0-based, display is 1-based
      const stallId = `${hangarLetter}${stallNumber}`;

      // Check if this stall is rented
      const hangarNames = ['north', 'east', 'south'];
      const internalHangar = hangarNames[nearest.hangarIndex];
      const dataKey = `${internalHangar}-${stallNumber}`;
      const stallData = _stallsData[dataKey];

      let label;
      if (stallData && stallData.taken && stallData.name) {
        // Rented: show shop name
        label = `${stallId}  ·  ${stallData.name}`;
      } else {
        // Free: show FOR RENT
        label = `${stallId}  ·  להשכרה`;  // "FOR RENT" in Hebrew
      }

      showSlotLabel(label);
    } catch (err) {
      console.error('[stores] Error showing slot label:', err);
      showSlotLabel(`Slot #${nearest.id + 1}  ·  FOR RENT`);
    }
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
