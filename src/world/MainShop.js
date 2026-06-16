import * as THREE from 'three';

// Helper functions for building primitives
const M = (c, r=0.7, m=0.05) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});

function B(w,h,d,mat) {
  const x = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  x.castShadow = true;
  return x;
}

function S(r,mat) {
  const x = new THREE.Mesh(new THREE.SphereGeometry(r,10,10), mat);
  x.castShadow = true;
  return x;
}

// State
let _npcGroup = null;
let _nameTag = null;
let _camera = null;
let _playerGroup = null;
let _animTime = 0;
let _interactionLabel = null;

// Position near plaza - open spot that doesn't conflict with benches or paths
// Plaza center is (0,0), benches are at ±31, ±39
// Placing shopkeeper at a visible spot: slightly offset from center
const SHOPKEEPER_POS = { x: -20, y: 0, z: 25 };

/**
 * Initialize the main shop NPC
 */
export function initMainShop(scene, camera, playerGroup) {
  _camera = camera;
  _playerGroup = playerGroup;

  // Build shopkeeper NPC from primitives
  _npcGroup = buildShopkeeper();
  _npcGroup.position.set(SHOPKEEPER_POS.x, SHOPKEEPER_POS.y, SHOPKEEPER_POS.z);

  // Add collider so player can't walk through
  _npcGroup.userData.collider = true;
  _npcGroup.userData.radius = 1.0;

  scene.add(_npcGroup);

  // Create floating name tag
  _createNameTag();

  // Create interaction label (for desktop "Press E")
  _createInteractionLabel();

  // Setup mobile tap interaction
  _setupMobileInteraction(camera);

  console.log('[MainShop] Shopkeeper initialized at', SHOPKEEPER_POS);
}

/**
 * Build shopkeeper NPC from Three.js primitives
 */
function buildShopkeeper() {
  const group = new THREE.Group();

  const skinMat = M('#FFCC99');
  const shirtMat = M('#4A90E2');
  const pantsMat = M('#333');
  const shoesMat = M('#5D4037');
  const apronMat = M('#2E7D32'); // Green apron

  // Body - torso
  const torso = B(0.9, 0.9, 0.5, shirtMat);
  torso.position.set(0, 1.62, 0);
  group.add(torso);

  // Green apron (extra box in front)
  const apron = B(0.88, 0.85, 0.12, apronMat);
  apron.position.set(0, 1.60, 0.32);
  group.add(apron);

  // Head - sphere
  const head = S(0.39, skinMat);
  head.position.set(0, 2.42, 0);
  group.add(head);

  // Eyes
  const eyeL = B(0.09, 0.09, 0.06, M('#111'));
  eyeL.position.set(-0.14, 2.47, 0.35);
  group.add(eyeL);

  const eyeR = B(0.09, 0.09, 0.06, M('#111'));
  eyeR.position.set(0.14, 2.47, 0.35);
  group.add(eyeR);

  // Smile
  const smile = B(0.22, 0.05, 0.04, M('#8B4513'));
  smile.position.set(0, 2.25, 0.37);
  smile.rotation.z = 0.1;
  group.add(smile);

  // Left arm
  const lArm = B(0.28, 0.8, 0.28, shirtMat);
  lArm.position.set(-0.65, 1.5, 0);
  group.add(lArm);

  // Right arm
  const rArm = B(0.28, 0.8, 0.28, shirtMat);
  rArm.position.set(0.65, 1.5, 0);
  group.add(rArm);

  // Hands
  const lHand = B(0.24, 0.3, 0.22, skinMat);
  lHand.position.set(-0.65, 1.0, 0);
  group.add(lHand);

  const rHand = B(0.24, 0.3, 0.22, skinMat);
  rHand.position.set(0.65, 1.0, 0);
  group.add(rHand);

  // Legs
  const lLeg = B(0.33, 1.0, 0.33, pantsMat);
  lLeg.position.set(-0.22, 0.6, 0);
  group.add(lLeg);

  const rLeg = B(0.33, 1.0, 0.33, pantsMat);
  rLeg.position.set(0.22, 0.6, 0);
  group.add(rLeg);

  // Shoes
  const lShoe = B(0.35, 0.16, 0.5, shoesMat);
  lShoe.position.set(-0.22, 0.08, 0.05);
  group.add(lShoe);

  const rShoe = B(0.35, 0.16, 0.5, shoesMat);
  rShoe.position.set(0.22, 0.08, 0.05);
  group.add(rShoe);

  return group;
}

