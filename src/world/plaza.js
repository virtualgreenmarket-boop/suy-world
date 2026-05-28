import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildNpcCharacter } from './npc.js';
import { spawnTree } from './trees.js';
import { spawnAllPlazaNpcs, updateAllPlazaNpcs, registerSitBenches } from './npcGlb.js';
import { registerGround } from '../systems/terrain.js';
import { registerInteraction, setActiveInteractionLabel, showNpcDialog } from '../ui/interactionUI.js';
import { sitOnBench, standUp, isPlayerSitting } from '../player/localPlayer.js';

const PLAZA_SIZE        = 82;
const FLOOR_Y           = 0.35;
const CENTRAL_TREE_H    = 30;
const BENCH_URL         = '/models/furniture/benches/bench_model_free.glb';

let _birds      = [];
let _benchTmpl  = null;   // GLB bench template — set on first load
let _pendingFns = [];      // queued spawn fns waiting for the template

// ── Public ────────────────────────────────────────────────────────────

export function initPlaza(scene) {
  addFloor(scene);
  _loadBenches(scene);
  addCentralTree(scene);
  addNpc(scene);
  _birds = createBirds(scene);

  spawnAllPlazaNpcs(scene).catch(err => console.error('[plaza] NPC spawn failed:', err));
  _addBenchLabels(scene);

  // Two seat anchors per bench at ±SO from centre (≈ 1/3 and 2/3 of bench length).
  // Small range ensures only the nearest seat prompt is ever shown.
  const W = 39, P = 31, SO = 0.65; // half seat span — seats placed just inside bench edges

  // Two seat anchors per bench — the nearest one wins as the player moves left/right.
  const _seat = (sx, sz, frontFacingY) => {
    registerInteraction([sx, FLOOR_Y, sz], 'Sit', 3.0, () => {
      if (isPlayerSitting()) {
        standUp();
        setActiveInteractionLabel('Sit');
        return;
      }
      sitOnBench(sx, FLOOR_Y, sz, frontFacingY);
      setActiveInteractionLabel('Stand Up');
    });
  };

  const _bench = (benchX, benchZ, alongX, frontFacingY) => {
    if (alongX) {
      _seat(benchX - SO, benchZ, frontFacingY);
      _seat(benchX + SO, benchZ, frontFacingY);
    } else {
      _seat(benchX, benchZ - SO, frontFacingY);
      _seat(benchX, benchZ + SO, frontFacingY);
    }
  };

  for (const bx of [-P, P]) _bench(bx, -W, true,  0         ); // North
  for (const bx of [-P, P]) _bench(bx,  W, true,  Math.PI   ); // South
  for (const bz of [-P, P]) _bench(-W, bz, false,  Math.PI/2); // West
  for (const bz of [-P, P]) _bench( W, bz, false, -Math.PI/2); // East
}

export function updatePlaza(delta, time) {
  for (const b of _birds) _updateBird(b, delta, time);
  updateAllPlazaNpcs(delta);
}

// ── Bench GLB loading + placement ─────────────────────────────────────

function _loadBenches(scene) {
  const loader = new GLTFLoader();
  loader.load(BENCH_URL, gltf => {
    const tmpl = gltf.scene;
    tmpl.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

    // Scale to 1.8 m total height (full bench + backrest)
    const box = new THREE.Box3().setFromObject(tmpl);
    const h   = Math.max(box.max.y - box.min.y, 0.001);
    const sc  = 1.8 / h;
    tmpl.scale.setScalar(sc);

    // Record Y offset so base sits exactly on the floor surface
    const box2   = new THREE.Box3().setFromObject(tmpl);
    const floorY = -box2.min.y;

    const bx = box2.max.x - box2.min.x;
    const by = box2.max.y - box2.min.y;
    const bz = box2.max.z - box2.min.z;
    // Seat surface sits at ~25% of total model height (bench-with-backrest proportion)
    const seatY = FLOOR_Y + by * 0.25;
    _benchTmpl = { tmpl, floorY, seatY };
    console.log('[plaza] bench GLB ready — scale:', sc.toFixed(3), '| floorOffset:', floorY.toFixed(3));
    console.log('[plaza] bench bounding box (local, after scale): X=' + bx.toFixed(3) + 'm  Y=' + by.toFixed(3) + 'm  Z=' + bz.toFixed(3) + 'm');
    console.log('[plaza] sitting axis = Z (bench rotated ±90° when placed) → seat half-span = ' + (bz/2).toFixed(3) + 'm  | current SO=0.65');

    for (const fn of _pendingFns) fn();
    _pendingFns = [];

    addSideBenches(scene, _benchTmpl);
  }, undefined, err => {
    console.warn('[plaza] bench GLB failed, using procedural benches:', err?.message ?? err);
    addSideBenchesFallback(scene);
  });
}

