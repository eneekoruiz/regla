const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const outputDir = 'C:/Users/User/.gemini/antigravity/brain/fdf3526d-6e9c-4789-a144-e2767fa34908';

  const viewports = [
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'desktop-1366', width: 1366, height: 768 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-360', width: 360, height: 740 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    try {
      await page.goto('https://ayudandonos.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Screenshot full page
      await page.screenshot({ path: `${outputDir}/audit-${vp.name}.png`, fullPage: false });

      // Check hero elements
      const heroEl = await page.$('.cycle-summary');
      if (heroEl) {
        const heroBox = await heroEl.boundingBox();
        console.log(`[${vp.name}] .cycle-summary: ${JSON.stringify(heroBox)}`);
      } else {
        console.log(`[${vp.name}] .cycle-summary: NOT FOUND`);
      }

      // Check primary ring
      const primaryRing = await page.$('.cycle-ring-wrap.is-primary');
      if (primaryRing) {
        const ringBox = await primaryRing.boundingBox();
        console.log(`[${vp.name}] .cycle-ring-wrap.is-primary: ${JSON.stringify(ringBox)}`);
        const isVisible = await primaryRing.isVisible();
        console.log(`[${vp.name}]   visible: ${isVisible}`);
      } else {
        console.log(`[${vp.name}] .cycle-ring-wrap.is-primary: NOT FOUND`);
      }

      // Check secondary ring
      const secondaryRing = await page.$('.cycle-ring-wrap.is-secondary');
      if (secondaryRing) {
        const ringBox = await secondaryRing.boundingBox();
        console.log(`[${vp.name}] .cycle-ring-wrap.is-secondary: ${JSON.stringify(ringBox)}`);
        const isVisible = await secondaryRing.isVisible();
        console.log(`[${vp.name}]   visible: ${isVisible}`);
      } else {
        console.log(`[${vp.name}] .cycle-ring-wrap.is-secondary: NOT FOUND`);
      }

      // Check SVG inside primary ring
      const primarySvg = await page.$('.cycle-ring-wrap.is-primary svg');
      if (primarySvg) {
        const svgBox = await primarySvg.boundingBox();
        console.log(`[${vp.name}] primary SVG: ${JSON.stringify(svgBox)}`);
      }

      // Check ring label
      const label = await page.$('.cycle-ring-wrap.is-primary .cycle-ring-label');
      if (label) {
        const labelBox = await label.boundingBox();
        console.log(`[${vp.name}] primary label: ${JSON.stringify(labelBox)}`);
      }

      // Check visuals container
      const visuals = await page.$('.cycle-summary-visuals');
      if (visuals) {
        const visualsBox = await visuals.boundingBox();
        console.log(`[${vp.name}] .cycle-summary-visuals: ${JSON.stringify(visualsBox)}`);
      } else {
        console.log(`[${vp.name}] .cycle-summary-visuals: NOT FOUND`);
      }

      // Check for text overlap - get all text elements inside primary ring
      const texts = await page.$$('.cycle-ring-wrap.is-primary .cycle-ring-label > *');
      for (let i = 0; i < texts.length; i++) {
        const box = await texts[i].boundingBox();
        const text = await texts[i].textContent();
        console.log(`[${vp.name}]   label child[${i}]: "${text?.trim()}" box=${JSON.stringify(box)}`);
      }

      console.log('---');
    } catch (err) {
      console.error(`[${vp.name}] ERROR: ${err.message}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('AUDIT COMPLETE');
})();
