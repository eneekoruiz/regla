import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const folder = 'artifacts/visual';
await fs.mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 }, narrow: { width: 320, height: 740 } })) {
    const context = await browser.newContext({ viewport, colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.AURA_URL || 'http://127.0.0.1:5173/');
    await page.getByRole('button', { name: /modo privado local/i }).waitFor();
    await page.screenshot({ path: `${folder}/${name}-auth.png`, fullPage: true });
    await page.getByRole('button', { name: /modo privado local/i }).click();
    await page.getByRole('heading', { name: 'Mi diario', exact: true }).waitFor();
    await page.screenshot({ path: `${folder}/${name}-diary.png`, fullPage: true });
    await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
    await page.screenshot({ path: `${folder}/${name}-tools.png`, fullPage: true });
    await page.getByRole('button', { name: 'Calendario', exact: true }).click();
    await page.getByRole('region', { name: 'Calendario del ciclo' }).waitFor();
    await page.getByText('Cargando…', { exact: true }).waitFor({ state: 'hidden' });
    await page.screenshot({ path: `${folder}/${name}-calendar.png`, fullPage: true });
    console.log(name, await page.locator('body').innerText());
    await context.close();
  }
  console.log('Browser errors:', JSON.stringify(errors));
} finally { await browser.close(); }
