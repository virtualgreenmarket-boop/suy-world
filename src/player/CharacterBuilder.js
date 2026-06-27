import * as THREE from 'three';

const M = (c, r=0.7, m=0.05) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});

function B(w,h,d,mat) { const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); x.castShadow=true; return x; }
function S(r,mat) { const x=new THREE.Mesh(new THREE.SphereGeometry(r,10,10),mat); x.castShadow=true; return x; }
function CY(rt,rb,h,mat) { const x=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,10),mat); x.castShadow=true; return x; }
function P(mesh,x,y,z) { mesh.position.set(x,y,z); return mesh; }

// Roblox "classic head" style: a rounded cube built via superellipsoid vertex
// displacement on a BoxGeometry. roundness 0 = perfect cube, 1 = sphere.
// This REPLACES the previous egg-shaped SphereGeometry+scale approach.
function roundedCubeGeometry(size, segments, roundness) {
  const geo = new THREE.BoxGeometry(size, size, size, segments, segments, segments);
  const pos = geo.attributes.position;
  const half = size / 2;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = x/half, ny = y/half, nz = z/half;
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
    const sx = nx/len, sy = ny/len, sz = nz/len;
    x = x*(1-roundness) + sx*half*roundness;
    y = y*(1-roundness) + sy*half*roundness;
    z = z*(1-roundness) + sz*half*roundness;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Curved-line shape (used for the smile mouth and eyebrows) — a thin extruded
// arc built from a bezier curve, replacing the previous TorusGeometry-based
// mouth/eyebrows for a cleaner, more controllable curve shape.
function curveShape(color, curveAmount, width, thickness, depth) {
  const mat = M(color, 0.4);
  const halfW = width/2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, 0);
  shape.bezierCurveTo(-halfW*0.3, curveAmount, halfW*0.3, curveAmount, halfW, 0);
  shape.bezierCurveTo(halfW*0.3, curveAmount+thickness, -halfW*0.3, curveAmount+thickness, -halfW, thickness);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth||0.01, bevelEnabled:false, curveSegments:16 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// Small rounded hand — same superellipsoid style as the head, scaled down,
// attached at the end of each arm. NEW — characters previously had no hands.
function buildHand(skinColor) {
  const handMat = M(skinColor, 0.45, 0);
  const handGeo = roundedCubeGeometry(0.22, 4, 0.75);
  const hand = new THREE.Mesh(handGeo, handMat);
  hand.scale.set(1, 1.1, 0.85);
  hand.castShadow = true;
  return hand;
}

export const CHARACTERS = {
  boy:   { name:'Alex',  hebrew:'בחור רציני, מהיר וחזק. אוהב הרפתקאות ותמיד מוכן לפעולה.', height:'1.75m', personality:'נועז',   skin:'#FFCC99', shirt:'#2196F3', pants:'#333',    shoes:'#5D4037', hair:'#5D4037', hairStyle:'normal',   eyeColor:'#1a1a1a' },
  girl:  { name:'Maya',  hebrew:'חכמה ויצירתית. מומחית באסטרטגיה ותמיד צעד אחד קדימה.',    height:'1.68m', personality:'חכמה',   skin:'#FFCC99', shirt:'#E91E63', pants:'#9C27B0', shoes:'#E91E63', hair:'#FFD700', hairStyle:'long',     eyeColor:'#1a1a1a' },
  zombie:{ name:'Zed',   hebrew:'מסתורי ומפחיד. כוחו עצום אך שולט בו לטובה.',             height:'1.80m', personality:'מסתורי', skin:'#7CB87C', shirt:'#666',    pants:'#444',    shoes:'#333',    hair:'#333',    hairStyle:'messy',    eyeColor:'#ff0000' },
  demon: { name:'Kael',  hebrew:'שד אש עתיק. מהיר כברק ועוצמתי מכולם.',                   height:'1.85m', personality:'עצמתי',  skin:'#CC0000', shirt:'#8B0000', pants:'#4a0000', shoes:'#222',    hair:'#000',    hairStyle:'horns',    eyeColor:'#ff6600' },
  robot: { name:'R-7',   hebrew:'רובוט מהדור הבא. מדויק, חכם ובלתי ניתן לעצירה.',          height:'1.90m', personality:'מדויק',  skin:'#90A4AE', shirt:'#455A64', pants:'#37474F', shoes:'#263238', hair:'#78909C', hairStyle:'antenna',  eyeColor:'#00E5FF' },
};

// Character dimensions — Roblox-style rounded cube head
const HEAD_SIZE = 1.1;
const HEAD_ROUNDNESS = 0.42;

export function buildCharacter(type, overrideColors = {}) {
  const ch = CHARACTERS[type] || CHARACTERS.boy;
  const c = {...ch, ...overrideColors};

  const skin=M(c.skin), shirt=M(c.shirt), pants=M(c.pants),
        shoes=M(c.shoes,0.9,0), hairM=M(c.hair), eyeM=M(c.eyeColor), white=M('#fff');

  const group = new THREE.Group();
  const parts = {};

  // HEAD — Roblox classic-head style rounded cube (REPLACES the previous egg
  // shape). size/roundness confirmed via reference-image comparison earlier.
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 2.42, 0);

  const headGeo = roundedCubeGeometry(HEAD_SIZE, 6, HEAD_ROUNDNESS);
  const head = new THREE.Mesh(headGeo, skin);
  head.castShadow = true;
  parts.headG.add(head);

  parts.headG.userData.HEAD_SIZE = HEAD_SIZE;
  parts.headG.userData.HEAD_ROUNDNESS = HEAD_ROUNDNESS;

  // Hair — recalculated attachment points for the rounded-cube head
  // (HEAD_SIZE=1.1), replacing the egg-specific BASE_RADIUS/SCALE_XZ/SCALE_Y
  // math used before.
  if(c.hairStyle === 'normal') {
    // ALEX — simple short hair cap, flattened rounded-cube sitting on top.
    const capGeo = roundedCubeGeometry(HEAD_SIZE+0.04, 6, HEAD_ROUNDNESS+0.1);
    const cap = new THREE.Mesh(capGeo, hairM);
    cap.scale.set(1, 0.45, 1);
    cap.position.y = HEAD_SIZE*0.38;
    cap.castShadow = true;
    parts.headG.add(cap);

  } else if(c.hairStyle === 'long') {
    // MAYA — cap on top (shared with Alex's approach) PLUS long hair
    // extending past the shoulders (2 side strands + 1 back piece), PLUS
    // a subtle V-neck added later on the shirt (feminine touches).
    const capGeo = roundedCubeGeometry(HEAD_SIZE+0.04, 6, HEAD_ROUNDNESS+0.1);
    const cap = new THREE.Mesh(capGeo, hairM);
    cap.scale.set(1, 0.45, 1);
    cap.position.y = HEAD_SIZE*0.38;
    cap.castShadow = true;
    parts.headG.add(cap);

    [-1, 1].forEach(side => {
      const strandGeo = roundedCubeGeometry(0.22, 4, 0.6);
      const strand = new THREE.Mesh(strandGeo, hairM);
      strand.scale.set(1, 2.2, 0.7);
      strand.position.set(side*0.52, HEAD_SIZE*0.05, -0.15);
      strand.castShadow = true;
      parts.headG.add(strand);
    });
    const backGeo = roundedCubeGeometry(0.5, 4, 0.5);
    const back = new THREE.Mesh(backGeo, hairM);
    back.scale.set(1, 1.7, 0.4);
    back.position.set(0, HEAD_SIZE*0.0, -0.5);
    back.castShadow = true;
    parts.headG.add(back);

  } else if(c.hairStyle === 'messy') {
    // ZED — messy zombie hair, kept as-is conceptually but repositioned for
    // the rounded-cube head dimensions.
    const topCapGeo = roundedCubeGeometry(HEAD_SIZE+0.05, 6, HEAD_ROUNDNESS+0.05);
    const topCap = new THREE.Mesh(topCapGeo, hairM);
    topCap.scale.set(1, 0.42, 1);
    topCap.position.y = HEAD_SIZE*0.4;
    topCap.castShadow = true;
    parts.headG.add(topCap);

    const s1 = B(0.18, 0.25, 0.18, hairM);
    s1.position.set(-0.25, HEAD_SIZE*0.57, 0.1);
    s1.rotation.z = 0.3;
    parts.headG.add(s1);

    const s2 = B(0.18, 0.22, 0.18, hairM);
    s2.position.set(0.2, HEAD_SIZE*0.6, -0.05);
    s2.rotation.z = -0.2;
    parts.headG.add(s2);

  } else if(c.hairStyle === 'horns') {
    // KAEL — demon horns, repositioned for the rounded-cube head.
    const hornX = HEAD_SIZE * 0.42;
    const hornY = HEAD_SIZE * 0.45;

    const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), M('#8B0000'));
    h1.castShadow = true;
    h1.position.set(-hornX, hornY, 0);
    h1.rotation.z = 0.25;
    parts.headG.add(h1);

    const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), M('#8B0000'));
    h2.castShadow = true;
    h2.position.set(hornX, hornY, 0);
    h2.rotation.z = -0.25;
    parts.headG.add(h2);

  } else if(c.hairStyle === 'antenna') {
    // R-7 — robot antenna, repositioned for the rounded-cube head top.
    const antennaTopY = HEAD_SIZE * 0.5;

    const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 20), hairM);
    antennaBase.position.set(0, antennaTopY + 0.02, 0);
    antennaBase.castShadow = true;
    parts.headG.add(antennaBase);

    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12), hairM);
    antennaStem.position.set(0, antennaTopY + 0.29, 0);
    antennaStem.castShadow = true;
    parts.headG.add(antennaStem);

    const antennaBall = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 20), M('#00E5FF', 0.3, 0.8));
    antennaBall.position.set(0, antennaTopY + 0.59, 0);
    antennaBall.castShadow = true;
    parts.headG.add(antennaBall);
  }

  // Face — dot eyes + curved smile mouth (Roblox classic-head style),
  // REPLACES the previous round-sclera-eyes + TorusGeometry mouth/eyebrows.
  const faceZ = HEAD_SIZE/2 + 0.01;

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), eyeM);
  eyeL.scale.set(1, 1, 0.5);
  eyeL.position.set(-0.24, 0.1, faceZ);
  eyeL.name = 'eyeL';
  eyeL.castShadow = true;
  parts.headG.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), eyeM);
  eyeR.scale.set(1, 1, 0.5);
  eyeR.position.set(0.24, 0.1, faceZ);
  eyeR.name = 'eyeR';
  eyeR.castShadow = true;
  parts.headG.add(eyeR);

  const mouthColor = type === 'zombie' ? '#228B22' : type === 'demon' ? '#FF6600' : '#8B4513';
  const mouth = curveShape(mouthColor, -0.09, 0.32, 0.025, 0.012);
  mouth.position.set(0, -0.18, faceZ-0.01);
  mouth.name = 'mouth';
  parts.headG.add(mouth);

  // Zombie tooth detail
  if(type === 'zombie') {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), white);
    tooth.position.set(0.06, -0.21, faceZ+0.01);
    tooth.castShadow = true;
    parts.headG.add(tooth);
  }

  // Neck — positioned at bottom of the rounded-cube head
  // Extended height and larger top radius to cover gaps during head rotation
  const neckY = -HEAD_SIZE/2 - 0.08;
  parts.headG.add(P(CY(0.18,0.15,0.24,skin), 0, neckY, 0));

  // Ears — positioned on sides of the rounded-cube head
  const earX = HEAD_SIZE/2 * 0.95;
  parts.headG.add(P(B(0.1,0.25,0.2,skin), -earX, 0, 0));
  parts.headG.add(P(B(0.1,0.25,0.2,skin),  earX, 0, 0));

  if(type==='demon') {
    const spikeX = earX + 0.02;
    const eL=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.25,6),M('#CC0000')); eL.castShadow=true;
    eL.position.set(-spikeX, 0.22, 0); eL.rotation.z=0.4; parts.headG.add(eL);
    const eR=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.25,6),M('#CC0000')); eR.castShadow=true;
    eR.position.set(spikeX, 0.22, 0); eR.rotation.z=-0.4; parts.headG.add(eR);
  }
  group.add(parts.headG);

  // BODY
  parts.bodyG = new THREE.Group();
  parts.bodyG.position.set(0, 1.62, 0);
  parts.bodyG.add(B(0.9,0.9,0.5,shirt));
  parts.bodyG.add(P(B(0.88,0.22,0.48,pants), 0,-faceZ,0));
  if(type==='robot') {
    parts.bodyG.add(P(B(0.35,0.3,0.1,M('#546E7A')), 0,0.1,0.28));
    const led1=S(0.06,M('#00E5FF',0.3,0.9)); led1.position.set(-0.1,0.1,0.34); parts.bodyG.add(led1);
    const led2=S(0.06,M('#00E5FF',0.3,0.9)); led2.position.set(0.1,0.1,0.34); parts.bodyG.add(led2);
  }

  // MAYA — subtle V-neck on the shirt (feminine touch, additive detail only).
  if(type === 'girl') {
    const neckShape = new THREE.Shape();
    neckShape.moveTo(-0.09, 0);
    neckShape.lineTo(0.09, 0);
    neckShape.lineTo(0, -0.16);
    neckShape.closePath();
    const neckGeo = new THREE.ExtrudeGeometry(neckShape, { depth: 0.05, bevelEnabled:false, curveSegments:8 });
    const vneck = new THREE.Mesh(neckGeo, skin);
    vneck.castShadow = true;
    vneck.position.set(0, 0.42, 0.21);
    parts.bodyG.add(vneck);
  }

  // LEFT ARM — same structure as before, with a small OUTWARD position
  // offset (x moved from -0.55 to -faceZ+0.02, a modest ~5% shift) so the arm
  // doesn't read as pressed flush against the torso. Small, deliberate
  // adjustment — NOT a large change, learned from the earlier arm-pose
  // debugging in this project where overcorrecting caused new problems.
  parts.lArmG = new THREE.Group();
  parts.lArmG.position.set(-faceZ+0.02, 0.42, 0);
  parts.lArmG.add(S(0.18, shirt));
  parts.lArmG.add(P(B(0.252,0.414,0.252,shirt), 0,-0.28,0));
  parts.lElbowG = new THREE.Group();
  parts.lElbowG.position.set(0,-0.52,0);
  parts.lElbowG.add(S(0.1395,skin));
  parts.lElbowG.add(P(B(0.216,0.378,0.216,skin), 0,-0.26,0));
  // Hand — NEW, small rounded shape replacing the previous plain box at the
  // forearm's end, same position as that box was.
  const lHand = buildHand(c.skin);
  P(lHand, 0, -0.62, 0);
  parts.lElbowG.add(lHand);
  parts.lArmG.add(parts.lElbowG);
  parts.bodyG.add(parts.lArmG);

  // RIGHT ARM — mirrored outward offset (0.55 -> faceZ+0.02).
  parts.rArmG = new THREE.Group();
  parts.rArmG.position.set(faceZ+0.02, 0.42, 0);
  parts.rArmG.add(S(0.18, shirt));
  parts.rArmG.add(P(B(0.252,0.414,0.252,shirt), 0,-0.28,0));
  parts.rElbowG = new THREE.Group();
  parts.rElbowG.position.set(0,-0.52,0);
  parts.rElbowG.add(S(0.1395,skin));
  parts.rElbowG.add(P(B(0.216,0.378,0.216,skin), 0,-0.26,0));
  const rHand = buildHand(c.skin);
  P(rHand, 0, -0.62, 0);
  parts.rElbowG.add(rHand);
  parts.rArmG.add(parts.rElbowG);
  parts.bodyG.add(parts.rArmG);
  group.add(parts.bodyG);

  // LEFT LEG (unchanged)
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

  // RIGHT LEG (unchanged)
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
  P.bodyG.rotation.set(0,0,0);

  // Don't reset head rotation if emoji animation is active
  if (!P.headG.userData._shakeStartTime && !P.headG.userData._nodStartTime) {
    P.headG.rotation.set(0,0,0);
  }

  group.position.y = group.userData._groundY || 0;

  // Don't reset leg positions if stomp animation is active
  if (!group.userData._stompStartTime) {
    P.lLegG.position.set(-0.22,1.05,0);
    P.rLegG.position.set(0.22,1.05,0);
  }

  P.bodyG.position.set(0,1.62,0);
  P.headG.position.set(0,2.42,0);
}

