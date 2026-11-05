import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  console.log('[Screenshots] Launching Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('[Screenshots] Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for animations and fonts to settle
    await new Promise((r) => setTimeout(r, 2000));

    // 1. Hero Landing Page
    const heroPath = path.join(OUTPUT_DIR, '01-hero-landing.png');
    await page.screenshot({ path: heroPath, fullPage: false });
    console.log(`[Screenshots] Saved ${heroPath}`);

    // 2. Focused Input State with Sample URL
    const inputSelector = 'input[placeholder*="Paste"], input[type="url"], input[type="text"]';
    const inputEl = await page.$(inputSelector);
    if (inputEl) {
      await inputEl.click();
      await inputEl.type('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { delay: 15 });
      await new Promise((r) => setTimeout(r, 1000));
    }
    const inputPath = path.join(OUTPUT_DIR, '02-url-input.png');
    await page.screenshot({ path: inputPath, fullPage: false });
    console.log(`[Screenshots] Saved ${inputPath}`);

    // 3. Batch Modal
    const buttons = await page.$$('button');
    let batchClicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('batch')) {
        await btn.click();
        batchClicked = true;
        await new Promise((r) => setTimeout(r, 1000));
        break;
      }
    }

    if (!batchClicked) {
      // Look for button with batch svg/title
      const batchBtn = await page.$('button[title*="Batch"], button[aria-label*="Batch"]');
      if (batchBtn) {
        await batchBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const modalPath = path.join(OUTPUT_DIR, '03-batch-export.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log(`[Screenshots] Saved ${modalPath}`);

    console.log('[Screenshots] All screenshots captured successfully in 1920x1080!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('[Screenshots Error]', err);
  process.exit(1);
});
