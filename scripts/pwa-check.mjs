/*
 * Real-browser check of the installable shop (BRD 18): service worker, offline behaviour, dark mode and Hindi.
 * Needs a production build running:   pnpm exec nx build storefront   then   PORT=4000 node dist/apps/storefront/server/server.mjs
 * Run with:   node scripts/pwa-check.mjs [base-url]
 * Unit tests cover the same rules without a browser; this proves them in Chromium.
 */
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4000';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ colorScheme: 'light', serviceWorkers: 'allow' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

// 1. First visit registers the service worker (production build only).
await page.goto(base + '/', { waitUntil: 'load' });
await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => r?.active?.state === 'activated'), null, { timeout: 15000, polling: 200 }).catch(() => undefined);
const reg = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return { active: r?.active?.state ?? null, scope: r?.scope ?? null, caches: await caches.keys() };
});
check('service worker registers and activates', reg.active === 'activated', JSON.stringify(reg));
check('static cache created with the offline page', reg.caches.includes('shop-static-v1'));

// 2. Browse a product page so a saved copy exists.
await page.reload({ waitUntil: 'load' });
const link = await page.locator('a[href^="/p/"]').first().getAttribute('href');
await page.goto(base + link, { waitUntil: 'load' });
await page.waitForTimeout(800);
const titleOnline = await page.title();
const pagesCache = await page.evaluate(async () => (await (await caches.open('shop-pages-v1')).keys()).map((r) => new URL(r.url).pathname));
check('a browsed catalog page is saved', pagesCache.includes(link), pagesCache.join(', '));

// 3. Visit the cart and checkout online: they must never be saved.
await page.goto(base + '/cart', { waitUntil: 'load' });
await page.goto(base + '/checkout', { waitUntil: 'load' }).catch(() => undefined);
const afterPrivate = await page.evaluate(async () => (await (await caches.open('shop-pages-v1')).keys()).map((r) => new URL(r.url).pathname));
check('cart and checkout are never saved', !afterPrivate.some((p) => p.startsWith('/cart') || p.startsWith('/checkout')), afterPrivate.join(', '));

// 4. Go offline: the saved product page opens with the saved-copy notice; the cart shows the friendly offline page.
await context.setOffline(true);
await page.goto(base + link, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
await page.waitForTimeout(1500);
const offlineTitle = await page.title();
const notice = await page.locator('text=saved copy').count();
check('a saved page opens offline', offlineTitle === titleOnline, `${offlineTitle}`);
check('the page warns that prices may be old', notice > 0, `matches=${notice}`);

await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
await page.waitForTimeout(800);
const cartOffline = await page.locator('h1').first().textContent();
check('the cart shows the offline page, never an old price', /offline/i.test(cartOffline ?? ''), cartOffline ?? '');

await page.goto(base + '/c/never-visited-category', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
const unseen = await page.locator('h1').first().textContent();
check('an unvisited page shows the offline page', /offline/i.test(unseen ?? ''), unseen ?? '');
await context.setOffline(false);

// 5. Dark mode: follows the device, and a saved light choice wins.
const dark = await browser.newContext({ colorScheme: 'dark' });
const dp = await dark.newPage();
await dp.goto(base + '/', { waitUntil: 'load' });
const bgDark = await dp.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
check('follows a dark device setting', bgDark === 'rgb(11, 16, 32)', bgDark);
await dp.evaluate(() => localStorage.setItem('ecom.theme.v1', 'light'));
await dp.reload({ waitUntil: 'load' });
const attr = await dp.evaluate(() => document.documentElement.getAttribute('data-theme'));
const bgLight = await dp.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
check('a saved light choice wins over a dark device', attr === 'light' && bgLight === 'rgb(255, 255, 255)', `${attr} ${bgLight}`);
await dp.evaluate(() => localStorage.setItem('ecom.theme.v1', 'dark'));
await dp.reload({ waitUntil: 'load' });
const lightDevice = await (await browser.newContext({ colorScheme: 'light' })).newPage();
await lightDevice.goto(base + '/', { waitUntil: 'load' });
await lightDevice.evaluate(() => localStorage.setItem('ecom.theme.v1', 'dark'));
await lightDevice.reload({ waitUntil: 'load' });
check('a saved dark choice wins over a light device', (await lightDevice.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)) === 'rgb(11, 16, 32)');

// 6. Hindi, then right-to-left.
const hp = await (await browser.newContext()).newPage();
await hp.goto(base + '/', { waitUntil: 'load' });
await hp.evaluate(() => localStorage.setItem('ecom.locale.v1', 'hi'));
await hp.reload({ waitUntil: 'load' });
await hp.waitForFunction(() => document.documentElement.lang === 'hi', null, { timeout: 8000 }).catch(() => undefined);
const hindi = await hp.locator('app-footer').textContent();
check('Hindi applies after load', /न्यूज़लेटर/.test(hindi ?? ''), (hindi ?? '').slice(0, 60));
await hp.evaluate(() => localStorage.setItem('ecom.locale.v1', 'hi'));
const rp = await (await browser.newContext()).newPage();
await rp.goto(base + '/', { waitUntil: 'load' });
await rp.selectOption('ui-language-picker select', 'en').catch(() => undefined);
const hasRtlOption = await rp.locator('ui-language-picker option[value="rtl"]').count();
check('the RTL test language is not offered in the production build', hasRtlOption === 0);

console.log('\nconsole/page errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
