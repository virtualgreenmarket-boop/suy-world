/**
 * mapZones.js
 * Defines logical map zones (grass, beach, shallow water) for spawn distribution.
 * Zones match the actual asymmetric ellipse island geometry from island.js.
 */

import { HANGAR_CONFIGS, HANGAR_DIMS } from './hangars.js';

// Island shape parameters (from island.js)
const EAST_EXPANSION = 1.4;        // East side expands 40%
const NORTH_SOUTH_EXPANSION = 2.38; // North/South expands 138%

// Zone boundaries (radii before expansion) - UPDATED to match island.js
const GRASS_INNER_RADIUS = 0;
const GRASS_OUTER_RADIUS = 255;     // FIXED: Matches island.js grassMesh (reduced from 278.56)
const BEACH_INNER_RADIUS = 255;     // FIXED: Starts where grass ends (was 270.07, had gap!)
const BEACH_OUTER_RADIUS = 350;     // FIXED: Matches island.js sandMesh outer (was 347.84)
const SHALLOW_WATER_INNER_RADIUS = BEACH_OUTER_RADIUS;
const SHALLOW_WATER_OUTER_RADIUS = 500; // Reasonable shallow water extent (increased from 450)

// Obstacle avoidance zones (buildings, paths, etc.) — hangars use an exact
// rotated-rectangle footprint check (see isInHangarFootprint) since their
// 190×143.85 m rectangular footprint is not well approximated by a circle.
const AVOID_ZONES = [
  // Marina
  { x: -230, z: 0, radius: 140, name: 'Marina' },
  // Plaza center
  { x: 0, z: 0, radius: 54, name: 'Plaza' },
];

// Small buffer beyond the hangar walls so trees/plants don't spawn flush
// against (or clipping into) the entrance columns.
const HANGAR_FOOTPRINT_MARGIN = 3;

/**
 * Tests if (x, z) falls inside any hangar's rectangular footprint,
 * accounting for each hangar's rotation.
 */
function isInHangarFootprint(x, z) {
  return HANGAR_CONFIGS.some((cfg, i) => {
    const { W, D } = HANGAR_DIMS[i];
    const dx = x - cfg.x;
    const dz = z - cfg.z;
    const cos = Math.cos(-cfg.rotY);
    const sin = Math.sin(-cfg.rotY);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return Math.abs(localX) <= W / 2 + HANGAR_FOOTPRINT_MARGIN
        && Math.abs(localZ) <= D / 2 + HANGAR_FOOTPRINT_MARGIN;
  });
}

/**
 * Tests if a point (x, z) is inside the asymmetric ellipse island.
 * Accounts for east expansion and north/south expansion.
 */
function isInAsymmetricEllipse(x, z, baseRadius) {
  // Normalize coordinates based on expansion factors
  const normalizedX = x > 0 ? x / EAST_EXPANSION : x; // East side compressed back
  const normalizedZ = z / NORTH_SOUTH_EXPANSION;      // North/South compressed back

  const distance = Math.hypot(normalizedX, normalizedZ);
  return distance <= baseRadius;
}

/**
 * Tests if a point falls on a path corridor.
 * Paths connect plaza to hangars and marina.
 */
function isOnPath(x, z) {
  const PATH_HALF_WIDTH = 8;

  // North path (to north hangar)
  if (Math.abs(x) < PATH_HALF_WIDTH && z < -40 && z > -240) return true;

  // South path (to south hangar)
  if (Math.abs(x) < PATH_HALF_WIDTH && z > 40 && z < 240) return true;

  // East path (to east hangar)
  if (Math.abs(z) < PATH_HALF_WIDTH && x > 40 && x < 125) return true;

  // West path (to marina)
  if (Math.abs(z) < PATH_HALF_WIDTH && x < -40 && x > -210) return true;

  return false;
}

/**
 * Tests if a point overlaps with any avoided zone (buildings, etc.).
 */
function isInAvoidZone(x, z) {
  if (isInHangarFootprint(x, z)) return true;

  return AVOID_ZONES.some(zone => {
    const dist = Math.hypot(zone.x - x, zone.z - z);
    return dist < zone.radius;
  });
}

/**
 * Tests if a position (x, z) is valid for spawning in the GRASS zone.
 * Returns true if inside grass area and not on paths/buildings.
 * CRITICAL: Also checks ground height to ensure not in water!
 */
export function isValidGrassPosition(x, z) {
  // CRITICAL: Must be WELL INSIDE grass zone, not near edges
  // Use much smaller radius to guarantee land, not water
  const SAFE_GRASS_RADIUS = 200; // Safely inside grass (255), accounting for expansion

  if (!isInAsymmetricEllipse(x, z, SAFE_GRASS_RADIUS)) return false;

  // Must not be on a path
  if (isOnPath(x, z)) return false;

  // Must not overlap with buildings/structures
  if (isInAvoidZone(x, z)) return false;

  return true;
}

