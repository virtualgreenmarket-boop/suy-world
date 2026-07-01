import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/sharedLoaders.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { buildNpcCharacter } from './npc.js';
import { registerInteraction, showNpcDialog } from '../ui/interactionUI.js';
import { attachLabel } from '../ui/labels.js';
import { registerGround } from '../systems/terrain.js';
import { registerBox } from '../systems/collision.js';

// ── Enhance model quality helper ─────────────────────────────────────

function enhanceModelQuality(model) {
  model.traverse(n => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;

      if (n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m => {
          if (!m) return;

          // Enhance all texture maps with maximum anisotropic filtering
          ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach(key => {
            if (m[key]) {
              m[key].anisotropy = 16; // Maximum sharpness
              m[key].minFilter = THREE.LinearMipmapLinearFilter;
              m[key].magFilter = THREE.LinearFilter;

              // Ensure correct color space
              if (key === 'map' || key === 'emissiveMap') {
                m[key].colorSpace = THREE.SRGBColorSpace;
              }

              m[key].needsUpdate = true;
            }
          });

          // Enhance material properties for better appearance
          if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
            // Add slight emissive to prevent pure black in shadows
            if (!m.emissive || m.emissive.getHex() === 0x000000) {
              m.emissive = new THREE.Color(0x111111);
              m.emissiveIntensity = 0.2;
            }
          }

          m.needsUpdate = true;
        });
      }
    }
  });
}

// ── GLB NPC loader (North hangar) ────────────────────────────────────

async function _loadNorthHangarNpc(scene, localX, localY, localZ, rotY) {
  const loader = createGLTFLoader();
  const modelPath = '/models/characters/npcs/hangar1/Keren2.glb.glb'; // Keren2 model with embedded animation

  return new Promise((resolve, reject) => {
    loader.load(modelPath, gltf => {
      const model = gltf.scene;

      // Enhance model quality (textures, materials, lighting)
      enhanceModelQuality(model);

      // Scale to 3.3m tall (3m + 10%)
      const box = new THREE.Box3().setFromObject(model);
      const h = Math.max(box.max.y - box.min.y, 0.01);
      model.scale.setScalar(3.3 / h);

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;

      model.position.set(localX, localY + floorY, localZ);
      model.rotation.y = rotY;

      // Use embedded animation from Keren2 model
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(clips[0]); // Use first animation
        action.play();
        model.userData.mixer = mixer;
        console.log('[hangar] Keren2 NPC loaded with', clips.length, 'animations - playing first');
      } else {
        console.warn('[hangar] Keren2 model has no embedded animations');
      }

      model.userData.isNPC = true;

      // Add name label right above head (adjusted for 3.3m height)
      attachLabel(model, 'קרן', 2.156, 'npc'); // 1.96 * 1.1 = 2.156 (10% higher)

      console.log('[hangar] Keren2 NPC loaded, height:', h.toFixed(2), 'm → 3.3 m');

      resolve(model);

    }, undefined, err => {
      console.error('[hangar] Keren NPC load failed:', err?.message ?? err);
      reject(err);
    });
  });
}

// ── GLB NPC loader (Center hangar - Skylar Breeze) ───────────────────

async function _loadCenterHangarNpc(scene, localX, localY, localZ, rotY) {
  const loader = createGLTFLoader();
  const modelPath = '/models/characters/npcs/hangar1/Keren2.glb.glb'; // Keren2 (same as north)

  return new Promise((resolve, reject) => {
    loader.load(modelPath, gltf => {
      const model = gltf.scene;

      // Enhance model quality
      enhanceModelQuality(model);

      // Scale to 3.3m tall (3m + 10%)
      const box = new THREE.Box3().setFromObject(model);
      const h = Math.max(box.max.y - box.min.y, 0.01);
      model.scale.setScalar(3.3 / h);

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;

      model.position.set(localX, localY + floorY, localZ);
      model.rotation.y = rotY;

      model.userData.isNPC = true;
      attachLabel(model, 'קרן', 2.156, 'npc'); // 1.96 * 1.1 = 2.156 (10% higher)

      // Check for embedded animations
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(clips[0]);
        action.play();
        model.userData.mixer = mixer;
        console.log('[hangar] Center NPC loaded with embedded animation');
      }

      console.log('[hangar] Center Keren2 NPC loaded, height:', h.toFixed(2), 'm → 3.3 m');

      resolve(model);

    }, undefined, err => {
      console.error('[hangar] Center NPC load failed:', err?.message ?? err);
      reject(err);
    });
  });
}

// ── GLB NPC loader (South hangar - starfish necklace) ────────────────

async function _loadSouthHangarNpc(scene, localX, localY, localZ, rotY) {
  const loader = createGLTFLoader();
  const modelPath = '/models/characters/npcs/hangar1/Keren2.glb.glb'; // Keren2 (same as north)

  return new Promise((resolve, reject) => {
    loader.load(modelPath, gltf => {
      const model = gltf.scene;

      // Enhance model quality
      enhanceModelQuality(model);

      // Scale to 3.3m tall (3m + 10%)
      const box = new THREE.Box3().setFromObject(model);
      const h = Math.max(box.max.y - box.min.y, 0.01);
      model.scale.setScalar(3.3 / h);

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;

      model.position.set(localX, localY + floorY, localZ);
      model.rotation.y = rotY;

      model.userData.isNPC = true;
      attachLabel(model, 'קרן', 2.156, 'npc'); // 1.96 * 1.1 = 2.156 (10% higher)

      // Check for embedded animations
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(clips[0]);
        action.play();
        model.userData.mixer = mixer;
        console.log('[hangar] South Keren2 NPC loaded with embedded animation');
      }

      console.log('[hangar] South Keren2 NPC loaded, height:', h.toFixed(2), 'm → 3.3 m');

      resolve(model);

    }, undefined, err => {
      console.error('[hangar] South NPC load failed:', err?.message ?? err);
      reject(err);
    });
  });
}