// Helper function to add/remove dance smile
function _setDanceSmile(headG, show) {
  headG.children = headG.children.filter(c => !c.name?.startsWith('dance_smile_'));

  if (!show) {
    headG.children.forEach(c => {
      if (c.name === 'mouth') c.visible = true;
    });
    return;
  }

  headG.children.forEach(c => {
    if (c.name === 'mouth') c.visible = false;
  });

  const smileC = B(0.14,0.07,0.04,M('#cc3333'));
  smileC.name='dance_smile_C';
  smileC.position.set(0,-0.22,faceZ);
  headG.add(smileC);

  const smileL = B(0.1,0.07,0.04,M('#cc3333'));
  smileL.name='dance_smile_L';
  smileL.position.set(-0.11,-0.19,faceZ);
  smileL.rotation.z=0.4;
  headG.add(smileL);

  const smileR = B(0.1,0.07,0.04,M('#cc3333'));
  smileR.name='dance_smile_R';
  smileR.position.set(0.11,-0.19,faceZ);
  smileR.rotation.z=-0.4;
  headG.add(smileR);
}

export function animateCharacter(group, animType, t, delta) {
  resetPose(group);
  const p = group.userData.parts;
  if(!p) return;

  if (animType !== 'dance') {
    _setDanceSmile(p.headG, false);
  }

  if(animType === 'idle') {
    p.lArmG.rotation.x = -0.1 + Math.sin(t*0.9)*0.06;
    p.rArmG.rotation.x = -0.1 + -Math.sin(t*0.9)*0.06;
    p.lArmG.rotation.z = -0.2;
    p.rArmG.rotation.z = 0.2;
    p.headG.rotation.z = Math.sin(t*0.7)*0.04;
  }
  else if(animType === 'walk') {
    const s = Math.sin(t*4.2);
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
    const s = Math.sin(t*6.75);
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
    p.bodyG.position.set(0, 1.45, 0.15);
    p.headG.position.set(0, 2.25, 0.05);

    p.lLegG.rotation.x = -1.4;
    p.rLegG.rotation.x = -1.4;
    p.lKneeG.rotation.x = 1.3;
    p.rKneeG.rotation.x = 1.3;

    p.lArmG.rotation.x = -0.3;
    p.rArmG.rotation.x = -0.3;
    p.lArmG.rotation.z = -0.15;
    p.rArmG.rotation.z = 0.15;
    p.lElbowG.rotation.x = -0.7;
    p.rElbowG.rotation.x = -0.7;

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

    _setDanceSmile(p.headG, true);
  }
}

