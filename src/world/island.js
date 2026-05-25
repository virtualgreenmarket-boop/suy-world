import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { spawnTree } from './trees.js';
import { registerGround } from '../systems/terrain.js';

let _waterMesh   = null;
let _waterTime   = 0;
let _oceanMixer  = null;

// ── Public ────────────────────────────────────────────────────────────

export function initIsland(scene, opts = {}) {
  addSky(scene);
  addGround(scene);
  addBeach(scene);
  addWater(scene);
  addTrees(scene, opts.maxTrees ?? 62);
  if (!opts.lowQuality) _loadOceanGlb(scene);
}

export function updateWater(delta) {
  _waterTime += delta;
  if (_waterMesh) _waterMesh.material.uniforms.uTime.value = _waterTime;
  if (_oceanMixer) _oceanMixer.update(delta);
}

// ── Sky sphere ───────────────────────────────────────────────────────

function addSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(850, 16, 8),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthTest:  false,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying float vY;
        void main() {
          vY = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying float vY;
        void main() {
          float t = pow(max(vY, 0.0), 0.52);
          vec3 zenith  = vec3(0.18, 0.44, 0.88);
          vec3 horizon = vec3(0.68, 0.86, 0.98);
          vec3 col = mix(horizon, zenith, t);
          float glow = max(0.0, 1.0 - vY * 5.5);
          col = mix(col, vec3(1.0, 0.88, 0.68), glow * 0.22);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  sky.renderOrder = -1;
  scene.add(sky);
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
    new THREE.CylinderGeometry(238, 250, 3, 36),
    new THREE.MeshStandardMaterial({
      map: makeGrassTexture(), color: 0x5DA44A, roughness: 0.92, metalness: 0.0,
    })
  );
  mesh.position.y = -1.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
  registerGround(mesh);
}

// ── Beach ring (PBR sand texture) ────────────────────────────────────

function addBeach(scene) {
  const loader = new THREE.TextureLoader();
  const pfx    = 'textures/beach/Ground054_2K-JPG_';

  const colorTex  = loader.load(pfx + 'Color.jpg');
  const normalTex = loader.load(pfx + 'NormalGL.jpg');
  const roughTex  = loader.load(pfx + 'Roughness.jpg');
  const aoTex     = loader.load(pfx + 'AmbientOcclusion.jpg');

  [colorTex, normalTex, roughTex, aoTex].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 4); // 20 tiles around ring, 4 across 18 m width
    t.anisotropy = 8;
  });
  colorTex.colorSpace = THREE.SRGBColorSpace;
  // Slight offset so tile seam falls in an inconspicuous spot
  colorTex.offset.set(0.23, 0.17);
  normalTex.offset.copy(colorTex.offset);
  roughTex.offset.copy(colorTex.offset);
  aoTex.offset.copy(colorTex.offset);

  const geo = new THREE.RingGeometry(220, 238, 64, 8);
  geo.setAttribute('uv1', geo.attributes.uv);

  // Perturb vertices for an organic shoreline:
  //   Z → world Y (height) after rotation.x = -PI/2
  //   XY → radial variation makes inner/outer boundaries irregular
  const pos = geo.attributes.position;
  const rng = seededRng(77);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), ly = pos.getY(i);
    const a  = Math.atan2(ly, lx);
    const r  = Math.sqrt(lx * lx + ly * ly);
    const t  = Math.max(0, Math.min(1, (r - 220) / 18)); // 0=inner, 1=outer

    // Height variation
    const h  = 0.12 * Math.sin(a * 7 + 0.3)
             + 0.08 * Math.sin(a * 13 + 1.1)
             + 0.04 * Math.cos(a * 21 - 0.7)
             + 0.03 * (rng() - 0.5);
    pos.setZ(i, h);

    // Radial variation — organic boundary, no perfect circles
    const radNoise = 4.2 * Math.sin(a * 3 + 0.4)
                   + 2.5 * Math.sin(a * 7 + 1.7)
                   + 1.4 * Math.cos(a * 13 - 0.8)
                   + 0.9 * Math.sin(a * 19 + 2.1);
    const radPush = radNoise * (1.0 - t * 0.65);
    const newR    = r + radPush;
    if (newR > 0.01) {
      const ratio = newR / r;
      pos.setX(i, lx * ratio);
      pos.setY(i, ly * ratio);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const beachRing = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map:            colorTex,
    normalMap:      normalTex,
    roughnessMap:   roughTex,
    aoMap:          aoTex,
    aoMapIntensity: 0.85,
    roughness:      0.94,
    metalness:      0.0,
  }));
  beachRing.rotation.x = -Math.PI / 2;
  beachRing.position.y = 0.04;
  beachRing.receiveShadow = true;
  scene.add(beachRing);

  // Sloped sand skirt down to water level
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(238, 252, 2.2, 32),
    new THREE.MeshStandardMaterial({ color: 0xD4B470, roughness: 0.97, metalness: 0.0 })
  );
  skirt.position.y = -2.2;
  skirt.receiveShadow = true;
  scene.add(skirt);

  // Wet surf band
  const wet = new THREE.Mesh(
    new THREE.CylinderGeometry(252, 258, 0.6, 32),
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
    // Fade out before plane edge so it never projects into the sky
    alpha *= smoothstep(420.0, 360.0, dist);

    gl_FragColor = vec4(col, alpha);
  }
