import { test, expect } from '@playwright/test';
import { seedAccount, checkLayout, checkAccessibility, capture } from './helpers';

test('registro claro: un síntoma aparece una vez, persiste y se puede quitar', async ({ page }, info) => {
  await seedAccount(page);
  await page.getByRole('button', { name: 'Síntomas y notas', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Síntomas y bienestar' });
  await dialog.getByRole('button', { name: 'Cólicos', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Eliminar Cólicos', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cólicos', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('status')).toHaveText('1 síntoma');
  await checkLayout(page);
  await checkAccessibility(page, info, 'registro-claro');
  await capture(page, info, 'registro-claro');
  await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Síntomas y notas', exact: true }).click();
  await dialog.getByRole('button', { name: 'Eliminar Cólicos', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Cólicos', exact: true })).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('0 síntomas');
});
