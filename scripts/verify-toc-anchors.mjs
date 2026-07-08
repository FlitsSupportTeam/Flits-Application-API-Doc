/**
 * Verify anchor TOC across overview, folder, and API pages.
 * Run: node scripts/verify-toc-anchors.mjs  (server on :60839)
 */
import { chromium } from 'playwright';

const base = process.env.TOC_TEST_URL || 'http://127.0.0.1:60839';

const PAGES = [
  { hash: '#overview', label: 'overview' },
  { hash: '#flits-loyalty-app', label: 'folder' },
  {
    hash: '#flits-loyalty-app-flits-loyalty-app-get-balance-get-customer-points-balance-loyalty-store-credits',
    label: 'api',
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();
const failures = [];

for (const { hash, label } of PAGES) {
  await page.goto(`${base}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#toc-list .toc__link[href^="#"]', { timeout: 20000 });

  const links = await page.$$eval('#toc-list .toc__link[href^="#"]', (els) =>
    els.map((a) => ({ href: a.getAttribute('href'), text: a.textContent?.trim() }))
  );

  if (!links.length) {
    failures.push(`${label}: no anchor TOC links`);
    continue;
  }

  for (let i = 0; i < Math.min(links.length, 4); i++) {
    const id = links[i].href.slice(1);
    const before = await page.evaluate(() => document.getElementById('page-scroll')?.scrollTop ?? 0);

    await page.click(`#toc-list .toc__link[href="${links[i].href}"]`);
    await page.waitForTimeout(600);

    const after = await page.evaluate((sectionId) => {
      const scroller = document.getElementById('page-scroll');
      const el = document.getElementById(sectionId);
      if (!scroller || !el) return { scrollTop: 0, inView: false, hash: location.hash };
      const sr = scroller.getBoundingClientRect();
      const tr = el.getBoundingClientRect();
      const inView = tr.top >= sr.top - 120 && tr.top <= sr.bottom;
      return { scrollTop: scroller.scrollTop, inView, hash: location.hash };
    }, id);

    const scrolled = after.scrollTop > before + 20 || (i === 0 && after.inView);
    const ok = after.inView || (i > 0 && after.scrollTop !== before);

    if (!ok && i > 0) {
      failures.push(
        `${label} link #${id} (${links[i].text}): scroll ${before}→${after.scrollTop}, inView=${after.inView}, hash=${after.hash}`
      );
    }
  }
}

await browser.close();

if (failures.length) {
  console.error('TOC verification FAILED:\n', failures.join('\n'));
  process.exit(1);
}

console.log('TOC verification passed for', PAGES.map((p) => p.label).join(', '));
process.exit(0);
