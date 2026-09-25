import { test, expect, type Page } from '@playwright/test';

const qaUser = { id: 'qa-isolated', email: 'qa@example.invalid' };
const qaToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';

/** Ciclo de 28 días cuya regla empezó hace `daysAgo` días; ayer queda registrado para no mostrar el aviso. */
async function setupCycleState(page: Page, daysAgo: number) {
  await page.route('**/api/auth/**', async route => route.fulfill({ json: { token: qaToken, user: qaUser } }));
  await page.route('**/api/settings', async route => route.fulfill({ json: {} }));
  await page.route('**/api/logs/**', async route => route.fulfill({ json: [] }));
  await page.route('**/api/logs', async route => route.fulfill({ json: [] }));

  await page.addInitScript(({ daysAgoStart, user, token }) => {
    const logsKey = `regla_daily_logs_v1:${encodeURIComponent(user.id)}`;
    const settingsKey = `regla_user_settings_v1:${encodeURIComponent(user.id)}`;
    const today = new Date();
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgoStart);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    localStorage.setItem('token', token);
    localStorage.setItem('cached_user', JSON.stringify(user));
    localStorage.setItem(settingsKey, JSON.stringify({
      userName: 'Alex', averageCycleLength: 28, averagePeriodLength: 5, lutealPhaseLength: 14, lastPeriodStartDate: key(start), theme: 'light'
    }));
    localStorage.setItem(logsKey, JSON.stringify({
      [key(start)]: { date: key(start), isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [], recordedAt: start.toISOString() },
      [key(yesterday)]: { date: key(yesterday), isPeriod: false, symptoms: [{ id: 'calm_day', name: 'Día normal sin molestias', category: 'general', emoji: '✨' }], recordedAt: yesterday.toISOString() }
    }));
  }, { daysAgoStart: daysAgo, user: qaUser, token: qaToken });

  await page.goto('/');
  await expect(page.locator('.cycle-dial-box')).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('La gota del ciclo', () => {
  test('ventana fértil: la cabecera cuenta hacia la ovulación y la gota hacia la regla', async ({ page }, testInfo) => {
    await setupCycleState(page, 10); // hoy es el día 11

    const header = page.locator('.cycle-summary-header');
    await expect(header.locator('.phase-chip')).toContainText(/Ventana Fértil/i);
    await expect(header.locator('.cycle-headline')).toHaveText('Ovulación en 3 días');

    const dial = page.locator('.cycle-dial-box');
    await expect(dial).toHaveAttribute('role', 'slider');
    await expect(dial).toHaveAttribute('aria-valuenow', '11');
    await expect(dial).toHaveAttribute('aria-valuemax', '28');
    await expect(page.locator('.cycle-dial-eyebrow')).toHaveText(/hoy · día 11/i);
    await expect(page.locator('.cycle-dial-value')).toHaveText('18');
    await expect(page.locator('.cycle-dial-caption')).toHaveText('días para tu regla');

    // La gota es cuadrada, grande y queda dentro de la pantalla en cualquier tamaño.
    const box = await dial.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(1);
    expect(box!.width).toBeGreaterThanOrEqual(180);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/playwright-results/${testInfo.project.name}-hero-fertile-window.png` });
  });

  test('recorrer la gota muestra cualquier día y se puede volver a hoy', async ({ page }) => {
    await setupCycleState(page, 10);
    const dial = page.locator('.cycle-dial-box');

    // Teclado: cada flecha avanza un día; Fin salta al último día del ciclo.
    await dial.focus();
    await page.keyboard.press('ArrowRight');
    await expect(dial).toHaveAttribute('aria-valuenow', '12');
    await page.keyboard.press('End');
    await expect(dial).toHaveAttribute('aria-valuenow', '28');
    await expect(dial).toHaveAttribute('aria-valuetext', /día 28 del ciclo\. Fase lútea\. 1 día para la regla/);
    await expect(page.locator('.cycle-dial-tag')).toHaveText('Fase lútea');
    await page.keyboard.press('Escape');
    await expect(dial).toHaveAttribute('aria-valuenow', '11');

    // Puntero: tocar la punta de la gota lleva al inicio del ciclo (regla).
    const box = (await dial.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.53, box.y + box.height * 0.12);
    await expect(dial).toHaveAttribute('aria-valuenow', /^[12]$/);
    await expect(page.locator('.cycle-dial-tag')).toHaveText('Regla');
    await page.getByRole('button', { name: 'Hoy', exact: true }).click();
    await expect(dial).toHaveAttribute('aria-valuenow', '11');
    await expect(page.locator('.cycle-dial-tag')).toHaveCount(0);
  });

  test('fase lútea: la cabecera anuncia la próxima ventana fértil', async ({ page }, testInfo) => {
    await setupCycleState(page, 19); // hoy es el día 20
    await expect(page.locator('.cycle-summary-header .phase-chip')).toContainText(/Fase Lútea/i);
    await expect(page.locator('.cycle-summary-header .cycle-headline')).toHaveText('Próxima ventana fértil en 17 días');
    await expect(page.locator('.cycle-dial-value')).toHaveText('9');
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/playwright-results/${testInfo.project.name}-hero-luteal.png` });
  });
});
