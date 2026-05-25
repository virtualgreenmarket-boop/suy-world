import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { spawnTree } from './trees.js';
import { registerGround } from '../systems/terrain.js';

let _water       = null;
let _shoreShader = null;
let _shoreTime   = 0;

// ── Public ────────────────────────────────────────────────────────────

export function initIsland(scene, opts = {}) {
  addSky(scene);
  addTerrain(scene);
  addShallowWater(scene);
  addWater(scene);
  addTrees(scene, opts.maxTrees ?? 62);
}

export function updateWater(delta) {
  if (_water) _water.material.uniforms['time'].value += delta;
  _shoreTime += delta;
  if (_shoreShader) _shoreShader.uniforms.uTime.value = _shoreTime; // ShaderMaterial: direct uniform access
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

// ── Terrain (grass → sand → wet sand → shallow water gradient) ────────

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
    new THREE.CylinderGeometry(238, 256, 6, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x8B7040, roughness: 0.97, metalness: 0.0 })
  );
  body.position.y = -3;  // top at 0, bottom at -6
  body.receiveShadow = true;
  scene.add(body);

  // Island bottom cap — prevents sky showing through from underwater
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(256, 48),
    new THREE.MeshStandardMaterial({ color: 0x6B5030, roughness: 0.97 })
  );
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -6;
  scene.add(bottom);

  // ── Terrain disc: flat top surface with 5-zone blended shader ────────
  //
  //  r <  193        Zone 1 — pure grass
  //  r  193–215      Zone 2 — grass with scattered sand patches
  //  r  215–230      Zone 3 — pure dry sand (PBR texture)
  //  r  230–240      Zone 4 — wet sand (darker, lower roughness)
  //  r  240–246      Edge fade → transparent (blends into shallow water)
  //
  const terrainGeo = new THREE.CircleGeometry(246, 128);

  const grassTex = makeGrassTexture();

  const terrainMat = new THREE.MeshStandardMaterial({
    map:         grassTex,   // declares USE_MAP → sampler2D map available in shader
    roughness:   0.92,
    metalness:   0.0,
    transparent: true,
  });
  terrainMat.customProgramCacheKey = () => 'terrain-v2';

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
        float tSand  = smoothstep(193.0, 215.0, r);   // grass→dry sand
        float tWet   = smoothstep(222.0, 235.0, r);   // dry→wet sand
        float tFade  = smoothstep(240.0, 246.0, r);   // wet sand→transparent

        // Zone 2: organic sand patches in grass (cell noise)
        vec2  cell  = floor(vTW * 0.10);
        float cellN = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
        float patch = smoothstep(193.0, 220.0, r) * smoothstep(0.38, 0.62, cellN);
        float sandF = max(tSand, patch);

        // World-space UV tiling (avoids seams from mesh UV)
        vec2 uvG = vTW / 4.5;    // grass ~4.5 m tiles
        vec2 uvS = vTW / 4.2;    // sand  ~4.2 m tiles

        vec4 cGrass = texture2D(map, uvG);
        vec4 cSand  = texture2D(uSandTex, uvS);

        // Wet sand: darker & cooler tone (water-soaked surface)
        vec3 cWet = cSand.rgb * vec3(0.58, 0.56, 0.53);

        // Blend through zones
        vec3 col = mix(cGrass.rgb, cSand.rgb, sandF);
        col = mix(col, cWet, tWet);

        diffuseColor = vec4(col, (1.0 - tFade));
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

// Zone 5 — shallow water ring: animated transparent surf between beach and deep ocean
function addShallowWater(scene) {
  //  r  234–262  transparent teal with animated foam wash at shore edge
  const geo = new THREE.RingGeometry(234, 262, 80, 8);

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec2 vW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec2 vW;
      void main() {
        float r = length(vW);

        // Fade in/out at ring edges
        float inner = smoothstep(234.0, 244.0, r);
        float outer = 1.0 - smoothstep(254.0, 262.0, r);
        float zone  = inner * outer;

        // Depth colour: bright turquoise near shore → deeper teal further out
        float depth = smoothstep(244.0, 262.0, r);
        vec3 colShallow = vec3(0.28, 0.74, 0.72);
        vec3 colDeep    = vec3(0.06, 0.40, 0.54);
        vec3 col = mix(colShallow, colDeep, depth);

        // Animated foam wash rolling onto the beach
        float wave   = sin(r * 1.3 - uTime * 2.6) * 0.5 + 0.5;
        float foam   = smoothstep(0.62, 0.90, wave)
                     * (1.0 - smoothstep(234.0, 250.0, r))
                     * 0.75;
        col = mix(col, vec3(0.93, 0.97, 1.0), foam);

        gl_FragColor = vec4(col, 0.62 * zone);
      }
    `,
    transparent: true,
    depthWrite:  false,
    side: THREE.FrontSide,
  });

  // updateWater ticks mat.uniforms.uTime directly
  _shoreShader = mat;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.15;
  scene.add(mesh);
}

// ── Water (Three.js built-in Water shader) ────────────────────────────

function addWater(scene) {
  const waterNormals = new THREE.TextureLoader().load('textures/waternormals.jpg');
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

  _water = new Water(new THREE.PlaneGeometry(2000, 2000), {
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
