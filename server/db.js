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

export function closeDb() { db.close(); }
