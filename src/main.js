import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

import { initIsland, updateWater }   from './world/island.js';
import { initPlaza,  updatePlaza }   from './world/plaza.js';
import { initPaths }                 from './world/paths.js';
import { initHangars }               from './world/hangars.js';
import { initMarina }                from './world/marina.js';

import { initLocalPlayer, updateLocalPlayer, getLocalPlayerPosition, getLocalPlayerRotY }
  from './player/localPlayer.js';
import { initRemotePlayers, updateRemotePlayers, getRemotePlayerCount, getRemotePlayerPosition }
  from './player/remotePlayer.js';

import { initMultiplayer, updateMultiplayer, sendChat, getSocket }
  from './systems/multiplayer.js';
import { initEconomy }      from './systems/economy.js';
import { preloadCharacter } from './player/characterLoader.js';
import { preloadAnimations } from './player/animations.js';
import { updateStores }     from './systems/stores.js';
import { initCollision }    from './systems/collision.js';

import { initCats, updateCats }           from './world/cats.js';
import { initDogs, updateDogs }           from './world/dogs.js';
import { initDecor }                      from './world/decor.js';
import { initBeach, updateBeach }         from './world/beach.js';
import { initOceanLife, updateOceanLife } from './world/oceanLife.js';
import { preloadTrees }                   from './world/trees.js';

import { initHud, updateOnlineCount, updateCoinDisplay } from './ui/hud.js';
import { initChatUI, bindSendChat, updateBubbles }       from './ui/chatUI.js';
import { initTouchControls }                             from './ui/touchControls.js';

// ── Scene ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.0016);

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
renderer.toneMappingExposure = 1.05;
// LinearSRGBColorSpace → OutputPass handles final sRGB conversion
renderer.outputColorSpace   = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Lighting ───────────────────────────────────────────────────────────

// Main sun — warm afternoon angle
const sun = new THREE.DirectionalLight(0xFFF4D6, 2.8);
sun.position.set(120, 220, 80);
sun.castShadow = true;
sun.shadow.mapSize.width   = 4096;
sun.shadow.mapSize.height  = 4096;
sun.shadow.camera.near     = 1;
sun.shadow.camera.far      = 900;
sun.shadow.camera.left     = -340;
sun.shadow.camera.right    =  340;
sun.shadow.camera.top      =  340;
sun.shadow.camera.bottom   = -340;
sun.shadow.bias            = -0.0008;
sun.shadow.normalBias      = 0.04;
scene.add(sun);

// Sky dome — blue from above, warm earth-glow from below
scene.add(new THREE.HemisphereLight(0x92C8F5, 0x7A6C50, 0.85));

// Soft fill from the opposite direction (bounced light simulation)
const fill = new THREE.DirectionalLight(0xC8E8FF, 0.55);
fill.position.set(-80, 60, -120);
scene.add(fill);

// Subtle ambient so shadows never go pure black
scene.add(new THREE.AmbientLight(0xffffff, 0.20));

// Plaza warm point light — makes the mosaic glow invitingly
const plazaLight = new THREE.PointLight(0xFFD080, 1.8, 60, 1.5);
plazaLight.position.set(0, 8, 0);
plazaLight.castShadow = false; // perf: no shadow from area fill
scene.add(plazaLight);

// Hangar interior fill lights (one per hangar)
[
  {x:   0, y: 8, z: -130},
  {x: 130, y: 8, z:   0 },
  {x:   0, y: 8, z:  130},
].forEach(({ x, y, z }) => {
  const l = new THREE.PointLight(0xF0E8D8, 1.2, 70, 1.5);
  l.position.set(x, y, z);
  scene.add(l);
});

// ── Post-processing ────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Subtle bloom — brightens highlights and sun reflections on water
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.45,   // strength
  0.55,   // radius
  0.82    // threshold — only bright highlights bloom
);
composer.addPass(bloomPass);

// Final colour-space conversion (linear → sRGB) + tone mapping output
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
initBeach(scene);
initOceanLife(scene);
initCollision();

// Kick off model + animation downloads immediately (all in parallel)
preloadCharacter().catch(err => console.error('[character] model failed:', err));
preloadAnimations().catch(err => console.error('[animations] failed:', err));
preloadTrees().catch(err => console.error('[trees] failed:', err));

// ── UI ─────────────────────────────────────────────────────────────────
initHud();
initChatUI();
bindSendChat(sendChat);
initTouchControls();

// ── Multiplayer ────────────────────────────────────────────────────────
initRemotePlayers(scene);

initMultiplayer(({ name, coins }) => {
  initLocalPlayer(scene, camera, name);
  initEconomy(getSocket(), coins, updateCoinDisplay);
});

// ── Resize ─────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
});

// ── Game loop ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();
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
  updateWater(delta);
  updatePlaza(delta, npcTime);
  updateBeach(delta, npcTime);
  updateOceanLife(delta, npcTime);

  // NPC animations (wave / spin / dance)
  npcs.forEach(npc => {
    const t  = npcTime + (npc.userData.animPhase ?? 0);
    const wa = npc.userData.waveArm;
    switch (npc.userData.animType) {
      case 'spin':
        npc.rotation.y = t * 1.2;
        break;
      case 'dance':
        npc.rotation.y = Math.sin(t * 2.2) * 0.6;
        npc.position.y = (npc.userData._baseY ?? 0) + Math.abs(Math.sin(t * 4.5)) * 0.22;
        if (wa) wa.rotation.z = -0.65 + Math.sin(t * 4.5) * 0.5;
        break;
      default: // 'wave'
        if (wa) wa.rotation.z = -0.65 + Math.sin(t * 3.2) * 0.7;
    }
  });

  composer.render();
}

// Store base Y for dance NPCs so they don't drift
npcs.forEach(npc => { npc.userData._baseY = npc.position.y; });

animate();
