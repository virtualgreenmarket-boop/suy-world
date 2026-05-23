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
