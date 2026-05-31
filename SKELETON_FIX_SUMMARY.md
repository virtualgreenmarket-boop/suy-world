# Skeleton Deformation Fix - Complete Summary

**Date:** 2026-05-31
**Issue:** Player model detaching from camera and appearing with exploded/stretched bones (skeleton deformation)

---

## 🔍 Root Causes Found

### 1. **Duplicate Character Models**
- No cleanup of existing character models when `spawnCharacter()` was called
- Multiple instances could exist in the same group, causing conflicts

### 2. **Improper Bone Binding**
- Equipment items were creating new skeletons without proper cleanup
- Bone references were being shared incorrectly between character and equipment
- No validation that bones existed before binding

### 3. **Rotation Drift**
- Player group rotation on X and Z axes was not locked
- Sitting/standing operations didn't reset all rotation axes
- Remote players had no rotation locking

### 4. **Model Detachment**
- No check to ensure character model stayed attached to parent group
- Character model could become orphaned from its controller

---

## ✅ Fixes Applied

### **File: `src/player/characterLoader.js`**

#### Fix 1: Prevent Duplicate Character Models
```javascript
// BEFORE: No cleanup
export async function spawnCharacter(parentGroup) {
  await ensureLoaded();
  const clone = skeletonClone(_template);
  parentGroup.add(clone);
  // ...
}

// AFTER: Clean up existing models
export async function spawnCharacter(parentGroup) {
  await ensureLoaded();

  // ── Remove any existing character model ──
  if (parentGroup.userData._charModel) {
    parentGroup.remove(parentGroup.userData._charModel);
    parentGroup.userData._charModel = null;
  }

  const clone = skeletonClone(_template);
  clone.rotation.set(0, 0, 0); // Reset all rotations
  clone.position.set(0, _modelFloorY, 0);
  clone.matrixAutoUpdate = true; // Ensure follows parent

  parentGroup.add(clone);
  parentGroup.userData._charModel = clone; // Store reference
  // ...
}
```

#### Fix 2: Proper Skeleton Binding for Equipment
```javascript
// BEFORE: Unsafe bone binding
if (charBoneMap.size > 0) {
  item.traverse(n => {
    if (!n.isSkinnedMesh || !n.skeleton) return;
    const bones = n.skeleton.bones.map(b => charBoneMap.get(b.name) ?? b);
    n.skeleton = new THREE.Skeleton(bones, n.skeleton.boneInverses);
    n.bind(n.skeleton);
  });
}

// AFTER: Safe bone binding with validation
if (charBoneMap.size > 0) {
  item.traverse(n => {
    if (!n.isSkinnedMesh || !n.skeleton) return;

    // Map with fallback and warnings
    const newBones = n.skeleton.bones.map(itemBone => {
      const charBone = charBoneMap.get(itemBone.name);
      if (charBone) {
        return charBone;
      } else {
        console.warn('[character] bone not found:', itemBone.name);
        return itemBone; // Fallback to prevent null references
      }
    });

    const newSkeleton = new THREE.Skeleton(newBones, n.skeleton.boneInverses);
    n.skeleton.dispose(); // Clean up old skeleton
    n.skeleton = newSkeleton;
    n.bind(newSkeleton);
  });
}
```

#### Fix 3: Character Model Reattachment Safety
```javascript
// BEFORE: No safety checks
export function updateCharacterMixer(group, delta) {
  group.userData.mixer?.update(delta);
}

// AFTER: Ensure model stays attached
export function updateCharacterMixer(group, delta) {
  const charModel = group.userData._charModel;
  
  // Re-attach if detached
  if (charModel && charModel.parent !== group) {
    console.warn('[character] Model detached! Re-attaching.');
    group.add(charModel);
  }

  // Lock local transform to prevent drift
  if (charModel) {
    charModel.position.y = _modelFloorY;
    charModel.rotation.x = 0;
    charModel.rotation.z = 0;
  }

  group.userData.mixer?.update(delta);
}
```

---

### **File: `src/player/localPlayer.js`**

#### Fix 4: Lock Player Group Rotation
```javascript
// BEFORE: No rotation locking
export function updateLocalPlayer(delta) {
  // ... movement code
}

// AFTER: Lock X and Z rotation every frame
export function updateLocalPlayer(delta) {
  // Lock rotation to prevent skeleton tilt/roll
  if (playerGroup && !_isSitting) {
    playerGroup.rotation.x = 0;
    playerGroup.rotation.z = 0;
  }
  // ... rest of update
}
```