function _placeBench(scene, tmpl, x, y, z, rotY) {
  const inst = tmpl.tmpl.clone(true);
  // y argument is already world Y; add floorY so the model base sits on the surface
  inst.position.set(x, y + tmpl.floorY, z);
  inst.rotation.y = rotY;
  inst.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  inst.seatY     = tmpl.seatY;
  inst.sitPoints = [
    { localX: 1.86 },
    { localX: 3.72 },
  ];
  scene.add(inst);

  // TEMP: log bench world position + bounding box to inspect seat Y
  const wb = new THREE.Box3().setFromObject(inst);
  console.log(
    '[bench] pos x/y/z:', inst.position.x.toFixed(2), inst.position.y.toFixed(2), inst.position.z.toFixed(2),
    '| bbox Y:', wb.min.y.toFixed(3), '→', wb.max.y.toFixed(3),
    '| computed seatY:', inst.seatY.toFixed(3)
  );

  return inst;
}

// ── Side benches (2 per wall, at ±31 along each edge, depth 39) ───────

function addSideBenches(scene, tmpl) {
  const WALL = 39, POS = 31;
  const benches = [
    // North wall (Z = -WALL), facing +Z toward center
    { x: -POS, z: -WALL, ry: -Math.PI / 2 },  // [0]
    { x:  POS, z: -WALL, ry: -Math.PI / 2 },  // [1] ← NPC 0 / SIT_1
    // South wall (Z = +WALL), facing -Z toward center
    { x: -POS, z:  WALL, ry:  Math.PI / 2 },  // [2]
    { x:  POS, z:  WALL, ry:  Math.PI / 2 },  // [3]
    // West wall (X = -WALL), facing +X toward center
    { x: -WALL, z: -POS, ry: 0 },              // [4] ← NPC 1 / SIT_2
    { x: -WALL, z:  POS, ry: 0 },              // [5]
    // East wall (X = +WALL), facing -X toward center
    { x:  WALL, z: -POS, ry: -Math.PI },       // [6]
    { x:  WALL, z:  POS, ry: -Math.PI },       // [7]
  ].map(({ x, z, ry }) => _placeBench(scene, tmpl, x, FLOOR_Y, z, ry));

  registerSitBenches([benches[1], benches[4]]);
}

function addSideBenchesFallback(scene) {
  const seatMat = mat(0x9A7A58, 0.82);
  const legMat  = mat(0x7A5A3A, 0.90);
  const WALL = 39, POS = 31;
  [
    { x: -POS, z: -WALL, ry: 0          },
    { x:  POS, z: -WALL, ry: 0          },
    { x: -POS, z:  WALL, ry: Math.PI    },
    { x:  POS, z:  WALL, ry: Math.PI    },
    { x: -WALL, z: -POS, ry: Math.PI/2  },
    { x: -WALL, z:  POS, ry: Math.PI/2  },
    { x:  WALL, z: -POS, ry: -Math.PI/2 },
    { x:  WALL, z:  POS, ry: -Math.PI/2 },
  ].forEach(({ x, z, ry }) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.9), seatMat);
    seat.position.set(x, FLOOR_Y + 0.47, z);
    seat.rotation.y = ry;
    seat.castShadow = seat.receiveShadow = true;
    scene.add(seat);
    const lGeo = new THREE.BoxGeometry(0.14, 0.47, 0.14);
    [-0.7, 0.7].forEach(lo => {
      const leg = new THREE.Mesh(lGeo, legMat);
      leg.position.set(x + Math.sin(ry) * lo, FLOOR_Y + 0.235, z + Math.cos(ry) * lo);
      leg.castShadow = true;
      scene.add(leg);
    });
  });
}

