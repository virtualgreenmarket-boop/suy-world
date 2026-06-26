import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { spawnTree } from './trees.js';
import { registerGround, getSurfaceY } from '../systems/terrain.js';

let _water = null;

// ── Ellipse geometry helper ──────────────────────────────────────────
// Creates an asymmetric ellipse: east side expands, west side stays same
// North/South expansion: 2.38x (138% - +30% expansion for massive space behind hangars)
// East expansion: 1.4x (40%)
function createAsymmetricEllipse(baseRadius, eastExpansion, northSouthExpansion, segments = 128) {
  const geometry = new THREE.CircleGeometry(baseRadius, segments);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    // Expand east side (x > 0) by eastExpansion factor
    if (x > 0) {
      pos.setX(i, x * eastExpansion);
    }
    // Keep west side (x <= 0) the same

    // CircleGeometry lies in XY plane; after rotation.x=-PI/2, geometry Y maps to world Z.
    // Expand both north and south by scaling geometry Y.
    pos.setY(i, y * northSouthExpansion);
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

// Creates an asymmetric ring: east side expands, west side stays same
function createAsymmetricRing(innerRadius, outerRadius, eastExpansion, northSouthExpansion, segments = 128) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    // Expand east side (x > 0)
    if (x > 0) {
      pos.setX(i, x * eastExpansion);
    }

    // RingGeometry lies in XY plane; after rotation.x=-PI/2, geometry Y maps to world Z.
    pos.setY(i, y * northSouthExpansion);
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

// ── Public ────────────────────────────────────────────────────────────

export function initIsland(scene, opts = {}) {
  addSky(scene);
  addTerrain(scene);
  addWater(scene);
  addShallowWater(scene);
  addShallowSeabed(scene);
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
  const grassNormal = tl.load('textures/grass/Grass001_1K-JPG_NormalGL.jpg');
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

  // Island body — visible tapered cliff edge (asymmetric ellipse)
  // East expansion: 1.4x (40%), North/South expansion: 2.38x (138% - +30% for huge space)
  const bodyGeom = new THREE.CylinderGeometry(336.53, 364.81, 8, 48, 1, true);
  const bodyPos = bodyGeom.attributes.position;
  for (let i = 0; i < bodyPos.count; i++) {
    const x = bodyPos.getX(i);
    const z = bodyPos.getZ(i);
    if (x > 0) bodyPos.setX(i, x * 1.4); // East expansion (40%)
    bodyPos.setZ(i, z * 2.38); // North/South expansion (138% - +30% for massive space)
  }
  bodyGeom.attributes.position.needsUpdate = true;

  const body = new THREE.Mesh(
    bodyGeom,
    new THREE.MeshStandardMaterial({ color: 0x8B7040, roughness: 0.97, metalness: 0.0 })
  );
  body.position.y = -4;
  body.receiveShadow = true;
  scene.add(body);

  // Island bottom cap (asymmetric ellipse)
  const bottom = new THREE.Mesh(
    createAsymmetricEllipse(362.02, 1.4, 2.38, 48),
    new THREE.MeshStandardMaterial({ color: 0x6B5030, roughness: 0.97 })
  );
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -8;
  scene.add(bottom);

  // Grass disc — inner island (r < 197), realistic PBR grass
  // East expansion: 1.4x (197 → 276m), North/South: 2.38x (197 → 469m), West stays 197m
  const grassMesh = new THREE.Mesh(
    createAsymmetricEllipse(278.56, 1.4, 2.38, 128),
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

  // Sand ring — beach zone (r 191–246 → asymmetric)
  // East: 246 → 344m, North/South: 246 → 585m (138% expansion), West stays 246m
  const sandMesh = new THREE.Mesh(
    createAsymmetricRing(270.07, 347.84, 1.4, 2.38, 128),
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

  // Animated deep-water shader — starts beyond the shallow wading zone
  // Asymmetric: east 396→554m (1.4x), north/south 396→942m (2.38x), west stays 396m
  _water = new Water(createAsymmetricRing(560.15, 1164.15, 1.4, 2.38, 80), {
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

  // Simple water fill between island edge and shallow zone (r=120→246)
  // Asymmetric expansion: east 1.4x, north/south 2.38x
  const innerWater = new THREE.Mesh(
    createAsymmetricRing(169.70, 347.84, 1.4, 2.38, 80),
    new THREE.MeshStandardMaterial({
      color:       0x006994,
      transparent: true,
      opacity:     0.88,
      roughness:   0.08,
      metalness:   0.15,
      depthWrite:  false,
    })
  );
  innerWater.rotation.x = -Math.PI / 2;
  innerWater.position.y = -0.5;
  scene.add(innerWater);
}

// ── Shallow wading zone (r 246–276, walkable, y = -0.15) ─────────────

function addShallowWater(scene) {
  // Shallow wading zone: 246→396m becomes asymmetric
  // East: 246→344m inner, 396→554m outer (1.4x)
  // North/South: 246→585m inner, 396→942m outer (2.38x - +30% expansion)
  // West: stays 246→396m
  const shallow = new THREE.Mesh(
    createAsymmetricRing(347.84, 560.15, 1.4, 2.38, 128),
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
  shallow.renderOrder = 1;
  scene.add(shallow);
  // not registered as ground — player sinks to sandy seabed below
}

// ── Shallow seabed: sloped entry + flat bottom, sand texture ──────────

function addShallowSeabed(scene) {
  const tl  = new THREE.TextureLoader();
  const tex = tl.load('textures/beach/Ground054_2K-JPG_Color.jpg');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  // Sloped entry: r=246 (y=0) → r=260 (y=-0.25) — asymmetric expansion
  // East: 1.4x, North/South: 2.38x (+30% expansion)
  const slopeMesh = new THREE.Mesh(
    _slopedRingAsymmetric(347.84, 367.64, 0, -1.05, 1.4, 2.38, 128),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0,
      emissive: 0x664422, emissiveIntensity: 0.18 })
  );
  slopeMesh.receiveShadow = true;
  scene.add(slopeMesh);
  registerGround(slopeMesh);

  // Flat sandy bottom: r=260→396, y=-1.05 — asymmetric expansion
  // East: 1.4x, North/South: 2.38x
  const flatTex = tex.clone();
  flatTex.repeat.set(10, 80);
  flatTex.needsUpdate = true;
  const flatMesh = new THREE.Mesh(
    createAsymmetricRing(367.64, 560.15, 1.4, 2.38, 128),
    new THREE.MeshStandardMaterial({ map: flatTex, roughness: 0.95, metalness: 0.0,
      emissive: 0x664422, emissiveIntensity: 0.18 })
  );
  flatMesh.rotation.x = -Math.PI / 2;
  flatMesh.position.y = -1.05;
  flatMesh.receiveShadow = true;
  scene.add(flatMesh);
  registerGround(flatMesh);
}

// Creates an asymmetric sloped ring (east expansion, west stays same)
function _slopedRingAsymmetric(innerR, outerR, yInner, yOuter, eastExp, nsExp, segments) {
  const geom = _slopedRing(innerR, outerR, yInner, yOuter, segments);
  const pos = geom.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    if (x > 0) pos.setX(i, x * eastExp); // East expansion
    pos.setZ(i, z * nsExp); // North/South expansion
  }

  geom.attributes.position.needsUpdate = true;
  geom.computeBoundingBox();
  geom.computeBoundingSphere();

  return geom;
}

// Creates an annular mesh that slopes from yInner (at innerR) to yOuter (at outerR).
// UVs are world-space (x/4, z/4) so the sand texture tiles at ~4 m per repeat.
function _slopedRing(innerR, outerR, yInner, yOuter, segments) {
  const pos = [], uv = [], idx = [];
  const TILE = 4.0;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const c = Math.cos(theta), s = Math.sin(theta);
    pos.push(innerR * c, yInner, innerR * s,
             outerR * c, yOuter, outerR * s);
    uv.push((innerR * c) / TILE, (innerR * s) / TILE,
            (outerR * c) / TILE, (outerR * s) / TILE);
  }
  for (let i = 0; i < segments; i++) {
    const a = i*2, b = a+1, c = a+2, d = a+3;
    idx.push(a, c, b,  b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,  2));
  geo.computeVertexNormals();
  return geo;
}

// ── Trees (HighPoly FBX) ──────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Returns true if (x,z) falls inside a path corridor between the plaza and hangars/marina.
function _onPath(x, z) {
  const PW = 8; // half-width of path exclusion corridor
  if (Math.abs(x) < PW && z < -40 && z > -240)  return true; // N path (extended +30% expansion)
  if (Math.abs(x) < PW && z >  40 && z <  240)  return true; // S path (extended +30% expansion)
  if (Math.abs(z) < PW && x >  40 && x <  125)  return true; // E path (unchanged - hangar at 162.6)
  if (Math.abs(z) < PW && x < -40 && x > -210) return true; // W (marina) path (unchanged)
  return false;
}

function addTrees(scene, maxTrees = 62) {
  const avoid = [
    { x:   0, z: -162.6, r: 62 }, // N hangar (updated for elliptical island)
    { x: 162.6, z:    0, r: 62 }, // E hangar (updated for elliptical island)
    { x:   0, z:  162.6, r: 62 }, // S hangar (updated for elliptical island)
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
