import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/sharedLoaders.js';
import { registerBox } from '../systems/collision.js';
import { registerGround } from '../systems/terrain.js';
import { registerInteraction, showNpcDialog } from '../ui/interactionUI.js';
import { attachLabel } from '../ui/labels.js';
import { registerMapEntity } from '../ui/minimapRegistry.js';

const HOUSE_URL = '/models/nature/marina/Medieval%20Village%20Houses%20GLB/Medieval%20Village%20Houses.glb';

// Heights (local Y, sea level = 0)
const DECK_Y = 3.2;   // elevated deck surface
const PIER_Y = 0.55;  // fishing pier surface (just above water)

// NPC tracking
let _fishermanNpc = null;
let _skylarNpc = null;

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
  group.position.set(-325.2, 0, 0);
  group.rotation.y = Math.PI / 2;
  scene.add(group);

  addElevatedDeck(group);
  addStairs(group);
  addLandStairs(group);
  addFishingPier(group);
  addPerimeterFence(group);
  _registerDeckCollision(group);

  _loadHouse(group);
  _loadFishermanNpc(group);
  _loadSkylarNpc(group);
}

// ── House (added to group so it inherits deck position) ───────────────

function _loadHouse(group) {
  createGLTFLoader().load(HOUSE_URL, gltf => {
    const model = gltf.scene;
    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

    const box  = new THREE.Box3().setFromObject(model);
    const h    = Math.max(box.max.y - box.min.y, 0.001);
    const sc   = 24 / h;
    model.scale.setScalar(sc);

    const box2 = new THREE.Box3().setFromObject(model);
    // Place house on the grass (local Z=45 → world X=-185, inside grass zone)
    model.position.set(0, -box2.min.y, 45);
    model.rotation.y = 0;
    group.add(model);

    // Register world-space collision box (group rot PI/2: worldX=-230+localZ, worldZ=-localX)
    group.updateWorldMatrix(true, true);
    const wb = new THREE.Box3().setFromObject(model);
    registerBox(wb.min.x - 0.4, wb.max.x + 0.4, wb.min.z - 0.4, wb.max.z + 0.4);

    console.log('[marina] house on grass — scale:', sc.toFixed(3));
  }, undefined, err => {
    console.warn('[marina] house load failed:', err?.message ?? err);
    _fallbackHut(group);
  });
}

function _fallbackHut(group) {
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), solidMat(0xD4C8A8, 0.88));
  walls.position.set(0, 3, 45);  // on grass: y=3 (centre of 6m box), localZ=45→worldX=-185
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 4, 4), solidMat(0x7B5E3A, 0.9));
  roof.position.set(0, 8, 45);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
  // world: localZ=45 → worldX=-185, localX∈[-5,+5] → worldZ∈[-5,+5]
  registerBox(-191, -179, -6, 6);
}

// ── Elevated wooden deck (house platform) ─────────────────────────────
//
//  Local coords:   +Z = toward island (east)   −Z = into sea (west)
//  Deck spans:     X ∈ [−65, +65]   Z ∈ [−21, +23]
//  Surface at Y = DECK_Y

const DW = 130;  // deck width  (X) — runs along shoreline
const DL = 44;   // deck length (Z) — doubled toward land (+22 m grass side)
const DX = 0;
const DZ = 1;    // centre Z of deck (sea edge stays at -21, land edge now +23)

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
  registerGround(deckMesh);

  // ── Structural rim beam ──────────────────────────────────────────────
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(DW + 0.6, 0.45, DL + 0.6),
    solidMat(0x5C3D1A, 0.97)
  );
  rim.position.set(DX, DECK_Y - 0.22, DZ);
  rim.castShadow = rim.receiveShadow = true;
  group.add(rim);

  // ── Support pillars — extend to y=-9 (seabed) ───────────────────────
  const pillarH = DECK_Y + 9;                          // 3.2 + 9 = 12.2 m
  const pMat    = solidMat(0x6B4820);
  const pGeo    = new THREE.CylinderGeometry(0.45, 0.55, pillarH, 10);
  const pillarCY = DECK_Y - pillarH / 2;               // top flush with deck, bottom at y=-9
  for (let px = -DW / 2 + 8; px <= DW / 2 - 8; px += 15) {
    [20, 9, -2, -14].forEach(pz => {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(px, pillarCY, pz);
      p.castShadow = true;
      group.add(p);
    });
  }

  // ── Deck railings (sea-facing front with stair gap + both sides) ─────
  const frontZ    = DZ - DL / 2;       // z = −21 (sea edge)
  const deckSurf  = DECK_Y + 0.38;     // top of deck planks
  const gapHalf   = STEP_W / 2;        // 12.5 m — matches stair width
  const sideLen   = DW / 2 - gapHalf;  // 52.5 m each side of gap
  const sideCX    = (DW / 2 + gapHalf) / 2; // 38.75 m from centre
  _railSegment(group, -sideCX, frontZ, sideLen, 'x', deckSurf);   // front left
  _railSegment(group,  sideCX, frontZ, sideLen, 'x', deckSurf);   // front right
  _railSegment(group, DX - DW / 2, DZ, DL, 'z', deckSurf);       // left side full length
  _railSegment(group, DX + DW / 2, DZ, DL, 'z', deckSurf);       // right side full length
}

