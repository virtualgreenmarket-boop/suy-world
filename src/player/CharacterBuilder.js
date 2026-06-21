import * as THREE from 'three';

const M = (c, r=0.7, m=0.05) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});

function B(w,h,d,mat) { const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); x.castShadow=true; return x; }
function S(r,mat) { const x=new THREE.Mesh(new THREE.SphereGeometry(r,10,10),mat); x.castShadow=true; return x; }
function CY(rt,rb,h,mat) { const x=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,10),mat); x.castShadow=true; return x; }
function P(mesh,x,y,z) { mesh.position.set(x,y,z); return mesh; }

export const CHARACTERS = {
  boy:   { name:'Alex',  hebrew:'בחור רציני, מהיר וחזק. אוהב הרפתקאות ותמיד מוכן לפעולה.', height:'1.75m', personality:'נועז',   skin:'#FFCC99', shirt:'#2196F3', pants:'#333',    shoes:'#5D4037', hair:'#5D4037', hairStyle:'normal',   eyeColor:'#1a1a1a' },
  girl:  { name:'Maya',  hebrew:'חכמה ויצירתית. מומחית באסטרטגיה ותמיד צעד אחד קדימה.',    height:'1.68m', personality:'חכמה',   skin:'#FFCC99', shirt:'#E91E63', pants:'#9C27B0', shoes:'#E91E63', hair:'#FFD700', hairStyle:'long',     eyeColor:'#1a1a1a' },
  zombie:{ name:'Zed',   hebrew:'מסתורי ומפחיד. כוחו עצום אך שולט בו לטובה.',             height:'1.80m', personality:'מסתורי', skin:'#7CB87C', shirt:'#666',    pants:'#444',    shoes:'#333',    hair:'#333',    hairStyle:'messy',    eyeColor:'#ff0000' },
  demon: { name:'Kael',  hebrew:'שד אש עתיק. מהיר כברק ועוצמתי מכולם.',                   height:'1.85m', personality:'עצמתי',  skin:'#CC0000', shirt:'#8B0000', pants:'#4a0000', shoes:'#222',    hair:'#000',    hairStyle:'horns',    eyeColor:'#ff6600' },
  robot: { name:'R-7',   hebrew:'רובוט מהדור הבא. מדויק, חכם ובלתי ניתן לעצירה.',          height:'1.90m', personality:'מדויק',  skin:'#90A4AE', shirt:'#455A64', pants:'#37474F', shoes:'#263238', hair:'#78909C', hairStyle:'antenna',  eyeColor:'#00E5FF' },
};

