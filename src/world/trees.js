import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/sharedLoaders.js';
import { FBXLoader }  from 'three/addons/loaders/FBXLoader.js';
import { attachLabel, createLabel } from '../ui/labels.js';

const TARGET_HEIGHT = 15.4; // 7 × 2.2 (+120 %)
const GLB_URL  = '/models/nature/trees/sm_hp_tree.glb';
const TEX_BASE = '/models/nature/trees/HighPoly%20Tree%20Model/Textures/';

const _loader    = createGLTFLoader();
const _texLoader = new THREE.TextureLoader();
let   _template  = null;
let   _promise   = null;
let   _treeCount = 0;

export function preloadTrees() {
  if (_promise) return _promise;

  const trunkColor = _texLoader.load(TEX_BASE + 'T_HP_Tree_Trunk.PNG');
  const trunkNorm  = _texLoader.load(TEX_BASE + 'T_HP_Tree_Trunk_normal.PNG');
  const leafColor  = _texLoader.load(TEX_BASE + 'T_HP_Tree_Leaf.PNG');
  trunkColor.colorSpace = THREE.SRGBColorSpace;
  leafColor.colorSpace  = THREE.SRGBColorSpace;

  // Enhanced textures with anisotropic filtering
  trunkColor.anisotropy = 16;
  trunkNorm.anisotropy = 16;
  leafColor.anisotropy = 16;

  const trunkMat = new THREE.MeshStandardMaterial({
    map: trunkColor, normalMap: trunkNorm,
    color: new THREE.Color(0x8B6F47), // Rich brown trunk color
    roughness: 0.85, metalness: 0.0,
    emissive: new THREE.Color(0x3a2817), // Warm brown emissive
    emissiveIntensity: 0.2,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafColor, alphaTest: 0.45,
    color: new THREE.Color(0x4a8a2a), // Vibrant green leaves
    side: THREE.DoubleSide, roughness: 0.8, metalness: 0.0,
    emissive: new THREE.Color(0x1a4010), // Deep green emissive
    emissiveIntensity: 0.3,
  });

  _promise = new Promise((resolve, reject) =>
    _loader.load(GLB_URL, gltf => {
      const root = gltf.scene;
      root.updateMatrixWorld(true);

      // FBX->GLB round-trip may leave the tree lying on its side.
      // Detect by comparing bounding-box extents and rotate upright if needed.
      {
        const b = new THREE.Box3().setFromObject(root);
        const s = b.getSize(new THREE.Vector3());
        if (s.z > s.y * 1.5 && s.z >= s.x) {
          // Tall in Z: apply -90° around X to bring Z into Y
          root.rotation.x = -Math.PI / 2;
          root.updateMatrixWorld(true);
        } else if (s.x > s.y * 1.5 && s.x > s.z) {
          // Tall in X: apply 90° around Z to bring X into Y
          root.rotation.z = Math.PI / 2;
          root.updateMatrixWorld(true);
        }
      }

      let leafCount = 0, trunkCount = 0;
      root.traverse(n => {
        if (!n.isMesh) return;
        const combined = n.name.toLowerCase();
        const isLeaf   = combined.includes('leaf') || combined.includes('leaves')
                      || combined.includes('foliage') || combined.includes('canopy')
                      || combined.includes('frond') || combined.includes('needle');
        n.material      = isLeaf ? leafMat : trunkMat;
        n.castShadow    = !isLeaf;
        n.receiveShadow = !isLeaf;
        if (isLeaf) leafCount++; else trunkCount++;
      });

      const box1 = new THREE.Box3().setFromObject(root);
      const h    = Math.max(box1.max.y - box1.min.y, 0.01);
      root.scale.setScalar(TARGET_HEIGHT / h);

      const box2 = new THREE.Box3().setFromObject(root);
      root.position.y = -box2.min.y;

      _template = new THREE.Group();
      _template.add(root);

      console.log('[trees] ready — trunk:', trunkCount, '| leaf:', leafCount,
                  '| scale:', (TARGET_HEIGHT / h).toFixed(4));
      resolve();
    }, undefined, reject)
  );
  return _promise;
}

