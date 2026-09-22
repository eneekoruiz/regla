import { test, expect } from '@playwright/test';

const qaUser = { id: 'qa-isolated', email: 'qa@example.invalid' };
const qaToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';

async function setupCycleState(page: any, daysAgoStart: number) {
  await page.route('**/api/auth/**', async (route: any) => route.fulfill({ json: { token: qaToken, user: qaUser } }));
  await page.route('**/api/settings', async (route: any) => route.fulfill({ json: {} }));
  await page.route('**/api/logs/**', async (route: any) => route.fulfill({ json: [] }));
  await page.route('**/api/logs', async (route: any) => route.fulfill({ json: [] }));

  await page.addInitScript(({ daysAgo }: { daysAgo: number }) => {
    const user = { id: 'qa-isolated', email: 'qa@example.invalid' };
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';
    const logsKey = `regla_daily_logs_v1:${encodeURIComponent(user.id)}`;
    const settingsKey = `regla_user_settings_v1:${encodeURIComponent(user.id)}`;
    const today = new Date();
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);

    localStorage.setItem('token', token);
    localStorage.setItem('cached_user', JSON.stringify(user));
    localStorage.setItem(settingsKey, JSON.stringify({
      userName: 'Alex',
      averageCycleLength: 28,
      averagePeriodLength: 5,
      lutealPhaseLength: 14,
      lastPeriodStartDate: key(start),
      theme: 'light'
    }));
    localStorage.setItem(logsKey, JSON.stringify({
      [key(start)]: {
        date: key(start),
        isPeriod: true,
        isCycleStart: true,
        flow: 'medium',
        symptoms: [],
        recordedAt: start.toISOString()
      }
    }));
    localStorage.setItem('qa-initialized', 'true');
  }, { daysAgo: daysAgoStart });

  await page.goto('/');
  await page.waitForTimeout(500);
}

