import * as THREE from 'three';
import { spawnTree } from './trees.js';

let _waterMesh = null;
let _waterTime = 0;

// ── Public ────────────────────────────────────────────────────────────

export function initIsland(scene) {
  addGround(scene);
  addBeach(scene);
  addWater(scene);
  addTrees(scene);
}

export function updateWater(delta) {
  _waterTime += delta;
  if (_waterMesh) _waterMesh.material.uniforms.uTime.value = _waterTime;
}

// ── Ground (grass) ────────────────────────────────────────────────────

function makeGrassTexture() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const rng = seededRng(99);

  ctx.fillStyle = '#4a7c3e';
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 120; i++) {
    const x = rng() * S, y = rng() * S;
    const rx = 5 + rng() * 18, ry = 3 + rng() * 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng() * Math.PI);
    ctx.fillStyle = `rgba(25,70,15,${0.08 + rng() * 0.14})`;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < 60; i++) {
    const x = rng() * S, y = rng() * S;
    ctx.fillStyle = `rgba(100,180,50,${0.06 + rng() * 0.08})`;
    ctx.beginPath(); ctx.ellipse(x, y, 3 + rng() * 10, 2 + rng() * 6, rng() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }

  for (let i = 0; i < 700; i++) {
    const x = rng() * S, y = rng() * S, h = 4 + rng() * 9;
    const b = 0.65 + rng() * 0.55;
    ctx.strokeStyle = `rgba(${Math.floor(48 * b)},${Math.floor(148 * b)},${Math.floor(32 * b)},0.55)`;
    ctx.lineWidth = 0.8 + rng() * 1.0;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 3, y - h); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addGround(scene) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(238, 250, 3, 88),
    new THREE.MeshStandardMaterial({
      map: makeGrassTexture(), color: 0x5DA44A, roughness: 0.92, metalness: 0.0,
    })
  );
  mesh.position.y = -1.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// ── Beach ring ────────────────────────────────────────────────────────

function makeBeachTexture() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const rng = seededRng(77);

  // Sandy base with gradient (wetter near water = darker)
  const grad = ctx.createRadialGradient(S * 0.5, S * 0.5, 0, S * 0.5, S * 0.5, S * 0.5);
  grad.addColorStop(0.0, '#DEC87A');
  grad.addColorStop(0.6, '#E8D090');
  grad.addColorStop(1.0, '#C8B068');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Sand ripple patterns (from wave action)
  for (let i = 0; i < 8; i++) {
    const y = rng() * S;
    const cx = ctx.createLinearGradient(0, y - 3, 0, y + 3);
    cx.addColorStop(0, 'rgba(160,130,60,0)');
    cx.addColorStop(0.5, 'rgba(160,130,60,0.18)');
    cx.addColorStop(1, 'rgba(160,130,60,0)');
    ctx.fillStyle = cx;
    ctx.fillRect(0, y - 3, S, 6);
  }

  // Pebble and shell specks
  for (let i = 0; i < 200; i++) {
    const x = rng() * S, y = rng() * S, r = 0.8 + rng() * 2.5;
    const v = 180 + Math.floor(rng() * 50);
    ctx.fillStyle = `rgba(${v},${v - 20},${v - 40},0.55)`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }

  // Wet sand band at inner edge (slightly darker)
  const innerGrad = ctx.createLinearGradient(0, 0, S * 0.3, 0);
  innerGrad.addColorStop(0, 'rgba(120,100,50,0.35)');
  innerGrad.addColorStop(1, 'rgba(120,100,50,0)');
  ctx.fillStyle = innerGrad;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addBeach(scene) {
  // Flat sandy ring on top of the grass — inner radius 220, outer 238
  const beachRing = new THREE.Mesh(
    new THREE.RingGeometry(220, 238, 88),
    new THREE.MeshStandardMaterial({
      map:       makeBeachTexture(),
      roughness: 0.96,
      metalness: 0.0,
    })
  );
  beachRing.rotation.x = -Math.PI / 2;
  beachRing.position.y = 0.02; // just above grass to avoid z-fighting
  beachRing.receiveShadow = true;
  scene.add(beachRing);

  // Sloped sand skirt below the beach going down to water level
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(238, 252, 2.2, 88),
    new THREE.MeshStandardMaterial({ color: 0xD4B86A, roughness: 0.97, metalness: 0.0 })
  );
  skirt.position.y = -2.2;
  skirt.receiveShadow = true;
  scene.add(skirt);

  // Wet sand surf line
  const wet = new THREE.Mesh(
    new THREE.CylinderGeometry(252, 258, 0.6, 88),
    new THREE.MeshStandardMaterial({ color: 0xB8A060, roughness: 0.99, metalness: 0.0 })
  );
  wet.position.y = -3.1;
  scene.add(wet);
}

