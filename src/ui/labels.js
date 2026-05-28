import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function createLabel(text, yOffset = 0) {
  const div = document.createElement('div');
  div.textContent = text;
  Object.assign(div.style, {
    color:          '#ffffff',
    fontSize:       '12px',
    fontFamily:     'Arial, sans-serif',
    fontWeight:     'bold',
    background:     'rgba(0,0,0,0.52)',
    padding:        '2px 8px',
    borderRadius:   '4px',
    border:         '1px solid rgba(255,255,255,0.22)',
    whiteSpace:     'nowrap',
    pointerEvents:  'none',
    userSelect:     'none',
    textShadow:     '0 1px 3px rgba(0,0,0,0.9)',
    letterSpacing:  '0.4px',
  });
  const obj = new CSS2DObject(div);
  obj.position.set(0, yOffset, 0);
  return obj;
}

export function attachLabel(parent, text, yOffset = 0) {
  const label = createLabel(text, yOffset);
  parent.add(label);
  return label;
}
