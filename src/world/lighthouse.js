import * as THREE from 'three';
import { registerBox } from '../systems/collision.js';

// Lighthouse configuration - Marina area
const LIGHTHOUSE_X = -272.19;
const LIGHTHOUSE_Z = 107.62;
const LIGHTHOUSE_Y = 0;

// Tower dimensions (15% wider)
const TOWER_RADIUS = 4.83; // 4.2 * 1.15
const TOWER_HEIGHT = 34;
const STRIPE_COUNT = 6;
const STRIPE_HEIGHT = TOWER_HEIGHT / STRIPE_COUNT;

// Base platform (15% wider)
const BASE_RADIUS_BOTTOM = 7.13; // 6.2 * 1.15
const BASE_RADIUS_TOP = 6.44; // 5.6 * 1.15
const BASE_HEIGHT = 0.3; // Lowered from 1.2 to allow player to step onto first stair

// Spiral stairs (15% wider)
const TOTAL_STEPS = 110;
const TOTAL_ROTATIONS = 2.5;
const TOTAL_ANGLE = TOTAL_ROTATIONS * Math.PI * 2; // 5π
const STEP_ANGLE = TOTAL_ANGLE / TOTAL_STEPS;
const TOTAL_RISE = 32.8;
const STEP_RISE = TOTAL_RISE / TOTAL_STEPS; // ≈ 0.298
const STEP_RADIUS = 7.13; // 6.2 * 1.15
const STEP_HEIGHT = 0.22;
const STEP_INNER_RADIUS = TOWER_RADIUS; // 4.83
const STEP_WIDTH = STEP_RADIUS - STEP_INNER_RADIUS; // 2.3

// Observation deck (15% wider)
const DECK_RADIUS = 7.82; // 6.8 * 1.15
const DECK_THICKNESS = 1.0;
const DECK_Y = BASE_HEIGHT + TOTAL_RISE; // ≈ 34.0
const DECK_FLOOR_Y = DECK_Y - DECK_THICKNESS;
const DECK_OPENING_ANGLE = 0.95;
const END_ANGLE = (TOTAL_ANGLE % (Math.PI * 2)); // π

// Deck walls and roof (15% wider)
const DECK_WALL_HEIGHT = 1.05;
const PILLAR_COUNT = 6;
const PILLAR_RADIUS = 0.253; // 0.22 * 1.15
const PILLAR_HEIGHT = 4.4;
const ROOF_THICKNESS = 0.5;

// Beacon (15% wider)
const BEACON_BASE_HEIGHT = 0.6;
const BEACON_GLASS_HEIGHT = 2.2;
const BEACON_GLASS_RADIUS = 1.61; // 1.4 * 1.15
const BEACON_LIGHT_RADIUS = 0.92; // 0.8 * 1.15
const BEACON_ROOF_HEIGHT = 1.2;
const BEACON_ROOF_RADIUS_BOTTOM = 1.84; // 1.6 * 1.15
const BEACON_ROOF_RADIUS_TOP = 0.46; // 0.4 * 1.15
const BEAM_CONE_RADIUS_BOTTOM = 3.45; // 3.0 * 1.15
const BEAM_CONE_HEIGHT = 40;

// Materials
const MAT_RED = new THREE.MeshLambertMaterial({ color: 0xc62828 });
const MAT_WHITE = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
const MAT_GRAY = new THREE.MeshLambertMaterial({ color: 0x808080 });
const MAT_GLASS = new THREE.MeshLambertMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.35
});
const MAT_LIGHT = new THREE.MeshBasicMaterial({ color: 0xffe98c });
const MAT_BEAM = new THREE.MeshLambertMaterial({
  color: 0xffe98c,
  transparent: true,
  opacity: 0.25
});

let _lighthouseGroup = null;
let _beaconRotatingGroup = null;

export function initLighthouse(scene) {
  _lighthouseGroup = new THREE.Group();
  _lighthouseGroup.position.set(LIGHTHOUSE_X, LIGHTHOUSE_Y, LIGHTHOUSE_Z);
  scene.add(_lighthouseGroup);

  _buildBase();
  _buildTowerStripes();
  _buildSpiralStairs();
  _buildObservationDeck();
  _buildBeacon();
  _registerCollision();

  // Expose height function globally for terrain system
  window._getLighthouseHeight = getLighthouseHeight;

  console.log(`[lighthouse] Built at (${LIGHTHOUSE_X}, ${LIGHTHOUSE_Y}, ${LIGHTHOUSE_Z})`);
  console.log(`[lighthouse] Stairs: ${TOTAL_STEPS} steps from Y=${BASE_HEIGHT} to Y=${DECK_Y.toFixed(2)}`);
  console.log(`[lighthouse] Stair zone: radius ${STEP_INNER_RADIUS}m to ${STEP_RADIUS}m`);
  console.log(`[lighthouse] window._getLighthouseHeight registered:`, typeof window._getLighthouseHeight === 'function' ? 'YES' : 'NO');
}

