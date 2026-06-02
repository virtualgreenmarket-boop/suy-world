import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

import { initIsland, updateWater }   from './world/island.js';
import { initPlaza,  updatePlaza }   from './world/plaza.js';
import { initPaths }                 from './world/paths.js';
import { initHangars, updateHangars } from './world/hangars.js';
import { initMarina, updateMarina }  from './world/marina.js';

import { initLocalPlayer, updateLocalPlayer, getLocalPlayerPosition, getLocalPlayerRotY, equipLocalPlayerItem, savePlayerPosition }
  from './player/localPlayer.js';
import { initRemotePlayers, updateRemotePlayers, getRemotePlayerCount, getRemotePlayerPosition }
  from './player/remotePlayer.js';

import { initMultiplayer, updateMultiplayer, sendChat, getSocket }
  from './systems/multiplayer.js';
import { initEconomy }      from './systems/economy.js';
import { preloadPlayerCharacter } from './player/playerCharacterLoader.js';
import { updateStores }     from './systems/stores.js';
import { initCollision }    from './systems/collision.js';
import { initCharacterSelection, getSavedCharacter } from './ui/characterSelection.js';
import { initLoginScreen, isAuthenticated, getUsername } from './ui/loginScreen.js';
import { initLoadingScreen } from './ui/loadingScreen.js';

import { initDecor }                      from './world/decor.js';
import { initBeach, updateBeach }         from './world/beach.js';
import { preloadTrees, spawnPlazaTree }   from './world/trees.js';
import { preloadAllNpcs }                  from './world/npcGlb.js';

import { initHud, updateOnlineCount, updateCoinDisplay } from './ui/hud.js';
import { initChatUI, bindSendChat, updateBubbles }       from './ui/chatUI.js';
import { initTouchControls }                             from './ui/touchControls.js';
import { initInteractionUI, updateInteractions }         from './ui/interactionUI.js';
import { initInventoryPanel, onEquipChange }             from './ui/inventoryPanel.js';
import { initSettingsPanel, applyQualitySettings, setSavePositionCallback, setMusicVolumeCallback, setMuteAllCallback, getSettings } from './ui/settingsPanel.js';
import { initMusic, setMusicVolume, setMuteAll } from './systems/music.js';

// ── Wait for DOM to be ready ──────────────────────────────────────────

let _appStarted = false; // Prevent multiple starts

function startApp() {
  if (_appStarted) {
    console.log('[main] App already started, ignoring duplicate call');
    return;
  }
  _appStarted = true;

  // ── Loading → Login → Character Selection → Game Flow ──────────────

  // Show loading screen first (0-100%)
  initLoadingScreen(() => {
    // After loading complete, show login screen
    initLoginScreen((username) => {
      // After login, show character selection
      initCharacterSelection((characterId) => {
        console.log('[main] Character selected:', characterId);
        // Start game with selected character
        startGame(characterId);
      });
    });
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  // DOM already loaded
  startApp();
}

// ── Game Initialization ──────────────────────────────────────────────

function startGame(selectedCharacterId) {

console.log(`[main] 🎮 Starting game with character ${selectedCharacterId}`);

// ── Scene ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
// Background is a sky sphere added in initIsland; keep a dark fallback only
scene.background = null;
scene.fog = new THREE.FogExp2(0xB8E0FA, 0.0014);

// ── Camera ─────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  68, window.innerWidth / window.innerHeight, 0.2, 900
);

// ── Quality tier ──────────────────────────────────────────────────────
const isMobile = true; // force mobile quality tier for testing

// ── Renderer ───────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
// LinearSRGBColorSpace → OutputPass handles final sRGB conversion
renderer.outputColorSpace    = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0x87CEEB, 1);
document.body.appendChild(renderer.domElement);


// ── Lighting ───────────────────────────────────────────────────────────

// Main sun — warm afternoon angle
const sun = new THREE.DirectionalLight(0xFFF4D6, 2.8);
sun.position.set(120, 220, 80);
sun.castShadow = true;
// Tight shadow frustum — covers the playable area, not the whole island
const shadowSize = isMobile ? 80 : 160;
sun.shadow.mapSize.width   = isMobile ? 1024 : 2048;
sun.shadow.mapSize.height  = isMobile ? 1024 : 2048;
sun.shadow.camera.near     = 1;
sun.shadow.camera.far      = 350;
sun.shadow.camera.left     = -shadowSize;
sun.shadow.camera.right    =  shadowSize;
sun.shadow.camera.top      =  shadowSize;
sun.shadow.camera.bottom   = -shadowSize;
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

// Hangar interior fill lights — skip on mobile (saves 3 light calculations)
if (!isMobile) {
  [
    {x:   0, y: 8, z: -130},
    {x: 130, y: 8, z:   0 },
    {x:   0, y: 8, z:  130},
  ].forEach(({ x, y, z }) => {
    const l = new THREE.PointLight(0xF0E8D8, 1.2, 70, 1.5);
    l.position.set(x, y, z);
    scene.add(l);
  });
}

// ── Post-processing ────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom — disabled on mobile and low-VRAM devices (too expensive); half-res on desktop
let bloomPass = null;
const hasHighVRAM = !isMobile && (renderer.capabilities.maxTextures >= 16);
if (hasHighVRAM) {
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2)),
    0.40,   // strength
    0.50,   // radius
    0.84    // threshold
  );
  composer.addPass(bloomPass);
}

