import * as THREE from 'three';
import { buildCharacter, setCharacterEmotion, animateCharacter } from '../player/CharacterBuilder.js';

// NPC instances
const NPCS = [
  { type: 'boy', name: 'Alex', startPos: { x: -15, z: -15 } },
  { type: 'girl', name: 'Maya', startPos: { x: 15, z: -15 } },
  { type: 'sam', name: 'Sam', startPos: { x: -15, z: 15 } },
  { type: 'dana', name: 'Dana', startPos: { x: 15, z: 15 } }
];

const EMOJI_LIST = ['laugh_tears', 'wink', 'yummy', 'shh', 'shake_no', 'nod_yes', 'angry', 'crying'];

let _npcs = [];
let _scene = null;
let _animalSystem = null;

class RoamingNPC {
  constructor(type, name, startPos, scene) {
    this.type = type;
    this.name = name;
    this.scene = scene;

    // Build character
    this.group = buildCharacter(type);
    this.group.position.set(startPos.x, 0, startPos.z);
    this.group.userData._npcName = name;
    this.group.userData._isRoamingNPC = true;
    scene.add(this.group);

    // State
    this.state = 'idle';
    this.targetPos = null;
    this.targetNPC = null;
    this.targetAnimal = null;
    this.speed = 0;
    this.stateTimer = 0;
    this.nextStateChange = this._randomTime(2, 5);
    this.emojiTimer = 0;
    this.nextEmojiTime = this._randomTime(10, 30);

    // Movement
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    console.log(`[RoamingNPC] Created ${name} (${type}) at`, startPos);
  }

  _randomTime(min, max) {
    return min + Math.random() * (max - min);
  }

  _pickRandomDestination() {
    // Roam entire map: plaza (-40 to 40), hangars (various), marina
    const areas = [
      // Plaza area
      { x: () => -30 + Math.random() * 60, z: () => -30 + Math.random() * 60 },
      // Hangar 1 (north)
      { x: () => -35 + Math.random() * 30, z: () => 25 + Math.random() * 25 },
      // Hangar 2 (south)
      { x: () => 10 + Math.random() * 30, z: () => -50 + Math.random() * 20 },
      // Marina area
      { x: () => -60 + Math.random() * 40, z: () => -10 + Math.random() * 20 }
    ];

    const area = areas[Math.floor(Math.random() * areas.length)];
    return new THREE.Vector3(area.x(), 0, area.z());
  }

  _pickNewBehavior() {
    const behaviors = ['walk', 'run', 'idle', 'walk', 'walk', 'approach_npc', 'approach_animal'];
    const choice = behaviors[Math.floor(Math.random() * behaviors.length)];

    switch (choice) {
      case 'walk':
        this.state = 'walking';
        this.targetPos = this._pickRandomDestination();
        this.speed = 2.5;
        this.nextStateChange = this._randomTime(4, 10);
        break;

      case 'run':
        this.state = 'running';
        this.targetPos = this._pickRandomDestination();
        this.speed = 5.0;
        this.nextStateChange = this._randomTime(2, 5);
        break;

      case 'idle':
        this.state = 'idle';
        this.targetPos = null;
        this.speed = 0;
        this.nextStateChange = this._randomTime(2, 6);
        break;

      case 'approach_npc':
        // Pick another NPC
        const otherNPCs = _npcs.filter(npc => npc !== this);
        if (otherNPCs.length > 0) {
          this.targetNPC = otherNPCs[Math.floor(Math.random() * otherNPCs.length)];
          this.state = 'approaching_npc';
          this.speed = 2.5;
          this.nextStateChange = this._randomTime(5, 10);
        } else {
          this._pickNewBehavior(); // Fallback
        }
        break;

      case 'approach_animal':
        // Try to find nearby animal
        if (_animalSystem && _animalSystem.getAllAnimals) {
          const animals = _animalSystem.getAllAnimals();
          if (animals.length > 0) {
            const nearbyAnimals = animals.filter(a => {
              const dist = this.group.position.distanceTo(a.position);
              return dist < 50 && dist > 3;
            });
            if (nearbyAnimals.length > 0) {
              this.targetAnimal = nearbyAnimals[Math.floor(Math.random() * nearbyAnimals.length)];
              this.state = 'approaching_animal';
              this.speed = 2.0;
              this.nextStateChange = this._randomTime(3, 8);
            } else {
              this._pickNewBehavior(); // No nearby animals
            }
          } else {
            this._pickNewBehavior(); // No animals
          }
        } else {
          this._pickNewBehavior(); // Animal system not ready
        }
        break;
    }
  }

