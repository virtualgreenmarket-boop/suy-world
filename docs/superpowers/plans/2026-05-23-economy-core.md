# Economy Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent SUY COIN balance per player (SQLite), wire it through socket events, and display it in the global HUD with a bag icon.

**Architecture:** Server reads UUID from socket.io auth handshake → looks up or creates player row in SQLite → sends initial coins in the existing `init` event → client caches balance and emits `spendCoins`/`earnCoins` socket events for mutations. HUD displays balance reactively via a callback injected at startup.

**Tech Stack:** `better-sqlite3` (server), socket.io auth handshake, `crypto.randomUUID()` + `localStorage` (client), `node:test` + `node:assert` for server-side unit tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/db.js` | **Create** | SQLite connection + player CRUD |
| `server/db.test.js` | **Create** | Unit tests for db.js |
| `server/index.js` | **Modify** | Read UUID from auth, coins in init, spendCoins/earnCoins handlers |
| `src/systems/economy.js` | **Create** | UUID lifecycle, coin state cache, socket listeners |
| `src/systems/multiplayer.js` | **Modify** | Pass UUID in auth, forward coins in onReady, export getSocket |
| `src/ui/hud.js` | **Modify** | Bag pill, coin pill, updateCoinDisplay export |
| `src/main.js` | **Modify** | Call initEconomy inside onReady callback |
| `package.json` | **Modify** | Add better-sqlite3 dependency |

---

## Task 1: Install better-sqlite3

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd D:\my-game
npm install better-sqlite3
```

Expected output: `added N packages` with no errors. If you see a node-gyp build error on Windows, install the build tools: `npm install --global windows-build-tools` or install Visual Studio Build Tools with the "Desktop development with C++" workload.

- [ ] **Step 2: Verify the import works**

```bash
node -e "import('better-sqlite3').then(m => console.log('ok', typeof m.default))"
```

Expected: `ok function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add better-sqlite3"
```

---

## Task 2: Create server/db.js with tests

**Files:**
- Create: `server/db.js`
- Create: `server/db.test.js`

- [ ] **Step 1: Write the failing tests**

Create `server/db.test.js`:

```js
import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// We'll import db functions after pointing DB_PATH at a temp file
let tmp;
before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'suy-test-'));
  process.env.DB_PATH = join(tmp, 'test.db');
});
after(() => rmSync(tmp, { recursive: true, force: true }));

// Lazy import so DB_PATH is set first
async function db() {
  return import('./db.js');
}

test('getOrCreatePlayer creates a new player with 25 coins', async () => {
  const { getOrCreatePlayer } = await db();
  const row = getOrCreatePlayer('uuid-1', 'Alice');
  assert.equal(row.uuid, 'uuid-1');
  assert.equal(row.name, 'Alice');
  assert.equal(row.coins, 25);
});

test('getOrCreatePlayer returns existing player on second call', async () => {
  const { getOrCreatePlayer } = await db();
  getOrCreatePlayer('uuid-2', 'Bob');
  const row = getOrCreatePlayer('uuid-2', 'Bob');
  assert.equal(row.coins, 25);
});

test('getCoins returns current balance', async () => {
  const { getOrCreatePlayer, getCoins } = await db();
  getOrCreatePlayer('uuid-3', 'Carol');
  assert.equal(getCoins('uuid-3'), 25);
});

test('adjustCoins adds correctly and returns new balance', async () => {
  const { getOrCreatePlayer, adjustCoins } = await db();
  getOrCreatePlayer('uuid-4', 'Dan');
  const newBalance = adjustCoins('uuid-4', 10);
  assert.equal(newBalance, 35);
});

test('adjustCoins subtracts correctly', async () => {
  const { getOrCreatePlayer, adjustCoins } = await db();
  getOrCreatePlayer('uuid-5', 'Eve');
  const newBalance = adjustCoins('uuid-5', -10);
  assert.equal(newBalance, 15);
});

test('adjustCoins throws insufficient_coins when balance would go negative', async () => {
  const { getOrCreatePlayer, adjustCoins } = await db();
  getOrCreatePlayer('uuid-6', 'Frank');
  assert.throws(
    () => adjustCoins('uuid-6', -100),
    { message: 'insufficient_coins' }
  );
});

test('adjustCoins does not modify balance when it throws', async () => {
  const { getOrCreatePlayer, adjustCoins, getCoins } = await db();
  getOrCreatePlayer('uuid-7', 'Grace');
  try { adjustCoins('uuid-7', -100); } catch (_) {}
  assert.equal(getCoins('uuid-7'), 25);
});
```

