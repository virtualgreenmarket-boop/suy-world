import * as THREE from 'three';
import { buildNpcCharacter } from './npc.js';

const PLAZA_SIZE = 82;
const FLOOR_Y    = 0.35;

let _birds = [];

// ── Public ────────────────────────────────────────────────────────────

export function initPlaza(scene) {
  addFloor(scene);
  addCornerBenches(scene);
  addOakTree(scene);
  addEdgeBenches(scene);
  addNpc(scene);
  _birds = createBirds(scene);
}

export function updatePlaza(delta, time) {
  for (const b of _birds) _updateBird(b, delta, time);
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

  const geo = new THREE.BoxGeometry(PLAZA_SIZE, 0.7, PLAZA_SIZE);
  // aoMap reads from UV channel 1 — copy UV0 to supply it
  geo.setAttribute('uv1', geo.attributes.uv);

  const floor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map:              colorTex,
    normalMap:        normalTex,
    roughnessMap:     roughTex,
    aoMap:            aoTex,
    aoMapIntensity:   1.0,
  }));
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  const borderMat = new THREE.MeshStandardMaterial({ color: 0x828070, roughness: 0.88, metalness: 0.0 });
  const border = new THREE.Mesh(new THREE.BoxGeometry(PLAZA_SIZE + 4, 0.32, PLAZA_SIZE + 4), borderMat);
  border.position.y = 0.16;
  border.receiveShadow = true;
  scene.add(border);
}

// ── Corner benches (2 per corner, 8 total — replacing columns) ────────

function addCornerBenches(scene) {
  const seatMat = mat(0x9A7A58, 0.82);
  const legMat  = mat(0x7A5A3A, 0.90);
  const stoneMat = mat(0x8A8270, 0.90);

  const corners = [[-36, -36], [-36, 36], [36, -36], [36, 36]];

  corners.forEach(([cx, cz]) => {
    // Small stone pillar at corner
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), stoneMat);
    pillar.position.set(cx, 1.30, cz);
    pillar.castShadow = pillar.receiveShadow = true;
    scene.add(pillar);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 1.8), mat(0xC0B8A0, 0.80));
    cap.position.set(cx, 2.01, cz);
    scene.add(cap);

    // Two benches flanking the corner pillar — one on each perpendicular side
    [
      { ox: Math.sign(cx) * -5.5, oz: 0,  ry: Math.sign(cx) * Math.PI / 2 },
      { ox: 0, oz: Math.sign(cz) * -5.5,  ry: 0 },
    ].forEach(({ ox, oz, ry }) => {
      // Seat plank
      const seat = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.22, 1.0), seatMat);
      seat.position.set(cx + ox, 0.82, cz + oz);
      seat.rotation.y = ry;
      seat.castShadow = seat.receiveShadow = true;
      scene.add(seat);

      // Legs
      const lGeo = new THREE.BoxGeometry(0.18, 0.82, 0.18);
      [-2.6, 2.6].forEach(lo => {
        const leg = new THREE.Mesh(lGeo, legMat);
        const lx  = ry === 0 ? lo : 0;
        const lz  = ry === 0 ? 0  : lo;
        leg.position.set(cx + ox + lx, 0.41, cz + oz + lz);
        leg.castShadow = true;
        scene.add(leg);
      });
    });
  });
}

// ── Ancient oak tree ──────────────────────────────────────────────────

const OAK_X = 0, OAK_Z = 0;
const TREE_HEIGHT = 26;

