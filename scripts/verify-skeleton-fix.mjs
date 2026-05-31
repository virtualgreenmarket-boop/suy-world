#!/usr/bin/env node

/**
 * Skeleton Fix Verification Script
 * Checks that all critical fixes are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

console.log('🔍 Verifying Skeleton Deformation Fixes...\n');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

// ── Check 1: characterLoader.js has duplicate prevention ──
console.log('📝 Checking characterLoader.js...');
const charLoaderPath = path.join(rootDir, 'src/player/characterLoader.js');
const charLoaderContent = fs.readFileSync(charLoaderPath, 'utf-8');

if (charLoaderContent.includes('parentGroup.userData._charModel')) {
  checks.passed.push('✓ Duplicate model prevention in place');
} else {
  checks.failed.push('✗ Missing duplicate model cleanup');
}

if (charLoaderContent.includes('clone.rotation.set(0, 0, 0)')) {
  checks.passed.push('✓ Character rotation reset on spawn');
} else {
  checks.failed.push('✗ Missing rotation reset on character spawn');
}

if (charLoaderContent.includes('charModel.parent !== group')) {
  checks.passed.push('✓ Model reattachment safety check present');
} else {
  checks.failed.push('✗ Missing model reattachment check');
}

if (charLoaderContent.includes('n.skeleton.dispose()')) {
  checks.passed.push('✓ Skeleton cleanup for equipment');
} else {
  checks.failed.push('✗ Missing skeleton disposal in equipment');
}

if (charLoaderContent.includes('charModel.rotation.x = 0')) {
  checks.passed.push('✓ Character model rotation locked in updateCharacterMixer');
} else {
  checks.failed.push('✗ Missing rotation lock in updateCharacterMixer');
}

// ── Check 2: localPlayer.js has rotation locking ──
console.log('📝 Checking localPlayer.js...');
const localPlayerPath = path.join(rootDir, 'src/player/localPlayer.js');
const localPlayerContent = fs.readFileSync(localPlayerPath, 'utf-8');

if (localPlayerContent.includes('playerGroup.rotation.x = 0') &&
    localPlayerContent.includes('playerGroup.rotation.z = 0')) {
  checks.passed.push('✓ Local player rotation locked in update loop');
} else {
  checks.failed.push('✗ Missing rotation lock in local player update');
}

if (localPlayerContent.includes('playerGroup.rotation.set(0, facingY, 0)')) {
  checks.passed.push('✓ Safe sitting rotation (X and Z locked)');
} else {
  checks.failed.push('✗ Sitting doesn\'t lock X and Z rotation');
}

if (localPlayerContent.includes('playerGroup.scale.set(1.2, 1.2, 1.2)') ||
    localPlayerContent.includes('playerGroup.scale.set(1.0, 1.0, 1.0)')) {
  checks.passed.push('✓ Uniform scale for sitting/standing');
} else {
  checks.warnings.push('⚠ Scale might not be uniform (could cause minor deformation)');
}

// ── Check 3: remotePlayer.js has rotation locking ──
console.log('📝 Checking remotePlayer.js...');
const remotePlayerPath = path.join(rootDir, 'src/player/remotePlayer.js');
const remotePlayerContent = fs.readFileSync(remotePlayerPath, 'utf-8');

if (remotePlayerContent.includes('group.rotation.x = 0') &&
    remotePlayerContent.includes('group.rotation.z = 0')) {
  checks.passed.push('✓ Remote player rotation locked');
} else {
  checks.failed.push('✗ Missing rotation lock in remote player update');
}

// ── Check 4: Bone map validation ──
if (charLoaderContent.includes('console.warn') &&
    charLoaderContent.includes('bone not found')) {
  checks.passed.push('✓ Bone validation warnings in place');
} else {
  checks.warnings.push('⚠ Missing bone validation warnings');
}

// ── Print Results ──
console.log('\n' + '='.repeat(60));
console.log('📊 Verification Results');
console.log('='.repeat(60));

if (checks.passed.length > 0) {
  console.log('\n✅ Passed Checks:');
  checks.passed.forEach(check => console.log(`  ${check}`));
}

if (checks.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  checks.warnings.forEach(check => console.log(`  ${check}`));
}

if (checks.failed.length > 0) {
  console.log('\n❌ Failed Checks:');
  checks.failed.forEach(check => console.log(`  ${check}`));
}

console.log('\n' + '='.repeat(60));
console.log('Summary:');
console.log(`  Passed: ${checks.passed.length}`);
console.log(`  Warnings: ${checks.warnings.length}`);
console.log(`  Failed: ${checks.failed.length}`);

if (checks.failed.length === 0) {
  console.log('\n🎉 All critical fixes are in place!');
  console.log('\n📝 Next Steps:');
  console.log('  1. Run "npm run dev" to test the game');
  console.log('  2. Check that character model follows camera correctly');
  console.log('  3. Verify no bone stretching or explosion');
  console.log('  4. Test sitting/standing transitions');
  console.log('  5. Test equipment changes');
} else {
  console.log('\n⚠️  Some fixes are missing. Please review SKELETON_FIX_SUMMARY.md');
  process.exit(1);
}

console.log('');
