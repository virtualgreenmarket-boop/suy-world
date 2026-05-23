import * as THREE from 'three';
import { buildNpcCharacter } from './npc.js';

function mat(color, rough = 0.85, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

export function initMarina(scene) {
  // Marina is west of the plaza at (-150, 0, 0), facing east (+X)
  const group = new THREE.Group();
  group.position.set(-150, 0, 0);
  group.rotation.y = Math.PI / 2; // entrance faces east (toward plaza)

  addLandPlatform(group);
  addDock(group);
  addHut(group);
  addNpcOrb(group);

  scene.add(group);
}

function addLandPlatform(group) {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(55, 0.6, 38),
    mat(0xB0B8D0)
  );
  floor.position.y = 0.3;
  floor.receiveShadow = true;
  group.add(floor);

  const border = new THREE.Mesh(
    new THREE.BoxGeometry(57, 0.3, 40),
    mat(0xA0A8C0)
  );
  border.position.y = 0.15;
  group.add(border);
}

function addDock(group) {
  const deckMat   = mat(0xA17850, 0.92);
  const pillarMat = mat(0x7D5D3C, 0.95);
  const railMat   = mat(0x8B6845, 0.9);

  // Dock extends in the -Z direction (behind land platform, over water)
  const dockLength = 52;
  const dockWidth  = 12;

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(dockWidth, 0.4, dockLength),
    deckMat
  );
  deck.position.set(0, 0.5, -(19 + dockLength / 2));
  deck.receiveShadow = true;
  group.add(deck);

  // Support pillars
  for (let i = 0; i < 5; i++) {
    const pz = -22 - i * 10;
    [-5, 5].forEach(px => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 4.5, 8),
        pillarMat
      );
      pillar.position.set(px, -1.8, pz);
      group.add(pillar);
    });
  }

  // Railings (long bars along sides)
  [-6.2, 6.2].forEach(rx => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, dockLength),
      railMat
    );
    rail.position.set(rx, 1.1, -(19 + dockLength / 2));
    group.add(rail);
  });

  // Fishing platforms at the end of dock (3 spots)
  [-4, 0, 4].forEach(px => {
    const spot = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.25, 3.5),
      mat(0x8B7355)
    );
    spot.position.set(px, 0.65, -19 - dockLength + 1.5);
    spot.userData.isFishingSpot = true;
    group.add(spot);
  });
}

function addHut(group) {
  const wallMat = mat(0xD4C8A8, 0.88);
  const roofMat = mat(0x7B5E3A, 0.9);

  // Hut body
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), wallMat);
  walls.position.set(-18, 2.8, 0);
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Roof (pyramid)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 4, 4), roofMat);
  roof.position.set(-18, 7.3, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
}

function addNpcOrb(group) {
  const npc = buildNpcCharacter(0x26C6DA, 'fishing');
  npc.position.set(0, 0, 12);  // near marina entrance
  group.add(npc);
}
