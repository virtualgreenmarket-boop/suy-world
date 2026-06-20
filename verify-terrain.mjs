import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
  });

  try {
    await page.goto('http://localhost:5176', { timeout: 60000 });

    // Wait for the page to load and log any terrain-related info
    await page.waitForTimeout(8000);

    // Check if there are any errors
    const errors = logs.filter(log => log.toLowerCase().includes('error'));

    console.log('=== CONSOLE LOGS ===');
    logs.forEach(log => console.log(log));

    console.log('\n=== VERIFICATION ===');
    if (errors.length > 0) {
      console.log('❌ Errors found:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✓ No errors in console');
    }

    // Take a screenshot from in-game perspective
    await page.screenshot({ path: 'island-ingame.png' });
    console.log('✓ Screenshot saved: island-ingame.png');

  } catch (err) {
    console.error('❌ Error during verification:', err.message);
  } finally {
    await browser.close();
  }
})();
