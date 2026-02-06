const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.ADMIN_SMOKE_BASE_URL || 'https://www.kekoolanireunion.com';
const outputDir = path.resolve(__dirname, '..', 'output', 'playwright');
const envPath = path.resolve(__dirname, '..', '.env.local');

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  const raw = fs.readFileSync(filepath, 'utf8');
  raw.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (!key) return;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
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

async function login(page, email, password) {
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/admin-login')) {
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await Promise.all([
      page.waitForURL('**/admin', { timeout: 60000 }),
      page.getByRole('button', { name: 'Sign In' }).click()
    ]);
  }
  await page.waitForLoadState('networkidle');
}

async function capture(page, name) {
  const safe = name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const filename = `${safe}-${new Date().toISOString().replace(/[:.]/g, '')}.png`;
  const filePath = path.join(outputDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function main() {
  loadEnvFile(envPath);

  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '';
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error('Missing admin credentials in environment.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const executablePath = resolveChromiumPath();
  const browser = await chromium.launch({ headless: true, executablePath: executablePath ?? undefined });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  await login(page, email, password);
  const screenshots = [];

  screenshots.push(await capture(page, 'admin-overview'));

  const routes = [
    { path: '/admin/sections', waitFor: 'text=Homepage Content', name: 'admin-sections' },
    { path: '/admin/tickets', waitFor: 'text=Ticket Types', name: 'admin-tickets' },
    { path: '/admin/questions', waitFor: 'text=Registration Questions', name: 'admin-questions' },
    { path: '/admin/orders', waitFor: 'text=Orders & Attendees', name: 'admin-orders' }
  ];

  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(route.waitFor, { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    screenshots.push(await capture(page, route.name));
  }

  let exportHeader = '';
  try {
    exportHeader = await page.evaluate(async () => {
      const res = await fetch('/admin/orders/export', { credentials: 'include' });
      if (!res.ok) return `ERROR ${res.status}`;
      const text = await res.text();
      return text.split('\n')[0] ?? '';
    });
  } catch (error) {
    exportHeader = `ERROR ${error?.message ?? 'unknown'}`;
  }

  const report = {
    baseUrl,
    screenshots,
    consoleErrors,
    exportHeader
  };

  const reportPath = path.join(outputDir, `admin-smoke-${new Date().toISOString().replace(/[:.]/g, '')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
