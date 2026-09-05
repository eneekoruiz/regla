import { test, expect } from '@playwright/test';
import { seedLocal, enterLocal, checkAccessibility, checkLayout } from './helpers';

test('instalación voluntaria con guía, foco y confirmación del navegador', async ({ page }, info) => {
  await seedLocal(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Instalar Aura', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Instalar Aura no crea una copia de seguridad');
  await checkLayout(page);
  await checkAccessibility(page, info, 'instalacion');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.evaluate(() => {
    const prompt = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(prompt, {
      prompt: async () => { (window as any).installRequested = true; },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(prompt);
  });
  await trigger.click();
  await dialog.getByRole('button', { name: 'Instalar Aura', exact: true }).click();
  expect(await page.evaluate(() => (window as any).installRequested)).toBe(true);
  await expect(dialog.getByText('Aura ya está instalada', { exact: false })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(dialog.getByRole('status')).toContainText('Aura ya está instalada');
  await dialog.getByRole('button', { name: 'Entendido' }).click();
  await expect(trigger).toHaveCount(0);
});

test('el diario no reinicia el ciclo al pasar la fecha estimada sin registro', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T12:00:00') });
  await seedLocal(page);
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('regla_user_settings_v1')!);
    localStorage.setItem('regla_user_settings_v1', JSON.stringify({ ...settings, lastPeriodStartDate: '2026-08-07' }));
    localStorage.setItem('regla_daily_logs_v1', JSON.stringify({ '2026-08-07': { date: '2026-08-07', isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [] } }));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu ciclo tiene su ritmo' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Día 30 del ciclo; duración estimada 28 días' })).toBeVisible();
  await expect(page.getByText('La fecha estimada ha pasado.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar regla', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, hubo sangrado' }).click();
  await page.getByLabel('Es el primer día de un nuevo ciclo').check();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.getByRole('heading', { name: 'En tu periodo' })).toBeVisible();
  // The completed 29-day cycle also updates the estimated duration.
  await expect(page.getByRole('img', { name: 'Día 1 del ciclo; duración estimada 29 días' })).toBeVisible();
});

test('sangrado irregular muy abundante muestra orientación antes de los consejos', async ({ page }, info) => {
  await enterLocal(page);
  await page.getByRole('button', { name: 'Registrar regla', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, hubo sangrado' }).click();
  await page.getByRole('button', { name: 'Sangrado irregular', exact: true }).click();
  await page.getByRole('button', { name: 'Muy abundante', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  const notice = page.getByRole('note', { name: 'Orientación sobre sangrado muy abundante' });
  await expect(notice).toContainText('Contacta con un profesional sanitario hoy');
  expect(await notice.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('.diary-grid')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await checkAccessibility(page, info, 'sangrado-orientacion');
});
