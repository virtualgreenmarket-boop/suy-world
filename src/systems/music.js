// Background music using an <audio> element.
// Autoplay policy: music starts on the first user interaction.

const TRACK = '/audio/woodland-fantasy.mp3';

let _audio   = null;
let _volume  = 0.8;
let _muted   = false;
let _started = false;

export function initMusic() {
  _audio = new Audio(TRACK);
  _audio.loop   = true;
  _audio.volume = _effectiveVolume();

  const onInteract = () => {
    if (_started) return;
    _started = true;
    document.removeEventListener('pointerdown', onInteract, true);
    document.removeEventListener('keydown',     onInteract, true);
    _audio.play().catch(() => {});
  };
  document.addEventListener('pointerdown', onInteract, true);
  document.addEventListener('keydown',     onInteract, true);
}

export function setMusicVolume(zeroToOne) {
  _volume = Math.max(0, Math.min(1, zeroToOne));
  if (_audio) _audio.volume = _effectiveVolume();
}

export function setMuteAll(muted) {
  _muted = muted;
  if (_audio) _audio.volume = _effectiveVolume();
}

function _effectiveVolume() {
  return _muted ? 0 : _volume;
}
