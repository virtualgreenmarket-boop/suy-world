import * as THREE from 'three';

let _waterMesh = null;
let _waterTime = 0;

// ── Public ────────────────────────────────────────────────────────────

export function initIsland(scene) {
  addGround(scene);
  addWater(scene);
  addBeachRing(scene);
  addPalmTrees(scene);
}

export function updateWater(delta) {
  _waterTime += delta;
  if (_waterMesh) _waterMesh.material.uniforms.uTime.value = _waterTime;
}

// ── Ground ────────────────────────────────────────────────────────────

function makeGrassTexture() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Base
  ctx.fillStyle = '#4a7c3e';
  ctx.fillRect(0, 0, S, S);

  // Dark variation patches
  const rng = seededRng(99);
  for (let i = 0; i < 120; i++) {
    const x = rng() * S, y = rng() * S;
    const rx = 5 + rng() * 18, ry = 3 + rng() * 10;
    const a  = rng() * Math.PI;
    const d  = 0.08 + rng() * 0.14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = `rgba(25,70,15,${d})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Bright highlights
  for (let i = 0; i < 60; i++) {
    const x = rng() * S, y = rng() * S;
    const rx = 3 + rng() * 10, ry = 2 + rng() * 6;
    ctx.fillStyle = `rgba(100,180,50,${0.06 + rng() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grass blade strokes
  for (let i = 0; i < 600; i++) {
    const x = rng() * S, y = rng() * S;
    const h = 4 + rng() * 9;
    const b = 0.65 + rng() * 0.55;
    const r = Math.floor(48 * b), g = Math.floor(148 * b), bv = Math.floor(32 * b);
    ctx.strokeStyle = `rgba(${r},${g},${bv},0.55)`;
    ctx.lineWidth   = 0.8 + rng() * 1.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 3, y - h);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS   = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(55, 55);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addGround(scene) {
  const grassTex = makeGrassTexture();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(238, 248, 3, 80),
    new THREE.MeshStandardMaterial({
      map:       grassTex,
      color:     0x5DA44A,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  mesh.position.y = -1.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addBeachRing(scene) {
  const beach = new THREE.Mesh(
    new THREE.CylinderGeometry(246, 253, 1.5, 80),
    new THREE.MeshStandardMaterial({ color: 0xE8D09A, roughness: 0.95, metalness: 0.0 })
  );
  beach.position.y = -2.6;
  beach.receiveShadow = true;
  scene.add(beach);

  // Wet sand band at waterline
  const wet = new THREE.Mesh(
    new THREE.CylinderGeometry(250, 256, 0.6, 80),
    new THREE.MeshStandardMaterial({ color: 0xC8B07A, roughness: 0.98, metalness: 0.02 })
  );
  wet.position.y = -3.1;
  scene.add(wet);
}

// ── Water ─────────────────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying float vWave;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  void main() {
    vec3 pos = position;

    float w1 = sin(pos.x * 0.038 + uTime * 1.0) * 0.55;
    float w2 = cos(pos.z * 0.031 + uTime * 0.78) * 0.48;
    float w3 = sin((pos.x + pos.z) * 0.022 + uTime * 1.3) * 0.30;
    float w4 = cos((pos.x - pos.z) * 0.014 + uTime * 0.55) * 0.20;
    float h  = w1 + w2 + w3 + w4;
    pos.y   += h;
    vWave    = h;

    float eps  = 1.0;
    float hx   = sin((position.x + eps) * 0.038 + uTime * 1.0) * 0.55
               + sin(((position.x + eps) + position.z) * 0.022 + uTime * 1.3) * 0.30;
    float hz   = cos((position.z + eps) * 0.031 + uTime * 0.78) * 0.48
               + sin((position.x + (position.z + eps)) * 0.022 + uTime * 1.3) * 0.30;
    vNormal = normalize(vec3(h - hx, eps * 0.8, h - hz));

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vViewDir  = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const WATER_FRAG = /* glsl */`
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uFoam;
  varying float vWave;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  void main() {
    float t       = clamp(vWave * 0.45 + 0.5, 0.0, 1.0);
    vec3  color   = mix(uDeep, uMid, t);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 3.0);
    float crest   = smoothstep(0.55, 0.9, vWave);
    color = mix(color, uFoam, fresnel * 0.18 + crest * 0.22);
    gl_FragColor  = vec4(color, 0.90);
  }
`;

function addWater(scene) {
  const geo = new THREE.PlaneGeometry(1800, 1800, 40, 40);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x005577) },
      uMid:  { value: new THREE.Color(0x0080AA) },
      uFoam: { value: new THREE.Color(0xAAE8FF) },
    },
    vertexShader:   WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite:  false,
    side: THREE.FrontSide,
  });

  _waterMesh = new THREE.Mesh(geo, mat);
  _waterMesh.rotation.x = -Math.PI / 2;
  _waterMesh.position.y = -3.0;
  scene.add(_waterMesh);
}

// ── Palm trees ────────────────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function addPalmTrees(scene) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.92, metalness: 0.0 });
  const leafMat  = new THREE.MeshStandardMaterial({ color: 0x388E3C, roughness: 0.92, metalness: 0.0 });

  const avoid = [
    { x: 0,    z: -130, r: 60 }, { x: 130,  z: 0,   r: 60 },
    { x: 0,    z:  130, r: 60 }, { x: -150, z: 0,   r: 82 },
    { x: 0,    z:   0,  r: 52 },
  ];

  const rng = seededRng(17);

  for (let i = 0; i < 58; i++) {
    let x, z, tries = 0;
    do {
      const a = rng() * Math.PI * 2;
      const r = 72 + rng() * 155;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      tries++;
    } while (tries < 50 && avoid.some(a => Math.hypot(a.x - x, a.z - z) < a.r));

    const scale  = 0.75 + rng() * 0.6;
    const height = 9 + rng() * 5;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.30, height, 7), trunkMat);
    trunk.castShadow = true;

    const leafGroup = new THREE.Group();
    const leafCount = 5 + Math.floor(rng() * 4);
    for (let l = 0; l < leafCount; l++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.8, 5), leafMat);
      leaf.rotation.z = Math.PI * 0.40;
      leaf.rotation.y = (l / leafCount) * Math.PI * 2;
      leaf.position.y = 0.5;
      leaf.castShadow = true;
      leafGroup.add(leaf);
    }
    leafGroup.position.y = height * 0.5 + 0.8;

    const tree = new THREE.Group();
    tree.add(trunk, leafGroup);
    tree.position.set(x, 0, z);
    tree.rotation.y = rng() * Math.PI * 2;
    tree.scale.setScalar(scale);
    scene.add(tree);
  }
}
