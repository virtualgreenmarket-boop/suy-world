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

export function initCollision() {
  // Wall colliders are derived directly from HANGAR_DIMS/HANGAR_CONFIGS (hangars.js)
  // so they always match the real geometry, even when hangars are resized per-hangar.
  const boxCountBefore = boxes.length;
  HANGAR_CONFIGS.forEach(({ x, z, rotY }, i) => {
    const { W, D } = HANGAR_DIMS[i];
    addHangar(x, z, rotY, W / 2, D / 2);
  });
  console.log(`[collision] Total boxes: ${boxes.length} (${boxCountBefore} from kiosks, ${boxes.length - boxCountBefore} from hangar walls)`);

  // DEBUG: Print all boxes in the Z=-100 to Z=0 range (approach to North Hangar)
  console.log('[collision] DEBUG: Boxes between Z=0 and Z=-100:');
  boxes.forEach((box, i) => {
    if (box.minZ <= 0 && box.maxZ >= -100) {
      console.log(`  Box ${i}: X[${box.minX.toFixed(1)}, ${box.maxX.toFixed(1)}] Z[${box.minZ.toFixed(1)}, ${box.maxZ.toFixed(1)}]`);
    }
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
 * Returns [rx, rz] — new position after sliding against walls.
 * Tries X-only and Z-only slides before fully blocking movement.
 */
export function registerBox(minX, maxX, minZ, maxZ) {
  boxes.push({ minX, maxX, minZ, maxZ });
}

export function resolveCollision(nx, nz, oldX, oldZ) {
  if (!collidesAny(nx, nz)) return [nx, nz];
  if (!collidesAny(nx, oldZ)) return [nx, oldZ];
  if (!collidesAny(oldX, nz)) return [oldX, nz];
  return [oldX, oldZ];
}
