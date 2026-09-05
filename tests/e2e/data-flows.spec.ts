import { test, expect, type Download } from '@playwright/test';
import { seedLocal, openTool, readLogs, checkLayout, checkAccessibility } from './helpers';

async function downloadBytes(download: Download) {
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('cuestionario guardado en la fecha elegida, con respuestas visibles tras recargar', async ({ page }, info) => {
  await seedLocal(page);
  const date = '2026-06-15';
  await page.getByLabel('Fecha del registro').fill(date);
  await expect(page.getByRole('group', { name: 'Seleccionar día' }).getByRole('button', { pressed: true })).toHaveAttribute('aria-label', /15 de Junio de 2026/);
  await openTool(page, /^Estrés y tensión/);
  await expect(page.getByRole('slider')).toHaveValue('3');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'A veces', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar respuestas', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const expected = { stress_q1: 3, stress_q2: 'sometimes', stress_q3: false };
  const results = (await readLogs(page))[date].quizResults;
  expect(results).toHaveLength(1);
  expect(results[0].answers).toEqual(expected);
  await page.reload();
  await page.getByLabel('Fecha del registro').fill(date);
  const history = page.getByRole('region', { name: 'Cuestionarios guardados' });
  await history.locator('summary').click();
  await expect(history.getByText('A veces', { exact: true })).toBeVisible();
  await expect(history.getByText('No', { exact: true })).toBeVisible();
  expect((await readLogs(page))[date].quizResults[0].answers).toEqual(expected);
  await checkLayout(page);
  await checkAccessibility(page, info, 'cuestionario-guardado');
});

test('las notas se conservan tras recargar y no se pierden cuando falla el almacenamiento', async ({ page }) => {
  await seedLocal(page);
  await page.getByRole('button', { name: 'Síntomas y notas', exact: true }).click();
  const input = page.getByLabel('Tu nota', { exact: true });
  const note = 'Hoy he descansado bien. Anotación de prueba.';
  await input.fill(note);
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(input).toHaveValue('');
  await page.reload();
  expect(Object.values(await readLogs(page)).some((log: any) => log.notes?.includes(note))).toBe(true);
  await page.getByRole('button', { name: 'Síntomas y notas', exact: true }).click();
  const before = await readLogs(page);
  const retryInput = page.getByLabel('Tu nota', { exact: true });
  await retryInput.fill('Esta nota no debe desaparecer si no cabe.');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key.includes('logs')) throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('No se ha guardado la nota.', { exact: false })).toBeVisible();
  await expect(retryInput).toHaveValue('Esta nota no debe desaparecer si no cabe.');
  expect(await readLogs(page)).toEqual(before);
  await page.evaluate(() => (window as any).restoreStorage());
});

test('importación CSV con revisión previa, fechas exactas y rechazo sin cambios', async ({ page }, info) => {
  await seedLocal(page);
  const before = await readLogs(page);
  await openTool(page, /^Importar registros/);
  await page.getByLabel('Archivo para importar').setInputFiles({ name: 'registros.csv', mimeType: 'text/csv', buffer: Buffer.from('date,flow,symptoms\n2026-07-01,light,cramps\n2026-07-03,heavy,tired') });
  await expect(page.getByRole('button', { name: /Importar \d+ registros/ })).toBeVisible();
  expect(await readLogs(page)).toEqual(before);
  await checkLayout(page);
  await checkAccessibility(page, info, 'confirmacion-importar');
  await page.getByRole('button', { name: /Importar \d+ registros/ }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Los registros se han importado correctamente.');
  await page.reload();
  const imported = await readLogs(page);
  expect(imported['2026-07-01'].flow).toBe('light');
  expect(imported['2026-07-03'].flow).toBe('heavy');
  expect(imported['2026-07-02']).toBeUndefined();
  await openTool(page, /^Importar registros/);
  await page.getByLabel('Archivo para importar').setInputFiles({ name: 'imagen.png', mimeType: 'image/png', buffer: Buffer.from('not a supported record') });
  await expect(page.getByRole('alert')).toContainText('No podemos leer imágenes');
  expect(await readLogs(page)).toEqual(imported);
});

test('importación XML local de fechas reales', async ({ page }) => {
  await seedLocal(page);
  await openTool(page, /^Importar registros/);
  await page.getByLabel('Archivo para importar').setInputFiles({ name: 'salud.xml', mimeType: 'application/xml', buffer: Buffer.from('<HealthData><Record type="HKCategoryTypeIdentifierMenstrualFlow" value="HKCategoryValueMenstrualFlowMedium" startDate="2026-07-05 10:00:00 +0200" endDate="2026-07-05 11:00:00 +0200" /></HealthData>') });
  await page.getByRole('button', { name: /Importar \d+ registros/ }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Los registros se han importado correctamente.');
  expect((await readLogs(page))['2026-07-05'].isPeriod).toBe(true);
});

test('copia exportada y restaurada sin perder el registro completo', async ({ page }) => {
  await seedLocal(page);
  const original = await readLogs(page);
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('button', { name: 'Mis datos', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia', exact: true }).click();
  const bytes = await downloadBytes(await downloading);
  const backup = JSON.parse(bytes.toString('utf8'));
  expect(backup.logs).toEqual(original);
  backup.logs['2026-07-12'] = { date: '2026-07-12', isPeriod: false, symptoms: [], notes: 'Registro recuperado de copia' };
  await page.keyboard.press('Escape');
  await openTool(page, /^Importar registros/);
  await page.getByLabel('Archivo para importar').setInputFiles({ name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText('La copia sustituirá', { exact: false })).toBeVisible();
  expect(await readLogs(page)).toEqual(original);
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Los registros se han importado correctamente.');
  await page.reload();
  expect(await readLogs(page)).toEqual(backup.logs);
});

test('copia cifrada exige frase secreta y descarga un sobre no legible', async ({ page }) => {
  await seedLocal(page);
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('button', { name: 'Mis datos', exact: true }).click();
  await page.getByRole('button', { name: 'Copia cifrada', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Exportar copia cifrada' })).toContainText(/copia cifrada/i);
  await page.getByLabel('Frase secreta', { exact: true }).fill('frase de prueba segura');
  await page.getByLabel('Repite la frase', { exact: true }).fill('frase de prueba segura');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Cifrar y descargar', exact: true }).click();
  const envelope = JSON.parse((await downloadBytes(await downloading)).toString('utf8'));
  expect(envelope.type).toBe('aura-encrypted-backup');
  const encrypted = JSON.parse(envelope.payload);
  expect(encrypted).toMatchObject({ v: 1, data: expect.any(String), iv: expect.any(String), salt: expect.any(String) });
  expect(encrypted.data).not.toContain('Alex');
});

test('informe PDF generado en el dispositivo y ajustes con validación', async ({ page }, info) => {
  await seedLocal(page);
  await openTool(page, /^Informe de salud/);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Compartir PDF', exact: true }).click();
  const pdf = await downloadBytes(await downloading);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(1000);
  await info.attach('informe.pdf', { body: pdf, contentType: 'application/pdf' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByLabel('Duración media del ciclo (días)').fill('0');
  await page.getByRole('button', { name: 'Guardar y cerrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Revisa la duración');
  await checkLayout(page);
  await checkAccessibility(page, info, 'ajustes-error');
  await page.getByLabel('Duración media del ciclo (días)').fill('30');
  await page.getByRole('button', { name: 'Guardar y cerrar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('regla_user_settings_v1')!).averageCycleLength)).toBe(30);
});
