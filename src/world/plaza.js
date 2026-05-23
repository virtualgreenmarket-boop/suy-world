import * as THREE from 'three';

function mat(color, rough = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.08 });
}

export function initPlaza(scene) {
  addFloor(scene);
  addCornerColumns(scene);
  addCentralStructure(scene);
  addEdgeBenches(scene);
}

function addFloor(scene) {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(82, 0.7, 82),
    mat(0xB0B8D0)
  );
  floor.position.y = 0.35;
  floor.receiveShadow = true;
  scene.add(floor);

  // Raised border around the plaza
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(84, 0.35, 84),
    mat(0x9AA2BA)
  );
  border.position.y = 0.175;
  border.receiveShadow = true;
  scene.add(border);
}

function addCornerColumns(scene) {
  const colMat = mat(0xC8D0E8, 0.75);
  const capMat = mat(0xD8E0F0, 0.7);

  [[-36, -36], [-36, 36], [36, -36], [36, 36]].forEach(([x, z]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 10, 10), colMat);
    col.position.set(x, 5.7, z);
    col.castShadow = true;
    scene.add(col);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.1, 0.6, 10), capMat);
    cap.position.set(x, 11.0, z);
    scene.add(cap);
  });
}

function addCentralStructure(scene) {
  // Hexagonal base platform
  const baseMat = mat(0xA0A8C0, 0.78);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 0.7, 6), baseMat);
  base.position.y = 1.05;
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  // Central column
  const colMat = mat(0xB8C0D8, 0.72);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 7, 12), colMat);
  col.position.y = 5.1;
  col.castShadow = true;
  scene.add(col);

  // Glowing orb — NPC marker (main store)
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xFFE082,
    emissive: 0xFFB300,
    emissiveIntensity: 0.7,
    roughness: 0.3,
    metalness: 0.1,
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), orbMat);
  orb.position.y = 9.5;
  orb.userData.isNPC = true;
  orb.userData.npcType = 'mainStore';
  scene.add(orb);
}

function addEdgeBenches(scene) {
  const benchMat = mat(0x8090B0, 0.85);
  const sides = [
    { x:  0, z: -38, ry: 0         },
    { x:  0, z:  38, ry: Math.PI   },
    { x: -38, z: 0,  ry:  Math.PI / 2 },
    { x:  38, z: 0,  ry: -Math.PI / 2 },
  ];

  sides.forEach(({ x, z, ry }) => {
    for (let i = -1; i <= 1; i++) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 1.2), benchMat);
      const ox = ry === 0 || ry === Math.PI ? i * 9 : 0;
      const oz = Math.abs(ry) === Math.PI / 2 ? i * 9 : 0;
      bench.position.set(x + ox, 0.85, z + oz);
      bench.rotation.y = ry;
      bench.castShadow = true;
      scene.add(bench);
    }
  });
}
