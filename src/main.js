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
import { initLighthouse, updateLighthouse, getLighthouseConfig } from './world/lighthouse.js';
import { initIslandDecor, updateIslandDecor } from './world/islandDecor.js';
import { initIslandLife, updateIslandLife } from './world/islandLife.js';

import { initLocalPlayer, updateLocalPlayer, getLocalPlayerPosition, getLocalPlayerRotY, getCameraYaw, equipLocalPlayerItem, savePlayerPosition, setGLBAnimalManager }
  from './player/localPlayer.js';
import { initRemotePlayers, updateRemotePlayers, getRemotePlayerCount, getRemotePlayerPosition }
  from './player/remotePlayer.js';

import { initMultiplayer, updateMultiplayer, sendChat, getSocket }
  from './systems/multiplayer.js';
import { initEconomy }      from './systems/economy.js';
import { preloadPlayerCharacter } from './player/playerCharacterLoader.js';
import { updateStores }     from './systems/stores.js';
import { initCollision, clearAllBoxes } from './systems/collision.js';
import { initCharacterSelection, getSavedCharacter } from './ui/characterSelection.js';
import { initLoginScreen, isAuthenticated, getUsername } from './ui/loginScreen.js';
import { initLoadingScreen } from './ui/loadingScreen.js';
import { initInventoryButton } from './ui/inventoryButton.js';

import { initDecor }                      from './world/decor.js';
import { initBeach, updateBeach }         from './world/beach.js';
import { preloadTrees, spawnPlazaTree, spawnTree }   from './world/trees.js';
import { preloadAllNpcs }                  from './world/npcGlb.js';
import { initAnimalSystem, updateAnimalSystem } from './world/AnimalSystem.js';
import { initPetSystem, updatePet } from './world/PetSystem.js';
import { AnimalManager } from './world/AnimalLoader.js';
import { initRoamingNPCs, updateRoamingNPCs } from './world/roamingNPCs.js';

import { initHud, updateOnlineCount, updateCoinDisplay } from './ui/hud.js';
import { initLeveling, awardStepEXP } from './systems/leveling.js';
import { initLevelDisplay } from './ui/levelDisplay.js';

// Step tracking for EXP
let _lastPlayerPosition = null;
let _totalStepsThisSession = 0;
import { initShopUI } from './ui/ShopUI.js';
import { initChatUI, bindSendChat, updateBubbles }       from './ui/chatUI.js';
import { initTouchControls }                             from './ui/touchControls.js';
import { initInteractionUI, updateInteractions }         from './ui/interactionUI.js';
import { initInventoryPanel, onEquipChange }             from './ui/inventoryPanel.js';
import { initSettingsPanel, applyQualitySettings, setSavePositionCallback, setMusicVolumeCallback, setMuteAllCallback, getSettings } from './ui/settingsPanel.js';
import { initMusic, setMusicVolume, setMuteAll } from './systems/music.js';
import { initCoordinatesDisplay, updateCoordinates } from './ui/coordinatesDisplay.js';
import { initLiveMap, updateLiveMap, disposeLiveMap, getMapPin, setMapPin } from './ui/liveMap.js';
import { createLiveMapUI, updateOnlineCount as updateLiveMapOnlineCount, removeLiveMapUI } from './ui/liveMapUI.js';
import { openFullscreenMap } from './ui/liveMapFullscreen.js';

// ── Helper: Extract remote player data for live map ──────────────────
function getRemotePlayersData() {
  const remotePlayers = [];
  for (const [id, player] of Object.entries(window._remotePlayers || {})) {
    if (player.mesh && player.mesh.position) {
      remotePlayers.push({
        id,
        x: player.mesh.position.x,
        z: player.mesh.position.z
      });
    }
  }
  return remotePlayers;
}

// ── HMR cleanup ───────────────────────────────────────────────────────
if (module.hot) {
  module.hot.dispose(() => {
    disposeLiveMap();
    removeLiveMapUI();
  });
}

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
      console.log('[main] User logged in:', username);
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
clearAllBoxes(); // Clear any phantom collision boxes from previous builds
initHangars(scene, camera); // Registers kiosk collision boxes
initMarina(scene);
initLighthouse(scene);

// Island decor & life initialization (optional features, don't block startup)
try {
  initIslandDecor(scene); // Tropical plants + beach furniture
  initIslandLife(scene); // Fish, crabs, dolphins
} catch (err) {
  console.error('[main] Island init error (non-critical):', err);
}