`;

function addWater(scene) {
  // 900×900 plane covers ~450m from origin — well beyond shore (r≈238) but
  // never reaches far enough to project into sky pixels. Frag shader fades
  // alpha to 0 at r=360-420 so there is no hard-edge cutoff.
  const geo = new THREE.PlaneGeometry(900, 900, 28, 28);
  // Bake rotation into geometry so vertex shader pos.x/pos.z are the horizontal
  // axes and pos.y += h correctly displaces vertices upward in world space.
  geo.rotateX(-Math.PI / 2);
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
  _waterMesh.position.y = -3.2;
  scene.add(_waterMesh);
}

// ── Ocean GLB (animated wave mesh) ───────────────────────────────────
// File found at /models/ocean/ (NOT /models/nature/ocean/ as previously expected).
// Loaded lazily — the GLSL water shader above remains active while the 63 MB
// GLB downloads; when the GLB arrives it layers underneath for added depth.

function _loadOceanGlb(scene) {
  const loader = new GLTFLoader();
  const url    = '/models/ocean/free_ocean_wave_animation.glb';
  console.log('[ocean-glb] starting download (63 MB, loading in background)…');

  loader.load(
    url,
    gltf => {
      const ocean = gltf.scene;

      // Scale to match the game's water plane (diameter ~600 m)
      const box  = new THREE.Box3().setFromObject(ocean);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxXZ = Math.max(size.x, size.z, 0.01);
      const scale = 600 / maxXZ;
      ocean.scale.setScalar(scale);

      // Sit the mesh at the water surface level
      const box2 = new THREE.Box3().setFromObject(ocean);
      ocean.position.y = -3.4 - box2.min.y; // just below GLSL water plane

      ocean.traverse(n => {
        if (!n.isMesh) return;
        n.castShadow    = false;
        n.receiveShadow = false;
        // Ensure transparency so the GLSL caustic layer on top shows through
        if (n.material) {
          n.material = n.material.clone();
          n.material.transparent = true;
          n.material.depthWrite  = false;
        }
      });

      scene.add(ocean);

      if (gltf.animations.length > 0) {
        _oceanMixer = new THREE.AnimationMixer(ocean);
        gltf.animations.forEach(clip => _oceanMixer.clipAction(clip).play());
        console.log('[ocean-glb] loaded —', gltf.animations.length,
                    'animation(s) playing | scale:', scale.toFixed(3));
      } else {
        console.log('[ocean-glb] loaded — no animations | scale:', scale.toFixed(3));
      }
    },
    xhr => {
      if (xhr.total > 0) {
        const pct = Math.round(xhr.loaded / xhr.total * 100);
        if (pct % 20 === 0) console.log('[ocean-glb] loading:', pct + '%');
      }
    },
    err => {
      console.error('[ocean-glb] failed to load from', url, '|', err?.message ?? err);
    }
  );
}

// ── Trees (HighPoly FBX) ──────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Returns true if (x,z) falls inside a path corridor between the plaza and hangars/marina.
function _onPath(x, z) {
  const PW = 8; // half-width of path exclusion corridor
  if (Math.abs(x) < PW && z < -40 && z > -95)  return true; // N path
  if (Math.abs(x) < PW && z >  40 && z <  95)  return true; // S path
  if (Math.abs(z) < PW && x >  40 && x <  95)  return true; // E path
  if (Math.abs(z) < PW && x < -40 && x > -115) return true; // W (marina) path
  return false;
}

function addTrees(scene, maxTrees = 62) {
  const avoid = [
    { x:   0, z: -130, r: 62 }, // N hangar
    { x: 130, z:    0, r: 62 }, // E hangar
    { x:   0, z:  130, r: 62 }, // S hangar
    { x:-150, z:    0, r: 85 }, // marina
    { x:   0, z:    0, r: 54 }, // plaza
  ];

  const rng = seededRng(17);

  for (let i = 0; i < maxTrees; i++) {
    let x, z, tries = 0;
    do {
      const a = rng() * Math.PI * 2;
      const r = 72 + rng() * 145; // stay inside beach ring (r<218)
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      tries++;
    } while (tries < 80 && (
      Math.hypot(x, z) > 216 ||              // outside beach
      avoid.some(av => Math.hypot(av.x - x, av.z - z) < av.r) ||
      _onPath(x, z)
    ));

    if (Math.hypot(x, z) > 216) continue;    // give up on this slot

    const scale = 0.65 + rng() * 0.60;
    const rotY  = rng() * Math.PI * 2;
    spawnTree(scene, x, z, scale, rotY);
  }
}
