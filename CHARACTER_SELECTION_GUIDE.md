# Character Selection System - Guide

**Date:** 2026-05-31  
**Feature:** Player character selection with 3D preview and custom animations

---

## 📋 Overview

Players can now choose from 6 different character models at game start. Each character displays in a 3D rotating preview before selection.

---

## 📁 File Structure

### Character Models
Place your character models in:
```
public/models/player/characters/
├── model1.glb  ✓ Required
├── model2.glb  ✓ Required
├── model3.glb  ✓ Required
├── model4.glb  ✓ Required
├── model5.glb  ✓ Required
└── model6.glb  ✓ Required
```

### Animations
Place your animation files in:
```
public/models/player/animations/
├── idle.glb         ✓ Required - Standing idle
├── walking.glb      ✓ Required - Walking animation
├── running.glb      ✓ Required - Running animation
├── jump.glb         ✓ Required - Jump animation
└── SittingIdle.glb  ✓ Required - Sitting on bench
```

---

## 🎮 How It Works

### 1. First Time Launch
- Player sees character selection screen
- Can preview all 6 characters in 3D
- Characters rotate slowly for full view
- Click a character to select
- Click "Enter Game" to confirm

### 2. Character Preview
- **Scene:** Dark gradient background with circular platform
- **Lighting:** Three-point lighting (key, fill, ambient)
- **Rotation:** Automatic slow rotation (0.5 rad/s)
- **Scale:** Auto-scaled to 1.8m height

### 3. Selection Storage
- Choice saved to `localStorage` as `selected_character`
- On subsequent visits, auto-loads saved character
- No selection screen shown on return visits

### 4. In-Game Usage
- Selected character loads with custom animations
- Animations applied based on player state:
  - **Idle:** Standing still
  - **Walk:** Moving at normal speed
  - **Run:** Moving at sprint speed
  - **Jump:** In the air
  - **Sit:** On bench

---

## 🔧 Technical Details

### New Files Created

#### 1. `src/ui/characterSelection.js`
Character selection UI with 3D preview
- **Functions:**
  - `initCharacterSelection(onSelect)` - Show selection screen
  - `getSavedCharacter()` - Get saved choice
  - `clearSavedCharacter()` - Reset choice (for testing)
  - `getCharacterModelPath(charId)` - Get model path

#### 2. `src/player/playerCharacterLoader.js`
Player character and animation loader
- **Functions:**
  - `preloadPlayerCharacter(characterId)` - Load character and animations
  - `spawnPlayerCharacter(parentGroup)` - Spawn instance
  - `setPlayerAnimState(group, state, immediate)` - Change animation
  - `updatePlayerCharacterMixer(group, delta)` - Update animations

### Modified Files

#### 1. `src/main.js`
- Added character selection initialization
- Conditional loading based on selection
- Auto-reload after selection

#### 2. `src/player/localPlayer.js`
- Support for both player characters and default character
- Conditional animation updates
- Fallback to default system if player character fails

---

## 🎨 Customization

### Change Number of Characters
Edit `src/ui/characterSelection.js`:
```javascript
const CHARACTER_MODELS = [
  { id: 1, path: '/models/player/characters/model1.glb', name: 'Character 1' },
  // Add more here...
];
```

### Change Preview Camera
Edit `src/ui/characterSelection.js`:
```javascript
_previewCamera.position.set(0, 1.6, 3.5); // x, y, z
_previewCamera.lookAt(0, 1, 0);
```

### Change Rotation Speed
Edit `src/ui/characterSelection.js`:
```javascript
_currentModel.rotation.y += delta * 0.5; // Change 0.5 to desired speed
```

### Add More Animations
Edit `src/player/playerCharacterLoader.js`:
```javascript
const ANIMATION_FILES = {
  idle: 'idle.glb',
  walk: 'walking.glb',
  run: 'running.glb',
  jump: 'jump.glb',
  sit: 'SittingIdle.glb',
  // Add more here:
  // dance: 'dance.glb',
  // wave: 'wave.glb',
};
```

---

## 🧪 Testing

### Reset Character Selection
Run in browser console:
```javascript
localStorage.removeItem('selected_character');
location.reload();
```

### Force Specific Character
Run in browser console:
```javascript
localStorage.setItem('selected_character', '3'); // Character 3
location.reload();
```

### Check Current Selection
Run in browser console:
```javascript
localStorage.getItem('selected_character');
```

---

## ⚙️ Model Requirements

### Character Models (.glb)
- **Format:** glTF Binary (.glb)
- **Scale:** Any (auto-scaled to 1.8m)
- **Orientation:** Upright, facing +Z
- **Bones:** Optional (for compatibility)
- **Textures:** Embedded in .glb

### Animation Files (.glb)
- **Format:** glTF Binary (.glb)
- **Must contain:** Animation clip
- **Target:** Should match character skeleton
- **Loop:** Idle, walk, run, sit should loop
- **One-shot:** Jump plays once

---

## 🔄 Fallback Behavior

If player character system fails:
1. Logs error to console
2. Falls back to default character system
3. Uses old `characterLoader.js` + NPC system
4. Game continues normally

---

## 🎯 Animation State Mapping

| Player State | Animation Used |
|-------------|----------------|
| Standing still | `idle.glb` |
| Walking (normal speed) | `walking.glb` |
| Running (sprint) | `running.glb` |
| In air / jumping | `jump.glb` |
| Sitting on bench | `SittingIdle.glb` |

---

## 📝 Notes

- **NPC files unchanged:** All NPC code remains untouched
- **Backward compatible:** Old character system still works
- **Performance:** Only loads selected character + animations
- **Storage:** Uses localStorage (persists across sessions)
- **Validation:** Gracefully handles missing files

---

## 🚀 Quick Start

1. **Add character models** to `public/models/player/characters/`
2. **Add animations** to `public/models/player/animations/`
3. **Launch game** - selection screen appears automatically
4. **Select character** and click "Enter Game"
5. **Play!** - Your character loads with animations

---

**Status:** ✅ Ready to use - Just add your models and animations!
