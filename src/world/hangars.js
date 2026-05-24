import * as THREE from 'three';
import { buildNpcCharacter } from './npc.js';
import { registerInteraction } from '../ui/interactionUI.js';

// ── PBR brick material (shared across all three hangars) ──────────────

let _brickMat = null;

function getBrickMat() {
  if (_brickMat) return _brickMat;
  const loader = new THREE.TextureLoader();
  const pfx    = 'textures/hangars/Bricks066_2K-JPG_';

  const color  = loader.load(pfx + 'Color.jpg');
  const normal = loader.load(pfx + 'NormalGL.jpg');
  const rough  = loader.load(pfx + 'Roughness.jpg');
  const ao     = loader.load(pfx + 'AmbientOcclusion.jpg');

  // repeat.set(16, 5): side walls 94 m long / 14 m tall → ~5.9 m × 2.8 m per tile
  [color, normal, rough, ao].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(16, 5);
    t.anisotropy = 8;
  });
  color.colorSpace = THREE.SRGBColorSpace;

  _brickMat = new THREE.MeshStandardMaterial({
    map:            color,
    normalMap:      normal,
    roughnessMap:   rough,
    aoMap:          ao,
    aoMapIntensity: 0.9,
  });
  return _brickMat;
}

// ── Dimensions ────────────────────────────────────────────────────────
const W  = 54;   // exterior width  (x: -27..+27)
const D  = 94;   // exterior depth  (z: -47..+47)
const H  = 14;   // wall height
const TH = 1.2;  // roof thickness

// Store slot spans (interior)
const SIDE_SPAN  = 84;  // left/right wall usable length (z: -42..+42)
const FRONT_SPAN = 50;  // far wall usable width (x: -25..+25)
const SIDE_COUNT  = 20;
const FRONT_COUNT = 10;
const SLOT_W_SIDE  = SIDE_SPAN  / SIDE_COUNT;   // 4.2 m
const SLOT_W_FRONT = FRONT_SPAN / FRONT_COUNT;  // 5.0 m

// Accent colours per hangar
const ACCENT = [0x1565C0, 0xE64A19, 0x6A1B9A]; // blue, orange, purple

export const allSlots = []; // populated during init, used by stores.js

// ── Public ────────────────────────────────────────────────────────────

export function initHangars(scene) {
  const configs = [
    { x:   0, z: -130, rotY: 0,           name: 'North Hangar' },
    { x: 130, z:    0, rotY: -Math.PI / 2, name: 'East Hangar'  },
    { x:   0, z:  130, rotY: Math.PI,      name: 'South Hangar' },
  ];

  configs.forEach((cfg, i) => buildHangar(scene, cfg, i));

  // Register entrance NPCs as "Shop" interactions
  // World positions: NPC is at local (0, 0, D/2-4) inside each rotated hangar group
  const halfD = D / 2 - 4;
  const sin0 = Math.sin(0),        cos0 = Math.cos(0);
  const sinNE = Math.sin(-Math.PI/2), cosNE = Math.cos(-Math.PI/2);
  const sinS = Math.sin(Math.PI),   cosS = Math.cos(Math.PI);

  // North: x=0, z=-130, rotY=0
  registerInteraction([0 + halfD*sin0, 0, -130 + halfD*cos0], 'Shop', 7, () => {
    console.log('[hangar] North Hangar — browse store slots');
  });
  // East: x=130, z=0, rotY=-PI/2
  registerInteraction([130 + halfD*sinNE, 0, 0 + halfD*cosNE], 'Shop', 7, () => {
    console.log('[hangar] East Hangar — browse store slots');
  });
  // South: x=0, z=130, rotY=PI
  registerInteraction([0 + halfD*sinS, 0, 130 + halfD*cosS], 'Shop', 7, () => {
    console.log('[hangar] South Hangar — browse store slots');
  });
}

// ── Build one hangar ──────────────────────────────────────────────────

