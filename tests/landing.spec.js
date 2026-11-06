import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test.beforeAll(async () => { await mkdir('evidence', { recursive: true }); });

test('WordPress renders a real Elementor page, meaningful links and desktop layout', async ({ page, request }) => {
  const response = await request.get('/wp-content/uploads/demo-verification.json');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.elementor_edit_mode).toBe('builder');
  expect(manifest.element_count).toBeGreaterThanOrEqual(7);
  await writeFile('evidence/runtime-versions.json', JSON.stringify(manifest, null, 2));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A website thatfeels like you.');
  expect(await page.locator('.elementor-widget-heading').count()).toBeGreaterThan(8);
  await expect(page.getByText('PERSONAL CONCEPT DEMO')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('link', { name: 'Find your starting point' }).click();
  await expect(page).toHaveURL(/#services$/);
  await page.goto('/');
  await page.screenshot({ path: 'evidence/desktop.png', fullPage: true });
});

test('form rejects invalid input and validates fictional data with the local WordPress API', async ({ page }) => {
  await page.goto('/');
  const submissions = [];
  page.on('request', request => { if (request.method() !== 'GET') submissions.push(request.url()); });
  await page.getByRole('button', { name: 'Preview enquiry' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  expect(await page.locator('#project-form').evaluate(form => form.checkValidity())).toBeFalsy();
  await page.getByLabel('Your name').fill('   ');
  await page.getByLabel('Email address').fill('alex@example.test');
  await page.getByLabel('What would you like to improve?').selectOption({ label: 'A simple landing page' });
  await page.getByLabel('A little about your project').fill('A fictional page with supplied design and text.');
  await page.getByRole('button', { name: 'Preview enquiry' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  await page.getByLabel('Your name').fill('Alex Taylor');
  await page.getByRole('button', { name: 'Preview enquiry' }).click();
  await expect(page.getByRole('status')).toContainText('Checked by WordPress, Alex Taylor.');
  await expect(page.getByRole('status')).toContainText('no email was sent and nothing was saved');
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toContain('luma-demo');
  expect(new URL(submissions[0]).hostname).toBe('127.0.0.1');
  await page.screenshot({ path: 'evidence/enquiry-validated.png', fullPage: true });
  await page.reload();
  await expect(page.getByLabel('Your name')).toHaveValue('');
});

test('mobile layout stays within viewport and enquiry/FAQ controls work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /Let’s talk/ }).click();
  await expect(page).toHaveURL(/#contact$/);
  await page.getByText('Is this a real business enquiry form?').click();
  await expect(page.getByText(/WordPress checks a local preview/)).toBeVisible();
  await page.getByText('Is this a real business enquiry form?').click();
  await page.goto('/');
  await page.screenshot({ path: 'evidence/mobile.png', fullPage: true });
});
