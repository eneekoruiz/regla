import { test, expect } from '@playwright/test';
import { enterLocal, openTool, readLogs } from './helpers';

test('sangrado se guarda en la fecha elegida, persiste y se puede corregir', async ({ page }) => {
  await enterLocal(page);
  await page.getByLabel('Fecha del registro').fill('2026-08-12');
  await page.getByRole('button', { name: 'Registrar regla', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, hubo sangrado' }).click();
  await page.getByLabel('Es el primer día de un nuevo ciclo').check();
  await page.getByRole('button', { name: 'Abundante', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await readLogs(page))['2026-08-12']).toMatchObject({ date: '2026-08-12', isPeriod: true, isCycleStart: true, flow: 'heavy' });
  await page.reload();
  await page.getByLabel('Fecha del registro').fill('2026-08-12');
  await page.getByRole('button', { name: 'Editar regla', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abundante', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Quitar', exact: true }).click();
  await page.reload();
  expect((await readLogs(page))['2026-08-12']?.isPeriod).toBeFalsy();
});

test('temperatura valida decimales, persiste y permite borrar', async ({ page }) => {
  await enterLocal(page);
  await page.getByLabel('Fecha del registro').fill('2026-08-12');
  await openTool(page, /^Temperatura y moco/);
  await page.getByLabel('Temperatura basal (°C)').fill('abc');
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.getByRole('alert')).toContainText('temperatura');
  await page.getByLabel('Temperatura basal (°C)').fill('36,55');
  await page.getByRole('button', { name: /^Cremoso/ }).click();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  expect((await readLogs(page))['2026-08-12']).toMatchObject({ bbt: 36.55, cervicalMucus: 'creamy' });
  await openTool(page, /^Temperatura y moco/);
  await expect(page.getByLabel('Temperatura basal (°C)')).toHaveValue('36.55');
  await page.getByLabel('Temperatura basal (°C)').fill('');
  await page.getByRole('button', { name: /^Cremoso/ }).click();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  const log = (await readLogs(page))['2026-08-12'];
  expect(log.bbt).toBeUndefined();
  expect(log.cervicalMucus).toBeUndefined();
});

test('medicación conserva nombre, dosis, hora y toma después de recargar', async ({ page }) => {
  await enterLocal(page);
  await openTool(page, /^Medicación/);
  await page.getByRole('button', { name: 'Añadir toma', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('nombre');
  await page.getByLabel('Nombre', { exact: true }).fill('Registro de prueba');
  await page.getByLabel('Dosis (opcional)').fill('1 unidad');
  await page.getByLabel('Hora (opcional)').fill('09:30');
  await page.getByRole('button', { name: 'Añadir toma', exact: true }).click();
  await page.getByRole('checkbox', { name: /Registro de prueba/ }).check();
  await page.getByRole('button', { name: 'Guardar tomas' }).click();
  await page.reload();
  await openTool(page, /^Medicación/);
  await expect(page.getByRole('checkbox', { name: /Registro de prueba/ })).toBeChecked();
  expect(Object.values(await readLogs(page)).some((log: any) => log.medications?.some((item: any) => item.name === 'Registro de prueba' && item.dose === '1 unidad' && item.time === '09:30' && item.taken))).toBe(true);
});