// ── Water (advanced shader) ───────────────────────────────────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2  vWorld;
  varying float vWave;
  varying float vDepth;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  void main() {
    vec3 pos = position;
    vWorld    = (modelMatrix * vec4(pos, 1.0)).xz;
    float dist = length(vWorld);

    // Waves die off in the shallows (< 260 from center)
    float shoreBlend = smoothstep(240.0, 265.0, dist);

    float w1 = sin(pos.x * 0.038 + uTime * 1.05) * 0.60 * shoreBlend;
    float w2 = cos(pos.z * 0.031 + uTime * 0.80) * 0.50 * shoreBlend;
    float w3 = sin((pos.x + pos.z) * 0.022 + uTime * 1.35) * 0.32 * shoreBlend;
    float w4 = cos((pos.x - pos.z) * 0.015 + uTime * 0.58) * 0.22 * shoreBlend;
    float h   = w1 + w2 + w3 + w4;
    pos.y    += h;
    vWave     = h;
    vDepth    = smoothstep(240.0, 278.0, dist);

    float eps = 1.5;
    float hx  = sin((position.x + eps) * 0.038 + uTime * 1.05) * 0.60 * shoreBlend
              + sin(((position.x + eps) + position.z) * 0.022 + uTime * 1.35) * 0.32 * shoreBlend;
    float hz  = cos((position.z + eps) * 0.031 + uTime * 0.80) * 0.50 * shoreBlend
              + sin((position.x + (position.z + eps)) * 0.022 + uTime * 1.35) * 0.32 * shoreBlend;
    vNormal   = normalize(vec3(h - hx, eps * 0.72, h - hz));

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vViewDir  = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const WATER_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uSand;
  uniform vec3  uShallow;
  uniform vec3  uMid;
  uniform vec3  uDeep;
  uniform vec3  uFoam;

  varying vec2  vWorld;
  varying float vWave;
  varying float vDepth;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  // Pseudo-random for noise patterns
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }

  void main() {
    float dist     = length(vWorld);

    // ── Depth-based base colour ──
    float t1  = smoothstep(238.0, 252.0, dist); // sand→shallow transition
    float t2  = smoothstep(252.0, 272.0, dist); // shallow→mid
    vec3  col = mix(uSand, uShallow, t1);
    col  = mix(col, uMid, t2);
    col  = mix(col, uDeep, vDepth);

    // ── Underwater kelp/vegetation (shallow zone) ──
    float shallowMask = (1.0 - smoothstep(238.0, 262.0, dist));
    float kelpA = noise(vWorld * vec2(0.22, 0.18) + vec2(uTime * 0.12, 0.0));
    float kelpB = noise(vWorld * vec2(0.15, 0.25) + vec2(0.0, uTime * -0.10));
    float kelp  = smoothstep(0.55, 0.78, kelpA * kelpB * 2.5) * shallowMask * 0.14;
    col = mix(col, vec3(0.10, 0.35, 0.16), kelp);

    // ── Caustics (animated refraction pattern, shallow only) ──
    float c1 = sin(vWorld.x * 1.4 + uTime * 2.1) * cos(vWorld.y * 1.2 + uTime * 1.6);
    float c2 = sin(vWorld.x * 0.9 - uTime * 1.4) * cos(vWorld.y * 1.0 - uTime * 0.9);
    float cau = smoothstep(0.25, 0.65, c1 * c2 + 0.5) * shallowMask * 0.14;
    col += vec3(0.80, 0.92, 0.72) * cau;

    // ── Fresnel (sky reflection) ──
    float ndv   = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    float fres  = pow(1.0 - ndv, 3.8);
    col = mix(col, vec3(0.72, 0.88, 1.0), fres * 0.28);

    // ── Wave crest foam (open-ocean only) ──
    float crest = smoothstep(0.45, 0.90, vWave) * vDepth;
    col = mix(col, uFoam, crest * 0.32);

    // ── Shore foam — animated wash at the beach edge ──
    float shoreDist  = 1.0 - smoothstep(238.0, 256.0, dist);
    float foamRipple = sin(dist * 0.75 - uTime * 2.8) * 0.5 + 0.5;
    float foamNoise  = noise(vWorld * 0.14 + vec2(uTime * 0.4, -uTime * 0.3));
    float foam       = shoreDist * foamRipple * smoothstep(0.35, 0.65, foamNoise);
    col  = mix(col, uFoam, foam * 0.72);

    // ── Depth-based transparency ──
    float alpha = mix(0.50, 0.94, vDepth);
    // Extra transparency right at the waterline
    alpha = mix(alpha * 0.35, alpha, smoothstep(238.0, 244.0, dist));

    gl_FragColor = vec4(col, alpha);
  }
`;

function addWater(scene) {
  const geo = new THREE.PlaneGeometry(2000, 2000, 56, 56);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0 },
      uSand:    { value: new THREE.Color(0xB0C890) }, // sandy-green seabed tint
      uShallow: { value: new THREE.Color(0x28A898) }, // turquoise
      uMid:     { value: new THREE.Color(0x0070A0) }, // teal-blue
      uDeep:    { value: new THREE.Color(0x00405A) }, // deep ocean
      uFoam:    { value: new THREE.Color(0xE8F6FF) }, // white foam
    },
    vertexShader:   WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite:  false,
    side: THREE.FrontSide,
  });

  _waterMesh = new THREE.Mesh(geo, mat);
  _waterMesh.rotation.x = -Math.PI / 2;
  _waterMesh.position.y = -3.2;
  scene.add(_waterMesh);
}

// ── Trees (HighPoly FBX) ──────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function addTrees(scene) {
  const avoid = [
    { x:   0, z: -130, r: 60 },
    { x: 130, z:    0, r: 60 },
    { x:   0, z:  130, r: 60 },
    { x:-150, z:    0, r: 82 },
    { x:   0, z:    0, r: 52 },  // plaza centre
    { x:   0, z:    0, r: 218 }, // inside beach ring only
  ];

  const rng = seededRng(17);

  for (let i = 0; i < 62; i++) {
    let x, z, tries = 0;
    do {
      const a = rng() * Math.PI * 2, r = 72 + rng() * 142;
      x = Math.cos(a) * r; z = Math.sin(a) * r; tries++;
    } while (tries < 50 && avoid.some(av => Math.hypot(av.x - x, av.z - z) < av.r));

    const scale = 0.65 + rng() * 0.60;   // 9.75 – 18.75 m tall
    const rotY  = rng() * Math.PI * 2;
    spawnTree(scene, x, z, scale, rotY);
  }
}
