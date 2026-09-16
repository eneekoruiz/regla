import { test, expect, type Page } from '@playwright/test';
import { seedLocal, readLogs, checkLayout, checkAccessibility, capture } from './helpers';

async function assertFixedViewport(page: Page) {
  const dimensions = await page.evaluate(() => ['html', 'body', '#root', '.aura-app', 'main'].map(selector => {
    const element = document.querySelector<HTMLElement>(selector)!;
    return { selector, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
  }));
  for (const size of dimensions) {
    expect(size.scrollHeight, `${size.selector}: cero scroll vertical`).toBe(size.clientHeight);
    expect(size.scrollWidth, `${size.selector}: cero scroll horizontal`).toBe(size.clientWidth);
  }
  await page.mouse.wheel(0, 600);
  expect(await page.evaluate(() => scrollY)).toBe(0);
}

async function assertUsableControls(page: Page) {
  const controls = page.locator('.studio-header button:visible, main button:visible');
  for (const control of await controls.all()) {
    // The date strip intentionally scrolls horizontally; its offscreen dates are not obscured controls.
    if (await control.evaluate(element => Boolean(element.closest('.timeline-strip')))) continue;
    const label = await control.getAttribute('aria-label') || await control.innerText();
    const geometry = await control.evaluate(element => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { inside: box.x >= 0 && box.y >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1, uncovered: hit !== null && element.contains(hit) };
    });
    expect(geometry.inside, `${label}: debe estar dentro de la pantalla`).toBe(true);
    expect(geometry.uncovered, `${label}: sin controles superpuestos`).toBe(true);
    await control.click({ trial: true });
  }
}

async function assertStableRing(page: Page) {
  const ring = page.locator('.orbit-svg');
  await expect(ring).toHaveAttribute('viewBox', '0 0 320 320');
  const samples = await page.evaluate(async () => {
    const samples: number[][] = [];
    for (let index = 0; index < 15; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const rect = document.querySelector('.orbit-svg')!.getBoundingClientRect();
      const actions = document.querySelector('.daily-actions')!.getBoundingClientRect();
      samples.push([rect.x, rect.y, rect.width, rect.height, actions.x, actions.y]);
    }
    return samples;
  });
  expect(samples[0][2]).toBeGreaterThan(0);
  expect(samples[0][2]).toBeCloseTo(samples[0][3], 1);
  for (const sample of samples) expect(sample).toEqual(samples[0]);
  const drop = page.locator('.countdown-drop');
  await expect(drop).toBeVisible();
  await expect(drop).toHaveAttribute('viewBox', /\d/);
}

test('Golden Master: pantalla fija, controles accesibles y SVG estables', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await seedLocal(page);
  await assertFixedViewport(page);
  await assertUsableControls(page);
  await assertStableRing(page);
  await checkAccessibility(page, info, 'golden-master');
  await capture(page, info, 'golden-master');
  for (const label of ['Calendario', 'Síntomas y notas', 'Herramientas']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await checkLayout(page);
    await assertFixedViewport(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('Golden Master: móvil pequeño y orientación horizontal', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Los tamaños extremos se auditan una vez.');
  await seedLocal(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await assertFixedViewport(page);
    await assertUsableControls(page);
    await assertStableRing(page);
    await capture(page, info, `golden-${viewport.width}x${viewport.height}`);
  }
});

async function seedGap(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('qa-initialized')) return;
    const start = new Date();
    start.setDate(start.getDate() - 60);
    const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    localStorage.setItem('token', 'local-qa');
    localStorage.setItem('cached_user', JSON.stringify({ id: 'qa-isolated', email: 'qa@local.test' }));
    localStorage.setItem('regla_user_settings_v1', JSON.stringify({ averageCycleLength: 28, averagePeriodLength: 5, lastPeriodStartDate: key(start), theme: 'light' }));
    localStorage.setItem('regla_daily_logs_v1', JSON.stringify({ [key(start)]: { date: key(start), isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [], recordedAt: start.toISOString() } }));
    localStorage.setItem('qa-initialized', 'true');
  });
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Volvamos a tu ritmo' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
}

test('Recuperación: confirmar fechas conserva el historial y persiste', async ({ page }, info) => {
  await seedGap(page);
  await assertFixedViewport(page);
  await checkLayout(page);
  await checkAccessibility(page, info, 'recuperacion');
  const original = await readLogs(page);
  await page.getByRole('button', { name: 'Sí, esas fechas', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Volvamos a tu ritmo' })).toHaveCount(0);
  const logs = await readLogs(page);
  expect(Object.keys(logs).length).toBeGreaterThan(Object.keys(original).length);
  for (const [date, log] of Object.entries(original)) expect(logs[date]).toEqual(log);
  expect(Object.values(logs).filter((log: any) => log.isCycleStart)).toHaveLength(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mi diario', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Volvamos a tu ritmo' })).toHaveCount(0);
  expect(await readLogs(page)).toEqual(logs);
});

test('Recuperación: ajustar fechas registra solamente los días elegidos', async ({ page }) => {
  await seedGap(page);
  await page.getByRole('button', { name: 'Fue un poco antes/después', exact: true }).click();
  const date = new Date();
  date.setDate(date.getDate() - 25);
  const key = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const start = key(date);
  date.setDate(date.getDate() + 3);
  const end = key(date);
  await page.getByLabel('Inicio de la regla', { exact: true }).fill(start);
  await page.getByLabel('Final de la regla', { exact: true }).fill(end);
  await page.getByRole('button', { name: 'Guardar fechas', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Volvamos a tu ritmo' })).toHaveCount(0);
  const logs = await readLogs(page);
  expect(logs[start].isCycleStart).toBe(true);
  expect(logs[end].isPeriod).toBe(true);
  expect(Object.keys(logs)).toHaveLength(5);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mi diario', exact: true })).toBeVisible();
  expect(await readLogs(page)).toEqual(logs);
});

test('Recuperación: saltar no inventa datos y deja paso al saludo diario', async ({ page }) => {
  await seedGap(page);
  const original = await readLogs(page);
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Volvamos a tu ritmo' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Hola, ¿has notado algún síntoma menstrual hoy?' })).toBeVisible();
  await page.getByRole('button', { name: 'Ahora no', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mi diario', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await readLogs(page)).toEqual(original);
});