export function buildCharacter(type, overrideColors = {}) {
  const ch = CHARACTERS[type] || CHARACTERS.boy;
  const c = {...ch, ...overrideColors};

  const skin=M(c.skin), shirt=M(c.shirt), pants=M(c.pants),
        shoes=M(c.shoes,0.9,0), hairM=M(c.hair), eyeM=M(c.eyeColor), white=M('#fff');

  const group = new THREE.Group();
  const parts = {};

  // HEAD
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 2.42, 0);
  parts.headG.add(B(0.78,0.78,0.78,skin));

  // Hair
  if(c.hairStyle === 'normal') {
    parts.headG.add(P(B(0.8,0.22,0.8,hairM), 0,0.46,0));
    parts.headG.add(P(B(0.8,0.3,0.14,hairM), 0,0.38,0.36));
  } else if(c.hairStyle === 'long') {
    parts.headG.add(P(B(0.8,0.22,0.8,hairM), 0,0.46,0));
    parts.headG.add(P(B(0.2,0.9,0.15,hairM), -0.38,-0.2,-0.1));
    parts.headG.add(P(B(0.2,0.9,0.15,hairM), 0.38,-0.2,-0.1));
    parts.headG.add(P(B(0.6,0.85,0.15,hairM), 0,-0.2,-0.42));
  } else if(c.hairStyle === 'messy') {
    parts.headG.add(P(B(0.9,0.25,0.9,hairM), 0,0.44,0));
    const s1=B(0.18,0.25,0.18,hairM); s1.position.set(-0.25,0.62,0.1); s1.rotation.z=0.3; parts.headG.add(s1);
    const s2=B(0.18,0.22,0.18,hairM); s2.position.set(0.2,0.65,-0.05); s2.rotation.z=-0.2; parts.headG.add(s2);
  } else if(c.hairStyle === 'horns') {
    const h1=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.55,8),M('#8B0000')); h1.castShadow=true;
    h1.position.set(-0.28,0.7,0); h1.rotation.z=0.25; parts.headG.add(h1);
    const h2=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.55,8),M('#8B0000')); h2.castShadow=true;
    h2.position.set(0.28,0.7,0); h2.rotation.z=-0.25; parts.headG.add(h2);
  } else if(c.hairStyle === 'antenna') {
    parts.headG.add(P(B(0.84,0.15,0.84,hairM), 0,0.44,0));
    parts.headG.add(P(CY(0.03,0.03,0.5,hairM), 0,0.7,0));
    const ball=S(0.09,M('#00E5FF',0.3,0.8)); ball.position.set(0,0.97,0); parts.headG.add(ball);
  }

  // Eyes (with names for emotion system)
  const eyeWhiteL = P(B(0.17,0.17,0.04,white), -0.17,0.05,0.39);
  eyeWhiteL.name = 'eyeWhiteL';
  parts.headG.add(eyeWhiteL);

  const eyeL = P(B(0.09,0.09,0.06,eyeM), -0.17,0.05,0.42);
  eyeL.name = 'eyeL';
  parts.headG.add(eyeL);

  const eyeWhiteR = P(B(0.17,0.17,0.04,white), 0.17,0.05,0.39);
  eyeWhiteR.name = 'eyeWhiteR';
  parts.headG.add(eyeWhiteR);

  const eyeR = P(B(0.09,0.09,0.06,eyeM), 0.17,0.05,0.42);
  eyeR.name = 'eyeR';
  parts.headG.add(eyeR);

  const mouth = P(B(0.26,0.07,0.04,M(type==='zombie'?'#228B22':type==='demon'?'#FF6600':'#8B4513')), 0,-0.2,0.41);
  mouth.name = 'mouth';
  parts.headG.add(mouth);

  if(type==='zombie') parts.headG.add(P(B(0.07,0.1,0.05,white), 0.06,-0.19,0.43));
  parts.headG.add(P(CY(0.13,0.15,0.16,skin), 0,-0.47,0));

  // Ears
  parts.headG.add(P(B(0.1,0.25,0.2,skin), -0.46,0,0));
  parts.headG.add(P(B(0.1,0.25,0.2,skin),  0.46,0,0));
  if(type==='demon') {
    const eL=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.25,6),M('#CC0000')); eL.castShadow=true;
    eL.position.set(-0.48,0.22,0); eL.rotation.z=0.4; parts.headG.add(eL);
    const eR=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.25,6),M('#CC0000')); eR.castShadow=true;
    eR.position.set(0.48,0.22,0); eR.rotation.z=-0.4; parts.headG.add(eR);
  }
  group.add(parts.headG);

  // BODY
  parts.bodyG = new THREE.Group();
  parts.bodyG.position.set(0, 1.62, 0);
  parts.bodyG.add(B(0.9,0.9,0.5,shirt));
  parts.bodyG.add(P(B(0.88,0.22,0.48,pants), 0,-0.56,0));
  if(type==='robot') {
    parts.bodyG.add(P(B(0.35,0.3,0.1,M('#546E7A')), 0,0.1,0.28));
    const led1=S(0.06,M('#00E5FF',0.3,0.9)); led1.position.set(-0.1,0.1,0.34); parts.bodyG.add(led1);
    const led2=S(0.06,M('#00E5FF',0.3,0.9)); led2.position.set(0.1,0.1,0.34); parts.bodyG.add(led2);
  }

  // LEFT ARM (reduced by 10% for Issue 3)
  parts.lArmG = new THREE.Group();
  parts.lArmG.position.set(-0.55, 0.42, 0);
  parts.lArmG.add(S(0.18, shirt));
  parts.lArmG.add(P(B(0.252,0.414,0.252,shirt), 0,-0.28,0));
  parts.lElbowG = new THREE.Group();
  parts.lElbowG.position.set(0,-0.52,0);
  parts.lElbowG.add(S(0.1395,skin));
  parts.lElbowG.add(P(B(0.216,0.378,0.216,skin), 0,-0.26,0));
  parts.lElbowG.add(P(B(0.252,0.171,0.198,skin), 0,-0.62,0));
  parts.lArmG.add(parts.lElbowG);
  parts.bodyG.add(parts.lArmG);

  // RIGHT ARM (reduced by 10% for Issue 3)
  parts.rArmG = new THREE.Group();
  parts.rArmG.position.set(0.55, 0.42, 0);
  parts.rArmG.add(S(0.18, shirt));
  parts.rArmG.add(P(B(0.252,0.414,0.252,shirt), 0,-0.28,0));
  parts.rElbowG = new THREE.Group();
  parts.rElbowG.position.set(0,-0.52,0);
  parts.rElbowG.add(S(0.1395,skin));
  parts.rElbowG.add(P(B(0.216,0.378,0.216,skin), 0,-0.26,0));
  parts.rElbowG.add(P(B(0.252,0.171,0.198,skin), 0,-0.62,0));
  parts.rArmG.add(parts.rElbowG);
  parts.bodyG.add(parts.rArmG);
  group.add(parts.bodyG);

  // LEFT LEG
  parts.lLegG = new THREE.Group();
  parts.lLegG.position.set(-0.22, 1.05, 0);
  parts.lLegG.add(S(0.19,pants));
  parts.lLegG.add(P(B(0.33,0.46,0.33,pants), 0,-0.28,0));
  parts.lKneeG = new THREE.Group();
  parts.lKneeG.position.set(0,-0.52,0);
  parts.lKneeG.add(S(0.17,pants));
  parts.lKneeG.add(P(B(0.29,0.42,0.29,pants), 0,-0.26,0));
  parts.lKneeG.add(P(B(0.35,0.16,0.5,shoes), 0,-0.6,0.05));
  parts.lLegG.add(parts.lKneeG);
  group.add(parts.lLegG);

  // RIGHT LEG
  parts.rLegG = new THREE.Group();
  parts.rLegG.position.set(0.22, 1.05, 0);
  parts.rLegG.add(S(0.19,pants));
  parts.rLegG.add(P(B(0.33,0.46,0.33,pants), 0,-0.28,0));
  parts.rKneeG = new THREE.Group();
  parts.rKneeG.position.set(0,-0.52,0);
  parts.rKneeG.add(S(0.17,pants));
  parts.rKneeG.add(P(B(0.29,0.42,0.29,pants), 0,-0.26,0));
  parts.rKneeG.add(P(B(0.35,0.16,0.5,shoes), 0,-0.6,0.05));
  parts.rLegG.add(parts.rKneeG);
  group.add(parts.rLegG);

  group.userData.parts = parts;
  return group;
}

export function resetPose(group) {
  const P = group.userData.parts;
  if(!P) return;
  P.lArmG.rotation.set(0.3,0,-0.2); P.rArmG.rotation.set(0.3,0,0.2);
  P.lElbowG.rotation.set(0,0,0); P.rElbowG.rotation.set(0,0,0);
  P.lLegG.rotation.set(0,0,0); P.rLegG.rotation.set(0,0,0);
  P.lKneeG.rotation.set(0,0,0); P.rKneeG.rotation.set(0,0,0);
  P.bodyG.rotation.set(0,0,0); P.headG.rotation.set(0,0,0);
  group.position.y = group.userData._groundY || 0;
  P.lLegG.position.set(-0.22,1.05,0); P.rLegG.position.set(0.22,1.05,0);
  P.bodyG.position.set(0,1.62,0); P.headG.position.set(0,2.42,0);
}