// Railing segment: pos is the centre along the railing direction
// axis 'x' → rail runs along X, axis 'z' → rail runs along Z
// baseY = world-local Y of the surface the railing sits on
// Group transform: rot.y=PI/2 → worldX = -230+localZ, worldZ = -localX
function _railSegment(group, cx, cz, length, axis, baseY = DECK_Y + 0.38) {
  const postMat  = solidMat(0x7D5D3C, 0.9);
  const topMat   = solidMat(0xA07040, 0.85);
  const rY       = baseY;
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

  // Collision box in world space (group rot PI/2: worldX=-325.2+localZ, worldZ=-localX)
  const PAD = 0.25;
  const GROUP_X = -325.2; // Marina group X position
  if (axis === 'x') {
    // runs along local X → worldZ spans [-cx-length/2, -cx+length/2]
    registerBox(GROUP_X + cz - PAD, GROUP_X + cz + PAD, -cx - length / 2, -cx + length / 2);
  } else {
    // runs along local Z → worldX spans [GROUP_X+cz-length/2, GROUP_X+cz+length/2]
    registerBox(GROUP_X + cz - length / 2, GROUP_X + cz + length / 2, -cx - PAD, -cx + PAD);
  }
}

// ── Stairs from deck down to pier ─────────────────────────────────────

const STEP_COUNT = 8;
const STEP_W     = 25.0;
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
    registerGround(step);
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

// ── Land stairs: deck (y=3.2) → path (y=0.2) ─────────────────────────
// Local group: worldX = -230+localZ  worldZ = -localX
// Deck land edge localZ=+23 (worldX=-207).  Path base localZ=+28 (worldX=-202).

const LAND_STEP_COUNT = 10;
const LAND_STEP_H     = (DECK_Y - 0.2) / LAND_STEP_COUNT;  // 0.30 m
const LAND_STEP_D     = 0.5;
const LAND_STEP_W     = 9.5;   // matches path width
const LAND_STAIRS_Z   = DZ + DL / 2;  // = 1 + 22 = 23 (deck land edge)

function addLandStairs(group) {
  const mat = woodMat(LAND_STEP_W / 2.0, 1.0);
  for (let i = 0; i < LAND_STEP_COUNT; i++) {
    const stepTopY = DECK_Y - i * LAND_STEP_H;
    const stepZ    = LAND_STAIRS_Z + i * LAND_STEP_D + LAND_STEP_D / 2;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(LAND_STEP_W, LAND_STEP_H, LAND_STEP_D), mat);
    step.position.set(0, stepTopY - LAND_STEP_H / 2, stepZ);
    step.castShadow = step.receiveShadow = true;
    group.add(step);
    registerGround(step);
  }
  // Side stringers
  const strMat = solidMat(0x5C3D1A);
  const strLen = LAND_STEP_COUNT * LAND_STEP_D + 0.2;
  const strH   = DECK_Y - 0.2 + 0.4;
  [-LAND_STEP_W / 2 - 0.1, LAND_STEP_W / 2 + 0.1].forEach(sx => {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.18, strH, strLen), strMat);
    str.position.set(sx, DECK_Y - strH / 2, LAND_STAIRS_Z + strLen / 2);
    str.castShadow = true;
    group.add(str);
  });
}

// ── Fishing pier ──────────────────────────────────────────────────────

