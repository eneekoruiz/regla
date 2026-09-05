import { chromium } from '@playwright/test';

const browser = await chromium.launch();
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:#176b5d"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}"><text x="244" y="360" text-anchor="middle" font-family="Georgia,serif" font-size="368" font-style="italic" fill="#fff">a</text></svg></body></html>`);
    await page.screenshot({ path: `public/icon-${size}.png` });
    await page.close();
  }
} finally { await browser.close(); }
