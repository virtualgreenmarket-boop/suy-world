// Axis-aligned wall collision for hangar interiors.
// Walls are stored as world-space AABBs; works because hangars only use 90° rotations.
import { HANGAR_DIMS, HANGAR_CONFIGS } from '../world/hangars.js';

const boxes = [];
const PLAYER_R = 0.55;

const TH  = 0.35;   // wall half-thickness (wall is 0.6 thick)
const OPN = 6;       // far-wall door half-opening (door is 12 m wide)

// Clear all collision boxes (for cleanup before rebuild)
export function clearAllBoxes() {
  boxes.length = 0;
  console.log('[collision] Cleared all collision boxes');
}

// Clear only kiosk collision boxes (before rebuilding kiosks)
export function clearKioskBoxes() {
  const beforeCount = boxes.length;
  const kioskCount = boxes.filter(b => b.isKiosk).length;
  // Remove all boxes tagged as kiosk boxes
  for (let i = boxes.length - 1; i >= 0; i--) {
    if (boxes[i].isKiosk) {
      boxes.splice(i, 1);
    }
  }
  console.log(`[collision] Cleared ${kioskCount} kiosk boxes (${beforeCount} → ${boxes.length})`);
}

export function initCollision() {
  // Wall colliders are derived directly from HANGAR_DIMS/HANGAR_CONFIGS (hangars.js)
  // so they always match the real geometry, even when hangars are resized per-hangar.
  const boxCountBefore = boxes.length;
  HANGAR_CONFIGS.forEach(({ x, z, rotY }, i) => {
    const { W, D } = HANGAR_DIMS[i];
    addHangar(x, z, rotY, W / 2, D / 2);
  });
  console.log(`[collision] Total boxes: ${boxes.length} (${boxCountBefore} from kiosks, ${boxes.length - boxCountBefore} from hangar walls)`);

  // STEP 1: Print ALL collision boxes with position and size
  console.log('[collision] === ALL COLLISION BOXES ===');
  boxes.forEach((box, i) => {
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    const isKiosk = box.isKiosk ? ' [KIOSK]' : '';
    console.log(`[collision] Box ${i}: pos=(${centerX.toFixed(2)}, ${centerZ.toFixed(2)}) size=(${width.toFixed(2)}, ${depth.toFixed(2)}) X[${box.minX.toFixed(2)}, ${box.maxX.toFixed(2)}] Z[${box.minZ.toFixed(2)}, ${box.maxZ.toFixed(2)}]${isKiosk}`);
  });

  // STEP 2: Identify suspect boxes near entrance wall (Z between -85 and -115)
  console.log('[collision] === SUSPECT BOXES NEAR ENTRANCE (Z: -85 to -115) ===');
  const suspects = boxes.filter((box, i) => {
    const centerZ = (box.minZ + box.maxZ) / 2;
    return centerZ >= -115 && centerZ <= -85;
  });
  console.log(`[collision] Found ${suspects.length} boxes near entrance wall`);
  suspects.forEach((box, i) => {
    const globalIndex = boxes.indexOf(box);
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    const isKiosk = box.isKiosk ? ' [KIOSK]' : '';
    console.log(`[collision]   Suspect ${i} (box ${globalIndex}): pos=(${centerX.toFixed(2)}, ${centerZ.toFixed(2)}) size=(${width.toFixed(2)}, ${depth.toFixed(2)})${isKiosk}`);
  });
}

function rot(lx, lz, cx, cz, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [c * lx - s * lz + cx, s * lx + c * lz + cz];
}

function addRotBox(lx1, lz1, lx2, lz2, cx, cz, ry) {
  const corners = [
    rot(lx1, lz1, cx, cz, ry), rot(lx2, lz1, cx, cz, ry),
    rot(lx1, lz2, cx, cz, ry), rot(lx2, lz2, cx, cz, ry),
  ];
  boxes.push({
    minX: Math.min(...corners.map(c => c[0])),
    maxX: Math.max(...corners.map(c => c[0])),
    minZ: Math.min(...corners.map(c => c[1])),
    maxZ: Math.max(...corners.map(c => c[1])),
  });
}

function addHangar(cx, cz, ry, hw, hd) {
  // Left wall (local x ≈ −hw, spanning full depth)
  addRotBox(-hw - TH, -hd, -hw + TH,  hd, cx, cz, ry);
  // Right wall
  addRotBox( hw - TH, -hd,  hw + TH,  hd, cx, cz, ry);
  // Far wall — left of opening
  addRotBox(-hw, -hd - TH, -OPN, -hd + TH, cx, cz, ry);
  // Far wall — right of opening
  addRotBox( OPN, -hd - TH,  hw, -hd + TH, cx, cz, ry);
}

function collidesAny(x, z) {
  const r = PLAYER_R;
  return boxes.some(b =>
    x > b.minX - r && x < b.maxX + r &&
    z > b.minZ - r && z < b.maxZ + r
  );
}

/**
 * Register a collision box.
 * @param {number} minX
 * @param {number} maxX
 * @param {number} minZ
 * @param {number} maxZ
 * @param {boolean} isKiosk - Tag as kiosk box for cleanup
 */
export function registerBox(minX, maxX, minZ, maxZ, isKiosk = false) {
  boxes.push({ minX, maxX, minZ, maxZ, isKiosk });
}

export function resolveCollision(nx, nz, oldX, oldZ) {
  if (!collidesAny(nx, nz)) return [nx, nz];
  if (!collidesAny(nx, oldZ)) return [nx, oldZ];
  if (!collidesAny(oldX, nz)) return [oldX, nz];
  return [oldX, oldZ];
}
