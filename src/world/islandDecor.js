/**
 * islandDecor.js
 * Tropical vegetation and beach furniture decorations
 * LOW-POLY PROCEDURAL ONLY - No GLB, no external textures
 * MeshLambertMaterial ONLY - MeshStandard crashes EffectComposer
 */

import * as THREE from 'three';
import { isValidGrassPosition, isValidBeachPosition } from './mapZones.js';
import { registerInteraction } from '../ui/interactionUI.js';
import { sitOnBench, standUp, isPlayerSitting } from '../player/localPlayer.js';

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 1: TROPICAL PLANTS (Grass zones)
// ══════════════════════════════════════════════════════════════════════════════

const PLANT_CLUSTERS = 30; // 25-35 clusters
const PLANTS_PER_CLUSTER = 3; // 2-4 plants per cluster
const CLUSTER_RADIUS = 1.5; // Spread within cluster
const MIN_CLUSTER_SPACING = 3; // 3m between clusters

// Color palette
const LEAF_COLORS = [
  new THREE.Color(0x2f6b1f), // Dark green
  new THREE.Color(0x3d7a25),
  new THREE.Color(0x4a8a2f),
  new THREE.Color(0x58a344), // Bright green
];
const STEM_COLOR = new THREE.Color(0x3d5a2a);

let _vegetationGroup;
let _windPhases = []; // Per-cluster wind phase

/**
 * Create a Monstera leaf (heart shape with splits)
 */
function createMonsteraLeaf() {
  const shape = new THREE.Shape();

  // Heart-shaped outline with notches
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.2, 0.4, 0.5, 0.5, 0.5, 0.8); // Right lobe
  shape.bezierCurveTo(0.5, 1.0, 0.3, 1.2, 0, 1.2); // Top right
  shape.bezierCurveTo(-0.3, 1.2, -0.5, 1.0, -0.5, 0.8); // Top left
  shape.bezierCurveTo(-0.5, 0.5, -0.2, 0.4, 0, 0); // Left lobe back to base

  const extrudeSettings = {
    depth: 0.02,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2); // Lay flat

  return geometry;
}

/**
 * Create Elephant Ear / Alocasia (large oval leaf)
 */
function createElephantEarLeaf() {
  const shape = new THREE.Shape();
  const width = 1.5;
  const height = 1.2;

  // Oval with slight point at top
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width/2, 0, width/2, height*0.7, width/3, height);
  shape.bezierCurveTo(0, height*1.1, -width/3, height, -width/2, height*0.7);
  shape.bezierCurveTo(-width/2, 0, 0, 0, 0, 0);

  const extrudeSettings = {
    depth: 0.03,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 3); // Angled up

  return geometry;
}

/**
 * Create Banana leaf (elongated curved segments)
 */
function createBananaLeaf() {
  const geometry = new THREE.PlaneGeometry(0.4, 2.0, 3, 8);

  // Curve it
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const curve = Math.sin((y + 1) * Math.PI / 2) * 0.2;
    positions.setX(i, positions.getX(i) + curve);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create a full plant (5-7 leaves)
 */
function createPlant(type) {
  const group = new THREE.Group();

  // Random color variation ±8%
  const baseColor = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
  const hue = baseColor.getHSL({ h: 0, s: 0, l: 0 });
  const variedColor = new THREE.Color().setHSL(
    hue.h,
    hue.s,
    hue.l * (0.92 + Math.random() * 0.16)
  );

  const material = new THREE.MeshLambertMaterial({
    color: variedColor,
    side: THREE.DoubleSide
  });

  let leafGeometry;
  let leafCount;
  let heightRange;

  switch(type) {
    case 'monstera':
      leafGeometry = createMonsteraLeaf();
      leafCount = 5 + Math.floor(Math.random() * 3); // 5-7
      heightRange = [0.8, 1.2];
      break;
    case 'elephantear':
      leafGeometry = createElephantEarLeaf();
      leafCount = 3 + Math.floor(Math.random() * 2); // 3-4
      heightRange = [1.5, 2.0];
      break;
    case 'banana':
      leafGeometry = createBananaLeaf();
      leafCount = 2 + Math.floor(Math.random() * 2); // 2-3
      heightRange = [1.8, 2.2];
      break;
  }

  // Create leaves in spiral arrangement
  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.Mesh(leafGeometry, material);

    const angle = (i / leafCount) * Math.PI * 2;
    const height = heightRange[0] + Math.random() * (heightRange[1] - heightRange[0]);

    leaf.position.y = height;
    leaf.rotation.y = angle;
    leaf.rotation.x = -0.3 + Math.random() * 0.2; // Slight droop

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.02, 0.03, height, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: STEM_COLOR });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = height / 2;
    stem.rotation.z = Math.sin(angle) * 0.1;

    group.add(stem);
    group.add(leaf);
  }

  return group;
}