const PIER_W   = 45;
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
  registerGround(pierMesh);

  // ── Rim beam ─────────────────────────────────────────────────────────
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(PIER_W + 0.4, 0.35, PIER_LEN + 0.4),
    solidMat(0x5C3D1A, 0.97)
  );
  rim.position.set(0, PIER_Y - 0.175, PIER_CZ);
  rim.castShadow = rim.receiveShadow = true;
  group.add(rim);

  // ── Pillars every 6 m, extend to y=-9 (seabed) ─────────────────────
  const pierPillarH  = PIER_Y + 9;                     // 0.55 + 9 = 9.55 m
  const pierPillarCY = PIER_Y - pierPillarH / 2;       // top at pier surface, bottom y=-9
  const pMat    = solidMat(0x6B4820);
  const pGeo    = new THREE.CylinderGeometry(0.30, 0.38, pierPillarH, 8);
  for (let pz = PIER_START_Z - 2; pz >= PIER_START_Z - PIER_LEN; pz -= 6) {
    for (let px = -PIER_W / 2 + 2; px <= PIER_W / 2 - 2; px += (PIER_W - 4) / 4) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(px, pierPillarCY, pz);
      p.castShadow = true;
      group.add(p);
    }
  }

  // ── Railings along both sides ────────────────────────────────────────
  const pierSurface = PIER_Y + 0.35;
  [-PIER_W / 2, PIER_W / 2].forEach(rx => {
    _railSegment(group, rx, PIER_CZ, PIER_LEN, 'z', pierSurface);
  });
  // End cap railing
  _railSegment(group, 0, PIER_START_Z - PIER_LEN, PIER_W, 'x', pierSurface);

  // ── Fishing spots — spread across full pier width at far end ────────
  const spotMat  = solidMat(0x3D2A0E, 0.98);
  const spotEndZ = PIER_START_Z - PIER_LEN + 1.5;
  for (let sx = -PIER_W / 2 + 3; sx <= PIER_W / 2 - 3; sx += 6) {
    const spot = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 2.4), spotMat);
    spot.position.set(sx, PIER_Y + 0.37, spotEndZ);
    spot.userData.isFishingSpot = true;
    spot.receiveShadow = true;
    group.add(spot);
  }

  // ── Side fishing alcoves — multiple along each side ──────────────────
  [-PIER_W / 2 - 1.5, PIER_W / 2 + 1.5].forEach(ax => {
    for (let az = PIER_CZ - PIER_LEN * 0.35; az <= PIER_CZ + PIER_LEN * 0.2; az += 14) {
      const alc = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 2.5),
        woodMat(1.5, 1.0));
      alc.position.set(ax, PIER_Y + 0.175, az);
      alc.castShadow = alc.receiveShadow = true;
      group.add(alc);
      const alcSpot = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 2.0), spotMat);
      alcSpot.position.set(ax, PIER_Y + 0.39, az);
      alcSpot.userData.isFishingSpot = true;
      group.add(alcSpot);
    }
  });
}

// ── Perimeter fence around marina grounds ────────────────────────────
// Fence encloses the marina property with gaps for land stairs and path
// Local coords: group at (-325.2, 0, 0), rot.y=PI/2
// Deck: localX∈[-65,+65], localZ∈[-21,+23] → worldX∈[-302,-348], worldZ∈[-65,+65]

