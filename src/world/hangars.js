import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { buildNpcCharacter } from './npc.js';
import { registerInteraction, showNpcDialog } from '../ui/interactionUI.js';
import { attachLabel } from '../ui/labels.js';
import { registerGround } from '../systems/terrain.js';

// ── GLB NPC loader (North hangar) ────────────────────────────────────

async function _loadNorthHangarNpc(scene, localX, localY, localZ, rotY) {
  const loader = new GLTFLoader();
  const modelPath = '/models/characters/npcs/hangar1/Keren.glb';

  return new Promise((resolve, reject) => {
    loader.load(modelPath, gltf => {
      const model = gltf.scene;

      // Setup materials, shadows, and preserve GLB textures
      model.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;

          // GLTFLoader already assigns materials correctly — just ensure colorSpace
          if (n.material) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach(m => {
              if (!m) return;
              // Fix colorSpace on all texture maps
              ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach(key => {
                if (m[key]) {
                  if (key === 'map' || key === 'emissiveMap') {
                    m[key].colorSpace = THREE.SRGBColorSpace;
                  }
                  m[key].needsUpdate = true;
                }
              });
              m.needsUpdate = true;
            });
          }
        }
      });

      // Scale to 3m tall
      const box = new THREE.Box3().setFromObject(model);
      const h = Math.max(box.max.y - box.min.y, 0.01);
      model.scale.setScalar(3.0 / h);

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;

      model.position.set(localX, localY + floorY, localZ);
      model.rotation.y = rotY;

      // Use embedded animation from Keren.glb (saves 84MB of external files)
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(clips[0]);
        action.play();
        model.userData.mixer = mixer;
        console.log('[hangar] Keren NPC loaded with embedded animation');
      } else {
        console.warn('[hangar] Keren.glb has no embedded animations');
      }

      model.userData.isNPC = true;

      // Add name label above head (no E key indicator)
      attachLabel(model, 'קרן', 3.8, 'npc');

      console.log('[hangar] Keren NPC loaded, height:', h.toFixed(2), 'm → 3.0 m');

      resolve(model);

    }, undefined, err => {
      console.error('[hangar] Keren NPC load failed:', err?.message ?? err);
      reject(err);
    });
  });
}

// ── GLB NPC loader (Center hangar - Skylar Breeze) ───────────────────

async function _loadCenterHangarNpc(scene, localX, localY, localZ, rotY) {
  const loader = new GLTFLoader();
  const modelPath = '/models/characters/npcs/skylar_breeze_a_casual_summer_character_scan.glb';

  return new Promise((resolve, reject) => {
    loader.load(modelPath, gltf => {
      const model = gltf.scene;

      // Setup materials, shadows, and preserve GLB textures
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

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;

      model.position.set(localX, localY + floorY, localZ);
      model.rotation.y = rotY;

      model.userData.isNPC = true;
      attachLabel(model, 'NPC 1', 3.8, 'npc');

      // Check for embedded animations
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(clips[0]);
        action.play();
        model.userData.mixer = mixer;
        console.log('[hangar] Center NPC loaded with embedded animation');
      }

      console.log('[hangar] Center NPC (Skylar Breeze) loaded, height:', h.toFixed(2), 'm → 3.0 m');

      resolve(model);

    }, undefined, err => {
      console.error('[hangar] Center NPC load failed:', err?.message ?? err);
      reject(err);
    });
  });
}

// ── GLB NPC loader (South hangar - starfish necklace) ────────────────

