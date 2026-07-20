// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Palm Trees
// Procedural palm trees with swaying fronds for tropical atmosphere
//
// USAGE:
//   import { initPalmTrees, spawnPalm, spawnPalmAvenue, updatePalmTrees } from './world/palmTrees.js';
//   initPalmTrees(scene);
//   spawnPalm(scene, x, z, { ... });
//   spawnPalmAvenue({ x, z }, { x, z }, { perSide, offset, spacing, ... });
//   updatePalmTrees(delta); // in animation loop
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

let _scene = null;
const _palms = [];
let _clock = 0;

// Seeded RNG for deterministic placement
function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const rng = seededRng(77); // Seed for palm trees

/**
 * Create a palm tree trunk (slightly curved cylinder)
 */
function createTrunk(height, radius, curve = 0.3) {
  const segments = 12;
  const radialSegments = 8;
  const geometry = new THREE.CylinderGeometry(radius * 0.6, radius, height, radialSegments, segments);

  // Add slight curve to trunk
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y / height) + 0.5; // 0 at bottom, 1 at top
    const bendX = Math.sin(t * Math.PI * 0.5) * curve;
    pos.setX(i, pos.getX(i) + bendX);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x8B6F47,
    roughness: 0.85,
    metalness: 0.0
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Create a single palm frond (leaf blade)
 */
