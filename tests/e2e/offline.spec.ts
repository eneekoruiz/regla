import { test, expect } from '@playwright/test';
import { seedLocal, readLogs, checkLayout, capture } from './helpers';

test('arranque en frío sin red y catálogo completo de herramientas', async ({ page, context }, info) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await seedLocal(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  // No tool has been opened: every lazy-loaded view must already be available offline.
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible();
  await page.reload();
  expect(await page.evaluate(async () => {
    try { await fetch('/offline-network-probe.txt', { cache: 'no-store' }); return false; }
    catch { return true; }
  }), 'Una petición no almacenada debe fallar realmente sin red').toBe(true);
  // Playwright 1.62 resets navigator.onLine after navigation: microsoft/playwright#42174.
  // Restore only the browser status; context network blocking remains enabled throughout.
  const network = await context.newCDPSession(page);
  await network.send('Network.overrideNetworkState', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await expect(page.getByRole('heading', { name: 'Mi diario', exact: true })).toBeVisible();
  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente consejo' }).click();
  await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
  const cards = page.locator('.tool-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(9);
  for (let index = 0; index < count; index++) {
    await cards.nth(index).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toContainText('No pudimos abrir');
    await checkLayout(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.locator('.tool-card').filter({ hasText: /^Temperatura y moco/ }).click();
  await page.getByLabel('Temperatura basal (°C)').fill('36.61');
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await page.reload();
  expect(Object.values(await readLogs(page)).some((log: any) => log.bbt === 36.61)).toBe(true);
  await page.getByRole('button', { name: 'Calendario', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Calendario del ciclo' })).toBeVisible();
  await page.getByText('Cargando…', { exact: true }).waitFor({ state: 'hidden' });
  await capture(page, info, 'offline-calendar');
  expect(errors).toEqual([]);
});
