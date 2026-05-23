# Economy Core — Phase A Design Spec
**Date:** 2026-05-23
**Project:** SUY WORLD
**Status:** Approved

---

## Overview

Adds persistent coin balance (SUY COIN) per player, backed by SQLite on the server, displayed in a global HUD alongside an inventory bag icon. All coin operations flow through socket events — server is the single source of truth.

---

## 1. Data Layer

**Package:** `better-sqlite3` (synchronous, no async/await complexity)

**File:** `server/db.js`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS players (
  uuid  TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 25
);
```

**Exported functions:**

| Function | Behaviour |
|---|---|
| `getOrCreatePlayer(uuid, name)` | INSERT OR IGNORE, then SELECT. Returns full row. |
| `getCoins(uuid)` | Returns current coin balance as integer. |
| `adjustCoins(uuid, delta)` | Runs `UPDATE SET coins = coins + delta WHERE uuid = ?`. Throws `'insufficient_coins'` if result would be negative. Returns new balance. |

`adjustCoins` uses a single atomic SQL statement — no race conditions possible with SQLite's serialized writes.

---

## 2. Server — Socket Events

**File:** `server/index.js` (extended)

### Connection extended
The existing `init` event payload gains a `coins` field:
```js
socket.emit('init', { id, name, players, coins });
```

The `connect` handler now expects `{ uuid, name }` instead of `{ name }` only. It calls `getOrCreatePlayer(uuid, name)` to fetch or create the row, then attaches `uuid` to the socket for subsequent handlers.

### New events

| Client → Server | Payload | Server action | Server → Client |
|---|---|---|---|
| `spendCoins` | `{ amount, reason }` | Validates amount > 0, calls `adjustCoins(uuid, -amount)`. On success emits `coinsUpdated`. On failure emits `coinError`. | `coinsUpdated { coins }` or `coinError { code }` |
| `earnCoins` | `{ amount, reason }` | Calls `adjustCoins(uuid, +amount)`. | `coinsUpdated { coins }` |

`reason` is a string logged server-side for future analytics (e.g. `'shop_purchase'`, `'fishing_reward'`). Not sent back to client.

Both events are no-ops if the socket has no associated `uuid` (guards against timing edge cases on connect).

---

## 3. Client — Economy Module

**File:** `src/systems/economy.js`

**Responsibilities:**
- Generate or retrieve UUID from `localStorage` key `suy_uuid` (creates a new `crypto.randomUUID()` on first visit)
- Expose `getUuid()` so `multiplayer.js` can include it in the connect payload
- After socket connects, listen for `coinsUpdated` → store balance, call `updateCoinDisplay`
- Export `spendCoins(amount, reason)` → returns a Promise; resolves with new balance on `coinsUpdated`, rejects with error code on `coinError`
- Export `earnCoins(amount, reason)` → fire-and-forget (no failure case for earning)
- Export `getCoins()` → returns current cached balance

**Data flow:**
```
connect → server sends init.coins → economy stores it → calls updateCoinDisplay
spendCoins() → emit 'spendCoins' → await coinsUpdated/coinError → resolve/reject
```

`economy.js` does not import from any UI module directly — it calls `updateCoinDisplay` via an injected callback set at init time, keeping UI decoupled.

**Init signature:**
```js
export function initEconomy(socket, initialCoins, onCoinUpdate)
// initialCoins comes from the 'init' socket event (fired before this is called)
// onCoinUpdate(newBalance) called whenever balance changes after init
```

---

## 4. Integration

**`multiplayer.js`** imports `getUuid` from `economy.js` and includes it in the join payload sent to the server on connect. The `init` event handler extracts `coins` from the payload and forwards it through the `onReady` callback: `onReadyCb({ id, name, coins })`.

**`multiplayer.js`** exports a new `getSocket()` function so `main.js` can pass the live socket to `initEconomy`.

**`main.js`** wires it together inside the `onReady` callback:
```js
initMultiplayer(({ name, coins }) => {
  initLocalPlayer(scene, camera, name);
  initEconomy(getSocket(), coins, updateCoinDisplay);
});

---

## 5. HUD

**File:** `src/ui/hud.js` (extended)

Two new elements added to the top-left corner, styled as pills matching the existing online-count pill (top-right):

```
[ 🛍 ]  [ 🪙 25 ]
```

- **Bag pill** — static for now; will open Inventory UI in Phase B. `pointerEvents: all`, cursor pointer, no action yet beyond hover style.
- **Coin pill** — displays current balance. Updated by `updateCoinDisplay(n)` (new export from `hud.js`).

No imports added to `hud.js` — the update function is called externally, keeping hud.js free of economy logic.

---

## 6. File Changelist

| File | Change |
|---|---|
| `server/db.js` | **New** — SQLite wrapper |
| `server/index.js` | Extended — uuid on connect, spendCoins/earnCoins events, coins in init |
| `src/systems/economy.js` | **New** — UUID, coin cache, socket listeners, spendCoins/earnCoins |
| `src/ui/hud.js` | Extended — bag pill, coin pill, `updateCoinDisplay` export |
| `src/main.js` | Extended — `initEconomy(socket, updateCoinDisplay)` call |
| `src/systems/multiplayer.js` | Extended — include `uuid` in join payload, forward `coins` in onReady, export `getSocket()` |
| `package.json` | Add `better-sqlite3` dependency |

---

## 7. Out of Scope (Phase A)

- Coin-earning gameplay (fishing, quests) — Phase D
- Shop purchases — Phase C
- Inventory UI — Phase B
- Admin tools or coin auditing UI
- Anti-cheat beyond server-side balance validation
