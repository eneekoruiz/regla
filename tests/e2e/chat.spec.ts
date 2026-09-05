import { test, expect } from '@playwright/test';
import { enterLocal, openTool, checkLayout } from './helpers';

test('chat local conserva mensajes y permite borrar sólo la conversación', async ({ page }) => {
  await enterLocal(page);
  await openTool(page, /^Confidente/);
  const question = 'Quiero entender la privacidad, prueba QA';
  await page.getByLabel('Tu mensaje').fill(question);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('log', { name: 'Conversación' }).getByText(/no envía tus mensajes a un modelo remoto/)).toBeVisible();
  await page.reload();
  await openTool(page, /^Confidente/);
  await expect(page.getByRole('log').getByText(question, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Catálogo de temas', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Catálogo local' }).getByRole('button')).toHaveCount(22);
  await checkLayout(page);
  await page.getByRole('button', { name: 'Borrar historial', exact: true }).click();
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();
  await expect(page.getByRole('log').getByText(question, { exact: true })).toHaveCount(0);
  await page.reload();
  await openTool(page, /^Confidente/);
  await expect(page.getByRole('log').getByText(question, { exact: true })).toHaveCount(0);
});
