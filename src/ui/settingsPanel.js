// Settings panel — music, sfx, graphics quality, look sensitivity.
// Settings are persisted in localStorage.

const STORAGE_KEY = 'suy_settings';

const _defaults = {
  musicMuted:   false,
  sfxMuted:     false,
  quality:      'high',   // 'low' | 'medium' | 'high'
  sensitivity:  1.0,      // multiplier for mouse/touch camera rotation (0.3–2.0)
};

let _settings = _load();
let _panel    = null;
let _visible  = false;

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ..._defaults, ...JSON.parse(raw) } : { ..._defaults };
  } catch { return { ..._defaults }; }
}

function _save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
}

export function getSettings() { return _settings; }

// ── Apply quality settings to the renderer ────────────────────────────

export function applyQualitySettings(renderer) {
  if (!renderer) return;
  switch (_settings.quality) {
    case 'low':
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      break;
    case 'medium':
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      break;
    case 'high':
    default:
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      break;
  }
}

// ── Init ──────────────────────────────────────────────────────────────

export function initSettingsPanel(renderer) {
  _buildPanel(renderer);
}

function _buildPanel(renderer) {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #sp-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.60);
      z-index: 310;
      display: none;
      align-items: center; justify-content: center;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    #sp-overlay.sp-open { display: flex; }
    #sp-panel {
      background: rgba(14,14,26,0.97);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      padding: 28px 32px 24px;
      width: min(420px, 90vw);
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      backdrop-filter: blur(18px);
      color: #fff;
    }
    #sp-panel h2 {
      margin: 0 0 22px;
      font-size: 18px; font-weight: 700; letter-spacing: 0.5px;
      color: #fff;
    }
    .sp-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 0;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .sp-row:last-of-type { border-bottom: none; }
    .sp-label {
      font-size: 14px; color: rgba(255,255,255,0.80);
    }
    .sp-toggle {
      width: 44px; height: 24px; border-radius: 12px;
      background: rgba(255,255,255,0.15);
      border: 1.5px solid rgba(255,255,255,0.22);
      cursor: pointer; position: relative; transition: background 0.2s;
      flex-shrink: 0;
    }
    .sp-toggle.on { background: #7c6af7; border-color: #9a8aff; }
    .sp-toggle::after {
      content: '';
      position: absolute; top: 3px; left: 3px;
      width: 16px; height: 16px;
      border-radius: 50%; background: #fff;
      transition: transform 0.2s;
    }
    .sp-toggle.on::after { transform: translateX(20px); }
    .sp-quality-btns { display: flex; gap: 6px; }
    .sp-qbtn {
      padding: 5px 13px; border-radius: 12px; font-size: 12px;
      font-weight: 600; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.22);
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.65);
      transition: all 0.15s;
    }
    .sp-qbtn.active {
      background: #7c6af7; border-color: #9a8aff; color: #fff;
    }
    .sp-slider {
      -webkit-appearance: none; appearance: none;
      width: 140px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.18); outline: none; cursor: pointer;
    }
    .sp-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 18px; height: 18px;
      border-radius: 50%; background: #7c6af7; cursor: pointer;
      border: 2px solid #9a8aff;
    }
    .sp-close-btn {
      margin-top: 22px; width: 100%;
      padding: 11px; border-radius: 26px;
      background: rgba(124,106,247,0.85); color: #fff;
      font-size: 14px; font-weight: 700; border: none; cursor: pointer;
      letter-spacing: 0.5px;
      transition: background 0.15s;
    }
    .sp-close-btn:hover { background: #7c6af7; }
    .sp-rules-btn {
      width: 100%; margin-top: 10px;
      padding: 11px; border-radius: 26px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.14);
      color: rgba(255,255,255,0.75);
      font-size: 14px; font-weight: 600; cursor: pointer;
      letter-spacing: 0.5px; transition: background 0.15s;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .sp-rules-btn:hover { background: rgba(255,255,255,0.13); }

    /* ── Rules overlay ── */
    #sp-rules-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.72);
      z-index: 320;
      display: none; align-items: flex-end; justify-content: center;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    #sp-rules-overlay.open { display: flex; }
    #sp-rules-sheet {
      background: rgba(14,14,26,0.98);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px 20px 0 0;
      width: min(480px, 100vw);
      max-height: 88vh;
      display: flex; flex-direction: column;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.6);
      backdrop-filter: blur(20px);
    }
    #sp-rules-sheet .rsh-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.18);
      margin: 12px auto 0; flex-shrink: 0;
    }
    #sp-rules-sheet .rsh-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    #sp-rules-sheet .rsh-title {
      font-size: 16px; font-weight: 700; color: #fff;
    }
    #sp-rules-sheet .rsh-close {
      width: 28px; height: 28px; border-radius: 50%;
      border: none; background: rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.7); font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    #sp-rules-sheet .rsh-close:hover { background: rgba(255,255,255,0.22); }
    #sp-rules-body {
      overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 18px 20px 36px; flex: 1;
      color: rgba(255,255,255,0.82); font-size: 13.5px; line-height: 1.65;
    }
    #sp-rules-body .ri { color: rgba(255,255,255,0.55); margin-bottom: 20px; }
    #sp-rules-body h3 {
      font-size: 11px; font-weight: 700; letter-spacing: .07em;
      text-transform: uppercase; color: #9a8aff;
      margin: 20px 0 7px;
    }
    #sp-rules-body p { margin-bottom: 8px; }
    #sp-rules-body ul { padding-left: 16px; margin: 4px 0 8px; }
    #sp-rules-body ul li { margin-bottom: 4px; }
    #sp-rules-body a { color: #9a8aff; text-decoration: none; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'sp-overlay';

  _panel = document.createElement('div');
  _panel.id = 'sp-panel';

  _panel.innerHTML = `<h2>⚙ Settings</h2>`;

  // Music mute
  _panel.appendChild(_makeToggleRow('Music', 'sp-music', _settings.musicMuted, v => {
    _settings.musicMuted = v; _save();
  }));

  // SFX mute
  _panel.appendChild(_makeToggleRow('Sound Effects', 'sp-sfx', _settings.sfxMuted, v => {
    _settings.sfxMuted = v; _save();
  }));

  // Graphics quality
  const qRow = _makeRow('Graphics Quality');
  const qBtns = document.createElement('div');
  qBtns.className = 'sp-quality-btns';
  ['low', 'medium', 'high'].forEach(q => {
    const b = document.createElement('button');
    b.className = 'sp-qbtn' + (q === _settings.quality ? ' active' : '');
    b.textContent = q.charAt(0).toUpperCase() + q.slice(1);
    b.addEventListener('click', () => {
      _settings.quality = q;
      _save();
      qBtns.querySelectorAll('.sp-qbtn').forEach(x => x.classList.toggle('active', x === b));
      applyQualitySettings(renderer);
    });
    qBtns.appendChild(b);
  });
  qRow.appendChild(qBtns);
  _panel.appendChild(qRow);

  // Sensitivity
  const sensRow = _makeRow('Look Sensitivity');
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0.3'; slider.max = '2.0'; slider.step = '0.05';
  slider.value = String(_settings.sensitivity);
  slider.className = 'sp-slider';
  slider.addEventListener('input', () => {
    _settings.sensitivity = parseFloat(slider.value);
    _save();
  });
  sensRow.appendChild(slider);
  _panel.appendChild(sensRow);

  const rulesBtn = document.createElement('button');
  rulesBtn.className = 'sp-rules-btn';
  rulesBtn.textContent = '📜  Game Rules';
  rulesBtn.addEventListener('click', _showRules);
  _panel.appendChild(rulesBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'sp-close-btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', hideSettingsPanel);
  _panel.appendChild(closeBtn);

  overlay.appendChild(_panel);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) hideSettingsPanel(); });

  _buildRulesOverlay();
}

