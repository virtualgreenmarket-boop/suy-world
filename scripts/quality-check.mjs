#!/usr/bin/env node

/**
 * Quality Check Script
 * בדיקה מקיפה של איכות המודלים, טקסטורות, ובאגים
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const issues = {
  critical: [],
  warnings: [],
  info: []
};

console.log('🔍 מתחיל בדיקת איכות מקיפה...\n');

// ── 1. בדיקת טקסטורות ─────────────────────────────────────────────────

console.log('📸 בודק טקסטורות...');

function checkTextures(dir, category) {
  const results = {
    totalSize: 0,
    files: [],
    largeFiles: [],
    lowRes: []
  };

  if (!fs.existsSync(dir)) {
    issues.warnings.push(`${category}: תיקייה לא קיימת - ${dir}`);
    return results;
  }

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(item)) {
        const sizeMB = stat.size / (1024 * 1024);
        results.totalSize += stat.size;
        results.files.push({
          name: item,
          path: fullPath.replace(rootDir, '').replace(/\\/g, '/'),
          size: sizeMB
        });

        // בדיקת גודל קובץ
        if (sizeMB > 10) {
          results.largeFiles.push({ name: item, size: sizeMB.toFixed(2) });
          issues.warnings.push(`${category}: קובץ גדול מדי - ${item} (${sizeMB.toFixed(2)} MB)`);
        }

        // בדיקת שם קובץ לאיכות נמוכה
        if (item.toLowerCase().includes('_512') || item.toLowerCase().includes('_256')) {
          results.lowRes.push(item);
          issues.info.push(`${category}: טקסטורה ברזולוציה נמוכה - ${item}`);
        }
      }
    }
  }

  scanDir(dir);

  const totalMB = results.totalSize / (1024 * 1024);
  console.log(`  ${category}: ${results.files.length} קבצים, ${totalMB.toFixed(2)} MB`);

  if (totalMB > 100) {
    issues.warnings.push(`${category}: גודל כולל גדול מדי (${totalMB.toFixed(2)} MB)`);
  }

  return results;
}

const textureChecks = {
  'דמות ראשית': checkTextures(path.join(rootDir, 'public/models/characters/ithappy'), 'Character'),
  'עצים': checkTextures(path.join(rootDir, 'public/models/nature/trees'), 'Trees'),
  'טקסטורות כלליות': checkTextures(path.join(rootDir, 'public/textures'), 'General')
};

// ── 2. בדיקת מודלים ────────────────────────────────────────────────────

console.log('\n🎨 בודק מודלים...');

function checkModels(dir, category) {
  const results = {
    glb: 0,
    fbx: 0,
    gltf: 0,
    totalSize: 0,
    largeModels: []
  };

  if (!fs.existsSync(dir)) {
    issues.warnings.push(`${category}: תיקיית מודלים לא קיימת - ${dir}`);
    return results;
  }

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        const sizeMB = stat.size / (1024 * 1024);

        if (ext === '.glb') {
          results.glb++;
          results.totalSize += stat.size;
          if (sizeMB > 20) {
            results.largeModels.push({ name: item, size: sizeMB.toFixed(2) });
            issues.warnings.push(`${category}: מודל GLB גדול - ${item} (${sizeMB.toFixed(2)} MB)`);
          }
        } else if (ext === '.fbx') {
          results.fbx++;
          results.totalSize += stat.size;
        } else if (ext === '.gltf') {
          results.gltf++;
        }
      }
    }
  }

  scanDir(dir);

  console.log(`  ${category}: GLB:${results.glb}, FBX:${results.fbx}, GLTF:${results.gltf}`);

  return results;
}

const modelChecks = {
  'דמויות': checkModels(path.join(rootDir, 'public/models/characters'), 'Characters'),
  'עצים וטבע': checkModels(path.join(rootDir, 'public/models/nature'), 'Nature')
};

// ── 3. בדיקת קוד לבאגים ─────────────────────────────────────────────────

console.log('\n🐛 בודק קוד לבאגים פוטנציאליים...');

const codeIssues = {
  missingNullChecks: [],
  hardcodedValues: [],
  consoleWarnings: []
};

function checkSourceFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // בדיקת אזהרות קונסול
    if (line.includes('console.warn') || line.includes('console.error')) {
      codeIssues.consoleWarnings.push({ file: fileName, line: lineNum, text: line.trim() });
    }

    // בדיקת גישה ל-undefined property
    if (line.match(/\.\w+\s*\(/g) && !line.includes('?.') && line.includes('userData')) {
      if (!line.includes('if') && !line.includes('&&') && !line.includes('||')) {
        codeIssues.missingNullChecks.push({
          file: fileName,
          line: lineNum,
          text: line.trim().substring(0, 80)
        });
      }
    }
  });
}

const srcDir = path.join(rootDir, 'src');
function scanSourceFiles(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanSourceFiles(fullPath);
    } else if (item.endsWith('.js')) {
      checkSourceFile(fullPath);
    }
  }
}

scanSourceFiles(srcDir);

console.log(`  נמצאו ${codeIssues.consoleWarnings.length} אזהרות קונסול`);
console.log(`  נמצאו ${codeIssues.missingNullChecks.length} בדיקות null חסרות פוטנציאליות`);

// ── 4. בדיקה ספציפית לדמות הראשית ───────────────────────────────────────

console.log('\n👤 בודק דמות ראשית...');

const characterFile = path.join(rootDir, 'src/player/characterLoader.js');
if (fs.existsSync(characterFile)) {
  const content = fs.readFileSync(characterFile, 'utf-8');

  // בדיקת scale
  if (content.includes('MODEL_SCALE')) {
    const scaleMatch = content.match(/MODEL_SCALE\s*=\s*([\d.]+)/);
    if (scaleMatch) {
      const scale = parseFloat(scaleMatch[1]);
      console.log(`  ✓ קנה מידה של מודל: ${scale}`);
      if (scale !== 1.0) {
        issues.info.push(`Character: קנה מידה מותאם אישית (${scale})`);
      }
    }
  }

  // בדיקת animations
  if (content.includes('_builtinClips')) {
    console.log(`  ✓ תמיכה באנימציות מובנות`);
  }
  if (content.includes('Mixamo')) {
    console.log(`  ✓ תמיכה באנימציות Mixamo`);
  }

  // בדיקת shadow casting
  if (content.includes('castShadow = true')) {
    console.log(`  ✓ הטלת צללים מופעלת`);
  } else {
    issues.warnings.push('Character: הטלת צללים לא מופעלת');
  }

  // בדיקת texture quality
  if (content.includes('anisotropy')) {
    console.log(`  ✓ סינון אניזוטרופי מופעל (איכות טקסטורות גבוהה)`);
  } else {
    issues.warnings.push('Character: סינון אניזוטרופי לא מוגדר');
  }

} else {
  issues.critical.push('Character: קובץ characterLoader.js לא נמצא!');
}

// ── 5. בדיקת עצים ───────────────────────────────────────────────────────

console.log('\n🌲 בודק מערכת עצים...');

const treesFile = path.join(rootDir, 'src/world/trees.js');
if (fs.existsSync(treesFile)) {
  const content = fs.readFileSync(treesFile, 'utf-8');

  // בדיקת גובה
  if (content.includes('TARGET_HEIGHT')) {
    const heightMatch = content.match(/TARGET_HEIGHT\s*=\s*([\d.]+)/);
    if (heightMatch) {
      console.log(`  ✓ גובה עצים רגילים: ${heightMatch[1]}m`);
    }
  }

  // בדיקת plaza tree
  if (content.includes('spawnPlazaTree')) {
    console.log(`  ✓ עץ מרכזי בפלאזה מוגדר`);
    if (content.includes('27.5')) {
      console.log(`  ✓ גובה עץ פלאזה: 27.5m (125%)`);
    }
  }

  // בדיקת איכות טקסטורות
  if (content.includes('anisotropy = 16')) {
    console.log(`  ✓ סינון אניזוטרופי מקסימלי (16x)`);
  }

  if (content.includes('emissive')) {
    console.log(`  ✓ תאורה אמיסיבית להבהרת צבעים`);
  }

  if (content.includes('colorSpace = THREE.SRGBColorSpace')) {
    console.log(`  ✓ מרחב צבע sRGB נכון`);
  } else {
    issues.warnings.push('Trees: מרחב צבע לא מוגדר כראוי');
  }

} else {
  issues.critical.push('Trees: קובץ trees.js לא נמצא!');
}

// ── 6. דוח סיכום ────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('📊 דוח סיכום');
console.log('='.repeat(60));

if (issues.critical.length > 0) {
  console.log('\n🔴 בעיות קריטיות:');
  issues.critical.forEach(issue => console.log(`  ❌ ${issue}`));
}

if (issues.warnings.length > 0) {
  console.log('\n🟡 אזהרות:');
  issues.warnings.slice(0, 10).forEach(issue => console.log(`  ⚠️  ${issue}`));
  if (issues.warnings.length > 10) {
    console.log(`  ... ועוד ${issues.warnings.length - 10} אזהרות`);
  }
}

if (issues.info.length > 0) {
  console.log('\n🔵 מידע:');
  issues.info.slice(0, 5).forEach(issue => console.log(`  ℹ️  ${issue}`));
  if (issues.info.length > 5) {
    console.log(`  ... ועוד ${issues.info.length - 5} הערות`);
  }
}

// סיכום מספרי
console.log('\n📈 סטטיסטיקות:');
console.log(`  טקסטורות: ${Object.values(textureChecks).reduce((sum, c) => sum + c.files.length, 0)} קבצים`);
console.log(`  מודלים GLB: ${Object.values(modelChecks).reduce((sum, c) => sum + c.glb, 0)} קבצים`);
console.log(`  אזהרות קונסול בקוד: ${codeIssues.consoleWarnings.length}`);

console.log('\n✅ בדיקה הושלמה!\n');

// Exit code
process.exit(issues.critical.length > 0 ? 1 : 0);
