// ── Login Screen: Username/Password → Character Selection ──

let _onLoginComplete = null;

export function initLoginScreen(onComplete) {
  alert('LOGIN SCREEN STARTED!');
  _onLoginComplete = onComplete;

  const container = document.createElement('div');
  container.id = 'login-screen';
  container.innerHTML = `
    <style>
      #login-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20000;
        font-family: 'Segoe UI', Arial, sans-serif;
      }

      .login-box {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 50px 60px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.2);
        min-width: 400px;
      }

      .login-title {
        color: white;
        font-size: 42px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 10px;
        text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      .login-subtitle {
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        text-align: center;
        margin-bottom: 40px;
      }

      .input-group {
        margin-bottom: 25px;
      }

      .input-label {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
        display: block;
      }

      .input-field {
        width: 100%;
        padding: 15px 20px;
        font-size: 16px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        outline: none;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }

      .input-field::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .input-field:focus {
        border-color: #4CAF50;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
      }

      .login-button {
        width: 100%;
        padding: 18px;
        font-size: 18px;
        font-weight: bold;
        color: white;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        margin-top: 10px;
      }

      .login-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(76, 175, 80, 0.6);
      }

      .login-button:active {
        transform: translateY(0);
      }

      .error-message {
        color: #ff6b6b;
        font-size: 14px;
        text-align: center;
        margin-top: 15px;
        display: none;
      }

      @media (max-width: 768px) {
        .login-box {
          min-width: 300px;
          padding: 40px 30px;
        }
        .login-title { font-size: 32px; }
      }
    </style>

    <div class="login-box">
      <div class="login-title">Welcome</div>
      <div class="login-subtitle">Enter your credentials to continue</div>

      <form id="login-form">
        <div class="input-group">
          <label class="input-label">Username</label>
          <input
            type="text"
            id="username-input"
            class="input-field"
            placeholder="Enter username"
            autocomplete="username"
            required
          />
        </div>

        <div class="input-group">
          <label class="input-label">Password</label>
          <input
            type="password"
            id="password-input"
            class="input-field"
            placeholder="Enter password"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="login-button">
          Login
        </button>

        <div class="error-message" id="error-message">
          Invalid credentials. Please try again.
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(container);

  // Setup form submission
  const form = container.querySelector('#login-form');
  const usernameInput = container.querySelector('#username-input');
  const passwordInput = container.querySelector('#password-input');
  const errorMessage = container.querySelector('#error-message');

  // Auto-fill if saved
  const savedUsername = localStorage.getItem('username');
  if (savedUsername) {
    usernameInput.value = savedUsername;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      errorMessage.textContent = 'Please fill in all fields.';
      errorMessage.style.display = 'block';
      return;
    }

    // Simple validation (for demo - replace with real auth)
    if (username.length < 3) {
      errorMessage.textContent = 'Username must be at least 3 characters.';
      errorMessage.style.display = 'block';
      return;
    }

    // Save credentials
    localStorage.setItem('username', username);
    localStorage.setItem('user_authenticated', 'true');

    // Hide error
    errorMessage.style.display = 'none';

    // Remove login screen
    hideLoginScreen();

    // Proceed to character selection or game
    if (_onLoginComplete) {
      _onLoginComplete(username);
    }
  });

  // Focus username field
  setTimeout(() => usernameInput.focus(), 100);
}

export function hideLoginScreen() {
  const container = document.getElementById('login-screen');
  if (container) {
    container.remove();
  }
}

export function isAuthenticated() {
  return localStorage.getItem('user_authenticated') === 'true';
}

export function logout() {
  localStorage.removeItem('user_authenticated');
  localStorage.removeItem('selected_character');
  window.location.reload();
}

export function getUsername() {
  return localStorage.getItem('username') || 'Player';
}

// No loading progress - that's handled by character selection now
export function updateLoadingProgress() {
  // Deprecated - kept for compatibility
}
