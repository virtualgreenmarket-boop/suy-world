import * as THREE from 'three';

function mat(color, rough = 0.88) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
}

function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function initIsland(scene) {
  addGround(scene);
  addWater(scene);
  addPalmTrees(scene);
  addBeachRing(scene);
}

function addGround(scene) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(238, 248, 3, 72),
    mat(0x5DA44A)
  );
  mesh.position.y = -1.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addBeachRing(scene) {
  const beach = new THREE.Mesh(
    new THREE.CylinderGeometry(245, 252, 1.2, 72),
    mat(0xE8D5A0)
  );
  beach.position.y = -2.5;
  beach.receiveShadow = true;
  scene.add(beach);
}

function addWater(scene) {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({
      color: 0x1976D2,
      roughness: 0.25,
      metalness: 0.45,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -2.8;
  scene.add(water);
}

function addPalmTrees(scene) {
  const trunkMat = mat(0x8D6E63);
  const leafMat  = mat(0x388E3C, 0.92);

  const avoid = [
    { x: 0,    z: -130 }, { x: 130,  z: 0    },
    { x: 0,    z:  130 }, { x: -150, z: 0    },
    { x: 0,    z:  0   },
  ];

  const rng = makeRng(17);

  for (let i = 0; i < 55; i++) {
    let x, z, tries = 0;
    do {
      const a = rng() * Math.PI * 2;
      const r = 70 + rng() * 155;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      tries++;
    } while (tries < 50 && avoid.some(a => Math.hypot(a.x - x, a.z - z) < 30));

    const scale  = 0.75 + rng() * 0.6;
    const height = 9 + rng() * 5;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, height, 7),
      trunkMat
    );
    trunk.castShadow = true;

    const leafGroup = new THREE.Group();
    const leafCount = 5 + Math.floor(rng() * 3);
    for (let l = 0; l < leafCount; l++) {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 4.5, 5),
        leafMat
      );
      leaf.rotation.z  = Math.PI * 0.38;
      leaf.rotation.y  = (l / leafCount) * Math.PI * 2;
      leaf.position.y  = 0.5;
      leaf.castShadow  = true;
      leafGroup.add(leaf);
    }
    leafGroup.position.y = height * 0.5 + 0.8;

    const tree = new THREE.Group();
    tree.add(trunk, leafGroup);
    tree.position.set(x, 0, z);
    tree.rotation.y = rng() * Math.PI * 2;
    tree.scale.setScalar(scale);
    scene.add(tree);
  }
}