- [ ] **Step 2: Run tests — expect all to fail (db.js does not exist)**

```bash
node --test server/db.test.js
```

Expected: `Error: Cannot find module './db.js'` or similar — confirms tests are wired.

- [ ] **Step 3: Create server/db.js**

```js
import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = process.env.DB_PATH ?? join(__dirname, 'suy.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    uuid  TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    coins INTEGER NOT NULL DEFAULT 25
  )
`);

const stmtGetOrCreate = db.prepare(
  `INSERT OR IGNORE INTO players (uuid, name) VALUES (?, ?)`
);
const stmtGet    = db.prepare(`SELECT * FROM players WHERE uuid = ?`);
const stmtCoins  = db.prepare(`SELECT coins FROM players WHERE uuid = ?`);
const stmtAdjust = db.prepare(
  `UPDATE players SET coins = coins + ? WHERE uuid = ? AND coins + ? >= 0`
);

export function getOrCreatePlayer(uuid, name) {
  stmtGetOrCreate.run(uuid, name);
  return stmtGet.get(uuid);
}

export function getCoins(uuid) {
  return stmtCoins.get(uuid)?.coins ?? 0;
}

export function adjustCoins(uuid, delta) {
  const info = stmtAdjust.run(delta, uuid, delta);
  if (info.changes === 0) throw new Error('insufficient_coins');
  return getCoins(uuid);
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
node --test server/db.test.js
```

Expected: `# tests 7` / `# pass 7` / `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add server/db.js server/db.test.js
git commit -m "feat: SQLite player/coins data layer with tests"
```

---

## Task 3: Extend server/index.js for the economy

**Files:**
- Modify: `server/index.js`

Current connection flow: server generates a random name on connect, stores it in `state.players`, sends `init`. We extend it to read the UUID from `socket.handshake.auth.uuid`, call `getOrCreatePlayer`, and include `coins` in the `init` payload. We also add `spendCoins` and `earnCoins` handlers.

- [ ] **Step 1: Replace server/index.js with the extended version**

```js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { state } from './gameState.js';
import { MAX_PLAYERS, SPAWN } from './constants.js';
import { getOrCreatePlayer, adjustCoins } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT   = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: isProd
    ? false
    : { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});

