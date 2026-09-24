import { test, expect } from '@playwright/test';

const qaUser = { id: 'qa-isolated', email: 'qa@example.invalid' };
const qaToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';

test.describe('Mobile Calendar and Landscape Verification', () => {
  test('calendar sticky header and landscape screenshots', async ({ page }) => {
    page.on('console', msg => console.log(msg.text()));
    await page.route('**/api/auth/**', async (route) => route.fulfill({ json: { token: qaToken, user: qaUser } }));
    await page.route('**/api/settings', async (route) => route.fulfill({ json: {} }));
    await page.route('**/api/logs/**', async (route) => route.fulfill({ json: [] }));
    await page.route('**/api/logs', async (route) => route.fulfill({ json: [] }));

    await page.addInitScript(() => {
      const user = { id: 'qa-isolated', email: 'qa@example.invalid' };
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';
      const logsKey = `regla_daily_logs_v1:${encodeURIComponent(user.id)}`;
      const settingsKey = `regla_user_settings_v1:${encodeURIComponent(user.id)}`;
      const today = new Date();
      const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);

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
    });

    // 1. Mobile Portrait Calendar Scroll Check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Navigate to Calendar
    await page.click('.primary-navigation button:has-text("Calendario")');
    await page.waitForTimeout(400);

    // Scroll down 600px in the workspace
    await page.evaluate(() => {
      const ws = document.querySelector('.workspace');
      if (ws) ws.scrollTop = 800;
      const header = document.querySelector('.calendar-sticky-header');
      const cs = header ? getComputedStyle(header) : null;
      console.log('DEBUG_HEADER_RECT:', JSON.stringify(header ? header.getBoundingClientRect() : null));
      console.log('DEBUG_HEADER_STYLE:', JSON.stringify(cs ? { position: cs.position, top: cs.top, zIndex: cs.zIndex } : null));
      const wsStyle = ws ? getComputedStyle(ws) : null;
      console.log('DEBUG_WS_STYLE:', JSON.stringify(wsStyle ? { padding: wsStyle.padding, overflow: wsStyle.overflow, position: wsStyle.position } : null));
    });
    await page.waitForTimeout(400);

    await page.screenshot({ path: 'artifacts/calendar-scrolled-portrait.png' });

    // 2. Mobile Landscape Check (844 x 390)
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'artifacts/calendar-landscape.png' });

    // Switch to Diary in Landscape
    const diaryBtn = page.locator('button:has-text("Mi diario")').filter({ hasText: 'Mi diario' });
    await diaryBtn.first().click({ force: true });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'artifacts/diary-landscape.png' });

    // 3. Test Modal Opening Without Layout Squishing (on mobile)
    await page.setViewportSize({ width: 390, height: 844 });
    const diaryNavBtn = page.locator('.primary-navigation button:has-text("Mi diario")').first();
    if (await diaryNavBtn.isVisible()) {
      await diaryNavBtn.click();
      await page.waitForTimeout(300);
    }

    // Click on "Síntomas y notas" button to open modal
    const symptomsBtn = page.locator('button:has-text("Síntomas y notas")').first();
    await expect(symptomsBtn).toBeVisible();
    await symptomsBtn.click();

    // Verify modal is open and take screenshot
    const dialog = page.locator('.aura-dialog');
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: 'artifacts/modal-opened.png' });

    // Close modal
    const closeBtn = page.locator('button[aria-label^="Cerrar"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(page.locator('.aura-dialog')).toBeHidden();
    await page.waitForTimeout(300);

    // 4. Desktop Collapsible Sidebar Check (1200 x 800)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(400);
    const initialSidebarWidth = await page.evaluate(() => {
      const nav = document.querySelector('.app-navigation');
      return nav ? nav.getBoundingClientRect().width : null;
    });
    console.log('INITIAL_SIDEBAR_WIDTH:', initialSidebarWidth);
    expect(initialSidebarWidth).toBeGreaterThan(180);

    // Click collapse toggle
    const toggleBtn = page.locator('.sidebar-collapse-toggle');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await page.waitForTimeout(400);

    const collapsedSidebarWidth = await page.evaluate(() => {
      const nav = document.querySelector('.app-navigation');
      const ws = document.querySelector('.workspace');
      return {
        navWidth: nav ? nav.getBoundingClientRect().width : null,
        wsMarginLeft: ws ? getComputedStyle(ws).marginLeft : null
      };
    });
    console.log('COLLAPSED_SIDEBAR_WIDTH:', JSON.stringify(collapsedSidebarWidth));
    expect(collapsedSidebarWidth.navWidth).toBeLessThan(75);
    expect(collapsedSidebarWidth.wsMarginLeft).toBe('68px');
    await page.screenshot({ path: 'artifacts/desktop-sidebar-collapsed.png' });

    // Expand sidebar again
    await toggleBtn.click();
    await page.waitForTimeout(400);
    const expandedWidth = await page.evaluate(() => {
      const nav = document.querySelector('.app-navigation');
      return nav ? nav.getBoundingClientRect().width : null;
    });
    expect(expandedWidth).toBeGreaterThan(180);
    await page.screenshot({ path: 'artifacts/desktop-sidebar-expanded.png' });
  });
});
