import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const errors = [];
const logs = [];

page.on('console', msg => {
  logs.push(`${msg.type()}: ${msg.text()}`);
  console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
});

page.on('pageerror', error => {
  errors.push(error.message);
  console.log(`PAGE ERROR: ${error.message}`);
});

console.log('Navigating to http://localhost:5173...');
await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

console.log('Waiting 5 seconds for the game to load...');
await page.waitForTimeout(5000);

console.log('Taking screenshot...');
await page.screenshot({ path: 'game-screenshot.png' });

console.log('\n=== ERRORS ===');
console.log(errors.length > 0 ? errors.join('\n') : 'No errors');

console.log('\n=== CONSOLE LOGS (last 20) ===');
console.log(logs.slice(-20).join('\n'));

await browser.close();