// ── PBR plaza floor ───────────────────────────────────────────────────

function addFloor(scene) {
  const loader = new THREE.TextureLoader();
  const pfx    = 'textures/plaza/PavingStones150_2K-JPG_';

  const colorTex  = loader.load(`${pfx}Color.jpg`);
  const normalTex = loader.load(`${pfx}NormalGL.jpg`);
  const roughTex  = loader.load(`${pfx}Roughness.jpg`);
  const aoTex     = loader.load(`${pfx}AmbientOcclusion.jpg`);

  [colorTex, normalTex, roughTex, aoTex].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.anisotropy = 8;
  });
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.BoxGeometry(PLAZA_SIZE, 1.5, PLAZA_SIZE);
  geo.setAttribute('uv1', geo.attributes.uv);

  const floor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map:            colorTex,
    normalMap:      normalTex,
    roughnessMap:   roughTex,
    aoMap:          aoTex,
    aoMapIntensity: 1.0,
  }));
  floor.position.y = FLOOR_Y - 0.4;
  floor.receiveShadow = true;
  scene.add(floor);
  registerGround(floor);

  const borderMat = new THREE.MeshStandardMaterial({ color: 0x828070, roughness: 0.88, metalness: 0.0 });
  const border = new THREE.Mesh(new THREE.BoxGeometry(PLAZA_SIZE + 4, 0.32, PLAZA_SIZE + 4), borderMat);
  border.position.y = 0.16;
  border.receiveShadow = true;
  scene.add(border);
}

// ── Central tree ──────────────────────────────────────────────────────

function addCentralTree(scene) {
  spawnTree(scene, 0, 0, 2.0, 0);
}

// ── NPC ───────────────────────────────────────────────────────────────

function addNpc(scene) {
  const npc = buildNpcCharacter(0xFFB300, 'mainStore');
  npc.position.set(6, 0.7, 6);
  npc.userData.animType = 'dance';
  scene.add(npc);

  registerInteraction([6, 2.5, 6], 'Talk', 3, () => showNpcDialog([
    'You have arrived at Suy-World, a living marketplace island where every door can lead to a new discovery.',
    'This is not a regular shop, and it is not just a game.',
    'Here, you can explore different areas, enter virtual rooms, meet brands, discover products, and build your own identity inside the world.',
    'In front of you, there are three paths: North, Central, and South.',
    'Each path leads to a different marketplace hangar, filled with doors on both sides.',
    'Behind every door, there is a room owned by a seller, creator, or brand.',
    'Inside each room, you will find products displayed on the walls, shelves, signs, and screens.',
    'Click on anything that interests you, and you will be able to see more details.',
    'Some rooms are simple. Some rooms are fully designed with colors, lights, banners, decorations, and special advertisements.',
    'The better the room looks, the more attention it may receive from visitors like you.',
    'But remember — you are not only here to look around.',
    'You can also customize your own character, choose your style, add accessories, and even bring pets with you.',
    'This world is made for exploring, discovering, and connecting.',
    'So choose your path, enter the hangar, and start your journey.',
    'Welcome to Suy-World.',
  ]));
}

// ── Birds ─────────────────────────────────────────────────────────────

