import * as THREE from 'three';

export const CHARACTERS = {
  boy: {
    name: 'Alex',
    hebrew: 'בחור רציני, מהיר וחזק. אוהב הרפתקאות ותמיד מוכן לפעולה.',
    height: '1.75m',
    personality: 'נועז',
    skin: '#FFCC99',
    shirt: '#2196F3',
    pants: '#333',
    shoes: '#5D4037',
    hair: '#5D4037',
    hairStyle: 'normal',
    eyeColor: '#1a1a1a'
  },
  girl: {
    name: 'Maya',
    hebrew: 'חכמה ויצירתית. מומחית באסטרטגיה ותמיד צעד אחד קדימה.',
    height: '1.68m',
    personality: 'חכמה',
    skin: '#FFCC99',
    shirt: '#E91E63',
    pants: '#9C27B0',
    shoes: '#E91E63',
    hair: '#FFD700',
    hairStyle: 'long',
    eyeColor: '#1a1a1a'
  },
  zombie: {
    name: 'Zed',
    hebrew: 'מסתורי ומפחיד. כוחו עצום אך שולט בו לטובה.',
    height: '1.80m',
    personality: 'מסתורי',
    skin: '#7CB87C',
    shirt: '#666',
    pants: '#444',
    shoes: '#333',
    hair: '#333',
    hairStyle: 'messy',
    eyeColor: '#ff0000'
  },
  demon: {
    name: 'Kael',
    hebrew: 'שד אש עתיק. מהיר כברק ועוצמתי מכולם.',
    height: '1.85m',
    personality: 'עצמתי',
    skin: '#CC0000',
    shirt: '#8B0000',
    pants: '#4a0000',
    shoes: '#222',
    hair: '#000',
    hairStyle: 'horns',
    eyeColor: '#ff6600'
  },
  robot: {
    name: 'R-7',
    hebrew: 'רובוט מהדור הבא. מדויק, חכם ובלתי ניתן לעצירה.',
    height: '1.90m',
    personality: 'מדויק',
    skin: '#90A4AE',
    shirt: '#455A64',
    pants: '#37474F',
    shoes: '#263238',
    hair: '#78909C',
    hairStyle: 'antenna',
    eyeColor: '#00E5FF'
  }
};

