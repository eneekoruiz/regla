import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const folder = 'artifacts/visual';
await fs.mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const qaUser = { id: 'qa-isolated', email: 'qa@example.invalid' };
const qaToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';
const today = new Date();
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3);
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 }, narrow: { width: 320, height: 740 } })) {
    const context = await browser.newContext({ viewport, colorScheme: 'light', reducedMotion: 'reduce' });
    await context.addInitScript(({ user, token, settings, logs }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('cached_user', JSON.stringify(user));
      localStorage.setItem(`regla_user_settings_v1:${encodeURIComponent(user.id)}`, JSON.stringify(settings));
      localStorage.setItem(`regla_daily_logs_v1:${encodeURIComponent(user.id)}`, JSON.stringify(logs));
    }, {
      user: qaUser,
      token: qaToken,
      settings: { userName: 'Alex', averageCycleLength: 28, averagePeriodLength: 5, lutealPhaseLength: 14, lastPeriodStartDate: key(start), theme: 'light' },
      logs: { [key(start)]: { date: key(start), isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [], recordedAt: start.toISOString() } }
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.AURA_URL || 'http://127.0.0.1:5173/');
    await page.getByRole('button', { name: /modo privado local/i }).waitFor({ state: 'detached' });
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
