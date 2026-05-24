import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildNpcCharacter } from './npc.js';
import { getSurfaceY } from '../systems/terrain.js';

const HOUSE_URL = '/models/nature/marina/Medieval%20Village%20Houses%20GLB/Medieval%20Village%20Houses.glb';

function mat(color, rough = 0.85, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

export function initMarina(scene) {
  const group = new THREE.Group();
  group.position.set(-150, 0, 0);
  group.rotation.y = Math.PI / 2;

  addLandPlatform(group);
  addDock(group);
  addNpcOrb(group);
  scene.add(group);

  _loadHouse(scene);
}

// ── GLB house ─────────────────────────────────────────────────────────

function _loadHouse(scene) {
  const loader = new GLTFLoader();
  loader.load(HOUSE_URL, gltf => {
    const model = gltf.scene;
    model.traverse(n => {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });

    const box = new THREE.Box3().setFromObject(model);
    const h   = Math.max(box.max.y - box.min.y, 0.001);
    // Target ~12 m tall so it reads as a substantial harbour building
    const sc  = 12 / h;
    model.scale.setScalar(sc);

    // Recalculate bounding box after scale to floor it
    const box2 = new THREE.Box3().setFromObject(model);
    const floorOffset = -box2.min.y;

    // Place at the marina land area — west of island, slightly north of dock
    const mx = -150, mz = -8;
    const sy = getSurfaceY(mx, mz);
    model.position.set(mx, sy + floorOffset, mz);
    model.rotation.y = Math.PI / 2;   // entrance faces east toward plaza
    scene.add(model);

    console.log('[marina] house loaded — height:', h.toFixed(2), '→ scale:', sc.toFixed(3));
  }, undefined, err => {
    console.warn('[marina] house GLB failed, using procedural hut:', err?.message ?? err);
    _addFallbackHut(scene);
  });
}

function _addFallbackHut(scene) {
  const g = new THREE.Group();
  g.position.set(-150, 0, 0);
  g.rotation.y = Math.PI / 2;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), mat(0xD4C8A8, 0.88));
  walls.position.set(-18, 2.8, 0);
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 4, 4), mat(0x7B5E3A, 0.9));
  roof.position.set(-18, 7.3, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  scene.add(g);
}

// ── Land platform ─────────────────────────────────────────────────────

function addLandPlatform(group) {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(55, 0.6, 38), mat(0xB0B8D0)
  );
  floor.position.y = 0.3;
  floor.receiveShadow = true;
  group.add(floor);

  const border = new THREE.Mesh(
    new THREE.BoxGeometry(57, 0.3, 40), mat(0xA0A8C0)
  );
  border.position.y = 0.15;
  group.add(border);
}

// ── Dock ──────────────────────────────────────────────────────────────

function addDock(group) {
  const deckMat   = mat(0xA17850, 0.92);
  const pillarMat = mat(0x7D5D3C, 0.95);
  const railMat   = mat(0x8B6845, 0.9);
  const dockLength = 52, dockWidth = 12;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(dockWidth, 0.4, dockLength), deckMat);
  deck.position.set(0, 0.5, -(19 + dockLength / 2));
  deck.receiveShadow = true;
  group.add(deck);

  for (let i = 0; i < 5; i++) {
    const pz = -22 - i * 10;
    [-5, 5].forEach(px => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 4.5, 8), pillarMat);
      pillar.position.set(px, -1.8, pz);
      group.add(pillar);
    });
  }

  [-6.2, 6.2].forEach(rx => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, dockLength), railMat);
    rail.position.set(rx, 1.1, -(19 + dockLength / 2));
    group.add(rail);
  });

  [-4, 0, 4].forEach(px => {
    const spot = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.25, 3.5), mat(0x8B7355));
    spot.position.set(px, 0.65, -19 - dockLength + 1.5);
    spot.userData.isFishingSpot = true;
    group.add(spot);
  });
}

function addNpcOrb(group) {
  const npc = buildNpcCharacter(0x26C6DA, 'fishing');
  npc.position.set(0, 0, 12);
  group.add(npc);
}