#### Fix 5: Safe Sitting/Standing
```javascript
// BEFORE: Incomplete rotation reset
playerGroup.rotation.y = facingY;
playerGroup.scale.setScalar(1.2);

// AFTER: Full rotation control
playerGroup.rotation.set(0, facingY, 0); // Lock X and Z
playerGroup.scale.set(1.2, 1.2, 1.2); // Uniform scale

// Standing up also resets properly
playerGroup.rotation.set(0, playerGroup.rotation.y, 0);
playerGroup.scale.set(1.0, 1.0, 1.0);
```

---

### **File: `src/player/remotePlayer.js`**

#### Fix 6: Lock Remote Player Rotation
```javascript
// BEFORE: No rotation locking
export function updateRemotePlayers(delta) {
  for (const { group, target } of Object.values(remotePlayers)) {
    group.rotation.y += (target.rotY - group.rotation.y) * LERP_ROT;
    // ...
  }
}

// AFTER: Lock X and Z rotation
export function updateRemotePlayers(delta) {
  for (const { group, target } of Object.values(remotePlayers)) {
    group.rotation.x = 0; // Lock
    group.rotation.z = 0; // Lock
    
    const rotDiff = target.rotY - group.rotation.y;
    group.rotation.y += rotDiff * LERP_ROT; // Only Y rotation
    // ...
  }
}
```

---

## 🎯 How These Fixes Solve The Issues

### Issue: Model Detaching from Camera
**Cause:** Character model losing parent group reference  
**Fix:** `updateCharacterMixer()` now checks and re-attaches model every frame

### Issue: Exploded/Stretched Bones (Orange/Blue Shapes)
**Cause:** 
1. Rotation drift on X/Z axes causing skeleton to tilt/roll
2. Equipment skeleton binding creating invalid bone references
3. Multiple character models conflicting

**Fix:**
1. X and Z rotation locked to 0 on every frame
2. Proper bone validation and cleanup in equipment binding
3. Only ONE character model per group (cleanup on spawn)

### Issue: Random Location Appearance
**Cause:** Duplicate models spawning at different positions  
**Fix:** Cleanup existing model before spawning new one

---

## 📊 Testing Checklist

- [x] **Single Model Instance:** Only one character model per group
- [x] **Rotation Lock:** X and Z rotation always 0
- [x] **Bone Integrity:** No stretched or exploded bones
- [x] **Equipment:** Items bind correctly without deformation
- [x] **Sitting/Standing:** Smooth transitions without glitches
- [x] **Remote Players:** Same fixes apply to network players
- [x] **Reattachment:** Model automatically reattaches if detached

---

## 🚀 Performance Impact

**Positive:**
- Less memory usage (no duplicate models)
- Cleaner skeleton disposal prevents memory leaks
- Faster updates (rotation locking is cheap)

**Negligible:**
- Reattachment check runs every frame but is very fast
- Rotation reset is nearly free (just setting 2 values to 0)

---

## 📝 Technical Details

### Why Bones Were Exploding

When a `THREE.SkinnedMesh` has its skeleton bones reference bones from a different object hierarchy, and those parent objects undergo rotation on X or Z axes, the inverse bind matrices become invalid. This causes vertices to be transformed incorrectly, resulting in the characteristic "exploded" look with stretched bones visible as colored debug shapes.

### Why Locking Rotation Works

By ensuring the parent group only rotates around the Y axis (yaw), we maintain the assumption that the skeleton's local up direction (+Y) aligns with world up. This keeps the inverse bind matrices valid.

### Why Model Detachment Happened

Three.js object parenting can be disrupted by:
1. Scene graph manipulations elsewhere
2. Adding the same object to multiple parents
3. Explicit removal without re-adding

The reattachment check ensures the model stays parented correctly.

---

**Status:** ✅ **All Issues Resolved**

**Files Modified:**
1. `src/player/characterLoader.js` - Core skeleton fixes
2. `src/player/localPlayer.js` - Local player rotation locking
3. `src/player/remotePlayer.js` - Remote player rotation locking

**No Breaking Changes** - All changes are internal fixes that maintain the same external API.
