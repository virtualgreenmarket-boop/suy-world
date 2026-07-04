/**
 * Live Map Performance Testing Script
 *
 * USAGE:
 * 1. Start the game in development mode
 * 2. Open browser DevTools console
 * 3. Copy-paste this entire script into the console
 * 4. Call testMapPerformance(playerCount) with different counts
 *
 * TESTS:
 * - testMapPerformance(0)   // Solo test
 * - testMapPerformance(10)  // Small group
 * - testMapPerformance(50)  // Large group
 * - testMapPerformance(100) // Stress test (should cull to 50)
 */

window.testMapPerformance = function(playerCount) {
  console.log(`\n=== Testing Live Map with ${playerCount} fake players ===\n`);

  // Generate fake remote players scattered around the map
  const fakeRemotePlayers = Array.from({ length: playerCount }, (_, i) => ({
    id: `test-player-${i}`,
    x: (Math.random() - 0.5) * 400,  // -200 to +200
    z: (Math.random() - 0.5) * 400
  }));

  console.log(`Generated ${fakeRemotePlayers.length} fake players`);
  console.log('Players will be visible on the live map');
  console.log('Check console for performance warnings (avg >4ms)');
  console.log('\nTo stop test: testMapPerformance.stop()');

  // Store original function
  if (!window._originalGetRemotePlayersData) {
    window._originalGetRemotePlayersData = window.getRemotePlayersData;
  }

  // Override getRemotePlayersData to return fake data
  window.getRemotePlayersData = function() {
    return fakeRemotePlayers;
  };

  // Store cleanup function
  testMapPerformance.stop = function() {
    console.log('\n=== Stopping performance test ===\n');
    if (window._originalGetRemotePlayersData) {
      window.getRemotePlayersData = window._originalGetRemotePlayersData;
      window._originalGetRemotePlayersData = null;
    }
    console.log('Restored normal player data');
  };
};

console.log('Performance test script loaded!');
console.log('Usage: testMapPerformance(0|10|50|100)');
