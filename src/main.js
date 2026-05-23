import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass }        from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

import { initIsland }        from './world/island.js';
import { initPlaza }         from './world/plaza.js';
import { initPaths }         from './world/paths.js';
import { initHangars }       from './world/hangars.js';
import { initMarina }        from './world/marina.js';

import { initLocalPlayer, updateLocalPlayer, getLocalPlayerPosition, getLocalPlayerRotY }
  from './player/localPlayer.js';
import { initRemotePlayers, updateRemotePlayers, getRemotePlayerCount, getRemotePlayerPosition }
  from './player/remotePlayer.js';

import { initMultiplayer, updateMultiplayer, sendChat, getSocket }
  from './systems/multiplayer.js';
import { initEconomy } from './systems/economy.js';
import { preloadCharacter } from './player/characterLoader.js';
import { preloadAnimations } from './player/animations.js';
import { updateStores }      from './systems/stores.js';
import { initCollision }     from './systems/collision.js';

import { initCats, updateCats } from './world/cats.js';
import { initDogs, updateDogs } from './world/dogs.js';

import { initDecor } from './world/decor.js';

import { initHud, updateOnlineCount, updateCoinDisplay } from './ui/hud.js';
import { initChatUI, bindSendChat, updateBubbles } from './ui/chatUI.js';
import { initTouchControls } from './ui/touchControls.js';

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
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace  = THREE.LinearSRGBColorSpace; // OutputPass handles sRGB conversion
document.body.appendChild(renderer.domElement);

// ── Lighting ───────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xFFF8F0, 2.2);
sun.position.set(120, 220, 80);
sun.castShadow = true;
sun.shadow.mapSize.width   = 4096;
sun.shadow.mapSize.height  = 4096;
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

// ── Post-processing ────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 8;
ssaoPass.minDistance  = 0.005;
ssaoPass.maxDistance  = 0.12;
composer.addPass(ssaoPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,   // strength
  0.5,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

composer.addPass(new OutputPass());

// ── World ──────────────────────────────────────────────────────────────
initIsland(scene);
initPlaza(scene);
initPaths(scene);
initHangars(scene);
initMarina(scene);
initCats(scene);
initDogs(scene);
initDecor(scene);
initCollision();

// Kick off model + animation downloads immediately
preloadCharacter().catch(err => console.error('[character] model failed to load:', err));
preloadAnimations().catch(err => console.error('[animations] failed to load:', err));

// ── UI ─────────────────────────────────────────────────────────────────
initHud();
initChatUI();
bindSendChat(sendChat);
initTouchControls();

// ── Remote players ─────────────────────────────────────────────────────
initRemotePlayers(scene);

// ── Multiplayer ────────────────────────────────────────────────────────
initMultiplayer(({ name, coins }) => {
  initLocalPlayer(scene, camera, name);
  initEconomy(getSocket(), coins, updateCoinDisplay);
});

// ── Resize ─────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  ssaoPass.setSize(w, h);
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
    updateBubbles(camera, pos, getRemotePlayerPosition);
  }

  updateRemotePlayers(delta);
  updateOnlineCount(1 + getRemotePlayerCount());
  updateCats(delta, npcTime);
  updateDogs(delta, npcTime);

  // Tree-person NPC animations (wave / spin / dance)
  npcs.forEach(npc => {
    const t  = npcTime + (npc.userData.animPhase ?? 0);
    const wa = npc.userData.waveArm;
    switch (npc.userData.animType) {
      case 'spin':
        npc.rotation.y = t * 1.2;
        break;
      case 'dance':
        npc.rotation.y  = Math.sin(t * 2.2) * 0.6;
        npc.position.y  = Math.abs(Math.sin(t * 4.5)) * 0.22;
        wa.rotation.z   = -0.65 + Math.sin(t * 4.5) * 0.5;
        break;
      default: // 'wave'
        wa.rotation.z = -0.65 + Math.sin(t * 3.2) * 0.7;
    }
  });

  composer.render();
}

animate();
