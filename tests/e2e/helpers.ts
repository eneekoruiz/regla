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

export async function openSettings(page: Page, tab?: 'Mi ciclo' | 'Cuenta' | 'Privacidad' | 'Alertas') {
  await page.getByRole('button', { name: /Ajustes de la aplicación|Ajustes/ }).click();
  await expect(page.getByRole('region', { name: 'Ajustes de la aplicación' })).toBeVisible();
  if (tab) {
    await page.getByRole('button', { name: tab, exact: true }).click();
  }
}

export async function openTools(page: Page) {
  await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Conoce tu ciclo' })).toBeVisible();
}

export async function setTheme(page: Page, theme: 'light' | 'dark') {
  await openSettings(page, 'Privacidad');
  await page.getByRole('combobox', { name: 'Apariencia', exact: true }).selectOption(theme);
  await expect.poll(() => page.locator('html').evaluate(el => el.classList.contains('dark'))).toBe(theme === 'dark');
}

export async function openToolGroup(page: Page, title: 'Conoce tu ciclo' | 'Cuídate a tu manera' | 'Cuestionarios de bienestar') {
  await openTools(page);
  const group = page.getByRole('region', { name: title });
  const heading = group.getByRole('button').first();
  if (await heading.getAttribute('aria-expanded') !== 'true') {
    await heading.click();
  }
  return group;
}

export async function openTool(page: Page, name: RegExp) {
  if (name.test('Importar registros') || name.test('Importar datos')) {
    await openSettings(page, 'Privacidad');
    await page.getByRole('button', { name: 'Importar datos', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    return;
  }

  if (name.test('Informe de salud')) {
    await openSettings(page, 'Privacidad');
    await page.getByRole('button', { name: 'Informe de salud para consulta médica', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    return;
  }

  for (const title of ['Conoce tu ciclo', 'Cuídate a tu manera', 'Cuestionarios de bienestar'] as const) {
    const group = await openToolGroup(page, title);
    const trigger = group.getByRole('button', { name }).first();
    if (await trigger.count()) {
      if (title === 'Cuestionarios de bienestar') {
        await trigger.click();
        await expect(page.getByRole('dialog', { name: 'Chat' })).toBeVisible();
        await page.getByRole('button', { name: 'Abrir chequeo nuevo', exact: true }).click();
      } else {
        await trigger.click();
      }
      await expect(page.getByRole('dialog')).toBeVisible();
      return;
    }
  }

  throw new Error(`No se encontró la herramienta ${name}`);
}

export async function readLogs(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), logsKey);
}

export async function readSettings(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), settingsKey);
}
