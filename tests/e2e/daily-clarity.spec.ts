import { test, expect } from '@playwright/test';
import { seedAccount, checkLayout, checkAccessibility, capture } from './helpers';

test('registro claro: un síntoma aparece una vez, persiste y se puede quitar', async ({ page }, info) => {
  await seedAccount(page);
  await page.getByRole('button', { name: 'Síntomas y notas', exact: true }).click();
  // El diálogo real se llama "¿Cómo estás hoy?" (DailyLogBottomSheet), no
  // "Síntomas y bienestar" — ese nombre quedó desfasado de un cambio de copy
  // anterior y hacía que este locator nunca encontrara el diálogo, colgando
  // el test en el primer click. seedAccount() además ya deja un síntoma
  // sembrado ("Preparado para revisión"), así que los recuentos de abajo
  // parten de 1, no de 0.
  const dialog = page.getByRole('dialog', { name: '¿Cómo estás hoy?' });
  await dialog.getByRole('button', { name: 'Cólicos', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Eliminar Cólicos', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cólicos', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('status')).toHaveText('2 síntomas');
  await checkLayout(page);
  await checkAccessibility(page, info, 'registro-claro');
  await capture(page, info, 'registro-claro');
  await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Síntomas y notas', exact: true }).click();
  await dialog.getByRole('button', { name: 'Eliminar Cólicos', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Cólicos', exact: true })).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('1 síntoma');
});