if (isProd) {
  const dist = join(__dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.get('/health', (_req, res) => res.json({ ok: true, players: Object.keys(state.players).length }));

io.on('connection', socket => {
  if (Object.keys(state.players).length >= MAX_PLAYERS) {
    socket.emit('serverFull');
    socket.disconnect(true);
    return;
  }

  // UUID supplied by client via socket.io auth handshake
  const uuid = socket.handshake.auth?.uuid;
  const row  = uuid
    ? getOrCreatePlayer(uuid, `Player${Math.floor(Math.random() * 9000) + 1000}`)
    : { name: `Player${Math.floor(Math.random() * 9000) + 1000}`, coins: 25 };

  const name = row.name;
  state.players[socket.id] = { id: socket.id, name, ...SPAWN, rotY: 0 };

  socket.emit('init', { id: socket.id, name, players: state.players, coins: row.coins });
  socket.broadcast.emit('playerJoined', { id: socket.id, data: state.players[socket.id] });

  socket.on('move', ({ x, y, z, rotY }) => {
    const p = state.players[socket.id];
    if (!p) return;
    Object.assign(p, { x, y, z, rotY });
    socket.broadcast.emit('playerMoved', { id: socket.id, x, y, z, rotY });
  });

  socket.on('chat', ({ message }) => {
    const p = state.players[socket.id];
    if (!p || !message?.trim()) return;
    io.emit('chatMessage', { id: socket.id, name: p.name, message: message.trim() });
  });

  socket.on('spendCoins', ({ amount, reason = 'unknown' }) => {
    if (!uuid || typeof amount !== 'number' || amount <= 0) return;
    try {
      const coins = adjustCoins(uuid, -amount);
      console.log(`[coins] ${name} spent ${amount} (${reason}) → ${coins}`);
      socket.emit('coinsUpdated', { coins });
    } catch (_) {
      socket.emit('coinError', { code: 'insufficient_coins' });
    }
  });

  socket.on('earnCoins', ({ amount, reason = 'unknown' }) => {
    if (!uuid || typeof amount !== 'number' || amount <= 0) return;
    const coins = adjustCoins(uuid, amount);
    console.log(`[coins] ${name} earned ${amount} (${reason}) → ${coins}`);
    socket.emit('coinsUpdated', { coins });
  });

  socket.on('disconnect', () => {
    delete state.players[socket.id];
    io.emit('playerLeft', { id: socket.id });
    console.log(`[-] ${name} left  (${Object.keys(state.players).length} online)`);
  });

  console.log(`[+] ${name} joined (${Object.keys(state.players).length} online)`);
});

httpServer.listen(PORT, () =>
  console.log(`SUY WORLD server :${PORT}  [${isProd ? 'production' : 'development'}]`)
);
```

- [ ] **Step 2: Start the server and verify it boots without errors**

```bash
node server/index.js
```

Expected: `SUY WORLD server :3001  [development]` — no crash.  
Stop with Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: economy socket events + UUID auth in server"
```

---

## Task 4: Create src/systems/economy.js

**Files:**
- Create: `src/systems/economy.js`

- [ ] **Step 1: Create the file**

```js
// UUID persisted in localStorage — stable identity across page loads
const UUID_KEY = 'suy_uuid';

function getUuid() {
  let id = localStorage.getItem(UUID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, id);
  }
  return id;
}

let _coins    = 0;
let _socket   = null;
let _onUpdate = null;

export { getUuid };

export function getCoins() { return _coins; }

/**
 * @param {import('socket.io-client').Socket} socket
 * @param {number} initialCoins  — value from server's init event
 * @param {function(number):void} onCoinUpdate  — called on every balance change
 */
export function initEconomy(socket, initialCoins, onCoinUpdate) {
  _socket   = socket;
  _onUpdate = onCoinUpdate;
  _coins    = initialCoins;
  onCoinUpdate(_coins);

  socket.on('coinsUpdated', ({ coins }) => {
    _coins = coins;
    _onUpdate(_coins);
  });
}

/**
 * Returns a Promise that resolves with the new balance, or rejects with
 * an error code string (e.g. 'insufficient_coins').
 */
export function spendCoins(amount, reason = 'unknown') {
  return new Promise((resolve, reject) => {
    if (!_socket) return reject('not_connected');

    const onUpdated = ({ coins }) => { cleanup(); resolve(coins); };
    const onError   = ({ code  }) => { cleanup(); reject(code);   };

    function cleanup() {
      _socket.off('coinsUpdated', onUpdated);
      _socket.off('coinError',    onError);
    }

    _socket.once('coinsUpdated', onUpdated);
    _socket.once('coinError',    onError);
    _socket.emit('spendCoins', { amount, reason });
  });
}

export function earnCoins(amount, reason = 'unknown') {
  _socket?.emit('earnCoins', { amount, reason });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/economy.js
git commit -m "feat: client economy module (UUID, coin cache, spendCoins/earnCoins)"
```

---

## Task 5: Extend multiplayer.js

**Files:**
- Modify: `src/systems/multiplayer.js`

Changes: import `getUuid`, pass it in socket.io auth, forward `coins` from `init` through `onReadyCb`, export `getSocket`.

- [ ] **Step 1: Replace src/systems/multiplayer.js**

```js
import { io } from 'socket.io-client';
import {
  addRemotePlayer,
  updateRemotePlayerTarget,
  removeRemotePlayer,
} from '../player/remotePlayer.js';
import { addChatMessage, addSpeechBubble } from '../ui/chatUI.js';
import { updateOnlineCount } from '../ui/hud.js';
import { getUuid } from './economy.js';

const MOVE_THROTTLE_MS = 50;

let socket       = null;
let localId      = null;
let lastMoveSent = 0;
let onReadyCb    = null;

export function initMultiplayer(onReady) {
  onReadyCb = onReady;

  socket = io({
    auth: { uuid: getUuid() },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[mp] connected', socket.id);
  });

  socket.on('init', ({ id, name, players, coins }) => {
    localId = id;

    for (const [pid, data] of Object.entries(players)) {
      if (pid !== id) addRemotePlayer(pid, data);
    }

    updateOnlineCount(Object.keys(players).length);
    if (onReadyCb) onReadyCb({ id, name, coins });
  });

  socket.on('playerJoined', ({ id, data }) => {
    addRemotePlayer(id, data);
    updateOnlineCount(null);
  });

  socket.on('playerMoved', ({ id, x, y, z, rotY }) => {
    updateRemotePlayerTarget(id, x, y, z, rotY);
  });

  socket.on('playerLeft', ({ id }) => {
    removeRemotePlayer(id);
    updateOnlineCount(null);
  });

  socket.on('chatMessage', msg => {
    addChatMessage(msg);
    addSpeechBubble(msg.id, msg.message);
  });

  socket.on('serverFull', () => {
    alert('Server is full (200 players). Please try again later.');
  });

  socket.on('disconnect', () => {
    console.log('[mp] disconnected');
  });
}

export function updateMultiplayer(position, rotY) {
  if (!socket || !localId) return;
  const now = Date.now();
  if (now - lastMoveSent < MOVE_THROTTLE_MS) return;
  lastMoveSent = now;
  socket.emit('move', { x: position.x, y: position.y, z: position.z, rotY });
}

export function sendChat(message) {
  socket?.emit('chat', { message });
}

export function getLocalId() { return localId; }

export function getSocket() { return socket; }
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/multiplayer.js
git commit -m "feat: pass UUID in socket auth, forward coins in onReady, export getSocket"
```

---

## Task 6: Extend hud.js — bag icon + coin display

**Files:**
- Modify: `src/ui/hud.js`

- [ ] **Step 1: Replace src/ui/hud.js**

```js
let countEl, slotEl, controlsEl, coinEl;

export function initHud() {
  // ── Top-left: bag icon + coin balance ────────────────────────────────
  const topLeft = el('div', {
    position: 'fixed', top: '16px', left: '16px',
    display: 'flex', gap: '8px', alignItems: 'center',
    userSelect: 'none',
  });

  const bagEl = el('div', {
    background: 'rgba(0,0,0,0.5)', color: '#fff',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '16px', cursor: 'pointer',
    pointerEvents: 'all',
  });
  bagEl.textContent = '🛍';
  bagEl.title = 'Inventory (coming soon)';
  topLeft.appendChild(bagEl);

  coinEl = el('div', {
    background: 'rgba(0,0,0,0.5)', color: '#fff',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '14px', fontFamily: 'Segoe UI, Arial, sans-serif',
    pointerEvents: 'none',
  });
  coinEl.textContent = '🪙 –';
  topLeft.appendChild(coinEl);

  document.body.appendChild(topLeft);

  // ── Top-right: online count ───────────────────────────────────────────
  countEl = el('div', {
    position: 'fixed', top: '16px', right: '16px',
    background: 'rgba(0,0,0,0.5)', color: '#fff',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '14px', fontFamily: 'Segoe UI, Arial, sans-serif',
    userSelect: 'none', pointerEvents: 'none',
  });
  countEl.textContent = '● 1 online';
  document.body.appendChild(countEl);

  // ── Centre: slot label ────────────────────────────────────────────────
  slotEl = el('div', {
    position: 'fixed', bottom: '28%', left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.65)', color: '#fff',
    padding: '8px 22px', borderRadius: '8px',
    fontSize: '15px', letterSpacing: '0.5px',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    display: 'none', pointerEvents: 'none', userSelect: 'none',
  });
  document.body.appendChild(slotEl);

  // ── Bottom-left: controls hint ────────────────────────────────────────
  controlsEl = el('div', {
    position: 'fixed', bottom: '16px', left: '16px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px', lineHeight: '1.7',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    pointerEvents: 'none', userSelect: 'none',
  });
  controlsEl.innerHTML =
    'WASD / ↑↓←→ &mdash; Move<br>' +
    'Drag &mdash; Rotate camera<br>' +
    'T &mdash; Chat';
  document.body.appendChild(controlsEl);
}

export function updateCoinDisplay(n) {
  if (coinEl) coinEl.textContent = `🪙 ${n}`;
}

export function updateOnlineCount(total) {
  const n = total ?? (parseInt(countEl.textContent) || 1);
  countEl.textContent = `● ${n} online`;
}

export function showSlotLabel(text) {
  slotEl.textContent = text;
  slotEl.style.display = 'block';
}

export function hideSlotLabel() {
  slotEl.style.display = 'none';
}

function el(tag, styles) {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  return e;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/hud.js
git commit -m "feat: HUD bag icon and coin display"
```

---

## Task 7: Wire economy into main.js

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add the two imports after the existing multiplayer import**

In `src/main.js`, find:
```js
import { initMultiplayer, updateMultiplayer, sendChat }
  from './systems/multiplayer.js';
```

Replace with:
```js
import { initMultiplayer, updateMultiplayer, sendChat, getSocket }
  from './systems/multiplayer.js';
import { initEconomy } from './systems/economy.js';
```

- [ ] **Step 2: Add updateCoinDisplay to the hud import**

Find:
```js
import { initHud, updateOnlineCount } from './ui/hud.js';
```

Replace with:
```js
import { initHud, updateOnlineCount, updateCoinDisplay } from './ui/hud.js';
```

- [ ] **Step 3: Update the initMultiplayer callback to init economy**

Find:
```js
initMultiplayer(({ name }) => {
  initLocalPlayer(scene, camera, name);
});
```

Replace with:
```js
initMultiplayer(({ name, coins }) => {
  initLocalPlayer(scene, camera, name);
  initEconomy(getSocket(), coins, updateCoinDisplay);
});
```

- [ ] **Step 4: Start the full dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser.

Verify:
- Top-left shows `🛍` and `🪙 25`
- Open browser devtools → Application → Local Storage → confirm `suy_uuid` key exists
- Open a second browser tab → both show `🪙 25`
- In devtools console run: `window.__testSpend = true` (no-op, just confirming console works)

- [ ] **Step 5: Test coin spend via browser console**

In the browser console:
```js
import('/src/systems/economy.js').then(m => m.spendCoins(5, 'test')).then(console.log)
```

Expected: the coin display updates from `🪙 25` to `🪙 20`, and the console logs `20`.

Reload the page. Expected: display shows `🪙 20` (persisted in SQLite).

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: wire economy into game startup"
```

---

## Task 8: Push and smoke-test

- [ ] **Step 1: Run the db tests one final time**

```bash
node --test server/db.test.js
```

Expected: `# pass 7` / `# fail 0`

- [ ] **Step 2: Push**

```bash
git pull --rebase && git push
```

- [ ] **Step 3: Verify server boots cleanly after push**

```bash
npm start
```

Expected: server starts, no SQLite or import errors. Stop with Ctrl-C.
