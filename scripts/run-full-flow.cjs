const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const baseUrl = 'https://kekoolanireunion.com';
const outputDir = path.resolve(__dirname, '..', 'output', 'playwright');

const orders = [
  {
    name: 'Tyler Gee',
    email: 'tyler.gee13@icloud.com',
    slug: 'tyler'
  },
  {
    name: 'Pumehana Silva',
    email: 'pumehanasilva@mac.com',
    slug: 'pumehana'
  }
];

const paymentMethods = [
  { value: 'paypal', label: 'PayPal', expectStripe: false },
  { value: 'venmo', label: 'Venmo', expectStripe: false },
  { value: 'check', label: 'Mail-in check', expectStripe: false },
  { value: 'stripe', label: 'Stripe', expectStripe: true }
];

function timestampTag() {
  const now = new Date();
  return now.toISOString().replace(/[-:]/g, '').slice(0, 15);
}

function resolveChromiumPath() {
  const cacheRoot = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!fs.existsSync(cacheRoot)) return null;
  const chromiumDirs = fs
    .readdirSync(cacheRoot)
    .filter((name) => name.startsWith('chromium-'))
    .sort((a, b) => b.localeCompare(a));
  for (const dir of chromiumDirs) {
    const candidate = path.join(
      cacheRoot,
      dir,
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing'
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function fillIfPresent(page, selector, value) {
  const locator = page.locator(selector);
  if (await locator.count()) {
    await locator.first().fill(value);
  }
}

async function selectIfPresent(page, selector, value) {
  const locator = page.locator(selector);
  if (await locator.count()) {
    await locator.first().selectOption(value);
  }
}

async function checkIfPresent(page, selector) {
  const locator = page.locator(selector);
  if (await locator.count()) {
    await locator.first().check();
  }
}

async function fillExtraFields(page) {
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

  const extraInputs = page.locator('input[name^="people.0."]:not([type="checkbox"]):not([type="radio"])');
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

async function runOrder(page, order, method) {
  const tag = timestampTag();
  await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  await page.locator('input[name="people.0.full_name"]').fill(`${order.name} ${tag} (${method.value})`);
  await page.locator('input[name="people.0.age"]').fill('34');
  await page.locator('input[name="people.0.relationship"]').fill('Cousin');
  await page.locator('select[name="people.0.lineage"]').selectOption('Nawai');
  await checkIfPresent(page, 'input[name="people.0.attendance_days"][value="Friday"]');
  await checkIfPresent(page, 'input[name="people.0.attendance_days"][value="Saturday"]');
  await checkIfPresent(page, 'input[name="people.0.attendance_days"][value="Sunday"]');
  await page.locator('input[name="people.0.email"]').fill(order.email);
  await page.locator('input[name="people.0.phone"]').fill('808-555-1212');
  await page.locator('textarea[name="people.0.address"]').fill('123 Test St, Hilo, HI');

  await fillExtraFields(page);

  await selectIfPresent(page, 'select[name="people.0.tshirt_category"]', 'mens');
  await selectIfPresent(page, 'select[name="people.0.tshirt_style"]', 'T-shirt');
  await selectIfPresent(page, 'select[name="people.0.tshirt_size"]', 'M');
  await fillIfPresent(page, 'input[name="people.0.tshirt_quantity"]', '1');

  const addTshirt = page.getByRole('button', { name: 'Add T-shirt' });
  if (await addTshirt.count()) {
    await addTshirt.click();
    await selectIfPresent(page, 'select[name="tshirt_orders.0.category"]', 'womens');
    await selectIfPresent(page, 'select[name="tshirt_orders.0.style"]', 'V-neck');
    await selectIfPresent(page, 'select[name="tshirt_orders.0.size"]', 'S');
    await fillIfPresent(page, 'input[name="tshirt_orders.0.quantity"]', '1');
  }

  await fillIfPresent(page, '#donation_amount', '50');
  await fillIfPresent(page, '#donation_note', `Mahalo from ${order.name}`);

  const methodLabel = page.getByLabel(method.label);
  if (!(await methodLabel.count())) {
    console.log(`Skipping ${method.value} for ${order.email}: option not available.`);
    return;
  }
  if (!(await methodLabel.isEnabled())) {
    console.log(`Skipping ${method.value} for ${order.email}: option disabled.`);
    return;
  }
  await methodLabel.check();

  const submitButton = page.getByRole('button', { name: 'Submit Registration' });
  if (method.expectStripe) {
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 120000 }),
      submitButton.click()
    ]);
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: path.join(outputDir, `stripe-${order.slug}.png`), fullPage: true });
  } else {
    await Promise.all([
      page.waitForURL(/\/success\?/),
      submitButton.click()
    ]);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, `success-${order.slug}-${method.value}.png`), fullPage: true });
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const executablePath = resolveChromiumPath();
  const browser = await chromium.launch({ headless: false, executablePath: executablePath ?? undefined });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const order of orders) {
    for (const method of paymentMethods) {
      await runOrder(page, order, method);
    }
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
