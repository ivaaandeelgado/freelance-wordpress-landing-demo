import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:9419';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { startedAtUtc: new Date().toISOString(), environment: 'Chrome on Windows; desktop and touch tablet viewport emulation. Not a physical iPad or Safari test.', checks: [], errors: [] };
await mkdir('test-results/native', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const manifest = await (await page.request.get(base + '/wp-content/native-demo.json')).json();
  report.runtime = manifest;
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.match(await page.locator('body').innerText(), /Small changes\. A clearer website\./);
  await page.screenshot({ path: 'test-results/native/desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Explore services', exact: true }).click();
  assert.ok(page.url().endsWith('#services'));
  await page.getByText('Can I edit the content myself?', { exact: true }).click();
  assert.equal(await page.getByText(/These headings, paragraphs, cards/).isVisible(), true);
  report.checks.push('Desktop content, service anchor and native FAQ work.');
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobile = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(report.mobile.document <= report.mobile.viewport);
  await page.goto(base);
  await page.screenshot({ path: 'test-results/native/mobile.png', fullPage: true });
  report.checks.push('Frontend fits a 390px mobile viewport.');

  const tablet = await browser.newContext({ viewport: { width: 834, height: 1112 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const editor = await tablet.newPage();
  editor.on('pageerror', error => report.errors.push(error.message));
  await editor.goto(`${base}/wp-admin/post.php?post=${manifest.page_id}&action=edit`);
  if (await editor.locator('#user_login').isVisible()) {
    await editor.locator('#user_login').fill('admin');
    await editor.locator('#user_pass').fill('local-demo-only');
    await editor.locator('#wp-submit').tap();
  }
  await editor.waitForFunction(() => !!window.wp?.data?.select('core/block-editor')?.getBlocks()?.length, null, { timeout: 60000 });
  const dialogClose = editor.getByRole('dialog').getByRole('button', { name: 'Close', exact: true });
  if (await dialogClose.isVisible().catch(() => false)) await dialogClose.tap();
  await editor.keyboard.press('Escape');
  const original = await editor.evaluate(() => wp.data.select('core/editor').getEditedPostContent());
  const blockState = await editor.evaluate(() => {
    const all = nodes => nodes.flatMap(node => [node, ...all(node.innerBlocks)]);
    const blocks = all(wp.data.select('core/block-editor').getBlocks());
    return { count: blocks.length, invalid: blocks.filter(b => !b.isValid).map(b => b.name), names: [...new Set(blocks.map(b => b.name))] };
  });
  assert.deepEqual(blockState.invalid, []);
  assert.equal(blockState.count, 36);
  report.blocks = blockState;
  report.checks.push('All 36 native blocks load without validation errors in the editor.');
  let canvas;
  const canvasDeadline = Date.now() + 45000;
  while (Date.now() < canvasDeadline) {
    const close = editor.getByRole('dialog').getByRole('button', { name: 'Close', exact: true });
    if (await close.isVisible().catch(() => false)) await close.tap();
    for (const frame of editor.frames()) {
      if (await frame.locator('[data-type="core/heading"]').count()) { canvas = frame; break; }
    }
    if (canvas) break;
    await editor.waitForTimeout(500);
  }
  if (!canvas) throw new Error('Editor canvas not found.');
  const heading = canvas.getByText('Small changes. A clearer website.', { exact: true });
  await heading.tap();
  await heading.fill('A small change, ready for mobile.');
  const save = editor.getByRole('button', { name: /^(Save|Update)$/, exact: true }).first();
  await save.tap();
  await editor.waitForFunction(() => !wp.data.select('core/editor').isSavingPost() && !wp.data.select('core/editor').isEditedPostDirty(), null, { timeout: 45000 });
  await editor.screenshot({ path: 'test-results/native/editor-tablet.png', fullPage: true });
  const updated = await tablet.newPage();
  await updated.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await updated.getByRole('heading', { name: 'A small change, ready for mobile.', exact: true }).count(), 1);
  report.checks.push('Touch-emulated tablet: change heading through editor controls, tap Save and verify the published page.');
  await updated.reload();
  assert.equal(await updated.getByRole('heading', { name: 'A small change, ready for mobile.', exact: true }).count(), 1);
  report.checks.push('Saved text survives frontend reload.');
  await editor.evaluate(async ({ id, content }) => { await wp.apiFetch({ path: `/wp/v2/pages/${id}`, method: 'POST', data: { content } }); }, { id: manifest.page_id, content: original });
  report.cleanup = 'Original demo text restored through WordPress REST API.';
  assert.equal(report.errors.length, 0, 'Unexpected JavaScript errors');
  report.passed = true;
  console.log(JSON.stringify({ passed: true, checks: report.checks, mobile: report.mobile, blocks: report.blocks.count }));
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  for (const context of browser.contexts()) {
    const page = context.pages().at(-1);
    if (page) await page.screenshot({ path: `test-results/native/failure-${browser.contexts().indexOf(context)}.png` }).catch(() => {});
  }
  console.log(JSON.stringify({ passed: false, failure: error.message, errors: report.errors }));
  process.exitCode = 1;
} finally {
  report.finishedAtUtc = new Date().toISOString();
  await writeFile('test-results/native/editor-verification.json', JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