// ── Entrance sign builder ─────────────────────────────────────────────

function _buildEntranceSign(text, bgColor) {
  const FONT   = 'bold 96px Arial, sans-serif';
  const PAD_X  = 60;
  const PAD_Y  = 40;
  const RADIUS = 20;

  // Measure text
  const probe = document.createElement('canvas').getContext('2d');
  probe.font  = FONT;
  const tw    = probe.measureText(text).width;
  const th    = probe.measureText('M').actualBoundingBoxAscent + probe.measureText('M').actualBoundingBoxDescent;

  const cw = Math.ceil(tw + PAD_X * 2);
  const ch = Math.ceil(th + PAD_Y * 2);

  const canvas  = document.createElement('canvas');
  canvas.width  = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, cw, ch, RADIUS);
  ctx.fill();

  // Text
  ctx.font         = FONT;
  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  // Flip texture horizontally so Hebrew text renders correctly (not mirrored)
  tex.center.set(0.5, 0.5);
  tex.repeat.x = -1;

  const aspect = cw / ch;
  const planeW = 8;  // 8 meters wide in world space
  const planeH = planeW / aspect;

  const mat   = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);

  return plane;
}

// ── PBR brick material (shared across all three hangars) ──────────────

let _brickMat = null;

function getBrickMat() {
  if (_brickMat) return _brickMat;
  const loader = new THREE.TextureLoader();
  const pfx    = 'textures/hangars/Bricks066_2K-JPG_';

  const color  = loader.load(pfx + 'Color.jpg');
  const normal = loader.load('textures/hangars/Bricks066_1K-JPG_NormalGL.jpg');
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
// Per-hangar exterior dimensions: [North, East/Center, South].
// ALL HANGARS: 190m wide × 143.85m deep × 17.5m tall (unified dimensions)
export const HANGAR_DIMS = [
  { W: 190,   D: 143.85,   H: 17.5,   TH: 1.5  }, // North - centered at X=0
  { W: 190,   D: 143.85,   H: 17.5,   TH: 1.5  }, // East/Center - centered at X=162.6, Z=0
  { W: 190,   D: 143.85,   H: 17.5,   TH: 1.5  }, // South - centered at X=0, Z=162.6
];

// ── Positions ─────────────────────────────────────────────────────────
// ALL HANGARS: Unified 190m × 143.85m × 17.5m dimensions, each centered at their position.
// Plaza moved -50m (toward marina), North and South hangars follow.
// North: entrance at z=-99.15, extends to z=-243
// East/Center: rotated 90°, entrance faces west (toward plaza at x=-50)
// South: rotated 180°, entrance faces north (toward plaza at x=-50)
// Exported so collision.js can build wall colliders that always match the real geometry.
export const HANGAR_CONFIGS = [
  { x:  -50,    z: -171.075, rotY: 0,           name: 'North Hangar' }, // moved -50m with plaza
  { x: 162.6,   z: 0,        rotY: -Math.PI / 2, name: 'East Hangar'  }, // unchanged - perpendicular to plaza movement
  { x:  -50,    z: 162.6,    rotY: Math.PI,      name: 'South Hangar' }, // moved -50m with plaza
];

// ── Room constants (15 rooms per side, 30 total — North hangar only) ──
const ROOM_W     = 20;    // room width along Z axis
const ROOM_D     = 24;    // room depth along X axis (into hangar from side wall)
const ROOM_H     = 17.5;  // room interior height (matches North hangar PHASE 2 wall height)
const ROOM_COUNT = 15;    // rooms per side
const DOOR_W     = 6;     // door opening width (world Z)
const DOOR_H     = 5.5;   // door opening height
const WALL_T     = 0.3;   // interior wall thickness
// Equal gap before / between / after rooms along Z
// Note: rooms are only built in the North hangar (buildRooms is called for hangarIndex 0 only)
// Central corridor width = W - 2*ROOM_D = 84 - 2*24 = 36 m (matches spec)
const ROOM_GAP   = (HANGAR_DIMS[0].D - ROOM_COUNT * ROOM_W) / (ROOM_COUNT + 1);

// Far-wall store slots
// For North hangar (index 0): use full width for more slots
// For other hangars: use original 67.5m span
const FRONT_SPAN  = 67.5;
const FRONT_COUNT = 10;

// Accent colours per hangar
const ACCENT = [0xC0392B, 0x27AE60, 0xF1C40F]; // red, green, yellow

// Roof colours per hangar (North, East/Center, South)
const ROOF_COLOR = [0xC0392B, 0x27AE60, 0xF1C40F]; // red, green, yellow

export const allSlots = []; // populated during init, used by stores.js

const _hangarNpcs    = []; // FBX NPCs with animation mixers
let _camera = null;

// ── Public ────────────────────────────────────────────────────────────

export function initHangars(scene, camera) {
  _camera = camera;

  HANGAR_CONFIGS.forEach((cfg, i) => buildHangar(scene, cfg, i));

  // Register entrance NPCs as "Shop" interactions
  // World positions: NPC is at local (0, 0, D/2-4) inside each rotated hangar group
  const halfD = HANGAR_DIMS.map(d => d.D / 2 - 4);
  const sin0 = Math.sin(0),        cos0 = Math.cos(0);
  const sinNE = Math.sin(-Math.PI/2), cosNE = Math.cos(-Math.PI/2);
  const sinS = Math.sin(Math.PI),   cosS = Math.cos(Math.PI);

  // North: x=0, z=HANGAR_CONFIGS[0].z, rotY=0
  registerInteraction([0 + halfD[0]*sin0, 0, HANGAR_CONFIGS[0].z + halfD[0]*cos0], 'Talk', 7, () => {
    showNpcDialog([
      'Welcome to the North Hangar!',
      'This hangar is home to a variety of stores and creators. Walk along both sides and explore the rooms — each one belongs to a different seller or brand.',
      'Take your time, look around, and click on anything that interests you to learn more.',
      'Enjoy your visit to the North Hangar!',
    ], 'North Hangar');
  }, null, 3.5); // NPC is 3.3m tall, button at 3.5m
  // Center: x=162.6, z=0, rotY=-PI/2 (10m closer to plaza)
  registerInteraction([162.6 + halfD[1]*sinNE, 0, 0 + halfD[1]*cosNE], 'Talk', 7, () => {
    showNpcDialog([
      'Welcome to the Central Hangar!',
      'You are standing at the heart of Suy-World. This hangar connects all directions and is filled with rooms from all kinds of sellers, creators, and brands.',
      'Browse both sides and the far wall — there is always something new to discover here.',
      'Enjoy your visit to the Central Hangar!',
    ], 'Central Hangar');
  }, null, 3.5); // NPC is 3.3m tall, button at 3.5m
  // South: x=0, z=162.6, rotY=PI (10m closer to plaza)
  registerInteraction([0 + halfD[2]*sinS, 0, 162.6 + halfD[2]*cosS], 'Talk', 7, () => {
    showNpcDialog([
      'Welcome to the South Hangar!',
      'This hangar is packed with unique rooms and products. Each door you open leads to a different world — a different seller with their own style and story.',
      'Walk in, explore, and click on anything that catches your eye.',
      'Enjoy your visit to the South Hangar!',
    ], 'South Hangar');
  }, null, 3.5); // NPC is 3.3m tall, button at 3.5m
}

// ── Build one hangar ──────────────────────────────────────────────────

function buildHangar(scene, { x, z, rotY }, hangarIndex) {
  const { W, D, H, TH } = HANGAR_DIMS[hangarIndex];

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const wallMat   = getBrickMat();
  const roofMat   = stdMat(ROOF_COLOR[hangarIndex], 0.85, 0.05);
  const accentMat = stdMat(ACCENT[hangarIndex], 0.7, 0.1);
  const floorMat  = createConcreteFloorMat();
  const colMat    = stdMat(0xF0EBE3, 0.78, 0.05);

  // ── Shell ─────────────────────────────────────────────────────────
  buildShell(group, wallMat, roofMat, accentMat, floorMat, colMat, hangarIndex);

  // ── Ceiling fan (center of hangar) ────────────────────────────────
  buildCeilingFan(group, hangarIndex);

  // ── Store slots ───────────────────────────────────────────────────
  const slotSignMat = stdMat(0xBDBDBD, 0.82); // default: available (gray)
  const counterMat  = stdMat(0x90A4AE, 0.88);

  // All hangars: 40 market kiosks
  buildKiosks(group, hangarIndex, x, z, rotY);

  // ── Entrance NPC character ────────────────────────────────────────
  // Floor top surface is at y=0.5 (floor center at 0.25 + thickness/2)
  const floorTopY = 0.5;

  if (hangarIndex === 0) {
    // North hangar: load Keren GLB NPC
    _loadNorthHangarNpc(group, 0, floorTopY, D / 2 - 4, 0).then(npc => {
      npc.userData.hangarIndex = hangarIndex;
      group.add(npc);
      _hangarNpcs.push(npc);
    }).catch(err => console.error('[hangar] North NPC load failed:', err));
  } else if (hangarIndex === 1) {
    // Center hangar: load Skylar Breeze GLB NPC (NPC 1)
    _loadCenterHangarNpc(group, 0, floorTopY, D / 2 - 4, 0).then(npc => {
      npc.userData.hangarIndex = hangarIndex;
      group.add(npc);
      _hangarNpcs.push(npc);
    }).catch(err => console.error('[hangar] Center NPC load failed:', err));
  } else if (hangarIndex === 2) {
    // South hangar: load starfish GLB NPC (NPC 2)
    _loadSouthHangarNpc(group, 0, floorTopY, D / 2 - 4, 0).then(npc => {
      npc.userData.hangarIndex = hangarIndex;
      group.add(npc);
      _hangarNpcs.push(npc);
    }).catch(err => console.error('[hangar] South NPC load failed:', err));
  }

  // ── Entrance sign ─────────────────────────────────────────────────
  const signTexts = ['צפון', 'מרכז', 'דרום']; // North, Center, South
  const sign = _buildEntranceSign(signTexts[hangarIndex], ACCENT[hangarIndex]);
  sign.position.set(0, H * 0.75, D / 2 - 0.5); // above entrance, just inside
  sign.rotation.y = Math.PI; // face outward (toward player approaching)
  group.add(sign);

  scene.add(group);

  // ── Precompute world slot positions ───────────────────────────────
  finaliseSlotPositions(group, hangarIndex);
}

// ── Hangar exterior shell ─────────────────────────────────────────────

function buildShell(group, wallMat, roofMat, accentMat, floorMat, colMat, hangarIndex) {
  const { W, D, H, TH } = HANGAR_DIMS[hangarIndex];

  // Floor — SOLID platform raised above grass level
  const floorThickness = 0.5; // Thicker floor for solidity
  const floorY = 0.25; // Raise floor 25cm above grass
  const floor = add(group, new THREE.BoxGeometry(W - 1, floorThickness, D - 1), floorMat, 0, floorY, 0);

  // Make floor completely solid and opaque
  floor.renderOrder = 1; // Render floor on top of grass
  floor.material.transparent = false;
  floor.material.opacity = 1.0;
  floor.material.side = THREE.FrontSide;

  registerGround(floor);

  // Left wall
  addWall(group, new THREE.BoxGeometry(0.6, H, D), wallMat, -W / 2, H / 2, 0);
  // Right wall
  addWall(group, new THREE.BoxGeometry(0.6, H, D), wallMat,  W / 2, H / 2, 0);
  // Far wall (with door opening — 10 m gap)
  const fwSide = (W - 12) / 2;
  addWall(group, new THREE.BoxGeometry(fwSide, H, 0.6), wallMat, -(W / 2 - fwSide / 2), H / 2, -D / 2);
  addWall(group, new THREE.BoxGeometry(fwSide, H, 0.6), wallMat,  W / 2 - fwSide / 2,   H / 2, -D / 2);
  addWall(group, new THREE.BoxGeometry(12, H * 0.35, 0.6), wallMat, 0, H - H * 0.35 / 2, -D / 2);

  // Entrance: columns scaled proportionally to hangar width
  // For narrow hangars: 4 columns. For wide hangars (W>150): add more columns
  const columnCount = W > 150 ? 8 : 4;
  const columnSpacing = W / (columnCount + 1);
  for (let i = 1; i <= columnCount; i++) {
    const cx = -W / 2 + i * columnSpacing;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, H, 10), colMat);
    col.position.set(cx, H / 2, D / 2);
    col.castShadow = false; // No shadows
    col.receiveShadow = false;
    group.add(col);
  }

  // Glass panels on entrance wall (between columns AND corner gaps)
  // Light blue glass with shine, 50% transparent
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x87CEEB,        // Light blue (sky blue)
    transparent: true,
    opacity: 0.5,           // 50% transparent
    metalness: 0.1,
    roughness: 0.1,         // Shiny/glossy
    side: THREE.DoubleSide
  });

  // Find center two columns indices (where NPC is)
  const centerColumnIndex1 = Math.floor(columnCount / 2);

  // Glass between columns
  for (let i = 0; i < columnCount - 1; i++) {
    const col1X = -W / 2 + (i + 1) * columnSpacing;
    const col2X = -W / 2 + (i + 2) * columnSpacing;
    const panelCenterX = (col1X + col2X) / 2;
    const panelWidth = columnSpacing - 2.4; // Gap minus column diameter

    // Skip ONLY the panel between the two center columns (closest to NPC)
    if (i + 1 === centerColumnIndex1) {
      continue; // Skip center panel
    }

    const glassPanel = new THREE.Mesh(
      new THREE.BoxGeometry(panelWidth, H - 1, 0.15), // Thin glass
      glassMat
    );
    glassPanel.position.set(panelCenterX, H / 2, D / 2);
    glassPanel.castShadow = false;
    glassPanel.receiveShadow = true;
    group.add(glassPanel);
  }

  // Corner glass panels: left side (wall to first column)
  const firstColumnX = -W / 2 + columnSpacing;
  const leftCornerPanelWidth = columnSpacing - 1.2 - 0.3; // spacing - half column diameter - wall thickness
  const leftCornerPanelX = -W / 2 + leftCornerPanelWidth / 2 + 0.3;
  const leftCornerGlass = new THREE.Mesh(
    new THREE.BoxGeometry(leftCornerPanelWidth, H - 1, 0.15),
    glassMat
  );
  leftCornerGlass.position.set(leftCornerPanelX, H / 2, D / 2);
  leftCornerGlass.castShadow = false;
  leftCornerGlass.receiveShadow = true;
  group.add(leftCornerGlass);

  // Corner glass panels: right side (last column to wall)
  const lastColumnX = -W / 2 + columnCount * columnSpacing;
  const rightCornerPanelWidth = columnSpacing - 1.2 - 0.3;
  const rightCornerPanelX = W / 2 - rightCornerPanelWidth / 2 - 0.3;
  const rightCornerGlass = new THREE.Mesh(
    new THREE.BoxGeometry(rightCornerPanelWidth, H - 1, 0.15),
    glassMat
  );
  rightCornerGlass.position.set(rightCornerPanelX, H / 2, D / 2);
  rightCornerGlass.castShadow = false;
  rightCornerGlass.receiveShadow = true;
  group.add(rightCornerGlass);

  // Roof
  add(group, new THREE.BoxGeometry(W + 1, TH, D + 1), roofMat, 0, H + TH / 2, 0, true);

  // Accent band along the top of the side walls
  add(group, new THREE.BoxGeometry(0.8, 1.8, D), accentMat, -W / 2, H - 0.4, 0);
  add(group, new THREE.BoxGeometry(0.8, 1.8, D), accentMat,  W / 2, H - 0.4, 0);
  add(group, new THREE.BoxGeometry(W + 1, 1.8, 0.8), accentMat, 0, H - 0.4, -D / 2);
  add(group, new THREE.BoxGeometry(W + 1, 1.8, 0.8), accentMat, 0, H - 0.4,  D / 2);
}