// Display lighthouse configuration
const lighthouseConfig = getLighthouseConfig();
console.log('[main] ═══════════════════════════════════════════════════════');
console.log('[main] LIGHTHOUSE CONFIGURATION:');
console.log(`[main] Position: X=${lighthouseConfig.position.x}, Y=${lighthouseConfig.position.y}, Z=${lighthouseConfig.position.z}`);
console.log(`[main] Tower: Radius=${lighthouseConfig.towerRadius}m, Height=${lighthouseConfig.towerHeight}m`);
console.log(`[main] Base: Radius=${lighthouseConfig.baseRadius}m`);
console.log(`[main] Stairs: ${lighthouseConfig.totalSteps} steps, Rise=${lighthouseConfig.stepRise.toFixed(3)}m per step`);
console.log(`[main] Observation Deck: Y=${lighthouseConfig.deckY.toFixed(2)}m, Radius=${lighthouseConfig.deckRadius}m`);
console.log(`[main] Collision: ${lighthouseConfig.collisionBoxes} boxes tagged "${lighthouseConfig.collisionTag}"`);
console.log('[main] ═══════════════════════════════════════════════════════');
initDecor(scene);
initBeach(scene);
initCollision(); // Adds hangar wall collision boxes AFTER kiosk boxes
spawnPlazaTree(scene);
initPetSystem(scene);

// ── UI (initialize early, before character loads) ─────────────────────
initHud();
initLeveling();
initLevelDisplay();

// Initialize live map system
if (initLiveMap(scene, renderer)) {
  const canvas = document.getElementById('live-map-canvas');
  createLiveMapUI(canvas);

  // M key to open fullscreen
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      const playerPos = getLocalPlayerPosition();
      const remotePlayers = getRemotePlayersData();
      openFullscreenMap(scene, renderer, playerPos, remotePlayers, getMapPin, setMapPin);
    }
  });
} else {
  console.error('[main] Failed to initialize live map');
}

initShopUI();
initChatUI();
bindSendChat(sendChat);
initTouchControls();
initInteractionUI();
initInventoryPanel();
initCoordinatesDisplay();
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

// Trees and NPCs already preloaded in loading screen
console.log('[main] Assets already preloaded during loading screen');

// Initialize GLB animal system
const animalManager = new AnimalManager({
  basePath: '/models/nature/animals/Ultimate Animated Animals - July 2021/glTF/',
  scene: scene
});

// Pass animalManager to localPlayer for collision detection
setGLBAnimalManager(animalManager);

// 4-ZONE ANIMAL SPAWNING: Relocate all animals to 4 designated zones
// Dogs and cats excluded - all other animals relocated
console.log('[main] 🦌 Spawning animals at 4 designated zones...');

// CRITICAL: Clear all existing animals first
animalManager.instances.forEach((instance, id) => {
  if (instance.root && instance.root.parent) {
    instance.root.parent.remove(instance.root);
  }
});
animalManager.instances.clear();
console.log('[main] Cleared all existing animals for re-spawn');

// Define 4 spawn zones (center point + 10m wander radius)
const SPAWN_ZONES = [
  { x: 98.82,   z: -147.17, name: 'North-East grass' },
  { x: 113.75,  z: 150.19,  name: 'South grass' },
  { x: -198.10, z: 59.15,   name: 'West coast/marina' },
  { x: -203.28, z: -49.81,  name: 'Northwest plaza' }
];

// Animals to spawn (excluding dogs/cats: Husky, ShibaInu)
const animalSpecies = ['Alpaca', 'Bull', 'Deer', 'Donkey', 'Fox', 'Stag', 'Wolf'];
const totalAnimals = 40;
const spawnPromises = [];
const zoneAnimalCounts = [0, 0, 0, 0];

for (let i = 0; i < totalAnimals; i++) {
  // Assign to zone (round-robin for even distribution)
  const zoneIndex = i % SPAWN_ZONES.length;
  const zone = SPAWN_ZONES[zoneIndex];
  zoneAnimalCounts[zoneIndex]++;

  // Random position within 50m radius of zone center (×5 from 10m)
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * 50; // 0-50m from center
  const spawnX = zone.x + Math.cos(angle) * distance;
  const spawnZ = zone.z + Math.sin(angle) * distance;

  // Random species, scale, rotation
  const species = animalSpecies[Math.floor(Math.random() * animalSpecies.length)];
  const scale = 0.9 + Math.random() * 0.25;
  const rotationY = Math.random() * Math.PI * 2;
  const startAnimation = Math.random() < 0.33 ? 'idle' : 'walk';

  spawnPromises.push(
    animalManager.spawn(species, { x: spawnX, y: 0, z: spawnZ }, {
      scale,
      rotationY,
      startAnimation,
      wanderRadius: 50 // Stay within 50m of spawn point (×5 from 10m)
    }).catch(err => {
      console.error(`[main] Failed to spawn ${species} in zone ${zoneIndex}:`, err);
    })
  );
}

Promise.all(spawnPromises).then(() => {
  console.log(`[main] ✅ Animals spawned at 4 zones:`);
  SPAWN_ZONES.forEach((zone, i) => {
    console.log(`  Zone ${i + 1} (${zone.name}): ${zoneAnimalCounts[i]} animals`);
  });
}).catch(err => {
  console.error('[main] ❌ Failed to spawn some animals:', err);
});

