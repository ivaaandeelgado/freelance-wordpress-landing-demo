import { test, expect } from '@playwright/test';

const sample = { name: '  Alex Taylor  ', email: 'alex@example.test', service: 'landing', message: '  A fictional landing page with supplied content.  ', website: '' };

async function api(page, body, nonce = true) {
  return page.evaluate(async ({ body, nonce }) => {
    const response = await fetch(window.LumaDemo.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(nonce ? { 'X-WP-Nonce': window.LumaDemo.nonce } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), cache: response.headers.get('Cache-Control') };
  }, { body, nonce });
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('the PHP handler normalizes valid input without persistence or mail delivery', async ({ page }) => {
  const response = await api(page, sample);
  expect(response.status).toBe(200);
  expect(response.data.enquiry.name).toBe('Alex Taylor');
  expect(response.data.enquiry.message).toBe(sample.message.trim());
  expect(response.data.stored).toBe(false);
  expect(response.data.delivery).toBe('demo_no_email');
  expect(response.cache).toContain('no-store');
});

test('server validation rejects requests bypassing HTML controls', async ({ page }) => {
  const response = await api(page, { ...sample, name: '  ', email: 'bad-email', service: 'unlisted', message: ['wrong type'] });
  expect(response.status).toBe(422);
  expect(Object.keys(response.data.data.fields).sort()).toEqual(['email', 'message', 'name', 'service']);
  const stripped = await api(page, { ...sample, name: '<b></b>', message: '<strong></strong>' });
  expect(stripped.status).toBe(422);
  expect(Object.keys(stripped.data.data.fields).sort()).toEqual(['message', 'name']);
});

test('nonce, honeypot and payload limits are checked on the server', async ({ page }) => {
  expect((await api(page, sample, false)).status).toBe(403);
  expect((await api(page, { ...sample, website: 'https://example.test' })).status).toBe(400);
  expect((await api(page, { ...sample, message: 'x'.repeat(5000) })).status).toBe(413);
});

test('connection failure preserves the enquiry and allows a successful retry', async ({ page }) => {
  await page.getByLabel('Your name', { exact: true }).fill('Alex Taylor');
  await page.getByLabel('Email address').fill(sample.email);
  await page.getByLabel('What would you like to improve?').selectOption('landing');
  await page.getByLabel('A little about your project').fill(sample.message.trim());
  const target = await page.evaluate(() => window.LumaDemo.endpoint);
  await page.route(target, route => route.abort());
  await page.getByRole('button', { name: 'Preview enquiry' }).click();
  await expect(page.getByRole('status')).toContainText('Your text is still here');
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Alex Taylor');
  await expect(page.getByRole('button', { name: 'Preview enquiry' })).toBeEnabled();
  await page.unroute(target);
  await page.getByRole('button', { name: 'Preview enquiry' }).click();
  await expect(page.getByRole('status')).toContainText('Checked by WordPress');
});