/**
 * Place plant clusters across grass zones
 */
function createVegetation(scene) {
  _vegetationGroup = new THREE.Group();
  _windPhases = [];

  const clusterPositions = [];
  const plantTypes = ['monstera', 'elephantear', 'banana'];

  // Generate cluster positions with spacing
  let attempts = 0;
  while (clusterPositions.length < PLANT_CLUSTERS && attempts < 500) {
    attempts++;

    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;

    if (!isValidGrassPosition(x, z)) continue;

    // Check spacing from other clusters
    const tooClose = clusterPositions.some(pos =>
      Math.hypot(pos.x - x, pos.z - z) < MIN_CLUSTER_SPACING
    );

    if (!tooClose) {
      clusterPositions.push({ x, z });
      _windPhases.push(Math.random() * Math.PI * 2); // Random phase per cluster
    }
  }

  // Create plants at each cluster
  clusterPositions.forEach((clusterPos, clusterIdx) => {
    const clusterGroup = new THREE.Group();
    clusterGroup.position.set(clusterPos.x, 0, clusterPos.z);

    const plantsInCluster = PLANTS_PER_CLUSTER + Math.floor(Math.random() * 2);

    for (let i = 0; i < plantsInCluster; i++) {
      const type = plantTypes[Math.floor(Math.random() * plantTypes.length)];
      const plant = createPlant(type);

      // Offset within cluster
      const angle = (i / plantsInCluster) * Math.PI * 2;
      const dist = Math.random() * CLUSTER_RADIUS;
      plant.position.x = Math.cos(angle) * dist;
      plant.position.z = Math.sin(angle) * dist;
      plant.rotation.y = Math.random() * Math.PI * 2;

      clusterGroup.add(plant);
    }

    clusterGroup.userData.clusterIndex = clusterIdx;
    _vegetationGroup.add(clusterGroup);
  });

  scene.add(_vegetationGroup);
  console.log(`[islandDecor] Created ${clusterPositions.length} plant clusters (${clusterPositions.length * PLANTS_PER_CLUSTER} plants avg)`);
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 2: BEACH FURNITURE (Beach zones)
// ══════════════════════════════════════════════════════════════════════════════

// Fixed umbrella line — two rows flanking the marina deck, so none sit on the deck or
// pier. The deck occupies worldZ roughly [-65, +65] at X ~ -300..-346, so umbrellas are
// placed at |Z| >= 75 on each side, all on open sand (verified radius <= 345). The sea is
// toward -X here, so every spot + its chairs face -X and a sitter looks out at the water.
// Explicit positions => identical placement on every refresh.
const BEACH_LINE_X = -300;         // sand line, seaward, in front of the deck
const BEACH_FACE_ANGLE = Math.PI;  // face -X (toward the open sea on this shore)
// The furniture is modelled at ~human real scale, but the player character is ~3 m tall,
// so the whole beach spot is scaled up to fit. Tweak this one number to make the
// umbrellas/chairs bigger or smaller relative to the player.
const BEACH_SPOT_SCALE = 2.4;
// Real-world seat height (metres) shared by createBeachChair() (renders the seat mesh
// there) and createBeachFurniture() (derives SIT_Y from it) — keep them reading from
// this one constant so the two stay matched.
const BEACH_SEAT_TOP_WORLD = 1.35; // TALL chair — seat surface up where the raised player sits
const BEACH_SPOT_POSITIONS = [
  // North of the deck (-Z side)
  { x: BEACH_LINE_X, z:  -75 },
  { x: BEACH_LINE_X, z:  -90 },
  { x: BEACH_LINE_X, z: -105 },
  { x: BEACH_LINE_X, z: -120 },
  { x: BEACH_LINE_X, z: -135 },
  { x: BEACH_LINE_X, z: -150 },
  // South of the deck (+Z side)
  { x: BEACH_LINE_X, z:   75 },
  { x: BEACH_LINE_X, z:   90 },
  { x: BEACH_LINE_X, z:  105 },
  { x: BEACH_LINE_X, z:  120 },
  { x: BEACH_LINE_X, z:  135 },
  { x: BEACH_LINE_X, z:  150 },
];

// Umbrella colors (vertex colors, alternating panels)
const UMBRELLA_COLORS = [
  new THREE.Color(0xd85a30), // Coral
  new THREE.Color(0x1d9e75), // Turquoise
  new THREE.Color(0xef9f27), // Amber
  new THREE.Color(0xffffff), // White
];

/**
 * Create beach umbrella (pole + 8-panel canopy)
 */
function createUmbrella() {
  const group = new THREE.Group();

  // Pole
  const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 }); // Wood
  const pole = new THREE.Mesh(poleGeom, poleMat);
  pole.position.y = 1.1;
  group.add(pole);

  // Canopy (8 panels as cone segments)
  const canopyGeom = new THREE.ConeGeometry(1.6, 0.6, 8, 1, false, 0, Math.PI * 2);

  // Assign alternating vertex colors
  const colors = new Float32Array(canopyGeom.attributes.position.count * 3);
  const positions = canopyGeom.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const angle = Math.atan2(positions.getZ(i), positions.getX(i));
    const panelIndex = Math.floor((angle + Math.PI) / (Math.PI * 2 / 8)) % 8;
    const color = UMBRELLA_COLORS[panelIndex % UMBRELLA_COLORS.length];

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  canopyGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const canopyMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide
  });
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.position.y = 2.2;
  // Fixed canopy orientation (was Math.random()) so each umbrella looks identical
  // every load now that positions are locked.
  canopy.rotation.y = 0;
  group.add(canopy);

  return group;
}