// ── Plaza centrepiece maple tree (FBX) ───────────────────────────────

export function spawnPlazaTree(scene) {
  const tl   = new THREE.TextureLoader();
  const BASE = '/models/nature/trees/plaza_tree/textures/';

  const barkTex = tl.load(BASE + 'Trunk_D_Tiled2.webp');
  barkTex.colorSpace = THREE.SRGBColorSpace;
  barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
  barkTex.anisotropy = 16;

  // Leaf texture — loaded explicitly so leaf meshes always get it even if FBX
  // auto-resolution via setResourcePath fails (common with renamed files).
  const leafTex = tl.load(BASE + 'maplebranch.webp');
  leafTex.colorSpace = THREE.SRGBColorSpace;
  leafTex.anisotropy = 8;

  const loader = new FBXLoader();
  loader.setResourcePath(BASE);

  loader.load('/models/nature/trees/plaza_tree/source/HeroTree.fbx', fbx => {
    const meshNames = [];
    fbx.traverse(n => {
      if (!n.isMesh) return;
      meshNames.push(n.name);
      const name = n.name.toLowerCase();
      const isLeaf = name.includes('leaf') || name.includes('leaves')
                  || name.includes('foliage') || name.includes('maple')
                  || name.includes('branch');

      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach(mat => {
        if (!mat) return;
        for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap']) {
          if (mat[key]) {
            if (key === 'map' || key === 'emissiveMap') mat[key].colorSpace = THREE.SRGBColorSpace;
            mat[key].anisotropy = 16;
            mat[key].needsUpdate = true;
          }
        }
        if (!mat.map && !isLeaf) { mat.map = barkTex; mat.needsUpdate = true; }
        // Always assign leaf texture to leaf meshes that have no map loaded
        if (isLeaf && !mat.map)  { mat.map = leafTex; mat.needsUpdate = true; }

        if (isLeaf) {
          mat.side        = THREE.DoubleSide;
          mat.alphaTest   = 0.28; // was 0.65 — too aggressive, cut most leaf pixels
          mat.transparent = false;
          mat.depthWrite  = true;
          mat.color.setHex(0x4a8a2a); // Vibrant green (matching regular trees)
          mat.emissive    = new THREE.Color(0x1a4010); // Deep green emissive
          mat.emissiveIntensity = 0.25;
        } else {
          mat.color.setHex(0x8B6F47); // Rich brown trunk
          mat.emissive    = new THREE.Color(0x3a2817); // Warm brown emissive
          mat.emissiveIntensity = 0.15;
        }
        mat.roughness = isLeaf ? 0.80 : 0.90;
        mat.metalness = 0.0;
        mat.needsUpdate = true;
      });

      n.castShadow    = true;
      n.receiveShadow = !isLeaf;
    });
    console.log('[trees] plaza mesh names:', meshNames.join(', '));

    // Upright correction
    fbx.updateMatrixWorld(true);
    const s0 = new THREE.Box3().setFromObject(fbx).getSize(new THREE.Vector3());
    if      (s0.z > s0.y * 1.5) { fbx.rotation.x = -Math.PI / 2; fbx.updateMatrixWorld(true); }
    else if (s0.x > s0.y * 1.5) { fbx.rotation.z =  Math.PI / 2; fbx.updateMatrixWorld(true); }

    // Scale to 27.5 m (22 * 1.25 = 27.5, 25% larger)
    const box1 = new THREE.Box3().setFromObject(fbx);
    const h    = Math.max(box1.max.y - box1.min.y, 0.01);
    fbx.scale.setScalar(27.5 / h);

    // Seat on ground at plaza location
    const box2 = new THREE.Box3().setFromObject(fbx);
    fbx.position.set(-50, -box2.min.y, 0); // Plaza offset: -50m toward marina
    scene.add(fbx);

    // Procedural leaf canopy — guarantees visible foliage regardless of FBX mesh names
    _addPlazaLeafCanopy(scene, leafTex);

    _treeCount++;
    const plazaLabel = createLabel(`TREE ${_treeCount}`);
    plazaLabel.position.set(-50, 32.5, 0); // Plaza offset + tree height
    scene.add(plazaLabel);

    // Ground AO shadow decal
    const aoTex = tl.load(BASE + 'internal_ground_ao_texture.jpeg');
    aoTex.colorSpace = THREE.SRGBColorSpace;
    const aoDecal = new THREE.Mesh(
      new THREE.CircleGeometry(8, 48),
      new THREE.MeshStandardMaterial({
        map: aoTex, transparent: true,
        blending: THREE.MultiplyBlending,
        depthWrite: false, roughness: 1.0, metalness: 0.0,
      })
    );
    aoDecal.rotation.x = -Math.PI / 2;
    aoDecal.position.set(-50, 0.03, 0); // Plaza offset
    scene.add(aoDecal);

    console.log('[trees] plaza maple — h:', h.toFixed(2), '→ 27.5 m (25% larger)');
  }, undefined, err => console.warn('[trees] plaza maple failed:', err?.message ?? err));
}

