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
  addShallowWater(scene);
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

// ── Terrain (grass inner disc + sand outer ring) ─────────────────────

function addTerrain(scene) {
  const tl = new THREE.TextureLoader();

  // ── Grass PBR textures ───────────────────────────────────────────────
  const gPfx = 'textures/grass/Grass001_2K-JPG_';
  const grassColor  = tl.load(gPfx + 'Color.jpg');
  const grassNormal = tl.load(gPfx + 'NormalGL.jpg');
  const grassRough  = tl.load(gPfx + 'Roughness.jpg');
  [grassColor, grassNormal, grassRough].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(48, 48);   // ~8 m per tile across the 394 m disc diameter
    t.anisotropy = 8;
  });
  grassColor.colorSpace = THREE.SRGBColorSpace;

  // ── Sand PBR textures ────────────────────────────────────────────────
  const sPfx = 'textures/beach/Ground054_2K-JPG_';
  const sandTex = tl.load(sPfx + 'Color.jpg');
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(14, 14);
  sandTex.colorSpace = THREE.SRGBColorSpace;
  sandTex.anisotropy = 8;

  // Island body — visible tapered cliff edge
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(238, 258, 8, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x8B7040, roughness: 0.97, metalness: 0.0 })
  );
  body.position.y = -4;
  body.receiveShadow = true;
  scene.add(body);

  // Island bottom cap
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(256, 48),
    new THREE.MeshStandardMaterial({ color: 0x6B5030, roughness: 0.97 })
  );
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -8;
  scene.add(bottom);

  // Grass disc — inner island (r < 197), realistic PBR grass
  const grassMesh = new THREE.Mesh(
    new THREE.CircleGeometry(197, 128),
    new THREE.MeshStandardMaterial({
      map:          grassColor,
      normalMap:    grassNormal,
      roughnessMap: grassRough,
      roughness:    1.0,
      metalness:    0.0,
    })
  );
  grassMesh.rotation.x = -Math.PI / 2;
  grassMesh.position.y = 0.02;
  grassMesh.receiveShadow = true;
  scene.add(grassMesh);

  // Sand ring — beach zone (r 191–246); 1 cm below grass so depth test is clean
  const sandMesh = new THREE.Mesh(
    new THREE.RingGeometry(191, 246, 128),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95, metalness: 0.0 })
  );
  sandMesh.rotation.x = -Math.PI / 2;
  sandMesh.position.y = 0.01;
  sandMesh.receiveShadow = true;
  scene.add(sandMesh);

  registerGround(grassMesh, sandMesh);
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

// ── Shallow wading zone (r 246–276, walkable, y = -0.15) ─────────────

function addShallowWater(scene) {
  const shallow = new THREE.Mesh(
    new THREE.RingGeometry(246, 276, 128),
    new THREE.MeshStandardMaterial({
      color:       0x38C0D8,
      transparent: true,
      opacity:     0.50,
      roughness:   0.05,
      metalness:   0.12,
      depthWrite:  false,
    })
  );
  shallow.rotation.x  = -Math.PI / 2;
  shallow.position.y  = -0.15;
  shallow.renderOrder = 1;   // render after deep water so transparency composites correctly
  scene.add(shallow);
  registerGround(shallow);   // makes getSurfaceY return -0.15 here → player wades
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
  if (Math.abs(z) < PW && x < -40 && x > -195) return true; // W (marina) path
  return false;
}

function addTrees(scene, maxTrees = 62) {
  const avoid = [
    { x:   0, z: -130, r: 62 }, // N hangar
    { x: 130, z:    0, r: 62 }, // E hangar
    { x:   0, z:  130, r: 62 }, // S hangar
    { x:-230, z:    0, r: 140 }, // marina (wide deck along shore)
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