test.describe('Hero dials responsive behavior and space usage', () => {
  test('fertile window: mobile shows only drop with phase in header; desktop shows both enlarged dials', async ({ page }, testInfo) => {
    // Day 11 of cycle (10 days after start of 28 day cycle -> fertile window)
    await setupCycleState(page, 10);

    const isMobileViewport = testInfo.project.name === 'mobile' || testInfo.project.name === 'narrow';
    const visuals = page.locator('.cycle-summary-visuals');
    await expect(visuals).toBeVisible();

    const gota = page.locator('.cycle-summary-visuals .drop-wrap .cycle-ring');
    const wheel = page.locator('.cycle-summary-visuals .wheel-wrap .cycle-ring');

    await expect(gota).toBeVisible();

    if (isMobileViewport) {
      // En móvil vertical: solo la gota, la rueda de fases se oculta
      await expect(wheel).not.toBeVisible();

      // Cabecera muestra la fase sin solapamientos
      const chip = page.locator('.cycle-summary-header .phase-chip');
      const headline = page.locator('.cycle-summary-header .cycle-headline');
      const copy = page.locator('.cycle-summary-header .cycle-copy');

      await expect(chip).toBeVisible();
      await expect(headline).toBeVisible();
      await expect(copy).toBeVisible();

      await expect(chip).toContainText(/Ventana Fértil/i);

      // Verificación de no solapamiento: chip está encima de headline, headline encima de copy
      const chipBox = await chip.boundingBox();
      const headlineBox = await headline.boundingBox();
      const copyBox = await copy.boundingBox();

      expect(chipBox).not.toBeNull();
      expect(headlineBox).not.toBeNull();
      expect(copyBox).not.toBeNull();

      expect(chipBox!.y + chipBox!.height).toBeLessThanOrEqual(headlineBox!.y + 1);
      expect(headlineBox!.y + headlineBox!.height).toBeLessThanOrEqual(copyBox!.y + 1);

      // La gota tiene tamaño prominente y está centrada
      const gotaBox = await gota.boundingBox();
      expect(gotaBox).not.toBeNull();
      expect(gotaBox!.width).toBeGreaterThanOrEqual(180);
    } else {
      // En versión grande (tablet u ordenador): están ambos diales
      await expect(wheel).toBeVisible();

      // En ventana fértil, wheel es primary y gota es secondary
      await expect(wheel).toHaveClass(/is-primary/);
      await expect(gota).toHaveClass(/is-secondary/);

      const wheelBox = await wheel.boundingBox();
      const gotaBox = await gota.boundingBox();
      expect(wheelBox).not.toBeNull();
      expect(gotaBox).not.toBeNull();

      // Rueda más grande que gota y a la izquierda
      expect(wheelBox!.width).toBeGreaterThan(gotaBox!.width);
      expect(wheelBox!.x).toBeLessThan(gotaBox!.x);

      // Ambos diales ocupan más espacio que antes (mínimo 235px en tablet, 380px en escritorio)
      expect(wheelBox!.width).toBeGreaterThanOrEqual(235);
      expect(gotaBox!.width).toBeGreaterThanOrEqual(210);
    }

    // Overflow check on viewport
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);

    // Take screenshot for visual inspection
    await page.screenshot({ path: `artifacts/playwright-results/${testInfo.project.name}-hero-fertile-window.png` });
  });

  test('post-fertile (luteal): mobile shows only drop; desktop shows both with gota as primary', async ({ page }, testInfo) => {
    // Day 20 of cycle (19 days after start -> Luteal phase, fertile window passed)
    await setupCycleState(page, 19);

    const isMobileViewport = testInfo.project.name === 'mobile' || testInfo.project.name === 'narrow';
    const visuals = page.locator('.cycle-summary-visuals');
    await expect(visuals).toBeVisible();

    const gota = page.locator('.cycle-summary-visuals .drop-wrap .cycle-ring');
    const wheel = page.locator('.cycle-summary-visuals .wheel-wrap .cycle-ring');

    await expect(gota).toBeVisible();

    if (isMobileViewport) {
      // En móvil vertical: solo la gota
      await expect(wheel).not.toBeVisible();

      // Fase lútea claramente escrita en cabecera sin solapamientos
      const chip = page.locator('.cycle-summary-header .phase-chip');
      const headline = page.locator('.cycle-summary-header .cycle-headline');

      await expect(chip).toBeVisible();
      await expect(headline).toBeVisible();
      await expect(chip).toContainText(/Fase Lútea/i);

      const chipBox = await chip.boundingBox();
      const headlineBox = await headline.boundingBox();
      expect(chipBox).not.toBeNull();
      expect(headlineBox).not.toBeNull();
      expect(chipBox!.y + chipBox!.height).toBeLessThanOrEqual(headlineBox!.y + 1);

      // Gota prominente
      const gotaBox = await gota.boundingBox();
      expect(gotaBox).not.toBeNull();
      expect(gotaBox!.width).toBeGreaterThanOrEqual(180);
    } else {
      // En versión grande: ambos diales, gota es primary
      await expect(wheel).toBeVisible();
      await expect(wheel).toHaveClass(/is-secondary/);
      await expect(gota).toHaveClass(/is-primary/);

      const gotaBox = await gota.boundingBox();
      const wheelBox = await wheel.boundingBox();
      expect(gotaBox).not.toBeNull();
      expect(wheelBox).not.toBeNull();

      expect(gotaBox!.width).toBeGreaterThan(wheelBox!.width);
      expect(gotaBox!.x).toBeLessThan(wheelBox!.x);

      // Ambos diales ocupan más espacio
      expect(gotaBox!.width).toBeGreaterThanOrEqual(235);
      expect(wheelBox!.width).toBeGreaterThanOrEqual(210);
    }

    // Overflow check on viewport
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);

    // Take screenshot for visual inspection
    await page.screenshot({ path: `artifacts/playwright-results/${testInfo.project.name}-hero-luteal-swapped.png` });
  });
});
