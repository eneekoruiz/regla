import { expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const qaUser = { id: 'qa-isolated', email: 'qa@example.invalid' };
const qaToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';
const logsKey = `regla_daily_logs_v1:${encodeURIComponent(qaUser.id)}`;
const settingsKey = `regla_user_settings_v1:${encodeURIComponent(qaUser.id)}`;

async function mockAccountApi(page: Page) {
  await page.route('**/api/auth/login', async route => route.fulfill({ json: { token: qaToken, user: qaUser } }));
  await page.route('**/api/auth/signup', async route => route.fulfill({ status: 201, json: { token: qaToken, user: qaUser } }));
  await page.route('**/api/auth/me', async route => route.fulfill({ json: { user: qaUser } }));
  await page.route('**/api/settings', async route => {
    const method = route.request().method();
    if (method === 'POST') return route.fulfill({ json: { ok: true } });
    return route.fulfill({ json: {} });
  });
  await page.route('**/api/logs', async route => route.fulfill({ json: [] }));
  await page.route('**/api/logs/bulk', async route => route.fulfill({ json: { ok: true } }));
}

export async function enterAccount(page: Page) {
  await mockAccountApi(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /modo privado local/i })).toHaveCount(0);
  await page.getByLabel('Correo electrónico').fill(qaUser.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill('test-password-1234');
  await page.getByRole('button', { name: /^Iniciar sesión$/i }).click();
  await expect(page.getByLabel('Fecha del registro')).toBeVisible();
}

export async function seedAccount(page: Page) {
  await mockAccountApi(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('qa-initialized')) return;
    const user = { id: 'qa-isolated', email: 'qa@example.invalid' };
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';
    const logsKey = `regla_daily_logs_v1:${encodeURIComponent(user.id)}`;
    const settingsKey = `regla_user_settings_v1:${encodeURIComponent(user.id)}`;
    const today = new Date();
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3);
    localStorage.setItem('token', token);
    localStorage.setItem('cached_user', JSON.stringify(user));
    localStorage.setItem(settingsKey, JSON.stringify({ userName: 'Alex', averageCycleLength: 28, averagePeriodLength: 5, lutealPhaseLength: 14, lastPeriodStartDate: key(start), theme: 'light' }));
    localStorage.setItem(logsKey, JSON.stringify({ [key(start)]: { date: key(start), isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [], recordedAt: start.toISOString() } }));
    localStorage.setItem('qa-initialized', 'true');
  });
  await page.goto('/');
  await expect(page.getByLabel('Fecha del registro')).toBeVisible();
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
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), logsKey);
}

export async function readSettings(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), settingsKey);
}
