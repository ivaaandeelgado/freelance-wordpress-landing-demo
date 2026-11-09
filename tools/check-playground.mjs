import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const previewOnly = process.argv.includes('--local-blueprint');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'test-results/playground');
await mkdir(out, { recursive: true });
const blueprintUrl = 'https://raw.githubusercontent.com/ivaaandeelgado/freelance-wordpress-landing-demo/main/docs/playground.json';
const url = `https://playground.wordpress.net/?mode=seamless&blueprint-url=${encodeURIComponent(blueprintUrl)}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { startedAtUtc: new Date().toISOString(), mode: previewOnly ? 'local-blueprint-intercept-only' : 'public-unmodified-url', url, checks: [], errors: [], expectedValidationErrors: [] };
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
page.on('console', message => {
  if (message.type() !== 'error') return;
  const error = { message: message.text().slice(0, 400), url: message.location().url };
  if (/status of (422|403)/.test(error.message) && error.url.includes('luma-demo')) report.expectedValidationErrors.push(error);
  else report.errors.push(error);
});
if (previewOnly) {
  const body = await readFile(resolve(root, 'docs/playground.json'), 'utf8');
  await context.route(blueprintUrl, route => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body,
  }));
}
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('Waiting for browser WordPress and Elementor.');
  let site;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (await frame.locator('#project-form').count().catch(() => 0)) { site = frame; break; }
    }
    if (site) break;
    await page.waitForTimeout(1000);
  }
  if (!site) throw new Error('Luma did not load: ' + (await page.locator('body').innerText()).slice(0, 1500));
  const runtimeBase = site.url();
  assert.match(await site.getByRole('heading', { level: 1 }).innerText(), /A website that/);
  assert.ok(await site.locator('.elementor-widget-heading').count() > 8);
  report.checks.push({ check: 'real Elementor landing page loaded' });
  await page.screenshot({ path: resolve(out, 'desktop.png'), fullPage: true });
  await site.getByRole('link', { name: 'Find your starting point' }).click();
  assert.ok(site.url().endsWith('#services'));
  report.checks.push({ check: 'service anchor navigation' });
  await site.getByRole('button', { name: 'Preview enquiry' }).click();
  assert.equal(await site.locator('#project-form').evaluate(form => form.checkValidity()), false);
  report.checks.push({ check: 'empty form rejected' });
  await site.getByLabel('Your name', { exact: true }).fill('Alex Taylor');
  await site.getByLabel('Email address').fill('alex@example.test');
  await site.getByLabel('What would you like to improve?').selectOption('landing');
  await site.getByLabel('A little about your project').fill('A fictional landing page with supplied content.');
  await site.getByRole('button', { name: 'Preview enquiry' }).click();
  await site.waitForFunction(() => document.querySelector('#form-result')?.textContent.includes('Checked by WordPress'), null, { timeout: 50000 });
  const message = await site.locator('#form-result').innerText();
  assert.match(message, /no email was sent and nothing was saved/);
  report.checks.push({ check: 'PHP validates fictional enquiry', result: message });
  const serverChecks = await site.evaluate(async () => {
    const sample = { name: 'Alex Taylor', email: 'alex@example.test', service: 'landing', message: 'A fictional landing page with supplied content.', website: '' };
    const post = async (body, nonce = true) => {
      const r = await fetch(window.LumaDemo.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(nonce ? { 'X-WP-Nonce': window.LumaDemo.nonce } : {}) }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() };
    };
    return { valid: await post(sample), invalid: await post({ ...sample, email: 'invalid', service: 'unknown' }), missingNonce: await post(sample, false) };
  });
  assert.equal(serverChecks.valid.status, 200);
  assert.equal(serverChecks.valid.body.stored, false);
  assert.equal(serverChecks.valid.body.delivery, 'demo_no_email');
  assert.equal(serverChecks.invalid.status, 422);
  assert.equal(serverChecks.missingNonce.status, 403);
  report.checks.push({ check: 'server rejects invalid fields and missing nonce', invalidStatus: 422, missingNonceStatus: 403 });
  await page.setViewportSize({ width: 390, height: 844 });
  report.viewport = await site.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(report.viewport.document <= report.viewport.viewport);
  await site.getByText('Is this a real business enquiry form?', { exact: true }).click();
  assert.equal(await site.getByText(/WordPress checks a local preview/).isVisible(), true);
  report.checks.push({ check: 'mobile layout and FAQ' });
  await page.screenshot({ path: resolve(out, 'mobile.png') });
  await site.goto(new URL('wp-admin/edit.php?post_type=page', runtimeBase).href);
  await site.getByRole('heading', { name: 'Pages', exact: true }).waitFor();
  report.checks.push({ check: 'WordPress admin page list available', titles: await site.locator('.row-title').allTextContents() });
  assert.equal(report.errors.length, 0, 'Unexpected browser errors');
  report.passed = true;
  console.log(JSON.stringify({ passed: true, checks: report.checks, viewport: report.viewport }));
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  console.log(JSON.stringify({ passed: false, failure: error.message, errors: report.errors }));
  process.exitCode = 1;
} finally {
  report.finishedAtUtc = new Date().toISOString();
  await writeFile(resolve(out, previewOnly ? 'local-review.json' : 'public-review.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
