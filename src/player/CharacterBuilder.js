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

  // Eyes
  [[-0.17],[0.17]].forEach(([x]) => {
    parts.headG.add(P(B(0.17,0.17,0.04,white), x,0.05,0.39));
    parts.headG.add(P(B(0.09,0.09,0.06,eyeM), x,0.05,0.42));
  });
  parts.headG.add(P(B(0.26,0.07,0.04,M(type==='zombie'?'#228B22':type==='demon'?'#FF6600':'#8B4513')), 0,-0.2,0.41));
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

  // LEFT ARM
  parts.lArmG = new THREE.Group();
  parts.lArmG.position.set(-0.55, 0.42, 0);
  parts.lArmG.add(S(0.2, shirt));
  parts.lArmG.add(P(B(0.28,0.46,0.28,shirt), 0,-0.28,0));
  parts.lElbowG = new THREE.Group();
  parts.lElbowG.position.set(0,-0.52,0);
  parts.lElbowG.add(S(0.155,skin));
  parts.lElbowG.add(P(B(0.24,0.42,0.24,skin), 0,-0.26,0));
  parts.lElbowG.add(P(B(0.28,0.19,0.22,skin), 0,-0.62,0));
  parts.lArmG.add(parts.lElbowG);
  parts.bodyG.add(parts.lArmG);

  // RIGHT ARM
  parts.rArmG = new THREE.Group();
  parts.rArmG.position.set(0.55, 0.42, 0);
  parts.rArmG.add(S(0.2, shirt));
  parts.rArmG.add(P(B(0.28,0.46,0.28,shirt), 0,-0.28,0));
  parts.rElbowG = new THREE.Group();
  parts.rElbowG.position.set(0,-0.52,0);
  parts.rElbowG.add(S(0.155,skin));
  parts.rElbowG.add(P(B(0.24,0.42,0.24,skin), 0,-0.26,0));
  parts.rElbowG.add(P(B(0.28,0.19,0.22,skin), 0,-0.62,0));
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
  P.lArmG.rotation.set(0,0,0.12); P.rArmG.rotation.set(0,0,-0.12);
  P.lElbowG.rotation.set(0,0,0); P.rElbowG.rotation.set(0,0,0);
  P.lLegG.rotation.set(0,0,0); P.rLegG.rotation.set(0,0,0);
  P.lKneeG.rotation.set(0,0,0); P.rKneeG.rotation.set(0,0,0);
  P.bodyG.rotation.set(0,0,0); P.headG.rotation.set(0,0,0);
  group.position.y = 0;
  P.lLegG.position.set(-0.22,1.05,0); P.rLegG.position.set(0.22,1.05,0);
  P.bodyG.position.set(0,1.62,0); P.headG.position.set(0,2.42,0);
}

export function animateCharacter(group, animType, t, delta) {
  resetPose(group);
  const p = group.userData.parts;
  if(!p) return;

  if(animType === 'idle') {
    group.position.y = Math.sin(t*1.1)*0.04;
    p.lArmG.rotation.x = Math.sin(t*0.9)*0.06;
    p.rArmG.rotation.x = -Math.sin(t*0.9)*0.06;
    p.headG.rotation.z = Math.sin(t*0.7)*0.04;
  }
  else if(animType === 'walk') {
    const s = Math.sin(t*4.2); // 50% faster (2.8 * 1.5 = 4.2)
    p.lArmG.rotation.x = s*0.7; p.rArmG.rotation.x = -s*0.7;
    p.lElbowG.rotation.x = Math.max(0,-s)*0.5; p.rElbowG.rotation.x = Math.max(0,s)*0.5;
    p.lLegG.rotation.x = -s*0.65; p.rLegG.rotation.x = s*0.65;
    p.lKneeG.rotation.x = Math.max(0,s)*0.55; p.rKneeG.rotation.x = Math.max(0,-s)*0.55;
    group.position.y = Math.abs(s)*0.1-0.02;
    p.bodyG.rotation.z = s*0.05;
  }
  else if(animType === 'run') {
    const s = Math.sin(t*6.75); // 50% faster (4.5 * 1.5 = 6.75)
    p.lArmG.rotation.x = s*1.1; p.rArmG.rotation.x = -s*1.1;
    p.lArmG.rotation.z = 0.2; p.rArmG.rotation.z = -0.2;
    p.lElbowG.rotation.x = -0.8+Math.max(0,-s)*0.6;
    p.rElbowG.rotation.x = -0.8+Math.max(0,s)*0.6;
    p.lLegG.rotation.x = -s*1.0; p.rLegG.rotation.x = s*1.0;
    p.lKneeG.rotation.x = Math.max(0,s)*0.9; p.rKneeG.rotation.x = Math.max(0,-s)*0.9;
    group.position.y = Math.abs(s)*0.18-0.04;
    p.bodyG.rotation.x = -0.22; p.headG.rotation.x = 0.12;
  }
  else if(animType === 'jump') {
    const jt = (Math.sin(t*1.8)+1)/2;
    group.position.y = jt*1.1;
    p.lLegG.rotation.x = -jt*0.7; p.rLegG.rotation.x = -jt*0.7;
    p.lKneeG.rotation.x = jt*1.1; p.rKneeG.rotation.x = jt*1.1;
    p.lArmG.rotation.x = -jt*1.0; p.rArmG.rotation.x = -jt*1.0;
    p.lArmG.rotation.z = jt*0.5; p.rArmG.rotation.z = -jt*0.5;
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

    // Rest arms on legs
    p.lArmG.rotation.set(0.8, 0, 0.15);
    p.rArmG.rotation.set(0.8, 0, -0.15);
    p.lElbowG.rotation.x = -0.6;
    p.rElbowG.rotation.x = -0.6;

    // Slight body lean back
    p.bodyG.rotation.x = -0.15;
  }
  else if(animType === 'dance') {
    const s = Math.sin(t*3.5);
    group.position.y = Math.abs(s)*0.18;
    p.bodyG.rotation.z = s*0.28; p.headG.rotation.z = -s*0.18;
    p.lArmG.rotation.x = Math.sin(t*3.5+Math.PI)*1.2; p.rArmG.rotation.x = s*1.2;
    p.lArmG.rotation.z = 0.3+s*0.5; p.rArmG.rotation.z = -0.3-s*0.5;
    p.lElbowG.rotation.x = Math.abs(s)*0.8; p.rElbowG.rotation.x = Math.abs(s)*0.8;
    p.lLegG.rotation.x = s*0.45; p.rLegG.rotation.x = -s*0.45;
    p.lKneeG.rotation.x = Math.abs(s)*0.4; p.rKneeG.rotation.x = Math.abs(s)*0.4;
    p.bodyG.rotation.x = Math.sin(t*1.8)*0.15;
  }
}
