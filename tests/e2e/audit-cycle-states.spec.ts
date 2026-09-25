import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Consolidated, on-disk copy of every per-scenario summary. testInfo.attach() with a
// `body` (no `path`) only lives inside the HTML report's internal data store and is not
// reliably readable afterward as a loose file, so we also persist a flat JSON array here.
const summariesOutPath = path.join('artifacts', 'playwright-results', 'audit-summaries.json');

function appendSummaryToDisk(entry: Record<string, unknown>, projectName: string) {
  let all: Record<string, unknown>[] = [];
  try {
    if (fs.existsSync(summariesOutPath)) {
      all = JSON.parse(fs.readFileSync(summariesOutPath, 'utf-8'));
    }
  } catch {
    all = [];
  }
  const withProject = { ...entry, project: projectName };
  const idx = all.findIndex(e => e.slug === entry.slug && e.project === projectName);
  if (idx >= 0) all[idx] = withProject; else all.push(withProject);
  fs.mkdirSync(path.dirname(summariesOutPath), { recursive: true });
  fs.writeFileSync(summariesOutPath, JSON.stringify(all, null, 2));
}

const qaUser = { id: 'qa-isolated', email: 'qa@example.invalid' };
const qaToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface SeedOptions {
  /** Days since the (simulated) last period start, used to compute lastPeriodStartDate. Omit for "no cycle yet". */
  daysAgoStart?: number;
  averageCycleLength?: number;
  averagePeriodLength?: number;
  lutealPhaseLength?: number;
  /** Extra logs keyed by an ISO date string (YYYY-MM-DD) or by "today"/"start" placeholders resolved at seed time. */
  extraLogs?: Record<string, Record<string, unknown>>;
  /** If true, seed no lastPeriodStartDate and no logs at all (brand-new user). */
  brandNew?: boolean;
}

/**
 * Adapted from tests/e2e/hero-dials.spec.ts's setupCycleState. Seeds an isolated,
 * mocked account at an arbitrary cycle day (daysAgoStart = days since a simulated
 * period start), optionally with extra logs for specific dates, and navigates to '/'.
 */
