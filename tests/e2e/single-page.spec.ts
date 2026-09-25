import { test, expect } from '@playwright/test';
import { seedLocal, checkAccessibility, checkLayout, capture, readLogs } from './helpers';

test('una sola pantalla: diario sin errores, síntomas que persisten, pregunta de la gota y navegación', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedLocal(page);
  // Con una pregunta pendiente, el diario cabe entero en la pantalla.
  await expect(page.locator('.cycle-dial-box')).toBeVisible();
  await checkLayout(page);
  await checkAccessibility(page, info, 'single-page');
  await capture(page, info, 'single-page');
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollHeight, height: innerHeight }));
  expect(dimensions.scroll).toBe(dimensions.height);

  // Los síntomas se añaden desde el registro de hoy y siguen ahí tras recargar.
  await page.getByRole('button', { name: 'Síntomas y notas', exact: true }).click();
  const daily = page.getByRole('dialog', { name: '¿Cómo estás hoy?' });
  await daily.getByRole('button', { name: 'Cólicos', exact: true }).click();
  await checkAccessibility(page, info, 'sintomas');
  await daily.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(daily).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(Object.values(await readLogs(page)).some((log: any) => log.symptoms.length >= 2)).toBe(true);

  // La pregunta de la gota abre su ventana, que se cierra con Escape.
  await page.getByRole('button', { name: /^¿Y ayer\?/ }).click();
  await expect(page.getByRole('dialog', { name: 'Ayer quedó sin registrar.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Se cambia de vista sin salir de la página.
  await page.getByRole('button', { name: 'Calendario', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Calendario del ciclo' })).toBeVisible();
  await checkLayout(page);
  await page.getByRole('button', { name: 'Mi diario', exact: true }).click();
  await expect(page.getByLabel('Fecha del registro')).toBeVisible();

  // El tema lo decide la app (claro), aunque el sistema esté en oscuro.
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');
  expect(errors).toEqual([]);
});
