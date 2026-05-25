import * as THREE from 'three';
import { spawnTree } from './trees.js';
import { registerGround } from '../systems/terrain.js';

let _waterMesh   = null;
let _waterTime   = 0;
let _waterShader = null;

// ── Public ────────────────────────────────────────────────────────────

export function initIsland(scene, opts = {}) {
  addSky(scene);
  addGround(scene);
  addBeach(scene);
  addWater(scene);
  addTrees(scene, opts.maxTrees ?? 62);
}

export function updateWater(delta) {
  _waterTime += delta;
  if (_waterShader) _waterShader.uniforms.uTime.value = _waterTime;
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

// ── Water ─────────────────────────────────────────────────────────────

function addWater(scene) {
  const mat = new THREE.MeshStandardMaterial({
    color:       0x006994,
    transparent: true,
    opacity:     0.85,
    roughness:   0.15,
    metalness:   0.10,
    side:        THREE.FrontSide,
    depthWrite:  false,
  });

  // Inject a simple vertex-displacement pass into MeshStandardMaterial's
  // compiled shader so we keep full PBR lighting without writing a full shader.
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader   = 'uniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader   = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.y +=
        sin(position.x * 0.05 + uTime * 1.2) * 0.4 +
        cos(position.z * 0.04 + uTime * 0.9) * 0.3 +
        sin((position.x + position.z) * 0.03 + uTime * 0.7) * 0.2;`
    );
    _waterShader = shader;
  };

  _waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000, 48, 48),
    mat
  );
  _waterMesh.rotation.x = -Math.PI / 2;
  _waterMesh.position.y = -0.5;
  scene.add(_waterMesh);
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
