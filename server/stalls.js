// ═══════════════════════════════════════════════════════════════════════
// SUY WORLD — Market Stall Rental Server
// ═══════════════════════════════════════════════════════════════════════

// Server-authoritative stall rental economy
// One stall per player, 40 stalls per hangar (north/east/south)

const STALL_PRICE = 1000;
const STALLS_PER_HANGAR = 40;
const VALID_HANGARS = ['north', 'east', 'south'];
const RENTAL_DURATION_DAYS = 365;

// ── Initialization ────────────────────────────────────────────────────

export function initStalls(io, db, getCoinsFunc, adjustCoinsFunc) {
  try {
    console.log('[stalls-server] Initializing stall rental system');

    // Create stalls table if not exists
    // PRIMARY KEY (hangar, number) enforces one owner per stall
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_stalls (
        uuid TEXT NOT NULL,
        hangar TEXT NOT NULL,
        number INTEGER NOT NULL,
        name TEXT,
        rented_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (hangar, number)
      )
    `);

    // Add name column if it doesn't exist (for existing DBs)
    try {
      db.exec(`ALTER TABLE player_stalls ADD COLUMN name TEXT`);
    } catch (err) {
      // Column already exists, ignore
    }

    const stmtGetMyStall = db.prepare('SELECT * FROM player_stalls WHERE uuid = ?');
    const stmtGetStall = db.prepare('SELECT * FROM player_stalls WHERE hangar = ? AND number = ?');
    const stmtGetAllStalls = db.prepare('SELECT hangar, number, name FROM player_stalls');
    const stmtInsertStall = db.prepare(`
      INSERT OR REPLACE INTO player_stalls (uuid, hangar, number, name, rented_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

  io.on('connection', (socket) => {
    const uuid = socket.handshake.auth?.uuid;
    if (!uuid) {
      console.warn('[stalls-server] connection without uuid — stalls disabled for this socket');
      return;
    }

    // Check stall availability
    socket.on('checkStall', ({ hangar, number }) => {
      try {
        console.log(`[stalls-server] checkStall request: ${hangar} #${number} from ${uuid}`);
        if (!VALID_HANGARS.includes(hangar) || number < 1 || number > STALLS_PER_HANGAR) {
          socket.emit('stallStatus', { hangar, number, available: false, ownedByMe: false });
          return;
        }

        const stall = stmtGetStall.get(hangar, number);
        const ownedByMe = stall && stall.uuid === uuid;

        console.log(`[stalls-server] Stall ${hangar} #${number}: ${!stall ? 'available' : 'taken'}`);
        socket.emit('stallStatus', {
          hangar,
          number,
          available: !stall,
          ownedByMe
        });
      } catch (err) {
        console.error('[stalls-server] checkStall error:', err);
      }
    });

    // Rent a stall
    socket.on('rentStall', ({ hangar, number, name }) => {
      try {
        // Validate stall number
        if (!VALID_HANGARS.includes(hangar) || number < 1 || number > STALLS_PER_HANGAR) {
          socket.emit('rentResult', { success: false, reason: 'invalid_number' });
          return;
        }

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          socket.emit('rentResult', { success: false, reason: 'invalid_name' });
          return;
        }
        const shopName = name.trim().substring(0, 30); // Max 30 chars

        // Check if player already owns a stall
        const myStall = stmtGetMyStall.get(uuid);
        if (myStall) {
          socket.emit('rentResult', { success: false, reason: 'already_owns' });
          return;
        }

        // Check if this stall is already taken
        const existingStall = stmtGetStall.get(hangar, number);
        if (existingStall) {
          socket.emit('rentResult', { success: false, reason: 'taken' });
          return;
        }

        // Check coins
        const coins = getCoinsFunc(uuid);
        if (coins < STALL_PRICE) {
          socket.emit('rentResult', { success: false, reason: 'not_enough_coins' });
          return;
        }

        // Deduct coins
        adjustCoinsFunc(uuid, -STALL_PRICE);
        const newBalance = getCoinsFunc(uuid);

        // Calculate timestamps
        const rentedAt = Date.now();
        const expiresAt = rentedAt + (RENTAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

        // Insert stall rental (INSERT OR REPLACE to handle name)
        const info = stmtInsertStall.run(uuid, hangar, number, shopName, rentedAt, expiresAt);

        if (info.changes === 0) {
          // Race condition: someone else got it first
          // Refund coins
          adjustCoinsFunc(uuid, STALL_PRICE);
          socket.emit('rentResult', { success: false, reason: 'taken' });
          console.log(`[stalls-server] ${uuid} lost race for ${hangar} #${number}, refunded`);
          return;
        }

        // Success - broadcast to all clients that this stall is now taken
        io.emit('stallUpdated', { hangar, number, name: shopName, taken: true });

        socket.emit('rentResult', {
          success: true,
          hangar,
          number,
          name: shopName,
          expiresAt
        });

        socket.emit('coinsUpdated', { coins: newBalance });

        console.log(`[stalls-server] ${uuid} rented ${hangar} #${number} "${shopName}" for ${STALL_PRICE} coins`);
      } catch (err) {
        console.error('[stalls-server] rentStall error:', err);
        socket.emit('rentResult', { success: false, reason: 'server_error' });
      }
    });

    // Load player's stall data
    socket.on('loadStallData', () => {
      try {
        const myStall = stmtGetMyStall.get(uuid);

        if (!myStall) {
          socket.emit('stallDataLoaded', { myStall: null });
          return;
        }

        socket.emit('stallDataLoaded', {
          myStall: {
            hangar: myStall.hangar,
            number: myStall.number,
            name: myStall.name,
            expiresAt: myStall.expires_at
          }
        });
      } catch (err) {
        console.error('[stalls-server] loadStallData error:', err);
      }
    });

    // Load all stalls (for signs)
    socket.on('loadAllStalls', () => {
      try {
        const allStalls = stmtGetAllStalls.all();
        const stallsMap = {};
        allStalls.forEach(s => {
          const key = `${s.hangar}-${s.number}`;
          stallsMap[key] = { name: s.name, taken: true };
        });
        socket.emit('allStallsLoaded', { stalls: stallsMap });
      } catch (err) {
        console.error('[stalls-server] loadAllStalls error:', err);
      }
    });

    // Update stall name (owner only)
    socket.on('updateStallName', ({ name }) => {
      try {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          socket.emit('nameUpdateResult', { success: false, reason: 'invalid_name' });
          return;
        }

        const shopName = name.trim().substring(0, 30); // Max 30 chars

        // Check if player owns a stall
        const myStall = stmtGetMyStall.get(uuid);
        if (!myStall) {
          socket.emit('nameUpdateResult', { success: false, reason: 'no_stall' });
          return;
        }

        // Update name
        const stmtUpdateName = db.prepare('UPDATE player_stalls SET name = ? WHERE uuid = ?');
        stmtUpdateName.run(shopName, uuid);

        // Broadcast update
        io.emit('stallUpdated', { hangar: myStall.hangar, number: myStall.number, name: shopName, taken: true });

        socket.emit('nameUpdateResult', { success: true, name: shopName });

        // Reload stall data
        socket.emit('stallDataLoaded', {
          myStall: {
            hangar: myStall.hangar,
            number: myStall.number,
            name: shopName,
            expiresAt: myStall.expires_at
          }
        });

        console.log(`[stalls-server] ${uuid} updated stall name to "${shopName}"`);
      } catch (err) {
        console.error('[stalls-server] updateStallName error:', err);
        socket.emit('nameUpdateResult', { success: false, reason: 'server_error' });
      }
    });

    // Sell stall back (owner only)
    socket.on('sellStall', () => {
      try {
        console.log('[stalls-server] 🔴 sellStall received from', uuid);

        // Check if player owns a stall
        const myStall = stmtGetMyStall.get(uuid);
        if (!myStall) {
          console.log('[stalls-server] ✗ Sell rejected: player has no stall');
          socket.emit('sellResult', { success: false, reason: 'no_stall' });
          return;
        }

        console.log('[stalls-server] Player owns stall:', myStall.hangar, '#', myStall.number);

        // Delete stall
        const stmtDeleteStall = db.prepare('DELETE FROM player_stalls WHERE uuid = ?');
        const deleteInfo = stmtDeleteStall.run(uuid);
        console.log('[stalls-server] Deleted stall, rows affected:', deleteInfo.changes);

        // Refund 50% (500 coins)
        const REFUND_AMOUNT = 500;
        adjustCoinsFunc(uuid, REFUND_AMOUNT);
        const newBalance = getCoinsFunc(uuid);
        console.log('[stalls-server] Refunded', REFUND_AMOUNT, 'coins, new balance:', newBalance);

        // Broadcast update (stall is now free)
        io.emit('stallUpdated', { hangar: myStall.hangar, number: myStall.number, taken: false });

        socket.emit('sellResult', { success: true, refund: REFUND_AMOUNT });
        socket.emit('coinsUpdated', { coins: newBalance });

        // Clear player's stall data
        socket.emit('stallDataLoaded', { myStall: null });

        console.log(`[stalls-server] 🟢 ${uuid} sold ${myStall.hangar} #${myStall.number} for ${REFUND_AMOUNT} refund - SUCCESS`);
      } catch (err) {
        console.error('[stalls-server] ✗ sellStall error:', err);
        socket.emit('sellResult', { success: false, reason: 'server_error' });
      }
    });
  });

  console.log('[stalls-server] Socket handlers registered');
  } catch (err) {
    console.error('[stalls-server] Init error:', err);
  }
}
