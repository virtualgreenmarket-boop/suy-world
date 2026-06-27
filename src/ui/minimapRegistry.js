// Central registry for all minimap entities
// Allows any system to register objects that should appear on the minimap

const _entities = new Map(); // id -> { type, getPosition, metadata }

/**
 * Register an entity to appear on the minimap
 * @param {string} id - Unique identifier
 * @param {string} type - Entity type: 'player', 'npc', 'tree', 'building', 'zone'
 * @param {Function} getPosition - Function that returns {x, z} position
 * @param {Object} metadata - Optional metadata (name, size, etc.)
 */
export function registerMapEntity(id, type, getPosition, metadata = {}) {
  _entities.set(id, { type, getPosition, metadata });
}

/**
 * Unregister an entity from the minimap
 * @param {string} id - Entity identifier
 */
export function unregisterMapEntity(id) {
  _entities.delete(id);
}

/**
 * Get all registered entities
 * @returns {Array} Array of { id, type, position: {x, z}, metadata }
 */
export function getAllMapEntities() {
  const result = [];
  _entities.forEach((entity, id) => {
    try {
      const pos = entity.getPosition();
      if (pos && typeof pos.x === 'number' && typeof pos.z === 'number') {
        result.push({
          id,
          type: entity.type,
          position: pos,
          metadata: entity.metadata
        });
      }
    } catch (e) {
      console.warn(`[minimap] Failed to get position for entity ${id}:`, e);
    }
  });
  return result;
}

/**
 * Clear all entities (useful for cleanup)
 */
export function clearAllMapEntities() {
  _entities.clear();
}
