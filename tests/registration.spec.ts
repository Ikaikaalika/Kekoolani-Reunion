import { test, expect } from '@playwright/test';

async function fillExtraFields(page: any) {
  const knownFields = new Set([
    'people.0.full_name',
    'people.0.age',
    'people.0.relationship',
    'people.0.lineage',
    'people.0.attendance_days',
    'people.0.email',
    'people.0.phone',
    'people.0.address',
    'people.0.tshirt_category',
    'people.0.tshirt_style',
    'people.0.tshirt_size',
    'people.0.tshirt_quantity',
    'people.0.same_contact',
    'people.0.show_name',
    'people.0.show_photo',
    'people.0.attending'
  ]);

  const extraInputs = page.locator(
    'input[name^="people.0."]:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])'
  );
  const inputCount = await extraInputs.count();
  for (let i = 0; i < inputCount; i += 1) {
    const input = extraInputs.nth(i);
    const name = (await input.getAttribute('name')) ?? '';
    if (!name || knownFields.has(name)) continue;
    const currentValue = await input.inputValue();
    if (!currentValue) {
      await input.fill('Test');
    }
  }

  const extraTextareas = page.locator('textarea[name^="people.0."]');
  const textareaCount = await extraTextareas.count();
  for (let i = 0; i < textareaCount; i += 1) {
    const textarea = extraTextareas.nth(i);
    const name = (await textarea.getAttribute('name')) ?? '';
    if (!name || knownFields.has(name)) continue;
    const currentValue = await textarea.inputValue();
    if (!currentValue) {
      await textarea.fill('Test');
    }
  }
}

async function fillPrimaryParticipant(page: any) {
  await page.locator('input[name="people.0.full_name"]').fill('Test Attendee');
  await page.locator('input[name="people.0.age"]').fill('25');
  await page.locator('input[name="people.0.relationship"]').fill('Cousin');
  await page.locator('select[name="people.0.lineage"]').selectOption('Nawai');
  await page.locator('input[name="people.0.attendance_days"][value="Friday"]').check();
  await page.locator('input[name="people.0.attendance_days"][value="Saturday"]').check();
  await page.locator('input[name="people.0.attendance_days"][value="Sunday"]').check();
  await page.locator('input[name="people.0.email"]').fill('test@example.com');
  await page.locator('input[name="people.0.phone"]').fill('808-555-1111');
  await page.locator('#person-0-address-street').fill('123 Test St');
  await page.locator('#person-0-address-city').fill('Hilo');
  await page.locator('#person-0-address-state').fill('HI');
  await page.locator('#person-0-address-zip').fill('96720');
  await fillExtraFields(page);
}

test('registration: paid attendee with t-shirt and paypal link', async ({ page }) => {
  await page.route('**/api/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redirectUrl: '/success?order=order-123&status=pending&method=paypal&amount=6000'
      })
    });
  });

  await page.goto('/register');
  await fillPrimaryParticipant(page);

  await page.locator('select[name="people.0.tshirt_category"]').selectOption('mens');
  await page.locator('select[name="people.0.tshirt_style"]').selectOption('T-shirt');
  await page.locator('select[name="people.0.tshirt_size"]').selectOption('M');
  await page.locator('input[name="people.0.tshirt_quantity"]').fill('1');

  await page.getByRole('button', { name: 'Add T-shirt' }).click();
  await page.locator('select[name="tshirt_orders.0.category"]').selectOption('womens');
  await page.locator('select[name="tshirt_orders.0.style"]').selectOption('V-neck');
  await page.locator('select[name="tshirt_orders.0.size"]').selectOption('S');
  await page.locator('input[name="tshirt_orders.0.quantity"]').fill('1');

  await page.getByLabel('PayPal').check();
  await page.locator('input[name="paypal_username"]').fill('paypal-test-user');
  await page.getByRole('button', { name: 'Submit Registration' }).click();

  await expect(page).toHaveURL(/\/success\?/);
  await expect(page.getByText('Pay with PayPal')).toBeVisible();
  await expect(page.getByText('($60.00 USD)')).toBeVisible();
});

