import { test, expect } from '@playwright/test';
import { seedAccount } from './helpers';

test('measure desktop diary layout across viewports and views', async ({ page }) => {
  await seedAccount(page);
  await page.waitForTimeout(300);

  const viewports = [
    { width: 1366, height: 768, name: '1366x768 (standard laptop)' },
    { width: 1366, height: 680, name: '1366x680 (laptop with browser chrome)' },
    { width: 1280, height: 720, name: '1280x720 (720p monitor)' },
    { width: 1280, height: 640, name: '1280x640 (720p with browser chrome)' },
    { width: 1440, height: 900, name: '1440x900 (MacBook / PC laptop)' },
    { width: 1440, height: 760, name: '1440x760 (MacBook with browser chrome)' },
    { width: 1920, height: 1080, name: '1920x1080 (Desktop 1080p)' },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(100);

    const checkState = async (label: string) => {
      const data = await page.evaluate(() => {
        const ws = document.querySelector('.workspace') as HTMLElement | null;
        return {
          clientHeight: ws?.clientHeight,
          scrollHeight: ws?.scrollHeight,
          overflow: (ws?.scrollHeight || 0) > (ws?.clientHeight || 0),
          scrollDiff: (ws?.scrollHeight || 0) - (ws?.clientHeight || 0),
        };
      });
      console.log(`[${label}] ${vp.name}: overflow = ${data.overflow}, scrollDiff = ${data.scrollDiff}px`);
      if (vp.height >= 650) {
        expect(data.overflow).toBe(false);
      }
    };

    // 1. Today in diary
    await checkState('Diary Today');

    // 2. Click yesterday in timeline
    const pills = page.locator('.day-pill');
    const pillCount = await pills.count();
    if (pillCount >= 3) {
      await pills.nth(0).click();
      await page.waitForTimeout(100);
      await checkState('Diary Past');

      // Click today button or a future pill
      const todayBtn = page.getByRole('button', { name: 'Volver a hoy' });
      if (await todayBtn.isVisible()) {
        await todayBtn.click();
        await page.waitForTimeout(100);
      }
    }
  }
});