// Helper function to add/remove dance smile
function _setDanceSmile(headG, show) {
  // Remove existing dance smile if any
  headG.children = headG.children.filter(c => !c.name?.startsWith('dance_smile_'));

  if (!show) {
    // Restore original mouth visibility
    headG.children.forEach(c => {
      if (c.name === 'mouth') c.visible = true;
    });
    return;
  }

  // Hide original mouth
  headG.children.forEach(c => {
    if (c.name === 'mouth') c.visible = false;
  });

  // Add curved smile (3 boxes forming arc, similar to happy emotion)
  const smileC = B(0.14,0.07,0.04,M('#cc3333'));
  smileC.name='dance_smile_C';
  smileC.position.set(0,-0.22,0.41);
  headG.add(smileC);

  const smileL = B(0.1,0.07,0.04,M('#cc3333'));
  smileL.name='dance_smile_L';
  smileL.position.set(-0.11,-0.19,0.41);
  smileL.rotation.z=0.4;
  headG.add(smileL);

  const smileR = B(0.1,0.07,0.04,M('#cc3333'));
  smileR.name='dance_smile_R';
  smileR.position.set(0.11,-0.19,0.41);
  smileR.rotation.z=-0.4;
  headG.add(smileR);
}

export function animateCharacter(group, animType, t, delta) {
  resetPose(group);
  const p = group.userData.parts;
  if(!p) return;

  // Clear dance smile for non-dance animations
  if (animType !== 'dance') {
    _setDanceSmile(p.headG, false);
  }

  if(animType === 'idle') {
    // No vertical motion in idle - character stays firmly on ground
    p.lArmG.rotation.x = -0.1 + Math.sin(t*0.9)*0.06;
    p.rArmG.rotation.x = -0.1 + -Math.sin(t*0.9)*0.06;
    p.lArmG.rotation.z = -0.2;
    p.rArmG.rotation.z = 0.2;
    p.headG.rotation.z = Math.sin(t*0.7)*0.04;
  }
  else if(animType === 'walk') {
    const s = Math.sin(t*4.2); // 50% faster (2.8 * 1.5 = 4.2)
    p.lArmG.rotation.x = -0.1 + s*0.7;
    p.rArmG.rotation.x = -0.1 + -s*0.7;
    p.lArmG.rotation.z = -0.2;
    p.rArmG.rotation.z = 0.2;
    p.lElbowG.rotation.x = -Math.max(0,-s)*0.5; p.rElbowG.rotation.x = -Math.max(0,s)*0.5;
    p.lLegG.rotation.x = -s*0.65; p.rLegG.rotation.x = s*0.65;
    p.lKneeG.rotation.x = Math.max(0,s)*0.55; p.rKneeG.rotation.x = Math.max(0,-s)*0.55;
    group.position.y = (group.userData._groundY || 0) + Math.abs(s)*0.1-0.02;
    p.bodyG.rotation.z = s*0.05;
  }
  else if(animType === 'run') {
    const s = Math.sin(t*6.75); // 50% faster (4.5 * 1.5 = 6.75)
    p.lArmG.rotation.x = -0.1 + s*1.1;
    p.rArmG.rotation.x = -0.1 + -s*1.1;
    p.lArmG.rotation.z = -0.2;
    p.rArmG.rotation.z = 0.2;
    p.lElbowG.rotation.x = 0.8-Math.max(0,-s)*0.6;
    p.rElbowG.rotation.x = 0.8-Math.max(0,s)*0.6;
    p.lLegG.rotation.x = -s*1.0; p.rLegG.rotation.x = s*1.0;
    p.lKneeG.rotation.x = Math.max(0,s)*0.9; p.rKneeG.rotation.x = Math.max(0,-s)*0.9;
    group.position.y = (group.userData._groundY || 0) + Math.abs(s)*0.18-0.04;
    p.bodyG.rotation.x = -0.22; p.headG.rotation.x = 0.12;
  }
  else if(animType === 'jump') {
    const jt = (Math.sin(t*1.8)+1)/2;
    group.position.y = (group.userData._groundY || 0) + jt*1.1;
    p.lLegG.rotation.x = -jt*0.7; p.rLegG.rotation.x = -jt*0.7;
    p.lKneeG.rotation.x = jt*1.1; p.rKneeG.rotation.x = jt*1.1;
    p.lArmG.rotation.x = -0.1 + -jt*1.0;
    p.rArmG.rotation.x = -0.1 + -jt*1.0;
    p.lArmG.rotation.z = -0.2 + jt*0.5;
    p.rArmG.rotation.z = 0.2 + -jt*0.5;
  }
  else if(animType === 'sit') {
    // Lower body slightly and move forward
    p.bodyG.position.set(0, 1.45, 0.15);
    p.headG.position.set(0, 2.25, 0.05);

    // Bend legs - rotated 180 degrees
    p.lLegG.rotation.x = -1.4; // 180° rotation
    p.rLegG.rotation.x = -1.4;
    p.lKneeG.rotation.x = 1.3; // Bend knees opposite direction
    p.rKneeG.rotation.x = 1.3;

    // Arms forward, resting on legs
    p.lArmG.rotation.x = -0.3;
    p.rArmG.rotation.x = -0.3;
    p.lArmG.rotation.z = -0.15;
    p.rArmG.rotation.z = 0.15;
    p.lElbowG.rotation.x = -0.7; // Bend elbows natural direction, increased from -0.6 to -0.7
    p.rElbowG.rotation.x = -0.7;

    // Slight body lean back
    p.bodyG.rotation.x = -0.15;
  }
  else if(animType === 'dance') {
    const s = Math.sin(t*3.5);
    group.position.y = (group.userData._groundY || 0) + Math.abs(s)*0.18;
    p.bodyG.rotation.z = s*0.28; p.headG.rotation.z = -s*0.18;
    p.lArmG.rotation.x = -0.1 + Math.sin(t*3.5+Math.PI)*1.2;
    p.rArmG.rotation.x = -0.1 + s*1.2;
    p.lArmG.rotation.z = -0.2 + -0.1-Math.abs(s)*0.4;
    p.rArmG.rotation.z = 0.2 + 0.1+Math.abs(s)*0.4;
    p.lElbowG.rotation.x = -Math.abs(s)*0.8; p.rElbowG.rotation.x = -Math.abs(s)*0.8;
    p.lLegG.rotation.x = s*0.45; p.rLegG.rotation.x = -s*0.45;
    p.lKneeG.rotation.x = Math.abs(s)*0.4; p.rKneeG.rotation.x = Math.abs(s)*0.4;
    p.bodyG.rotation.x = Math.sin(t*1.8)*0.15;

    // Add smile during dance
    _setDanceSmile(p.headG, true);
  }
}