// Emotion system — kept structurally the same, but eye/mouth show/hide now
// only references 'eyeL'/'eyeR'/'mouth' (no more eyeWhiteL/eyeWhiteR/
// mouth_curveL/mouth_curveR, since the new face uses single dot-eye meshes
// and a single curved-mouth mesh instead of multi-piece constructions).
export function setCharacterEmotion(group, emotion) {
  if (!group || !group.userData.parts || !group.userData.parts.headG) return;

  const headG = group.userData.parts.headG;

  headG.children = headG.children.filter(child => {
    if (child.name?.startsWith('emo_')) return false;
    return true;
  });

  headG.children.forEach(child => {
    if (child.name === 'eyeL' || child.name === 'eyeR' || child.name === 'mouth') {
      child.visible = false;
    }
  });

  if (emotion === 'neutral') {
    headG.children.forEach(child => {
      if (child.name === 'eyeL' || child.name === 'eyeR' || child.name === 'mouth') {
        child.visible = true;
      }
    });
    return;
  }

  if (emotion === 'happy') {
    const eyeL = B(0.09,0.09,0.06,M('#111')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.24,0.1,faceZ); headG.add(eyeL);
    const eyeR = B(0.09,0.09,0.06,M('#111')); eyeR.name='emo_eyeR'; eyeR.position.set(0.24,0.1,faceZ); headG.add(eyeR);
    const smileC = B(0.14,0.07,0.04,M('#cc3333')); smileC.name='emo_smileC'; smileC.position.set(0,-0.22,faceZ); headG.add(smileC);
    const smileL = B(0.1,0.07,0.04,M('#cc3333')); smileL.name='emo_smileL'; smileL.position.set(-0.11,-0.19,faceZ); smileL.rotation.z=0.4; headG.add(smileL);
    const smileR = B(0.1,0.07,0.04,M('#cc3333')); smileR.name='emo_smileR'; smileR.position.set(0.11,-0.19,faceZ); smileR.rotation.z=-0.4; headG.add(smileR);
    const teeth = B(0.22,0.06,0.04,M('#ffffff')); teeth.name='emo_teeth'; teeth.position.set(0,-0.16,faceZ); headG.add(teeth);
  }
  else if (emotion === 'love') {
    function makeHeart(x) {
      const g = new THREE.Group();
      const left  = B(0.1,0.14,0.05,M('#ff0000')); left.position.set(-0.05,0.02,0); left.rotation.z=0.4; g.add(left);
      const right = B(0.1,0.14,0.05,M('#ff0000')); right.position.set(0.05,0.02,0); right.rotation.z=-0.4; g.add(right);
      const bottom = B(0.08,0.1,0.05,M('#ff0000')); bottom.position.set(0,-0.08,0); bottom.rotation.z=0; g.add(bottom);
      g.position.set(x,0.1,faceZ);
      g.name = 'emo_heart';
      return g;
    }
    headG.add(makeHeart(-0.24));
    headG.add(makeHeart(0.24));
    const smileC = B(0.14,0.07,0.04,M('#cc3333')); smileC.name='emo_smileC'; smileC.position.set(0,-0.22,faceZ); headG.add(smileC);
    const smileL = B(0.1,0.07,0.04,M('#cc3333')); smileL.name='emo_smileL'; smileL.position.set(-0.11,-0.19,faceZ); smileL.rotation.z=0.4; headG.add(smileL);
    const smileR = B(0.1,0.07,0.04,M('#cc3333')); smileR.name='emo_smileR'; smileR.position.set(0.11,-0.19,faceZ); smileR.rotation.z=-0.4; headG.add(smileR);
  }
  else if (emotion === 'angry') {
    const browL = B(0.2,0.07,0.05,M('#8B0000')); browL.name='emo_browL'; browL.position.set(-0.24,0.22,faceZ); browL.rotation.z=-0.4; headG.add(browL);
    const browR = B(0.2,0.07,0.05,M('#8B0000')); browR.name='emo_browR'; browR.position.set(0.24,0.22,faceZ); browR.rotation.z=0.4; headG.add(browR);
    const eyeL = B(0.18,0.06,0.05,M('#cc0000')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.24,0.1,faceZ); headG.add(eyeL);
    const eyeR = B(0.18,0.06,0.05,M('#cc0000')); eyeR.name='emo_eyeR'; eyeR.position.set(0.24,0.1,faceZ); headG.add(eyeR);
    const mouth = B(0.28,0.05,0.04,M('#333')); mouth.name='emo_mouth'; mouth.position.set(0,-0.22,faceZ); headG.add(mouth);
  }
  else if (emotion === 'sad') {
    const browL = B(0.18,0.06,0.05,M('#5D4037')); browL.name='emo_browL'; browL.position.set(-0.24,0.22,faceZ); browL.rotation.z=0.3; headG.add(browL);
    const browR = B(0.18,0.06,0.05,M('#5D4037')); browR.name='emo_browR'; browR.position.set(0.24,0.22,faceZ); browR.rotation.z=-0.3; headG.add(browR);
    const eyeL = B(0.09,0.09,0.06,M('#111')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.24,0.1,faceZ); headG.add(eyeL);
    const eyeR = B(0.09,0.09,0.06,M('#111')); eyeR.name='emo_eyeR'; eyeR.position.set(0.24,0.1,faceZ); headG.add(eyeR);
    const mouthC = B(0.14,0.07,0.04,M('#555')); mouthC.name='emo_mouthC'; mouthC.position.set(0,-0.18,faceZ); headG.add(mouthC);
    const mouthL = B(0.1,0.07,0.04,M('#555')); mouthL.name='emo_mouthL'; mouthL.position.set(-0.11,-0.22,faceZ); mouthL.rotation.z=-0.4; headG.add(mouthL);
    const mouthR = B(0.1,0.07,0.04,M('#555')); mouthR.name='emo_mouthR'; mouthR.position.set(0.11,-0.22,faceZ); mouthR.rotation.z=0.4; headG.add(mouthR);
  }
  else if (emotion === 'laugh') {
    const eyeL = B(0.2,0.04,0.05,M('#111')); eyeL.name='emo_eyeL'; eyeL.position.set(-0.24,0.1,faceZ); headG.add(eyeL);
    const eyeR = B(0.2,0.04,0.05,M('#111')); eyeR.name='emo_eyeR'; eyeR.position.set(0.24,0.1,faceZ); headG.add(eyeR);
    const mouthBg = B(0.34,0.16,0.05,M('#880000')); mouthBg.name='emo_mouthBg'; mouthBg.position.set(0,-0.2,faceZ); headG.add(mouthBg);
    const teeth = B(0.3,0.06,0.06,M('#ffffff')); teeth.name='emo_teeth'; teeth.position.set(0,-0.14,faceZ+0.01); headG.add(teeth);
    const mL = B(0.1,0.1,0.04,M('#880000')); mL.name='emo_mL'; mL.position.set(-0.17,-0.2,faceZ); mL.rotation.z=0.5; headG.add(mL);
    const mR = B(0.1,0.1,0.04,M('#880000')); mR.name='emo_mR'; mR.position.set(0.17,-0.2,faceZ); mR.rotation.z=-0.5; headG.add(mR);
  }
}

