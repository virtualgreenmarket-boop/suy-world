// Compress normal maps to 1024x1024 for performance
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const normalMaps = [
  'public/textures/grass/Grass001_2K-JPG_NormalGL.jpg',
  'public/textures/beach/Ground054_2K-JPG_NormalGL.jpg',
  'public/textures/hangars/Bricks066_2K-JPG_NormalGL.jpg',
];

async function compressNormalMap(relPath) {
  const fullPath = join(rootDir, relPath);
  const outputPath = fullPath.replace('_2K-JPG_', '_1K-JPG_');

  console.log(`Compressing ${relPath}...`);

  await sharp(fullPath)
    .resize(1024, 1024, { fit: 'fill' })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  const stats = await import('fs').then(m => m.promises.stat(outputPath));
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`  → Created ${outputPath} (${sizeMB} MB)`);
}

async function main() {
  for (const path of normalMaps) {
    await compressNormalMap(path);
  }
  console.log('\nDone! Update texture paths in code to use _1K-JPG_ versions.');
}

main().catch(console.error);