function buildHangar(scene, { x, z, rotY }, hangarIndex) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const wallMat   = getBrickMat();
  const roofMat   = stdMat(0xD4CEC6, 0.9);
  const accentMat = stdMat(ACCENT[hangarIndex], 0.7, 0.1);
  const floorMat  = stdMat(0xD8D2C8, 0.92);
  const colMat    = stdMat(0xF0EBE3, 0.78, 0.05);

  // ── Shell ─────────────────────────────────────────────────────────
  buildShell(group, wallMat, roofMat, accentMat, floorMat, colMat);

  // ── Store slots ───────────────────────────────────────────────────
  const slotSignMat = stdMat(0xBDBDBD, 0.82); // default: available (gray)
  const counterMat  = stdMat(0x90A4AE, 0.88);

  buildSideSlots(group, 'left',  hangarIndex, slotSignMat, counterMat);
  buildSideSlots(group, 'right', hangarIndex, slotSignMat, counterMat);
  buildFarSlots(group, hangarIndex, slotSignMat, counterMat);

  // ── Entrance NPC character ────────────────────────────────────────
  const npc = buildNpcCharacter(ACCENT[hangarIndex], 'hangarEntrance');
  npc.position.set(0, 0, D / 2 - 4);  // just inside the entrance columns
  npc.userData.hangarIndex = hangarIndex;
  group.add(npc);

  scene.add(group);

  // ── Precompute world slot positions ───────────────────────────────
  finaliseSlotPositions(group, hangarIndex);
}

// ── Hangar exterior shell ─────────────────────────────────────────────

function buildShell(group, wallMat, roofMat, accentMat, floorMat, colMat) {
  // Floor
  add(group, new THREE.BoxGeometry(W - 1, 0.3, D - 1), floorMat, 0, 0.15, 0);

  // Left wall
  addWall(group, new THREE.BoxGeometry(0.6, H, D), wallMat, -W / 2, H / 2, 0);
  // Right wall
  addWall(group, new THREE.BoxGeometry(0.6, H, D), wallMat,  W / 2, H / 2, 0);
  // Far wall (with door opening — 10 m gap)
  const fwSide = (W - 12) / 2;
  addWall(group, new THREE.BoxGeometry(fwSide, H, 0.6), wallMat, -(W / 2 - fwSide / 2), H / 2, -D / 2);
  addWall(group, new THREE.BoxGeometry(fwSide, H, 0.6), wallMat,  W / 2 - fwSide / 2,   H / 2, -D / 2);
  addWall(group, new THREE.BoxGeometry(12, H * 0.35, 0.6), wallMat, 0, H - H * 0.35 / 2, -D / 2);

  // Entrance: four columns instead of wall
  [-(W / 2 - 1.5), -10, 10, W / 2 - 1.5].forEach(cx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, H, 10), colMat);
    col.position.set(cx, H / 2, D / 2);
    col.castShadow = true;
    group.add(col);
  });

  // Roof
  add(group, new THREE.BoxGeometry(W + 1, TH, D + 1), roofMat, 0, H + TH / 2, 0, true);

  // Accent band along the top of the side walls
  add(group, new THREE.BoxGeometry(0.8, 1.8, D), accentMat, -W / 2, H - 0.4, 0);
  add(group, new THREE.BoxGeometry(0.8, 1.8, D), accentMat,  W / 2, H - 0.4, 0);
  add(group, new THREE.BoxGeometry(W + 1, 1.8, 0.8), accentMat, 0, H - 0.4, -D / 2);
  add(group, new THREE.BoxGeometry(W + 1, 1.8, 0.8), accentMat, 0, H - 0.4,  D / 2);
}

// ── Store slot rows ───────────────────────────────────────────────────

