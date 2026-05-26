import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader }  from 'three/addons/loaders/FBXLoader.js';

const TARGET_HEIGHT = 15.4; // 7 × 2.2 (+120 %)
const GLB_URL  = '/models/nature/trees/sm_hp_tree.glb';
const TEX_BASE = '/models/nature/trees/HighPoly%20Tree%20Model/Textures/';

const _loader    = new GLTFLoader();
const _texLoader = new THREE.TextureLoader();
let   _template  = null;
let   _promise   = null;

export function preloadTrees() {
  if (_promise) return _promise;

  const trunkColor = _texLoader.load(TEX_BASE + 'T_HP_Tree_Trunk.PNG');
  const trunkNorm  = _texLoader.load(TEX_BASE + 'T_HP_Tree_Trunk_normal.PNG');
  const leafColor  = _texLoader.load(TEX_BASE + 'T_HP_Tree_Leaf.PNG');
  trunkColor.colorSpace = THREE.SRGBColorSpace;
  leafColor.colorSpace  = THREE.SRGBColorSpace;

  const trunkMat = new THREE.MeshStandardMaterial({
    map: trunkColor, normalMap: trunkNorm,
    roughness: 0.93, metalness: 0.0,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafColor, alphaTest: 0.45,
    side: THREE.DoubleSide, roughness: 0.9, metalness: 0.0,
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

  const leafTex  = tl.load(BASE + 'maplebranch.png');
  const atlasTex = tl.load(BASE + 'HeroTreeTRUNK_Bake1_PBR_StoA_Diffuse.png');
  const barkTex  = tl.load(BASE + 'Trunk_D_Tiled2.png');

  [leafTex, atlasTex, barkTex].forEach(t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;

  // Leaves — alphaTest cuts white background; DoubleSide for flat cards
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex, alphaTest: 0.12, transparent: true,
    side: THREE.DoubleSide, roughness: 0.82, metalness: 0.0,
    depthWrite: false,
  });
  // Trunk atlas — black = transparent in the atlas texture
  const atlasMat = new THREE.MeshStandardMaterial({
    map: atlasTex, alphaTest: 0.08, transparent: true,
    roughness: 0.90, metalness: 0.0,
  });
  // Cylindrical bark sections — tileable texture, fully opaque
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex, roughness: 0.92, metalness: 0.0,
  });

  new FBXLoader().load('/models/nature/trees/plaza_tree/source/HeroTree.fbx', fbx => {
    const meshNames = [];
    fbx.traverse(n => {
      if (!n.isMesh) return;
      meshNames.push(n.name);
      const name = n.name.toLowerCase();
      const isLeaf     = name.includes('leaf') || name.includes('leaves')
                      || name.includes('foliage') || name.includes('maple')
                      || name.includes('branch');
      const isCylinder = name.includes('cylinder') || name.includes('bark_tile')
                      || name.includes('trunk_d');
      n.material      = isLeaf ? leafMat : isCylinder ? barkMat : atlasMat;
      n.castShadow    = true;
      n.receiveShadow = !isLeaf;
    });
    console.log('[trees] plaza mesh names:', meshNames.join(', '));

    // Upright correction
    fbx.updateMatrixWorld(true);
    const s0 = new THREE.Box3().setFromObject(fbx).getSize(new THREE.Vector3());
    if      (s0.z > s0.y * 1.5) { fbx.rotation.x = -Math.PI / 2; fbx.updateMatrixWorld(true); }
    else if (s0.x > s0.y * 1.5) { fbx.rotation.z =  Math.PI / 2; fbx.updateMatrixWorld(true); }

    // Scale to 22 m
    const box1 = new THREE.Box3().setFromObject(fbx);
    const h    = Math.max(box1.max.y - box1.min.y, 0.01);
    fbx.scale.setScalar(22 / h);

    // Seat on ground
    const box2 = new THREE.Box3().setFromObject(fbx);
    fbx.position.set(0, -box2.min.y, 0);

    scene.add(fbx);
    console.log('[trees] plaza maple — h:', h.toFixed(2), '→ 22 m');
  }, undefined, err => console.warn('[trees] plaza maple failed:', err?.message ?? err));
}

export function spawnTree(scene, x, z, y = 0, scale = 1.0, rotY) {
  const place = () => {
    const tree = _template.clone(true);
    tree.position.set(x, y, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = (rotY !== undefined) ? rotY : Math.random() * Math.PI * 2;
    scene.add(tree);
  };

  if (_template) {
    place();
  } else {
    preloadTrees().then(place).catch(err => {
      console.warn('[trees] spawn skipped at', x, z, '|', err?.message ?? err);
    });
  }
}
