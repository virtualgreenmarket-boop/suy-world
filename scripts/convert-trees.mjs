/**
 * convert-trees.mjs
 * Converts public/models/nature/trees/HighPoly Tree Model/Model/SM_HP_Tree.FBX
 * to public/models/nature/trees/sm_hp_tree.glb using Three.js server-side.
 *
 * Run once:  node scripts/convert-trees.mjs
 *
 * Requirements (install once):
 *   npm install jsdom node-fetch --save-dev
 *
 * After conversion, update src/world/trees.js to use GLTFLoader instead of FBXLoader.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const FBX_PATH  = resolve(ROOT, 'public/models/nature/trees/HighPoly Tree Model/Model/SM_HP_Tree.FBX');
const OUT_PATH  = resolve(ROOT, 'public/models/nature/trees/sm_hp_tree.glb');

if (!existsSync(FBX_PATH)) {
  console.error('[convert-trees] FBX not found at:', FBX_PATH);
  process.exit(1);
}

// Polyfill minimal DOM environment for Three.js loaders
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
globalThis.window   = dom.window;
globalThis.document = dom.window.document;
// Node.js v22+ makes globalThis.navigator a non-writable getter; use defineProperty
try { globalThis.navigator = dom.window.navigator; } catch (_) {
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator, writable: true, configurable: true,
  });
}
globalThis.Blob        = dom.window.Blob;
globalThis.URL         = dom.window.URL;
globalThis.TextDecoder = globalThis.TextDecoder ?? dom.window.TextDecoder;
globalThis.TextEncoder = globalThis.TextEncoder ?? dom.window.TextEncoder;

// Polyfill XMLHttpRequest with a synchronous file-reader for local paths
class XHR {
  constructor() { this.responseType = ''; this.onload = null; this.onerror = null; }
  open(method, url) { this._url = url; }
  send() {
    try {
      const localPath = this._url.startsWith('file://')
        ? fileURLToPath(this._url)
        : this._url.startsWith('/')
          ? resolve(ROOT, 'public', this._url.replace(/^\//, ''))
          : resolve(ROOT, 'public', this._url);
      const buf = readFileSync(localPath);
      this.response = this.responseType === 'arraybuffer'
        ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        : buf.toString();
      this.status = 200; this.readyState = 4;
      this.onload?.({ target: this });
    } catch (e) {
      this.status = 404;
      this.onerror?.(e);
    }
  }
}
globalThis.XMLHttpRequest = XHR;

// Now import Three.js (must be after polyfills)
const { default: THREE }  = await import('three');
const { FBXLoader }       = await import('three/addons/loaders/FBXLoader.js');
const { GLTFExporter }    = await import('three/addons/exporters/GLTFExporter.js');

console.log('[convert-trees] loading FBX…');
const loader = new FBXLoader();
const fbxBuf = readFileSync(FBX_PATH);
const fbx    = loader.parse(fbxBuf.buffer.slice(fbxBuf.byteOffset, fbxBuf.byteOffset + fbxBuf.byteLength), '');

// Normalise scale to 15 m height
const box = new THREE.Box3().setFromObject(fbx);
const h   = Math.max(box.max.y - box.min.y, 0.01);
fbx.scale.setScalar(15 / h);

const box2 = new THREE.Box3().setFromObject(fbx);
fbx.position.y = -box2.min.y;

const wrapper = new THREE.Group();
wrapper.add(fbx);

console.log('[convert-trees] exporting GLB…');
const exporter = new GLTFExporter();
exporter.parse(wrapper, result => {
  const buf = result instanceof ArrayBuffer ? Buffer.from(result) : Buffer.from(JSON.stringify(result));
  writeFileSync(OUT_PATH, buf);
  console.log('[convert-trees] saved →', OUT_PATH, '(', (buf.length / 1024 / 1024).toFixed(2), 'MB )');
}, err => {
  console.error('[convert-trees] export error:', err);
  process.exit(1);
}, { binary: true, embedImages: false });