/**
 * Create beach chair (sized to fit the seated ~3 m player, like the plaza bench)
 *
 * The whole beach spot is scaled by BEACH_SPOT_SCALE so the UMBRELLA looks big, but the
 * chair must stay roughly bench-sized to fit the character (who is only scaled 1.2 when
 * seated). So the chair counter-scales the spot scale and targets a real world size:
 * seat ~1.4 m wide, seat surface at BEACH_SEAT_TOP_WORLD (a tall lounger, well above the
 * plaza bench's seat).
 */
function createBeachChair() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  // Real-world target sizes (metres), independent of the umbrella's big spot scale.
  const SEAT_W = 1.6;          // wide enough to fit the ~3 m character
  const SEAT_D = 1.3;          // seat depth — shortened so it doesn't jut out past the legs
  const SEAT_TOP_WORLD = BEACH_SEAT_TOP_WORLD;
  const SEAT_THICK = 0.15;

  // Counter the spot scale so these world sizes come out right after the group is scaled.
  const inv = 1 / BEACH_SPOT_SCALE;
  const seatTopLocal = SEAT_TOP_WORLD * inv;
  const seatCenterLocal = seatTopLocal - (SEAT_THICK * inv) / 2;

  // Seat
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(SEAT_W * inv, SEAT_THICK * inv, SEAT_D * inv), mat);
  seat.position.y = seatCenterLocal;
  group.add(seat);

  // Backrest — upright, behind the seat
  const BACK_H = 1.2;
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(SEAT_W * inv, BACK_H * inv, 0.12 * inv), mat);
  back.position.y = seatTopLocal + (BACK_H * inv) / 2;
  back.position.z = -(SEAT_D * inv) / 2;
  back.rotation.x = -0.12; // slight lean
  group.add(back);

  // Legs from the sand up to the seat underside
  const legMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
  const legTopLocal = seatCenterLocal - (SEAT_THICK * inv) / 2;
  if (legTopLocal > 0.01) {
    const legGeom = new THREE.CylinderGeometry(0.04 * inv, 0.04 * inv, legTopLocal, 6);
    const hx = (SEAT_W * inv) / 2 - 0.1 * inv;
    const hz = (SEAT_D * inv) / 2 - 0.1 * inv;
    [[-hx, hz], [hx, hz], [-hx, -hz], [hx, -hz]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(lx, legTopLocal / 2, lz);
      group.add(leg);
    });
  }

  return group;
}

