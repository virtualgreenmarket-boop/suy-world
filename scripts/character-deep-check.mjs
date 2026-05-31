#!/usr/bin/env node

/**
 * Character Deep Check
 * בדיקה מעמיקה של מודל הדמות הראשית
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

console.log('👤 בדיקה מעמיקה של הדמות הראשית\n');
console.log('='.repeat(60));

// ── 1. בדיקת קבצי קוד ──────────────────────────────────────────────────

console.log('\n📝 בודק קבצי קוד...\n');

const characterFiles = [
  'src/player/characterLoader.js',
  'src/player/localPlayer.js',
  'src/player/remotePlayer.js',
  'src/player/animations.js'
];

const checks = {
  anisotropyFilter: 0,
  shadowCasting: 0,
  colorSpace: 0,
  nullChecks: 0,
  animations: [],
  textures: [],
  issues: []
};

characterFiles.forEach(filePath => {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    checks.issues.push(`❌ קובץ חסר: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  console.log(`📄 ${path.basename(filePath)}`);

  // בדיקת anisotropy
  const anisotropyLines = lines.filter(l => l.includes('anisotropy'));
  if (anisotropyLines.length > 0) {
    checks.anisotropyFilter++;
    console.log(`  ✓ סינון אניזוטרופי: ${anisotropyLines.length} מופעים`);
    anisotropyLines.forEach(l => {
      const match = l.match(/anisotropy\s*=\s*(\d+)/);
      if (match) console.log(`    - רמה: ${match[1]}x`);
    });
  } else if (filePath.includes('characterLoader')) {
    checks.issues.push(`⚠️  ${filePath}: אין הגדרת anisotropy`);
  }

  // בדיקת shadow casting
  const shadowLines = lines.filter(l => l.includes('castShadow'));
  if (shadowLines.length > 0) {
    checks.shadowCasting++;
    console.log(`  ✓ הטלת צללים: ${shadowLines.length} מופעים`);
  }

  // בדיקת color space
  const colorSpaceLines = lines.filter(l => l.includes('colorSpace') || l.includes('SRGBColorSpace'));
  if (colorSpaceLines.length > 0) {
    checks.colorSpace++;
    console.log(`  ✓ מרחב צבע: ${colorSpaceLines.length} מופעים`);
  }

  // חיפוש אנימציות
  if (filePath.includes('animations') || filePath.includes('characterLoader')) {
    const animMatches = content.matchAll(/(idle|walk|run|jump|sit|wave|dance)/gi);
    for (const match of animMatches) {
      if (!checks.animations.includes(match[0].toLowerCase())) {
        checks.animations.push(match[0].toLowerCase());
      }
    }
  }

  // חיפוש טקסטורות
  const texMatches = content.matchAll(/['"`]([^'"`]*\.(png|jpg|jpeg))["`']/gi);
  for (const match of texMatches) {
    if (!checks.textures.includes(match[1])) {
      checks.textures.push(match[1]);
    }
  }

  // בדיקת null safety
  const unsafeLines = lines.filter((l, idx) => {
    if (l.includes('userData') && l.includes('.') && !l.includes('?.')) {
      if (!l.includes('if (') && !l.includes('&&') && !l.includes('||')) {
        return true;
      }
    }
    return false;
  });

  if (unsafeLines.length > 0) {
    checks.nullChecks += unsafeLines.length;
    console.log(`  ⚠️  בדיקות null חסרות: ${unsafeLines.length}`);
  }

  console.log('');
});

// ── 2. בדיקת קבצי מודל ──────────────────────────────────────────────────

console.log('\n📦 בודק קבצי מודל...\n');

const modelPath = path.join(rootDir, 'public/models/characters/ithappy');
if (fs.existsSync(modelPath)) {
  const mainModel = path.join(modelPath, 'Creative_Character_free.glb');
  if (fs.existsSync(mainModel)) {
    const stat = fs.statSync(mainModel);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`✓ מודל ראשי: Creative_Character_free.glb (${sizeMB} MB)`);

    if (stat.size > 10 * 1024 * 1024) {
      checks.issues.push(`⚠️  מודל ראשי גדול מדי: ${sizeMB} MB`);
    }
  } else {
    checks.issues.push('❌ מודל ראשי לא נמצא: Creative_Character_free.glb');
  }

  // ספירת accessories
  const assetsDir = path.join(modelPath, 'Separate_assets_glb');
  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir).filter(f => f.endsWith('.glb'));
    console.log(`✓ אביזרים זמינים: ${assets.length} GLB files`);

    const categories = {
      Body: assets.filter(a => a.startsWith('Body_')),
      Hair: assets.filter(a => a.includes('Hair')),
      Clothing: assets.filter(a => a.includes('Shirt') || a.includes('Pants') || a.includes('Shorts')),
      Shoes: assets.filter(a => a.includes('Shoe')),
      Accessories: assets.filter(a => a.includes('Glasses') || a.includes('Hat') || a.includes('Gloves'))
    };

    console.log('\n  קטגוריות אביזרים:');
    Object.entries(categories).forEach(([cat, items]) => {
      if (items.length > 0) {
        console.log(`    ${cat}: ${items.length} פריטים`);
      }
    });
  }

  // בדיקת טקסטורות
  const texPath = path.join(modelPath, 'textures');
  if (fs.existsSync(texPath)) {
    const texFiles = fs.readdirSync(texPath);
    console.log(`\n✓ טקסטורות: ${texFiles.length} קבצים`);

    texFiles.forEach(f => {
      const stat = fs.statSync(path.join(texPath, f));
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
      console.log(`    ${f}: ${sizeMB} MB`);

      if (stat.size > 5 * 1024 * 1024) {
        checks.issues.push(`⚠️  טקסטורה גדולה: ${f} (${sizeMB} MB)`);
      }
    });
  }
} else {
  checks.issues.push('❌ תיקיית מודלים לא נמצאה');
}

// ── 3. דוח מסכם ─────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('📊 סיכום בדיקת דמות');
console.log('='.repeat(60));

console.log('\n✅ תכונות איכות:');
console.log(`  • סינון אניזוטרופי: ${checks.anisotropyFilter > 0 ? '✓ מופעל' : '❌ לא מופעל'}`);
console.log(`  • הטלת צללים: ${checks.shadowCasting > 0 ? '✓ מופעל' : '❌ לא מופעל'}`);
console.log(`  • מרחב צבע נכון: ${checks.colorSpace > 0 ? '✓ מוגדר' : '⚠️  לא מוגדר'}`);

if (checks.animations.length > 0) {
  console.log(`\n🎭 אנימציות זמינות (${checks.animations.length}):`);
  console.log(`  ${checks.animations.join(', ')}`);
}

if (checks.textures.length > 0) {
  console.log(`\n🎨 טקסטורות מוזכרות בקוד (${checks.textures.length}):`);
  checks.textures.slice(0, 5).forEach(t => console.log(`  • ${t}`));
  if (checks.textures.length > 5) {
    console.log(`  ... ועוד ${checks.textures.length - 5}`);
  }
}

if (checks.nullChecks > 0) {
  console.log(`\n⚠️  בדיקות null חסרות: ${checks.nullChecks} מקומות`);
  console.log(`  (מומלץ להשתמש ב-optional chaining: userData?.mixer)`);
}

if (checks.issues.length > 0) {
  console.log('\n🔴 בעיות שנמצאו:');
  checks.issues.forEach(issue => console.log(`  ${issue}`));
}

console.log('\n✅ בדיקה מעמיקה הושלמה!\n');

process.exit(checks.issues.filter(i => i.startsWith('❌')).length > 0 ? 1 : 0);