// Hats and Hand Items — UNCHANGED from the existing file, all positions still
// reference values relative to headG/rArmG origins which remain valid since
// the head/arm GROUP origins didn't move, only the geometry inside them.
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
  const toRemove = headG.children.filter(c => c.userData.isHat);
  toRemove.forEach(c => headG.remove(c));
  if(hatType === 'none') return;

  const tag = (mesh) => { mesh.userData.isHat = true; mesh.castShadow = true; return mesh; };

  if(hatType === 'straw') {
    const brim = tag(B(1.1,0.07,1.1, M('#D4A017'))); brim.position.set(0,0.48,0); headG.add(brim);
    const top  = tag(B(0.65,0.35,0.65, M('#C8960C'))); top.position.set(0,0.72,0); headG.add(top);
    const rim  = tag(B(1.15,0.04,1.15, M('#8B6914'))); rim.position.set(0,0.45,0); headG.add(rim);
  }
  else if(hatType === 'cap') {
    const cap  = tag(B(0.86,0.24,0.86, M('#E53935'))); cap.position.set(0,0.55,0); headG.add(cap);
    const brim = tag(B(0.65,0.07,0.32, M('#E53935'))); brim.position.set(0,0.44,0.48); headG.add(brim);
    const logo = tag(B(0.18,0.18,0.05, M('#ffffff'))); logo.position.set(0,faceZ+0.01,0.44); headG.add(logo);
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
    const top  = tag(B(0.62,faceZ+0.02,0.62, M('#111'))); top.position.set(0,0.83,0); headG.add(top);
    const band = tag(B(0.65,0.08,0.65, M('#CC0000'))); band.position.set(0,faceZ+0.01,0); headG.add(band);
  }
  else if(hatType === 'farmer') {
    const shell = tag(new THREE.Mesh(new THREE.SphereGeometry(0.48,10,6, 0, Math.PI*2, 0, Math.PI*0.55), M('#FF8C00')));
    shell.position.set(0,0.5,0); headG.add(shell);
    const brim2 = tag(B(1.0,0.06,1.0, M('#E65100'))); brim2.position.set(0,0.44,0); headG.add(brim2);
  }
  else if(hatType === 'cowboy') {
    const brim = tag(B(1.3,0.07,1.3, M('#8B6914'))); brim.position.set(0,0.46,0); headG.add(brim);
    const crown = tag(B(0.7,0.4,0.7, M('#8B6914'))); crown.position.set(0,0.68,0); headG.add(crown);
    const band = tag(B(0.74,0.08,0.74, M('#654321'))); band.position.set(0,0.5,0); headG.add(band);
  }
  else if(hatType === 'beanie') {
    const beanie = tag(B(0.82,0.35,0.82, M('#C62828'))); beanie.position.set(0,faceZ+0.02,0); headG.add(beanie);
    const top = tag(B(0.5,0.12,0.5, M('#C62828'))); top.position.set(0,0.78,0); headG.add(top);
  }
  else if(hatType === 'helmet') {
    const shell = tag(new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8, 0, Math.PI*2, 0, Math.PI*0.65), M('#333')));
    shell.position.set(0,0.52,0); headG.add(shell);
    const visor = tag(B(0.8,0.12,0.06, M('#111'))); visor.position.set(0,0.42,0.45); headG.add(visor);
  }
  else if(hatType === 'pirate') {
    const crown = tag(B(0.8,0.45,0.8, M('#222'))); crown.position.set(0,0.65,0); crown.rotation.z = 0.15; headG.add(crown);
    const brim = tag(B(1.1,0.08,1.1, M('#222'))); brim.position.set(0,0.45,0); headG.add(brim);
    const skull = tag(B(0.15,0.15,0.08, M('#fff'))); skull.position.set(0,0.68,0.42); headG.add(skull);
    const bone1 = tag(B(0.25,0.04,0.04, M('#fff'))); bone1.position.set(0,0.6,0.42); bone1.rotation.z = 0.4; headG.add(bone1);
    const bone2 = tag(B(0.25,0.04,0.04, M('#fff'))); bone2.position.set(0,0.6,0.42); bone2.rotation.z = -0.4; headG.add(bone2);
  }
  else if(hatType === 'viking') {
    const helmet = tag(B(0.85,0.38,0.85, M('#9E9E9E'))); helmet.position.set(0,faceZ+0.02,0); headG.add(helmet);
    [-0.45, 0.45].forEach(x => {
      const horn = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.08,0.45,8), M('#D4C5A0')));
      horn.position.set(x,0.72,0); horn.rotation.z = x < 0 ? 0.5 : -0.5; headG.add(horn);
    });
  }
  else if(hatType === 'wizard') {
    const hat = tag(new THREE.Mesh(new THREE.ConeGeometry(0.45,1.1,8), M('#4A148C')));
    hat.position.set(0,1.0,0); headG.add(hat);
    const star1 = tag(B(0.18,0.04,0.04, M('#FFD700'))); star1.position.set(0,1.45,0); headG.add(star1);
    const star2 = tag(B(0.04,0.18,0.04, M('#FFD700'))); star2.position.set(0,1.45,0); headG.add(star2);
  }
  else if(hatType === 'angelic') {
    const halo = tag(new THREE.Mesh(new THREE.TorusGeometry(0.38,0.06,8,16), new THREE.MeshStandardMaterial({
      color:'#FFD600', emissive:'#FFD600', emissiveIntensity:0.5, roughness:0.3, metalness:0.7
    })));
    halo.position.set(0,0.85,0); halo.rotation.x = Math.PI/2; headG.add(halo);
    [-0.55, 0.55].forEach((x, i) => {
      const wing = tag(B(0.08,0.25,0.35, M('#F5F5F5')));
      wing.position.set(x,0.85,-0.1); wing.rotation.y = i === 0 ? 0.3 : -0.3; headG.add(wing);
    });
  }
}