/**
 * Create beach towel (flat colorful plane)
 */
function createTowel(colorIndex = 0) {
  const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];
  // Deterministic colour (was Math.random()) so a given spot looks the same each load.
  const color = colors[colorIndex % colors.length];

  const geom = new THREE.PlaneGeometry(1.2, 1.8);
  const mat = new THREE.MeshLambertMaterial({
    color,
    side: THREE.DoubleSide
  });
  const towel = new THREE.Mesh(geom, mat);
  towel.rotation.x = -Math.PI / 2; // Lay flat
  towel.position.y = 0.01; // Slightly above sand

  return towel;
}

/**
 * Create small table
 */
function createTable() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xd4a574 }); // Light wood

  // Tabletop
  const topGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
  const top = new THREE.Mesh(topGeom, mat);
  top.position.y = 0.5;
  group.add(top);

  // Leg
  const legGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
  const leg = new THREE.Mesh(legGeom, mat);
  leg.position.y = 0.25;
  group.add(leg);

  return group;
}

/**
 * Create complete beach spot (merged into single mesh for performance)
 */
function createBeachSpot(colorIndex = 0) {
  const group = new THREE.Group();

  const umbrella = createUmbrella();
  group.add(umbrella);

  // 2 chairs on the SEA side of the umbrella, side by side, both facing the water.
  // The spot faces -X (sea), so chairs must be separated along the SHORE axis (local Z,
  // which maps to world Z here) and share the same distance from the sea (same local X).
  // Each chair is rotated PI/2 to look toward -X (the ocean).
  const chair1 = createBeachChair();
  chair1.position.set(1.2, 0, -0.8);
  chair1.rotation.y = Math.PI / 2; // face the sea
  group.add(chair1);

  const chair2 = createBeachChair();
  chair2.position.set(1.2, 0, 0.8);
  chair2.rotation.y = Math.PI / 2; // face the sea
  group.add(chair2);

  // Towel on the sea side, in front of the chairs (further toward the water)
  const towel = createTowel(colorIndex);
  towel.position.set(2.0, 0, 0);
  group.add(towel);

  // Table beside the chairs
  const table = createTable();
  table.position.set(0.5, 0, 0);
  group.add(table);

  return group;
}

/**
 * Place beach spots along shoreline
 *
 * Umbrellas are placed at FIXED positions (BEACH_SPOT_POSITIONS) so they stay put
 * across refreshes. Each spot faces the sea, and each chair gets a "sit" interaction
 * so the player can sit and look out at the water.
 */