function _buildRulesOverlay() {
  const ov = document.createElement('div');
  ov.id = 'sp-rules-overlay';
  ov.addEventListener('click', e => { if (e.target === ov) _hideRules(); });

  const sheet = document.createElement('div');
  sheet.id = 'sp-rules-sheet';

  sheet.innerHTML = `
    <div class="rsh-handle"></div>
    <div class="rsh-header">
      <span class="rsh-title">Game Rules</span>
      <button class="rsh-close" id="sp-rules-close">✕</button>
    </div>
    <div id="sp-rules-body">
      <p class="ri">Welcome to [Game Name].<br><br>
      These Game Rules explain how to play the game, what is allowed, what is not allowed, and how players are expected to behave while using the game.<br><br>
      By playing [Game Name], you agree to follow these rules.</p>

      <h3>1. General Gameplay</h3>
      <p>[Game Name] is a virtual game where players can explore different areas, enter rooms, interact with virtual spaces, view products or items, customize their character, and enjoy different in-game features.</p>
      <p>Players may progress by exploring, completing actions, collecting items, unlocking features, purchasing virtual content, or interacting with other players or sellers.</p>
      <p>The game may include different zones, rooms, characters, virtual items, decorations, upgrades, pets, signs, advertisements, and other interactive elements.</p>

      <h3>2. Player Account</h3>
      <p>Each player is responsible for their own account. You must not share your login details with others.</p>
      <p>The game team is not responsible for lost progress, purchases, or rewards caused by sharing your account, using unofficial software, or breaking the rules.</p>
      <p>You must provide correct information when creating or managing your account.</p>

      <h3>3. Fair Play</h3>
      <p>Players must play fairly and honestly. The following actions are not allowed:</p>
      <ul>
        <li>Using cheats, hacks, bots, scripts, modified apps, or unauthorized software.</li>
        <li>Exploiting bugs or technical errors to gain an unfair advantage.</li>
        <li>Selling, buying, or trading accounts outside the official game system.</li>
        <li>Manipulating the game economy, rankings, rewards, or other players.</li>
        <li>Trying to access another player's account.</li>
        <li>Using multiple accounts to abuse rewards, promotions, or voting systems.</li>
      </ul>
      <p>If you find a bug, report it to the game team rather than exploiting it.</p>

      <h3>4. Player Behavior</h3>
      <p>Players must treat each other with respect. The following behavior is not allowed:</p>
      <ul>
        <li>Harassment, bullying, threats, or abusive language.</li>
        <li>Hate speech, racism, discrimination, or offensive content.</li>
        <li>Sexual, violent, or inappropriate messages or images.</li>
        <li>Impersonating another player, seller, moderator, or game team member.</li>
        <li>Spamming, advertising outside allowed areas, or sending misleading messages.</li>
        <li>Sharing personal information of yourself or others.</li>
      </ul>

      <h3>5. Virtual Items and Customization</h3>
      <p>Virtual items may include character designs, clothing, pets, room decorations, signs, backgrounds, furniture, visual effects, advertisements, or other digital content.</p>
      <p>Virtual items do not have real-world ownership value unless clearly stated by the game team. The game team may update, change, remove, or limit virtual items if needed.</p>
      <p>Players are not allowed to sell virtual items for real money outside the official game system.</p>

      <h3>6. Rooms, Stores, and Virtual Spaces</h3>
      <p>Room owners are responsible for the content they display. The following content is not allowed:</p>
      <ul>
        <li>Illegal products or services.</li>
        <li>False or misleading information.</li>
        <li>Offensive, hateful, sexual, violent, or inappropriate images or text.</li>
        <li>Content that violates intellectual property rights.</li>
        <li>External links or contact details, unless officially allowed.</li>
      </ul>

      <h3>7. Advertising and Promotions</h3>
      <p>Advertising content must be accurate, appropriate, and permitted. The game team may reject or remove advertisements that are misleading, offensive, illegal, or unsuitable.</p>
      <p>Payment for advertising does not guarantee player engagement, sales, ranking, or visibility beyond what is clearly described.</p>

      <h3>8. Purchases and Payments</h3>
      <p>All purchases must be made through official payment methods. Prices and available items may change from time to time.</p>
      <p>Purchases are usually final and non-refundable, except where required by law or app store rules.</p>
      <p>Players must not use unauthorized payment methods, stolen payment details, chargeback abuse, or payment fraud.</p>

      <h3>9. Rewards, Progress, and Game Balance</h3>
      <p>Rewards and progress may be changed, adjusted, reset, or removed if there is a technical issue, cheating, abuse, or balancing update.</p>
      <p>No player is guaranteed to keep the same rank, progress speed, item value, or game advantage forever.</p>

      <h3>10. User-Generated Content</h3>
      <p>By uploading content, you confirm that you have the right to use it. You must not upload content that belongs to someone else without permission.</p>
      <p>The game team may remove or limit user-generated content if it violates the rules or creates risk for the game or other players.</p>

      <h3>11. Safety and Privacy</h3>
      <p>Never share passwords, home addresses, phone numbers, payment details, or other private information in the game.</p>
      <p>The game team will never ask for your password inside the game chat.</p>
      <p>Parents or guardians should supervise younger players and review privacy settings, purchases, and communication features.</p>

      <h3>12. Technical Issues</h3>
      <p>The game may sometimes be unavailable due to maintenance, updates, server problems, internet issues, or bugs. Uninterrupted access is not guaranteed.</p>
      <p>The game team is not responsible for connection problems, device issues, app store issues, or third-party service failures.</p>

      <h3>13. Updates and Changes</h3>
      <p>Updates may include new features, removed features, balance changes, visual changes, new areas, new rules, security improvements, bug fixes, or changes to virtual items.</p>
      <p>By continuing to play after an update, you accept the updated version of the game and its rules.</p>

      <h3>14. Rule Violations</h3>
      <p>If a player breaks the rules, the game team may take action, including:</p>
      <ul>
        <li>Warning the player.</li>
        <li>Removing content.</li>
        <li>Limiting access to features.</li>
        <li>Suspending the account.</li>
        <li>Banning the account permanently.</li>
        <li>Removing virtual items, rewards, or progress gained unfairly.</li>
        <li>Blocking payments or promotional features.</li>
      </ul>
      <p>Serious violations may lead to immediate suspension or permanent removal.</p>

      <h3>15. Reporting Problems</h3>
      <p>Players can report inappropriate behavior, bugs, cheating, offensive content, payment issues, or technical problems through the official support system.</p>
      <p>False reports, repeated spam reports, or abuse of the reporting system are not allowed.</p>

      <h3>16. Final Decision</h3>
      <p>The game team has the right to interpret and apply these rules to protect the game, the players, and the community. The purpose of these rules is to keep the game fair, safe, respectful, and enjoyable for everyone.</p>

      <h3>17. Contact</h3>
      <p>Support: <a href="mailto:[support email]">[support email]</a></p>
      <p>Website: <a href="[website link]">[website link]</a></p>
      <p>Company: [company name]</p>
    </div>
  `;

  ov.appendChild(sheet);
  document.body.appendChild(ov);
  document.getElementById('sp-rules-close').addEventListener('click', _hideRules);
}