export function attachHandItem(rArmG, itemType) {
  const toRemove = rArmG.children.filter(c => c.userData.isHandItem);
  toRemove.forEach(c => rArmG.remove(c));
  if(itemType === 'none') return;

  const tag = (mesh) => { mesh.userData.isHandItem=true; mesh.castShadow=true; return mesh; };
  const wood = M('#8B5E3C', 0.9, 0);
  const metal = M('#9E9E9E', 0.4, 0.5);

  if(itemType === 'rake') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.4,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    const head = tag(B(0.55,0.06,0.08, metal)); head.position.set(0,-2.15,0); rArmG.add(head);
    [-0.22,-0.11,0,0.11,0.22].forEach(x => {
      const tine = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.01,0.18,6), metal));
      tine.position.set(x,-2.24,0); rArmG.add(tine);
    });
  }
  else if(itemType === 'broom') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.5,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    const head = tag(B(0.5,0.12,0.22, M('#D4A017',0.9,0))); head.position.set(0,-2.2,0); rArmG.add(head);
    for(let i=0;i<5;i++){
      const b = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.01,0.28,4), M('#8B6914',0.9,0)));
      b.position.set(-0.2+i*0.1,-2.34,0); rArmG.add(b);
    }
  }
  else if(itemType === 'watering') {
    const body = tag(B(0.32,0.26,0.22, M('#4CAF50',0.6,0.2))); body.position.set(0,-1.6,0); rArmG.add(body);
    const spout = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.45,8), M('#388E3C',0.6,0.2)));
    spout.rotation.z = -0.6; spout.position.set(0.28,-1.82,0); rArmG.add(spout);
    const hdl = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.3,8), M('#2E7D32',0.7,0)));
    hdl.rotation.z = Math.PI/2; hdl.position.set(0,-1.42,0); rArmG.add(hdl);
    const rose = tag(new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6), M('#81C784',0.7,0)));
    rose.position.set(0.52,-1.95,0); rArmG.add(rose);
  }
  else if(itemType === 'shovel') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.3,8), wood)); handle.position.set(0,-1.45,0); rArmG.add(handle);
    const blade = tag(B(0.3,0.38,0.06, metal)); blade.position.set(0,-2.08,0); rArmG.add(blade);
    const tip = tag(new THREE.Mesh(new THREE.ConeGeometry(0.15,0.18,4), metal));
    tip.position.set(0,-2.36,0); tip.rotation.y=Math.PI/4; rArmG.add(tip);
  }
  else if(itemType === 'scythe') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    const b1 = tag(B(0.5,0.07,0.04, metal)); b1.position.set(0.2,-2.2,0); b1.rotation.z=0.5; rArmG.add(b1);
    const b2 = tag(B(0.4,0.07,0.04, metal)); b2.position.set(0.45,-2.0,0); b2.rotation.z=-0.2; rArmG.add(b2);
    const tip2 = tag(B(0.12,0.07,0.04,metal)); tip2.position.set(0.6,-1.85,0); tip2.rotation.z=-0.5; rArmG.add(tip2);
  }
  else if(itemType === 'lantern') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.8,8), wood)); handle.position.set(0,-1.3,0); rArmG.add(handle);
    const body = tag(B(0.22,0.28,0.22, M('#8B4513',0.8,0.1))); body.position.set(0,-1.78,0); rArmG.add(body);
    const glow = tag(new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), new THREE.MeshStandardMaterial({
      color:'#FFEB3B', emissive:'#FFEB3B', emissiveIntensity:0.8, roughness:0.4, metalness:0
    })));
    glow.position.set(0,-1.78,0); rArmG.add(glow);
  }
  else if(itemType === 'basket') {
    const basket = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.22,0.4,12), M('#8B4513',0.9,0)));
    basket.position.set(0,-1.7,0); rArmG.add(basket);
    const handleArc = tag(new THREE.Mesh(new THREE.TorusGeometry(0.25,0.03,6,12,Math.PI), M('#654321',0.9,0)));
    handleArc.rotation.x = Math.PI/2; handleArc.position.set(0,-1.35,0); rArmG.add(handleArc);
  }
  else if(itemType === 'fishing') {
    const rod = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.025,1.8,6), M('#8B6914',0.9,0)));
    rod.position.set(0,-1.6,0); rArmG.add(rod);
    const line = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.9,4), M('#DDD',0.8,0)));
    line.position.set(0,-2.85,0); rArmG.add(line);
    const hook = tag(new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6), M('#C0C0C0',0.4,0.6)));
    hook.position.set(0,-3.3,0); rArmG.add(hook);
  }
  else if(itemType === 'bow') {
    const arc1 = tag(B(0.08,0.6,0.08, wood)); arc1.position.set(-0.2,-1.5,0); arc1.rotation.z = 0.4; rArmG.add(arc1);
    const arc2 = tag(B(0.08,0.5,0.08, wood)); arc2.position.set(0,-1.6,0); rArmG.add(arc2);
    const arc3 = tag(B(0.08,0.6,0.08, wood)); arc3.position.set(0.2,-1.5,0); arc3.rotation.z = -0.4; rArmG.add(arc3);
    const string = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,1.3,4), M('#F5F5DC',0.9,0)));
    string.position.set(0.32,-1.6,0); rArmG.add(string);
  }
  else if(itemType === 'axe') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    const blade = tag(B(0.55,0.35,0.08, metal)); blade.position.set(0.15,-2.15,0); rArmG.add(blade);
    const edge = tag(B(0.6,0.05,0.04, M('#C0C0C0',0.2,0.8))); edge.position.set(0.15,-2.35,0); rArmG.add(edge);
  }
  else if(itemType === 'trident') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    [-0.15, 0, 0.15].forEach(x => {
      const prong = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.02,0.45,6), metal));
      prong.position.set(x,-2.4,0); rArmG.add(prong);
      const tip = tag(new THREE.Mesh(new THREE.ConeGeometry(0.03,0.12,6), metal));
      tip.position.set(x,-2.65,0); rArmG.add(tip);
    });
  }
  else if(itemType === 'hammer') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.3,8), wood)); handle.position.set(0,-1.4,0); rArmG.add(handle);
    const head = tag(B(0.6,0.3,0.3, metal)); head.position.set(0,-2.15,0); rArmG.add(head);
    const face1 = tag(B(0.65,0.28,0.05, M('#787878',0.3,0.7))); face1.position.set(0,-2.15,0.13); rArmG.add(face1);
    const face2 = tag(B(0.65,0.28,0.05, M('#787878',0.3,0.7))); face2.position.set(0,-2.15,-0.13); rArmG.add(face2);
  }
  else if(itemType === 'scythe_g') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,8), wood)); handle.position.set(0,-1.5,0); rArmG.add(handle);
    const goldMetal = M('#FFD700', 0.4, 0.6);
    const b1 = tag(B(0.5,0.07,0.04, goldMetal)); b1.position.set(0.2,-2.2,0); b1.rotation.z=0.5; rArmG.add(b1);
    const b2 = tag(B(0.4,0.07,0.04, goldMetal)); b2.position.set(0.45,-2.0,0); b2.rotation.z=-0.2; rArmG.add(b2);
    const tip2 = tag(B(0.12,0.07,0.04, goldMetal)); tip2.position.set(0.6,-1.85,0); tip2.rotation.z=-0.5; rArmG.add(tip2);
  }
  else if(itemType === 'sword_f') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.35,8), M('#8B4513',0.9,0)));
    handle.position.set(0,-1.2,0); rArmG.add(handle);
    const guard = tag(B(0.4,0.08,0.08, metal)); guard.position.set(0,-1.4,0); rArmG.add(guard);
    const bladeMat = new THREE.MeshStandardMaterial({color:'#FF6D00', emissive:'#FF3D00', emissiveIntensity:0.6, roughness:0.3, metalness:0.5});
    const blade = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1,0.9,0.05), bladeMat));
    blade.position.set(0,-1.9,0); blade.castShadow = true; rArmG.add(blade);
    const tip = tag(new THREE.Mesh(new THREE.ConeGeometry(0.06,0.15,4), bladeMat));
    tip.position.set(0,-2.4,0); tip.castShadow = true; rArmG.add(tip);
  }
  else if(itemType === 'staff_arc') {
    const staff = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.7,8), M('#654321',0.9,0)));
    staff.position.set(0,-1.5,0); rArmG.add(staff);
    const orbMat = new THREE.MeshStandardMaterial({color:'#CE93D8', emissive:'#9C27B0', emissiveIntensity:0.8, roughness:0.2, metalness:0.3});
    const orb = tag(new THREE.Mesh(new THREE.SphereGeometry(0.18,10,10), orbMat));
    orb.position.set(0,-2.35,0); orb.castShadow = true; rArmG.add(orb);
    [0.22, 0.28].forEach((r, i) => {
      const ring = tag(new THREE.Mesh(new THREE.TorusGeometry(r,0.02,6,12), orbMat));
      ring.position.set(0,-2.35,0); ring.rotation.x = Math.PI/2 + i*0.3; ring.castShadow = true; rArmG.add(ring);
    });
  }
  else if(itemType === 'legendary') {
    const handle = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,1.2,8), M('#8B6914',0.8,0.2)));
    handle.position.set(0,-1.3,0); rArmG.add(handle);
    const legendMat = new THREE.MeshStandardMaterial({color:'#FFD600', emissive:'#FFD600', emissiveIntensity:1.0, roughness:0.2, metalness:0.8});
    const orb = tag(new THREE.Mesh(new THREE.SphereGeometry(0.28,12,12), legendMat));
    orb.position.set(0,-2.0,0); orb.castShadow = true; rArmG.add(orb);
    [0, 60, 120].forEach(angle => {
      const ring = tag(new THREE.Mesh(new THREE.TorusGeometry(0.32,0.03,8,16), legendMat));
      ring.position.set(0,-2.0,0);
      ring.rotation.x = angle * Math.PI/180;
      ring.castShadow = true;
      rArmG.add(ring);
    });
  }
}