// ── Room number sign ─────────────────────────────────────────────────

// Cache for sign materials to prevent WebGL uniform errors
const _signMaterialCache = new Map();

function _buildRoomNumberSign(number) {
  // Check cache first
  if (_signMaterialCache.has(number)) {
    const cachedMat = _signMaterialCache.get(number);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), cachedMat);
    return plane;
  }

  const canvas  = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Null-safety check - verify canvas is valid
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    console.warn('[hangars] Invalid canvas for sign', number);
    // Return empty mesh with no material
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  }

  // Background
  ctx.fillStyle = '#2C2C2C';
  ctx.beginPath();
  ctx.roundRect(0, 0, 256, 256, 24);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#888888';
  ctx.lineWidth   = 8;
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 248, 20);
  ctx.stroke();

  // Number text
  ctx.fillStyle   = '#FFFFFF';
  ctx.font        = 'bold 140px Arial, sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 128, 128);

  // CRITICAL: Create material with map: null first, assign texture AFTER drawing is complete
  const mat = new THREE.MeshBasicMaterial({
    map: null,  // Start with null
    side: THREE.DoubleSide,
    transparent: true
  });

  // Now create texture AFTER all drawing is done
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  // Assign texture to material AFTER it's created
  mat.map = tex;
  mat.needsUpdate = true; // Mark material for update
  tex.needsUpdate = true; // Mark texture for upload

  // Cache the material
  _signMaterialCache.set(number, mat);

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  return plane;
}

