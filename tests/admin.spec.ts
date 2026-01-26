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

function uniqueSlug() {
  return `test-${Date.now()}`;
}

test.describe('admin smoke', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('overview loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Registration snapshot' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Latest Orders' })).toBeVisible();
  });

  test('site content can be updated and restored', async ({ page }) => {
    await page.goto('/admin/sections');
    const subtitleInput = page.getByLabel('Hero Subtitle');
    const originalSubtitle = await subtitleInput.inputValue();
    const nextSubtitle = `${originalSubtitle} (admin test)`;

    await subtitleInput.fill(nextSubtitle);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(subtitleInput).toHaveValue(nextSubtitle);

    await subtitleInput.fill(originalSubtitle);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(subtitleInput).toHaveValue(originalSubtitle);
  });

  test('sections can be drafted, edited, and show delete controls', async ({ page }) => {
    await page.goto('/admin/sections');
    const slug = uniqueSlug();
    const addSectionButton = page.getByRole('button', { name: 'Add section' });
    await addSectionButton.scrollIntoViewIfNeeded();
    await addSectionButton.click();

    const sectionCard = page
      .locator('div.card')
      .filter({ has: page.getByRole('button', { name: 'Create section' }) })
      .last();
    await expect(sectionCard).toBeVisible();

    const titleInput = sectionCard.locator('input:not([type="hidden"])').first();
    await titleInput.fill(`Test Section ${slug}`);
    await sectionCard.locator('textarea').first().fill(`Test body ${slug}`);
    await sectionCard.getByRole('button', { name: 'Discard' }).click();
    await expect(page.locator(`input[value="Test Section ${slug}"]`)).toHaveCount(0);

    const existingCard = page
      .locator('div.card')
      .filter({ hasText: 'Section title' })
      .first();
    const existingTitleInput = existingCard.locator('input:not([type="hidden"])').first();
    const originalTitle = await existingTitleInput.inputValue();
    const updatedTitle = `${originalTitle} (edited)`;
    await existingTitleInput.fill(updatedTitle);
    await existingCard.getByRole('button', { name: 'Save section' }).click();
    await expect(existingTitleInput).toHaveValue(updatedTitle);

    await existingTitleInput.fill(originalTitle);
    await existingCard.getByRole('button', { name: 'Save section' }).click();
    await expect(existingTitleInput).toHaveValue(originalTitle);

    await expect(existingCard.getByRole('button', { name: 'Delete section' })).toBeVisible();
  });

  test('tickets can be created, edited, and deleted', async ({ page }) => {
    await page.goto('/admin/tickets');
    const slug = uniqueSlug();

    await page.getByLabel('Name').last().fill(`Test Ticket ${slug}`);
    await page.getByLabel('Price (cents)').last().fill('1234');
    await page.getByLabel('Description').last().fill('Test ticket description');
    await page.getByRole('button', { name: 'Save Ticket' }).last().click();

    const ticketCard = page
      .locator(`input[value="Test Ticket ${slug}"]`)
      .locator('xpath=ancestor::div[contains(@class, "card")]');
    await ticketCard.getByLabel('Description').fill('Updated description');
    await ticketCard.getByRole('button', { name: 'Save Ticket' }).click();

    await ticketCard.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator(`input[value="Test Ticket ${slug}"]`)).toHaveCount(0);
  });

  test('registration fields can be created and deleted', async ({ page }) => {
    await page.goto('/admin/questions');
    const slug = uniqueSlug();

    await page.getByLabel('Field Key').last().fill(`test_field_${slug}`);
    await page.getByLabel('Label').last().fill(`Test Field ${slug}`);
    await page.getByRole('button', { name: 'Add Field' }).click();

    const fieldCard = page
      .locator(`input[value="Test Field ${slug}"]`)
      .locator('xpath=ancestor::div[contains(@class, "card")]');
    await expect(fieldCard).toBeVisible();
    await fieldCard.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator(`input[value="Test Field ${slug}"]`)).toHaveCount(0);
  });

  test('questions can be created and deleted', async ({ page }) => {
    await page.goto('/admin/questions');
    const slug = uniqueSlug();

    await page.getByLabel('Prompt').last().fill(`Test Question ${slug}`);
    await page.getByRole('button', { name: 'Add Question' }).click();

    const questionCard = page
      .locator(`input[value="Test Question ${slug}"]`)
      .locator('xpath=ancestor::div[contains(@class, "card")]');
    await expect(questionCard).toBeVisible();
    await questionCard.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator(`input[value="Test Question ${slug}"]`)).toHaveCount(0);
  });

  test('orders page loads, export works, and participant toggles update', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Orders & Attendees' })).toBeVisible();
    const response = await page.request.get('/admin/orders/export');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Order ID');

    const showNameToggle = page.getByLabel('Show name').first();
    if (await showNameToggle.count()) {
      await showNameToggle.click();
      await showNameToggle.click();
    }

    const deleteButtons = page.getByRole('button', { name: 'Delete order' });
    if (await deleteButtons.count()) {
      page.once('dialog', (dialog) => dialog.accept());
      await deleteButtons.first().click();
    }
  });
});