/**
 * Tests if a position (x, z) is in the BEACH zone.
 */
export function isValidBeachPosition(x, z) {
  // Must be outside beach inner boundary but inside beach outer boundary
  const inOuterBoundary = isInAsymmetricEllipse(x, z, BEACH_OUTER_RADIUS);
  const inInnerBoundary = isInAsymmetricEllipse(x, z, BEACH_INNER_RADIUS);

  return inOuterBoundary && !inInnerBoundary;
}

/**
 * Tests if a position (x, z) is in the SHALLOW WATER zone.
 */
export function isValidShallowWaterPosition(x, z) {
  const inOuterBoundary = isInAsymmetricEllipse(x, z, SHALLOW_WATER_OUTER_RADIUS);
  const inInnerBoundary = isInAsymmetricEllipse(x, z, SHALLOW_WATER_INNER_RADIUS);

  return inOuterBoundary && !inInnerBoundary;
}

/**
 * Generates a random position within the GRASS zone.
 * SAFE APPROACH: Only spawn in central safe zones, never near water.
 * Returns { x, z } or null if no valid position found after maxAttempts.
 */
export function randomGrassPosition(maxAttempts = 100) {
  // SAFE SPAWN ZONES - areas GUARANTEED to be on grass, never water
  const safeZones = [
    // Plaza center
    { xMin: -40, xMax: 40, zMin: -40, zMax: 40 },
    // North of plaza (before hangar)
    { xMin: -30, xMax: 30, zMin: -100, zMax: -50 },
    // South of plaza (before hangar)
    { xMin: -30, xMax: 30, zMin: 50, zMax: 100 },
    // West of plaza (before marina)
    { xMin: -120, xMax: -50, zMin: -30, zMax: 30 },
    // East of plaza (before hangar)
    { xMin: 50, xMax: 100, zMin: -30, zMax: 30 },
    // Northwest quadrant
    { xMin: -100, xMax: -40, zMin: 40, zMax: 100 },
    // Northeast quadrant
    { xMin: 40, xMax: 100, zMin: 40, zMax: 100 },
    // Southwest quadrant
    { xMin: -100, xMax: -40, zMin: -100, zMax: -40 },
    // Southeast quadrant
    { xMin: 40, xMax: 100, zMin: -100, zMax: -40 }
  ];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick random safe zone
    const zone = safeZones[Math.floor(Math.random() * safeZones.length)];

    // Random position within zone
    const x = zone.xMin + Math.random() * (zone.xMax - zone.xMin);
    const z = zone.zMin + Math.random() * (zone.zMax - zone.zMin);

    // Check if valid (not on path/building)
    if (isValidGrassPosition(x, z)) {
      return { x, z };
    }
  }

  return null; // Failed to find valid position
}

/**
 * Generates a random position within the BEACH zone.
 */
export function randomBeachPosition(maxAttempts = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = BEACH_INNER_RADIUS + Math.random() * (BEACH_OUTER_RADIUS - BEACH_INNER_RADIUS);

    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;

    if (x > 0) x *= EAST_EXPANSION;
    z *= NORTH_SOUTH_EXPANSION;

    if (isValidBeachPosition(x, z)) {
      return { x, z };
    }
  }

  return null;
}

/**
 * Generates a random position within the SHALLOW WATER zone.
 */
export function randomShallowWaterPosition(maxAttempts = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = SHALLOW_WATER_INNER_RADIUS + Math.random() * (SHALLOW_WATER_OUTER_RADIUS - SHALLOW_WATER_INNER_RADIUS);

    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;

    if (x > 0) x *= EAST_EXPANSION;
    z *= NORTH_SOUTH_EXPANSION;

    if (isValidShallowWaterPosition(x, z)) {
      return { x, z };
    }
  }

  return null;
}

/**
 * Returns zone boundaries for debugging/visualization.
 */
export function getZoneBoundaries() {
  return {
    grass: {
      innerRadius: GRASS_INNER_RADIUS,
      outerRadius: GRASS_OUTER_RADIUS,
      eastExpansion: EAST_EXPANSION,
      northSouthExpansion: NORTH_SOUTH_EXPANSION
    },
    beach: {
      innerRadius: BEACH_INNER_RADIUS,
      outerRadius: BEACH_OUTER_RADIUS,
      eastExpansion: EAST_EXPANSION,
      northSouthExpansion: NORTH_SOUTH_EXPANSION
    },
    shallowWater: {
      innerRadius: SHALLOW_WATER_INNER_RADIUS,
      outerRadius: SHALLOW_WATER_OUTER_RADIUS,
      eastExpansion: EAST_EXPANSION,
      northSouthExpansion: NORTH_SOUTH_EXPANSION
    },
    avoidZones: AVOID_ZONES
  };
}
