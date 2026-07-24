import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { state } from './gameState.js';
import { MAX_PLAYERS, SPAWN } from './constants.js';
import { getOrCreatePlayer, adjustCoins, getCoins, db } from './db.js';
import { initFishing } from './fishing.js';
import { initStalls } from './stalls.js';

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

  socket.on('cheatCoins', ({ amount }) => {
    if (!uuid || typeof amount !== 'number' || amount <= 0) return;
    const coins = adjustCoins(uuid, amount);
    console.log(`[cheat] 💰 ${name} used cheat code → +${amount} coins → total: ${coins}`);
    socket.emit('coinsUpdated', { coins });
  });

  socket.on('disconnect', () => {
    delete state.players[socket.id];
    io.emit('playerLeft', { id: socket.id });
    console.log(`[-] ${name} left  (${Object.keys(state.players).length} online)`);
  });

  console.log(`[+] ${name} joined (${Object.keys(state.players).length} online)`);
});

// Initialize fishing system
initFishing(io, db, getCoins, adjustCoins);

// Initialize stall rental system
initStalls(io, db, getCoins, adjustCoins);

httpServer.listen(PORT, () =>
  console.log(`SUY WORLD server :${PORT}  [${isProd ? 'production' : 'development'}]`)
);
