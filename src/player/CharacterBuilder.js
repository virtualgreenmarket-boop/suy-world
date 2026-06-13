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

  // Store ALL parts including groups for animation
  charGroup.userData.parts = {
    headG: headGroup,
    bodyG: bodyGroup,
    lArmG: leftUpperArm,
    rArmG: rightUpperArm,
    lLegG: leftThigh,
    rLegG: rightThigh,
    ...parts
  };
  charGroup.userData.type = type;
  charGroup.userData.config = config;

  // Scale up character by 50%
  charGroup.scale.setScalar(1.5);

  return charGroup;
}

export function animateCharacter(charGroup, animType, t, delta) {
  if (!charGroup || !charGroup.userData.parts) return;

  const { headG, bodyG, lArmG, rArmG, lLegG, rLegG } = charGroup.userData.parts;

  // Reset all transforms to default before applying animation
  charGroup.position.y = 0;
  bodyG.position.y = 1.65;
  bodyG.rotation.x = 0;
  bodyG.rotation.y = 0;
  bodyG.rotation.z = 0;
  bodyG.scale.set(1, 1, 1);
  headG.position.y = 2.38;
  headG.rotation.z = 0;
  lArmG.rotation.x = 0;
  rArmG.rotation.x = 0;
  lArmG.rotation.z = 0;
  rArmG.rotation.z = 0;
  lLegG.rotation.x = 0;
  rLegG.rotation.x = 0;

  switch (animType) {
    case 'idle':
      // Gentle breathing
      bodyG.scale.y = 1 + Math.sin(t * 1.5) * 0.03;
      charGroup.position.y = Math.sin(t * 1.2) * 0.04;
      lArmG.rotation.z = 0.15 + Math.sin(t * 1.2) * 0.05;
      rArmG.rotation.z = -0.15 - Math.sin(t * 1.2) * 0.05;
      break;

    case 'walk':
      // Exaggerated steps
      lArmG.rotation.x = Math.sin(t * 2.8) * 0.9;
      rArmG.rotation.x = -Math.sin(t * 2.8) * 0.9;
      lLegG.rotation.x = -Math.sin(t * 2.8) * 0.75;
      rLegG.rotation.x = Math.sin(t * 2.8) * 0.75;
      charGroup.position.y = Math.abs(Math.sin(t * 2.8)) * 0.18;
      bodyG.rotation.z = Math.sin(t * 2.8) * 0.08;
      break;

    case 'run':
      // Very fast and leaning
      lArmG.rotation.x = Math.sin(t * 5) * 1.3;
      rArmG.rotation.x = -Math.sin(t * 5) * 1.3;
      lLegG.rotation.x = -Math.sin(t * 5) * 1.1;
      rLegG.rotation.x = Math.sin(t * 5) * 1.1;
      charGroup.position.y = Math.abs(Math.sin(t * 5)) * 0.25;
      bodyG.rotation.x = -0.3;
      break;

    case 'jump':
      // Clear tuck and land
      const jt = (Math.sin(t * 2) + 1) / 2;
      charGroup.position.y = jt * 1.4;
      lLegG.rotation.x = -jt * 0.8;
      rLegG.rotation.x = -jt * 0.8;
      lArmG.rotation.x = -jt * 1.0;
      rArmG.rotation.x = -jt * 1.0;
      break;

    case 'sit':
      // Legs rotate forward
      lLegG.rotation.x = Math.PI / 2;
      rLegG.rotation.x = Math.PI / 2;

      // Body lowers
      bodyG.position.y = 1.2;
      headG.position.y = 2.0;

      // Arms rest
      lArmG.rotation.x = 0.2;
      rArmG.rotation.x = 0.2;
      break;

    case 'dance':
      // Very visible dance moves
      const s = Math.sin(t * 3.5);
      const s2 = Math.sin(t * 3.5 + Math.PI);
      charGroup.position.y = Math.abs(Math.sin(t * 3.5)) * 0.3;
      bodyG.rotation.z = s * 0.35;
      bodyG.rotation.x = Math.sin(t * 7) * 0.15;
      headG.rotation.z = -s * 0.2;
      lArmG.rotation.x = Math.sin(t * 3.5) * 1.2;
      rArmG.rotation.x = -Math.sin(t * 3.5) * 1.2;
      lArmG.rotation.z = 0.4 + Math.sin(t * 3.5) * 0.6;
      rArmG.rotation.z = -0.4 - Math.sin(t * 3.5) * 0.6;
      lLegG.rotation.x = s * 0.5;
      rLegG.rotation.x = s2 * 0.5;
      break;

    case 'attack':
      // Fast and powerful sword swing
      const phase = (t % 2.5);
      if (phase < 0.4) {
        // Wind up
        rArmG.rotation.x = -1.8;
        rArmG.rotation.z = -0.5;
        bodyG.rotation.z = 0.25;
      } else if (phase < 0.7) {
        // Strike - fast
        const p = (phase - 0.4) / 0.3;
        rArmG.rotation.x = -1.8 + p * 3.2;
        bodyG.rotation.z = 0.25 - p * 0.5;
        charGroup.position.y = p * 0.15;
      } else {
        // Recover
        rArmG.rotation.x = 0.9;
        bodyG.rotation.z = -0.1;
        charGroup.position.y = 0;
      }
      lArmG.rotation.z = 0.3;
      break;

    default:
      // Already reset at the start of function
      break;
  }
}