function _buildBase() {
  const baseGeom = new THREE.CylinderGeometry(
    BASE_RADIUS_TOP,
    BASE_RADIUS_BOTTOM,
    BASE_HEIGHT,
    32
  );
  const base = new THREE.Mesh(baseGeom, MAT_GRAY);
  base.position.y = BASE_HEIGHT / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  _lighthouseGroup.add(base);
}

function _buildTowerStripes() {
  for (let i = 0; i < STRIPE_COUNT; i++) {
    const mat = (i % 2 === 0) ? MAT_RED : MAT_WHITE;
    const stripeGeom = new THREE.CylinderGeometry(
      TOWER_RADIUS,
      TOWER_RADIUS,
      STRIPE_HEIGHT,
      32
    );
    const stripe = new THREE.Mesh(stripeGeom, mat);
    stripe.position.y = BASE_HEIGHT + i * STRIPE_HEIGHT + STRIPE_HEIGHT / 2;
    stripe.castShadow = true;
    stripe.receiveShadow = true;
    _lighthouseGroup.add(stripe);
  }
}

function _buildSpiralStairs() {
  for (let s = 0; s < TOTAL_STEPS; s++) {
    const stepY = BASE_HEIGHT + s * STEP_RISE;
    const thetaStart = s * STEP_ANGLE;
    const thetaLength = STEP_ANGLE * 1.02; // Slight overlap

    // Step platform (pizza slice)
    const stepGeom = new THREE.CylinderGeometry(
      STEP_RADIUS,
      STEP_RADIUS,
      STEP_HEIGHT,
      6,
      1,
      false,
      thetaStart,
      thetaLength
    );
    const step = new THREE.Mesh(stepGeom, MAT_GRAY);
    step.position.y = stepY;
    step.castShadow = true;
    step.receiveShadow = true;
    _lighthouseGroup.add(step);

    // Outer railing wall (red sector)
    const railWallGeom = new THREE.CylinderGeometry(
      6.38,
      6.38,
      1.1,
      6,
      1,
      true, // open-ended
      thetaStart,
      thetaLength
    );
    const railWall = new THREE.Mesh(railWallGeom, MAT_RED);
    railWall.position.y = stepY + 0.55;
    railWall.castShadow = true;
    _lighthouseGroup.add(railWall);

    // Handrail (white tube connecting to next step)
    if (s < TOTAL_STEPS - 1) {
      const angle1 = thetaStart + thetaLength / 2;
      const angle2 = (s + 1) * STEP_ANGLE + STEP_ANGLE * 1.02 / 2;

      const x1 = Math.cos(angle1) * STEP_RADIUS;
      const z1 = Math.sin(angle1) * STEP_RADIUS;
      const y1 = stepY + 1.18;

      const x2 = Math.cos(angle2) * STEP_RADIUS;
      const z2 = Math.sin(angle2) * STEP_RADIUS;
      const y2 = (BASE_HEIGHT + (s + 1) * STEP_RISE) + 1.18;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const tubeGeom = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
      const tube = new THREE.Mesh(tubeGeom, MAT_WHITE);

      tube.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);

      const axis = new THREE.Vector3(dz, 0, -dx).normalize();
      const angle = Math.acos(dy / length);
      tube.quaternion.setFromAxisAngle(axis, angle);

      _lighthouseGroup.add(tube);
    }
  }
}

