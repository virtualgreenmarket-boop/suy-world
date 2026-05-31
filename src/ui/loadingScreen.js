// Loading Screen with REAL asset loading

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _loadingContainer = null;
let _progressBar = null;
let _progressText = null;
let _statusText = null;
let _onLoadComplete = null;

export function initLoadingScreen(onComplete) {
  _onLoadComplete = onComplete;

  _loadingContainer = document.createElement('div');
  _loadingContainer.id = 'loading-screen';
  _loadingContainer.innerHTML = `
    <style>
      #loading-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('/models/ui/pic/913ace22-ffad-4026-bfdd-4f53e9e272d2.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 30000;
        font-family: 'Segoe UI', Arial, sans-serif;
      }

      #loading-screen::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        z-index: -1;
      }

      .loading-logo {
        color: white;
        font-size: 72px;
        font-weight: bold;
        margin-bottom: 60px;
        text-shadow: 0 6px 20px rgba(0,0,0,0.8);
        letter-spacing: 4px;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.02); }
      }

      .loading-bar-container {
        width: 500px;
        height: 30px;
        background: rgba(255,255,255,0.1);
        border-radius: 15px;
        border: 2px solid rgba(255,255,255,0.3);
        overflow: hidden;
        position: relative;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }

      .loading-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50 0%, #45a049 50%, #4CAF50 100%);
        border-radius: 13px;
        transition: width 0.3s ease;
        box-shadow: 0 0 20px rgba(76, 175, 80, 0.6);
        position: relative;
        overflow: hidden;
      }

      .loading-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      .loading-progress-text {
        color: white;
        font-size: 24px;
        font-weight: bold;
        margin-top: 20px;
        text-shadow: 0 2px 8px rgba(0,0,0,0.8);
      }

      .loading-status {
        color: rgba(255,255,255,0.9);
        font-size: 18px;
        margin-top: 10px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        min-height: 24px;
      }

      @media (max-width: 768px) {
        .loading-logo { font-size: 48px; margin-bottom: 40px; }
        .loading-bar-container { width: 80%; max-width: 400px; }
        .loading-progress-text { font-size: 20px; }
      }
    </style>

    <div class="loading-logo">SUY WORLD</div>

    <div class="loading-bar-container">
      <div class="loading-bar-fill" id="loading-bar-fill" style="width: 0%"></div>
    </div>

    <div class="loading-progress-text" id="loading-progress-text">0%</div>
    <div class="loading-status" id="loading-status">Starting...</div>
  `;

  document.body.appendChild(_loadingContainer);

  _progressBar = document.getElementById('loading-bar-fill');
  _progressText = document.getElementById('loading-progress-text');
  _statusText = document.getElementById('loading-status');

  // Start REAL loading
  startRealLoading();
}

async function startRealLoading() {
  const loader = new GLTFLoader();
  const loadingManager = new THREE.LoadingManager();

  let totalItems = 0;
  let loadedItems = 0;

  // Track loading progress
  loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    totalItems = itemsTotal;
    loadedItems = itemsLoaded;
    const percent = Math.round((itemsLoaded / itemsTotal) * 100);
    updateProgress(percent, `Loading ${itemsLoaded}/${itemsTotal} assets...`);
  };

  loadingManager.onLoad = () => {
    console.log('[loading] LoadingManager.onLoad called - ignoring, using manual flow');
    // Don't do anything here - we handle completion manually below
  };

  loadingManager.onError = (url) => {
    console.error('[loading] Failed to load:', url);
  };

  // Use the loading manager for GLTFLoader
  const managedLoader = new GLTFLoader(loadingManager);

  try {
    updateProgress(5, 'Loading player animations...');

    // Load all player animations (5 files)
    const animationPromises = [
      managedLoader.loadAsync('/models/player/animations/idle.glb'),
      managedLoader.loadAsync('/models/player/animations/walking.glb'),
      managedLoader.loadAsync('/models/player/animations/running.glb'),
      managedLoader.loadAsync('/models/player/animations/jump.glb'),
      managedLoader.loadAsync('/models/player/animations/SittingIdle.glb'),
    ];

    await Promise.all(animationPromises);
    console.log('[loading] ✅ Player animations loaded');
    updateProgress(40, 'Loading character models...');

    // Load all 6 character models
    const characterPromises = [];
    for (let i = 1; i <= 6; i++) {
      characterPromises.push(
        managedLoader.loadAsync(`/models/player/characters/model${i}.glb`)
      );
    }

    await Promise.all(characterPromises);
    console.log('[loading] ✅ Character models loaded');
    updateProgress(70, 'Loading world assets...');

    // Preload trees (if available)
    try {
      await managedLoader.loadAsync('/models/environment/trees/tree_1.glb');
      console.log('[loading] ✅ Trees loaded');
    } catch (err) {
      console.log('[loading] Trees not found (optional)');
    }

    updateProgress(90, 'Preparing world...');

    // Small delay to show 90%
    await new Promise(resolve => setTimeout(resolve, 300));

    updateProgress(100, 'Complete!');

    // Wait at 100%, HIDE screen, THEN proceed to login
    await new Promise(resolve => setTimeout(resolve, 800));

    hideLoadingScreen();

    // Wait for fade-out, then call login screen
    await new Promise(resolve => setTimeout(resolve, 600));

    if (_onLoadComplete) {
      _onLoadComplete();
    }

  } catch (err) {
    console.error('[loading] Error during asset loading:', err);
    updateProgress(100, 'Starting anyway...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    hideLoadingScreen();

    await new Promise(resolve => setTimeout(resolve, 600));

    if (_onLoadComplete) {
      _onLoadComplete();
    }
  }
}

function updateProgress(percent, status) {
  if (_progressBar) {
    _progressBar.style.width = `${percent}%`;
  }
  if (_progressText) {
    _progressText.textContent = `${percent}%`;
  }
  if (_statusText && status) {
    _statusText.textContent = status;
  }
}

function hideLoadingScreen() {
  if (_loadingContainer) {
    _loadingContainer.style.opacity = '0';
    _loadingContainer.style.transition = 'opacity 0.5s ease';

    // Remove after fade-out
    setTimeout(() => {
      if (_loadingContainer) {
        _loadingContainer.remove();
        _loadingContainer = null;
        _progressBar = null;
        _progressText = null;
        _statusText = null;
      }
    }, 500);
  }
}

export function setLoadingProgress(percent, status) {
  updateProgress(percent, status);
}