// ── Rooms (4 per side, 8 total per hangar) ───────────────────────────

function buildRooms(group, side, hangarIndex) {
  const { W, D } = HANGAR_DIMS[hangarIndex];
  const inward = side === 'left' ? 1 : -1;
  const outerX = side === 'left' ? -W / 2 : W / 2;
  const frontX = outerX + inward * ROOM_D;  // corridor-facing wall X
  const midX   = outerX + inward * (ROOM_D / 2);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xF0EBE0, roughness: 0.88, metalness: 0.0 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xE0DBD0, roughness: 0.9,  metalness: 0.0 });

  for (let i = ROOM_COUNT - 1; i >= 0; i--) {
    const centerZ = -D / 2 + ROOM_GAP + ROOM_W / 2 + i * (ROOM_W + ROOM_GAP);

    // Side walls — run along X, perpendicular to hangar outer wall
    [-1, 1].forEach(sign => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(ROOM_D, ROOM_H, WALL_T), wallMat);
      sw.position.set(midX, ROOM_H / 2, centerZ + sign * ROOM_W / 2);
      group.add(sw);
    });

    // Front wall — two side panels flanking the door + header above door
    const sideSegW = (ROOM_W - DOOR_W) / 2; // 7 m each
    [-1, 1].forEach(sign => {
      const fw = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, ROOM_H, sideSegW), wallMat);
      fw.position.set(frontX, ROOM_H / 2, centerZ + sign * (DOOR_W / 2 + sideSegW / 2));
      group.add(fw);
    });

    const aboveH = ROOM_H - DOOR_H; // 8.5 m header
    const header = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, aboveH, DOOR_W), wallMat);
    header.position.set(frontX, DOOR_H + aboveH / 2, centerZ);
    group.add(header);

    // Ceiling slab
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_D, WALL_T, ROOM_W), ceilMat);
    ceil.position.set(midX, ROOM_H, centerZ);
    group.add(ceil);

    // Small sign plate above door — used by stores.js for proximity highlight
    const signMat  = new THREE.MeshStandardMaterial({ color: 0xBDBDBD, roughness: 0.82 });
    const signMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.5, DOOR_W - 0.5),
      signMat
    );
    signMesh.position.set(frontX - inward * 0.1, DOOR_H + (ROOM_H - DOOR_H) / 2, centerZ);
    signMesh.userData.isSlot = true;
    group.add(signMesh);

    // Register slot
    const slotId = allSlots.length;
    allSlots.push({
      id:        slotId,
      hangarIndex,
      wall:      side,
      slotIndex: i,
      localPos:  new THREE.Vector3(frontX + inward * 2, 0, centerZ),
      signMesh,
      status:    'available',
      worldPos:  new THREE.Vector3(),
    });

    // Room number sign — mounted on corridor-facing side of front wall, above door
    const roomNumber = slotId + 1;
    const numSign = _buildRoomNumberSign(roomNumber);
    // Offset slightly off the wall face toward the corridor so it's visible
    numSign.position.set(
      frontX - inward * (WALL_T / 2 + 0.05),
      DOOR_H + (ROOM_H - DOOR_H) / 2,
      centerZ
    );
    // Rotate to face the corridor
    numSign.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    group.add(numSign);
  }
}