// Emotion system
export function setCharacterEmotion(group, emotion) {
  if (!group || !group.userData.parts || !group.userData.parts.headG) return;

  const headG = group.userData.parts.headG;

  // Remove all emotion meshes (prefix 'emo_')
  headG.children = headG.children.filter(child => {
    if (child.name?.startsWith('emo_')) return false;
    return true;
  });

  // Hide original eyes and mouth
  headG.children.forEach(child => {
    if (child.name === 'eyeL' || child.name === 'eyeR' ||
        child.name === 'eyeWhiteL' || child.name === 'eyeWhiteR' ||
        child.name === 'mouth') {
      child.visible = false;
    }
  });

  if (emotion === 'neutral') {
    // Restore original face
    headG.children.forEach(child => {
      if (child.name === 'eyeL' || child.name === 'eyeR' ||
          child.name === 'eyeWhiteL' || child.name === 'eyeWhiteR' ||
          child.name === 'mouth') {
        child.visible = true;
      }
    });
    return;
  }

  // HAPPY — curved smile with teeth
  if (emotion === 'happy') {
    // Eyes: normal
    const eyeWhiteL = B(0.17,0.17,0.04,M('#fff')); eyeWhiteL.name='emo_eyeWhiteL'; eyeWhiteL.position.set(-0.17,0.05,0.39); headG.add(eyeWhiteL);
    const eyeWhiteR = B(0.17,0.17,0.04,M('#fff')); eyeWhiteR.name='emo_eyeWhiteR'; eyeWhiteR.position.set(0.17,0.05,0.39); headG.add(eyeWhiteR);
    const eyeL = B(0.09,0.09,0.06,M('#111')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.17,0.05,0.42); headG.add(eyeL);
    const eyeR = B(0.09,0.09,0.06,M('#111')); eyeR.name='emo_eyeR'; eyeR.position.set(0.17,0.05,0.42); headG.add(eyeR);

    // Curved smile (3 boxes forming arc)
    const smileC = B(0.14,0.07,0.04,M('#cc3333')); smileC.name='emo_smileC'; smileC.position.set(0,-0.22,0.41); headG.add(smileC);
    const smileL = B(0.1,0.07,0.04,M('#cc3333')); smileL.name='emo_smileL'; smileL.position.set(-0.11,-0.19,0.41); smileL.rotation.z=0.4; headG.add(smileL);
    const smileR = B(0.1,0.07,0.04,M('#cc3333')); smileR.name='emo_smileR'; smileR.position.set(0.11,-0.19,0.41); smileR.rotation.z=-0.4; headG.add(smileR);
    // Teeth
    const teeth = B(0.22,0.06,0.04,M('#ffffff')); teeth.name='emo_teeth'; teeth.position.set(0,-0.16,0.41); headG.add(teeth);
  }

  // LOVE — heart-shaped eyes
  else if (emotion === 'love') {
    // Heart function
    function makeHeart(x) {
      const g = new THREE.Group();
      const left  = B(0.1,0.14,0.05,M('#ff0000')); left.position.set(-0.05,0.02,0); left.rotation.z=0.4; g.add(left);
      const right = B(0.1,0.14,0.05,M('#ff0000')); right.position.set(0.05,0.02,0); right.rotation.z=-0.4; g.add(right);
      const bottom = B(0.08,0.1,0.05,M('#ff0000')); bottom.position.set(0,-0.08,0); bottom.rotation.z=0; g.add(bottom);
      g.position.set(x,0.05,0.42);
      g.name = 'emo_heart';
      return g;
    }
    headG.add(makeHeart(-0.17));
    headG.add(makeHeart(0.17));

    // Smile
    const smileC = B(0.14,0.07,0.04,M('#cc3333')); smileC.name='emo_smileC'; smileC.position.set(0,-0.22,0.41); headG.add(smileC);
    const smileL = B(0.1,0.07,0.04,M('#cc3333')); smileL.name='emo_smileL'; smileL.position.set(-0.11,-0.19,0.41); smileL.rotation.z=0.4; headG.add(smileL);
    const smileR = B(0.1,0.07,0.04,M('#cc3333')); smileR.name='emo_smileR'; smileR.position.set(0.11,-0.19,0.41); smileR.rotation.z=-0.4; headG.add(smileR);
  }

  // ANGRY — thick red eyebrows, narrow red eyes
  else if (emotion === 'angry') {
    // Thick angled eyebrows
    const browL = B(0.2,0.07,0.05,M('#8B0000')); browL.name='emo_browL'; browL.position.set(-0.17,0.2,0.41); browL.rotation.z=-0.4; headG.add(browL);
    const browR = B(0.2,0.07,0.05,M('#8B0000')); browR.name='emo_browR'; browR.position.set(0.17,0.2,0.41); browR.rotation.z=0.4; headG.add(browR);
    // Narrow red eyes
    const eyeL = B(0.18,0.06,0.05,M('#cc0000')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.17,0.05,0.41); headG.add(eyeL);
    const eyeR = B(0.18,0.06,0.05,M('#cc0000')); eyeR.name='emo_eyeR'; eyeR.position.set(0.17,0.05,0.41); headG.add(eyeR);
    // Flat angry mouth
    const mouth = B(0.28,0.05,0.04,M('#333')); mouth.name='emo_mouth'; mouth.position.set(0,-0.22,0.41); headG.add(mouth);
  }

  // SAD — drooping eyebrows, downturned mouth
  else if (emotion === 'sad') {
    // Drooping eyebrows
    const browL = B(0.18,0.06,0.05,M('#5D4037')); browL.name='emo_browL'; browL.position.set(-0.17,0.2,0.41); browL.rotation.z=0.3; headG.add(browL);
    const browR = B(0.18,0.06,0.05,M('#5D4037')); browR.name='emo_browR'; browR.position.set(0.17,0.2,0.41); browR.rotation.z=-0.3; headG.add(browR);
    // Normal eyes
    const eyeWhiteL = B(0.17,0.17,0.04,M('#fff')); eyeWhiteL.name='emo_eyeWhiteL'; eyeWhiteL.position.set(-0.17,0.05,0.39); headG.add(eyeWhiteL);
    const eyeWhiteR = B(0.17,0.17,0.04,M('#fff')); eyeWhiteR.name='emo_eyeWhiteR'; eyeWhiteR.position.set(0.17,0.05,0.39); headG.add(eyeWhiteR);
    const eyeL = B(0.09,0.09,0.06,M('#111')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.17,0.05,0.42); headG.add(eyeL);
    const eyeR = B(0.09,0.09,0.06,M('#111')); eyeR.name='emo_eyeR'; eyeR.position.set(0.17,0.05,0.42); headG.add(eyeR);
    // Downturned mouth (mirror of smile)
    const mouthC = B(0.14,0.07,0.04,M('#555')); mouthC.name='emo_mouthC'; mouthC.position.set(0,-0.18,0.41); headG.add(mouthC);
    const mouthL = B(0.1,0.07,0.04,M('#555')); mouthL.name='emo_mouthL'; mouthL.position.set(-0.11,-0.22,0.41); mouthL.rotation.z=-0.4; headG.add(mouthL);
    const mouthR = B(0.1,0.07,0.04,M('#555')); mouthR.name='emo_mouthR'; mouthR.position.set(0.11,-0.22,0.41); mouthR.rotation.z=0.4; headG.add(mouthR);
  }

  // LAUGH — closed eyes, huge open mouth
  else if (emotion === 'laugh') {
    // Closed eyes (thin lines)
    const eyeL = B(0.2,0.04,0.05,M('#111')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.17,0.05,0.41); headG.add(eyeL);
    const eyeR = B(0.2,0.04,0.05,M('#111')); eyeR.name='emo_eyeR'; eyeR.position.set(0.17,0.05,0.41); headG.add(eyeR);
    // Big open mouth
    const mouthBg = B(0.34,0.16,0.05,M('#880000')); mouthBg.name='emo_mouthBg'; mouthBg.position.set(0,-0.2,0.41); headG.add(mouthBg);
    const teeth = B(0.3,0.06,0.06,M('#ffffff')); teeth.name='emo_teeth'; teeth.position.set(0,-0.14,0.42); headG.add(teeth);
    // Curved sides
    const mL = B(0.1,0.1,0.04,M('#880000')); mL.name='emo_mL'; mL.position.set(-0.17,-0.2,0.41); mL.rotation.z=0.5; headG.add(mL);
    const mR = B(0.1,0.1,0.04,M('#880000')); mR.name='emo_mR'; mR.position.set(0.17,-0.2,0.41); mR.rotation.z=-0.5; headG.add(mR);
  }
}

