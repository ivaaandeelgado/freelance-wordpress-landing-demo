import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const blueprint = 'https://raw.githubusercontent.com/ivaaandeelgado/freelance-wordpress-landing-demo/main/docs/native-playground.json';
const url = `https://playground.wordpress.net/?mode=seamless&blueprint-url=${encodeURIComponent(blueprint)}`;
const report = { startedAtUtc: new Date().toISOString(), url, mode: 'public-unmodified-url', checks: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('test-results/native', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let site;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (await frame.getByRole('heading', { name: 'Small changes. A clearer website.', exact: true }).count().catch(() => 0)) { site = frame; break; }
    }
    if (site) break;
    await page.waitForTimeout(1000);
  }
  if (!site) throw new Error('Native WordPress browser demo did not load.');
  const runtime = site.url();
  report.checks.push('Published blueprint loads the native WordPress page.');
  await site.getByRole('link', { name: 'Explore services', exact: true }).click();
  assert.ok(site.url().endsWith('#services'));
  report.checks.push('Service anchor navigation works.');
  await site.getByText('Can I edit the content myself?', { exact: true }).click();
  assert.equal(await site.getByText(/These headings, paragraphs, cards/).isVisible(), true);
  report.checks.push('Native FAQ opens.');
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobile = await site.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(report.mobile.document <= report.mobile.viewport);
  report.checks.push('Frontend stays within a 390px mobile viewport.');
  await page.screenshot({ path: 'test-results/native/public-mobile.png' });
  const manifest = await site.evaluate(async () => (await fetch(new URL('wp-content/native-demo.json', document.location.href))).json());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await site.goto(new URL(`wp-admin/post.php?post=${manifest.page_id}&action=edit`, runtime).href);
  await site.waitForFunction(() => !!window.wp?.data?.select('core/block-editor')?.getBlocks()?.length, null, { timeout: 60000 });
  report.blocks = await site.evaluate(() => {
    const all = nodes => nodes.flatMap(n => [n, ...all(n.innerBlocks)]);
    const blocks = all(wp.data.select('core/block-editor').getBlocks());
    return { count: blocks.length, invalid: blocks.filter(b => !b.isValid).map(b => b.name), names: [...new Set(blocks.map(b => b.name))] };
  });
  assert.equal(report.blocks.count, 36);
  assert.deepEqual(report.blocks.invalid, []);
  assert.ok(report.blocks.names.every(name => name.startsWith('core/')));
  report.checks.push('Published blueprint opens in the editor with 36 valid core blocks.');
  assert.equal(report.errors.length, 0);
  report.passed = true;
  console.log(JSON.stringify({ passed: true, checks: report.checks.length, blocks: report.blocks.count, mobile: report.mobile }));
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  console.log(JSON.stringify({ passed: false, failure: error.message, errors: report.errors }));
  process.exitCode = 1;
} finally {
  report.finishedAtUtc = new Date().toISOString();
  await writeFile('test-results/native/public-review.json', JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
