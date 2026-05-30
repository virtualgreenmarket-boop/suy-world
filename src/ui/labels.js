import * as THREE from 'three';

const FONT         = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
const STROKE_WIDTH = 4;    // black outline thickness
const PAD          = 8;    // padding around text
const WORLD_H      = 0.85; // sprite height in world units

// MMO-style: simple text with stroke, no backgrounds
const STYLES = {
  npc: {
    fillColor:   '#ffffff',  // white text
    strokeColor: '#000000',  // black outline
  },
  player: {
    fillColor:   '#4d9fff',  // bright blue text
    strokeColor: '#000000',  // black outline
  },
};

function _buildTexture(text, style = 'npc') {
  const preset = STYLES[style] || STYLES.npc;

  // Measure text
  const probe = document.createElement('canvas').getContext('2d');
  probe.font  = FONT;
  const tm    = probe.measureText(text);
  const tw    = tm.width;
  const th    = (tm.actualBoundingBoxAscent || 14) + (tm.actualBoundingBoxDescent || 4);

  // Canvas sized to fit text + padding + stroke
  const cw = Math.ceil(tw + PAD * 2 + STROKE_WIDTH * 2);
  const ch = Math.ceil(th + PAD * 2 + STROKE_WIDTH * 2);

  const canvas  = document.createElement('canvas');
  canvas.width  = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');

  // Clear to fully transparent (no background)
  ctx.clearRect(0, 0, cw, ch);

  ctx.font         = FONT;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const cx = cw / 2;
  const cy = ch / 2;

  // Draw black stroke (outline) first
  ctx.strokeStyle = preset.strokeColor;
  ctx.lineWidth   = STROKE_WIDTH;
  ctx.lineJoin    = 'round';
  ctx.strokeText(text, cx, cy);

  // Draw colored fill on top
  ctx.fillStyle = preset.fillColor;
  ctx.fillText(text, cx, cy);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { tex, aspect: cw / ch };
}

export function createLabel(text, yOffset = 0, style = 'npc') {
  const { tex, aspect } = _buildTexture(text, style);
  const mat  = new THREE.SpriteMaterial({
    map:         tex,
    depthTest:   false,
    depthWrite:  false,
    fog:         false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(WORLD_H * aspect, WORLD_H, 1);
  sprite.position.set(0, yOffset, 0);
  sprite.renderOrder = 1;
  return sprite;
}

export function attachLabel(parent, text, yOffset = 0, style = 'npc') {
  const label = createLabel(text, yOffset, style);
  parent.add(label);
  return label;
}