// Shoes registry and attachment
export const SHOES = {
  none: { name: 'None' },
  sneakers: { name: 'Sneakers', color: '#FFFFFF' },
  boots: { name: 'Boots', color: '#8B4513' },
  sandals: { name: 'Sandals', color: '#D2691E' }
};

export function attachShoes(parts, shoeType) {
  // Remove existing shoes
  if (parts.lLegG) {
    const toRemove = parts.lLegG.children.filter(c => c.userData.isShoe);
    toRemove.forEach(c => parts.lLegG.remove(c));
  }
  if (parts.rLegG) {
    const toRemove = parts.rLegG.children.filter(c => c.userData.isShoe);
    toRemove.forEach(c => parts.rLegG.remove(c));
  }

  if (shoeType === 'none') return;

  const shoe = SHOES[shoeType];
  if (!shoe) return;

  const mat = M(shoe.color, 0.6, 0.2);
  const tag = (mesh) => { mesh.userData.isShoe = true; mesh.castShadow = true; return mesh; };

  // Left shoe
  const lShoe = tag(B(0.25, 0.15, 0.35, mat));
  lShoe.position.set(0, -0.6, 0.05);
  parts.lLegG.add(lShoe);

  // Right shoe
  const rShoe = tag(B(0.25, 0.15, 0.35, mat));
  rShoe.position.set(0, -0.6, 0.05);
  parts.rLegG.add(rShoe);
}

// Gloves registry and attachment
export const GLOVES = {
  none: { name: 'None' },
  work: { name: 'Work Gloves', color: '#8B7355' },
  garden: { name: 'Garden Gloves', color: '#4CAF50' },
  winter: { name: 'Winter Gloves', color: '#FF0000' }
};

export function attachGloves(parts, gloveType) {
  // Remove existing gloves
  if (parts.lArmG) {
    const toRemove = parts.lArmG.children.filter(c => c.userData.isGlove);
    toRemove.forEach(c => parts.lArmG.remove(c));
  }
  if (parts.rArmG) {
    const toRemove = parts.rArmG.children.filter(c => c.userData.isGlove);
    toRemove.forEach(c => parts.rArmG.remove(c));
  }

  if (gloveType === 'none') return;

  const glove = GLOVES[gloveType];
  if (!glove) return;

  const mat = M(glove.color, 0.7, 0.1);
  const tag = (mesh) => { mesh.userData.isGlove = true; mesh.castShadow = true; return mesh; };

  // Left glove (on hand)
  const lGlove = tag(B(0.22, 0.18, 0.08, mat));
  lGlove.position.set(0, -0.45, 0);
  parts.lArmG.add(lGlove);

  // Right glove (on hand)
  const rGlove = tag(B(0.22, 0.18, 0.08, mat));
  rGlove.position.set(0, -0.45, 0);
  parts.rArmG.add(rGlove);
}

// Wings registry and attachment
export const WINGS = {
  none: { name: 'None' },
  angel: { name: 'Angel Wings', color: '#FFFFFF' },
  fairy: { name: 'Fairy Wings', color: '#FFB6C1' },
  dragon: { name: 'Dragon Wings', color: '#8B0000' }
};

export function attachWings(parts, wingType) {
  // Remove existing wings
  if (parts.torsoG) {
    const toRemove = parts.torsoG.children.filter(c => c.userData.isWing);
    toRemove.forEach(c => parts.torsoG.remove(c));
  }

  if (wingType === 'none') return;

  const wing = WINGS[wingType];
  if (!wing) return;

  const mat = M(wing.color, 0.3, 0);
  const tag = (mesh) => { mesh.userData.isWing = true; mesh.castShadow = true; return mesh; };

  // Left wing
  const lWing = tag(new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.8, 0.5),
    mat
  ));
  lWing.position.set(-0.3, 0.2, -0.2);
  lWing.rotation.z = Math.PI / 6;
  parts.torsoG.add(lWing);

  // Right wing
  const rWing = tag(new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.8, 0.5),
    mat
  ));
  rWing.position.set(0.3, 0.2, -0.2);
  rWing.rotation.z = -Math.PI / 6;
  parts.torsoG.add(rWing);
}

// Emoji system - 8 custom facial expressions with 5-second auto-revert
let _activeEmojiTimer = null;