async function setupCycleState(page: Page, opts: SeedOptions) {
  await page.route('**/api/auth/**', async route => route.fulfill({ json: { token: qaToken, user: qaUser } }));
  // IMPORTANT: getSettingsFromDB() in src/services/storageEngine.ts always replaces local
  // settings with whatever GET /api/settings returns once a token is present (by design,
  // so a signed-in device hydrates from the account). A mock that returns {} here silently
  // wipes any lastPeriodStartDate seeded only in localStorage, before the app ever reads it.
  // So this mock must echo back the same settings we seed into localStorage below, exactly
  // like the real server would for an account that already has this data saved. Logs don't
  // need this treatment: getAllLogsFromDB() merges remote with local (local wins), so an
  // empty remote logs response is harmless.
  const start = opts.brandNew ? null : new Date(Date.now() - (opts.daysAgoStart ?? 0) * 86400000);
  const settingsPayload = opts.brandNew
    ? { userName: 'Alex', averageCycleLength: opts.averageCycleLength ?? 28, averagePeriodLength: opts.averagePeriodLength ?? 5, lutealPhaseLength: opts.lutealPhaseLength ?? 14, theme: 'light' }
    : { userName: 'Alex', averageCycleLength: opts.averageCycleLength ?? 28, averagePeriodLength: opts.averagePeriodLength ?? 5, lutealPhaseLength: opts.lutealPhaseLength ?? 14, lastPeriodStartDate: key(start!), theme: 'light' };
  await page.route('**/api/settings', async route => route.fulfill({ json: settingsPayload }));
  await page.route('**/api/logs/**', async route => route.fulfill({ json: [] }));
  await page.route('**/api/logs', async route => route.fulfill({ json: [] }));

  await page.addInitScript(
    ({ daysAgoStart, averageCycleLength, averagePeriodLength, lutealPhaseLength, extraLogs, brandNew }: {
      daysAgoStart?: number;
      averageCycleLength: number;
      averagePeriodLength: number;
      lutealPhaseLength: number;
      extraLogs: Record<string, Record<string, unknown>>;
      brandNew: boolean;
    }) => {
      const user = { id: 'qa-isolated', email: 'qa@example.invalid' };
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1pc29sYXRlZCJ9.qa-signature';
      const logsKey = `regla_daily_logs_v1:${encodeURIComponent(user.id)}`;
      const settingsKey = `regla_user_settings_v1:${encodeURIComponent(user.id)}`;
      const today = new Date();
      const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      localStorage.setItem('token', token);
      localStorage.setItem('cached_user', JSON.stringify(user));

      if (brandNew) {
        localStorage.setItem(settingsKey, JSON.stringify({ userName: 'Alex', averageCycleLength, averagePeriodLength, lutealPhaseLength, theme: 'light' }));
        localStorage.setItem(logsKey, JSON.stringify({}));
        localStorage.setItem('qa-initialized', 'true');
        return;
      }

      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (daysAgoStart ?? 0));
      localStorage.setItem(settingsKey, JSON.stringify({
        userName: 'Alex',
        averageCycleLength,
        averagePeriodLength,
        lutealPhaseLength,
        lastPeriodStartDate: dateKey(start),
        theme: 'light'
      }));

      const logs: Record<string, Record<string, unknown>> = {};
      // Resolve placeholder keys ("today", "start", or "start+N") into real date keys.
      for (const [rawKey, value] of Object.entries(extraLogs)) {
        let resolved: string;
        if (rawKey === 'today') resolved = dateKey(today);
        else if (rawKey === 'start') resolved = dateKey(start);
        else if (rawKey.startsWith('start+')) {
          const offset = Number(rawKey.slice('start+'.length));
          const d = new Date(start);
          d.setDate(d.getDate() + offset);
          resolved = dateKey(d);
        } else if (rawKey.startsWith('today+')) {
          const offset = Number(rawKey.slice('today+'.length));
          const d = new Date(today);
          d.setDate(d.getDate() + offset);
          resolved = dateKey(d);
        } else if (rawKey.startsWith('today-')) {
          const offset = Number(rawKey.slice('today-'.length));
          const d = new Date(today);
          d.setDate(d.getDate() - offset);
          resolved = dateKey(d);
        } else {
          resolved = rawKey;
        }
        logs[resolved] = { date: resolved, recordedAt: today.toISOString(), ...value };
      }

      localStorage.setItem(logsKey, JSON.stringify(logs));
      localStorage.setItem('qa-initialized', 'true');
    },
    {
      daysAgoStart: opts.daysAgoStart,
      averageCycleLength: opts.averageCycleLength ?? 28,
      averagePeriodLength: opts.averagePeriodLength ?? 5,
      lutealPhaseLength: opts.lutealPhaseLength ?? 14,
      extraLogs: opts.extraLogs ?? {},
      brandNew: opts.brandNew ?? false
    }
  );

  await page.goto('/');
  await page.waitForTimeout(500);
}

interface CaptureResult {
  screenshotPaths: string[];
  heroText: string | null;
  checkinText: string | null;
  catchupText: string | null;
  consoleErrors: string[];
  pageErrors: string[];
  a11yViolationCount: number;
  a11yViolationIds: string[];
}

async function captureState(
  page: Page,
  testInfo: import('@playwright/test').TestInfo,
  slug: string,
  opts: SeedOptions,
  captureDesktopToo: boolean
): Promise<CaptureResult> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  await setupCycleState(page, opts);
  // Let the floating check-in animation (250ms) and any layout settle finish.
  await page.waitForTimeout(400);

  const projectName = testInfo.project.name;
  const screenshotPaths: string[] = [];
  const shotPath = `artifacts/playwright-results/audit-${slug}.png`;
  await page.screenshot({ path: shotPath, fullPage: true, animations: 'disabled', timeout: 15_000 });
  screenshotPaths.push(shotPath);

  if (captureDesktopToo && projectName === 'desktop') {
    // desktop shots already covered by the per-project run; nothing extra needed here,
    // the caller only invokes this with captureDesktopToo on the desktop project run.
  }

  const heroLocator = page.locator('.cycle-summary').first();
  const heroText = (await heroLocator.count()) ? await heroLocator.innerText() : null;

  const checkinLocator = page.locator('.today-checkin-overlay').first();
  const checkinText = (await checkinLocator.count()) ? await checkinLocator.innerText() : null;

  const catchupLocator = page.locator('.past-catchup-banner').first();
  const catchupText = (await catchupLocator.count()) ? await catchupLocator.innerText() : null;

  let a11yViolationCount = 0;
  let a11yViolationIds: string[] = [];
  try {
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    a11yViolationCount = result.violations.length;
    a11yViolationIds = result.violations.map(v => v.id);
    if (result.violations.length) {
      await testInfo.attach(`${slug}-accessibility.json`, { body: JSON.stringify(result.violations, null, 2), contentType: 'application/json' });
    }
  } catch (e) {
    a11yViolationIds = [`axe-run-failed: ${(e as Error).message}`];
  }

  const summary = { slug, opts, heroText, checkinText, catchupText, consoleErrors, pageErrors, a11yViolationCount, a11yViolationIds };
  await testInfo.attach(`${slug}-summary.json`, {
    body: JSON.stringify(summary, null, 2),
    contentType: 'application/json'
  });
  appendSummaryToDisk(summary, testInfo.project.name);

  return { screenshotPaths, heroText, checkinText, catchupText, consoleErrors, pageErrors, a11yViolationCount, a11yViolationIds };
}

