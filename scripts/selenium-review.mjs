import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const folder = 'artifacts/selenium';
await fs.mkdir(folder, { recursive: true });
const origin = process.env.AURA_URL || 'http://127.0.0.1:4175';
const server = process.env.AURA_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let driver;
const results = [];
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* Wait for the local preview server. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().addArguments('--headless=new', '--disable-gpu')).build();
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30000, script: 15000 });
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['narrow', 320, 740], ['tablet', 768, 1024], ['landscape', 844, 390]]) {
    await driver.sendDevToolsCommand('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await driver.get(origin);
    if (name === 'desktop') {
      const localButton = await driver.wait(until.elementLocated(By.xpath('//button[contains(., "Modo Privado Local") or contains(., "modo privado local")]')), 15000);
      await localButton.click();
    }
    await driver.wait(until.elementLocated(By.css('.page-title')), 15000);
    for (const view of ['Mi diario', 'Calendario', 'Herramientas']) {
      await driver.findElement(By.xpath(`//nav[@aria-label="Navegación principal"]//button[normalize-space(.)="${view}"]`)).click();
      await driver.wait(async () => await driver.findElement(By.css('.page-title')).getText() === view, 10000);
      await driver.wait(async () => !(await driver.findElements(By.css('.view-loading'))).length, 10000);
      const size = await driver.executeScript('return { viewport: innerWidth, scroll: document.documentElement.scrollWidth, height: innerHeight };');
      assert.ok(size.scroll <= size.viewport + 1, `${name}: ${view} desborda horizontalmente`);
      assert.equal(size.viewport, width);
      await fs.writeFile(`${folder}/${name}-${view.toLowerCase().replaceAll(' ', '-')}.png`, await driver.takeScreenshot(), 'base64');
      results.push({ viewport: name, view, ...size, passed: true });
    }
    const medication = await driver.findElement(By.xpath('//button[contains(@class,"tool-card")][.//strong[normalize-space(.)="Medicación"]]'));
    // Put the target above fixed mobile navigation, then use a real pointer click.
    await driver.executeScript('arguments[0].scrollIntoView({block:"center",behavior:"instant"})', medication);
    await medication.click();
    const dialog = await driver.wait(until.elementLocated(By.css('dialog[open]')), 10000);
    const bounds = await driver.executeScript('const e=arguments[0], r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:e.scrollWidth>e.clientWidth+1};', dialog);
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.right <= width + 1 && bounds.bottom <= height + 1 && !bounds.overflow, `${name}: diálogo recortado`);
    await fs.writeFile(`${folder}/${name}-medicacion.png`, await driver.takeScreenshot(), 'base64');
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await driver.wait(until.stalenessOf(dialog), 10000);
  }
  await fs.writeFile(`${folder}/results.json`, JSON.stringify(results, null, 2));
  console.log(`Selenium: ${results.length} vistas y ${results.length / 3} diálogos verificados; capturas en ${folder}.`);
} finally {
  await driver?.quit();
  server?.kill();
}