function buildFarSlots(group, hangarIndex, signMat, counterMat) {
  const { H, D, W } = HANGAR_DIMS[hangarIndex];
  const wallZ  = -(D / 2 - 0.3);

  // For North hangar (index 0): use full width and add more slots to reach 50 total
  // 15 left + 15 right + 20 far = 50 slots
  const isNorthHangar = hangarIndex === 0;
  const slotCount = isNorthHangar ? 20 : FRONT_COUNT;
  const spanWidth = isNorthHangar ? (W - 4) : FRONT_SPAN; // Use almost full width for North
  const slotWidth = spanWidth / slotCount;

  for (let i = 0; i < slotCount; i++) {
    const slotX = -spanWidth / 2 + (i + 0.5) * slotWidth;

    const pillarX = -spanWidth / 2 + i * slotWidth;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, H * 0.85, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xC8C0B8, roughness: 0.88 })
    );
    pillar.position.set(pillarX, H * 0.85 / 2, wallZ + 1.5);
    group.add(pillar);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(slotWidth - 0.35, 1.2, 0.15),
      signMat.clone()
    );
    sign.position.set(slotX, 5.5, wallZ + 0.1);
    sign.userData.isSlot = true;
    group.add(sign);

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(slotWidth - 0.45, 0.9, 1.6),
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
  pillar.position.set(spanWidth / 2, H * 0.85 / 2, wallZ + 1.5);
  group.add(pillar);
}