export function clearCharacterEmotion(group) {
  if (!group || !group.userData.parts || !group.userData.parts.headG) return;

  const headG = group.userData.parts.headG;

  // Remove all emotion meshes
  headG.children = headG.children.filter(child => {
    if (child.name?.startsWith('emo_')) return false;
    return true;
  });

  // Restore original face visibility
  headG.children.forEach(child => {
    if (child.name === 'eyeL' || child.name === 'eyeR' ||
        child.name === 'eyeWhiteL' || child.name === 'eyeWhiteR' ||
        child.name === 'mouth') {
      child.visible = true;
    }
  });
}

// Hats and Hand Items
export const HATS = {
  none:        { name: 'ללא' },
  straw:       { name: 'כובע קש 👒' },
  cap:         { name: 'כומתה 🧢' },
  crown:       { name: 'כתר 👑' },
  tophat:      { name: 'כובע גבוה 🎩' },
  farmer:      { name: 'כובע חקלאי 🪖' },
  cowboy:      { name: 'כובע קאובוי 🤠' },
  beanie:      { name: 'כפה 🧤' },
  helmet:      { name: 'קסדה 🪖' },
  pirate:      { name: 'כובע פיראט 🏴‍☠️' },
  viking:      { name: 'קסדת ויקינג ⚔️' },
  wizard:      { name: 'כובע קוסם 🧙' },
  angelic:     { name: 'הילה מלאכית 👼' },
};

export const HAND_ITEMS = {
  none:        { name: 'ללא' },
  rake:        { name: 'מגרפה 🌾' },
  broom:       { name: 'מטאטא 🧹' },
  watering:    { name: 'מד שתייה 🪣' },
  shovel:      { name: 'מעדר ⛏️' },
  scythe:      { name: 'חרמש 🌿' },
  lantern:     { name: 'פנס 🏮' },
  basket:      { name: 'סל 🧺' },
  fishing:     { name: 'חכת דיג 🎣' },
  bow:         { name: 'קשת 🏹' },
  axe:         { name: 'גרזן 🪓' },
  trident:     { name: 'טריידנט 🔱' },
  hammer:      { name: 'פטיש 🔨' },
  scythe_g:    { name: 'חרמש זהב ✨' },
  sword_f:     { name: 'חרב אש 🔥' },
  staff_arc:   { name: 'מטה ארקאן 🔮' },
  legendary:   { name: 'נשק אגדי ⚡' },
};

