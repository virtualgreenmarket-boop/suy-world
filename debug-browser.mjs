import puppeteer from 'puppeteer';

console.log('Launching browser...');
const browser = await puppeteer.launch({
  headless: false,
  devtools: true
});

const page = await browser.newPage();

// Capture all console messages
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  console.log(`[BROWSER ${type.toUpperCase()}]:`, text);
});

// Capture errors
page.on('pageerror', error => {
  console.log('[BROWSER ERROR]:', error.message);
});

// Capture failed requests
page.on('requestfailed', request => {
  console.log('[REQUEST FAILED]:', request.url());
});

console.log('Navigating to http://localhost:5173...');
await page.goto('http://localhost:5173', {
  waitUntil: 'networkidle2',
  timeout: 10000
});

console.log('\nWaiting 10 seconds to see what happens...\n');
await new Promise(resolve => setTimeout(resolve, 10000));

console.log('\n=== Taking screenshot ===');
await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
console.log('Screenshot saved to debug-screenshot.png');

// Don't close - keep browser open for inspection
console.log('\nBrowser is open - press Ctrl+C to close');