// Procedural leaf canopy for the plaza hero tree.
// Uses maplebranch.png cards scattered through the canopy zone (y: 6–22 m world).
// This runs regardless of whether the FBX already has leaf meshes, so the tree
// always has visible foliage even if the model's mesh names don't match keywords.
function _addPlazaLeafCanopy(scene, leafTex) {
  const mat = new THREE.MeshStandardMaterial({
    map:         leafTex,
    alphaTest:   0.28,
    side:        THREE.DoubleSide,
    roughness:   0.80,
    metalness:   0.0,
    transparent: false,
    depthWrite:  true,
    color:       new THREE.Color(0x4a8a2a), // Vibrant green (matching other trees)
    emissive:    new THREE.Color(0x1a4010), // Deep green emissive
    emissiveIntensity: 0.25,
  });

  let s = 31;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  // 20 clusters × 5 leaf cards = 100 quads spread through the canopy (scaled 25% larger)
  for (let c = 0; c < 20; c++) {
    const angle  = (c / 20) * Math.PI * 2 + rng() * 0.7;
    const radius = (1.5 + rng() * 3.8) * 1.25;  // 1.875–6.625 m from trunk (25% larger)
    const baseH  = (6   + rng() * 14) * 1.25;   // 7.5–25 m height (25% larger)

    for (let q = 0; q < 5; q++) {
      const w    = (2.8 + rng() * 2.8) * 1.25;  // 3.5–7 m card width (25% larger)
      const card = new THREE.Mesh(new THREE.PlaneGeometry(w, w), mat);
      card.position.set(
        -50 + Math.cos(angle) * radius + (rng() - 0.5) * 2.0, // Plaza offset X
        baseH            + (rng() - 0.5) * 2.5,
        Math.sin(angle) * radius + (rng() - 0.5) * 2.0
      );
      card.rotation.set(
        (rng() - 0.5) * 1.4,
        rng() * Math.PI * 2,
        (rng() - 0.5) * 1.4
      );
      card.castShadow    = false;
      card.receiveShadow = false;
      scene.add(card);
    }
  }
}

export function spawnTree(scene, x, z, y = 0, scale = 1.0, rotY) {
  const place = () => {
    const tree = _template.clone(true);
    tree.position.set(x, y, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = (rotY !== undefined) ? rotY : Math.random() * Math.PI * 2;
    tree.userData._isTree = true; // Mark for identification/cleanup
    scene.add(tree);
    if (scale > 0) {
      _treeCount++;
      attachLabel(tree, `TREE ${_treeCount}`, 17);
    }
  };

  if (_template) {
    place();
  } else {
    preloadTrees().then(place).catch(err => {
      console.warn('[trees] spawn skipped at', x, z, '|', err?.message ?? err);
    });
  }
}
