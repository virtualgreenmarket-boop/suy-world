// Axis-aligned wall collision for hangar interiors.
// Walls are stored as world-space AABBs; works because hangars only use 90° rotations.

const boxes = [];
const PLAYER_R = 0.55;

// Hangar geometry constants (must match hangars.js) - updated for 35% larger hangars
const HW  = 36.45;  // W/2  = 72.9/2 (was 27, 54/2)
const HD  = 63.45;  // D/2  = 126.9/2 (was 47, 94/2)
const TH  = 0.35;   // wall half-thickness (wall is 0.6 thick)
const OPN = 6;      // far-wall door half-opening (door is 12 m wide)

export function initCollision() {
  addHangar(  0, -165.5,  0);           // North (10m closer to plaza)
  addHangar(165.5,    0, -Math.PI / 2); // Center (10m closer to plaza)
  addHangar(  0,  165.5,  Math.PI);     // South (10m closer to plaza)
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

function addHangar(cx, cz, ry) {
  // Left wall (local x ≈ −HW, spanning full depth)
  addRotBox(-HW - TH, -HD, -HW + TH,  HD, cx, cz, ry);
  // Right wall
  addRotBox( HW - TH, -HD,  HW + TH,  HD, cx, cz, ry);
  // Far wall — left of opening
  addRotBox(-HW, -HD - TH, -OPN, -HD + TH, cx, cz, ry);
  // Far wall — right of opening
  addRotBox( OPN, -HD - TH,  HW, -HD + TH, cx, cz, ry);
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
