// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Dock Fish (decorative fish near marina fishing spots)
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── Constants ─────────────────────────────────────────────────────────

const FISH_GROUPS = [
  // North row (Z≈+28)
  { x: -369.89, z: 28, count: 5 },
  { x: -383.97, z: 28, count: 5 },
  { x: -397.95, z: 28, count: 5 },
  // South row (Z≈-28)
  { x: -369.83, z: -28, count: 5 },
  { x: -383.93, z: -28, count: 5 },
  { x: -397.90, z: -28, count: 5 }
];

const COLOR_VARIANTS = [
  { name: 'silver', color: 0xC9D4D8 },
  { name: 'coral', color: 0xFF6B4A },
  { name: 'gold', color: 0xF0B429 },
  { name: 'turquoise', color: 0x147A82 }
];

const PATROL_RADIUS_MIN = 3;
const PATROL_RADIUS_MAX = 6;
const DEPTH_MIN = -0.8;
const DEPTH_MAX = -0.3;
const VERTICAL_BOB_AMOUNT = 0.15;

// ── State ─────────────────────────────────────────────────────────────

let _instanceMeshes = [];
let _fishData = []; // {variantIndex, groupIndex, fishIndex, center, radius, speed, phase, baseDepth, size}

// ── Procedural Fish Geometry ──────────────────────────────────────────

function _createFishGeometry() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];

  // Body: horizontal cone
  // ConeGeometry(0.5, 1, 6) but we'll build it manually for horizontal orientation
  const bodyRadius = 0.5;
  const bodyLength = 1.0;
  const segments = 6;

  // Tip (front)
  vertices.push(bodyLength / 2, 0, 0);
  const tipIndex = 0;

  // Base circle (back)
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = -bodyLength / 2;
    const y = Math.cos(angle) * bodyRadius * 0.6; // scaled vertically
    const z = Math.sin(angle) * bodyRadius * 0.35; // scaled horizontally
    vertices.push(x, y, z);
  }

  // Body triangles
  for (let i = 0; i < segments; i++) {
    indices.push(tipIndex, i + 1, i + 2);
  }

  // Base cap (back of fish)
  const baseCenter = vertices.length / 3;
  vertices.push(-bodyLength / 2, 0, 0);
  for (let i = 0; i < segments; i++) {
    indices.push(baseCenter, i + 2, i + 1);
  }

  // Tail: flat triangle
  const tailBase = vertices.length / 3;
  vertices.push(-bodyLength / 2, 0, 0); // center back
  vertices.push(-bodyLength / 2 - 0.3, 0.25, 0); // top
  vertices.push(-bodyLength / 2 - 0.3, -0.25, 0); // bottom
  indices.push(tailBase, tailBase + 1, tailBase + 2);

  // Dorsal fin: small triangle on top
  const finBase = vertices.length / 3;
  vertices.push(0, 0, 0); // center top of body
  vertices.push(0.1, 0.4, 0); // fin tip
  vertices.push(-0.1, 0.4, 0);
  indices.push(finBase, finBase + 1, finBase + 2);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// ── Initialization ────────────────────────────────────────────────────

export function initDockFish(scene) {
  try {
    const fishGeometry = _createFishGeometry();

    // Calculate total fish per variant
    const totalFish = FISH_GROUPS.reduce((sum, g) => sum + g.count, 0);
    const fishPerVariant = Math.ceil(totalFish / COLOR_VARIANTS.length);

    // Create InstancedMesh for each color variant
    COLOR_VARIANTS.forEach((variant, variantIndex) => {
      const material = new THREE.MeshLambertMaterial({ color: variant.color });
      const mesh = new THREE.InstancedMesh(fishGeometry, material, fishPerVariant);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      // Initialize all instance matrices to prevent black/invisible fish
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.makeScale(0.01, 0.01, 0.01); // tiny scale initially
      for (let i = 0; i < fishPerVariant; i++) {
        mesh.setMatrixAt(i, tempMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      scene.add(mesh);
      _instanceMeshes.push(mesh);
    });

    // Generate fish data
    let globalFishIndex = 0;
    FISH_GROUPS.forEach((group, groupIndex) => {
      for (let i = 0; i < group.count; i++) {
        const variantIndex = globalFishIndex % COLOR_VARIANTS.length;
        const size = 0.4 + Math.random() * 0.5; // 0.4-0.9m
        const radius = PATROL_RADIUS_MIN + Math.random() * (PATROL_RADIUS_MAX - PATROL_RADIUS_MIN);
        const speed = 0.3 + Math.random() * 0.4; // radians per second
        const phase = Math.random() * Math.PI * 2;
        const baseDepth = DEPTH_MIN + Math.random() * (DEPTH_MAX - DEPTH_MIN);

        _fishData.push({
          variantIndex,
          groupIndex,
          fishIndex: i,
          center: { x: group.x, z: group.z },
          radius,
          speed,
          phase,
          baseDepth,
          size
        });

        globalFishIndex++;
      }
    });

    console.log(`[dockFish] ✅ Initialized ${_fishData.length} fish in ${FISH_GROUPS.length} groups`);
  } catch (err) {
    if (!window._dockFishInitError) {
      console.error('[dockFish] ❌ Init error:', err);
      window._dockFishInitError = true;
    }
  }
}

// ── Update Loop ───────────────────────────────────────────────────────

export function updateDockFish(delta) {
  try {
    const time = Date.now() * 0.001;

    // Count instances per variant
    const instanceCounts = new Array(COLOR_VARIANTS.length).fill(0);

    _fishData.forEach((fish) => {
      const instanceIndex = instanceCounts[fish.variantIndex];
      instanceCounts[fish.variantIndex]++;

      // Elliptical patrol
      const angle = time * fish.speed + fish.phase;
      const x = fish.center.x + Math.cos(angle) * fish.radius;
      const z = fish.center.z + Math.sin(angle) * fish.radius * 0.7; // elliptical

      // Depth with vertical bob
      const bob = Math.sin(time * 2 + fish.phase) * VERTICAL_BOB_AMOUNT;
      const y = fish.baseDepth + bob;

      // Facing direction
      const dx = -Math.sin(angle) * fish.radius * fish.speed;
      const dz = Math.cos(angle) * fish.radius * 0.7 * fish.speed;
      const facingAngle = Math.atan2(dx, dz);

      // Body wobble (simulated tail movement)
      const wobble = Math.sin(time * 8 + fish.phase) * 0.1;

      // Build matrix
      const matrix = new THREE.Matrix4();
      matrix.makeRotationY(facingAngle + wobble);
      matrix.scale(new THREE.Vector3(fish.size, fish.size, fish.size));
      matrix.setPosition(x, y, z);

      _instanceMeshes[fish.variantIndex].setMatrixAt(instanceIndex, matrix);
    });

    // Mark all meshes as needing update
    _instanceMeshes.forEach(mesh => {
      mesh.instanceMatrix.needsUpdate = true;
    });

  } catch (err) {
    if (!window._dockFishUpdateError) {
      console.error('[dockFish] ❌ Update error:', err);
      window._dockFishUpdateError = true;
    }
  }
}