// ── Market Kiosks (North Hangar only) — 50 open-front stalls ─────────

function buildKiosks(group, hangarIndex, hangarCenterX, hangarCenterZ, hangarRotY) {
  const { W, D } = HANGAR_DIMS[hangarIndex];

  // Kiosk dimensions (+5% width, +20% height from original)
  const KIOSK_WIDTH = 10.5;  // Was 10m, +5% = 10.5m
  const KIOSK_DEPTH = 8;     // Unchanged
  const KIOSK_HEIGHT = 5.4;  // Was 4.5m, +20% = 5.4m (increased from 4.725m)
  const WALL_OFFSET = 0.3;   // Distance from hangar wall

  // Roof color palette (6 colors, cycling)
  const ROOF_COLORS = [0xE67E22, 0x16A085, 0xC0392B, 0x2980B9, 0x8E44AD, 0x27AE60];

  // CRITICAL: Use ONLY MeshLambertMaterial to avoid EffectComposer crashes
  // Create materials ONCE and reuse across all kiosks
  const postMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 }); // Dark wood
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xF5F0E8 }); // Warm white
  const counterMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 }); // Dark wood

  // Create 6 roof materials (one per color)
  const roofMaterials = ROOF_COLORS.map(color =>
    new THREE.MeshLambertMaterial({ color })
  );

  let kioskNumber = 0;

  // Helper: add one kiosk
  function addKiosk(x, z, rotY, wallName) {
    kioskNumber++;
    const roofMat = roofMaterials[(kioskNumber - 1) % 6];

    const kiosk = new THREE.Group();
    kiosk.position.set(x, 0, z);
    kiosk.rotation.y = rotY;

    // 4 corner posts
    const postGeo = new THREE.CylinderGeometry(0.25, 0.25, KIOSK_HEIGHT, 8);
    const postPositions = [
      [-KIOSK_WIDTH/2, -KIOSK_DEPTH/2],
      [KIOSK_WIDTH/2, -KIOSK_DEPTH/2],
      [-KIOSK_WIDTH/2, KIOSK_DEPTH/2],
      [KIOSK_WIDTH/2, KIOSK_DEPTH/2]
    ];
    postPositions.forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, KIOSK_HEIGHT/2, pz);
      post.castShadow = true;
      kiosk.add(post);
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(KIOSK_WIDTH, KIOSK_HEIGHT, 0.15),
      wallMat
    );
    backWall.position.set(0, KIOSK_HEIGHT/2, KIOSK_DEPTH/2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    kiosk.add(backWall);

    // Side walls
    const sideWallGeo = new THREE.BoxGeometry(0.15, KIOSK_HEIGHT, KIOSK_DEPTH);
    [-KIOSK_WIDTH/2, KIOSK_WIDTH/2].forEach(sx => {
      const sideWall = new THREE.Mesh(sideWallGeo, wallMat);
      sideWall.position.set(sx, KIOSK_HEIGHT/2, 0);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      kiosk.add(sideWall);
    });

    // Roof (slightly sloped)
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(KIOSK_WIDTH + 0.5, 0.2, KIOSK_DEPTH + 0.5),
      roofMat
    );
    roof.position.set(0, KIOSK_HEIGHT, 0);
    roof.rotation.x = 0.05; // Gentle slope
    roof.castShadow = true;
    kiosk.add(roof);

    // Front counter
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(KIOSK_WIDTH, 1.0, 0.8),
      counterMat
    );
    counter.position.set(0, 0.5, -KIOSK_DEPTH/2 + 0.4);
    counter.castShadow = true;
    counter.receiveShadow = true;
    kiosk.add(counter);

    // Simple placeholder sign — no canvas texture (prevents EffectComposer crash)
    // TODO: Re-enable _buildRoomNumberSign() after fixing canvas texture timing
    const signGeo = new THREE.BoxGeometry(2, 1.2, 0.05);
    const signMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const numSign = new THREE.Mesh(signGeo, signMat);
    numSign.position.set(0, KIOSK_HEIGHT - 0.5, -KIOSK_DEPTH/2 - 0.1);
    numSign.castShadow = true;
    kiosk.add(numSign);

    group.add(kiosk);

    // SOLID WALL COLLISION - 3 boxes (back + left side + right side)
    // Front face is OPEN - no collision
    // CRITICAL: Convert from LOCAL (inside hangar group) to WORLD coordinates
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const hc = Math.cos(hangarRotY);
    const hs = Math.sin(hangarRotY);

    // Convert local kiosk position to world coordinates
    const worldKioskX = hangarCenterX + hc * x - hs * z;
    const worldKioskZ = hangarCenterZ + hs * x + hc * z;

    // Back wall collision (full width, thin depth at back)
    const backWallThickness = 0.2;
    const backWallOffset = KIOSK_DEPTH / 2 - backWallThickness / 2;
    const backWallCenterX = worldKioskX + c * 0 + s * backWallOffset;
    const backWallCenterZ = worldKioskZ + s * 0 + c * backWallOffset;

    const hwb = KIOSK_WIDTH / 2;
    const hdb = backWallThickness / 2;
    const backCorners = [
      [backWallCenterX + c * -hwb - s * -hdb, backWallCenterZ + s * -hwb + c * -hdb],
      [backWallCenterX + c *  hwb - s * -hdb, backWallCenterZ + s *  hwb + c * -hdb],
      [backWallCenterX + c * -hwb - s *  hdb, backWallCenterZ + s * -hwb + c *  hdb],
      [backWallCenterX + c *  hwb - s *  hdb, backWallCenterZ + s *  hwb + c *  hdb]
    ];
    registerBox(
      Math.min(...backCorners.map(p => p[0])),
      Math.max(...backCorners.map(p => p[0])),
      Math.min(...backCorners.map(p => p[1])),
      Math.max(...backCorners.map(p => p[1]))
    );

    // Left side wall collision (thin width, runs from back to ~middle)
    const sideWallThickness = 0.2;
    const sideWallDepth = KIOSK_DEPTH * 0.6; // 60% of depth (back + partial sides)
    const sideWallOffset = KIOSK_DEPTH / 2 - sideWallDepth / 2;

    const leftSideX = worldKioskX + c * (-KIOSK_WIDTH/2 + sideWallThickness/2) + s * sideWallOffset;
    const leftSideZ = worldKioskZ + s * (-KIOSK_WIDTH/2 + sideWallThickness/2) + c * sideWallOffset;
    const hws = sideWallThickness / 2;
    const hds = sideWallDepth / 2;
    const leftCorners = [
      [leftSideX + c * -hws - s * -hds, leftSideZ + s * -hws + c * -hds],
      [leftSideX + c *  hws - s * -hds, leftSideZ + s *  hws + c * -hds],
      [leftSideX + c * -hws - s *  hds, leftSideZ + s * -hws + c *  hds],
      [leftSideX + c *  hws - s *  hds, leftSideZ + s *  hws + c *  hds]
    ];
    registerBox(
      Math.min(...leftCorners.map(p => p[0])),
      Math.max(...leftCorners.map(p => p[0])),
      Math.min(...leftCorners.map(p => p[1])),
      Math.max(...leftCorners.map(p => p[1]))
    );

    // Right side wall collision
    const rightSideX = worldKioskX + c * (KIOSK_WIDTH/2 - sideWallThickness/2) + s * sideWallOffset;
    const rightSideZ = worldKioskZ + s * (KIOSK_WIDTH/2 - sideWallThickness/2) + c * sideWallOffset;
    const rightCorners = [
      [rightSideX + c * -hws - s * -hds, rightSideZ + s * -hws + c * -hds],
      [rightSideX + c *  hws - s * -hds, rightSideZ + s *  hws + c * -hds],
      [rightSideX + c * -hws - s *  hds, rightSideZ + s * -hws + c *  hds],
      [rightSideX + c *  hws - s *  hds, rightSideZ + s *  hws + c *  hds]
    ];
    registerBox(
      Math.min(...rightCorners.map(p => p[0])),
      Math.max(...rightCorners.map(p => p[0])),
      Math.min(...rightCorners.map(p => p[1])),
      Math.max(...rightCorners.map(p => p[1]))
    );

    // Register slot
    allSlots.push({
      id: allSlots.length,
      hangarIndex,
      wall: wallName,
      slotIndex: kioskNumber - 1,
      localPos: new THREE.Vector3(x, 0, z),
      signMesh: numSign,
      status: 'available',
      worldPos: new THREE.Vector3()
    });
  }

  // NO kiosks on entrance wall - keep it clear for entry

  // Rear wall (north, 16 kiosks @ 10.5m width = 168m total)
  // Wall: 190m - 168m = 22m gap space → distribute evenly
  const rearZ = -D/2 + KIOSK_DEPTH/2 + WALL_OFFSET;
  const rearTotalWidth = 16 * KIOSK_WIDTH; // 168m
  const rearGapSpace = W - rearTotalWidth; // 22m
  const rearGap = rearGapSpace / (16 + 1); // 1.29m per gap (17 gaps total)
  for (let i = 0; i < 16; i++) {
    const x = -W/2 + rearGap + (i * (KIOSK_WIDTH + rearGap)) + KIOSK_WIDTH/2;
    addKiosk(x, rearZ, Math.PI, 'rear');
  }

  // East side wall (12 kiosks @ 10.5m width = 126m total)
  // Wall: 143.85m - 126m = 17.85m gap space
  const eastX = W/2 - KIOSK_DEPTH/2 - WALL_OFFSET;
  const eastTotalWidth = 12 * KIOSK_WIDTH; // 126m
  const eastGapSpace = D - eastTotalWidth; // 17.85m
  const eastGap = eastGapSpace / (12 + 1); // 1.37m per gap (13 gaps total)
  for (let i = 0; i < 12; i++) {
    const z = -D/2 + eastGap + (i * (KIOSK_WIDTH + eastGap)) + KIOSK_WIDTH/2;
    addKiosk(eastX, z, Math.PI/2, 'east');
  }

  // West side wall (12 kiosks @ 10.5m width = 126m total)
  const westX = -W/2 + KIOSK_DEPTH/2 + WALL_OFFSET;
  const westGap = eastGap; // Same as east wall
  for (let i = 0; i < 12; i++) {
    const z = -D/2 + westGap + (i * (KIOSK_WIDTH + westGap)) + KIOSK_WIDTH/2;
    addKiosk(westX, z, -Math.PI/2, 'west');
  }

  console.log('[hangars] North hangar: Built', kioskNumber, 'market kiosks (40 total, 10.5m wide each)');
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

