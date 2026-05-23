import * as THREE from 'three';

const PATH_MAT = new THREE.MeshStandardMaterial({ color: 0xC8B99A, roughness: 0.9, metalness: 0.02 });
const EDGE_MAT = new THREE.MeshStandardMaterial({ color: 0xA89880, roughness: 0.95, metalness: 0.0 });

export function initPaths(scene) {
  // Plaza exits (±41 from centre) → hangar/marina entrances
  // North: plaza (0,-41) → North Hangar entrance (0,-85)
  addPath(scene,   0, -41,   0, -85);
  // East: plaza (41,0) → East Hangar entrance (85,0)
  addPath(scene,  41,   0,  85,   0);
  // South: plaza (0,41) → South Hangar entrance (0,85)
  addPath(scene,   0,  41,   0,  85);
  // West: plaza (-41,0) → Marina entrance (-100,0)
  addPath(scene, -41,   0, -100,  0);
}

function addPath(scene, ax, az, bx, bz) {
  const dx     = bx - ax;
  const dz     = bz - az;
  const length = Math.sqrt(dx * dx + dz * dz);
  const rotY   = Math.atan2(dx, dz);
  const cx     = (ax + bx) / 2;
  const cz     = (az + bz) / 2;

  // Main stone surface
  const path = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, length), PATH_MAT);
  path.position.set(cx, 0.85, cz);
  path.rotation.y = rotY;
  path.receiveShadow = true;
  scene.add(path);

  // Raised edge kerbs on each long side
  [-4.85, 4.85].forEach(offset => {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, length), EDGE_MAT);
    kerb.position.set(cx, 1.09, cz);
    kerb.rotation.y = rotY;
    // shift kerb perpendicular to path direction
    kerb.position.x += Math.cos(rotY) * offset;
    kerb.position.z -= Math.sin(rotY) * offset;
    scene.add(kerb);
  });
}