function addOakTree(scene) {
  const barkMat  = new THREE.MeshStandardMaterial({ color: 0x3D2B1A, roughness: 0.97 });
  const bark2Mat = new THREE.MeshStandardMaterial({ color: 0x4E3520, roughness: 0.95 });
  const rootMat  = new THREE.MeshStandardMaterial({ color: 0x352515, roughness: 0.98 });
  const leafCols = [0x1B4A10, 0x1E5C14, 0x255E18, 0x2D6B1A, 0x1A4210, 0x173D0E];

  // Buttress roots
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const root = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 1.4), rootMat);
    root.position.set(Math.cos(a) * 1.4, 0.8, Math.sin(a) * 1.4);
    root.rotation.y = -a;
    root.rotation.z = Math.sign(Math.cos(a)) * 0.28;
    root.castShadow = true;
    scene.add(root);
  }

  // Multi-section trunk
  [
    {y:2,h:4,rb:1.80,rt:1.50},{y:6,h:4,rb:1.50,rt:1.20},
    {y:10,h:4,rb:1.20,rt:0.90},{y:14,h:4,rb:0.90,rt:0.70},
  ].forEach(({y,h,rb,rt},i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), i%2===0?barkMat:bark2Mat);
    m.position.set(OAK_X, y, OAK_Z); m.castShadow = true; scene.add(m);
  });

  // Branches
  [
    [8,14,0,5,20,0,.5],[- 8,14,0,-5,20,0,.5],[0,12,8,0,19,5,.45],[0,12,-8,0,19,-5,.45],
    [6,10,6,4,16,4,.38],[-6,10,-6,-4,16,-4,.38],[10,17,5,7,22,3,.32],[-9,17,-4,-6,22,-2,.32],
  ].forEach(([ax,ay,az,bx,by,bz,r],i) => {
    const start = new THREE.Vector3(OAK_X+ax,ay,OAK_Z+az);
    const end   = new THREE.Vector3(OAK_X+bx,by,OAK_Z+bz);
    const dir   = end.clone().sub(start); const len = dir.length();
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(r*0.7,r,len,8), i%2===0?barkMat:bark2Mat);
    branch.position.copy(start.clone().add(end).multiplyScalar(0.5));
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
    branch.castShadow = true; scene.add(branch);
  });

  // Foliage clusters
  [
    [0,22,0,4.0],[6,19,3,3.2],[-7,19,-2,3.0],[3,18,-7,2.8],[-4,20,5,2.8],
    [9,16,2,2.4],[-8,16,-5,2.4],[0,15,9,2.2],[5,23,-4,2.0],[-5,22,3,2.0],
    [2,25,1,1.8],[-2,24,-1,1.6],[10,13,8,1.6],[-10,13,-7,1.6],[0,12,-10,1.5],[8,12,-8,1.4],
  ].forEach(([fx,fy,fz,radius],i) => {
    const lm = new THREE.MeshStandardMaterial({ color: leafCols[i%leafCols.length], roughness: 0.90 });
    const s  = new THREE.Mesh(new THREE.SphereGeometry(radius,8,7), lm);
    s.position.set(OAK_X+fx,fy,OAK_Z+fz);
    s.castShadow = s.receiveShadow = true; scene.add(s);
    if (radius > 2.0) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(radius*0.68,7,6),
        new THREE.MeshStandardMaterial({color:leafCols[(i+1)%leafCols.length],roughness:0.92}));
      lobe.position.set(OAK_X+fx+1.2, fy-0.8, OAK_Z+fz+0.8);
      lobe.castShadow = true; scene.add(lobe);
    }
  });

  // Circular bench ring around base
  const bm = mat(0x7A6248, 0.88);
  for (let i = 0; i < 4; i++) {
    const a = (i/4)*Math.PI*2+Math.PI/8;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 0.9), bm);
    bench.position.set(OAK_X+Math.cos(a)*3.8, 0.81, OAK_Z+Math.sin(a)*3.8);
    bench.rotation.y = -a;
    bench.castShadow = bench.receiveShadow = true; scene.add(bench);
  }
}

// ── Edge benches ──────────────────────────────────────────────────────

function addEdgeBenches(scene) {
  const seatMat = mat(0x7A6248, 0.88);
  const legMat  = mat(0x5C4A38, 0.90);
  const sides = [
    {x:0,z:-38,ry:0},{x:0,z:38,ry:Math.PI},{x:-38,z:0,ry:Math.PI/2},{x:38,z:0,ry:-Math.PI/2},
  ];
  sides.forEach(({x,z,ry}) => {
    for (let i = -1; i <= 1; i++) {
      const ox = ry===0||ry===Math.PI?i*9:0, oz = Math.abs(ry)===Math.PI/2?i*9:0;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(7.2,0.24,1.1), seatMat);
      seat.position.set(x+ox,0.82,z+oz); seat.rotation.y=ry;
      seat.castShadow=seat.receiveShadow=true; scene.add(seat);
      const lGeo=new THREE.BoxGeometry(0.2,0.82,0.2);
      (ry===0||ry===Math.PI?[[-2.8,0],[2.8,0]]:[[0,-2.8],[0,2.8]]).forEach(([lox,loz])=>{
        const leg=new THREE.Mesh(lGeo,legMat);
        leg.position.set(x+ox+lox,0.41,z+oz+loz); leg.castShadow=true; scene.add(leg);
      });
    }
  });
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
      orbitR:  5+rng()*11, orbitH: TREE_HEIGHT*0.42+rng()*TREE_HEIGHT*0.40,
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
    OAK_X+Math.cos(b.angle)*b.orbitR,
    b.orbitH+Math.sin(time*b.bobFreq+b.bobPhase)*b.bobAmp,
    OAK_Z+Math.sin(b.angle)*b.orbitR
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