// 28-day cycle, 5-day period, 14-day luteal (defaults) unless noted otherwise.
// daysAgoStart = N means: today is (cycle) day N+1.
test.describe('Audit: cycle-day information matrix', () => {

  test('01 first day of period, unrecorded (predicted, nothing logged)', async ({ page }, testInfo) => {
    // Today is predicted day 1 of period: set lastPeriodStartDate to exactly one cycle
    // length ago so "today" lands back on day 1 of the predicted period, with nothing logged.
    const r = await captureState(page, testInfo, '01-period-day1-unrecorded', { daysAgoStart: 28 }, true);
    expect(r.pageErrors, 'no uncaught page errors').toEqual([]);
  });

  test('02 first day of period, already logged', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '02-period-day1-logged', {
      daysAgoStart: 0,
      extraLogs: { start: { isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [] } }
    }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('03 mid-period (day 3 of 5), logged', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '03-period-day3-logged', {
      daysAgoStart: 2,
      extraLogs: {
        start: { isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [] },
        'today': { isPeriod: true, flow: 'medium', symptoms: [] }
      }
    }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('04 last day of period (day 5 of 5), logged', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '04-period-day5-logged', {
      daysAgoStart: 4,
      extraLogs: {
        start: { isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [] },
        'today': { isPeriod: true, flow: 'light', symptoms: [] }
      }
    }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('05 day after period just ended (day 6)', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '05-day-after-period', {
      daysAgoStart: 5,
      extraLogs: {
        start: { isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [] },
        'start+1': { isPeriod: true, flow: 'medium', symptoms: [] },
        'start+2': { isPeriod: true, flow: 'medium', symptoms: [] },
        'start+3': { isPeriod: true, flow: 'light', symptoms: [] },
        'start+4': { isPeriod: true, flow: 'light', symptoms: [] }
      }
    }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('06 mid-follicular phase (day 9-10)', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '06-mid-follicular', { daysAgoStart: 8 }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('07 start of fertile window (day 10-11)', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '07-fertile-window-start', { daysAgoStart: 9 }, true);
    expect(r.pageErrors).toEqual([]);
  });

  test('08 ovulation day itself', async ({ page }, testInfo) => {
    // 28-day cycle, 14-day luteal -> ovulation ~day 14.
    const r = await captureState(page, testInfo, '08-ovulation-day', { daysAgoStart: 13 }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('09 early luteal (day just after ovulation)', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '09-early-luteal', { daysAgoStart: 14 }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('10 late luteal, 2-3 days before next predicted period', async ({ page }, testInfo) => {
    // 28-day cycle -> next period predicted day 29 (i.e. daysAgoStart=28 is day1).
    // 2-3 days before that is cycle day 25-26 -> daysAgoStart 24.
    const r = await captureState(page, testInfo, '10-late-luteal', { daysAgoStart: 24 }, true);
    expect(r.pageErrors).toEqual([]);
  });

  test('11 exactly on predicted next-period day, nothing logged', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '11-predicted-period-today', { daysAgoStart: 28 }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('12 awaiting/delayed period: 3 days past predicted date', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '12-delayed-3-days', { daysAgoStart: 31 }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('13 likely-missed-a-whole-period (~35+ days past predicted)', async ({ page }, testInfo) => {
    // elapsedDays (daysAgoStart) must exceed cycleLength(28)+10=38 to trigger the gold banner.
    const r = await captureState(page, testInfo, '13-likely-missed-period', { daysAgoStart: 40 }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('14 brand-new user: no lastPeriodStartDate, no logs', async ({ page }, testInfo) => {
    const r = await captureState(page, testInfo, '14-brand-new-user', { brandNew: true }, false);
    expect(r.pageErrors).toEqual([]);
  });

  test('15 past day (3 days ago) with nothing logged, via calendar navigation', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    // Mid-cycle "today" (day 15) so the timeline can scroll back 3 days without touching the period.
    await setupCycleState(page, { daysAgoStart: 14 });
    await page.waitForTimeout(400);

    const today = new Date();
    const target = new Date(today);
    target.setDate(target.getDate() - 3);
    const targetKey = key(target);

    // DayPill (src/components/Timeline/DayPill.tsx) renders each day as a button
    // with data-date="YYYY-MM-DD" inside .timeline-strip; click it to select that day.
    const dayButton = page.locator(`[data-date="${targetKey}"]`);
    await expect(dayButton).toBeVisible({ timeout: 10_000 });
    await dayButton.click();
    await page.waitForTimeout(400);

    const slug = '15-past-day-unlogged';
    await page.screenshot({ path: `artifacts/playwright-results/audit-${slug}.png`, fullPage: true, animations: 'disabled', timeout: 15_000 });

    const heroLocator = page.locator('.cycle-summary').first();
    const heroText = (await heroLocator.count()) ? await heroLocator.innerText() : null;
    const catchupLocator = page.locator('.past-catchup-banner').first();
    const catchupText = (await catchupLocator.count()) ? await catchupLocator.innerText() : null;

    let a11yViolationCount = 0;
    let a11yViolationIds: string[] = [];
    try {
      const AxeBuilder = (await import('@axe-core/playwright')).default;
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      a11yViolationCount = result.violations.length;
      a11yViolationIds = result.violations.map(v => v.id);
    } catch (e) {
      a11yViolationIds = [`axe-run-failed: ${(e as Error).message}`];
    }

    const summary15 = { slug, targetKey, heroText, catchupText, consoleErrors, pageErrors, a11yViolationCount, a11yViolationIds };
    await testInfo.attach(`${slug}-summary.json`, {
      body: JSON.stringify(summary15, null, 2),
      contentType: 'application/json'
    });
    appendSummaryToDisk(summary15, testInfo.project.name);

    expect(pageErrors).toEqual([]);
  });

  test('16 future day (5 days from now, near predicted period), via calendar navigation', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    // "today" = day 24 of a 28-day cycle (daysAgoStart=23) -> +5 days lands on day 29 = predicted period day.
    await setupCycleState(page, { daysAgoStart: 23 });
    await page.waitForTimeout(400);

    const today = new Date();
    const target = new Date(today);
    target.setDate(target.getDate() + 5);
    const targetKey = key(target);

    const dayButton = page.locator(`[data-date="${targetKey}"]`);
    await expect(dayButton).toBeVisible({ timeout: 10_000 });
    await dayButton.click();
    await page.waitForTimeout(400);

    const slug = '16-future-day-near-period';
    await page.screenshot({ path: `artifacts/playwright-results/audit-${slug}.png`, fullPage: true, animations: 'disabled', timeout: 15_000 });

    const heroLocator = page.locator('.cycle-summary').first();
    const heroText = (await heroLocator.count()) ? await heroLocator.innerText() : null;

    let a11yViolationCount = 0;
    let a11yViolationIds: string[] = [];
    try {
      const AxeBuilder = (await import('@axe-core/playwright')).default;
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      a11yViolationCount = result.violations.length;
      a11yViolationIds = result.violations.map(v => v.id);
    } catch (e) {
      a11yViolationIds = [`axe-run-failed: ${(e as Error).message}`];
    }

    const summary16 = { slug, targetKey, heroText, consoleErrors, pageErrors, a11yViolationCount, a11yViolationIds };
    await testInfo.attach(`${slug}-summary.json`, {
      body: JSON.stringify(summary16, null, 2),
      contentType: 'application/json'
    });
    appendSummaryToDisk(summary16, testInfo.project.name);

    expect(pageErrors).toEqual([]);
  });
});