/**
 * Create floating name tag HTML element
 */
function _createNameTag() {
  _nameTag = document.createElement('div');
  _nameTag.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Segoe UI', Arial, sans-serif;
    pointer-events: none;
    z-index: 100;
    white-space: nowrap;
    transform: translate(-50%, -100%);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  `;
  _nameTag.textContent = '🏪 חנות ראשית';
  _nameTag.style.display = 'none';
  document.body.appendChild(_nameTag);
}

/**
 * Create interaction label for desktop
 */
function _createInteractionLabel() {
  _interactionLabel = document.createElement('div');
  _interactionLabel.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Segoe UI', Arial, sans-serif;
    pointer-events: none;
    z-index: 100;
    white-space: nowrap;
    transform: translate(-50%, -150%);
    border: 1px solid rgba(76, 175, 80, 0.5);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
  `;
  _interactionLabel.innerHTML = '<span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; margin-left: 6px; font-size: 12px;">E</span> לחץ E לפתיחת חנות';
  _interactionLabel.style.display = 'none';
  document.body.appendChild(_interactionLabel);

  // Listen for E key
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && _interactionLabel.style.display === 'block') {
      e.preventDefault();
      _openShop();
    }
  });
}

/**
 * Setup mobile tap interaction using raycaster
 */
function _setupMobileInteraction(camera) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const onTouch = (event) => {
    event.preventDefault();

    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) return;

    // Convert to normalized device coordinates
    pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    if (_npcGroup) {
      const intersects = raycaster.intersectObjects(_npcGroup.children, true);
      if (intersects.length > 0) {
        _openShop();
      }
    }
  };

  window.addEventListener('touchstart', onTouch, { passive: false });
}

/**
 * Open the main shop
 */
function _openShop() {
  console.log('[MainShop] Opening shop');
  if (window.openMainShop) {
    window.openMainShop();
  } else {
    console.warn('[MainShop] window.openMainShop() not implemented yet');
  }
}

/**
 * Update shopkeeper every frame
 */
export function updateMainShop(delta) {
  if (!_npcGroup || !_camera) return;

  _animTime += delta;

  // Gentle idle animation
  // Slow Y-axis rotation (full spin every 8 seconds)
  _npcGroup.rotation.y = (_animTime * Math.PI * 2) / 8;

  // Slight up/down bob
  const bobAmount = Math.sin(_animTime * 2) * 0.05;
  _npcGroup.position.y = SHOPKEEPER_POS.y + bobAmount;

  // Update name tag position
  _updateNameTag();

  // Update interaction label (desktop only)
  _updateInteractionLabel();
}

/**
 * Update name tag position to follow NPC head
 */
function _updateNameTag() {
  if (!_nameTag || !_npcGroup || !_camera) return;

  // Position above NPC head
  const headPos = new THREE.Vector3(
    _npcGroup.position.x,
    _npcGroup.position.y + 3.2, // Above head
    _npcGroup.position.z
  );

  // Project to screen space
  const screenPos = headPos.clone().project(_camera);

  // Check if behind camera
  if (screenPos.z > 1) {
    _nameTag.style.display = 'none';
    return;
  }

  // Convert to pixel coordinates
  const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

  _nameTag.style.left = `${x}px`;
  _nameTag.style.top = `${y}px`;
  _nameTag.style.display = 'block';
}

/**
 * Update interaction label (show when player is within 4 units)
 */
function _updateInteractionLabel() {
  if (!_interactionLabel || !_npcGroup || !_playerGroup || !_camera) return;

  // Calculate distance to player
  const playerPos = _playerGroup.position;
  const npcPos = _npcGroup.position;
  const dx = playerPos.x - npcPos.x;
  const dz = playerPos.z - npcPos.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  // Show label if within 4 units
  if (distance < 4) {
    // Position above name tag
    const labelPos = new THREE.Vector3(
      _npcGroup.position.x,
      _npcGroup.position.y + 3.8, // Above name tag
      _npcGroup.position.z
    );

    const screenPos = labelPos.clone().project(_camera);

    // Check if behind camera
    if (screenPos.z > 1) {
      _interactionLabel.style.display = 'none';
      return;
    }

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    _interactionLabel.style.left = `${x}px`;
    _interactionLabel.style.top = `${y}px`;
    _interactionLabel.style.display = 'block';
  } else {
    _interactionLabel.style.display = 'none';
  }
}