async function _loadSouthHangarNpc(scene, localX, localY, localZ, rotY) {
  const loader = new GLTFLoader();
  const modelPath = '/models/characters/npcs/starfish_necklace_blue_bodysuit_portrait.glb';

  return new Promise((resolve, reject) => {
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

      // Position on ground
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      const floorY = -box2.min.y;

      model.position.set(localX, localY + floorY, localZ);
      model.rotation.y = rotY;

      model.userData.isNPC = true;
      attachLabel(model, 'NPC 2', 3.8, 'npc');

      // Check for embedded animations
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(clips[0]);
        action.play();
        model.userData.mixer = mixer;
        console.log('[hangar] South NPC loaded with embedded animation');
      }

      console.log('[hangar] South NPC (starfish) loaded, height:', h.toFixed(2), 'm → 3.0 m');

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
const ACCENT = [0xC0392B, 0x27AE60, 0xF1C40F]; // red, green, yellow

// Roof colours per hangar (North, East/Center, South)
const ROOF_COLOR = [0xC0392B, 0x27AE60, 0xF1C40F]; // red, green, yellow

export const allSlots = []; // populated during init, used by stores.js

const _hangarNpcs = []; // FBX NPCs with animation mixers

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
  registerInteraction([0 + halfD*sin0, 0, -130 + halfD*cos0], 'Talk', 7, () => {
    showNpcDialog([
      'Welcome to the North Hangar!',
      'This hangar is home to a variety of stores and creators. Walk along both sides and explore the rooms — each one belongs to a different seller or brand.',
      'Take your time, look around, and click on anything that interests you to learn more.',
      'Enjoy your visit to the North Hangar!',
    ], 'North Hangar');
  });
  // Center: x=130, z=0, rotY=-PI/2
  registerInteraction([130 + halfD*sinNE, 0, 0 + halfD*cosNE], 'Talk', 7, () => {
    showNpcDialog([
      'Welcome to the Central Hangar!',
      'You are standing at the heart of Suy-World. This hangar connects all directions and is filled with rooms from all kinds of sellers, creators, and brands.',
      'Browse both sides and the far wall — there is always something new to discover here.',
      'Enjoy your visit to the Central Hangar!',
    ], 'Central Hangar');
  });
  // South: x=0, z=130, rotY=PI
  registerInteraction([0 + halfD*sinS, 0, 130 + halfD*cosS], 'Talk', 7, () => {
    showNpcDialog([
      'Welcome to the South Hangar!',
      'This hangar is packed with unique rooms and products. Each door you open leads to a different world — a different seller with their own style and story.',
      'Walk in, explore, and click on anything that catches your eye.',
      'Enjoy your visit to the South Hangar!',
    ], 'South Hangar');
  });
}

// ── Build one hangar ──────────────────────────────────────────────────

function buildHangar(scene, { x, z, rotY }, hangarIndex) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const wallMat   = getBrickMat();
  const roofMat   = stdMat(ROOF_COLOR[hangarIndex], 0.85, 0.05);
  const accentMat = stdMat(ACCENT[hangarIndex], 0.7, 0.1);
  const floorMat  = createConcreteFloorMat();
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
  if (hangarIndex === 0) {
    // North hangar: load Keren GLB NPC
    _loadNorthHangarNpc(group, 0, 0, D / 2 - 4, 0).then(npc => {
      npc.userData.hangarIndex = hangarIndex;
      group.add(npc);
      _hangarNpcs.push(npc);
    }).catch(err => console.error('[hangar] North NPC load failed:', err));
  } else if (hangarIndex === 1) {
    // Center hangar: load Skylar Breeze GLB NPC (NPC 1)
    _loadCenterHangarNpc(group, 0, 0, D / 2 - 4, 0).then(npc => {
      npc.userData.hangarIndex = hangarIndex;
      group.add(npc);
      _hangarNpcs.push(npc);
    }).catch(err => console.error('[hangar] Center NPC load failed:', err));
  } else if (hangarIndex === 2) {
    // South hangar: load starfish GLB NPC (NPC 2)
    _loadSouthHangarNpc(group, 0, 0, D / 2 - 4, 0).then(npc => {
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

function buildShell(group, wallMat, roofMat, accentMat, floorMat, colMat) {
  // Floor — extend downward to avoid z-fighting with grass (y=0)
  const floor = add(group, new THREE.BoxGeometry(W - 1, 1.0, D - 1), floorMat, 0, -0.2, 0);
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

function createConcreteFloorMat() {
  // Procedural concrete material with tiling gray color
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8A8A8A,        // Medium gray concrete
    roughness: 0.9,
    metalness: 0.1,
  });
  return mat;
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

// ── Animation update ──────────────────────────────────────────────────

export function updateHangars(delta) {
  _hangarNpcs.forEach(npc => {
    if (npc.userData.mixer) {
      npc.userData.mixer.update(delta);
    }
  });
}
