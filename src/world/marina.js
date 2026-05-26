import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildNpcCharacter } from './npc.js';

const HOUSE_URL = '/models/nature/marina/Medieval%20Village%20Houses%20GLB/Medieval%20Village%20Houses.glb';

// Heights (local Y, sea level = 0)
const DECK_Y = 3.2;   // elevated deck surface
const PIER_Y = 0.55;  // fishing pier surface (just above water)

// ── Wood PBR helper ───────────────────────────────────────────────────

let _texCache = null;
function _loadWoodTextures() {
  if (_texCache) return _texCache;
  const tl  = new THREE.TextureLoader();
  const pfx = 'textures/wood/WoodFloor040_2K-JPG_';
  const col  = tl.load(pfx + 'Color.jpg');
  const norm = tl.load(pfx + 'NormalGL.jpg');
  const rgh  = tl.load(pfx + 'Roughness.jpg');
  col.colorSpace = THREE.SRGBColorSpace;
  [col, norm, rgh].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; });
  _texCache = { col, norm, rgh };
  return _texCache;
}

function woodMat(repeatX, repeatZ) {
  const { col, norm, rgh } = _loadWoodTextures();
  const c = col.clone();  c.repeat.set(repeatX, repeatZ); c.needsUpdate = true;
  const n = norm.clone(); n.repeat.set(repeatX, repeatZ); n.needsUpdate = true;
  const r = rgh.clone();  r.repeat.set(repeatX, repeatZ); r.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: c, normalMap: n, roughnessMap: r,
    roughness: 1.0, metalness: 0.0 });
}

function solidMat(color, rough = 0.95) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 });
}

// ── Entry point ───────────────────────────────────────────────────────

export function initMarina(scene) {
  const group = new THREE.Group();
  group.position.set(-150, 0, 0);
  group.rotation.y = Math.PI / 2;
  scene.add(group);

  addElevatedDeck(group);
  addStairs(group);
  addFishingPier(group);
  addNpcOrb(group);

  _loadHouse(group);
}

// ── House (added to group so it inherits deck position) ───────────────

function _loadHouse(group) {
  new GLTFLoader().load(HOUSE_URL, gltf => {
    const model = gltf.scene;
    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

    const box  = new THREE.Box3().setFromObject(model);
    const h    = Math.max(box.max.y - box.min.y, 0.001);
    const sc   = 24 / h;
    model.scale.setScalar(sc);

    const box2 = new THREE.Box3().setFromObject(model);
    // Place house on top of deck, centred slightly toward land
    model.position.set(0, DECK_Y - box2.min.y, -6);
    model.rotation.y = 0;
    group.add(model);

    console.log('[marina] house on deck — scale:', sc.toFixed(3));
  }, undefined, err => {
    console.warn('[marina] house load failed:', err?.message ?? err);
    _fallbackHut(group);
  });
}

function _fallbackHut(group) {
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), solidMat(0xD4C8A8, 0.88));
  walls.position.set(0, DECK_Y + 3, -6);
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 4, 4), solidMat(0x7B5E3A, 0.9));
  roof.position.set(0, DECK_Y + 8, -6);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
}

// ── Elevated wooden deck (house platform) ─────────────────────────────
//
//  Local coords:   +Z = toward island (east)   −Z = into sea (west)
//  Deck spans:     X ∈ [−13, +13]   Z ∈ [+1, −21]
//  Surface at Y = DECK_Y

const DW = 26;   // deck width  (X)
const DL = 22;   // deck length (Z, into sea)
const DX = 0;
const DZ = -10;  // centre Z of deck

