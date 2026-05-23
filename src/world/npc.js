import * as THREE from 'three';

function mat(color, rough = 0.82, metal = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function add(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/**
 * Builds a friendly humanoid NPC with face, hands, legs, and a waving arm.
 * The returned group has:
 *   userData.isNPC    = true
 *   userData.npcType  = npcType string
 *   userData.waveArm  = THREE.Group (pivot at shoulder — animate rotation.x each frame)
 */
export function buildNpcCharacter(accentColor, npcType = 'generic') {
  const skinMat  = mat(0xF5CBA7);
  const shirtMat = mat(accentColor, 0.78);
  const pantsMat = mat(0x37474F);
  const hairMat  = mat(0x3E2723);
  const eyeMat   = mat(0x1A1A1A, 0.7);
  const whiteMat = mat(0xFFFFFF, 0.8);

  const group = new THREE.Group();

  // ── Head ─────────────────────────────────────────────────────────────
  add(group, new THREE.SphereGeometry(0.38, 10, 8), skinMat, 0, 2.25, 0);

  // Hair cap (sphere dome slightly larger than head)
  const hairGeo = new THREE.SphereGeometry(0.41, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52);
  add(group, hairGeo, hairMat, 0, 2.30, -0.03);

  // Eyes: white sclera + dark pupil
  const scleraGeo = new THREE.SphereGeometry(0.072, 7, 6);
  const pupilGeo  = new THREE.SphereGeometry(0.036, 6, 5);
  [-0.13, 0.13].forEach(ex => {
    add(group, scleraGeo, whiteMat, ex, 2.30, 0.33);
    add(group, pupilGeo,  eyeMat,   ex, 2.30, 0.39);
  });

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.12, 0.024, 0.04);
  [-0.13, 0.13].forEach(ex => {
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.position.set(ex, 2.41, 0.33);
    brow.rotation.z = ex < 0 ? 0.15 : -0.15;
    group.add(brow);
  });

  // Nose
  add(group, new THREE.SphereGeometry(0.03, 6, 5), mat(0xE0A882), 0, 2.21, 0.37);

  // Smile: half-torus arc in XY plane, rotated.z=π flips to bottom arc (∪ = smile)
  const smileGeo = new THREE.TorusGeometry(0.09, 0.016, 4, 10, Math.PI);
  const smile    = new THREE.Mesh(smileGeo, mat(0xC0785A, 0.9));
  smile.position.set(0, 2.12, 0.37);
  smile.rotation.z = Math.PI;
  group.add(smile);

  // ── Body ─────────────────────────────────────────────────────────────
  add(group, new THREE.CapsuleGeometry(0.25, 0.5, 6, 12), shirtMat, 0, 1.38, 0);

  // ── Left arm (resting, angled slightly outward) ────────────────────
  const armGeo  = new THREE.CapsuleGeometry(0.09, 0.44, 4, 10);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.42, 1.35, 0);
  leftArm.rotation.z = 0.28;
  leftArm.castShadow = true;
  group.add(leftArm);
  add(group, new THREE.SphereGeometry(0.085, 7, 6), skinMat, -0.56, 1.00, 0);

  // ── Right arm — pivot group at shoulder for waving ─────────────────
  // Pivot sits at shoulder position; arm mesh hangs below it.
  // Animate waveArm.rotation.x each frame: Math.sin(t) * 0.45
  // Initial rotation.z raises the arm to roughly horizontal.
  const waveArm = new THREE.Group();
  waveArm.position.set(0.42, 1.66, 0);
  waveArm.rotation.z = -Math.PI * 0.55;  // arm raised outward (~horizontal)
  group.add(waveArm);

  const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
  rightArmMesh.position.set(0, -0.30, 0);
  rightArmMesh.castShadow = true;
  waveArm.add(rightArmMesh);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 6), skinMat);
  rightHand.position.set(0, -0.62, 0);
  rightHand.castShadow = true;
  waveArm.add(rightHand);

  // ── Legs ─────────────────────────────────────────────────────────────
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.58, 4, 10);
  add(group, legGeo, pantsMat, -0.15, 0.49, 0);
  add(group, legGeo, pantsMat,  0.15, 0.49, 0);

  group.userData.isNPC   = true;
  group.userData.npcType = npcType;
  group.userData.waveArm = waveArm;

  return group;
}
