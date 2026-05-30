// Login and character selection system

let _progressBar = null;
let _progressText = null;

export function initLoginScreen() {
  // Hide HUD initially
  hideHudElements();

  // Create loading screen first
  createLoadingScreen();
}

export function updateLoadingProgress(current, total) {
  if (!_progressBar || !_progressText) return;

  const percentage = (current / total) * 100;
  _progressBar.style.width = percentage + '%';
  _progressText.textContent = percentage.toFixed(2) + '%';

  // When loading is complete, show login screen
  if (current >= total) {
    setTimeout(() => {
      document.getElementById('loading-screen').remove();
      showLoginScreen();
    }, 500);
  }
}

function hideHudElements() {
  const style = document.createElement('style');
  style.id = 'login-hud-hide';
  style.textContent = `
    #hud-online, #hud-topleft, #hud-slot, #hud-coin { display: none !important; }
  `;
  document.head.appendChild(style);
}

function showHudElements() {
  const style = document.getElementById('login-hud-hide');
  if (style) style.remove();
}

// ── Loading Screen ────────────────────────────────────────────────────

function createLoadingScreen() {
  const container = document.createElement('div');
  container.id = 'loading-screen';
  container.style.cssText = `
    position: fixed;
    inset: 0;
    background: #000 url('/models/ui/pic/913ace22-ffad-4026-bfdd-4f53e9e272d2.png') center/cover;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    color: #fff;
    font-family: 'Segoe UI', Arial, sans-serif;
  `;

  container.innerHTML = `
    <div style="text-align: center;">
      <h1 style="font-size: 48px; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        שוק ירוק וירטואלי
      </h1>
      <div style="width: 400px; height: 30px; background: rgba(0,0,0,0.5); border-radius: 15px; overflow: hidden; border: 2px solid #4CAF50;">
        <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); transition: width 0.3s;"></div>
      </div>
      <p id="progress-text" style="margin-top: 15px; font-size: 24px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">0.00%</p>
      <p style="margin-top: 10px; font-size: 14px; opacity: 0.8;">טוען משאבים...</p>
    </div>
  `;

  document.body.appendChild(container);

  // Store references for external updates
  _progressBar = document.getElementById('progress-bar');
  _progressText = document.getElementById('progress-text');
}

// ── Login Screen ──────────────────────────────────────────────────────

function showLoginScreen() {
  const container = document.createElement('div');
  container.id = 'login-screen';
  container.style.cssText = `
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: 'Segoe UI', Arial, sans-serif;
  `;

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.95); padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); width: 400px; direction: rtl;">
      <h2 style="text-align: center; margin-bottom: 30px; color: #333; font-size: 32px;">כניסה למשחק</h2>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: #555; font-weight: 600;">שם משתמש</label>
        <input id="username" type="text" placeholder="ADMIN"
          style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; direction: ltr; text-align: left;">
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; margin-bottom: 8px; color: #555; font-weight: 600;">סיסמה</label>
        <input id="password" type="password" placeholder="1234"
          style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; direction: ltr; text-align: left;">
      </div>

      <p id="login-error" style="color: #f44336; text-align: center; margin-bottom: 15px; height: 20px; font-size: 14px;"></p>

      <button id="login-btn"
        style="width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer; transition: transform 0.2s;">
        התחבר
      </button>
    </div>
  `;

  document.body.appendChild(container);

  // Event listeners
  const loginBtn = document.getElementById('login-btn');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  loginBtn.addEventListener('mouseenter', () => {
    loginBtn.style.transform = 'scale(1.05)';
  });

  loginBtn.addEventListener('mouseleave', () => {
    loginBtn.style.transform = 'scale(1)';
  });

  loginBtn.addEventListener('click', handleLogin);
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

function handleLogin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');

  if (username === 'ADMIN' && password === '1234') {
    errorEl.textContent = '';
    document.getElementById('login-screen').remove();
    showCharacterSelection();
  } else {
    errorEl.textContent = 'שם משתמש או סיסמה שגויים!';
    document.getElementById('password').value = '';
  }
}

// ── Character Selection ───────────────────────────────────────────────

function showCharacterSelection() {
  const container = document.createElement('div');
  container.id = 'character-selection';
  container.style.cssText = `
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
    font-family: 'Segoe UI', Arial, sans-serif;
  `;

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.95); padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 800px; direction: rtl;">
      <h2 style="text-align: center; margin-bottom: 40px; color: #333; font-size: 32px;">בחר דמות</h2>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">

        <div class="character-card" data-character="male" style="background: white; border: 3px solid #ddd; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;">
          <div style="font-size: 64px; margin-bottom: 10px;">👨</div>
          <h3 style="color: #333; font-size: 18px;">זכר</h3>
        </div>

        <div class="character-card" data-character="female" style="background: white; border: 3px solid #ddd; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;">
          <div style="font-size: 64px; margin-bottom: 10px;">👩</div>
          <h3 style="color: #333; font-size: 18px;">נקבה</h3>
        </div>

        <div class="character-card" data-character="custom" style="background: white; border: 3px solid #ddd; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;">
          <div style="font-size: 64px; margin-bottom: 10px;">🎨</div>
          <h3 style="color: #333; font-size: 18px;">מותאם אישית</h3>
        </div>

      </div>

      <button id="start-game-btn" disabled
        style="width: 100%; padding: 14px; background: #ccc; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: not-allowed; transition: all 0.3s;">
        התחל משחק
      </button>
    </div>
  `;

  document.body.appendChild(container);

  let selectedCharacter = null;
  const cards = container.querySelectorAll('.character-card');
  const startBtn = document.getElementById('start-game-btn');

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (card.dataset.character !== selectedCharacter) {
        card.style.transform = 'scale(1.05)';
        card.style.borderColor = '#999';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (card.dataset.character !== selectedCharacter) {
        card.style.transform = 'scale(1)';
        card.style.borderColor = '#ddd';
      }
    });

    card.addEventListener('click', () => {
      // Deselect all
      cards.forEach(c => {
        c.style.background = 'white';
        c.style.borderColor = '#ddd';
        c.style.transform = 'scale(1)';
      });

      // Select this one
      card.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      card.style.borderColor = '#f5576c';
      card.querySelector('h3').style.color = 'white';

      selectedCharacter = card.dataset.character;

      // Enable start button
      startBtn.disabled = false;
      startBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      startBtn.style.cursor = 'pointer';
    });
  });

  startBtn.addEventListener('click', () => {
    if (selectedCharacter) {
      container.remove();
      // Save character choice
      localStorage.setItem('selectedCharacter', selectedCharacter);
      // Show HUD elements now
      showHudElements();
      console.log('Selected character:', selectedCharacter);
    }
  });
}