// ── Ceiling Fan (large rotating fan in center of hangar) ─────────────

function buildCeilingFan(group, hangarIndex) {
  const { H } = HANGAR_DIMS[hangarIndex];

  const FAN_DIAMETER = 48; // 48m diameter fan (-20% from 60m)
  const FAN_HEIGHT = H - 1; // 1m below ceiling (16.5m)
  const BLADE_COUNT = 4;
  const BLADE_WIDTH = FAN_DIAMETER / 2 - 2; // Radius minus hub (scaled -20%)
  const BLADE_DEPTH = 4.8; // 4.8m blade depth (-20% from 6m)
  const BLADE_THICKNESS = 0.32; // 0.32m thick (-20% from 0.4m)

  const fanGroup = new THREE.Group();
  fanGroup.position.set(0, FAN_HEIGHT, 0);

  // Central hub (motor housing) - WHITE
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF }); // White
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2, 3.2, 12), // -20% from (2, 2.5, 4)
    hubMat
  );
  hub.castShadow = true;
  fanGroup.add(hub);

  // Rod connecting to ceiling - WHITE
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 4, 8), // -20% from (0.4, 0.4, 5)
    hubMat
  );
  rod.position.y = 3.6; // -20% from 4.5
  rod.castShadow = true;
  fanGroup.add(rod);

  // 4 blades - WHITE
  const bladeMat = new THREE.MeshLambertMaterial({
    color: 0xFFFFFF, // White
    side: THREE.DoubleSide
  });

  for (let i = 0; i < BLADE_COUNT; i++) {
    const angle = (i / BLADE_COUNT) * Math.PI * 2;

    // Blade geometry
    const bladeGeo = new THREE.BoxGeometry(BLADE_WIDTH, BLADE_THICKNESS, BLADE_DEPTH);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);

    // All blades emerge from same point: bottom of hub (motor base)
    // Hub is at y=0 with height=3.2, so bottom is at y=-1.6
    // Blade extends outward from center point
    blade.position.set(
      Math.cos(angle) * (BLADE_WIDTH / 2),
      -1.6, // Bottom of hub (base of motor, -20% from -2)
      Math.sin(angle) * (BLADE_WIDTH / 2)
    );

    // Rotate blade to align radially (no tilt - perfectly flat)
    blade.rotation.y = angle;

    blade.castShadow = true;
    blade.receiveShadow = true;
    fanGroup.add(blade);
  }

  group.add(fanGroup);

  // Store reference for animation
  fanGroup.userData.isCeilingFan = true;
  fanGroup.userData.rotationSpeed = 0.3; // Radians per second
}

