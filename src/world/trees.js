import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// All island trees use the HighPoly Tree FBX with its own PBR-adjacent textures.
// The model is normalised to TARGET_HEIGHT metres; per-instance scale multiplies that.
const TARGET_HEIGHT = 15;
const BASE = '/models/nature/trees/HighPoly%20Tree%20Model/';

const _fbxLoader = new FBXLoader();
const _texLoader = new THREE.TextureLoader();
let   _template  = null;   // THREE.Group wrapping the normalised FBX
let   _promise   = null;

export function preloadTrees() {
  if (_promise) return _promise;

  // Start texture downloads in parallel with FBX download
  const trunkColor = _texLoader.load(BASE + 'Textures/T_HP_Tree_Trunk.PNG');
  const trunkNorm  = _texLoader.load(BASE + 'Textures/T_HP_Tree_Trunk_normal.PNG');
  const leafColor  = _texLoader.load(BASE + 'Textures/T_HP_Tree_Leaf.PNG');
  trunkColor.colorSpace = THREE.SRGBColorSpace;
  leafColor.colorSpace  = THREE.SRGBColorSpace;

  const trunkMat = new THREE.MeshStandardMaterial({
    map: trunkColor, normalMap: trunkNorm,
    roughness: 0.93, metalness: 0.0,
  });
  // Leaf PNG has alpha cutout — DoubleSide so both leaf faces render
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafColor, alphaTest: 0.45,
    side: THREE.DoubleSide, roughness: 0.9, metalness: 0.0,
  });

  _promise = new Promise((resolve, reject) =>
    _fbxLoader.load(
      BASE + 'Model/SM_HP_Tree.FBX',
      fbx => {
        fbx.traverse(n => {
          if (!n.isMesh) return;
          // Detect leaf vs trunk by mesh name and existing material name
          const existingName = (Array.isArray(n.material)
            ? n.material[0] : n.material)?.name ?? '';
          const combined = (n.name + existingName).toLowerCase();
          const isLeaf   = combined.includes('leaf') || combined.includes('leaves')
                        || combined.includes('foliage');
          n.material      = isLeaf ? leafMat : trunkMat;
          n.castShadow    = true;
          n.receiveShadow = !isLeaf;
        });

        // Normalise so the model's bounding-box height equals TARGET_HEIGHT
        const box1 = new THREE.Box3().setFromObject(fbx);
        const h    = Math.max(box1.max.y - box1.min.y, 0.01);
        fbx.scale.setScalar(TARGET_HEIGHT / h);

        // Shift the FBX inside the container so its base is at local y = 0.
        // This keeps the base planted at y=0 regardless of per-instance scale.
        const box2 = new THREE.Box3().setFromObject(fbx);
        fbx.position.y = -box2.min.y;

        // Wrap in a Group — scaling the Group scales everything uniformly
        // while preserving the base-at-zero offset on the inner FBX.
        _template = new THREE.Group();
        _template.add(fbx);

        console.log('[trees] loaded — norm scale:', (TARGET_HEIGHT / h).toFixed(4));
        resolve();
      },
      undefined,
      err => { console.error('[trees] FBX load failed:', err); reject(err); }
    )
  );
  return _promise;
}

/**
 * Place a tree at world (x, z).
 *   scale    — multiplier on TARGET_HEIGHT (1.0 = 15 m, 2.0 = 30 m, etc.)
 *   rotY     — Y-axis rotation; random if omitted
 */
export function spawnTree(scene, x, z, scale = 1.0, rotY) {
  const place = () => {
    const tree = _template.clone(true);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = (rotY !== undefined) ? rotY : Math.random() * Math.PI * 2;
    scene.add(tree);
  };

  if (_template) {
    place();
  } else {
    preloadTrees().then(place).catch(() => {
      console.warn('[trees] spawn skipped — model unavailable', x, z);
    });
  }
}
