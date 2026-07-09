/**
 * islandLife.js
 * Marine life animations - fish schools, crabs, dolphins
 * INSTANCED MESHES for performance
 * MeshLambertMaterial ONLY
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { isValidShallowWaterPosition } from './mapZones.js';

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 3: SHALLOW WATER LIFE
// ══════════════════════════════════════════════════════════════════════════════

const FISH_SCHOOLS = 7; // Increased from 5 to add patrols near marina and lighthouse
const FISH_PER_SCHOOL = 25; // 22-28
const FISH_SWIM_SPEED = 0.7; // m/s
const FISH_DEPTH_RANGE = [0.2, 0.6]; // meters below water surface

const CRAB_COUNT = 10;
const CRAB_SCUTTLE_SPEED = 0.3; // m/s

// School colors
const SCHOOL_COLORS = [
  new THREE.Color(0xc0c0c0), // Silver
  new THREE.Color(0x4dd0e1), // Turquoise
  new THREE.Color(0xffd54f), // Yellow
];

let _fishSchools = [];
let _crabInstances = [];
let _crabStates = [];

/**
 * Create fish geometry (stretched octahedron + flat tail)
 */
function createFishGeometry() {
  // Body (octahedron stretched along X)
  const bodyGeom = new THREE.OctahedronGeometry(0.1, 0);
  const positions = bodyGeom.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setX(i, x * 1.5); // Stretch forward/back
  }

  positions.needsUpdate = true;
  bodyGeom.computeVertexNormals();

  // Tail (triangle fan)
  const tailGeom = new THREE.BufferGeometry();
  const tailVertices = new Float32Array([
    -0.15, 0, 0, // Base center
    -0.25, 0.08, 0, // Top
    -0.25, -0.08, 0, // Bottom
  ]);
  tailGeom.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
  tailGeom.setIndex([0, 1, 2]);
  tailGeom.computeVertexNormals();

  // Merge
  const mergedGeom = new THREE.BufferGeometry();
  const bodyPositions = bodyGeom.attributes.position.array;
  const tailPositions = tailGeom.attributes.position.array;

  const combined = new Float32Array(bodyPositions.length + tailPositions.length);
  combined.set(bodyPositions);
  combined.set(tailPositions, bodyPositions.length);

  mergedGeom.setAttribute('position', new THREE.BufferAttribute(combined, 3));

  // Indices - handle case where geometry might not have index
  const bodyIndices = bodyGeom.index ? Array.from(bodyGeom.index.array) : [];
  const tailIndices = tailGeom.index ? Array.from(tailGeom.index.array).map(i => i + bodyPositions.length / 3) : [];

  if (bodyIndices.length > 0 || tailIndices.length > 0) {
    mergedGeom.setIndex([...bodyIndices, ...tailIndices]);
  }

  mergedGeom.computeVertexNormals();

  return mergedGeom;
}

/**
 * Create fish schools with waypoint movement
 */