function addPerimeterFence(group) {
  const fenceHeight = 1.8;  // 1.8m high fence
  const fenceY = 0.9;       // center at half height
  const postMat = solidMat(0x5C3D1A, 0.9);  // dark brown wood
  const railMat = solidMat(0x7D5D3C, 0.85); // lighter brown

  // Fence boundaries (local coords, wider than deck to enclose property)
  const fenceMinX = -75;   // 10m beyond deck left edge
  const fenceMaxX = 75;    // 10m beyond deck right edge
  const fenceMinZ = -30;   // 9m beyond sea edge
  const fenceMaxZ = 35;    // 12m beyond land edge

  // Land stairs gap (centered at localX=0, width 9.5m + clearance)
  const stairsGapHalf = 6;  // 12m total gap for 9.5m stairs + clearance

  // ── Back (land) side: two segments with stairs gap in center ─────────
  const backZ = fenceMaxZ;
  // Left segment: from left corner to stairs gap
  _buildFenceSegment(group, (fenceMinX - stairsGapHalf) / 2, backZ,
                     fenceMinX + stairsGapHalf, fenceHeight, fenceY, 'x', postMat, railMat);
  // Right segment: from stairs gap to right corner
  _buildFenceSegment(group, (fenceMaxX + stairsGapHalf) / 2, backZ,
                     fenceMaxX - stairsGapHalf, fenceHeight, fenceY, 'x', postMat, railMat);

  // ── Left side (full length) ──────────────────────────────────────────
  const leftX = fenceMinX;
  const leftLen = fenceMaxZ - fenceMinZ;
  _buildFenceSegment(group, leftX, (fenceMinZ + fenceMaxZ) / 2,
                     leftLen, fenceHeight, fenceY, 'z', postMat, railMat);

  // ── Right side (full length) ─────────────────────────────────────────
  const rightX = fenceMaxX;
  _buildFenceSegment(group, rightX, (fenceMinZ + fenceMaxZ) / 2,
                     leftLen, fenceHeight, fenceY, 'z', postMat, railMat);

  // ── Front (sea) side: full length ────────────────────────────────────
  const frontZ = fenceMinZ;
  const frontLen = fenceMaxX - fenceMinX;
  _buildFenceSegment(group, 0, frontZ,
                     frontLen, fenceHeight, fenceY, 'x', postMat, railMat);

  console.log('[marina] Perimeter fence built with land stairs gap');
}

// Build a fence segment with posts and horizontal rails
// axis: 'x' = fence runs along X, 'z' = fence runs along Z
function _buildFenceSegment(group, cx, cz, length, height, baseY, axis, postMat, railMat) {
  const postSpacing = 2.5;  // posts every 2.5m
  const postCount = Math.floor(length / postSpacing) + 1;

  // Add posts
  for (let i = 0; i <= postCount; i++) {
    const t = (i / postCount) - 0.5;
    const px = axis === 'x' ? cx + t * length : cx;
    const pz = axis === 'z' ? cz + t * length : cz;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, height, 0.10),
      postMat
    );
    post.position.set(px, baseY, pz);
    post.castShadow = true;
    group.add(post);
  }

  // Add horizontal rails (3 rails: top, middle, bottom)
  const railGeo = axis === 'x'
    ? new THREE.BoxGeometry(length, 0.08, 0.08)
    : new THREE.BoxGeometry(0.08, 0.08, length);

  [0.7, 0.0, -0.7].forEach(offsetY => {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(cx, baseY + offsetY, cz);
    rail.castShadow = true;
    group.add(rail);
  });

  // Add collision box for fence (in world coords)
  const GROUP_X = -325.2;
  const PAD = 0.5;  // thicker padding for fence
  if (axis === 'x') {
    registerBox(GROUP_X + cz - PAD, GROUP_X + cz + PAD, -cx - length / 2, -cx + length / 2, 'marina_fence');
  } else {
    registerBox(GROUP_X + cz - length / 2, GROUP_X + cz + length / 2, -cx - PAD, -cx + PAD, 'marina_fence');
  }
}

// ── Deck collision (world-space AABBs) ───────────────────────────────
// Group at (-230,0,0) rot.y=PI/2 → worldX = -230+localZ, worldZ = -localX
// Deck: localX∈[-65,+65], localZ∈[-21,+1]  →  worldX∈[-251,-229], worldZ∈[-65,+65]
// Stairs opening: localX∈[-12.5,+12.5] → worldZ∈[-12.5,+12.5]

function _registerDeckCollision() {
  // REMOVED: All wall meshes and collision boxes that were blocking the grass path
  // The marina building itself provides the visual walls
  // No collision boxes needed here - they were blocking access to marina
  console.log('[marina] Marina collision boxes removed - path to marina is now clear');
}

// ── Fisherman NPC ─────────────────────────────────────────────────────

