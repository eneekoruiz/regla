import { test, expect } from '@playwright/test';
import { capture, checkAccessibility, checkLayout, enterAccount, openToolGroup, seedAccount, setTheme } from './helpers';

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
      if (view === 'Mi diario') await expect(page.getByLabel('Fecha del registro')).toBeVisible();
      else await expect(page.getByRole('region', { name: view === 'Calendario' ? 'Calendario del ciclo' : 'Conoce tu ciclo' })).toBeVisible();
      await page.getByText('Cargando…', { exact: true }).waitFor({ state: 'hidden' });
      await checkLayout(page);
      await checkAccessibility(page, info, `${view}-${theme}`);
      await capture(page, info, `${view}-${theme}`);
    }
    if (theme === 'claro') await setTheme(page, 'dark');
  }
  expect(errors).toEqual([]);
});

for (const theme of ['claro', 'oscuro']) test(`catálogo ${theme} accesible, sin recortes y con cierre por teclado`, async ({ page }, info) => {
  test.setTimeout(300_000);
  await seedAccount(page);
  if (theme === 'oscuro') await setTheme(page, 'dark');
  // Groups match the `ids` arrays in App.tsx's tools-workspace section — "Medicación"
  // and "Tendencias del ciclo" swapped groups at some point (App.tsx now puts
  // 'medication' under "Conoce tu ciclo" and 'analytics' under "Cuídate a tu manera"),
  // but this catalog was never updated to match, so every card lookup after the first
  // group timed out searching the wrong section.
  const catalog = [
    { group: 'Conoce tu ciclo' as const, tools: [/^Medicación/, /^Temperatura y moco/, /^Fases del ciclo/] },
    { group: 'Cuídate a tu manera' as const, tools: [/^Tendencias del ciclo/, /^Cuidados del ciclo/, /^Confidente/] }
  ];
  let index = 0;
  for (const section of catalog) {
    const group = await openToolGroup(page, section.group);
    for (const pattern of section.tools) {
      const card = group.locator('.tool-card').filter({ hasText: pattern }).first();
      const name = await card.locator('strong').innerText();
      await card.click();
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
      index++;
    }
  }
  // Quiz cards are `.quiz-card` (the card itself is the button — see App.tsx's
  // "Cuestionarios de bienestar" section), not `.tool-card` with a nested "Iniciar
  // en Confidente" button — that pattern belongs to the other two groups. Clicking
  // a quiz card opens the Chat dialog (aria-labelledby="chat-title" → "Chat"), same
  // as helpers.ts's openTool() already does correctly for this group.
  const quizGroup = await openToolGroup(page, 'Cuestionarios de bienestar');
  const quizCount = await quizGroup.locator('.quiz-card').count();
  expect(quizCount).toBeGreaterThanOrEqual(3);
  for (let quizIndex = 0; quizIndex < quizCount; quizIndex++) {
    const card = quizGroup.locator('.quiz-card').nth(quizIndex);
    const name = await card.locator('.quiz-card-title').innerText();
    await card.click();
    // ChatDrawer.tsx's dialog heading (id="chat-title") reads "Confidente", not "Chat".
    const dialog = page.getByRole('dialog', { name: 'Confidente' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Abrir chequeo nuevo', exact: true }).click();
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
    await openToolGroup(page, 'Cuestionarios de bienestar');
    index++;
  }
});
