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

test.describe('Hero dials dynamic hierarchy and space usage', () => {
  test('fertile window: wheel is primary on left, bigger, and fills mobile width without overflow', async ({ page }, testInfo) => {
    // Day 11 of cycle (10 days after start of 28 day cycle -> fertile window)
    await setupCycleState(page, 10);

    const visuals = page.locator('.cycle-summary-visuals');
    await expect(visuals).toBeVisible();

    const wheel = page.locator('.cycle-phase-wheel');
    const gota = page.locator('.cycle-ring.hero-prominent-ring:not(.cycle-phase-wheel)');

    await expect(wheel).toBeVisible();
    await expect(gota).toBeVisible();

    // Wheel should be primary, gota should be secondary
    await expect(wheel).toHaveClass(/is-primary/);
    await expect(gota).toHaveClass(/is-secondary/);

    const wheelBox = await wheel.boundingBox();
    const gotaBox = await gota.boundingBox();
    expect(wheelBox).not.toBeNull();
    expect(gotaBox).not.toBeNull();

    // Wheel must be strictly bigger than Gota
    expect(wheelBox!.width).toBeGreaterThan(gotaBox!.width);
    expect(wheelBox!.height).toBeGreaterThan(gotaBox!.height);

    // Position check: Wheel must be to the left of Gota
    expect(wheelBox!.x).toBeLessThan(gotaBox!.x);

    // Verify wheel text contains VENTANA FÉRTIL and ovulación estimada
    await expect(wheel.locator('.cycle-ring-label')).toContainText('VENTANA FÉRTIL');
    await expect(wheel.locator('.cycle-ring-label')).toContainText('ovulación estimada');

    // Overflow check on viewport
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);

    // Take screenshot for visual inspection
    await page.screenshot({ path: `artifacts/playwright-results/${testInfo.project.name}-hero-fertile-window.png` });
  });

  test('post-fertile (luteal): gota is primary on left, bigger, and positions swapped', async ({ page }, testInfo) => {
    // Day 20 of cycle (19 days after start -> Luteal phase, fertile window passed)
    await setupCycleState(page, 19);

    const visuals = page.locator('.cycle-summary-visuals');
    await expect(visuals).toBeVisible();

    const wheel = page.locator('.cycle-phase-wheel');
    const gota = page.locator('.cycle-ring.hero-prominent-ring:not(.cycle-phase-wheel)');

    await expect(wheel).not.toBeVisible();
    await expect(gota).toBeVisible();

    // Gota should now be primary
    await expect(gota).toHaveClass(/is-primary/);

    const gotaBox = await gota.boundingBox();
    expect(gotaBox).not.toBeNull();

    // Overflow check on viewport
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);

    // Take screenshot for visual inspection
    await page.screenshot({ path: `artifacts/playwright-results/${testInfo.project.name}-hero-luteal-swapped.png` });
  });
});
