import { test, expect } from '@playwright/test';
import { capture, checkAccessibility, checkLayout, enterAccount, seedAccount } from './helpers';

test('acceso con cuenta y estado inicial sin datos inventados', async ({ page }, info) => {
  await enterAccount(page);
  await expect(page.getByRole('button', { name: /modo privado local/i })).toHaveCount(0);
  await checkLayout(page);
  await checkAccessibility(page, info, 'acceso-cuenta');
  await capture(page, info, 'acceso-cuenta');
  await expect(page.getByRole('heading', { name: 'Tu primer registro' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cada observación cuenta' })).toBeVisible();
  await checkLayout(page);
  await checkAccessibility(page, info, 'diario-vacio');
});

test('enlace de recuperación abre una contraseña nueva sin mostrar datos de la cuenta', async ({ page }, info) => {
  await page.goto('/?reset=' + 'A'.repeat(43));
  await expect(page.getByRole('heading', { name: 'Elige una nueva contraseña' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Contraseña', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Repite la contraseña', exact: true })).toBeVisible();
  await checkLayout(page);
  await checkAccessibility(page, info, 'recuperacion');
});

test('diario y navegación, contraste claro y oscuro', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await seedAccount(page);
  for (const theme of ['claro', 'oscuro']) {
    for (const view of ['Mi diario', 'Calendario', 'Herramientas']) {
      await page.getByRole('button', { name: view, exact: true }).click();
      await expect(page.getByRole('heading', { name: view, exact: true })).toBeVisible();
      await page.getByText('Cargando…', { exact: true }).waitFor({ state: 'hidden' });
      await checkLayout(page);
      await checkAccessibility(page, info, `${view}-${theme}`);
      await capture(page, info, `${view}-${theme}`);
    }
    if (theme === 'claro') await page.getByRole('button', { name: 'Activar tema oscuro' }).click();
  }
  expect(errors).toEqual([]);
});

for (const theme of ['claro', 'oscuro']) test(`catálogo ${theme} accesible, sin recortes y con cierre por teclado`, async ({ page }, info) => {
  test.setTimeout(300_000);
  await seedAccount(page);
  if (theme === 'oscuro') await page.getByRole('button', { name: 'Activar tema oscuro' }).click();
  await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
  const cards = page.locator('.tool-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(9);
  for (let index = 0; index < count; index++) {
    const name = await cards.nth(index).locator('strong').innerText();
    await cards.nth(index).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await checkLayout(page);
    await checkAccessibility(page, info, name);
    await capture(page, info, `tool-${index}`);
    await dialog.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await checkAccessibility(page, info, `${name}-final`);
    await capture(page, info, `tool-${index}-final`);
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement)), 'Foco dentro del diálogo').toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(cards.nth(index)).toBeFocused();
  }
});
