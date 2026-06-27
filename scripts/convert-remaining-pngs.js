#!/usr/bin/env node

/**
 * Convert remaining PNG files to WebP and delete large PNGs that have WebP equivalents
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function convertPNG(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, '.webp');

  // Skip if webp already exists
  if (fs.existsSync(webpPath)) {
    console.log(`  ⊘ WebP already exists, skipping conversion`);
    return webpPath;
  }

  const stats = fs.statSync(pngPath);
  console.log(`  Converting ${path.basename(pngPath)} (${formatBytes(stats.size)})...`);

  await sharp(pngPath)
    .webp({ quality: 85, effort: 6 })
    .toFile(webpPath);

  const webpStats = fs.statSync(webpPath);
  console.log(`  ✓ Created WebP: ${formatBytes(webpStats.size)}`);

  return webpPath;
}

async function main() {
  console.log('🔄 Converting remaining PNGs to WebP\n');

  // Convert maplebranch.png
  const mapleBranchPath = path.join(__dirname, '../public/models/nature/trees/plaza_tree/textures/maplebranch.png');
  if (fs.existsSync(mapleBranchPath)) {
    console.log('📄 maplebranch.png');
    await convertPNG(mapleBranchPath);
  }

  // Delete large PNG files that have WebP equivalents
  console.log('\n🗑️  Deleting large PNG files with WebP equivalents\n');

  const largePNGs = [
    'public/models/nature/trees/plaza_tree/textures/Cylinder_Tile_PBR_StoA_Diffuse.png',
    'public/models/nature/trees/plaza_tree/textures/HeroTreeTRUNK_Bake1_PBR_StoA_Diffuse.png',
  ];

  let totalDeleted = 0;
  for (const relativePath of largePNGs) {
    const fullPath = path.join(__dirname, '..', relativePath);
    const webpPath = fullPath.replace(/\.png$/i, '.webp');

    if (fs.existsSync(fullPath) && fs.existsSync(webpPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`  Deleting ${path.basename(fullPath)} (${formatBytes(stats.size)})...`);
      fs.unlinkSync(fullPath);
      totalDeleted += stats.size;
      console.log(`  ✓ Deleted`);
    }
  }

  console.log(`\n✓ Total space freed: ${formatBytes(totalDeleted)}`);
}

main().catch(console.error);
