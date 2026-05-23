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
after(async () => {
  const { closeDb } = await db();
  closeDb();
  rmSync(tmp, { recursive: true, force: true });
});

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
