/**
 * mapZones.js
 * Defines logical map zones (grass, beach, shallow water) for spawn distribution.
 * Zones match the actual asymmetric ellipse island geometry from island.js.
 */

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

// Obstacle avoidance zones (buildings, paths, etc.)
const AVOID_ZONES = [
  // Hangars
  { x: 0, z: -162.6, radius: 62, name: 'North Hangar' },
  { x: 162.6, z: 0, radius: 62, name: 'East Hangar' },
  { x: 0, z: 162.6, radius: 62, name: 'South Hangar' },
  // Marina
  { x: -230, z: 0, radius: 140, name: 'Marina' },
  // Plaza center
  { x: 0, z: 0, radius: 54, name: 'Plaza' },
];

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
  return AVOID_ZONES.some(zone => {
    const dist = Math.hypot(zone.x - x, zone.z - z);
    return dist < zone.radius;
  });
}

/**
 * Tests if a position (x, z) is valid for spawning in the GRASS zone.
 * Returns true if inside grass area and not on paths/buildings.
 */
export function isValidGrassPosition(x, z) {
  // Must be within grass ellipse
  if (!isInAsymmetricEllipse(x, z, GRASS_OUTER_RADIUS)) return false;

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
 * Tries multiple times to find a valid position, avoiding paths, buildings, and water.
 * Returns { x, z } or null if no valid position found after maxAttempts.
 */
export function randomGrassPosition(maxAttempts = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random angle
    const angle = Math.random() * Math.PI * 2;

    // Generate random radius within grass zone (use sqrt for uniform distribution)
    // CRITICAL: Use BEACH_INNER_RADIUS as outer limit to stay WELL INSIDE land
    // This ensures we never spawn in the beach/water transition zone
    const radius = Math.sqrt(Math.random()) * BEACH_INNER_RADIUS * 0.95; // 95% to add safety margin

    // Calculate base position
    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;

    // Apply expansions to match island shape
    if (x > 0) x *= EAST_EXPANSION;
    z *= NORTH_SOUTH_EXPANSION;

    // Check if valid (on land, not on path/building)
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
