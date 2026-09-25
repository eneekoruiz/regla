import { test, expect } from '@playwright/test';
import { answerPendingDay, enterAccount, seedAccount, checkAccessibility, checkLayout, openSettings, readLogs } from './helpers';

test('el manchado se conserva como sangrado editable y se puede quitar tras recargar', async ({ page }) => {
  // Fecha fija: la regla empezó el 2 de septiembre y el día 3 quedó sin anotar.
  await page.clock.install({ time: new Date('2026-09-05T12:00:00') });
  await seedAccount(page);
  await page.getByLabel('Fecha del registro').fill('2026-09-03');
  await answerPendingDay(page, 'Anotar regla');
  await page.getByRole('button', { name: 'Sí, hubo sangrado' }).click();
  await page.getByRole('button', { name: 'Manchado', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await page.getByLabel('Fecha del registro').fill('2026-09-03');
  await page.getByRole('button', { name: 'Editar flujo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sí, hubo sangrado' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Manchado', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Quitar', exact: true }).click();
  await page.reload();
  const log = (await readLogs(page))['2026-09-03'];
  expect(Boolean(log?.isPeriod || log?.isIrregularBleeding)).toBe(false);
});

test('instalación voluntaria con guía, foco y confirmación del navegador', async ({ page }, info) => {
  await seedAccount(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // En el ordenador se instala desde la barra lateral; en pantallas estrechas, desde Ajustes › Cuenta.
  const sidebar = page.getByRole('button', { name: /^Instalar app/ }).filter({ visible: true });
  const fromSidebar = await sidebar.count() > 0;
  if (!fromSidebar) await openSettings(page, 'Cuenta');
  const trigger = fromSidebar ? sidebar.first() : page.getByRole('button', { name: 'Instalar Aura en este dispositivo' });
  await trigger.click();
  // Sin instalación nativa disponible, la app explica cómo hacerlo a mano.
  const dialog = page.getByRole('dialog', { name: 'Aura, más cerca de ti' });
  await expect(dialog).toContainText('Instalar Aura no crea una copia de seguridad');
  await checkLayout(page);
  await checkAccessibility(page, info, 'instalacion');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // Con la instalación del navegador disponible, se confirma con el diálogo nativo.
  await page.evaluate(() => {
    const prompt = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(prompt, {
      prompt: async () => { (window as any).installRequested = true; },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(prompt);
  });
  await trigger.click();
  // La barra lateral abre el diálogo del navegador directamente; Ajustes muestra antes su botón.
  if (!fromSidebar) await dialog.getByRole('button', { name: 'Instalar Aura', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).installRequested)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  if (fromSidebar) await expect(sidebar).toHaveCount(0);
});

test('el diario no reinicia el ciclo al pasar la fecha estimada sin registro', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T12:00:00') });
  await seedAccount(page);
  await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem('cached_user')!);
    const settingsKey = `regla_user_settings_v1:${encodeURIComponent(user.id)}`;
    const logsKey = `regla_daily_logs_v1:${encodeURIComponent(user.id)}`;
    const settings = JSON.parse(localStorage.getItem(settingsKey)!);
    localStorage.setItem(settingsKey, JSON.stringify({ ...settings, lastPeriodStartDate: '2026-08-07' }));
    localStorage.setItem(logsKey, JSON.stringify({ '2026-08-07': { date: '2026-08-07', isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [] } }));
  });
  await page.reload();
  // Día 30 de un ciclo de 28: el diario cuenta el retraso en vez de empezar otro ciclo.
  await expect(page.locator('.cycle-summary-header .phase-chip')).toContainText('Día 30');
  await expect(page.getByRole('heading', { name: 'Tu regla se está retrasando' })).toBeVisible();
  await expect(page.locator('.cycle-dial-value')).toHaveText('+1');
  await expect(page.locator('.cycle-dial-caption')).toHaveText('día de retraso');
  await page.getByRole('button', { name: 'Me ha bajado hoy', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, hubo sangrado' }).click();
  await page.getByLabel('Es el primer día de un nuevo ciclo').check();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.cycle-summary-header .phase-chip')).toContainText('Día 1');
  await expect(page.locator('.cycle-dial-caption')).toContainText('de regla');
});

test('sangrado irregular muy abundante muestra orientación antes de los consejos', async ({ page }, info) => {
  await enterAccount(page);
  await page.getByRole('button', { name: 'Registrar mi primera regla' }).click();
  await page.getByRole('button', { name: 'Sí, hubo sangrado' }).click();
  await page.getByRole('button', { name: 'Sangrado irregular', exact: true }).click();
  await page.getByRole('button', { name: 'Muy abundante', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  const notice = page.getByRole('note', { name: 'Orientación sobre sangrado muy abundante' });
  await expect(notice).toContainText('Contacta con un profesional sanitario hoy');
  expect(await notice.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('.diary-secondary')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await checkAccessibility(page, info, 'sangrado-orientacion');
});