function createFishSchools(scene) {
  const fishGeometry = createFishGeometry();

  for (let s = 0; s < FISH_SCHOOLS; s++) {
    const schoolSize = FISH_PER_SCHOOL + Math.floor(Math.random() * 7) - 3; // 22-28
    const schoolColor = SCHOOL_COLORS[s % SCHOOL_COLORS.length];

    const material = new THREE.MeshLambertMaterial({
      color: schoolColor,
      side: THREE.DoubleSide
    });

    const instancedMesh = new THREE.InstancedMesh(fishGeometry, material, schoolSize);
    instancedMesh.castShadow = false;
    instancedMesh.receiveShadow = false;

    // Generate waypoints in shallow water near play areas
    // Bias toward spawn/marina/lighthouse/east beach
    // CRITICAL: Convert angle to actual world position to account for player spawn at marina
    // Adjusted positions closer to shore (355-380m range instead of 370-470)
    const playAreaCenters = [
      { x: 365, z: 0, name: 'East beach' },           // East shallow water (closer)
      { x: -360, z: 20, name: 'Marina pier' },        // Right at marina fishing spots
      { x: -360, z: -20, name: 'Marina south' },      // Marina south side
      { x: 20, z: -365, name: 'Lighthouse cove' },    // Near lighthouse
      { x: 0, z: 365, name: 'North beach' },          // North shallow water
      { x: 260, z: 260, name: 'Southeast lagoon' },   // Southeast diagonal
      { x: -260, z: -260, name: 'Southwest cove' }    // Southwest diagonal
    ];
    const playArea = playAreaCenters[s % playAreaCenters.length];

    // Generate 4 waypoints within a ~25m patrol area
    const waypoints = [];
    // Use play area center with small random offset
    const patrolCenterX = playArea.x + (Math.random() - 0.5) * 20;
    const patrolCenterZ = playArea.z + (Math.random() - 0.5) * 20;

    for (let w = 0; w < 4; w++) {
      let x, z, validPoint;
      let attempts = 0;

      do {
        // Waypoint within 25m patrol area around patrol center
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * 12.5; // Up to 12.5m from center
        x = patrolCenterX + Math.cos(offsetAngle) * offsetDist;
        z = patrolCenterZ + Math.sin(offsetAngle) * offsetDist;
        validPoint = isValidShallowWaterPosition(x, z);
        attempts++;

        // If 50 attempts fail, fallback to ring position with definite values
        if (attempts >= 50 && !validPoint) {
          // Place on a ring around patrol center at fixed radius
          const angle = (w / 4) * Math.PI * 2;
          x = patrolCenterX + Math.cos(angle) * 10;
          z = patrolCenterZ + Math.sin(angle) * 10;
          console.warn(`[islandLife] School ${s} (${playArea.name}) waypoint ${w} failed validation, using ring fallback (${x.toFixed(1)}, ${z.toFixed(1)})`);
          validPoint = true; // Force accept
          break;
        }
      } while (!validPoint && attempts < 50);

      waypoints.push(new THREE.Vector3(x, 0, z));
    }

    // School state
    const schoolState = {
      instancedMesh,
      waypoints,
      currentWaypoint: 0,
      centerPos: waypoints[0].clone(),
      fishOffsets: [],
      fishPhases: []
    };

    // Generate individual fish offsets
    for (let f = 0; f < schoolSize; f++) {
      schoolState.fishOffsets.push({
        x: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
        depth: FISH_DEPTH_RANGE[0] + Math.random() * (FISH_DEPTH_RANGE[1] - FISH_DEPTH_RANGE[0])
      });
      schoolState.fishPhases.push(Math.random() * Math.PI * 2);
    }

    // CRITICAL: Initialize all fish positions immediately (bug fix #1)
    // Without this, fish stay at (0,0,0) until updateIslandLife runs and player is within 90m
    const matrix = new THREE.Matrix4();
    for (let f = 0; f < schoolSize; f++) {
      const offset = schoolState.fishOffsets[f];
      const phase = schoolState.fishPhases[f];

      const x = schoolState.centerPos.x + offset.x;
      const z = schoolState.centerPos.z + offset.z;
      const y = -offset.depth;

      matrix.identity();
      matrix.makeRotationY(0); // Initial facing
      matrix.setPosition(x, y, z);
      instancedMesh.setMatrixAt(f, matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    _fishSchools.push(schoolState);
    scene.add(instancedMesh);

    console.log(`[islandLife] School ${s} (${playArea.name}): patrol center (${patrolCenterX.toFixed(1)}, ${patrolCenterZ.toFixed(1)}), ${waypoints.length} waypoints`);
  }

  console.log(`[islandLife] Created ${FISH_SCHOOLS} fish schools (${FISH_PER_SCHOOL * FISH_SCHOOLS} fish total)`);
}

/**
 * Create crab geometry
 */
function createCrabGeometry() {
  const group = new THREE.Group();

  // Body (flattened box)
  const bodyGeom = new THREE.BoxGeometry(0.2, 0.1, 0.15);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xd85a30 }); // Orange-red
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = 0.05;
  group.add(body);

  // Legs (3 per side - simple boxes)
  const legGeom = new THREE.BoxGeometry(0.12, 0.03, 0.02);
  const legMat = new THREE.MeshLambertMaterial({ color: 0xc04828 });

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(side * 0.15, 0.03, -0.05 + i * 0.05);
      leg.rotation.y = side * 0.5;
      group.add(leg);
    }
  }

  // Claws (2 boxes per claw)
  const clawBaseGeom = new THREE.BoxGeometry(0.08, 0.04, 0.04);
  const clawTipGeom = new THREE.BoxGeometry(0.06, 0.03, 0.03);

  for (let side = -1; side <= 1; side += 2) {
    const clawBase = new THREE.Mesh(clawBaseGeom, legMat);
    clawBase.position.set(side * 0.18, 0.07, 0.1);
    group.add(clawBase);

    const clawTip = new THREE.Mesh(clawTipGeom, legMat);
    clawTip.position.set(side * 0.22, 0.09, 0.12);
    group.add(clawTip);
  }

  // Convert group to single geometry
  const mergedGeom = new THREE.BufferGeometry();
  const geometries = [];

  group.traverse(child => {
    if (child.isMesh) {
      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrix);
      geometries.push(geom);
    }
  });

  return BufferGeometryUtils.mergeGeometries(geometries);
}

