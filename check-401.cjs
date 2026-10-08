const { chromium } = require('/Users/fajarpahlawan/narriv/node_modules/@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const all401s = [];
  page.on('response', async r => { if (r.status() === 401) all401s.push(r.url()); });
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('Warning') && !msg.text().includes('favicon')) {
      console.log('CONSOLE:', msg.text().slice(0, 200));
    }
  });

  await page.goto('https://narriv.digital/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator("button:has-text('Demo'), a:has-text('Demo')").first();
  await demoBtn.click();
  await page.waitForTimeout(4000);

  console.log('\nAll 401 URLs:');
  all401s.forEach(u => console.log(' -', u.replace('https://narriv-api.vercel.app','')));
  if (all401s.length === 0) console.log('  (none - PASS!)');
  else console.log('\nRESULT: FAIL -', all401s.length, '401s found');

  await browser.close();
  process.exit(all401s.length > 0 ? 1 : 0);
})();
