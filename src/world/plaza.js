import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildNpcCharacter } from './npc.js';
import { spawnTree } from './trees.js';
import { spawnAllPlazaNpcs, updateAllPlazaNpcs } from './npcGlb.js';
import { registerGround } from '../systems/terrain.js';
import { registerInteraction, setActiveInteractionLabel } from '../ui/interactionUI.js';
import { sitOnBench, standUp, isPlayerSitting, getLocalPlayerPosition } from '../player/localPlayer.js';

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

  registerInteraction([6, 0.7, 6], 'Talk', 4.5, () => {
    console.log('[plaza] Shop NPC says: Check out the hangars!');
  });

  // Two anchors per bench (front + back, 1 m offset) so E shows from both sides.
  // updateInteractions always picks the single closest anchor, so only one E shows.
  const W = 39, P = 31, SO = 0.5, RANGE = 3, SIDE = 1;

  const _bench = (benchX, benchZ, alongX, facingY, offX, offZ) => {
    const cb = () => {
      if (isPlayerSitting()) {
        standUp();
        setActiveInteractionLabel('Sit');
        return;
      }
      const pp = getLocalPlayerPosition();
      let sx, sz;
      if (alongX) {
        sx = Math.abs((benchX - SO) - pp.x) < Math.abs((benchX + SO) - pp.x)
          ? benchX - SO : benchX + SO;
        sz = benchZ;
      } else {
        sx = benchX;
        sz = Math.abs((benchZ - SO) - pp.z) < Math.abs((benchZ + SO) - pp.z)
          ? benchZ - SO : benchZ + SO;
      }
      sitOnBench(sx, FLOOR_Y, sz, facingY);
      setActiveInteractionLabel('Stand Up');
    };
    // front anchor (toward centre) + back anchor (toward wall)
    registerInteraction([benchX + offX, FLOOR_Y, benchZ + offZ], 'Sit', RANGE, cb);
    registerInteraction([benchX - offX, FLOOR_Y, benchZ - offZ], 'Sit', RANGE, cb);
  };

  for (const bx of [-P, P]) _bench(bx, -W, true,  Math.PI,     0,    SIDE); // North
  for (const bx of [-P, P]) _bench(bx,  W, true,  0,           0,   -SIDE); // South
  for (const bz of [-P, P]) _bench(-W, bz, false, -Math.PI/2,  SIDE, 0);    // West
  for (const bz of [-P, P]) _bench( W, bz, false,  Math.PI/2, -SIDE, 0);    // East
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

    _benchTmpl = { tmpl, floorY };
    console.log('[plaza] bench GLB ready — scale:', sc.toFixed(3), '| floorOffset:', floorY.toFixed(3));

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
  scene.add(inst);
}

// ── Side benches (2 per wall, at ±31 along each edge, depth 39) ───────

function addSideBenches(scene, tmpl) {
  const WALL = 39, POS = 31;
  [
    // North wall (Z = -WALL), facing +Z toward center
    { x: -POS, z: -WALL, ry: -Math.PI / 2 },
    { x:  POS, z: -WALL, ry: -Math.PI / 2 },
    // South wall (Z = +WALL), facing -Z toward center
    { x: -POS, z:  WALL, ry:  Math.PI / 2 },
    { x:  POS, z:  WALL, ry:  Math.PI / 2 },
    // West wall (X = -WALL), facing +X toward center
    { x: -WALL, z: -POS, ry: 0 },
    { x: -WALL, z:  POS, ry: 0 },
    // East wall (X = +WALL), facing -X toward center
    { x:  WALL, z: -POS, ry: -Math.PI },
    { x:  WALL, z:  POS, ry: -Math.PI },
  ].forEach(({ x, z, ry }) => _placeBench(scene, tmpl, x, FLOOR_Y, z, ry));
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
  scene.add(npc);

  registerInteraction([6, 2.5, 6], 'Talk', 3, null, () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance('Hello, how can I help you?');
    utt.rate  = 0.92;
    utt.pitch = 1.1;
    window.speechSynthesis.speak(utt);
  });
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

function mat(color, rough=0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
}
function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
