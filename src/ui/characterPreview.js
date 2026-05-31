// Simplified character preview - Equipment system disabled for now

let _renderer = null;
let _scene    = null;
let _camera   = null;
let _raf      = null;

export async function initCharacterPreview(canvas) {
  // No-op for now - equipment system disabled
  console.log('[character-preview] Equipment system disabled');
}

export function applyPreviewItem(category, file) {
  // No-op
}

export function applyPreviewLoadout(loadout) {
  // No-op
}

export function startPreviewRendering() {
  // No-op
}

export function stopPreviewRendering() {
  if (_raf) {
    cancelAnimationFrame(_raf);
    _raf = null;
  }
}
