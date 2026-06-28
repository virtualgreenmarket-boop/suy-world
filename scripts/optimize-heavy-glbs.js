#!/usr/bin/env node

/**
 * Advanced GLB Optimization Script
 * Uses gltf-transform for aggressive optimization of the heaviest GLB files
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

const HEAVY_FILES = [
  'public/models/nature/marina/Medieval Village Houses GLB/Medieval Village Houses.glb',
  'public/models/ocean/free_ocean_wave_animation.glb',
  'public/models/characters/npcs/Fisherman/fisherman.glb',
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

async function optimizeWithGltfTransform(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  const tempPath = fullPath.replace('.glb', '.temp.glb');

  console.log(`\n📦 Optimizing: ${path.basename(filePath)}`);

  const originalSize = await getFileSize(fullPath);
  console.log(`  Original size: ${formatBytes(originalSize)}`);

  try {
    // Use gltf-transform with Draco compression and deduplication
    const cmd = `npx gltf-transform optimize "${fullPath}" "${tempPath}" ` +
      `--compress draco `;

    console.log(`  Running gltf-transform...`);
    const { stdout, stderr } = await execPromise(cmd, {
      maxBuffer: 100 * 1024 * 1024,
      cwd: path.join(__dirname, '..')
    });

    if (stdout) console.log(`  ${stdout.trim()}`);
    if (stderr && !stderr.includes('warning')) console.error(`  ${stderr.trim()}`);

    // Check if optimization succeeded
    if (fs.existsSync(tempPath)) {
      const newSize = await getFileSize(tempPath);
      const savings = originalSize - newSize;
      const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

      if (newSize < originalSize) {
        // Replace original with optimized
        fs.unlinkSync(fullPath);
        fs.renameSync(tempPath, fullPath);

        console.log(`  ✓ New size: ${formatBytes(newSize)}`);
        console.log(`  ✓ Saved: ${formatBytes(savings)} (${savingsPercent}%)`);
        return { originalSize, newSize, savings };
      } else {
        console.log(`  ⚠ Optimization didn't reduce size, keeping original`);
        fs.unlinkSync(tempPath);
        return null;
      }
    } else {
      console.log(`  ⚠ Optimization failed, keeping original`);
      return null;
    }
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Advanced GLB Optimization (gltf-transform)\n');
  console.log('═'.repeat(60));

  const results = [];

  for (const file of HEAVY_FILES) {
    const result = await optimizeWithGltfTransform(file);
    if (result) {
      results.push(result);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('OPTIMIZATION SUMMARY');
  console.log('═'.repeat(60));

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalNew = results.reduce((sum, r) => sum + r.newSize, 0);
  const totalSavings = totalOriginal - totalNew;
  const totalPercent = totalOriginal > 0 ? ((totalSavings / totalOriginal) * 100).toFixed(1) : 0;

  console.log(`\nFiles optimized: ${results.length}`);
  console.log(`Total original size: ${formatBytes(totalOriginal)}`);
  console.log(`Total new size: ${formatBytes(totalNew)}`);
  console.log(`Total saved: ${formatBytes(totalSavings)} (${totalPercent}%)\n`);

  console.log('✓ Optimization complete!');
}

main().catch(console.error);