function createBirds(scene) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.82 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x2E2E2E, roughness: 0.85 });
  const bellMat = new THREE.MeshStandardMaterial({ color: 0x4A3828, roughness: 0.88 });
  const rng = seededRng(31);
  const birds = [];
  for (let i = 0; i < 14; i++) {
    const group = new THREE.Group();
    const body  = new THREE.Mesh(new THREE.CapsuleGeometry(0.06,0.14,4,6), bodyMat);
    body.rotation.x = Math.PI/2; group.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.055,6,5), bellMat);
    belly.position.set(0,-0.03,0.04); belly.scale.set(0.9,0.7,0.9); group.add(belly);
    const lw = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.012,0.14), wingMat);
    lw.position.set(-0.24,0,0); lw.rotation.z=0.2; group.add(lw);
    const rw = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.012,0.14), wingMat);
    rw.position.set(0.24,0,0); rw.rotation.z=-0.2; group.add(rw);
    group.scale.setScalar(0.75+rng()*0.5);
    scene.add(group);
    birds.push({
      group,lw,rw,
      orbitR:  5+rng()*11,
      orbitH:  CENTRAL_TREE_H*0.42 + rng()*CENTRAL_TREE_H*0.40,
      speed:   (0.35+rng()*0.55)*(rng()<0.5?1:-1),
      angle:   rng()*Math.PI*2, bobAmp: 0.5+rng()*0.8, bobFreq: 1.2+rng()*0.8,
      bobPhase:rng()*Math.PI*2, flapSpeed:5+rng()*5, flapPhase:rng()*Math.PI*2,
    });
  }
  return birds;
}

function _updateBird(b, delta, time) {
  b.angle += b.speed * delta;
  b.group.position.set(
    Math.cos(b.angle) * b.orbitR,
    b.orbitH + Math.sin(time * b.bobFreq + b.bobPhase) * b.bobAmp,
    Math.sin(b.angle) * b.orbitR
  );
  b.group.rotation.y = b.angle+(b.speed>0?Math.PI/2:-Math.PI/2);
  b.group.rotation.z = b.speed>0?-0.18:0.18;
  const flap = Math.sin(time*b.flapSpeed+b.flapPhase)*0.45;
  b.lw.rotation.z =  flap+0.2;
  b.rw.rotation.z = -flap-0.2;
}

// ── Helpers ───────────────────────────────────────────────────────────

// ── Bench number labels ───────────────────────────────────────────────

function _addBenchLabels(scene) {
  const WALL = 39, POS = 31;
  const benches = [
    { n: 1, x: -POS, z: -WALL },
    { n: 2, x:  POS, z: -WALL },
    { n: 3, x: -WALL, z: -POS },
    { n: 4, x: -WALL, z:  POS },
    { n: 5, x:  WALL, z: -POS },
    { n: 6, x:  WALL, z:  POS },
    { n: 7, x: -POS, z:  WALL },
    { n: 8, x:  POS, z:  WALL },
  ];

  for (const { n, x, z } of benches) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: _makeLabelTexture(n),
      transparent: true,
      depthWrite: false,
    }));
    sprite.position.set(x, FLOOR_Y + 2.6, z);
    sprite.scale.set(1.8, 1.0, 1);
    scene.add(sprite);
  }
}

function _makeLabelTexture(n) {
  const W = 160, H = 90;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = 8;
  ctx.shadowOffsetY = 3;

  // Parchment background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#F5E6C0');
  grad.addColorStop(1, '#E8D09A');
  _rrect(ctx, 8, 6, W - 16, H - 14, 12);
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#8B5E2A';
  ctx.lineWidth = 3;
  _rrect(ctx, 8, 6, W - 16, H - 14, 12);
  ctx.stroke();

  // Inner border (decorative)
  ctx.strokeStyle = 'rgba(139,94,42,0.35)';
  ctx.lineWidth = 1;
  _rrect(ctx, 13, 11, W - 26, H - 24, 8);
  ctx.stroke();

  // Tag hole at top
  ctx.beginPath();
  ctx.arc(W / 2, 6, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#C8A870';
  ctx.fill();
  ctx.strokeStyle = '#8B5E2A';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Number
  ctx.fillStyle = '#3E1F08';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), W / 2, H / 2 - 2);

  // "Bench" label
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#7A4F1C';
  ctx.fillText('Bench', W / 2, H - 20);

  return new THREE.CanvasTexture(canvas);
}

function _rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mat(color, rough=0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
}
function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
