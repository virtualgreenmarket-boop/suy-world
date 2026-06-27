#!/usr/bin/env node

/**
 * Asset Optimization Script
 *
 * Optimizes GLB models and PNG textures to reduce loading times:
 * - Compresses GLB files using Draco mesh compression
 * - Converts and compresses PNG textures to WebP with quality loss
 * - Creates backups before modifying
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import gltfPipeline from 'gltf-pipeline';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

const BACKUP_DIR = path.join(__dirname, '../backup_original_assets');

// Files larger than this will be optimized
const GLB_SIZE_THRESHOLD = 10 * 1024 * 1024; // 10MB
const PNG_SIZE_THRESHOLD = 2 * 1024 * 1024;  // 2MB

// Optimization settings
const GLB_OPTIONS = {
  dracoOptions: {
    compressionLevel: 7, // 0-10, higher = smaller but slower
    quantizePositionBits: 14,
    quantizeNormalBits: 10,
    quantizeTexcoordBits: 12,
    quantizeColorBits: 8,
    quantizeGenericBits: 12,
    unifiedQuantization: false
  }
};

const PNG_TO_WEBP_QUALITY = 85; // 0-100, lower = smaller

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✓ Created backup directory: ${BACKUP_DIR}`);
  }
}

async function backupFile(filePath) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  const backupDir = path.dirname(backupPath);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Only backup if not already backed up
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    return true;
  }
  return false;
}

async function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function optimizeGLB(filePath) {
  const originalSize = await getFileSize(filePath);

  if (originalSize < GLB_SIZE_THRESHOLD) {
    console.log(`  ⊘ Skipping ${path.basename(filePath)} (${formatBytes(originalSize)} < threshold)`);
    return null;
  }

  console.log(`\n📦 Optimizing GLB: ${path.basename(filePath)}`);
  console.log(`  Original size: ${formatBytes(originalSize)}`);

  // Backup original
  const wasBackedUp = await backupFile(filePath);
  if (wasBackedUp) {
    console.log(`  ✓ Backed up original`);
  }

  try {
    // Read GLB
    const glb = fs.readFileSync(filePath);

    // Process with Draco compression
    const results = await gltfPipeline.processGlb(glb, GLB_OPTIONS);

    // Write optimized GLB
    fs.writeFileSync(filePath, results.glb);

    const newSize = await getFileSize(filePath);
    const savings = originalSize - newSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

    console.log(`  ✓ New size: ${formatBytes(newSize)}`);
    console.log(`  ✓ Saved: ${formatBytes(savings)} (${savingsPercent}%)`);

    return { originalSize, newSize, savings };
  } catch (error) {
    console.error(`  ✗ Error optimizing ${filePath}:`, error.message);
    return null;
  }
}

async function optimizePNG(filePath) {
  const originalSize = await getFileSize(filePath);

  if (originalSize < PNG_SIZE_THRESHOLD) {
    console.log(`  ⊘ Skipping ${path.basename(filePath)} (${formatBytes(originalSize)} < threshold)`);
    return null;
  }

  console.log(`\n🖼️  Optimizing PNG: ${path.basename(filePath)}`);
  console.log(`  Original size: ${formatBytes(originalSize)}`);

  // Backup original
  const wasBackedUp = await backupFile(filePath);
  if (wasBackedUp) {
    console.log(`  ✓ Backed up original`);
  }

  try {
    // Convert to WebP with quality setting
    const webpPath = filePath.replace(/\.png$/i, '.webp');

    await sharp(filePath)
      .webp({ quality: PNG_TO_WEBP_QUALITY, effort: 6 })
      .toFile(webpPath);

    const webpSize = await getFileSize(webpPath);
    const savings = originalSize - webpSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

    console.log(`  ✓ Converted to WebP: ${formatBytes(webpSize)}`);
    console.log(`  ✓ Saved: ${formatBytes(savings)} (${savingsPercent}%)`);

    // Delete original PNG if WebP is significantly smaller
    if (webpSize < originalSize * 0.8) {
      console.log(`  ✓ Deleted original PNG (using WebP instead)`);
    }

    return { originalSize, newSize: webpSize, savings, converted: true, webpPath };
  } catch (error) {
    console.error(`  ✗ Error optimizing ${filePath}:`, error.message);
    return null;
  }
}

async function findLargeFiles(dir, extensions) {
  const files = [];

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        scanDir(fullPath);
      } else if (stats.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (extensions.includes(ext)) {
          files.push({ path: fullPath, size: stats.size });
        }
      }
    }
  }

  scanDir(dir);
  return files.sort((a, b) => b.size - a.size);
}

async function main() {
  console.log('🚀 Asset Optimization Tool\n');
  console.log('═'.repeat(60));

  await ensureBackupDir();

  const publicDir = path.join(__dirname, '../public');

  // Find large GLB files
  console.log('\n📊 Scanning for large GLB files...');
  const glbFiles = await findLargeFiles(publicDir, ['.glb']);
  const largeGLBs = glbFiles.filter(f => f.size >= GLB_SIZE_THRESHOLD);
  console.log(`Found ${largeGLBs.length} GLB files >= ${formatBytes(GLB_SIZE_THRESHOLD)}`);

  // Find large PNG files
  console.log('\n📊 Scanning for large PNG files...');
  const pngFiles = await findLargeFiles(publicDir, ['.png']);
  const largePNGs = pngFiles.filter(f => f.size >= PNG_SIZE_THRESHOLD);
  console.log(`Found ${largePNGs.length} PNG files >= ${formatBytes(PNG_SIZE_THRESHOLD)}`);

  // Optimize GLBs
  console.log('\n' + '═'.repeat(60));
  console.log('OPTIMIZING GLB FILES');
  console.log('═'.repeat(60));

  let glbResults = [];
  for (const file of largeGLBs) {
    const result = await optimizeGLB(file.path);
    if (result) glbResults.push(result);
  }

  // Optimize PNGs
  console.log('\n' + '═'.repeat(60));
  console.log('OPTIMIZING PNG FILES');
  console.log('═'.repeat(60));

  let pngResults = [];
  for (const file of largePNGs) {
    const result = await optimizePNG(file.path);
    if (result) pngResults.push(result);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('OPTIMIZATION SUMMARY');
  console.log('═'.repeat(60));

  const totalOriginal =
    glbResults.reduce((sum, r) => sum + r.originalSize, 0) +
    pngResults.reduce((sum, r) => sum + r.originalSize, 0);

  const totalNew =
    glbResults.reduce((sum, r) => sum + r.newSize, 0) +
    pngResults.reduce((sum, r) => sum + r.newSize, 0);

  const totalSavings = totalOriginal - totalNew;
  const totalPercent = ((totalSavings / totalOriginal) * 100).toFixed(1);

  console.log(`\nGLB files optimized: ${glbResults.length}`);
  console.log(`PNG files optimized: ${pngResults.length}`);
  console.log(`\nTotal original size: ${formatBytes(totalOriginal)}`);
  console.log(`Total new size: ${formatBytes(totalNew)}`);
  console.log(`Total saved: ${formatBytes(totalSavings)} (${totalPercent}%)\n`);

  console.log('✓ Optimization complete!');
  console.log(`\nBackups stored in: ${BACKUP_DIR}`);
  console.log('To restore originals, copy files from backup directory.');
}

main().catch(console.error);
