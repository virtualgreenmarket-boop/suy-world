import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { spawnTree } from './trees.js';
import { registerGround, getSurfaceY } from '../systems/terrain.js';

let _water = null;

// ── Public ────────────────────────────────────────────────────────────

export function initIsland(scene, opts = {}) {
  addSky(scene);
  addTerrain(scene);
  addWater(scene);
  addTrees(scene, opts.maxTrees ?? 62);
}

export function updateWater(delta) {
  if (_water) _water.material.uniforms['time'].value += delta;
}

// ── Sky sphere ───────────────────────────────────────────────────────

function addSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(850, 32, 16),
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

// ── Terrain (grass → sand → wet sand gradient) ───────────────────────

function addTerrain(scene) {
  const tl  = new THREE.TextureLoader();
  const pfx = 'textures/beach/Ground054_2K-JPG_';

  // Sand PBR textures — world-space tiled in shader
  const sandTex  = tl.load(pfx + 'Color.jpg');
  const sandRough = tl.load(pfx + 'Roughness.jpg');
  [sandTex, sandRough].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  sandTex.colorSpace  = THREE.SRGBColorSpace;
  sandTex.anisotropy  = 8;

  // ── Island body: open tapered cylinder (visible cliff edge) ──────────
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(238, 258, 8, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x8B7040, roughness: 0.97, metalness: 0.0 })
  );
  body.position.y = -4;  // top at 0, bottom at -8
  body.receiveShadow = true;
  scene.add(body);

  // Island bottom cap — prevents sky showing through from underwater
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(256, 48),
    new THREE.MeshStandardMaterial({ color: 0x6B5030, roughness: 0.97 })
  );
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -8;
  scene.add(bottom);

  // ── Terrain disc: flat top surface with zone-blended shader ─────────
  //
  //  r < 193         Zone 1 — pure grass (procedural)
  //  r 193–215       Zone 2 — grass with scattered sand patches
  //  r 215–235       Zone 3 — dry sand (PBR texture)
  //  r 235–246       Zone 4 — wet sand (darker)
  //
  const terrainGeo = new THREE.CircleGeometry(246, 128);

  const terrainMat = new THREE.MeshStandardMaterial({
    roughness: 0.92,
    metalness: 0.0,
  });
  terrainMat.customProgramCacheKey = () => 'terrain-v4';

  terrainMat.onBeforeCompile = shader => {
    shader.uniforms.uSandTex   = { value: sandTex   };
    shader.uniforms.uSandRough = { value: sandRough  };

    // ── Vertex: pass world XZ to fragment ────────────────────────────
    shader.vertexShader = `varying vec2 vTW;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       vTW = (modelMatrix * vec4(transformed, 1.0)).xz;`
    );

    // ── Fragment: sampler declarations ───────────────────────────────
    shader.fragmentShader =
      `varying vec2 vTW;
       uniform sampler2D uSandTex;
       uniform sampler2D uSandRough;\n` + shader.fragmentShader;

    // ── Fragment: replace map_fragment with zone-blended colour ──────
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `{
        float r = length(vTW);

        // Zone blend factors
        float tSand = smoothstep(193.0, 215.0, r);   // grass→dry sand
        float tWet  = smoothstep(222.0, 235.0, r);   // dry→wet sand

        // Zone 2: organic sand patches in grass (cell noise)
        vec2  cell  = floor(vTW * 0.10);
        float cellN = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
        float patch = smoothstep(193.0, 220.0, r) * smoothstep(0.38, 0.62, cellN);
        float sandF = max(tSand, patch);

        // Procedural grass — cell noise gives subtle colour variation
        vec2  gCell  = floor(vTW * 0.18);
        float gN     = fract(sin(dot(gCell, vec2(93.9898, 78.233))) * 43758.5453);
        vec3  cGrass = mix(vec3(0.19, 0.46, 0.13), vec3(0.28, 0.58, 0.17), gN);

        // Sand PBR texture
        vec2 uvS   = vTW / 4.2;
        vec3 cSand = texture2D(uSandTex, uvS).rgb;
        vec3 cWet  = cSand * vec3(0.58, 0.56, 0.53);

        vec3 col = mix(cGrass, cSand, sandF);
        col = mix(col, cWet, tWet);

        diffuseColor = vec4(col, 1.0);
      }`
    );

    // ── Fragment: zone-aware roughness & metalness ────────────────────
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `float roughnessFactor = roughness;
       {
         float r2   = length(vTW);
         float tW2  = smoothstep(222.0, 238.0, r2);
         // Wet sand lower roughness → surface water sheen
         roughnessFactor = mix(roughnessFactor, 0.52, tW2);
       }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <metalnessmap_fragment>',
      `float metalnessFactor = metalness;
       {
         float r3  = length(vTW);
         float tW3 = smoothstep(222.0, 238.0, r3);
         // Very slight metalness on wet sand simulates water-film specular
         metalnessFactor = mix(metalnessFactor, 0.06, tW3);
       }`
    );
  };

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.y = 0.02;
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  registerGround(terrainMesh);
}

// ── Water (Three.js built-in Water shader) ────────────────────────────

function addWater(scene) {
  const waterNormals = new THREE.TextureLoader().load('textures/waternormals.jpg');
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

  _water = new Water(new THREE.RingGeometry(120, 1000, 80), {
    textureWidth:   512,
    textureHeight:  512,
    waterNormals,
    sunDirection:   new THREE.Vector3(120, 220, 80).normalize(),
    sunColor:       0xffffff,
    waterColor:     0x006994,
    distortionScale: 3.7,
    fog:            !!scene.fog,
  });

  _water.rotation.x = -Math.PI / 2;
  _water.position.y = -0.5;
  scene.add(_water);
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
      const r = 65 + rng() * 120; // grass zone only: r 65–185
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      tries++;
    } while (tries < 80 && (
      Math.hypot(x, z) > 183 ||              // outside grass zone
      avoid.some(av => Math.hypot(av.x - x, av.z - z) < av.r) ||
      _onPath(x, z)
    ));

    if (Math.hypot(x, z) > 183) continue;   // give up on this slot

    const scale = 0.55 + rng() * 0.45;
    const rotY  = rng() * Math.PI * 2;
    const y     = getSurfaceY(x, z);
    spawnTree(scene, x, z, y, scale, rotY);
  }
}