// ── Helpers ───────────────────────────────────────────────────────────

function stdMat(color, rough = 0.85, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function createConcreteFloorMat() {
  // SOLID PBR concrete floor material
  const loader = new THREE.TextureLoader();
  const texPath = 'textures/Floors/broken_down_concrete1_bl/broken_down_concrete1_Roughness.webp';

  const roughnessMap = loader.load(
    texPath,
    (tex) => console.log('[hangar] Concrete floor roughness texture loaded'),
    undefined,
    (err) => console.error('[hangar] Concrete floor texture failed:', err)
  );

  // Configure texture tiling for large hangar floor (94m x 94m)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(12, 12); // 12x12 tiles for realistic concrete scale
  roughnessMap.anisotropy = 16;

  const mat = new THREE.MeshStandardMaterial({
    color: 0x808080,           // Solid gray concrete base color
    roughnessMap: roughnessMap,
    roughness: 0.85,           // Base roughness value
    metalness: 0.05,           // Concrete is non-metallic
    transparent: false,        // SOLID - no transparency
    opacity: 1.0,              // Fully opaque
    side: THREE.FrontSide,     // Only front face (optimization)
    depthWrite: true,          // Write to depth buffer
    depthTest: true,           // Test depth
  });

  return mat;
}

function add(group, geo, mat, x, y, z, castShadow = false) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = false; // No shadows on hangar structures
  m.castShadow = false;    // Hangars don't cast shadows
  group.add(m);
  return m;
}

// Like add() but copies uv → uv1 so aoMap works on BoxGeometry walls
function addWall(group, geo, mat, x, y, z) {
  geo.setAttribute('uv1', geo.attributes.uv);
  return add(group, geo, mat, x, y, z);
}

// ── Animation update ──────────────────────────────────────────────────

export function updateHangars(delta) {
  _hangarNpcs.forEach(npc => {
    if (npc.userData.mixer) {
      npc.userData.mixer.update(delta);
    }
  });
}
