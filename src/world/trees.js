import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TARGET_HEIGHT = 7;
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
