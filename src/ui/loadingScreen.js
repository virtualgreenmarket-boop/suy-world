// Loading Screen with Progress Bar (0-100%)

let _loadingContainer = null;
let _progressBar = null;
let _progressText = null;
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
        color: rgba(255,255,255,0.7);
        font-size: 16px;
        margin-top: 10px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
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
    <div class="loading-status" id="loading-status">Initializing...</div>
  `;

  document.body.appendChild(_loadingContainer);

  _progressBar = document.getElementById('loading-bar-fill');
  _progressText = document.getElementById('loading-progress-text');

  // Start simulated loading
  startLoading();
}

let _currentProgress = 0;

function startLoading() {
  const statusEl = document.getElementById('loading-status');

  // Simulated loading stages
  const stages = [
    { progress: 15, text: 'Loading assets...' },
    { progress: 30, text: 'Loading models...' },
    { progress: 50, text: 'Loading animations...' },
    { progress: 70, text: 'Loading world...' },
    { progress: 90, text: 'Preparing game...' },
    { progress: 100, text: 'Complete!' }
  ];

  let currentStage = 0;

  const interval = setInterval(() => {
    if (currentStage >= stages.length) {
      clearInterval(interval);

      // Wait a moment at 100% then proceed
      setTimeout(() => {
        hideLoadingScreen();
        if (_onLoadComplete) {
          _onLoadComplete();
        }
      }, 500);
      return;
    }

    const stage = stages[currentStage];
    const targetProgress = stage.progress;

    // Smooth increment
    const increment = setInterval(() => {
      if (_currentProgress >= targetProgress) {
        clearInterval(increment);
        currentStage++;
        return;
      }

      _currentProgress += 1;
      updateProgress(_currentProgress, stage.text);
    }, 30);

  }, 800);
}

function updateProgress(percent, status) {
  if (_progressBar) {
    _progressBar.style.width = `${percent}%`;
  }
  if (_progressText) {
    _progressText.textContent = `${percent}%`;
  }
  const statusEl = document.getElementById('loading-status');
  if (statusEl && status) {
    statusEl.textContent = status;
  }
}

function hideLoadingScreen() {
  if (_loadingContainer) {
    _loadingContainer.remove();
    _loadingContainer = null;
    _progressBar = null;
    _progressText = null;
  }
}

export function setLoadingProgress(percent, status) {
  updateProgress(percent, status);
}