/**
 * Create crabs along waterline
 */
function createCrabs(scene) {
  const crabGeometry = createCrabGeometry();
  const crabMaterial = new THREE.MeshLambertMaterial({ color: 0xd85a30 });

  const crabMesh = new THREE.InstancedMesh(crabGeometry, crabMaterial, CRAB_COUNT);
  crabMesh.castShadow = false;

  // Place crabs along beach waterline (radius ~350)
  for (let i = 0; i < CRAB_COUNT; i++) {
    const angle = (i / CRAB_COUNT) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 345 + Math.random() * 10; // Near waterline
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const matrix = new THREE.Matrix4();
    matrix.setPosition(x, 0.05, z);
    crabMesh.setMatrixAt(i, matrix);

    _crabStates.push({
      x,
      z,
      angle,
      moveTimer: Math.random() * 5, // Random start delay
      isMoving: false,
      targetX: x,
      targetZ: z,
      phase: Math.random() * Math.PI * 2
    });
  }

  crabMesh.instanceMatrix.needsUpdate = true;
  _crabInstances.push(crabMesh);
  scene.add(crabMesh);

  console.log(`[islandLife] Created ${CRAB_COUNT} crabs`);
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 4: DEEP WATER - DOLPHINS
// ══════════════════════════════════════════════════════════════════════════════

const DOLPHIN_POOL_SIZE = 3;
const JUMP_INTERVAL_MIN = 20; // seconds
const JUMP_INTERVAL_MAX = 45;
const JUMP_ARC_HEIGHT = [2.5, 3.5]; // meters
const JUMP_ARC_LENGTH = [7, 10]; // meters
const JUMP_DURATION = [1.8, 2.2]; // seconds

let _dolphinPool = [];
let _activeDolphins = [];
let _nextJumpTime = 0;
let _splashParticles = null;

/**
 * Create dolphin geometry
 */
function createDolphinGeometry() {
  const group = new THREE.Group();

  // Body (capsule - stretched sphere)
  const bodyGeom = new THREE.SphereGeometry(0.5, 16, 12);
  const positions = bodyGeom.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setX(i, x * 2); // Stretch to 2m length
  }

  positions.needsUpdate = true;
  bodyGeom.computeVertexNormals();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x6f8291 }); // Gray
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  group.add(body);

  // Belly (lighter patch)
  const bellyGeom = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI);
  const bellyMat = new THREE.MeshLambertMaterial({ color: 0xb0c4de }); // Light blue-gray
  const belly = new THREE.Mesh(bellyGeom, bellyMat);
  belly.rotation.z = Math.PI;
  belly.position.y = -0.2;
  group.add(belly);

  // Dorsal fin
  const finGeom = new THREE.ConeGeometry(0.15, 0.4, 8);
  const finMat = new THREE.MeshLambertMaterial({ color: 0x6f8291 });
  const fin = new THREE.Mesh(finGeom, finMat);
  fin.rotation.z = Math.PI / 2;
  fin.position.y = 0.3;
  group.add(fin);

  // Tail flukes (two flat triangles)
  const flukeGeom = new THREE.ConeGeometry(0.3, 0.1, 3);
  const fluke1 = new THREE.Mesh(flukeGeom, finMat);
  fluke1.rotation.z = Math.PI / 2;
  fluke1.position.set(-0.9, 0.15, 0);
  group.add(fluke1);

  const fluke2 = new THREE.Mesh(flukeGeom, finMat);
  fluke2.rotation.z = Math.PI / 2;
  fluke2.position.set(-0.9, -0.15, 0);
  group.add(fluke2);

  // Snout (small cone)
  const snoutGeom = new THREE.ConeGeometry(0.1, 0.3, 8);
  const snout = new THREE.Mesh(snoutGeom, bodyMat);
  snout.rotation.z = -Math.PI / 2;
  snout.position.x = 1.1;
  group.add(snout);

  // Merge to single geometry
  const geometries = [];
  group.traverse(child => {
    if (child.isMesh) {
      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrix);
      geometries.push(geom);
    }
  });

  return BufferGeometryUtils.mergeGeometries(geometries);
}