function createBeachFurniture(scene) {
  const beachGroup = new THREE.Group();

  // Chair local offsets (before scale/rotation) — must match createBeachSpot().
  const CHAIR_LOCAL_OFFSETS = [
    { x: 1.2, z: -0.8 },
    { x: 1.2, z: 0.8 },
  ];
  const SEAT_LOCAL_Y = 0.38;                // top surface of the chair seat (local, pre-scale)
  // IMPORTANT: SIT_Y is NOT the seat height — it's the world Y handed to sitOnBench(),
  // which the shared sit pose (localPlayer.js / CharacterBuilder.js, same rig the plaza
  // bench uses) then raises by a fixed ~1.11 m to place the hip. That offset was measured
  // directly against the running character rig (charModel's hip pivot ends up at
  // SIT_Y + ~1.1096 world units, independent of location) and confirmed visually: at
  // SIT_Y = 1.3 the character floated far above the seat; at SIT_Y = BEACH_SEAT_TOP_WORLD
  // - 1.11 the hips rest right on the seat plank. Don't set SIT_Y to match the seat height
  // directly — always derive it from BEACH_SEAT_TOP_WORLD via this offset.
  //
  // TUNING: if the character sits slightly INTO the seat, or slightly ABOVE it, adjust
  // this one number by +/- 0.05 and reload. Increasing it LOWERS the character relative
  // to the seat; decreasing it RAISES the character. (SIT_Y = SEAT_TOP - SIT_HIP_RAISE.)
  const SIT_HIP_RAISE = 0.85; // tune by eye: LOWER value raises the character off the seat
  const SIT_Y = BEACH_SEAT_TOP_WORLD - SIT_HIP_RAISE;

  // Helper: rotate a local (x,z) by the spot's Y rotation
  const rotY = (x, z, t) => ({
    x: x * Math.cos(t) + z * Math.sin(t),
    z: -x * Math.sin(t) + z * Math.cos(t),
  });

  BEACH_SPOT_POSITIONS.forEach((pos, index) => {
    // Skip any spot that isn't actually on the beach (safety check — keeps the row
    // clean if a coordinate is ever edited to somewhere invalid).
    if (!isValidBeachPosition(pos.x, pos.z)) {
      console.warn(`[islandDecor] Beach spot ${index} at (${pos.x}, ${pos.z}) is not on the beach — skipped`);
      return;
    }

    const spot = createBeachSpot(index);
    spot.position.set(pos.x, 0, pos.z);

    // Scale the whole spot up to fit the ~3 m player character (chairs, umbrella, towel,
    // and table all grow together, keeping their arrangement).
    spot.scale.setScalar(BEACH_SPOT_SCALE);

    // Face the sea. On this shore the water is toward -X, so all spots share the same
    // facing (BEACH_FACE_ANGLE = PI). The chairs are oriented within the spot so a
    // sitter looks out at the ocean.
    spot.rotation.y = BEACH_FACE_ANGLE;

    beachGroup.add(spot);

    // ── Register a "sit" interaction on each chair ──────────────────────────────
    // The player should sit facing the SEA (outward from island centre). The player's
    // facing direction in-game is (sin(yaw), cos(yaw)) in (x,z), so to face the outward
    // sea unit vector we use yaw = atan2(seaUnit.x, seaUnit.z). Computed per spot so it
    // stays correct even though the umbrella line curves slightly.
    const seaMag  = Math.hypot(pos.x, pos.z) || 1;
    const sitYaw  = Math.atan2(pos.x / seaMag, pos.z / seaMag);

    CHAIR_LOCAL_OFFSETS.forEach((off, chairIdx) => {
      // World position of this chair = spot position + rotate(scaled local offset).
      const sx = off.x * BEACH_SPOT_SCALE;
      const sz = off.z * BEACH_SPOT_SCALE;
      const r  = rotY(sx, sz, BEACH_FACE_ANGLE);
      const worldX = pos.x + r.x;
      const worldZ = pos.z + r.z;

      // Toggle: sit if standing, stand if already sitting (same pattern as the plaza bench).
      registerInteraction(
        [worldX, SEAT_LOCAL_Y * BEACH_SPOT_SCALE + 0.5, worldZ], // label anchor above the seat
        'שב 🏖️',                          // "Sit" label
        3.0,                              // interaction range (metres)
        () => {
          if (isPlayerSitting()) {
            standUp();
          } else {
            // SIT_Y is derived from the seat height via the measured hip offset above.
            sitOnBench(worldX, SIT_Y, worldZ, sitYaw);
          }
        }
      );
    });
  });

  scene.add(beachGroup);
  console.log(`[islandDecor] Created ${beachGroup.children.length} beach spots (fixed positions, sit-enabled)`);
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATION
// ══════════════════════════════════════════════════════════════════════════════

export function updateIslandDecor(delta, playerPos) {
  if (!_vegetationGroup) return;

  const time = performance.now() * 0.001;

  // Gentle wind sway on vegetation
  _vegetationGroup.children.forEach((cluster, idx) => {
    const phase = _windPhases[idx];
    const dist = Math.hypot(cluster.position.x - playerPos.x, cluster.position.z - playerPos.z);

    // Only animate if within 90m of player
    if (dist < 90) {
      const sway = Math.sin(time * 0.5 + phase) * 0.044; // ±2.5° in radians
      cluster.rotation.z = sway;
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

export function initIslandDecor(scene) {
  console.log('[islandDecor] Initializing tropical decorations...');

  createVegetation(scene);
  createBeachFurniture(scene);

  console.log('[islandDecor] Decorations complete');
}