function createFrond(length, width) {
  const shape = new THREE.Shape();

  // Frond outline - pointed at tip, wider at base
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = Math.sin(t * Math.PI) * width * (1 - t * 0.3); // Narrower at tip
    const y = t * length;
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const x = -Math.sin(t * Math.PI) * width * (1 - t * 0.3);
    const y = t * length;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2d5016,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Create a palm crown (cluster of fronds)
 */
function createCrown(frondCount = 8, frondLength = 3, frondWidth = 0.4, variant = 0) {
  const crown = new THREE.Group();

  for (let i = 0; i < frondCount; i++) {
    const frond = createFrond(frondLength, frondWidth);

    // Angle around the crown
    const angle = (i / frondCount) * Math.PI * 2;

    // Tilt fronds outward and downward
    const tilt = variant === 0 ? -0.4 : -0.6; // Variant 1 droops more
    frond.rotation.x = tilt;
    frond.rotation.y = angle;

    // Slight twist for natural look
    frond.rotation.z = (rng() - 0.5) * 0.3;

    crown.add(frond);

    // Store for animation
    frond.userData.baseRotX = frond.rotation.x;
    frond.userData.swayPhase = rng() * Math.PI * 2;
    frond.userData.swaySpeed = 0.8 + rng() * 0.4;
  }

  return crown;
}

/**
 * Create a complete palm tree
 */
function createPalmTree(opts = {}) {
  const height = opts.height || (8 + rng() * 4); // 8-12m tall
  const trunkRadius = opts.radius || 0.25;
  const variant = opts.variant || Math.floor(rng() * 2); // 0 or 1
  const curve = opts.curve !== undefined ? opts.curve : (rng() - 0.5) * 0.6;

  const palm = new THREE.Group();

  // Trunk
  const trunk = createTrunk(height, trunkRadius, curve);
  trunk.position.y = height / 2;
  if (opts.castShadow) trunk.castShadow = true;
  trunk.receiveShadow = true;
  palm.add(trunk);

  // Crown at top
  const frondCount = variant === 0 ? 8 : 10;
  const frondLength = variant === 0 ? 3.5 : 3.0;
  const frondWidth = variant === 0 ? 0.5 : 0.4;

  const crown = createCrown(frondCount, frondLength, frondWidth, variant);
  crown.position.y = height;
  palm.add(crown);

  // Store data for animation
  palm.userData.crown = crown;
  palm.userData.height = height;
  palm.userData.variant = variant;

  return palm;
}

/**
 * Initialize palm tree system
 */
export function initPalmTrees(scene) {
  _scene = scene;
  console.log('[palmTrees] System initialized');
}

/**
 * Spawn a single palm tree
 */
export function spawnPalm(scene, x, z, opts = {}) {
  try {
    const palm = createPalmTree(opts);

    const y = opts.y !== undefined ? opts.y : (opts.getY ? opts.getY(x, z) : 0);
    palm.position.set(x, y, z);

    // Random rotation
    palm.rotation.y = opts.rotY !== undefined ? opts.rotY : rng() * Math.PI * 2;

    // Scale variation
    const scale = opts.scale || (0.85 + rng() * 0.3);
    palm.scale.setScalar(scale);

    scene.add(palm);
    _palms.push(palm);

    return palm;
  } catch (err) {
    console.error('[palmTrees] Failed to spawn palm:', err);
    return null;
  }
}

/**
 * Spawn palms along both sides of a path
 *
 * @param {Object} from - Start point { x, z }
 * @param {Object} to - End point { x, z }
 * @param {Object} opts - Options:
 *   perSide: number of palms per side (default 10)
 *   offset: distance from path centerline (default 7.5)
 *   spacing: distance between consecutive palms (default 10)
 *   jitter: random position offset (default 0.6)
 *   getY: function(x, z) to get ground height
 *   castShadow: whether palms cast shadows (default false)
 */
export function spawnPalmAvenue(from, to, opts = {}) {
  try {
    const perSide = opts.perSide || 10;
    const offset = opts.offset || 7.5;
    const spacing = opts.spacing || 10;
    const jitter = opts.jitter !== undefined ? opts.jitter : 0.6;
    const getY = opts.getY || ((x, z) => 0);
    const castShadow = opts.castShadow || false;

    // Path direction vector
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const pathLength = Math.sqrt(dx * dx + dz * dz);

    // Normalized direction
    const dirX = dx / pathLength;
    const dirZ = dz / pathLength;

    // Perpendicular (for offset to sides)
    const perpX = -dirZ;
    const perpZ = dirX;

    console.log(`[palmTrees] Spawning avenue: ${perSide} palms per side, offset ${offset}m, spacing ${spacing}m`);

    let palmsSpawned = 0;

    // Spawn palms on both sides
    for (let side of [-1, 1]) { // -1 = left, 1 = right
      for (let i = 0; i < perSide; i++) {
        // Position along path (evenly spaced from start)
        const t = (i + 0.5) / perSide; // 0.5 offset so palms don't start exactly at endpoints
        const alongX = from.x + dirX * pathLength * t;
        const alongZ = from.z + dirZ * pathLength * t;

        // Offset to side with jitter
        const jitterAmount = (rng() - 0.5) * jitter;
        const finalOffset = offset + jitterAmount;

        const x = alongX + perpX * finalOffset * side;
        const z = alongZ + perpZ * finalOffset * side;
        const y = getY(x, z);

        // Alternate variants for variety
        const variant = i % 2;

        // Palms lean slightly away from path
        const curve = side * (0.2 + rng() * 0.3);

        spawnPalm(_scene, x, z, {
          y,
          variant,
          curve,
          castShadow,
          getY
        });

        palmsSpawned++;
      }
    }

    console.log(`[palmTrees] Spawned ${palmsSpawned} palms along avenue`);
  } catch (err) {
    console.error('[palmTrees] Failed to spawn palm avenue:', err);
  }
}

/**
 * Update palm tree animations (swaying fronds)
 */
export function updatePalmTrees(delta) {
  try {
    _clock += delta;
    const time = _clock;

    for (const palm of _palms) {
      const crown = palm.userData.crown;
      if (!crown) continue;

      // Sway each frond independently
      crown.children.forEach(frond => {
        if (!frond.userData.baseRotX) return;

        const phase = frond.userData.swayPhase || 0;
        const speed = frond.userData.swaySpeed || 1;

        // Gentle swaying motion
        const sway = Math.sin(time * speed + phase) * 0.15;
        frond.rotation.x = frond.userData.baseRotX + sway;

        // Slight twist
        frond.rotation.z = Math.sin(time * speed * 0.7 + phase) * 0.1;
      });

      // Very subtle trunk sway
      palm.rotation.z = Math.sin(time * 0.5) * 0.02;
    }
  } catch (err) {
    console.error('[palmTrees] Update error:', err);
  }
}

/**
 * Cleanup palm trees
 */
export function disposePalmTrees() {
  try {
    for (const palm of _palms) {
      if (_scene) _scene.remove(palm);
      palm.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
    }
    _palms.length = 0;
    console.log('[palmTrees] Cleaned up palm trees');
  } catch (err) {
    console.error('[palmTrees] Cleanup error:', err);
  }
}