  _maybeJump() {
    // Random jump while moving
    if ((this.state === 'walking' || this.state === 'running') && Math.random() < 0.005) {
      // Trigger jump animation via CharacterBuilder
      if (this.group.userData._charModel) {
        const P = this.group.userData._charModel.userData;
        if (P && !P._isJumping) {
          P._isJumping = true;
          P._jumpStartY = this.group.position.y;
          P._jumpT = 0;
          setTimeout(() => {
            if (P) P._isJumping = false;
          }, 600);
        }
      }
    }
  }

  _maybeEmoji(delta) {
    this.emojiTimer += delta;
    if (this.emojiTimer >= this.nextEmojiTime) {
      this.emojiTimer = 0;
      this.nextEmojiTime = this._randomTime(15, 45);

      // Trigger random emoji
      const emoji = EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
      if (window.setPlayerEmoji) {
        setCharacterEmotion(this.group, emoji);
        setTimeout(() => {
          setCharacterEmotion(this.group, 'neutral');
        }, 5000);
      }
    }
  }

  update(delta) {
    this.stateTimer += delta;
    this._maybeJump();
    this._maybeEmoji(delta);

    // State timeout
    if (this.stateTimer >= this.nextStateChange) {
      this.stateTimer = 0;
      this._pickNewBehavior();
    }

    // Movement logic
    if (this.state === 'walking' || this.state === 'running') {
      if (this.targetPos) {
        this.direction.copy(this.targetPos).sub(this.group.position);
        this.direction.y = 0;
        const dist = this.direction.length();

        if (dist < 1.0) {
          // Reached destination
          this._pickNewBehavior();
        } else {
          this.direction.normalize();
          this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
          this.group.position.add(this.velocity);

          // Face direction
          const angle = Math.atan2(this.direction.x, this.direction.z);
          this.group.rotation.y = angle;
        }
      }
    } else if (this.state === 'approaching_npc') {
      if (this.targetNPC && this.targetNPC.group) {
        this.direction.copy(this.targetNPC.group.position).sub(this.group.position);
        this.direction.y = 0;
        const dist = this.direction.length();

        if (dist < 2.5) {
          // Stop and face
          this.state = 'facing_npc';
          this.speed = 0;
          const angle = Math.atan2(this.direction.x, this.direction.z);
          this.group.rotation.y = angle;
          this.nextStateChange = this._randomTime(3, 6);
          this.stateTimer = 0;
        } else {
          this.direction.normalize();
          this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
          this.group.position.add(this.velocity);

          const angle = Math.atan2(this.direction.x, this.direction.z);
          this.group.rotation.y = angle;
        }
      } else {
        this._pickNewBehavior();
      }
    } else if (this.state === 'approaching_animal') {
      if (this.targetAnimal && this.targetAnimal.position) {
        this.direction.copy(this.targetAnimal.position).sub(this.group.position);
        this.direction.y = 0;
        const dist = this.direction.length();

        if (dist < 3.0) {
          // Stop near animal
          this.state = 'idle';
          this.speed = 0;
          this.nextStateChange = this._randomTime(3, 6);
          this.stateTimer = 0;
        } else {
          this.direction.normalize();
          this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
          this.group.position.add(this.velocity);

          const angle = Math.atan2(this.direction.x, this.direction.z);
          this.group.rotation.y = angle;
        }
      } else {
        this._pickNewBehavior();
      }
    }

    // Animate character
    const animState = this.state === 'running' ? 'running' :
                      (this.state === 'walking' || this.state === 'approaching_npc' || this.state === 'approaching_animal') ? 'walking' :
                      'idle';

    if (this.group.userData._charModel) {
      this.group.userData._charModel.userData._animState = animState;
      animateCharacter(this.group, delta);
    }

    // Ground height (simple for now)
    this.group.position.y = 0;
  }
}

export function initRoamingNPCs(scene, animalSystem = null) {
  _scene = scene;
  _animalSystem = animalSystem;

  NPCS.forEach(config => {
    const npc = new RoamingNPC(config.type, config.name, config.startPos, scene);
    _npcs.push(npc);
  });

  console.log(`[RoamingNPCs] Initialized ${_npcs.length} roaming NPCs`);
}

export function updateRoamingNPCs(delta) {
  _npcs.forEach(npc => npc.update(delta));
}

export function getRoamingNPCs() {
  return _npcs;
}
