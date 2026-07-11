// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Fishing Server (economy & persistence)
// ═══════════════════════════════════════════════════════════════════════

// Server-authoritative fishing economy using better-sqlite3 synchronous API

const ROD_PRICES = {
  wood: 100,
  fiberglass: 400,
  carbon: 1000,
  golden: 2000
};

const BAIT_PRICES = {
  worm: 1,
  shrimp: 4,
  squid: 10
};

const FISH_PRICES = {
  sardine: 1, anchovy: 2, redMullet: 3, mackerel: 3, seaBream: 4, seaBass: 5, trumpetfish: 6,
  pufferfish: 8, clownfish: 10, rainbowfish: 11, angelfish: 12, blueTang: 14, parrotfish: 16,
  coralTrout: 20, barracuda: 24, moonfish: 28, napoleonfish: 32,
  swordfish: 38, bluefinTuna: 42,
  goldenSuy: 50
};

// ── Initialization ────────────────────────────────────────────────────

export function initFishing(io, db, getCoinsFunc, adjustCoinsFunc) {
  console.log('[fishing-server] Initializing fishing economy');

  // Create fishing table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_fishing (
      uuid TEXT PRIMARY KEY,
      owned_rods TEXT DEFAULT '["wood"]',
      current_rod TEXT DEFAULT 'wood',
      bait_worm INTEGER DEFAULT 0,
      bait_shrimp INTEGER DEFAULT 0,
      bait_squid INTEGER DEFAULT 0,
      caught_fish TEXT DEFAULT '[]'
    )
  `);

  const stmtGetFishing = db.prepare('SELECT * FROM player_fishing WHERE uuid = ?');
  const stmtCreateFishing = db.prepare(`
    INSERT OR IGNORE INTO player_fishing (uuid, owned_rods, current_rod, bait_worm, bait_shrimp, bait_squid, caught_fish)
    VALUES (?, '["wood"]', 'wood', 0, 0, 0, '[]')
  `);
  const stmtUpdateRods = db.prepare('UPDATE player_fishing SET owned_rods = ?, current_rod = ? WHERE uuid = ?');
  const stmtUpdateBait = db.prepare('UPDATE player_fishing SET bait_worm = ?, bait_shrimp = ?, bait_squid = ? WHERE uuid = ?');
  const stmtUpdateFish = db.prepare('UPDATE player_fishing SET caught_fish = ? WHERE uuid = ?');

  io.on('connection', (socket) => {
    const uuid = socket.handshake.auth?.uuid;
    if (!uuid) {
      console.warn('[fishing-server] connection without uuid — fishing disabled for this socket');
      return;
    }

    // Load or create fishing data
    stmtCreateFishing.run(uuid);

    // Buy rod
    socket.on('buyRod', ({ rodId, price }) => {
      try {
        if (!ROD_PRICES[rodId] || ROD_PRICES[rodId] !== price) {
          socket.emit('fishingPurchaseResult', { success: false, message: 'Invalid rod' });
          return;
        }

        const coins = getCoinsFunc(uuid);
        if (coins < price) {
          socket.emit('fishingPurchaseResult', { success: false, message: 'Not enough coins' });
          return;
        }

        // Deduct coins
        adjustCoinsFunc(uuid, -price);
        const newBalance = getCoinsFunc(uuid);

        // Add rod to owned
        const row = stmtGetFishing.get(uuid);
        const ownedRods = JSON.parse(row.owned_rods || '["wood"]');
        if (!ownedRods.includes(rodId)) {
          ownedRods.push(rodId);
        }

        stmtUpdateRods.run(JSON.stringify(ownedRods), rodId, uuid);

        socket.emit('fishingPurchaseResult', {
          success: true,
          newBalance,
          ownedRods,
          currentRod: rodId
        });

        console.log(`[fishing-server] ${uuid} bought ${rodId} for ${price} coins`);
      } catch (err) {
        console.error('[fishing-server] buyRod error:', err);
        socket.emit('fishingPurchaseResult', { success: false, message: 'Server error' });
      }
    });

    // Buy bait
    socket.on('buyBait', ({ baitId, qty, totalPrice }) => {
      try {
        if (!BAIT_PRICES[baitId] || BAIT_PRICES[baitId] * qty !== totalPrice) {
          socket.emit('fishingPurchaseResult', { success: false, message: 'Invalid bait' });
          return;
        }

        const coins = getCoinsFunc(uuid);
        if (coins < totalPrice) {
          socket.emit('fishingPurchaseResult', { success: false, message: 'Not enough coins' });
          return;
        }

        // Deduct coins
        adjustCoinsFunc(uuid, -totalPrice);
        const newBalance = getCoinsFunc(uuid);

        // Add bait
        const row = stmtGetFishing.get(uuid);
        const baits = {
          worm: row.bait_worm || 0,
          shrimp: row.bait_shrimp || 0,
          squid: row.bait_squid || 0
        };
        baits[baitId] += qty;

        stmtUpdateBait.run(baits.worm, baits.shrimp, baits.squid, uuid);

        socket.emit('fishingPurchaseResult', {
          success: true,
          newBalance,
          baitId,
          newQty: baits[baitId]
        });

        console.log(`[fishing-server] ${uuid} bought ${qty}x ${baitId} for ${totalPrice} coins`);
      } catch (err) {
        console.error('[fishing-server] buyBait error:', err);
        socket.emit('fishingPurchaseResult', { success: false, message: 'Server error' });
      }
    });

    // Sell fish
    socket.on('sellFish', ({ index, fishId, price }) => {
      try {
        if (!FISH_PRICES[fishId] || FISH_PRICES[fishId] !== price) {
          socket.emit('fishingSellResult', { success: false, message: 'Invalid fish' });
          return;
        }

        const row = stmtGetFishing.get(uuid);
        if (!row) {
          socket.emit('fishingSellResult', { success: false, message: 'DB error' });
          return;
        }

        const caughtFish = JSON.parse(row.caught_fish || '[]');
        if (index < 0 || index >= caughtFish.length || caughtFish[index].fishId !== fishId) {
          socket.emit('fishingSellResult', { success: false, message: 'Invalid fish index' });
          return;
        }

        // Remove fish
        caughtFish.splice(index, 1);
        stmtUpdateFish.run(JSON.stringify(caughtFish), uuid);

        // Add coins
        adjustCoinsFunc(uuid, price);
        const newBalance = getCoinsFunc(uuid);

        socket.emit('fishingSellResult', {
          success: true,
          newBalance,
          fishId,
          price
        });

        console.log(`[fishing-server] ${uuid} sold ${fishId} for ${price} coins`);
      } catch (err) {
        console.error('[fishing-server] sellFish error:', err);
        socket.emit('fishingSellResult', { success: false, message: 'Server error' });
      }
    });

    // Equip rod
    socket.on('equipRod', ({ rodId }) => {
      try {
        const row = stmtGetFishing.get(uuid);
        if (!row) {
          console.error('[fishing-server] equipRod: player not found');
          return;
        }

        const ownedRods = JSON.parse(row.owned_rods || '["wood"]');
        if (!ownedRods.includes(rodId)) {
          console.warn('[fishing-server] equipRod: player does not own', rodId);
          return;
        }

        // Update current rod
        stmtUpdateRod.run(rodId, uuid);
        console.log(`[fishing-server] ${uuid} equipped ${rodId}`);

        // Send confirmation
        socket.emit('rodEquipped', { rodId });
      } catch (err) {
        console.error('[fishing-server] equipRod error:', err);
      }
    });

    // Catch fish (server validates and stores)
    socket.on('catchFish', ({ fishId }) => {
      try {
        if (!FISH_PRICES[fishId]) {
          console.error('[fishing-server] Invalid fish caught:', fishId);
          return;
        }

        const row = stmtGetFishing.get(uuid);
        if (!row) return;

        const caughtFish = JSON.parse(row.caught_fish || '[]');
        caughtFish.push({ fishId, timestamp: Date.now() });

        stmtUpdateFish.run(JSON.stringify(caughtFish), uuid);

        console.log(`[fishing-server] ${uuid} caught ${fishId}`);
      } catch (err) {
        console.error('[fishing-server] catchFish error:', err);
      }
    });

    // Consume bait (server-authoritative)
    socket.on('consumeBait', ({ baitId }) => {
      try {
        if (!BAIT_PRICES[baitId]) return;

        const row = stmtGetFishing.get(uuid);
        if (!row) return;

        const baits = {
          worm: Math.max(0, (row.bait_worm || 0) - (baitId === 'worm' ? 1 : 0)),
          shrimp: Math.max(0, (row.bait_shrimp || 0) - (baitId === 'shrimp' ? 1 : 0)),
          squid: Math.max(0, (row.bait_squid || 0) - (baitId === 'squid' ? 1 : 0))
        };

        stmtUpdateBait.run(baits.worm, baits.shrimp, baits.squid, uuid);
      } catch (err) {
        console.error('[fishing-server] consumeBait error:', err);
      }
    });

    // Load fishing data for client
    socket.on('loadFishingData', () => {
      try {
        const row = stmtGetFishing.get(uuid);
        if (!row) {
          socket.emit('fishingDataLoaded', {
            ownedRods: ['wood'],
            currentRod: 'wood',
            baits: { worm: 0, shrimp: 0, squid: 0 },
            caughtFish: []
          });
          return;
        }

        socket.emit('fishingDataLoaded', {
          ownedRods: JSON.parse(row.owned_rods || '["wood"]'),
          currentRod: row.current_rod || 'wood',
          baits: {
            worm: row.bait_worm || 0,
            shrimp: row.bait_shrimp || 0,
            squid: row.bait_squid || 0
          },
          caughtFish: JSON.parse(row.caught_fish || '[]')
        });
      } catch (err) {
        console.error('[fishing-server] loadFishingData error:', err);
      }
    });
  });

  console.log('[fishing-server] Socket handlers registered');
}