function buildSideSlots(group, side, hangarIndex, signMat, counterMat) {
  const wallX = side === 'left' ? -(W / 2 - 0.3) : W / 2 - 0.3;
  const inward = side === 'left' ? 1 : -1;

  for (let i = 0; i < SIDE_COUNT; i++) {
    const slotZ = -SIDE_SPAN / 2 + (i + 0.5) * SLOT_W_SIDE;

    // Divider pillar on one side of each slot
    if (i === 0 || true) {
      const pillarZ = -SIDE_SPAN / 2 + i * SLOT_W_SIDE;
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, H * 0.85, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xC8C0B8, roughness: 0.88 })
      );
      pillar.position.set(wallX + inward * 1.5, H * 0.85 / 2, pillarZ);
      group.add(pillar);
    }

    // Sign plate (thin panel on the wall, facing inward)
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.2, SLOT_W_SIDE - 0.35),
      signMat.clone()
    );
    sign.position.set(wallX + inward * 0.1, 5.5, slotZ);
    sign.userData.isSlot = true;
    group.add(sign);

    // Counter
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.9, SLOT_W_SIDE - 0.45),
      counterMat
    );
    counter.position.set(wallX + inward * 1.4, 0.45, slotZ);
    group.add(counter);

    // Register this slot (world pos filled later)
    allSlots.push({
      id: allSlots.length,
      hangarIndex,
      wall: side,
      slotIndex: i,
      localPos: new THREE.Vector3(wallX + inward * 3.5, 0, slotZ),
      signMesh: sign,
      status: 'available',
      worldPos: new THREE.Vector3(), // filled by finaliseSlotPositions
    });
  }

  // Final closing pillar
  const lastPillarZ = SIDE_SPAN / 2;
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, H * 0.85, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xC8C0B8, roughness: 0.88 })
  );
  pillar.position.set(wallX + inward * 1.5, H * 0.85 / 2, lastPillarZ);
  group.add(pillar);
}

function buildFarSlots(group, hangarIndex, signMat, counterMat) {
  const wallZ  = -(D / 2 - 0.3);

  for (let i = 0; i < FRONT_COUNT; i++) {
    const slotX = -FRONT_SPAN / 2 + (i + 0.5) * SLOT_W_FRONT;

    const pillarX = -FRONT_SPAN / 2 + i * SLOT_W_FRONT;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, H * 0.85, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xC8C0B8, roughness: 0.88 })
    );
    pillar.position.set(pillarX, H * 0.85 / 2, wallZ + 1.5);
    group.add(pillar);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(SLOT_W_FRONT - 0.35, 1.2, 0.15),
      signMat.clone()
    );
    sign.position.set(slotX, 5.5, wallZ + 0.1);
    sign.userData.isSlot = true;
    group.add(sign);

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(SLOT_W_FRONT - 0.45, 0.9, 1.6),
      counterMat
    );
    counter.position.set(slotX, 0.45, wallZ + 1.4);
    group.add(counter);

    allSlots.push({
      id: allSlots.length,
      hangarIndex,
      wall: 'far',
      slotIndex: i,
      localPos: new THREE.Vector3(slotX, 0, wallZ + 3.5),
      signMesh: sign,
      status: 'available',
      worldPos: new THREE.Vector3(),
    });
  }

  // Final closing pillar
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, H * 0.85, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xC8C0B8, roughness: 0.88 })
  );
  pillar.position.set(FRONT_SPAN / 2, H * 0.85 / 2, wallZ + 1.5);
  group.add(pillar);
}

function finaliseSlotPositions(group, hangarIndex) {
  group.updateMatrixWorld(true);
  allSlots
    .filter(s => s.hangarIndex === hangarIndex)
    .forEach(s => {
      s.worldPos.copy(s.localPos).applyMatrix4(group.matrixWorld);
      s.worldPos.y = 0;
    });
}

// ── Helpers ───────────────────────────────────────────────────────────

function stdMat(color, rough = 0.85, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function add(group, geo, mat, x, y, z, castShadow = false) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  if (castShadow) m.castShadow = true;
  group.add(m);
  return m;
}

// Like add() but copies uv → uv1 so aoMap works on BoxGeometry walls
function addWall(group, geo, mat, x, y, z) {
  geo.setAttribute('uv1', geo.attributes.uv);
  return add(group, geo, mat, x, y, z);
}