export function attachHat(headG, hatType) {
  // Remove existing hat meshes
  const toRemove = headG.children.filter(c => c.userData.isHat);
  toRemove.forEach(c => headG.remove(c));
  if(hatType === 'none') return;

  const tag = (mesh) => { mesh.userData.isHat = true; mesh.castShadow = true; return mesh; };

  if(hatType === 'straw') {
    // Wide brim + rounded top, yellow/tan color
    const brim = tag(B(1.1,0.07,1.1, M('#D4A017'))); brim.position.set(0,0.48,0); headG.add(brim);
    const top  = tag(B(0.65,0.35,0.65, M('#C8960C'))); top.position.set(0,0.72,0); headG.add(top);
    // Brim edge detail
    const rim  = tag(B(1.15,0.04,1.15, M('#8B6914'))); rim.position.set(0,0.45,0); headG.add(rim);
  }
  else if(hatType === 'cap') {
    const cap  = tag(B(0.86,0.24,0.86, M('#E53935'))); cap.position.set(0,0.55,0); headG.add(cap);
    const brim = tag(B(0.65,0.07,0.32, M('#E53935'))); brim.position.set(0,0.44,0.48); headG.add(brim);
    const logo = tag(B(0.18,0.18,0.05, M('#ffffff'))); logo.position.set(0,0.57,0.44); headG.add(logo);
  }
  else if(hatType === 'crown') {
    const base = tag(B(0.9,0.14,0.9, M('#FFD700',0.4,0.6))); base.position.set(0,0.49,0); headG.add(base);
    [-0.32,-0.16,0,0.16,0.32].forEach((x,i) => {
      const spike = tag(B(0.13,0.28,0.13, M('#FFD700',0.4,0.6))); spike.position.set(x,0.7,0); headG.add(spike);
      if(i%2===0){ const gem=tag(new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),M('#ff2222',0.3,0.2))); gem.position.set(x,0.78,0); headG.add(gem); }
    });
  }
  else if(hatType === 'tophat') {
    const brim = tag(B(1.18,0.08,1.18, M('#111'))); brim.position.set(0,0.47,0); headG.add(brim);
    const top  = tag(B(0.62,0.58,0.62, M('#111'))); top.position.set(0,0.83,0); headG.add(top);
    const band = tag(B(0.65,0.08,0.65, M('#CC0000'))); band.position.set(0,0.57,0); headG.add(band);
  }
  else if(hatType === 'farmer') {
    // Hard helmet shape - construction style
    const shell = tag(new THREE.Mesh(new THREE.SphereGeometry(0.48,10,6, 0, Math.PI*2, 0, Math.PI*0.55), M('#FF8C00')));
    shell.position.set(0,0.5,0); headG.add(shell);
    const brim2 = tag(B(1.0,0.06,1.0, M('#E65100'))); brim2.position.set(0,0.44,0); headG.add(brim2);
  }
  else if(hatType === 'cowboy') {
    // Wide brim + medium crown, tan color
    const brim = tag(B(1.3,0.07,1.3, M('#8B6914'))); brim.position.set(0,0.46,0); headG.add(brim);
    const crown = tag(B(0.7,0.4,0.7, M('#8B6914'))); crown.position.set(0,0.68,0); headG.add(crown);
    // Leather band
    const band = tag(B(0.74,0.08,0.74, M('#654321'))); band.position.set(0,0.5,0); headG.add(band);
  }
  else if(hatType === 'beanie') {
    // Rounded fitted cap, no brim
    const beanie = tag(B(0.82,0.35,0.82, M('#C62828'))); beanie.position.set(0,0.58,0); headG.add(beanie);
    const top = tag(B(0.5,0.12,0.5, M('#C62828'))); top.position.set(0,0.78,0); headG.add(top);
  }
  else if(hatType === 'helmet') {
    // Rounded shell + visor
    const shell = tag(new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8, 0, Math.PI*2, 0, Math.PI*0.65), M('#333')));
    shell.position.set(0,0.52,0); headG.add(shell);
    // Visor in front
    const visor = tag(B(0.8,0.12,0.06, M('#111'))); visor.position.set(0,0.42,0.45); headG.add(visor);
  }
  else if(hatType === 'pirate') {
    // Tall asymmetric crown
    const crown = tag(B(0.8,0.45,0.8, M('#222'))); crown.position.set(0,0.65,0); crown.rotation.z = 0.15; headG.add(crown);
    // Wide brim
    const brim = tag(B(1.1,0.08,1.1, M('#222'))); brim.position.set(0,0.45,0); headG.add(brim);
    // Skull and crossbones
    const skull = tag(B(0.15,0.15,0.08, M('#fff'))); skull.position.set(0,0.68,0.42); headG.add(skull);
    const bone1 = tag(B(0.25,0.04,0.04, M('#fff'))); bone1.position.set(0,0.6,0.42); bone1.rotation.z = 0.4; headG.add(bone1);
    const bone2 = tag(B(0.25,0.04,0.04, M('#fff'))); bone2.position.set(0,0.6,0.42); bone2.rotation.z = -0.4; headG.add(bone2);
  }
  else if(hatType === 'viking') {
    // Rounded helmet
    const helmet = tag(B(0.85,0.38,0.85, M('#9E9E9E'))); helmet.position.set(0,0.58,0); headG.add(helmet);
    // Two horns on sides
    [-0.45, 0.45].forEach(x => {
      const horn = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.08,0.45,8), M('#D4C5A0')));
      horn.position.set(x,0.72,0); horn.rotation.z = x < 0 ? 0.5 : -0.5; headG.add(horn);
    });
  }
  else if(hatType === 'wizard') {
    // Tall cone hat
    const hat = tag(new THREE.Mesh(new THREE.ConeGeometry(0.45,1.1,8), M('#4A148C')));
    hat.position.set(0,1.0,0); headG.add(hat);
    // Star near tip (two crossed boxes)
    const star1 = tag(B(0.18,0.04,0.04, M('#FFD700'))); star1.position.set(0,1.45,0); headG.add(star1);
    const star2 = tag(B(0.04,0.18,0.04, M('#FFD700'))); star2.position.set(0,1.45,0); headG.add(star2);
  }
  else if(hatType === 'angelic') {
    // Bright halo with emissive glow
    const halo = tag(new THREE.Mesh(new THREE.TorusGeometry(0.38,0.06,8,16), new THREE.MeshStandardMaterial({
      color:'#FFD600', emissive:'#FFD600', emissiveIntensity:0.5, roughness:0.3, metalness:0.7
    })));
    halo.position.set(0,0.85,0); halo.rotation.x = Math.PI/2; headG.add(halo);
    // Two small wings on sides
    [-0.55, 0.55].forEach((x, i) => {
      const wing = tag(B(0.08,0.25,0.35, M('#F5F5F5')));
      wing.position.set(x,0.85,-0.1); wing.rotation.y = i === 0 ? 0.3 : -0.3; headG.add(wing);
    });
  }
}