export function buildCharacter(type, options = {}) {
  const config = { ...CHARACTERS[type], ...options };
  const charGroup = new THREE.Group();
  charGroup.name = `character_${type}`;

  const parts = {};

  // ROBLOX-STYLE PROPORTIONS
  // Origin at feet (Y=0)
  // Total height ~3.13m (will be scaled to 1.8m in playerCharacterLoader)

  // ══════════════════════════════════════════════════════════════════════
  // LEGS - Left leg at X=-0.22, Right leg at X=0.22
  // ══════════════════════════════════════════════════════════════════════

  const pantsMat = new THREE.MeshStandardMaterial({ color: config.pants });
  const shoeMat = new THREE.MeshStandardMaterial({ color: config.shoes });

  // Shoes (Y = 0.1, height 0.2)
  const shoeGeo = new THREE.BoxGeometry(0.18, 0.2, 0.24);

  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.22, 0.1, 0.03);
  leftShoe.castShadow = true;
  leftShoe.receiveShadow = true;
  charGroup.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.22, 0.1, 0.03);
  rightShoe.castShadow = true;
  rightShoe.receiveShadow = true;
  charGroup.add(rightShoe);

  // Shins (Y = 0.35, height 0.5)
  const shinGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16);

  const leftShin = new THREE.Mesh(shinGeo, pantsMat);
  leftShin.position.set(-0.22, 0.35, 0);
  leftShin.castShadow = true;
  leftShin.receiveShadow = true;
  parts.leftShin = leftShin;
  charGroup.add(leftShin);

  const rightShin = new THREE.Mesh(shinGeo, pantsMat);
  rightShin.position.set(0.22, 0.35, 0);
  rightShin.castShadow = true;
  rightShin.receiveShadow = true;
  parts.rightShin = rightShin;
  charGroup.add(rightShin);

  // Knees (Y = 0.62, radius 0.18)
  const kneeGeo = new THREE.SphereGeometry(0.18, 12, 12);

  const leftKnee = new THREE.Mesh(kneeGeo, pantsMat);
  leftKnee.position.set(-0.22, 0.62, 0);
  leftKnee.castShadow = true;
  leftKnee.receiveShadow = true;
  charGroup.add(leftKnee);

  const rightKnee = new THREE.Mesh(kneeGeo, pantsMat);
  rightKnee.position.set(0.22, 0.62, 0);
  rightKnee.castShadow = true;
  rightKnee.receiveShadow = true;
  charGroup.add(rightKnee);

  // Thighs (Y = 0.85, height 0.5)
  const thighGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);

  const leftThigh = new THREE.Mesh(thighGeo, pantsMat);
  leftThigh.position.set(-0.22, 0.85, 0);
  leftThigh.castShadow = true;
  leftThigh.receiveShadow = true;
  parts.leftThigh = leftThigh;
  charGroup.add(leftThigh);

  const rightThigh = new THREE.Mesh(thighGeo, pantsMat);
  rightThigh.position.set(0.22, 0.85, 0);
  rightThigh.castShadow = true;
  rightThigh.receiveShadow = true;
  parts.rightThigh = rightThigh;
  charGroup.add(rightThigh);

  // ══════════════════════════════════════════════════════════════════════
  // TORSO GROUP (positioned at torso center Y=1.65)
  // ══════════════════════════════════════════════════════════════════════

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 1.65;
  parts.bodyGroup = bodyGroup;

  // Hips (small connector, Y offset from torso center)
  const hipsGeo = new THREE.BoxGeometry(0.5, 0.22, 0.28);
  const pantsMat2 = new THREE.MeshStandardMaterial({ color: config.pants });
  const hips = new THREE.Mesh(hipsGeo, pantsMat2);
  hips.position.y = -0.47; // 1.65 - 0.47 = 1.18 (world Y)
  hips.castShadow = true;
  hips.receiveShadow = true;
  bodyGroup.add(hips);

  // Torso (Y = 0 relative to bodyGroup, which is at 1.65)
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.85, 0.3);
  const torsoMat = new THREE.MeshStandardMaterial({ color: config.shirt });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  parts.torso = torso;
  bodyGroup.add(torso);

  // Robot chest panel
  if (type === 'robot') {
    const panelGeo = new THREE.BoxGeometry(0.35, 0.5, 0.02);
    const panelMat = new THREE.MeshStandardMaterial({
      color: '#263238',
      metalness: 0.8,
      roughness: 0.2
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.z = 0.16;
    panel.castShadow = true;
    bodyGroup.add(panel);

    // LEDs
    const ledGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const ledMat = new THREE.MeshStandardMaterial({
      color: config.eyeColor,
      emissive: config.eyeColor,
      emissiveIntensity: 0.7
    });

    const led1 = new THREE.Mesh(ledGeo, ledMat);
    led1.position.set(-0.08, 0.15, 0.18);
    led1.castShadow = true;
    bodyGroup.add(led1);

    const led2 = new THREE.Mesh(ledGeo, ledMat);
    led2.position.set(0.08, 0.15, 0.18);
    led2.castShadow = true;
    bodyGroup.add(led2);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ARMS - pivot from shoulder level (Y=2.05 in world = +0.4 from bodyGroup)
  // ══════════════════════════════════════════════════════════════════════

  const armMat = new THREE.MeshStandardMaterial({ color: config.shirt });
  const skinMat = new THREE.MeshStandardMaterial({ color: config.skin });

  // Shoulders (Y offset +0.4 from bodyGroup center)
  const shoulderY = 0.4;

  // Upper arms (shorter and chunkier for Roblox style)
  const upperArmGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);

  const leftUpperArm = new THREE.Mesh(upperArmGeo, armMat);
  leftUpperArm.position.set(-0.35, shoulderY - 0.2, 0);
  leftUpperArm.castShadow = true;
  leftUpperArm.receiveShadow = true;
  parts.leftUpperArm = leftUpperArm;
  bodyGroup.add(leftUpperArm);

  const rightUpperArm = new THREE.Mesh(upperArmGeo, armMat);
  rightUpperArm.position.set(0.35, shoulderY - 0.2, 0);
  rightUpperArm.castShadow = true;
  rightUpperArm.receiveShadow = true;
  parts.rightUpperArm = rightUpperArm;
  bodyGroup.add(rightUpperArm);

  // Elbows
  const elbowGeo = new THREE.SphereGeometry(0.09, 10, 10);

  const leftElbow = new THREE.Mesh(elbowGeo, skinMat);
  leftElbow.position.set(-0.35, shoulderY - 0.42, 0);
  leftElbow.castShadow = true;
  leftElbow.receiveShadow = true;
  bodyGroup.add(leftElbow);

  const rightElbow = new THREE.Mesh(elbowGeo, skinMat);
  rightElbow.position.set(0.35, shoulderY - 0.42, 0);
  rightElbow.castShadow = true;
  rightElbow.receiveShadow = true;
  bodyGroup.add(rightElbow);

  // Forearms
  const forearmGeo = new THREE.BoxGeometry(0.13, 0.35, 0.13);

  const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
  leftForearm.position.set(-0.35, shoulderY - 0.6, 0);
  leftForearm.castShadow = true;
  leftForearm.receiveShadow = true;
  parts.leftForearm = leftForearm;
  bodyGroup.add(leftForearm);

  const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
  rightForearm.position.set(0.35, shoulderY - 0.6, 0);
  rightForearm.castShadow = true;
  rightForearm.receiveShadow = true;
  parts.rightForearm = rightForearm;
  bodyGroup.add(rightForearm);

  // Hands
  const handGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);

  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.set(-0.35, shoulderY - 0.82, 0);
  leftHand.castShadow = true;
  leftHand.receiveShadow = true;
  parts.leftHand = leftHand;
  bodyGroup.add(leftHand);

  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.set(0.35, shoulderY - 0.82, 0);
  rightHand.castShadow = true;
  rightHand.receiveShadow = true;
  parts.rightHand = rightHand;
  bodyGroup.add(rightHand);

  charGroup.add(bodyGroup);

  // ══════════════════════════════════════════════════════════════════════
  // HEAD GROUP (Y = 2.38)
  // ══════════════════════════════════════════════════════════════════════

  const headGroup = new THREE.Group();
  headGroup.position.y = 2.38;
  parts.headGroup = headGroup;

  // Neck (Y = 2.1, small cylinder connecting body to head)
  const neckGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12);
  const neckMat = new THREE.MeshStandardMaterial({ color: config.skin });
  const neck = new THREE.Mesh(neckGeo, neckMat);
  neck.position.y = -0.28; // 2.38 - 0.28 = 2.1
  neck.castShadow = true;
  neck.receiveShadow = true;
  headGroup.add(neck);

  // Head (slightly large - Roblox style)
  const headGeo = new THREE.BoxGeometry(0.78, 0.75, 0.78);
  const headMat = new THREE.MeshStandardMaterial({ color: config.skin });
  const head = new THREE.Mesh(headGeo, headMat);
  head.castShadow = true;
  head.receiveShadow = true;
  parts.head = head;
  headGroup.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const eyeMat = new THREE.MeshStandardMaterial({ color: config.eyeColor });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.18, 0.08, 0.39);
  leftEye.castShadow = true;
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.18, 0.08, 0.39);
  rightEye.castShadow = true;
  headGroup.add(rightEye);

  // Mouth
  const mouthGeo = new THREE.BoxGeometry(0.22, 0.04, 0.02);
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#000000' });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.position.set(0, -0.15, 0.39);
  mouth.castShadow = true;
  headGroup.add(mouth);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const earMat = new THREE.MeshStandardMaterial({ color: config.skin });

  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-0.42, 0, 0);
  leftEar.scale.z = 0.5;
  leftEar.castShadow = true;
  headGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(0.42, 0, 0);
  rightEar.scale.z = 0.5;
  rightEar.castShadow = true;
  headGroup.add(rightEar);

  // Hair styles (sits directly on top of head)
  if (config.hairStyle === 'normal') {
    const hairGeo = new THREE.BoxGeometry(0.8, 0.18, 0.8);
    const hairMat = new THREE.MeshStandardMaterial({ color: config.hair });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.465; // Sits on top of head
    hair.castShadow = true;
    headGroup.add(hair);
  } else if (config.hairStyle === 'long') {
    const hairMat = new THREE.MeshStandardMaterial({ color: config.hair });

    // Top
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), hairMat);
    hairTop.position.y = 0.465;
    hairTop.castShadow = true;
    headGroup.add(hairTop);

    // Sides
    const leftHair = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.6), hairMat);
    leftHair.position.set(-0.43, 0, 0);
    leftHair.castShadow = true;
    headGroup.add(leftHair);

    const rightHair = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.6), hairMat);
    rightHair.position.set(0.43, 0, 0);
    rightHair.castShadow = true;
    headGroup.add(rightHair);

    // Back
    const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.08), hairMat);
    backHair.position.set(0, 0, -0.43);
    backHair.castShadow = true;
    headGroup.add(backHair);
  } else if (config.hairStyle === 'messy') {
    const hairMat = new THREE.MeshStandardMaterial({ color: config.hair });
    for (let i = 0; i < 6; i++) {
      const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), hairMat);
      chunk.position.set(
        (Math.random() - 0.5) * 0.6,
        0.4 + Math.random() * 0.2,
        (Math.random() - 0.5) * 0.6
      );
      chunk.rotation.set(Math.random(), Math.random(), Math.random());
      chunk.castShadow = true;
      headGroup.add(chunk);
    }
  } else if (config.hairStyle === 'horns') {
    const hornGeo = new THREE.ConeGeometry(0.12, 0.35, 10);
    const hornMat = new THREE.MeshStandardMaterial({ color: '#8B0000' });

    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-0.25, 0.5, 0);
    leftHorn.rotation.z = -0.3;
    leftHorn.castShadow = true;
    headGroup.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    rightHorn.position.set(0.25, 0.5, 0);
    rightHorn.rotation.z = 0.3;
    rightHorn.castShadow = true;
    headGroup.add(rightHorn);
  } else if (config.hairStyle === 'antenna') {
    const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const antennaMat = new THREE.MeshStandardMaterial({ color: config.hair });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = 0.6;
    antenna.castShadow = true;
    headGroup.add(antenna);

    const lightGeo = new THREE.SphereGeometry(0.06, 10, 10);
    const lightMat = new THREE.MeshStandardMaterial({
      color: config.eyeColor,
      emissive: config.eyeColor,
      emissiveIntensity: 0.6
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.y = 0.82;
    light.castShadow = true;
    headGroup.add(light);
  }

  // Special zombie feature
  if (type === 'zombie') {
    const toothGeo = new THREE.BoxGeometry(0.05, 0.1, 0.03);
    const toothMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
    const tooth = new THREE.Mesh(toothGeo, toothMat);
    tooth.position.set(0.06, -0.22, 0.39);
    tooth.castShadow = true;
    headGroup.add(tooth);
  }

  // Special demon ears
  if (type === 'demon') {
    const demonEarGeo = new THREE.ConeGeometry(0.1, 0.25, 10);
    const demonEarMat = new THREE.MeshStandardMaterial({ color: config.skin });

    const leftDemonEar = new THREE.Mesh(demonEarGeo, demonEarMat);
    leftDemonEar.position.set(-0.42, 0.1, 0);
    leftDemonEar.rotation.z = -Math.PI / 2;
    leftDemonEar.castShadow = true;
    headGroup.add(leftDemonEar);

    const rightDemonEar = new THREE.Mesh(demonEarGeo, demonEarMat);
    rightDemonEar.position.set(0.42, 0.1, 0);
    rightDemonEar.rotation.z = Math.PI / 2;
    rightDemonEar.castShadow = true;
    headGroup.add(rightDemonEar);
  }

  charGroup.add(headGroup);

  charGroup.userData.parts = parts;
  charGroup.userData.type = type;
  charGroup.userData.config = config;

  return charGroup;
}

export function animateCharacter(charGroup, animType, t, delta) {
  if (!charGroup || !charGroup.userData.parts) return;

  const parts = charGroup.userData.parts;

  switch (animType) {
    case 'idle':
      // Subtle body bob
      parts.bodyGroup.position.y = 1.65 + Math.sin(t * 2) * 0.02;
      parts.headGroup.position.y = 2.38 + Math.sin(t * 2) * 0.015;

      // Slight arm sway
      parts.leftUpperArm.rotation.x = Math.sin(t * 1.5) * 0.1;
      parts.rightUpperArm.rotation.x = Math.sin(t * 1.5 + Math.PI) * 0.1;
      break;

    case 'walk':
      const walkSpeed = t * 4;

      // Body bob
      parts.bodyGroup.position.y = 1.65 + Math.abs(Math.sin(walkSpeed)) * 0.05;
      parts.headGroup.position.y = 2.38 + Math.abs(Math.sin(walkSpeed)) * 0.04;

      // Arms swing opposite
      parts.leftUpperArm.rotation.x = Math.sin(walkSpeed) * 0.5;
      parts.rightUpperArm.rotation.x = Math.sin(walkSpeed + Math.PI) * 0.5;

      // Legs swing
      parts.leftThigh.rotation.x = Math.sin(walkSpeed) * 0.5;
      parts.rightThigh.rotation.x = Math.sin(walkSpeed + Math.PI) * 0.5;
      parts.leftShin.rotation.x = Math.max(0, Math.sin(walkSpeed) * 0.3);
      parts.rightShin.rotation.x = Math.max(0, Math.sin(walkSpeed + Math.PI) * 0.3);
      break;

    case 'run':
      const runSpeed = t * 7;

      // Body bob and lean
      parts.bodyGroup.position.y = 1.65 + Math.abs(Math.sin(runSpeed)) * 0.08;
      parts.bodyGroup.rotation.x = 0.2;
      parts.headGroup.position.y = 2.38 + Math.abs(Math.sin(runSpeed)) * 0.06;

      // Arms swing faster
      parts.leftUpperArm.rotation.x = Math.sin(runSpeed) * 0.8;
      parts.rightUpperArm.rotation.x = Math.sin(runSpeed + Math.PI) * 0.8;

      // Legs swing faster
      parts.leftThigh.rotation.x = Math.sin(runSpeed) * 0.7;
      parts.rightThigh.rotation.x = Math.sin(runSpeed + Math.PI) * 0.7;
      parts.leftShin.rotation.x = Math.max(0, Math.sin(runSpeed) * 0.6);
      parts.rightShin.rotation.x = Math.max(0, Math.sin(runSpeed + Math.PI) * 0.6);
      break;

    case 'jump':
      const jumpPhase = Math.sin(t * 3);

      // Body lifts
      parts.bodyGroup.position.y = 1.65 + Math.max(0, jumpPhase) * 0.5;
      parts.headGroup.position.y = 2.38 + Math.max(0, jumpPhase) * 0.5;

      // Arms raise
      parts.leftUpperArm.rotation.x = -Math.abs(jumpPhase) * 0.8;
      parts.rightUpperArm.rotation.x = -Math.abs(jumpPhase) * 0.8;

      // Legs tuck
      parts.leftThigh.rotation.x = Math.abs(jumpPhase) * 1.2;
      parts.rightThigh.rotation.x = Math.abs(jumpPhase) * 1.2;
      parts.leftShin.rotation.x = Math.abs(jumpPhase) * 1.5;
      parts.rightShin.rotation.x = Math.abs(jumpPhase) * 1.5;
      break;

    case 'sit':
      // Legs rotate forward
      parts.leftThigh.rotation.x = Math.PI / 2;
      parts.rightThigh.rotation.x = Math.PI / 2;
      parts.leftShin.rotation.x = -Math.PI / 3;
      parts.rightShin.rotation.x = -Math.PI / 3;

      // Body lowers
      parts.bodyGroup.position.y = 1.2;
      parts.headGroup.position.y = 2.0;

      // Arms rest
      parts.leftUpperArm.rotation.x = 0.2;
      parts.rightUpperArm.rotation.x = 0.2;
      break;

    case 'dance':
      const danceSpeed = t * 3;

      // Body sways
      parts.bodyGroup.rotation.y = Math.sin(danceSpeed) * 0.3;
      parts.bodyGroup.position.y = 1.65 + Math.abs(Math.sin(danceSpeed * 2)) * 0.1;
      parts.headGroup.position.y = 2.38 + Math.abs(Math.sin(danceSpeed * 2)) * 0.08;

      // Arms swing widely
      parts.leftUpperArm.rotation.x = Math.sin(danceSpeed) * 1.2;
      parts.leftUpperArm.rotation.z = Math.sin(danceSpeed * 0.5) * 0.5;
      parts.rightUpperArm.rotation.x = Math.sin(danceSpeed + Math.PI) * 1.2;
      parts.rightUpperArm.rotation.z = -Math.sin(danceSpeed * 0.5) * 0.5;

      // Alternating legs
      parts.leftThigh.rotation.x = Math.max(0, Math.sin(danceSpeed) * 0.3);
      parts.rightThigh.rotation.x = Math.max(0, Math.sin(danceSpeed + Math.PI) * 0.3);
      break;

    case 'attack':
      const attackPhase = (t * 4) % (Math.PI * 2);

      if (attackPhase < Math.PI / 2) {
        // Wind-up
        const windUp = attackPhase / (Math.PI / 2);
        parts.rightUpperArm.rotation.x = -windUp * 1.5;
        parts.rightUpperArm.rotation.z = windUp * 0.5;
        parts.bodyGroup.rotation.y = -windUp * 0.3;
      } else if (attackPhase < Math.PI) {
        // Strike
        const strike = (attackPhase - Math.PI / 2) / (Math.PI / 2);
        parts.rightUpperArm.rotation.x = -1.5 + strike * 2.5;
        parts.rightUpperArm.rotation.z = 0.5;
        parts.bodyGroup.rotation.y = -0.3 + strike * 0.5;
      } else {
        // Recover
        const recover = (attackPhase - Math.PI) / Math.PI;
        parts.rightUpperArm.rotation.x = 1.0 - recover * 1.0;
        parts.rightUpperArm.rotation.z = 0.5 - recover * 0.5;
        parts.bodyGroup.rotation.y = 0.2 - recover * 0.2;
      }
      break;

    default:
      // Reset to neutral pose
      parts.bodyGroup.position.y = 1.65;
      parts.bodyGroup.rotation.x = 0;
      parts.bodyGroup.rotation.y = 0;
      parts.headGroup.position.y = 2.38;
      parts.leftUpperArm.rotation.x = 0;
      parts.rightUpperArm.rotation.x = 0;
      parts.leftUpperArm.rotation.z = 0;
      parts.rightUpperArm.rotation.z = 0;
      parts.leftThigh.rotation.x = 0;
      parts.rightThigh.rotation.x = 0;
      parts.leftShin.rotation.x = 0;
      parts.rightShin.rotation.x = 0;
  }
}
