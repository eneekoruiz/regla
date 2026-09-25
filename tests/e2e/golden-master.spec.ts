import { test, expect, type Page } from '@playwright/test';
import { seedAccount, checkAccessibility } from './helpers';

async function assertFixedViewport(page: Page) {
  const dimensions = await page.evaluate(() => ['html', 'body', '#root', '.aura-app', 'main'].map(selector => {
    const element = document.querySelector<HTMLElement>(selector)!;
    return { selector, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
  }));
  for (const size of dimensions) {
    expect(size.scrollWidth, `${size.selector}: cero scroll horizontal`).toBeLessThanOrEqual(size.clientWidth + 1);
    expect(size.scrollHeight, `${size.selector}: cero scroll vertical`).toBeLessThanOrEqual(size.clientHeight + 1);
  }
}

async function assertStableRing(page: Page) {
  const ring = page.locator('.cycle-dial-box').first();
  await expect(ring).toBeVisible();
  await page.waitForTimeout(500);
  const samples = await page.evaluate(async () => {
    const values: number[][] = [];
    for (let index = 0; index < 12; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const rect = document.querySelector<HTMLElement>('.cycle-dial-box')!.getBoundingClientRect();
      values.push([rect.x, rect.y, rect.width, rect.height]);
    }
    return values;
  });
  expect(samples[0][2]).toBeGreaterThan(0);
  expect(samples[0][2]).toBeCloseTo(samples[0][3], 1);
  for (const sample of samples) {
    sample.forEach((value, index) => expect(Math.abs(value - samples[0][index])).toBeLessThanOrEqual(1));
  }
}

test('Golden Master: diario fijo, controles alcanzables y gota estable', async ({ page }, info) => {
  await seedAccount(page);
  await assertFixedViewport(page);
  await assertStableRing(page);
  for (const name of ['Registro de sangrado', 'Síntomas y notas', 'Intimidad', 'Pastillas']) {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    await button.click({ trial: true });
  }
  await checkAccessibility(page, info, 'golden-master-diary');
});

test('Golden Master: compacto 320×568 conserva el diario dentro del viewport', async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 1440, 'El tamaño extremo se audita una vez.');
  await seedAccount(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await assertFixedViewport(page);
  await assertStableRing(page);
  await expect(page.getByRole('button', { name: 'Síntomas y notas', exact: true })).toBeVisible();
});
