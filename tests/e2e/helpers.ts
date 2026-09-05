import { expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function enterLocal(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /modo privado local/i }).click();
  await expect(page.getByRole('heading', { name: 'Mi diario', exact: true })).toBeVisible();
}

export async function seedLocal(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('qa-initialized')) return;
    const today = new Date();
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3);
    localStorage.setItem('token', 'local-qa');
    localStorage.setItem('cached_user', JSON.stringify({ id: 'qa-isolated', email: 'qa@local.test' }));
    localStorage.setItem('regla_user_settings_v1', JSON.stringify({ userName: 'Alex', averageCycleLength: 28, averagePeriodLength: 5, lutealPhaseLength: 14, lastPeriodStartDate: key(start), theme: 'light' }));
    localStorage.setItem('regla_daily_logs_v1', JSON.stringify({ [key(start)]: { date: key(start), isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [], recordedAt: start.toISOString() } }));
    localStorage.setItem('qa-initialized', 'true');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mi diario', exact: true })).toBeVisible();
}

export async function checkLayout(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll, 'La página no debe desbordar horizontalmente').toBeLessThanOrEqual(dimensions.width + 1);
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'El diálogo no debe recortar contenido horizontal').toBe(true);
  }
}

export async function checkAccessibility(page: Page, testInfo: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  if (result.violations.length) await testInfo.attach(`${name}-accessibility.json`, { body: JSON.stringify(result.violations, null, 2), contentType: 'application/json' });
  expect(result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), name).toEqual([]);
}

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  // Modal surfaces live in the viewport. Expanding the page for a screenshot can
  // resize a focused chat and invalidate its visual-viewport measurements.
  const hasDialog = await page.getByRole('dialog').count() > 0;
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: !hasDialog, animations: 'disabled', timeout: 15_000 });
}

export async function openTool(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
  await page.locator('.tool-card').filter({ hasText: name }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

export async function readLogs(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('regla_daily_logs_v1') || '{}'));
}
