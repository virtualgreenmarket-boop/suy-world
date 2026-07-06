/**
 * sharedLoaders.js
 * Centralized Three.js loader instances configured with all necessary dependencies.
 * Import and use these instead of creating new loader instances to ensure consistent configuration.
 */

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ── Shared DRACOLoader (singleton) ───────────────────────────────────────
// Only create ONE instance, reused by all GLTFLoaders in the project.
// Draco decoder files are provided by the 'three' package.

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
// Alternative local path (if hosting decoder files yourself):
// dracoLoader.setDecoderPath('/libs/draco/');

console.log('[loaders] DRACOLoader initialized with decoder path:', 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

// ── Shared GLTFLoader factory ────────────────────────────────────────────
// Creates a new GLTFLoader with DRACOLoader pre-configured.
// Use this instead of `new GLTFLoader()` throughout the project.

export function createGLTFLoader() {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  return loader;
}

// ── Shared singleton GLTFLoader (for simple use cases) ───────────────────
// Single reusable instance. Safe for sequential loads.
// For concurrent loads, use createGLTFLoader() to get a fresh instance.

export const gltfLoader = createGLTFLoader();

console.log('[loaders] Shared GLTFLoader instances ready with DRACO support');