/**
 * Create dolphin pool (reusable)
 */
function createDolphinPool(scene) {
  const dolphinGeometry = createDolphinGeometry();
  const dolphinMaterial = new THREE.MeshLambertMaterial({ color: 0x6f8291 });

  for (let i = 0; i < DOLPHIN_POOL_SIZE; i++) {
    const dolphin = new THREE.Mesh(dolphinGeometry, dolphinMaterial);
    dolphin.visible = false;
    dolphin.castShadow = false;
    scene.add(dolphin);

    _dolphinPool.push({
      mesh: dolphin,
      inUse: false
    });
  }

  // Splash particles pool
  const splashGeom = new THREE.PlaneGeometry(0.3, 0.3);
  const splashMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });

  _splashParticles = new THREE.InstancedMesh(splashGeom, splashMat, 20);
  _splashParticles.visible = false;
  scene.add(_splashParticles);

  console.log(`[islandLife] Created dolphin pool (${DOLPHIN_POOL_SIZE} dolphins)`);
}

/**
 * Trigger dolphin jump
 */
function triggerDolphinJump(playerPos) {
  // Find available dolphin(s)
  const available = _dolphinPool.filter(d => !d.inUse);
  if (available.length === 0) return;

  const jumpCount = 1 + Math.floor(Math.random() * Math.min(3, available.length));

  for (let i = 0; i < jumpCount; i++) {
    const dolphin = available[i];
    dolphin.inUse = true;

    // Jump parameters
    const arcHeight = JUMP_ARC_HEIGHT[0] + Math.random() * (JUMP_ARC_HEIGHT[1] - JUMP_ARC_HEIGHT[0]);
    const arcLength = JUMP_ARC_LENGTH[0] + Math.random() * (JUMP_ARC_LENGTH[1] - JUMP_ARC_LENGTH[0]);
    const duration = JUMP_DURATION[0] + Math.random() * (JUMP_DURATION[1] - JUMP_DURATION[0]);

    // Start position (deep water, 40-120m from shore, bias toward player view)
    const angleToPlayer = Math.atan2(playerPos.z, playerPos.x);
    const angleVariation = (Math.random() - 0.5) * Math.PI / 2;
    const angle = angleToPlayer + angleVariation;

    const radius = 450 + Math.random() * 100; // Deep water
    const startX = Math.cos(angle) * radius;
    const startZ = Math.sin(angle) * radius;

    // Jump direction (toward shore or parallel)
    const jumpAngle = angle + Math.PI + (Math.random() - 0.5) * Math.PI / 4;
    const endX = startX + Math.cos(jumpAngle) * arcLength;
    const endZ = startZ + Math.sin(jumpAngle) * arcLength;

    _activeDolphins.push({
      dolphin,
      startPos: new THREE.Vector3(startX, -1, startZ),
      endPos: new THREE.Vector3(endX, -1, endZ),
      arcHeight,
      duration,
      elapsed: 0,
      jumpAngle
    });

    dolphin.mesh.visible = true;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATION
// ══════════════════════════════════════════════════════════════════════════════

export function updateIslandLife(delta, playerPos) {
  const time = performance.now() * 0.001;

  // Fish schools
  _fishSchools.forEach(school => {
    const dist = Math.hypot(school.centerPos.x - playerPos.x, school.centerPos.z - playerPos.z);
    if (dist > 90) return; // Freeze if too far

    // Move toward next waypoint
    const target = school.waypoints[school.currentWaypoint];
    const dir = new THREE.Vector3().subVectors(target, school.centerPos);
    const distToTarget = dir.length();

    if (distToTarget < 2) {
      // Reached waypoint, move to next
      school.currentWaypoint = (school.currentWaypoint + 1) % school.waypoints.length;
    } else {
      // Move toward target
      dir.normalize().multiplyScalar(FISH_SWIM_SPEED * delta);
      school.centerPos.add(dir);
    }

    // Update individual fish instances
    const matrix = new THREE.Matrix4();
    const swimAngle = Math.atan2(dir.z, dir.x);

    school.fishOffsets.forEach((offset, i) => {
      const phase = school.fishPhases[i];
      const wiggle = Math.sin(time * 2 + phase) * 0.1; // Side-to-side

      const x = school.centerPos.x + offset.x + Math.sin(time + phase) * 0.5;
      const z = school.centerPos.z + offset.z + Math.cos(time + phase) * 0.5;
      const y = -offset.depth;

      matrix.identity();
      matrix.makeRotationY(swimAngle + wiggle);
      matrix.setPosition(x, y, z);

      school.instancedMesh.setMatrixAt(i, matrix);
    });

    school.instancedMesh.instanceMatrix.needsUpdate = true;
  });

  // Crabs
  _crabInstances.forEach(crabMesh => {
    const matrix = new THREE.Matrix4();

    _crabStates.forEach((crab, i) => {
      const dist = Math.hypot(crab.x - playerPos.x, crab.z - playerPos.z);
      if (dist > 90) return;

      crab.moveTimer -= delta;

      if (crab.moveTimer <= 0) {
        if (crab.isMoving) {
          // Stop
          crab.isMoving = false;
          crab.moveTimer = 2 + Math.random() * 3; // Wait 2-5s
        } else {
          // Start moving
          crab.isMoving = true;
          crab.moveTimer = 1 + Math.random() * 2; // Move 1-3s

          // Pick sideways direction
          const sidewaysAngle = crab.angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
          const dist = Math.random() * 2; // Up to 2m
          crab.targetX = crab.x + Math.cos(sidewaysAngle) * dist;
          crab.targetZ = crab.z + Math.sin(sidewaysAngle) * dist;
        }
      }

      if (crab.isMoving) {
        // Scuttle toward target
        const dx = crab.targetX - crab.x;
        const dz = crab.targetZ - crab.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.1) {
          const speed = CRAB_SCUTTLE_SPEED * delta;
          crab.x += (dx / dist) * speed;
          crab.z += (dz / dist) * speed;
          crab.angle = Math.atan2(dz, dx);
        }
      }

      matrix.makeRotationY(crab.angle);
      matrix.setPosition(crab.x, 0.05, crab.z);
      crabMesh.setMatrixAt(i, matrix);
    });

    crabMesh.instanceMatrix.needsUpdate = true;
  });

  // Dolphins
  if (time > _nextJumpTime) {
    triggerDolphinJump(playerPos);
    _nextJumpTime = time + JUMP_INTERVAL_MIN + Math.random() * (JUMP_INTERVAL_MAX - JUMP_INTERVAL_MIN);
  }

  // Update active dolphin jumps
  for (let i = _activeDolphins.length - 1; i >= 0; i--) {
    const jump = _activeDolphins[i];
    jump.elapsed += delta;

    const t = Math.min(jump.elapsed / jump.duration, 1);

    if (t >= 1) {
      // Jump complete
      jump.dolphin.mesh.visible = false;
      jump.dolphin.inUse = false;
      _activeDolphins.splice(i, 1);
    } else {
      // Parabolic arc
      const pos = new THREE.Vector3().lerpVectors(jump.startPos, jump.endPos, t);
      const arc = Math.sin(t * Math.PI) * jump.arcHeight;
      pos.y += arc;

      // Pitch follows velocity tangent
      const vx = (jump.endPos.x - jump.startPos.x) / jump.duration;
      const vy = (Math.cos(t * Math.PI) * Math.PI * jump.arcHeight) / jump.duration;
      const pitch = Math.atan2(vy, vx);

      jump.dolphin.mesh.position.copy(pos);
      jump.dolphin.mesh.rotation.set(pitch, jump.jumpAngle, 0);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

export function initIslandLife(scene) {
  console.log('[islandLife] Initializing marine life...');

  createFishSchools(scene);
  createCrabs(scene);
  createDolphinPool(scene);

  _nextJumpTime = performance.now() * 0.001 + 10; // First jump after 10s

  console.log('[islandLife] Marine life initialized');
}