// PART 2: Place 5 trees around each zone (20 trees total)
console.log('[main] 🌳 Placing 5 trees around each of 4 zones (20 total)...');
preloadTrees().then(() => {
  let totalTreesPlaced = 0;
  SPAWN_ZONES.forEach((zone, zoneIndex) => {
    for (let t = 0; t < 5; t++) {
      // Random angle and distance: 50-100m from zone center (×5 from 10-20m)
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 50; // 50-100m from center
      const treeX = zone.x + Math.cos(angle) * distance;
      const treeZ = zone.z + Math.sin(angle) * distance;

      // Spawn tree at position
      spawnTree(scene, treeX, treeZ, 0, 1.0);
      totalTreesPlaced++;
    }
    console.log(`[main]   Zone ${zoneIndex + 1} (${zone.name}): 5 trees placed at 50-100m radius`);
  });
  console.log(`[main] ✅ Total trees placed: ${totalTreesPlaced}`);
}).catch(err => {
  console.error('[main] ❌ Failed to preload trees:', err);
});

// Preload selected character (no GLB loading, just store the type)
console.log('[main] 📥 Loading character...');
preloadPlayerCharacter(selectedCharacterId)
  .then(() => {
    console.log('[main] ✅ Character loaded!');

    initRemotePlayers(scene);

    initMultiplayer(({ name, coins }) => {
      const username = getUsername();
      console.log(`[main] 🎮 Initializing local player with character ${selectedCharacterId}`);
      initLocalPlayer(scene, camera, username || name, selectedCharacterId);
      initEconomy(getSocket(), coins, updateCoinDisplay);

      // Initialize inventory button after player is ready
      initInventoryButton();

      // Initialize animal system (needs to be after player initialization to get playerGroup)
      // Wait a bit for player to spawn
      setTimeout(() => {
        const playerGroup = scene.children.find(c => c.userData._charModel);
        if (playerGroup) {
          const animalSys = initAnimalSystem(scene, playerGroup);
          // Expose player group globally for shop and pet systems
          window._localPlayerGroup = playerGroup;

          // Initialize roaming NPCs after animals are ready
          initRoamingNPCs(scene, animalSys);
        }
      }, 1000);
    });
  })
  .catch(err => {
    console.error('[main] ❌ Failed to load character:', err);
    // Initialize anyway
    initRemotePlayers(scene);
    initMultiplayer(({ name, coins }) => {
      const username = getUsername();
      initLocalPlayer(scene, camera, username || name, selectedCharacterId);
      initEconomy(getSocket(), coins, updateCoinDisplay);
      initInventoryButton();

      // Initialize animal system (needs to be after player initialization)
      setTimeout(() => {
        const playerGroup = scene.children.find(c => c.userData._charModel);
        if (playerGroup) {
          const animalSys = initAnimalSystem(scene, playerGroup);
          // Expose player group globally for shop and pet systems
          window._localPlayerGroup = playerGroup;

          // Initialize roaming NPCs after animals are ready
          initRoamingNPCs(scene, animalSys);
        }
      }, 1000);
    });
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

  // Update coordinates display
  if (pos) {
    updateCoordinates(pos);

    // Track steps for EXP (award every meter moved)
    if (_lastPlayerPosition) {
      const dx = pos.x - _lastPlayerPosition.x;
      const dz = pos.z - _lastPlayerPosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance >= 1.0) {
        _totalStepsThisSession++;
        awardStepEXP(1);
        _lastPlayerPosition = { x: pos.x, z: pos.z };
      }
    } else {
      _lastPlayerPosition = { x: pos.x, z: pos.z };
    }
  }

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
  updateLighthouse(delta);
  updateAnimalSystem(delta);

  // Ceiling fans rotation
  scene.traverse(obj => {
    if (obj.userData.isCeilingFan) {
      obj.rotation.y += delta * obj.userData.rotationSpeed;
    }
  });
  updateRoamingNPCs(delta);
  if (window._localPlayerGroup) {
    updatePet(delta, window._localPlayerGroup);
  }
  if (animalManager) {
    animalManager.update(delta);
  }

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
    const onlineCount = 1 + getRemotePlayerCount();
    updateOnlineCount(onlineCount);
    updateLiveMapOnlineCount(onlineCount);
    _tUI = 0;
  }

  // ── Live map updates every frame ──────────────────────────────────────
  // Only update live map if player exists (avoid race condition during startup)
  const playerPos = getLocalPlayerPosition();
  if (playerPos) {
    const playerRotY = getLocalPlayerRotY();
    const remotePlayers = getRemotePlayersData();
    const cameraYaw = getCameraYaw();
    updateLiveMap(playerPos, playerRotY, remotePlayers, cameraYaw);

    // Island decor & life updates (after playerPos is defined)
    try {
      updateIslandDecor(delta, playerPos); // Wind sway on plants
      updateIslandLife(delta, playerPos); // Fish schools, crabs, dolphins
    } catch (err) {
      if (!window._islandUpdateErrorLogged) {
        console.error('[main] Island update error:', err);
        window._islandUpdateErrorLogged = true;
      }
    }
  }

  composer.render();
}

animate();

// ── Global function for inventory to update player appearance ────────
window.updatePlayerAppearance = function(changes) {
  console.log('[main] updatePlayerAppearance called:', changes);
  // TODO: Implement character rebuilding with new colors/equipment
  // This would rebuild the character model with the new options
};

} // End of startGame function
