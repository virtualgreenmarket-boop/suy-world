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

  console.log('[trees] starting FBX download:', BASE + 'Model/SM_HP_Tree.FBX');

  _promise = new Promise((resolve, reject) =>
    _fbxLoader.load(
      BASE + 'Model/SM_HP_Tree.FBX',
      fbx => {
        // ── Convert any SkinnedMesh → Mesh so clone(true) works correctly ──
        // FBX "static" meshes sometimes still carry a skeleton; clone() won't
        // copy the skeleton correctly, so we extract the geometry and apply
        // the bind pose by simply using the geometry as-is in a plain Mesh.
        const toConvert = [];
        fbx.traverse(n => { if (n.isSkinnedMesh) toConvert.push(n); });
        if (toConvert.length > 0) {
          console.log('[trees] converting', toConvert.length, 'SkinnedMesh(es) to Mesh for correct cloning');
        }
        toConvert.forEach(sm => {
          const mesh = new THREE.Mesh(sm.geometry, sm.material);
          mesh.name         = sm.name;
          mesh.castShadow   = sm.castShadow;
          mesh.receiveShadow = sm.receiveShadow;
          mesh.position.copy(sm.position);
          mesh.quaternion.copy(sm.quaternion);
          mesh.scale.copy(sm.scale);
          sm.parent.add(mesh);
          sm.parent.remove(sm);
        });

        // ── Apply our PBR materials based on mesh name ──
        let leafCount = 0, trunkCount = 0;
        fbx.traverse(n => {
          if (!n.isMesh) return;
          const existingName = (Array.isArray(n.material)
            ? n.material[0] : n.material)?.name ?? '';
          const combined = (n.name + existingName).toLowerCase();
          const isLeaf   = combined.includes('leaf') || combined.includes('leaves')
                        || combined.includes('foliage') || combined.includes('canopy')
                        || combined.includes('frond') || combined.includes('needle');
          n.material      = isLeaf ? leafMat : trunkMat;
          n.castShadow    = true;
          n.receiveShadow = !isLeaf;
          if (isLeaf) leafCount++; else trunkCount++;
        });

        // Log all mesh names for diagnostics
        const meshNames = [];
        fbx.traverse(n => { if (n.isMesh) meshNames.push(n.name || '(unnamed)'); });
        console.log('[trees] meshes:', meshNames.join(', '),
                    '| trunk:', trunkCount, '| leaf:', leafCount);

        if (trunkCount + leafCount === 0) {
          console.error('[trees] FBX loaded but contains 0 mesh nodes — check file integrity');
          reject(new Error('No mesh nodes found in tree FBX'));
          return;
        }

        // ── Normalise so the bounding-box height equals TARGET_HEIGHT ──
        const box1 = new THREE.Box3().setFromObject(fbx);
        const h    = Math.max(box1.max.y - box1.min.y, 0.01);
        fbx.scale.setScalar(TARGET_HEIGHT / h);

        // Shift the FBX so its base is at local y=0 inside the container.
        const box2 = new THREE.Box3().setFromObject(fbx);
        fbx.position.y = -box2.min.y;

        // Wrap in a Group — scaling the Group scales uniformly while
        // preserving the base-at-zero offset on the inner FBX.
        _template = new THREE.Group();
        _template.add(fbx);

        console.log('[trees] ready — normalised scale:', (TARGET_HEIGHT / h).toFixed(4),
                    '| height:', h.toFixed(2), 'units before scale');
        resolve();
      },
      xhr => {
        if (xhr.total > 0 && xhr.loaded > 0) {
          const pct = Math.round(xhr.loaded / xhr.total * 100);
          if (pct % 25 === 0) console.log('[trees] loading:', pct + '%');
        }
      },
      err => {
        console.error('[trees] FBX load failed. URL tried:', BASE + 'Model/SM_HP_Tree.FBX',
                      '| Error:', err.message ?? err);
        reject(err);
      }
    )
  );
  return _promise;
}

/**
 * Place a tree at world (x, z).
 *   scale    — multiplier on TARGET_HEIGHT (1.0 = 15 m, 2.0 = 30 m)
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
    preloadTrees().then(place).catch(err => {
      console.warn('[trees] spawn skipped — model unavailable at', x, z, '|', err?.message ?? err);
    });
  }
}