const EMOJI_BUILDERS = {
  laugh_tears: (headG) => {
    console.log('[EMOJI_BUILDERS] Building laugh_tears');
    const faceZ = HEAD_SIZE/2 + 0.01;

    // Wide smile with C-shaped closed eyes and blue tears
    const eyeL = B(0.2,0.06,0.05,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.1,faceZ);
    eyeL.rotation.z = 0.3; // Curved downward
    headG.add(eyeL);

    const eyeR = B(0.2,0.06,0.05,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.1,faceZ);
    eyeR.rotation.z = -0.3; // Curved downward
    headG.add(eyeR);

    const tearL = B(0.06,0.12,0.05,M('#4FC3F7'));
    tearL.name='emo_tearL';
    tearL.position.set(-0.24,0.0,faceZ);
    headG.add(tearL);

    const tearR = B(0.06,0.12,0.05,M('#4FC3F7'));
    tearR.name='emo_tearR';
    tearR.position.set(0.24,0.0,faceZ);
    headG.add(tearR);

    // Wide smile
    const mouthBg = B(0.34,0.16,0.05,M('#880000'));
    mouthBg.name='emo_mouthBg';
    mouthBg.position.set(0,-0.2,faceZ);
    headG.add(mouthBg);

    const teeth = B(0.3,0.06,0.06,M('#ffffff'));
    teeth.name='emo_teeth';
    teeth.position.set(0,-0.14,faceZ+0.01);
    headG.add(teeth);

    const mL = B(0.1,0.1,0.04,M('#880000'));
    mL.name='emo_mL';
    mL.position.set(-0.17,-0.2,faceZ);
    mL.rotation.z=0.5;
    headG.add(mL);

    const mR = B(0.1,0.1,0.04,M('#880000'));
    mR.name='emo_mR';
    mR.position.set(0.17,-0.2,faceZ);
    mR.rotation.z=-0.5;
    headG.add(mR);

    console.log('[EMOJI_BUILDERS] Added laugh_tears elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);
  },

  wink: (headG) => {
    console.log('[EMOJI_BUILDERS] Building wink');
    const faceZ = HEAD_SIZE/2 + 0.01;

    // One eye closed (straight line), other eye normal, light smile
    const eyeL = B(0.18,0.03,0.05,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.1,faceZ);
    headG.add(eyeL);

    const eyeR = B(0.09,0.09,0.06,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.1,faceZ);
    headG.add(eyeR);

    const smileC = B(0.12,0.06,0.04,M('#cc3333'));
    smileC.name='emo_smileC';
    smileC.position.set(0,-0.22,faceZ);
    headG.add(smileC);

    const smileL = B(0.08,0.06,0.04,M('#cc3333'));
    smileL.name='emo_smileL';
    smileL.position.set(-0.09,-0.19,faceZ);
    smileL.rotation.z=0.3;
    headG.add(smileL);

    const smileR = B(0.08,0.06,0.04,M('#cc3333'));
    smileR.name='emo_smileR';
    smileR.position.set(0.09,-0.19,faceZ);
    smileR.rotation.z=-0.3;
    headG.add(smileR);

    console.log('[EMOJI_BUILDERS] Added wink elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);
  },

  yummy: (headG) => {
    const faceZ = HEAD_SIZE/2 + 0.01;
    console.log('[EMOJI_BUILDERS] Building yummy');

    // Red tongue sticking out, C-shaped eyes
    const eyeL = B(0.2,0.08,0.05,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.1,faceZ);
    eyeL.rotation.z=-0.15;
    headG.add(eyeL);

    const eyeR = B(0.2,0.08,0.05,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.1,faceZ);
    eyeR.rotation.z=0.15;
    headG.add(eyeR);

    const tongue = B(0.12,0.18,0.06,M('#E91E63'));
    tongue.name='emo_tongue';
    tongue.position.set(0.08,-0.28,faceZ+0.01);
    tongue.rotation.z=-0.2;
    headG.add(tongue);

    const mouth = B(0.14,0.08,0.04,M('#880000'));
    mouth.name='emo_mouth';
    mouth.position.set(0,-0.20,faceZ);
    headG.add(mouth);

    console.log('[EMOJI_BUILDERS] Added yummy elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);
  },

  shh: (headG) => {
    const faceZ = HEAD_SIZE/2 + 0.01;
    console.log('[EMOJI_BUILDERS] Building shh');

    // Small closed black circle mouth, hand near mouth
    const eyeL = B(0.09,0.09,0.06,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.1,faceZ);
    headG.add(eyeL);

    const eyeR = B(0.09,0.09,0.06,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.1,faceZ);
    headG.add(eyeR);

    const mouth = B(0.08,0.08,0.06,M('#111'));
    mouth.name='emo_mouth';
    mouth.position.set(0,-0.20,faceZ);
    headG.add(mouth);

    const hand = B(0.16,0.10,0.05,M('#FFCC99'));
    hand.name='emo_hand';
    hand.position.set(0.22,-0.15,faceZ+0.02);
    hand.rotation.z=-0.3;
    headG.add(hand);

    console.log('[EMOJI_BUILDERS] Added shh elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);
  },

  shake_no: (headG, group) => {
    const faceZ = HEAD_SIZE/2 + 0.01;
    console.log('[EMOJI_BUILDERS] Building shake_no');

    // Upward-curving arc eyes (pronounced smile-shaped C)
    const eyeL = B(0.2,0.06,0.05,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.1,faceZ);
    eyeL.rotation.z = -0.3; // Curved upward
    headG.add(eyeL);

    const eyeR = B(0.2,0.06,0.05,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.1,faceZ);
    eyeR.rotation.z = 0.3; // Curved upward
    headG.add(eyeR);

    console.log('[EMOJI_BUILDERS] Added shake_no elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);

    // Head shake animation
    headG.userData._shakeStartTime = Date.now();
  },

  nod_yes: (headG, group) => {
    const faceZ = HEAD_SIZE/2 + 0.01;
    console.log('[EMOJI_BUILDERS] Building nod_yes');

    // Upward-curving arc eyes (pronounced smile-shaped C)
    const eyeL = B(0.2,0.06,0.05,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.1,faceZ);
    eyeL.rotation.z = -0.3; // Curved upward
    headG.add(eyeL);

    const eyeR = B(0.2,0.06,0.05,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.1,faceZ);
    eyeR.rotation.z = 0.3; // Curved upward
    headG.add(eyeR);

    console.log('[EMOJI_BUILDERS] Added nod_yes elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);

    // Head nod animation
    headG.userData._nodStartTime = Date.now();
  },

  angry: (headG, group) => {
    const faceZ = HEAD_SIZE/2 + 0.01;
    console.log('[EMOJI_BUILDERS] Building angry face');

    // Small eyes with angry diagonal brows, C-shaped frown mouth
    const browL = B(0.2,0.07,0.05,M('#8B0000'));
    browL.name='emo_browL';
    browL.position.set(-0.24,0.22,faceZ);
    browL.rotation.z=-0.5;
    headG.add(browL);

    const browR = B(0.2,0.07,0.05,M('#8B0000'));
    browR.name='emo_browR';
    browR.position.set(0.24,0.22,faceZ);
    browR.rotation.z=0.5;
    headG.add(browR);

    const eyeL = B(0.14,0.06,0.05,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.1,faceZ);
    headG.add(eyeL);

    const eyeR = B(0.14,0.06,0.05,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.1,faceZ);
    headG.add(eyeR);

    const mouthC = B(0.14,0.07,0.04,M('#555'));
    mouthC.name='emo_mouthC';
    mouthC.position.set(0,-0.26,faceZ);
    headG.add(mouthC);

    const mouthL = B(0.1,0.07,0.04,M('#555'));
    mouthL.name='emo_mouthL';
    mouthL.position.set(-0.11,-0.22,faceZ);
    mouthL.rotation.z=0.4;
    headG.add(mouthL);

    const mouthR = B(0.1,0.07,0.04,M('#555'));
    mouthR.name='emo_mouthR';
    mouthR.position.set(0.11,-0.22,faceZ);
    mouthR.rotation.z=-0.4;
    headG.add(mouthR);

    console.log('[EMOJI_BUILDERS] Added angry face elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);

    // Leg stomp animation - use timestamp instead of interval
    group.userData._stompStartTime = Date.now();
  },

  crying: (headG) => {
    const faceZ = HEAD_SIZE/2 + 0.01;
    console.log('[EMOJI_BUILDERS] Building crying');

    // Eyes lower/smaller, tears dripping, straight/down-curved mouth
    const eyeL = B(0.08,0.08,0.06,M('#111'));
    eyeL.name='emo_eyeL';
    eyeL.position.set(-0.24,0.06,faceZ);
    headG.add(eyeL);

    const eyeR = B(0.08,0.08,0.06,M('#111'));
    eyeR.name='emo_eyeR';
    eyeR.position.set(0.24,0.06,faceZ);
    headG.add(eyeR);

    const tearL1 = B(0.05,0.14,0.05,M('#4FC3F7'));
    tearL1.name='emo_tearL1';
    tearL1.position.set(-0.24,-0.02,faceZ);
    headG.add(tearL1);

    const tearR1 = B(0.05,0.14,0.05,M('#4FC3F7'));
    tearR1.name='emo_tearR1';
    tearR1.position.set(0.24,-0.02,faceZ);
    headG.add(tearR1);

    const tearL2 = B(0.04,0.1,0.05,M('#4FC3F7'));
    tearL2.name='emo_tearL2';
    tearL2.position.set(-0.24,-0.18,faceZ);
    headG.add(tearL2);

    const tearR2 = B(0.04,0.1,0.05,M('#4FC3F7'));
    tearR2.name='emo_tearR2';
    tearR2.position.set(0.24,-0.18,faceZ);
    headG.add(tearR2);

    const mouth = B(0.22,0.05,0.04,M('#555'));
    mouth.name='emo_mouth';
    mouth.position.set(0,-0.24,faceZ);
    mouth.rotation.z=0;
    headG.add(mouth);

    console.log('[EMOJI_BUILDERS] Added crying elements:', headG.children.filter(c => c.name?.startsWith('emo_')).length);
  }
};

export function setCharacterEmoji(group, emojiKey) {
  console.log('[CharacterBuilder] setCharacterEmoji called:', emojiKey);

  if (!group || !group.userData.parts || !group.userData.parts.headG) {
    console.warn('[CharacterBuilder] Invalid group for emoji');
    return;
  }

  const headG = group.userData.parts.headG;

  // Cancel previous emoji timer
  if (_activeEmojiTimer) {
    clearTimeout(_activeEmojiTimer);
    _activeEmojiTimer = null;
  }

  // Clear any animation timers
  if (headG.userData._shakeStartTime) {
    delete headG.userData._shakeStartTime;
  }
  if (headG.userData._nodStartTime) {
    delete headG.userData._nodStartTime;
  }
  if (group.userData._stompStartTime) {
    delete group.userData._stompStartTime;
  }

  // Reset head rotation (in case previous emoji had animation)
  if (group.userData.parts.headG) {
    group.userData.parts.headG.rotation.x = 0;
    group.userData.parts.headG.rotation.y = 0;
  }

  // Reset leg positions
  if (group.userData.parts.lLegG) {
    group.userData.parts.lLegG.position.y = 0;
  }
  if (group.userData.parts.rLegG) {
    group.userData.parts.rLegG.position.y = 0;
  }

  // Clear previous emotion
  setCharacterEmotion(group, 'neutral');

  // Apply new emoji if it exists
  if (emojiKey !== 'neutral' && EMOJI_BUILDERS[emojiKey]) {
    console.log('[CharacterBuilder] Building emoji:', emojiKey);

    // Debug: log current head children before hiding
    const beforeHide = headG.children.filter(c => c.name === 'eyeL' || c.name === 'eyeR' || c.name === 'mouth');
    console.log('[CharacterBuilder] Default face elements found:', beforeHide.map(c => c.name));

    // Hide default face elements
    let hiddenCount = 0;
    headG.children.forEach(child => {
      if (child.name === 'eyeL' || child.name === 'eyeR' || child.name === 'mouth') {
        child.visible = false;
        hiddenCount++;
      }
    });
    console.log('[CharacterBuilder] Hidden', hiddenCount, 'default face elements');

    // Build emoji face
    EMOJI_BUILDERS[emojiKey](headG, group);

    // Debug: log head children after building
    const afterBuild = headG.children.filter(c => c.name?.startsWith('emo_'));
    console.log('[CharacterBuilder] Emoji elements after build:', afterBuild.map(c => c.name));

    // Auto-revert to neutral after 5 seconds
    _activeEmojiTimer = setTimeout(() => {
      console.log('[CharacterBuilder] Auto-reverting emoji to neutral after 5s');
      setCharacterEmoji(group, 'neutral');
    }, 5000);
  } else {
    console.log('[CharacterBuilder] Reverting to neutral');
  }
}

export function clearCharacterEmotion(group) {
  // Reset to neutral face
  setCharacterEmoji(group, 'neutral');
}

export function updateCharacterEmoji(group, delta) {
  if (!group || !group.userData.parts || !group.userData.parts.headG) return;

  const headG = group.userData.parts.headG;
  const parts = group.userData.parts;
  const now = Date.now();

  // Shake animation (left-right head rotation)
  if (headG.userData._shakeStartTime) {
    const elapsed = (now - headG.userData._shakeStartTime) / 1000; // seconds
    if (elapsed >= 5) {
      // Stop and recenter
      console.log('[updateCharacterEmoji] shake_no animation complete');
      headG.rotation.y = 0;
      delete headG.userData._shakeStartTime;
    } else {
      // Continuous shake
      const rotation = Math.sin(elapsed * 20) * 0.3;
      headG.rotation.y = rotation;
      // Log first frame to confirm it's running
      if (elapsed < 0.1) {
        console.log('[updateCharacterEmoji] shake_no animation started, rotation.y =', rotation.toFixed(3));
      }
    }
  }

  // Nod animation (up-down head rotation)
  if (headG.userData._nodStartTime) {
    const elapsed = (now - headG.userData._nodStartTime) / 1000; // seconds
    if (elapsed >= 5) {
      // Stop and recenter
      console.log('[updateCharacterEmoji] nod_yes animation complete');
      headG.rotation.x = 0;
      delete headG.userData._nodStartTime;
    } else {
      // Continuous nod
      const rotation = Math.sin(elapsed * 18) * 0.25;
      headG.rotation.x = rotation;
      // Log first frame to confirm it's running
      if (elapsed < 0.1) {
        console.log('[updateCharacterEmoji] nod_yes animation started, rotation.x =', rotation.toFixed(3));
      }
    }
  }

  // Stomp animation (leg movement for angry)
  if (group.userData._stompStartTime) {
    const elapsed = (now - group.userData._stompStartTime) / 1000; // seconds
    if (elapsed >= 5) {
      // Stop and reset
      console.log('[updateCharacterEmoji] angry stomp animation complete');
      if (parts.lLegG) parts.lLegG.position.y = 1.05;
      if (parts.rLegG) parts.rLegG.position.y = 1.05;
      delete group.userData._stompStartTime;
    } else {
      // Continuous stomp - alternate legs
      const legOffset = Math.abs(Math.sin(elapsed * 25)) * 0.15;
      const whichLeg = Math.floor(elapsed * 12.5) % 2;
      if (parts.lLegG && parts.rLegG) {
        if (whichLeg === 0) {
          parts.lLegG.position.y = 1.05 - legOffset;
          parts.rLegG.position.y = 1.05;
        } else {
          parts.lLegG.position.y = 1.05;
          parts.rLegG.position.y = 1.05 - legOffset;
        }
        // Log first frame to confirm it's running
        if (elapsed < 0.1) {
          console.log('[updateCharacterEmoji] angry stomp started, leg offset =', legOffset.toFixed(3));
        }
      }
    }
  }
}