function _loadFishermanNpc(group) {
  const loader = createGLTFLoader();
  const modelPath = '/models/characters/npcs/Fisherman/fisherman.glb';

  loader.load(modelPath, gltf => {
    const model = gltf.scene;

    // Setup materials and shadows
    model.traverse(n => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        if (n.material) {
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(m => {
            if (!m) return;
            if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
            if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          });
        }
      }
    });

    // Scale to 3m tall
    const box = new THREE.Box3().setFromObject(model);
    const h = Math.max(box.max.y - box.min.y, 0.01);
    model.scale.setScalar(3.0 / h);

    // Position on deck
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model);
    const floorY = -box2.min.y;

    // Local position on deck (group handles world transform)
    // Add 0.3 offset to lift feet above deck surface
    model.position.set(2, DECK_Y + floorY + 0.3, -4);
    model.rotation.y = Math.PI / 4; // Face outward

    // Extract and play built-in animations
    const clips = gltf.animations || [];
    if (clips.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(clips[0]);
      action.play();
      model.userData.mixer = mixer;
      console.log('[marina] Fisherman NPC loaded with', clips.length, 'animation(s):', clips.map(c => c.name).join(', '));
    } else {
      console.warn('[marina] fisherman.glb has no embedded animations');
    }

    model.userData.isNPC = true;

    // Add Hebrew label
    attachLabel(model, 'הדייג', 2.156, 'npc'); // Same as Keren

    group.add(model);
    _fishermanNpc = model;

    console.log('[marina] Fisherman NPC loaded at deck position (2, DECK_Y, -4)');

    // Register interaction (world coordinates: group at -230, rot PI/2)
    // Local (2, DECK_Y, -4) → world approx (-234, DECK_Y, -2)
    group.updateWorldMatrix(true, true);
    const worldPos = new THREE.Vector3();
    model.getWorldPosition(worldPos);

    registerInteraction([worldPos.x, worldPos.y + 2, worldPos.z], 'Talk', 3, () => {
      showNpcDialog(['ברוך הבא למרינה'], 'הדייג');
    });

    // Register on minimap
    registerMapEntity(
      'marina_fisherman',
      'npc',
      () => {
        const pos = new THREE.Vector3();
        model.getWorldPosition(pos);
        return { x: pos.x, z: pos.z };
      }
    );

  }, undefined, err => {
    console.error('[marina] Fisherman NPC load failed:', err?.message ?? err);
  });
}

function _loadSkylarNpc(group) {
  const loader = createGLTFLoader();
  const modelPath = '/models/characters/npcs/skylar_breeze_a_casual_summer_character_scan.glb';

  loader.load(modelPath, gltf => {
    const model = gltf.scene;

    // Setup materials and shadows
    model.traverse(n => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        if (n.material) {
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(m => {
            if (!m) return;
            if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
            if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          });
        }
      }
    });

    // Scale to 3m tall
    const box = new THREE.Box3().setFromObject(model);
    const h = Math.max(box.max.y - box.min.y, 0.01);
    model.scale.setScalar(3.0 / h);

    // Position on deck (opposite side from fisherman)
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model);
    const floorY = -box2.min.y;

    // Local position on deck
    model.position.set(-2, DECK_Y + floorY + 0.3, 4);
    model.rotation.y = -Math.PI / 4; // Face outward

    // Extract and play built-in animations
    const clips = gltf.animations || [];
    if (clips.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(clips[0]);
      action.play();
      model.userData.mixer = mixer;
      console.log('[marina] Skylar NPC loaded with', clips.length, 'animation(s)');
    }

    model.userData.isNPC = true;
    attachLabel(model, 'Skylar', 2.156, 'npc'); // Same as Keren

    group.add(model);
    _skylarNpc = model;

    console.log('[marina] Skylar NPC loaded at deck position (-2, DECK_Y, 4)');

    // Register interaction
    group.updateWorldMatrix(true, true);
    const worldPos = new THREE.Vector3();
    model.getWorldPosition(worldPos);

    registerInteraction([worldPos.x, worldPos.y + 2, worldPos.z], 'Talk', 3, () => {
      showNpcDialog(['Welcome to the marina!'], 'Skylar');
    });

    // Register on minimap
    registerMapEntity(
      'marina_skylar',
      'npc',
      () => {
        const pos = new THREE.Vector3();
        model.getWorldPosition(pos);
        return { x: pos.x, z: pos.z };
      }
    );

  }, undefined, err => {
    console.error('[marina] Skylar NPC load failed:', err?.message ?? err);
  });
}

export function updateMarina(delta) {
  if (_fishermanNpc?.userData.mixer) {
    _fishermanNpc.userData.mixer.update(delta);
  }
  if (_skylarNpc?.userData.mixer) {
    _skylarNpc.userData.mixer.update(delta);
  }
}