function addElevatedDeck(group) {
  const PLANK_TILE = 2.2;  // metres per texture repeat

  // ── Deck surface planks ──────────────────────────────────────────────
  const deckMesh = new THREE.Mesh(
    new THREE.BoxGeometry(DW, 0.38, DL),
    woodMat(DW / PLANK_TILE, DL / PLANK_TILE)
  );
  deckMesh.position.set(DX, DECK_Y + 0.19, DZ);
  deckMesh.castShadow = deckMesh.receiveShadow = true;
  group.add(deckMesh);

  // ── Structural rim beam ──────────────────────────────────────────────
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(DW + 0.6, 0.45, DL + 0.6),
    solidMat(0x5C3D1A, 0.97)
  );
  rim.position.set(DX, DECK_Y - 0.22, DZ);
  rim.castShadow = rim.receiveShadow = true;
  group.add(rim);

  // ── Support pillars ──────────────────────────────────────────────────
  const pillarH = DECK_Y + 1.2;
  const pMat    = solidMat(0x6B4820);
  const pGeo    = new THREE.CylinderGeometry(0.45, 0.55, pillarH, 10);
  [DX - 12, DX, DX + 12].forEach(px => {
    [1, -10, -20].forEach(pz => {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(px, pillarH / 2 - 1.2, pz);
      p.castShadow = true;
      group.add(p);
    });
  });

  // ── Deck railings (sea-facing front + both sides) ────────────────────
  const frontZ = DZ - DL / 2;  // z = −21 (sea edge)
  const backZ  = DZ + DL / 2;  // z = +1  (land edge)
  _railSegment(group, DX, frontZ, DW, 'x');                        // front
  _railSegment(group, DX - DW / 2, DZ - DL * 0.1, DL * 0.8, 'z'); // left side
  _railSegment(group, DX + DW / 2, DZ - DL * 0.1, DL * 0.8, 'z'); // right side
}

// Railing segment: pos is the centre along the railing direction
// axis 'x' → rail runs along X, axis 'z' → rail runs along Z
function _railSegment(group, cx, cz, length, axis) {
  const postMat  = solidMat(0x7D5D3C, 0.9);
  const topMat   = solidMat(0xA07040, 0.85);
  const rY       = DECK_Y + 0.38;  // rail base = deck surface
  const postH    = 1.05;
  const spacing  = 1.8;
  const count    = Math.floor(length / spacing);

  for (let i = 0; i <= count; i++) {
    const t   = (i / count) - 0.5;
    const px  = axis === 'x' ? cx + t * length : cx;
    const pz  = axis === 'z' ? cz + t * length : cz;
    const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, postH, 6), postMat);
    pst.position.set(px, rY + postH / 2, pz);
    group.add(pst);
  }

  const railGeo = axis === 'x'
    ? new THREE.BoxGeometry(length, 0.10, 0.10)
    : new THREE.BoxGeometry(0.10, 0.10, length);

  const topRail = new THREE.Mesh(railGeo, topMat);
  topRail.position.set(cx, rY + postH, cz);
  group.add(topRail);

  const midRail = new THREE.Mesh(railGeo.clone(), topMat.clone());
  midRail.position.set(cx, rY + postH * 0.55, cz);
  group.add(midRail);
}

// ── Stairs from deck down to pier ─────────────────────────────────────

const STEP_COUNT = 8;
const STEP_W     = 5.0;
const STEP_H     = (DECK_Y - PIER_Y) / STEP_COUNT;  // ≈ 0.33 m each
const STEP_D     = 0.85;
const STAIRS_Z   = DZ - DL / 2 - 0.2;  // just past front edge of deck

function addStairs(group) {
  const mat = woodMat(STEP_W / 2.0, 1.0);
  for (let i = 0; i < STEP_COUNT; i++) {
    const stepTopY = DECK_Y - i * STEP_H;
    const stepZ    = STAIRS_Z - i * STEP_D - STEP_D / 2;
    const step = new THREE.Mesh(new THREE.BoxGeometry(STEP_W, STEP_H, STEP_D), mat);
    step.position.set(0, stepTopY - STEP_H / 2, stepZ);
    step.castShadow = step.receiveShadow = true;
    group.add(step);
  }

  // Side stringers
  const strMat = solidMat(0x5C3D1A);
  const strLen = STEP_COUNT * STEP_D + 0.2;
  const strH   = DECK_Y - PIER_Y + 0.4;
  [-STEP_W / 2 - 0.1, STEP_W / 2 + 0.1].forEach(sx => {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.18, strH, strLen), strMat);
    str.position.set(sx, DECK_Y - strH / 2, STAIRS_Z - strLen / 2 + 0.3);
    str.castShadow = true;
    group.add(str);
  });
}

