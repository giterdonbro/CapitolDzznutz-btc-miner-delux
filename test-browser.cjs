const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const content = await page.content();
  console.log('HTML CONTENT:', content.substring(0, 500) + '...');
  const appHtml = await page.$eval('#root', el => el.innerHTML).catch(e => e.message);
  console.log('ROOT HTML DUMP:', appHtml.substring(0, 1000));
  await browser.close();
})();