function _showRules() {
  document.getElementById('sp-rules-overlay')?.classList.add('open');
  document.getElementById('sp-rules-body').scrollTop = 0;
}

function _hideRules() {
  document.getElementById('sp-rules-overlay')?.classList.remove('open');
}

function _makeRow(label) {
  const row = document.createElement('div');
  row.className = 'sp-row';
  const lbl = document.createElement('span');
  lbl.className = 'sp-label'; lbl.textContent = label;
  row.appendChild(lbl);
  return row;
}

function _makeToggleRow(label, id, initialValue, onChange) {
  const row = _makeRow(label);
  const tog = document.createElement('div');
  tog.className = 'sp-toggle' + (initialValue ? '' : ' on');
  // "muted" starts as false → show as ON (enabled)
  tog.classList.toggle('on', !initialValue);
  tog.addEventListener('click', () => {
    const muted = tog.classList.toggle('on');
    // on = NOT muted
    onChange(!muted);
  });
  row.appendChild(tog);
  return row;
}

export function showSettingsPanel() {
  document.getElementById('sp-overlay')?.classList.add('sp-open');
  _visible = true;
}

export function hideSettingsPanel() {
  document.getElementById('sp-overlay')?.classList.remove('sp-open');
  _visible = false;
}

export function toggleSettingsPanel() {
  _visible ? hideSettingsPanel() : showSettingsPanel();
}
