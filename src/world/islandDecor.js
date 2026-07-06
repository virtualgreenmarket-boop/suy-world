/**
 * islandDecor.js
 * Tropical vegetation and beach furniture decorations
 * LOW-POLY PROCEDURAL ONLY - No GLB, no external textures
 * MeshLambertMaterial ONLY - MeshStandard crashes EffectComposer
 */

import * as THREE from 'three';
import { isValidGrassPosition, isValidBeachPosition } from './mapZones.js';

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

const BEACH_SPOTS = 10; // 8-12 spots
const SPOT_SPACING = 20; // 15-25m between spots

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
  canopy.rotation.y = Math.random() * Math.PI * 2;
  group.add(canopy);

  return group;
}

/**
 * Create beach chair (simple box lounge chair)
 */
function createBeachChair() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  // Seat
  const seatGeom = new THREE.BoxGeometry(0.6, 0.1, 0.8);
  const seat = new THREE.Mesh(seatGeom, mat);
  seat.position.y = 0.3;
  group.add(seat);

  // Backrest (angled)
  const backGeom = new THREE.BoxGeometry(0.6, 0.6, 0.1);
  const back = new THREE.Mesh(backGeom, mat);
  back.position.y = 0.5;
  back.position.z = -0.35;
  back.rotation.x = -0.6; // ~35° angle
  group.add(back);

  // Legs (4 simple cylinders)
  const legGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x808080 });

  const legPositions = [
    [-0.25, 0.15, 0.3],
    [0.25, 0.15, 0.3],
    [-0.25, 0.15, -0.3],
    [0.25, 0.15, -0.3]
  ];

  legPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeom, legMat);
    leg.position.set(...pos);
    group.add(leg);
  });

  return group;
}

/**
 * Create beach towel (flat colorful plane)
 */
function createTowel() {
  const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];
  const color = colors[Math.floor(Math.random() * colors.length)];

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
function createBeachSpot() {
  const group = new THREE.Group();

  const umbrella = createUmbrella();
  group.add(umbrella);

  // 2 chairs facing the sea
  const chair1 = createBeachChair();
  chair1.position.set(-0.8, 0, 1.2);
  chair1.rotation.y = 0; // Facing forward
  group.add(chair1);

  const chair2 = createBeachChair();
  chair2.position.set(0.8, 0, 1.2);
  chair2.rotation.y = 0;
  group.add(chair2);

  // Towel
  const towel = createTowel();
  towel.position.set(0, 0, 2.0);
  group.add(towel);

  // Table
  const table = createTable();
  table.position.set(0, 0, 0.5);
  group.add(table);

  return group;
}

/**
 * Place beach spots along shoreline
 */
function createBeachFurniture(scene) {
  const beachGroup = new THREE.Group();
  const spotPositions = [];

  // Sample beach zone for valid positions
  let attempts = 0;
  while (spotPositions.length < BEACH_SPOTS && attempts < 500) {
    attempts++;

    // Sample around the island perimeter
    const angle = Math.random() * Math.PI * 2;
    const radius = 270 + Math.random() * 60; // Beach zone 255-350

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (!isValidBeachPosition(x, z)) continue;

    // Check spacing
    const tooClose = spotPositions.some(pos =>
      Math.hypot(pos.x - x, pos.z - z) < SPOT_SPACING
    );

    if (!tooClose) {
      spotPositions.push({ x, z, angle });
    }
  }

  // Create spots facing outward (toward sea)
  spotPositions.forEach(pos => {
    const spot = createBeachSpot();
    spot.position.set(pos.x, 0, pos.z);

    // Rotate to face outward from island center
    spot.rotation.y = pos.angle;

    beachGroup.add(spot);
  });

  scene.add(beachGroup);
  console.log(`[islandDecor] Created ${spotPositions.length} beach spots`);
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
