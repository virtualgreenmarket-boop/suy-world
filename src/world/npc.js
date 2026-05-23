import * as THREE from 'three';

function mat(color, rough = 0.88) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 });
}

function add(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

const ANIM_TYPES = ['wave', 'spin', 'dance'];

/**
 * Builds a tree-person NPC.
 *
 * Appearance: tapered bark trunk, surface roots, two branch arms,
 * a fluffy leaf-ball head with dark eyes, all using accentColor for the foliage.
 *
 * userData:
 *   isNPC    — true
 *   npcType  — string
 *   waveArm  — THREE.Group (right branch pivot, animate rotation.z each frame)
 *   animType — 'wave' | 'spin' | 'dance'
 *   animPhase — random offset so NPCs are out of sync
 */
export function buildNpcCharacter(accentColor, npcType = 'generic') {
  const trunkMat = mat(0x5D4037, 0.92);
  const leafMat  = mat(accentColor, 0.85);
  const darkMat  = mat(0x1A1A1A, 0.70);

  const group = new THREE.Group();

  // ── Surface roots ─────────────────────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const a    = (i / 4) * Math.PI * 2;
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.55, 5), trunkMat);
    root.position.set(Math.cos(a) * 0.19, 0.13, Math.sin(a) * 0.19);
    root.rotation.z = Math.cos(a) * 0.5;
    root.rotation.x = Math.sin(a) * 0.5;
    root.castShadow = true;
    group.add(root);
  }

  // ── Trunk ─────────────────────────────────────────────────────────────
  add(group, new THREE.CylinderGeometry(0.14, 0.22, 2.0, 7), trunkMat, 0, 1.0, 0);

  // ── Left branch (fixed, angled left-upward) ───────────────────────────
  const leftBranch = new THREE.Group();
  leftBranch.position.set(-0.16, 1.45, 0);
  leftBranch.rotation.z = 0.65;
  group.add(leftBranch);
  add(leftBranch, new THREE.CylinderGeometry(0.04, 0.07, 0.85, 5), trunkMat, 0, 0.38, 0);
  add(leftBranch, new THREE.SphereGeometry(0.17, 6, 5), leafMat, 0, 0.88, 0);

  // ── Right branch — wave pivot (animate rotation.z each frame) ─────────
  const waveArm = new THREE.Group();
  waveArm.position.set(0.16, 1.45, 0);
  waveArm.rotation.z = -0.65;
  group.add(waveArm);
  add(waveArm, new THREE.CylinderGeometry(0.04, 0.07, 0.85, 5), trunkMat, 0, 0.38, 0);
  add(waveArm, new THREE.SphereGeometry(0.17, 6, 5), leafMat, 0, 0.88, 0);

  // ── Leaf head (central sphere + ring of 5 + top tuft) ─────────────────
  add(group, new THREE.SphereGeometry(0.32, 8, 6), leafMat, 0, 2.22, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(group, new THREE.SphereGeometry(0.18, 6, 5), leafMat,
      Math.cos(a) * 0.22, 2.18, Math.sin(a) * 0.22);
  }
  add(group, new THREE.SphereGeometry(0.20, 6, 5), leafMat, 0, 2.52, 0);

  // ── Eyes + mouth on front of head ────────────────────────────────────
  add(group, new THREE.SphereGeometry(0.036, 5, 4), darkMat, -0.11, 2.27, 0.28);
  add(group, new THREE.SphereGeometry(0.036, 5, 4), darkMat,  0.11, 2.27, 0.28);
  add(group, new THREE.SphereGeometry(0.026, 4, 3), darkMat,  0,    2.13, 0.30);

  group.userData.isNPC     = true;
  group.userData.npcType   = npcType;
  group.userData.waveArm   = waveArm;
  group.userData.animType  = ANIM_TYPES[Math.floor(Math.random() * ANIM_TYPES.length)];
  group.userData.animPhase = Math.random() * Math.PI * 2;

  return group;
}
