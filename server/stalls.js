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
  console.log('[stalls-server] Initializing stall rental system');

  // Create stalls table if not exists
  // PRIMARY KEY (hangar, number) enforces one owner per stall
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_stalls (
      uuid TEXT NOT NULL,
      hangar TEXT NOT NULL,
      number INTEGER NOT NULL,
      rented_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (hangar, number)
    )
  `);

  const stmtGetMyStall = db.prepare('SELECT * FROM player_stalls WHERE uuid = ?');
  const stmtGetStall = db.prepare('SELECT * FROM player_stalls WHERE hangar = ? AND number = ?');
  const stmtInsertStall = db.prepare(`
    INSERT OR IGNORE INTO player_stalls (uuid, hangar, number, rented_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
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
    socket.on('rentStall', ({ hangar, number }) => {
      try {
        // Validate stall number
        if (!VALID_HANGARS.includes(hangar) || number < 1 || number > STALLS_PER_HANGAR) {
          socket.emit('rentResult', { success: false, reason: 'invalid_number' });
          return;
        }

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

        // Insert stall rental (INSERT OR IGNORE prevents race conditions)
        const info = stmtInsertStall.run(uuid, hangar, number, rentedAt, expiresAt);

        if (info.changes === 0) {
          // Race condition: someone else got it first
          // Refund coins
          adjustCoinsFunc(uuid, STALL_PRICE);
          socket.emit('rentResult', { success: false, reason: 'taken' });
          console.log(`[stalls-server] ${uuid} lost race for ${hangar} #${number}, refunded`);
          return;
        }

        // Success
        socket.emit('rentResult', {
          success: true,
          hangar,
          number,
          expiresAt
        });

        socket.emit('coinsUpdated', { coins: newBalance });

        console.log(`[stalls-server] ${uuid} rented ${hangar} #${number} for ${STALL_PRICE} coins`);
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
            expiresAt: myStall.expires_at
          }
        });
      } catch (err) {
        console.error('[stalls-server] loadStallData error:', err);
      }
    });
  });

  console.log('[stalls-server] Socket handlers registered');
}