function _buildObservationDeck() {
  // Floor with opening
  const floorGeom = new THREE.CylinderGeometry(
    DECK_RADIUS,
    DECK_RADIUS,
    DECK_THICKNESS,
    32,
    1,
    false,
    END_ANGLE,
    Math.PI * 2 - DECK_OPENING_ANGLE
  );
  const floor = new THREE.Mesh(floorGeom, MAT_GRAY);
  floor.position.y = DECK_FLOOR_Y + DECK_THICKNESS / 2;
  floor.castShadow = true;
  floor.receiveShadow = true;
  _lighthouseGroup.add(floor);

  // Safety railing at opening edge (one side only)
  const railingGeom = new THREE.CylinderGeometry(
    DECK_RADIUS - 0.1,
    DECK_RADIUS - 0.1,
    1.0,
    6,
    1,
    true,
    END_ANGLE - DECK_OPENING_ANGLE,
    0.1
  );
  const railing = new THREE.Mesh(railingGeom, MAT_WHITE);
  railing.position.y = DECK_Y + 0.5;
  _lighthouseGroup.add(railing);

  // Perimeter wall (red)
  const wallGeom = new THREE.CylinderGeometry(
    DECK_RADIUS,
    DECK_RADIUS,
    DECK_WALL_HEIGHT,
    32,
    1,
    true
  );
  const wall = new THREE.Mesh(wallGeom, MAT_RED);
  wall.position.y = DECK_Y + DECK_WALL_HEIGHT / 2;
  wall.castShadow = true;
  _lighthouseGroup.add(wall);

  // Top railing ring (white)
  const topRingGeom = new THREE.TorusGeometry(DECK_RADIUS, 0.08, 8, 32);
  const topRing = new THREE.Mesh(topRingGeom, MAT_WHITE);
  topRing.position.y = DECK_Y + DECK_WALL_HEIGHT;
  topRing.rotation.x = Math.PI / 2;
  _lighthouseGroup.add(topRing);

  // Pillars
  const pillarY = DECK_Y + DECK_WALL_HEIGHT + PILLAR_HEIGHT / 2;
  for (let i = 0; i < PILLAR_COUNT; i++) {
    const angle = (i / PILLAR_COUNT) * Math.PI * 2;
    const x = Math.cos(angle) * (DECK_RADIUS - 0.5);
    const z = Math.sin(angle) * (DECK_RADIUS - 0.5);

    const pillarGeom = new THREE.CylinderGeometry(
      PILLAR_RADIUS,
      PILLAR_RADIUS,
      PILLAR_HEIGHT,
      12
    );
    const pillar = new THREE.Mesh(pillarGeom, MAT_WHITE);
    pillar.position.set(x, pillarY, z);
    pillar.castShadow = true;
    _lighthouseGroup.add(pillar);
  }

  // Roof
  const roofY = DECK_Y + DECK_WALL_HEIGHT + PILLAR_HEIGHT;
  const roofGeom = new THREE.CylinderGeometry(
    DECK_RADIUS,
    DECK_RADIUS,
    ROOF_THICKNESS,
    32
  );
  const roof = new THREE.Mesh(roofGeom, MAT_GRAY);
  roof.position.y = roofY + ROOF_THICKNESS / 2;
  roof.castShadow = true;
  _lighthouseGroup.add(roof);
}

