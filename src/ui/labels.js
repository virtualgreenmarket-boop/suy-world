import * as THREE from 'three';

const FONT     = 'bold 24px Arial, sans-serif';
const PAD_X    = 16;
const PAD_Y    = 10;
const RADIUS   = 8;
const WORLD_H  = 1.1; // sprite height in world units

function _buildTexture(text) {
  // Measure text on a throw-away context
  const probe = document.createElement('canvas').getContext('2d');
  probe.font  = FONT;
  const tw    = probe.measureText(text).width;

  const cw = Math.ceil(tw + PAD_X * 2);
  const ch = Math.ceil(probe.measureText('M').actualBoundingBoxAscent
           + probe.measureText('M').actualBoundingBoxDescent + PAD_Y * 2) || 40;

  const canvas  = document.createElement('canvas');
  canvas.width  = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');

  // Rounded background
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(0, 0, cw, ch, RADIUS);
  ctx.fill();

  // Text
  ctx.font         = FONT;
  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter; // no mipmaps — saves GPU memory
  tex.magFilter = THREE.LinearFilter;
  return { tex, aspect: cw / ch };
}

export function createLabel(text, yOffset = 0) {
  const { tex, aspect } = _buildTexture(text);
  const mat  = new THREE.SpriteMaterial({
    map:        tex,
    depthTest:  false,
    depthWrite: false,
    fog:        false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(WORLD_H * aspect, WORLD_H, 1);
  sprite.position.set(0, yOffset, 0);
  sprite.renderOrder = 1;
  return sprite;
}

export function attachLabel(parent, text, yOffset = 0) {
  const label = createLabel(text, yOffset);
  parent.add(label);
  return label;
}
