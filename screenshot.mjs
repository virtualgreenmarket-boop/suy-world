import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const chromePath = 'C:/Users/תום/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const url = 'http://localhost:5176';
const screenshotPath = 'island-expanded.png';

const cmd = `"${chromePath}" --headless=new --screenshot="${screenshotPath}" --window-size=1920,1080 --hide-scrollbars "${url}"`;

try {
  await execAsync(cmd);
  console.log(`Screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('Error taking screenshot:', err);
  process.exit(1);
}
