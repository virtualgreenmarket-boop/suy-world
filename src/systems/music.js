// Background music playlist — tracks play in order, then loop back.
// Autoplay policy: music starts on the first user interaction.

const PLAYLIST = [
  '/audio/woodland-fantasy.mp3',
  '/audio/soliloquy.mp3',
];

let _audio      = null;
let _trackIndex = 0;
let _volume     = 0.8;
let _muted      = false;
let _started    = false;

export function initMusic() {
  const onInteract = () => {
    if (_started) return;
    _started = true;
    document.removeEventListener('pointerdown', onInteract, true);
    document.removeEventListener('keydown',     onInteract, true);
    _playTrack(0);
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

function _playTrack(index) {
  _trackIndex = index % PLAYLIST.length;

  if (_audio) {
    _audio.pause();
    _audio.onended = null;
  }

  _audio = new Audio(PLAYLIST[_trackIndex]);
  _audio.volume  = _effectiveVolume();
  _audio.onended = () => _playTrack(_trackIndex + 1);
  _audio.play().catch(() => {});
}
