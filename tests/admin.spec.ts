import { test, expect } from '@playwright/test';

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('Missing PLAYWRIGHT_ADMIN_EMAIL or PLAYWRIGHT_ADMIN_PASSWORD in environment');
}

async function signIn(page: any) {
  await page.goto('/admin-login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/admin');
  await expect(page.getByRole('heading', { name: 'Reunion operations, in one place.' })).toBeVisible();
}

test.describe('admin smoke', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('overview loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Registration snapshot' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Latest Orders' })).toBeVisible();
  });

  test('sections page loads', async ({ page }) => {
    await page.goto('/admin/sections');
    await expect(page.getByRole('heading', { name: 'Homepage Content' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Custom Content Blocks' })).toBeVisible();
  });

  test('tickets page loads', async ({ page }) => {
    await page.goto('/admin/tickets');
    await expect(page.getByRole('heading', { name: 'Ticket Types' })).toBeVisible();
  });

  test('registration fields page loads', async ({ page }) => {
    await page.goto('/admin/questions');
    await expect(page.getByRole('heading', { name: 'Registration Questions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Participant Details' })).toBeVisible();
  });

  test('orders page loads and export works', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Orders & Attendees' })).toBeVisible();
    const response = await page.request.get('/admin/orders/export');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Order ID');
  });
});