// ── Fishing pier ──────────────────────────────────────────────────────

const PIER_W   = 9;
const PIER_LEN = 52;
const PIER_START_Z = STAIRS_Z - STEP_COUNT * STEP_D - 0.5;
const PIER_CZ  = PIER_START_Z - PIER_LEN / 2;

function addFishingPier(group) {
  const PLANK_TILE = 2.2;

  // ── Pier deck surface ────────────────────────────────────────────────
  const pierMesh = new THREE.Mesh(
    new THREE.BoxGeometry(PIER_W, 0.35, PIER_LEN),
    woodMat(PIER_W / PLANK_TILE, PIER_LEN / PLANK_TILE)
  );
  pierMesh.position.set(0, PIER_Y + 0.175, PIER_CZ);
  pierMesh.castShadow = pierMesh.receiveShadow = true;
  group.add(pierMesh);

  // ── Rim beam ─────────────────────────────────────────────────────────
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(PIER_W + 0.4, 0.35, PIER_LEN + 0.4),
    solidMat(0x5C3D1A, 0.97)
  );
  rim.position.set(0, PIER_Y - 0.175, PIER_CZ);
  rim.castShadow = rim.receiveShadow = true;
  group.add(rim);

  // ── Pillars every 6 m ────────────────────────────────────────────────
  const pillarH = PIER_Y + 2.8;
  const pMat    = solidMat(0x6B4820);
  const pGeo    = new THREE.CylinderGeometry(0.30, 0.38, pillarH, 8);
  for (let pz = PIER_START_Z - 2; pz >= PIER_START_Z - PIER_LEN; pz -= 6) {
    [-PIER_W / 2 + 0.5, PIER_W / 2 - 0.5].forEach(px => {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(px, pillarH / 2 - 2.3, pz);
      p.castShadow = true;
      group.add(p);
    });
  }

  // ── Railings along both sides ────────────────────────────────────────
  [-PIER_W / 2, PIER_W / 2].forEach(rx => {
    _railSegment(group, rx, PIER_CZ, PIER_LEN, 'z');
  });
  // End cap railing
  _railSegment(group, 0, PIER_START_Z - PIER_LEN, PIER_W, 'x');

  // ── Fishing spots (marked platforms at pier end) ─────────────────────
  const spotMat = solidMat(0x3D2A0E, 0.98);
  [-2.8, 0, 2.8].forEach(px => {
    const spot = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 2.4), spotMat);
    spot.position.set(px, PIER_Y + 0.37, PIER_START_Z - PIER_LEN + 1.5);
    spot.userData.isFishingSpot = true;
    spot.receiveShadow = true;
    group.add(spot);
  });

  // ── Side fishing alcoves mid-pier ────────────────────────────────────
  [-PIER_W / 2 - 1.5, PIER_W / 2 + 1.5].forEach(ax => {
    [PIER_CZ - PIER_LEN * 0.25, PIER_CZ + PIER_LEN * 0.1].forEach(az => {
      const alc = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 2.5),
        woodMat(1.5, 1.0));
      alc.position.set(ax, PIER_Y + 0.175, az);
      alc.castShadow = alc.receiveShadow = true;
      group.add(alc);
      const alcSpot = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 2.0), spotMat);
      alcSpot.position.set(ax, PIER_Y + 0.39, az);
      alcSpot.userData.isFishingSpot = true;
      group.add(alcSpot);
    });
  });
}

// ── NPC ───────────────────────────────────────────────────────────────

function addNpcOrb(group) {
  const npc = buildNpcCharacter(0x26C6DA, 'fishing');
  npc.position.set(2, DECK_Y + 0.38, -4);
  group.add(npc);
}
