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

export function initEconomy(socket, initialCoins, onCoinUpdate) {
  _socket   = socket;
  _onUpdate = onCoinUpdate;
  _coins    = initialCoins ?? 25;
  onCoinUpdate(_coins);

  socket.on('coinsUpdated', ({ coins }) => {
    _coins = coins;
    _onUpdate(_coins);
  });
}

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