test('registration: free attendee disables payment options', async ({ page }) => {
  await page.route('**/api/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redirectUrl: '/success?order=order-124&status=pending&method=check&amount=0'
      })
    });
  });

  await page.goto('/register');
  await page.locator('input[name="people.0.full_name"]').fill('Free Keiki');
  await page.locator('input[name="people.0.age"]').fill('2');
  await page.locator('input[name="people.0.relationship"]').fill('Grandchild');
  await page.locator('select[name="people.0.lineage"]').selectOption('Amy');
  await page.locator('input[name="people.0.attendance_days"][value="Friday"]').check();
  await page.locator('input[name="people.0.email"]').fill('free@example.com');
  await page.locator('input[name="people.0.phone"]').fill('808-555-2222');
  await page.locator('#person-0-address-street').fill('456 Test Rd');
  await page.locator('#person-0-address-city').fill('Hilo');
  await page.locator('#person-0-address-state').fill('HI');
  await page.locator('#person-0-address-zip').fill('96720');
  await fillExtraFields(page);

  const stripe = page.getByLabel(/Pay with Card|Stripe/);
  const paypal = page.getByLabel('PayPal');
  const check = page.getByLabel('Mail-in check');

  await expect(stripe).toBeDisabled();
  await expect(paypal).toBeDisabled();
  await expect(check).toBeDisabled();

  await page.getByRole('button', { name: 'Submit Registration' }).click();
  await expect(page).toHaveURL(/\/success\?/);
});

test('registration: venmo attendee includes username', async ({ page }) => {
  await page.route('**/api/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redirectUrl: '/success?order=order-126&status=pending&method=venmo&amount=3500'
      })
    });
  });

  await page.goto('/register');
  await fillPrimaryParticipant(page);

  await page.getByLabel('Venmo').check();
  await page.locator('input[name="venmo_username"]').fill('venmo-test-user');
  await page.getByRole('button', { name: 'Submit Registration' }).click();

  await expect(page).toHaveURL(/\/success\?/);
  await expect(page.getByText('Registration received')).toBeVisible();
});

test('registration: not attending allows t-shirt only', async ({ page }) => {
  await page.route('**/api/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redirectUrl: '/success?order=order-125&status=pending&method=check&amount=2500'
      })
    });
  });

  await page.goto('/register');
  await page.locator('input[name="people.0.full_name"]').fill('No Show');
  await page.locator('input[name="people.0.age"]').fill('30');
  await page.locator('input[name="people.0.relationship"]').fill('Cousin');
  await page.locator('select[name="people.0.lineage"]').selectOption('Katherine');
  await page.locator('input[name="people.0.attendance_days"][value="Friday"]').check();
  await page.locator('input[name="people.0.email"]').fill('noshow@example.com');
  await page.locator('input[name="people.0.phone"]').fill('808-555-3333');
  await page.locator('#person-0-address-street').fill('789 Test Ave');
  await page.locator('#person-0-address-city').fill('Hilo');
  await page.locator('#person-0-address-state').fill('HI');
  await page.locator('#person-0-address-zip').fill('96720');
  await fillExtraFields(page);

  await page.getByLabel('Attending in person').uncheck();

  await page.locator('select[name="people.0.tshirt_category"]').selectOption('womens');
  await page.locator('select[name="people.0.tshirt_style"]').selectOption('Tank top');
  await page.locator('select[name="people.0.tshirt_size"]').selectOption('S');
  await page.locator('input[name="people.0.tshirt_quantity"]').fill('1');

  await page.getByLabel('Mail-in check').check();
  await page.locator('input[name="check_mailing_address_confirm"]').check();
  await page.getByRole('button', { name: 'Submit Registration' }).click();

  await expect(page).toHaveURL(/\/success\?/);
  await expect(page.getByText('Amount to mail:')).toBeVisible();
  await expect(page.getByText('Mailing Address', { exact: true })).toBeVisible();
});

test('registration: typing state does not overwrite city', async ({ page }) => {
  await page.goto('/register');

  const city = page.locator('#person-0-address-city');
  const state = page.locator('#person-0-address-state');

  await city.fill('Hilo');
  await state.click();
  await state.type('H');

  await expect(city).toHaveValue('Hilo');
  await expect(state).toHaveValue('H');

  await state.type('I');

  await expect(city).toHaveValue('Hilo');
  await expect(state).toHaveValue('HI');
});
