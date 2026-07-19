/**
 * plants.js
 * Simple procedural flowers and plants to decorate the grass zone.
 * Uses primitive geometry (no external assets) for lightweight decoration.
 */

import * as THREE from 'three';
import { randomGrassPosition } from './mapZones.js';
import { getSurfaceY } from '../systems/terrain.js';

let _plantCount = 0;

// Seeded RNG for deterministic plant placement
function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Global RNG used for all plant randomization (set in initPlants)
let _plantRng = Math.random;

/**
 * Creates a simple flower: stem + petals
 */
function createFlower(color = 0xff69b4, petalCount = 5) {
  const group = new THREE.Group();

  // Stem (thin green cylinder)
  const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6);
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5016,
    roughness: 0.8,
    metalness: 0.0
  });
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = 0.2;
  stem.castShadow = true;
  group.add(stem);

  // Flower head (petals arranged in circle)
  const petalGeometry = new THREE.CircleGeometry(0.08, 8);
  const petalMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    petal.position.set(
      Math.cos(angle) * 0.06,
      0.42,
      Math.sin(angle) * 0.06
    );
    petal.rotation.x = -Math.PI / 2;
    group.add(petal);
  }

  // Center of flower (small yellow sphere)
  const centerGeometry = new THREE.SphereGeometry(0.04, 8, 8);
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffeb3b,
    roughness: 0.5,
    metalness: 0.0
  });
  const center = new THREE.Mesh(centerGeometry, centerMaterial);
  center.position.y = 0.43;
  group.add(center);

  return group;
}

/**
 * Creates a simple bush/shrub (clustered small spheres)
 */
function createBush(color = 0x2d5016) {
  const group = new THREE.Group();
  const bushMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.0
  });

  // Create 3-5 small spheres clustered together (seeded)
  const sphereCount = 3 + Math.floor(_plantRng() * 3);
  for (let i = 0; i < sphereCount; i++) {
    const radius = 0.15 + _plantRng() * 0.1;
    const sphereGeometry = new THREE.SphereGeometry(radius, 8, 8);
    const sphere = new THREE.Mesh(sphereGeometry, bushMaterial);

    // Random offset from center (seeded)
    sphere.position.set(
      (_plantRng() - 0.5) * 0.3,
      radius * 0.8,
      (_plantRng() - 0.5) * 0.3
    );

    sphere.castShadow = true;
    group.add(sphere);
  }

  return group;
}

/**
 * Creates a small rock (decoration)
 */
function createRock() {
  const group = new THREE.Group();

  // Create 2-3 small angular rocks (seeded)
  const rockCount = 2 + Math.floor(_plantRng() * 2);
  for (let i = 0; i < rockCount; i++) {
    const geometry = new THREE.DodecahedronGeometry(0.1 + _plantRng() * 0.15, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.95,
      metalness: 0.0
    });
    const rock = new THREE.Mesh(geometry, material);

    rock.position.set(
      (_plantRng() - 0.5) * 0.4,
      0.05,
      (_plantRng() - 0.5) * 0.4
    );
    rock.rotation.set(
      _plantRng() * Math.PI,
      _plantRng() * Math.PI,
      _plantRng() * Math.PI
    );

    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  return group;
}

/**
 * Spawns a random plant type at the given position
 */
export function spawnPlant(scene, x, z, y = 0, type = 'random') {
  let plant;

  if (type === 'random') {
    const rand = _plantRng(); // Use seeded RNG
    if (rand < 0.5) {
      // 50% flowers (various colors)
      const flowerColors = [0xff69b4, 0xff4444, 0xffeb3b, 0xffffff, 0xff9800, 0x9c27b0];
      const color = flowerColors[Math.floor(_plantRng() * flowerColors.length)];
      plant = createFlower(color, 4 + Math.floor(_plantRng() * 3));
    } else if (rand < 0.8) {
      // 30% bushes
      const bushColors = [0x2d5016, 0x1b3a0f, 0x3d6020];
      const color = bushColors[Math.floor(_plantRng() * bushColors.length)];
      plant = createBush(color);
    } else {
      // 20% rocks
      plant = createRock();
    }
  } else if (type === 'flower') {
    plant = createFlower();
  } else if (type === 'bush') {
    plant = createBush();
  } else if (type === 'rock') {
    plant = createRock();
  }

  if (!plant) return;

  plant.position.set(x, y, z);
  plant.userData._isPlant = true; // Mark for identification/cleanup

  // Random rotation for variety (seeded)
  plant.rotation.y = _plantRng() * Math.PI * 2;

  // Random scale (80%-120%, seeded)
  const scale = 0.8 + _plantRng() * 0.4;
  plant.scale.setScalar(scale);

  scene.add(plant);
  _plantCount++;
}

/**
 * Spawns plants scattered across the grass zone
 * Uses seeded RNG for deterministic placement (plants stay in same spots after reload)
 */
export function initPlants(scene, plantCount = 200) {
  console.log('[plants] Scattering plants across grass zone...');

  const rng = seededRng(42); // Different seed from trees (42 vs 17)
  _plantRng = rng; // Set global RNG for spawnPlant to use

  let plantsSpawned = 0;
  let attempts = 0;
  const maxAttempts = plantCount * 5;

  while (plantsSpawned < plantCount && attempts < maxAttempts) {
    attempts++;

    const pos = randomGrassPosition(50, rng); // Pass seeded RNG
    if (!pos) continue;

    const y = getSurfaceY(pos.x, pos.z);
    spawnPlant(scene, pos.x, pos.z, y, 'random');
    plantsSpawned++;
  }

  console.log(`[plants] Spawned ${plantsSpawned} plants across grass zone (attempted ${attempts} positions)`);
}

export function getPlantCount() {
  return _plantCount;
}
