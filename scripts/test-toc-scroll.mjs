import { chromium } from 'playwright';

const base = process.env.TOC_TEST_URL || 'http://127.0.0.1:60839';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', (msg) => console.log('browser:', msg.text()));
page.on('pageerror', (err) => console.error('pageerror:', err.message));

await page.goto(`${base}/#flits-loyalty-app`, { waitUntil: 'networkidle' });
await page.waitForSelector('#toc-list .toc__link', { timeout: 15000 });

const before = await page.evaluate(() => ({
  scrollTop: document.getElementById('page-scroll')?.scrollTop,
  tocCount: document.querySelectorAll('#toc-list .toc__link').length,
}));

const secondLink = await page.$('#toc-list .toc__link:nth-child(2)');
const href = await secondLink?.getAttribute('href');
const linkId = href?.startsWith('#') ? href.slice(1) : null;
console.log('Clicking TOC:', linkId, 'scroll before:', before.scrollTop);

await secondLink?.click();
await page.waitForTimeout(800);

const after = await page.evaluate(() => {
  const link = document.querySelector('#toc-list .toc__link:nth-child(2)');
  const id = link?.getAttribute('href')?.replace(/^#/, '') || '';
  return {
    scrollTop: document.getElementById('page-scroll')?.scrollTop,
    hash: location.hash,
    targetExists: !!document.getElementById(id),
  };
});

console.log('After click:', after);
console.log('Scroll delta:', (after.scrollTop ?? 0) - (before.scrollTop ?? 0));

await browser.close();
process.exit((after.scrollTop ?? 0) > 50 ? 0 : 1);