// Final colour-space conversion (linear → sRGB) + tone mapping output
composer.addPass(new OutputPass());

// ── World ──────────────────────────────────────────────────────────────
initIsland(scene, { lowQuality: isMobile, maxTrees: isMobile ? 28 : 55 });
initPlaza(scene);
initPaths(scene);
initHangars(scene);
initMarina(scene);
initDecor(scene);
initBeach(scene);
initCollision();
spawnPlazaTree(scene);

// Kick off model + animation downloads immediately
console.log(`[main] 📥 Preloading selected character model: model${selectedCharacterId}.glb`);
preloadPlayerCharacter(selectedCharacterId)
  .then(() => {
    console.log(`[main] ✅ Character ${selectedCharacterId} preloaded successfully!`);
  })
  .catch(err => {
    console.error('[player] Character preload failed:', err);
  });

preloadTrees().catch(err => console.error('[trees] failed:', err));
preloadAllNpcs().catch(err => console.error('[npc-glb] failed:', err));

// ── UI ─────────────────────────────────────────────────────────────────
initHud();
initChatUI();
bindSendChat(sendChat);
initTouchControls();
initInteractionUI();
initInventoryPanel();
onEquipChange((cat, file) => equipLocalPlayerItem(cat, file));
initSettingsPanel(renderer);
applyQualitySettings(renderer);
setSavePositionCallback(savePlayerPosition);

initMusic();
const _s = getSettings();
setMusicVolume(_s.musicVolume / 100);
setMuteAll(_s.muteAll);
setMusicVolumeCallback(v => setMusicVolume(v));
setMuteAllCallback(b => setMuteAll(b));

// ── Multiplayer ────────────────────────────────────────────────────────
initRemotePlayers(scene);

initMultiplayer(({ name, coins }) => {
  const username = getUsername();
  initLocalPlayer(scene, camera, username || name);
  initEconomy(getSocket(), coins, updateCoinDisplay);
});

// ── Resize ─────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  if (bloomPass) bloomPass.resolution.set(Math.round(w / 2), Math.round(h / 2));
});

// ── Game loop ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let npcTime = 0;

// Throttle accumulators
let _tMed  = 0;   // fires every 50ms  → 20fps  (UI projections, interactions)
let _tSlow = 0;   // fires every 100ms → 10fps  (proximity checks, ambient anim)
let _tUI   = 0;   // fires every 3s             (online count DOM)

// Procedural (non-GLB) NPCs — collected once at startup
const npcs = [];
scene.traverse(obj => { if (obj.userData.isNPC) npcs.push(obj); });
npcs.forEach(npc => { npc.userData._baseY = npc.position.y; });

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  npcTime += delta;
  _tMed   += delta;
  _tSlow  += delta;
  _tUI    += delta;

  const pos  = getLocalPlayerPosition();
  const rotY = getLocalPlayerRotY();

  // ── Every frame: physics, networking, core animation ─────────────────
  if (pos) {
    updateLocalPlayer(delta);
    updateMultiplayer(pos, rotY);
  }
  updateRemotePlayers(delta);
  updateWater(delta);
  updatePlaza(delta, npcTime);
  updateHangars(delta);
  updateMarina(delta);

  // Procedural NPC animations (wave / spin / dance)
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    const t   = npcTime + (npc.userData.animPhase ?? 0);
    const wa  = npc.userData.waveArm;
    switch (npc.userData.animType) {
      case 'spin':
        npc.rotation.y = t * 1.2;
        break;
      case 'dance':
        npc.rotation.y = Math.sin(t * 2.2) * 0.6;
        npc.position.y = (npc.userData._baseY ?? 0) + Math.abs(Math.sin(t * 4.5)) * 0.22;
        if (wa) wa.rotation.z = -0.65 + Math.sin(t * 4.5) * 0.5;
        break;
      default:
        if (wa) wa.rotation.z = -0.65 + Math.sin(t * 3.2) * 0.7;
    }
  }

  // ── 20fps: UI projections, interaction prompts, chat bubbles ─────────
  if (_tMed >= 0.05) {
    if (pos) {
      updateInteractions(camera, pos);
      updateBubbles(camera, pos, getRemotePlayerPosition);
    }
    _tMed = 0;
  }

  // ── 10fps: proximity checks + ambient world animation ─────────────────
  if (_tSlow >= 0.1) {
    if (pos) updateStores(pos);
    updateBeach(_tSlow, npcTime);
    _tSlow = 0;
  }

  // ── Every 3s: online count (pure DOM text, no need faster) ───────────
  if (_tUI >= 3) {
    updateOnlineCount(1 + getRemotePlayerCount());
    _tUI = 0;
  }

  composer.render();
}

animate();

} // End of startGame function