export function attachHandItem(rArmG, itemType) {
  // Remove existing hand items
  const toRemove = rArmG.children.filter(c => c.userData.isHandItem);
  toRemove.forEach(c => rArmG.remove(c));
  if(itemType === 'none') return;

  const tag = (mesh) => { mesh.userData.isHandItem=true; mesh.castShadow=true; return mesh; };
  const wood = M('#8B5E3C', 0.9, 0);
  const metal = M('#9E9E9E', 0.4, 0.5);

  if(itemType === 'rake') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.4,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    const head = tag(B(0.55,0.06,0.08, metal)); head.position.set(0,-2.15,0); rArmG.add(head);
    // Tines
    [-0.22,-0.11,0,0.11,0.22].forEach(x => {
      const tine = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.01,0.18,6), metal));
      tine.position.set(x,-2.24,0); rArmG.add(tine);
    });
  }
  else if(itemType === 'broom') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.5,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    const head = tag(B(0.5,0.12,0.22, M('#D4A017',0.9,0))); head.position.set(0,-2.2,0); rArmG.add(head);
    // Bristles
    for(let i=0;i<5;i++){
      const b = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.01,0.28,4), M('#8B6914',0.9,0)));
      b.position.set(-0.2+i*0.1,-2.34,0); rArmG.add(b);
    }
  }
  else if(itemType === 'watering') {
    // Watering can body
    const body = tag(B(0.32,0.26,0.22, M('#4CAF50',0.6,0.2))); body.position.set(0,-1.6,0); rArmG.add(body);
    // Spout
    const spout = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.45,8), M('#388E3C',0.6,0.2)));
    spout.rotation.z = -0.6; spout.position.set(0.28,-1.82,0); rArmG.add(spout);
    // Handle
    const hdl = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.3,8), M('#2E7D32',0.7,0)));
    hdl.rotation.z = Math.PI/2; hdl.position.set(0,-1.42,0); rArmG.add(hdl);
    // Rose (sprinkle head)
    const rose = tag(new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6), M('#81C784',0.7,0)));
    rose.position.set(0.52,-1.95,0); rArmG.add(rose);
  }
  else if(itemType === 'shovel') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.3,8), wood)); handle.position.set(0,-1.45,0); rArmG.add(handle);
    // Blade
    const blade = tag(B(0.3,0.38,0.06, metal)); blade.position.set(0,-2.08,0); rArmG.add(blade);
    const tip = tag(new THREE.Mesh(new THREE.ConeGeometry(0.15,0.18,4), metal));
    tip.position.set(0,-2.36,0); tip.rotation.y=Math.PI/4; rArmG.add(tip);
  }
  else if(itemType === 'scythe') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    // Curved blade - approximate with rotated boxes
    const b1 = tag(B(0.5,0.07,0.04, metal)); b1.position.set(0.2,-2.2,0); b1.rotation.z=0.5; rArmG.add(b1);
    const b2 = tag(B(0.4,0.07,0.04, metal)); b2.position.set(0.45,-2.0,0); b2.rotation.z=-0.2; rArmG.add(b2);
    const tip2 = tag(B(0.12,0.07,0.04,metal)); tip2.position.set(0.6,-1.85,0); tip2.rotation.z=-0.5; rArmG.add(tip2);
  }
  else if(itemType === 'lantern') {
    // Cylinder handle
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.8,8), wood)); handle.position.set(0,-1.3,0); rArmG.add(handle);
    // Box body
    const body = tag(B(0.22,0.28,0.22, M('#8B4513',0.8,0.1))); body.position.set(0,-1.78,0); rArmG.add(body);
    // Emissive yellow sphere on top
    const glow = tag(new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), new THREE.MeshStandardMaterial({
      color:'#FFEB3B', emissive:'#FFEB3B', emissiveIntensity:0.8, roughness:0.4, metalness:0
    })));
    glow.position.set(0,-1.78,0); rArmG.add(glow);
  }
  else if(itemType === 'basket') {
    // Cylinder wider at top, narrow at bottom
    const basket = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.22,0.4,12), M('#8B4513',0.9,0)));
    basket.position.set(0,-1.7,0); rArmG.add(basket);
    // Handle
    const handleArc = tag(new THREE.Mesh(new THREE.TorusGeometry(0.25,0.03,6,12,Math.PI), M('#654321',0.9,0)));
    handleArc.rotation.x = Math.PI/2; handleArc.position.set(0,-1.35,0); rArmG.add(handleArc);
  }
  else if(itemType === 'fishing') {
    // Long thin cylinder handle
    const rod = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.025,1.8,6), M('#8B6914',0.9,0)));
    rod.position.set(0,-1.6,0); rArmG.add(rod);
    // Thin line (cylinder)
    const line = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.9,4), M('#DDD',0.8,0)));
    line.position.set(0,-2.85,0); rArmG.add(line);
    // Small sphere at end
    const hook = tag(new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6), M('#C0C0C0',0.4,0.6)));
    hook.position.set(0,-3.3,0); rArmG.add(hook);
  }
  else if(itemType === 'bow') {
    // 3 rotated boxes forming curve
    const arc1 = tag(B(0.08,0.6,0.08, wood)); arc1.position.set(-0.2,-1.5,0); arc1.rotation.z = 0.4; rArmG.add(arc1);
    const arc2 = tag(B(0.08,0.5,0.08, wood)); arc2.position.set(0,-1.6,0); rArmG.add(arc2);
    const arc3 = tag(B(0.08,0.6,0.08, wood)); arc3.position.set(0.2,-1.5,0); arc3.rotation.z = -0.4; rArmG.add(arc3);
    // Thin string cylinder
    const string = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,1.3,4), M('#F5F5DC',0.9,0)));
    string.position.set(0.32,-1.6,0); rArmG.add(string);
  }
  else if(itemType === 'axe') {
    // Cylinder handle
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    // Wide flat box blade at top
    const blade = tag(B(0.55,0.35,0.08, metal)); blade.position.set(0.15,-2.15,0); rArmG.add(blade);
    const edge = tag(B(0.6,0.05,0.04, M('#C0C0C0',0.2,0.8))); edge.position.set(0.15,-2.35,0); rArmG.add(edge);
  }
  else if(itemType === 'trident') {
    // Cylinder handle
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    // 3 thin upright cylinders at top
    [-0.15, 0, 0.15].forEach(x => {
      const prong = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.02,0.45,6), metal));
      prong.position.set(x,-2.4,0); rArmG.add(prong);
      // Sharp tips
      const tip = tag(new THREE.Mesh(new THREE.ConeGeometry(0.03,0.12,6), metal));
      tip.position.set(x,-2.65,0); rArmG.add(tip);
    });
  }
  else if(itemType === 'hammer') {
    // Cylinder handle
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.3,8), wood)); handle.position.set(0,-1.4,0); rArmG.add(handle);
    // Large box head
    const head = tag(B(0.6,0.3,0.3, metal)); head.position.set(0,-2.15,0); rArmG.add(head);
    const face1 = tag(B(0.65,0.28,0.05, M('#787878',0.3,0.7))); face1.position.set(0,-2.15,0.13); rArmG.add(face1);
    const face2 = tag(B(0.65,0.28,0.05, M('#787878',0.3,0.7))); face2.position.set(0,-2.15,-0.13); rArmG.add(face2);
  }
  else if(itemType === 'scythe_g') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    // Gold blade
    const goldMetal = M('#FFD700', 0.4, 0.6);
    const b1 = tag(B(0.5,0.07,0.04, goldMetal)); b1.position.set(0.2,-2.2,0); b1.rotation.z=0.5; rArmG.add(b1);
    const b2 = tag(B(0.4,0.07,0.04, goldMetal)); b2.position.set(0.45,-2.0,0); b2.rotation.z=-0.2; rArmG.add(b2);
    const tip2 = tag(B(0.12,0.07,0.04, goldMetal)); tip2.position.set(0.6,-1.85,0); tip2.rotation.z=-0.5; rArmG.add(tip2);
  }
  else if(itemType === 'sword_f') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.35,8), M('#8B4513',0.9,0)));
    handle.position.set(0,-1.2,0); rArmG.add(handle);
    // Guard
    const guard = tag(B(0.4,0.08,0.08, metal)); guard.position.set(0,-1.4,0); rArmG.add(guard);
    // Fire blade with emissive
    const bladeMat = new THREE.MeshStandardMaterial({color:'#FF6D00', emissive:'#FF3D00', emissiveIntensity:0.6, roughness:0.3, metalness:0.5});
    const blade = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1,0.9,0.05), bladeMat));
    blade.position.set(0,-1.9,0); blade.castShadow = true; rArmG.add(blade);
    const tip = tag(new THREE.Mesh(new THREE.ConeGeometry(0.06,0.15,4), bladeMat));
    tip.position.set(0,-2.4,0); tip.castShadow = true; rArmG.add(tip);
  }
  else if(itemType === 'staff_arc') {
    const staff = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.7,8), M('#654321',0.9,0)));
    staff.position.set(0,-1.5,0); rArmG.add(staff);
    // Arcane orb with emissive purple glow
    const orbMat = new THREE.MeshStandardMaterial({color:'#CE93D8', emissive:'#9C27B0', emissiveIntensity:0.8, roughness:0.2, metalness:0.3});
    const orb = tag(new THREE.Mesh(new THREE.SphereGeometry(0.18,10,10), orbMat));
    orb.position.set(0,-2.35,0); orb.castShadow = true; rArmG.add(orb);
    // Energy rings around orb
    [0.22, 0.28].forEach((r, i) => {
      const ring = tag(new THREE.Mesh(new THREE.TorusGeometry(r,0.02,6,12), orbMat));
      ring.position.set(0,-2.35,0); ring.rotation.x = Math.PI/2 + i*0.3; ring.castShadow = true; rArmG.add(ring);
    });
  }
  else if(itemType === 'legendary') {
    // Thick cylinder handle
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,1.2,8), M('#8B6914',0.8,0.2)));
    handle.position.set(0,-1.3,0); rArmG.add(handle);
    // Large sphere with intense emissive glow
    const legendMat = new THREE.MeshStandardMaterial({color:'#FFD600', emissive:'#FFD600', emissiveIntensity:1.0, roughness:0.2, metalness:0.8});
    const orb = tag(new THREE.Mesh(new THREE.SphereGeometry(0.28,12,12), legendMat));
    orb.position.set(0,-2.0,0); orb.castShadow = true; rArmG.add(orb);
    // Rotating energy rings
    [0, 60, 120].forEach(angle => {
      const ring = tag(new THREE.Mesh(new THREE.TorusGeometry(0.32,0.03,8,16), legendMat));
      ring.position.set(0,-2.0,0);
      ring.rotation.x = angle * Math.PI/180;
      ring.castShadow = true;
      rArmG.add(ring);
    });
  }
}
