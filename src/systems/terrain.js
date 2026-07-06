import * as THREE from 'three';

// Shared terrain height query — used by player step-up, animal navigation,
// remote player interpolation, and NPC placement.

export const PLAZA_HALF    = 41;
export const PLAZA_SURFACE = 0.7;
export const PATH_SURFACE  = 0.2;
export const PATH_HALF_W   = 4.7;

const _meshes = [];
const _cache  = new Map();
const CELL    = 0.5;   // grid resolution for the height cache (metres)

const _origin = new THREE.Vector3();
const _down   = new THREE.Vector3(0, -1, 0);
const _ray    = new THREE.Raycaster();

/**
 * Register walkable meshes (or Groups) so getSurfaceY can raycast against them.
 * Call immediately after adding each ground/floor mesh to the scene.
 * Clears the height cache so stale values are never returned.
 */
export function registerGround(...objects) {
  for (const obj of objects) {
    obj.updateWorldMatrix(true, true);
    obj.traverse(n => { if (n.isMesh) _meshes.push(n); });
  }
  _cache.clear();
}

/**
 * Returns the world-space Y of the topmost walkable surface at (x, z).
 * Uses a downward raycast against registered meshes, with an analytical
 * fallback for areas where no mesh has been registered yet.
 * Results are cached on a 0.5 m grid — safe because terrain is static.
 */
export function getSurfaceY(x, z, currentY = 0) {
  // Check lighthouse stairs/deck first (dynamic height based on angle/position)
  if (window._getLighthouseHeight) {
    const lighthouseY = window._getLighthouseHeight(x, z, currentY);
    if (lighthouseY !== null) {
      // DEBUG: Log when lighthouse returns a height
      if (Math.random() < 0.02) {
        console.log(`[terrain] Lighthouse returned Y=${lighthouseY.toFixed(2)} for (${x.toFixed(1)}, ${z.toFixed(1)})`);
      }
      return lighthouseY;
    }
  }

  const key = `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  // Analytical baseline — always correct for the main hardscaped zones
  let y = _analytical(x, z);

  // Raycast upgrade — picks up any registered mesh (plaza, paths, ground)
  if (_meshes.length > 0) {
    _origin.set(x, 200, z);
    _ray.set(_origin, _down);
    const hits = _ray.intersectObjects(_meshes, false);
    // hits are sorted ascending by distance, so hits[0] is the highest surface
    if (hits.length > 0) y = hits[0].point.y;
  }

  _cache.set(key, y);
  return y;
}

function _analytical(x, z) {
  if (Math.abs(x) <= PLAZA_HALF && Math.abs(z) <= PLAZA_HALF) return PLAZA_SURFACE;
  if (Math.abs(x) <= PATH_HALF_W && z < -PLAZA_HALF && z > -92)  return PATH_SURFACE;
  if (Math.abs(x) <= PATH_HALF_W && z >  PLAZA_HALF && z < 92)   return PATH_SURFACE;
  if (Math.abs(z) <= PATH_HALF_W && x >  PLAZA_HALF && x < 92)   return PATH_SURFACE;
  if (Math.abs(z) <= PATH_HALF_W && x < -PLAZA_HALF && x > -210) return PATH_SURFACE;
  return 0;
}