function _buildBeacon() {
  const beaconBaseY = DECK_Y + DECK_WALL_HEIGHT + PILLAR_HEIGHT + ROOF_THICKNESS;

  // Rotating group for beacon and beams
  _beaconRotatingGroup = new THREE.Group();
  _beaconRotatingGroup.position.y = beaconBaseY;
  _lighthouseGroup.add(_beaconRotatingGroup);

  // Base
  const baseGeom = new THREE.CylinderGeometry(1.2, 1.4, BEACON_BASE_HEIGHT, 16);
  const base = new THREE.Mesh(baseGeom, MAT_GRAY);
  base.position.y = BEACON_BASE_HEIGHT / 2;
  _beaconRotatingGroup.add(base);

  // Glass cylinder
  const glassGeom = new THREE.CylinderGeometry(
    BEACON_GLASS_RADIUS,
    BEACON_GLASS_RADIUS,
    BEACON_GLASS_HEIGHT,
    16
  );
  const glass = new THREE.Mesh(glassGeom, MAT_GLASS);
  glass.position.y = BEACON_BASE_HEIGHT + BEACON_GLASS_HEIGHT / 2;
  _beaconRotatingGroup.add(glass);

  // Light sphere
  const lightGeom = new THREE.SphereGeometry(BEACON_LIGHT_RADIUS, 16, 16);
  const light = new THREE.Mesh(lightGeom, MAT_LIGHT);
  light.position.y = BEACON_BASE_HEIGHT + BEACON_GLASS_HEIGHT / 2;
  _beaconRotatingGroup.add(light);

  // Roof cone
  const roofGeom = new THREE.ConeGeometry(
    BEACON_ROOF_RADIUS_BOTTOM,
    BEACON_ROOF_HEIGHT,
    16
  );
  const roof = new THREE.Mesh(roofGeom, MAT_RED);
  roof.position.y = BEACON_BASE_HEIGHT + BEACON_GLASS_HEIGHT + BEACON_ROOF_HEIGHT / 2;
  _beaconRotatingGroup.add(roof);

  // Light beams (two cones pointing opposite directions)
  const beamGeom = new THREE.ConeGeometry(
    BEAM_CONE_RADIUS_BOTTOM,
    BEAM_CONE_HEIGHT,
    16,
    1,
    true
  );

  // Beam 1 (pointing +X direction)
  const beam1 = new THREE.Mesh(beamGeom, MAT_BEAM);
  beam1.position.set(BEAM_CONE_HEIGHT / 2, BEACON_BASE_HEIGHT + BEACON_GLASS_HEIGHT / 2, 0);
  beam1.rotation.z = -Math.PI / 2;
  _beaconRotatingGroup.add(beam1);

  // Beam 2 (pointing -X direction)
  const beam2 = new THREE.Mesh(beamGeom, MAT_BEAM);
  beam2.position.set(-BEAM_CONE_HEIGHT / 2, BEACON_BASE_HEIGHT + BEACON_GLASS_HEIGHT / 2, 0);
  beam2.rotation.z = Math.PI / 2;
  _beaconRotatingGroup.add(beam2);

  // Point light for illumination
  const pointLight = new THREE.PointLight(0xffe98c, 1.5, 50);
  pointLight.position.y = BEACON_BASE_HEIGHT + BEACON_GLASS_HEIGHT / 2;
  _beaconRotatingGroup.add(pointLight);
}

function _registerCollision() {
  // Only inner tower core collision - stairs are outside this
  // Collision only for the solid center (radius 0-3.5m), stairs area (3.5-6.2m) is walkable
  const worldX = LIGHTHOUSE_X;
  const worldZ = LIGHTHOUSE_Z;

  // Inner core collision (smaller to allow access to stairs)
  const coreRadius = 3.5; // Smaller than tower radius 4.2, so stairs at 4.2-6.2 are free
  const coreBox = coreRadius * 1.4; // Approximate circle with square
  registerBox(
    worldX - coreBox,
    worldX + coreBox,
    worldZ - coreBox,
    worldZ + coreBox,
    'lighthouse'
  );

  console.log('[lighthouse] Registered 1 collision box (inner core only) tagged "lighthouse"');
}

export function updateLighthouse(delta) {
  if (_beaconRotatingGroup) {
    _beaconRotatingGroup.rotation.y += delta * 0.5;
  }
}

// Stair climbing logic - find closest step at given angle across all rotations
export function getLighthouseStairHeight(playerX, playerZ, currentY = 0) {
  // Input validation - prevent crashes from invalid data
  if (!isFinite(playerX) || !isFinite(playerZ) || !isFinite(currentY)) {
    return null;
  }

  const dx = playerX - LIGHTHOUSE_X;
  const dz = playerZ - LIGHTHOUSE_Z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  // Check if on stairs (between tower wall and outer edge)
  // Inner: 4.2 (tower wall), Outer: 6.2 (stair edge)
  if (distance < STEP_INNER_RADIUS || distance > STEP_RADIUS + 0.3) {
    return null; // Not on stairs
  }

  // Calculate angle (0 to 2π) - player's angular position
  let angle = Math.atan2(dz, dx);
  if (angle < 0) angle += Math.PI * 2;

  // CRITICAL: Collect ALL candidate steps at this angle across all 2.5 rotations
  // Each rotation is 2π (360°), so same angle repeats 3 times (rotations 0, 1, 2)
  const candidates = [];
  const stepsPerRotation = TOTAL_STEPS / TOTAL_ROTATIONS; // 44 steps per full rotation

  for (let rotation = 0; rotation < 3; rotation++) {
    // Step index on this rotation: which slice of the 44 steps?
    const stepOnRotation = Math.floor((angle / (Math.PI * 2)) * stepsPerRotation);
    const stepIndex = rotation * stepsPerRotation + stepOnRotation;

    // Stop if we've exceeded total steps
    if (stepIndex >= TOTAL_STEPS) break;

    // Calculate height of this candidate step
    const stepY = BASE_HEIGHT + stepIndex * STEP_RISE + STEP_HEIGHT;

    candidates.push({
      stepIndex,
      rotation,
      height: stepY
    });
  }

  // Find the candidate step closest to player's current Y (within tolerance)
  const TOLERANCE = 1.5; // Allow stepping up/down 1.5m
  let closestStep = null;
  let minDist = Infinity;

  for (const candidate of candidates) {
    const dist = Math.abs(candidate.height - currentY);
    if (dist < TOLERANCE && dist < minDist) {
      minDist = dist;
      closestStep = candidate;
    }
  }

  if (closestStep) {
    return closestStep.height;
  }

  // No step within tolerance
  return null;
}

