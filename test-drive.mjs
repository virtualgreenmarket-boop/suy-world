import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the game
  await page.goto('http://localhost:5173');

  // Wait for the page to load
  await page.waitForTimeout(2000);

  // Take a screenshot
  await page.screenshot({ path: 'game-running.png' });

  console.log('Screenshot saved to game-running.png');

  await browser.close();
})();
