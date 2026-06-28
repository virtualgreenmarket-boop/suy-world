/**
 * plants.js
 * Simple procedural flowers and plants to decorate the grass zone.
 * Uses primitive geometry (no external assets) for lightweight decoration.
 */

import * as THREE from 'three';
import { randomGrassPosition } from './mapZones.js';
import { getSurfaceY } from '../systems/terrain.js';

let _plantCount = 0;

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

  // Create 3-5 small spheres clustered together
  const sphereCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < sphereCount; i++) {
    const radius = 0.15 + Math.random() * 0.1;
    const sphereGeometry = new THREE.SphereGeometry(radius, 8, 8);
    const sphere = new THREE.Mesh(sphereGeometry, bushMaterial);

    // Random offset from center
    sphere.position.set(
      (Math.random() - 0.5) * 0.3,
      radius * 0.8,
      (Math.random() - 0.5) * 0.3
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

  // Create 2-3 small angular rocks
  const rockCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < rockCount; i++) {
    const geometry = new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.15, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.95,
      metalness: 0.0
    });
    const rock = new THREE.Mesh(geometry, material);

    rock.position.set(
      (Math.random() - 0.5) * 0.4,
      0.05,
      (Math.random() - 0.5) * 0.4
    );
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
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
    const rand = Math.random();
    if (rand < 0.5) {
      // 50% flowers (various colors)
      const flowerColors = [0xff69b4, 0xff4444, 0xffeb3b, 0xffffff, 0xff9800, 0x9c27b0];
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      plant = createFlower(color, 4 + Math.floor(Math.random() * 3));
    } else if (rand < 0.8) {
      // 30% bushes
      const bushColors = [0x2d5016, 0x1b3a0f, 0x3d6020];
      const color = bushColors[Math.floor(Math.random() * bushColors.length)];
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

  // Random rotation for variety
  plant.rotation.y = Math.random() * Math.PI * 2;

  // Random scale (80%-120%)
  const scale = 0.8 + Math.random() * 0.4;
  plant.scale.setScalar(scale);

  scene.add(plant);
  _plantCount++;
}

/**
 * Spawns plants scattered across the grass zone
 */
export function initPlants(scene, plantCount = 200) {
  console.log('[plants] Scattering plants across grass zone...');

  let plantsSpawned = 0;
  let attempts = 0;
  const maxAttempts = plantCount * 5;

  while (plantsSpawned < plantCount && attempts < maxAttempts) {
    attempts++;

    const pos = randomGrassPosition(50);
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
