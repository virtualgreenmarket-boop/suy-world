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
    _audio.removeEventListener('ended', _handleEnded);
    _audio.removeEventListener('error', _handleError);
  }

  _audio = new Audio(PLAYLIST[_trackIndex]);
  _audio.volume  = _effectiveVolume();
  _audio.loop    = false; // Don't loop single track, playlist rotates via onended
  _audio.preload = 'auto'; // Preload to prevent gaps

  // Primary handler: when track ends, play next track
  const _handleEnded = () => {
    console.log('[music] Track ended, playing next:', (_trackIndex + 1) % PLAYLIST.length);
    _playTrack(_trackIndex + 1);
  };

  // Error handler: if track fails to load, try next track
  const _handleError = (err) => {
    console.warn('[music] Track error, skipping to next:', err);
    _playTrack(_trackIndex + 1);
  };

  _audio.addEventListener('ended', _handleEnded);
  _audio.addEventListener('error', _handleError);
  _audio.onended = _handleEnded; // Backup for older browsers

  console.log('[music] Playing track', _trackIndex + 1, 'of', PLAYLIST.length);
  _audio.play().catch(err => {
    console.warn('[music] Autoplay blocked (expected):', err.message);
  });
}
