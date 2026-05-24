import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildNpcCharacter } from './npc.js';
import { spawnTree } from './trees.js';
import { spawnAllPlazaNpcs, updateAllPlazaNpcs } from './npcGlb.js';
import { registerGround } from '../systems/terrain.js';
import { registerInteraction } from '../ui/interactionUI.js';

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

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    registerInteraction(
      [Math.cos(a) * 3.8, 0.81, Math.sin(a) * 3.8],
      'Sit', 3, () => { console.log('[plaza] Sitting on bench…'); }
    );
  }
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

    const box = new THREE.Box3().setFromObject(tmpl);
    const h   = Math.max(box.max.y - box.min.y, 0.001);
    // Normalize to 0.52m seat height
    const sc  = 0.52 / h;
    tmpl.scale.setScalar(sc);

    // After scaling, the bounding box bottom might not be at y=0; record floor offset
    const box2 = new THREE.Box3().setFromObject(tmpl);
    const floorY = -box2.min.y;

    _benchTmpl = { tmpl, floorY };
    console.log('[plaza] bench GLB ready — scale:', sc.toFixed(3));

    // Flush any placements that were queued before template was ready
    for (const fn of _pendingFns) fn();
    _pendingFns = [];

    addCornerBenches(scene, _benchTmpl);
    addEdgeBenches(scene, _benchTmpl);
    addCentralBenches(scene, _benchTmpl);
  }, undefined, err => {
    console.warn('[plaza] bench GLB failed, using procedural benches:', err?.message ?? err);
    addCornerBenchesFallback(scene);
    addEdgeBenchesFallback(scene);
    addCentralBenchesFallback(scene);
  });
}

function _placeBench(scene, tmpl, x, y, z, rotY) {
  const inst = tmpl.tmpl.clone(true);
  inst.position.set(x, y + tmpl.floorY, z);
  inst.rotation.y = rotY;
  scene.add(inst);
}

// ── Corner benches ────────────────────────────────────────────────────

function addCornerBenches(scene, tmpl) {
  const stoneMat = mat(0x8A8270, 0.90);
  const corners = [[-36, -36], [-36, 36], [36, -36], [36, 36]];

  corners.forEach(([cx, cz]) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), stoneMat);
    pillar.position.set(cx, 1.30, cz);
    pillar.castShadow = pillar.receiveShadow = true;
    scene.add(pillar);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 1.8), mat(0xC0B8A0, 0.80));
    cap.position.set(cx, 2.01, cz);
    scene.add(cap);

    [
      { ox: Math.sign(cx) * -5.5, oz: 0,                     ry: Math.sign(cx) * Math.PI / 2 },
      { ox: 0,                    oz: Math.sign(cz) * -5.5,  ry: 0                            },
    ].forEach(({ ox, oz, ry }) => {
      _placeBench(scene, tmpl, cx + ox, 0, cz + oz, ry);
    });
  });
}

function addCornerBenchesFallback(scene) {
  const seatMat  = mat(0x9A7A58, 0.82);
  const legMat   = mat(0x7A5A3A, 0.90);
  const stoneMat = mat(0x8A8270, 0.90);
  const corners = [[-36, -36], [-36, 36], [36, -36], [36, 36]];

  corners.forEach(([cx, cz]) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), stoneMat);
    pillar.position.set(cx, 1.30, cz);
    pillar.castShadow = pillar.receiveShadow = true;
    scene.add(pillar);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 1.8), mat(0xC0B8A0, 0.80));
    cap.position.set(cx, 2.01, cz);
    scene.add(cap);

    [
      { ox: Math.sign(cx) * -5.5, oz: 0,  ry: Math.sign(cx) * Math.PI / 2 },
      { ox: 0, oz: Math.sign(cz) * -5.5,  ry: 0 },
    ].forEach(({ ox, oz, ry }) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.22, 1.0), seatMat);
      seat.position.set(cx + ox, 0.82, cz + oz); seat.rotation.y = ry;
      seat.castShadow = seat.receiveShadow = true; scene.add(seat);
      const lGeo = new THREE.BoxGeometry(0.18, 0.82, 0.18);
      [-2.6, 2.6].forEach(lo => {
        const leg = new THREE.Mesh(lGeo, legMat);
        const lx  = ry === 0 ? lo : 0, lz = ry === 0 ? 0 : lo;
        leg.position.set(cx + ox + lx, 0.41, cz + oz + lz);
        leg.castShadow = true; scene.add(leg);
      });
    });
  });
}

// ── Central tree ring benches ─────────────────────────────────────────

function addCentralBenches(scene, tmpl) {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    _placeBench(scene, tmpl, Math.cos(a) * 3.8, 0, Math.sin(a) * 3.8, -a);
  }
}

function addCentralBenchesFallback(scene) {
  const bm = mat(0x7A6248, 0.88);
  for (let i = 0; i < 4; i++) {
    const a     = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 0.9), bm);
    bench.position.set(Math.cos(a) * 3.8, 0.81, Math.sin(a) * 3.8);
    bench.rotation.y = -a;
    bench.castShadow = bench.receiveShadow = true;
    scene.add(bench);
  }
}

// ── Edge benches ──────────────────────────────────────────────────────

function addEdgeBenches(scene, tmpl) {
  const sides = [
    { x:0,  z:-38, ry: 0          },
    { x:0,  z: 38, ry: Math.PI    },
    { x:-38,z:0,   ry: Math.PI/2  },
    { x: 38,z:0,   ry:-Math.PI/2  },
  ];
  sides.forEach(({ x, z, ry }) => {
    for (let i = -1; i <= 1; i++) {
      const ox = (ry === 0 || ry === Math.PI) ? i * 9 : 0;
      const oz = (Math.abs(ry) === Math.PI / 2) ? i * 9 : 0;
      _placeBench(scene, tmpl, x + ox, 0, z + oz, ry);
    }
  });
}

function addEdgeBenchesFallback(scene) {
  const seatMat = mat(0x7A6248, 0.88);
  const legMat  = mat(0x5C4A38, 0.90);
  const sides = [
    { x:0, z:-38, ry:0 }, { x:0, z:38, ry:Math.PI },
    { x:-38, z:0, ry:Math.PI/2 }, { x:38, z:0, ry:-Math.PI/2 },
  ];
  sides.forEach(({ x, z, ry }) => {
    for (let i = -1; i <= 1; i++) {
      const ox = ry===0||ry===Math.PI ? i*9 : 0, oz = Math.abs(ry)===Math.PI/2 ? i*9 : 0;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.24, 1.1), seatMat);
      seat.position.set(x+ox, 0.82, z+oz); seat.rotation.y=ry;
      seat.castShadow=seat.receiveShadow=true; scene.add(seat);
      const lGeo=new THREE.BoxGeometry(0.2,0.82,0.2);
      (ry===0||ry===Math.PI?[[-2.8,0],[2.8,0]]:[[0,-2.8],[0,2.8]]).forEach(([lox,loz])=>{
        const leg=new THREE.Mesh(lGeo,legMat);
        leg.position.set(x+ox+lox,0.41,z+oz+loz); leg.castShadow=true; scene.add(leg);
      });
    }
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
