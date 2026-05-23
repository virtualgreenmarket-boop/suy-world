import * as THREE from 'three';

import { initIsland }        from './world/island.js';
import { initPlaza }         from './world/plaza.js';
import { initPaths }         from './world/paths.js';
import { initHangars }       from './world/hangars.js';
import { initMarina }        from './world/marina.js';

import { initLocalPlayer, updateLocalPlayer, getLocalPlayerPosition, getLocalPlayerRotY }
  from './player/localPlayer.js';
import { initRemotePlayers, updateRemotePlayers, getRemotePlayerCount }
  from './player/remotePlayer.js';

import { initMultiplayer, updateMultiplayer, sendChat }
  from './systems/multiplayer.js';
import { updateStores }      from './systems/stores.js';

import { initCats, updateCats } from './world/cats.js';
import { initDogs, updateDogs } from './world/dogs.js';

import { initHud, updateOnlineCount } from './ui/hud.js';
import { initChatUI, bindSendChat }   from './ui/chatUI.js';

// ── Scene ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.0018);

// ── Camera ─────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  68, window.innerWidth / window.innerHeight, 0.2, 900
);

// ── Renderer ───────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Lighting ───────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xFFF8F0, 2.2);
sun.position.set(120, 220, 80);
sun.castShadow = true;
sun.shadow.mapSize.width   = 2048;
sun.shadow.mapSize.height  = 2048;
sun.shadow.camera.near     = 1;
sun.shadow.camera.far      = 900;
sun.shadow.camera.left     = -320;
sun.shadow.camera.right    =  320;
sun.shadow.camera.top      =  320;
sun.shadow.camera.bottom   = -320;
sun.shadow.bias            = -0.001;
scene.add(sun);

scene.add(new THREE.HemisphereLight(0x87CEEB, 0x8BC34A, 0.7));
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// ── World ──────────────────────────────────────────────────────────────
initIsland(scene);
initPlaza(scene);
initPaths(scene);
initHangars(scene);
initMarina(scene);
initCats(scene);
initDogs(scene);

// ── UI ─────────────────────────────────────────────────────────────────
initHud();
initChatUI();
bindSendChat(sendChat);

// ── Remote players ─────────────────────────────────────────────────────
initRemotePlayers(scene);

// ── Multiplayer ────────────────────────────────────────────────────────
initMultiplayer(({ name }) => {
  initLocalPlayer(scene, camera, name);
});

// ── Resize ─────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Game loop ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();

// NPC waving animation
let npcTime = 0;
const npcs  = [];
scene.traverse(obj => { if (obj.userData.isNPC) npcs.push(obj); });

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  npcTime += delta;

  const pos  = getLocalPlayerPosition();
  const rotY = getLocalPlayerRotY();

  if (pos) {
    updateLocalPlayer(delta);
    updateMultiplayer(pos, rotY);
    updateStores(pos);
  }

  updateRemotePlayers();
  updateOnlineCount(1 + getRemotePlayerCount());
  updateCats(delta, npcTime);
  updateDogs(delta, npcTime);

  // NPC waving: oscillate arm forward/back around raised position
  npcs.forEach(npc => {
    npc.userData.waveArm.rotation.x = Math.sin(npcTime * 3.5) * 0.45;
    if (npc.userData.npcType === 'mainStore') {
      npc.rotation.y += delta * 0.35;  // plaza NPC slowly turns
    }
  });

  renderer.render(scene, camera);
}

animate();
