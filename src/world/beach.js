import * as THREE from 'three';

// Beach decorations: seashells only
// Positioned on the sandy ring at radius 220-238, y=0.

const BEACH_INNER = 222;
const BEACH_OUTER = 236;

// ── Public ────────────────────────────────────────────────────────────

export function initBeach(scene) {
  addShells(scene);
}

export function updateBeach(delta, time) {
  // No animated elements on beach anymore
}

// ── Seashells ─────────────────────────────────────────────────────────

function addShells(scene) {
  const rng = seededRng(44);
  const shellCols = [0xF5E8D0, 0xE8CFA8, 0xD4A880, 0xFFEED8, 0xC8B090, 0xF8F0E0];

  for (let i = 0; i < 55; i++) {
    const angle = rng() * Math.PI * 2;
    const r     = BEACH_INNER + rng() * (BEACH_OUTER - BEACH_INNER);
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const col = shellCols[Math.floor(rng() * shellCols.length)];
    const sc  = 0.04 + rng() * 0.09;

    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.60, metalness: 0.05 });
    let mesh;

    if (rng() < 0.55) {
      // Conch/snail shell (cone)
      mesh = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 7), mat);
      mesh.scale.setScalar(sc);
      mesh.rotation.z = (rng() - 0.5) * 0.8;
      mesh.rotation.y = rng() * Math.PI * 2;
    } else {
      // Clam shell (flattened sphere pair)
      const g = new THREE.Group();
      [0.02, -0.02].forEach(dy => {
        const half = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        half.scale.set(1, 0.38, 0.9);
        half.position.y = dy / sc;
        if (dy < 0) half.rotation.z = Math.PI;
        g.add(half);
      });
      g.scale.setScalar(sc);
      g.rotation.y = rng() * Math.PI * 2;
      mesh = g;
    }

    mesh.position.set(x, 0.01, z);
    mesh.castShadow = true;
    scene.add(mesh);
  }
}

// ── Utility ───────────────────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