// Get height for entire lighthouse area (stairs + deck)
export function getLighthouseHeight(playerX, playerZ, currentY) {
  // Input validation - prevent crashes
  if (!isFinite(playerX) || !isFinite(playerZ) || !isFinite(currentY)) {
    return null;
  }

  const dx = playerX - LIGHTHOUSE_X;
  const dz = playerZ - LIGHTHOUSE_Z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  // DEBUG: Log when player is near lighthouse
  if (distance < 15 && Math.random() < 0.01) {
    console.log(`[lighthouse] Player near: dist=${distance.toFixed(1)}m, Y=${currentY.toFixed(1)}`);
  }

  // 1. Check if on observation deck
  if (distance <= DECK_RADIUS && currentY > DECK_Y - 2) {
    // Check if in opening (should fall through)
    let angle = Math.atan2(dz, dx);
    if (angle < 0) angle += Math.PI * 2;

    const openingStart = END_ANGLE - DECK_OPENING_ANGLE;
    const openingEnd = END_ANGLE;

    // If in opening sector and on stairs radius, fall through
    if (angle >= openingStart && angle <= openingEnd && distance > STEP_INNER_RADIUS && distance <= STEP_RADIUS + 0.5) {
      // Fall through to stairs below - PASS currentY!
      const stairHeight = getLighthouseStairHeight(playerX, playerZ, currentY);
      if (stairHeight !== null) return stairHeight;
    }

    // Otherwise, on deck floor
    return DECK_Y;
  }

  // 2. Check if on spiral stairs
  const stairHeight = getLighthouseStairHeight(playerX, playerZ, currentY);
  if (stairHeight !== null) {
    // DEBUG: Log when on stairs
    if (Math.random() < 0.05) {
      console.log(`[lighthouse] On stairs: dist=${distance.toFixed(1)}m, returning Y=${stairHeight.toFixed(2)}`);
    }
    return stairHeight;
  }

  // 3. Not on lighthouse
  return null;
}

// Check if player is on observation deck floor
export function isOnObservationDeck(playerX, playerZ, playerY) {
  const dx = playerX - LIGHTHOUSE_X;
  const dz = playerZ - LIGHTHOUSE_Z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  // Must be within deck radius
  if (distance > DECK_RADIUS) return false;

  // Must be at deck height
  if (Math.abs(playerY - DECK_Y) > 1.0) return false;

  // Check if in opening sector (should fall through)
  let angle = Math.atan2(dz, dx);
  if (angle < 0) angle += Math.PI * 2;

  const openingStart = END_ANGLE - DECK_OPENING_ANGLE;
  const openingEnd = END_ANGLE;

  // If inside opening and on inner radius (stairs area), fall through
  if (angle >= openingStart && angle <= openingEnd && distance < STEP_RADIUS) {
    return false;
  }

  return true;
}

export function getLighthousePosition() {
  return { x: LIGHTHOUSE_X, y: LIGHTHOUSE_Y, z: LIGHTHOUSE_Z };
}

export function getLighthouseConfig() {
  return {
    position: { x: LIGHTHOUSE_X, y: LIGHTHOUSE_Y, z: LIGHTHOUSE_Z },
    towerRadius: TOWER_RADIUS,
    towerHeight: TOWER_HEIGHT,
    baseRadius: BASE_RADIUS_BOTTOM,
    totalSteps: TOTAL_STEPS,
    stepRise: STEP_RISE,
    deckY: DECK_Y,
    deckRadius: DECK_RADIUS,
    coreCollisionRadius: 3.5,
    stairZone: { inner: 4.2, outer: 6.2 },
    collisionBoxes: 1,
    collisionTag: 'lighthouse'
  };
}
