import { expect, test, type Page } from '@playwright/test';

const ADMIN_URL = process.env['ADMIN_URL'] || 'http://localhost:4201';

/** Dismisses the cookie banner so it never covers page controls. */
async function acceptEssentialCookies(page: Page) {
  const banner = page.getByRole('region', { name: 'Cookie preferences' });
  await banner.getByRole('button', { name: 'Essential only' }).click();
  await expect(banner).toBeHidden();
}

test.describe('storefront smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await acceptEssentialCookies(page);
  });

  test('home page shows banners, categories and products', async ({ page }) => {
    await expect(page).toHaveTitle(/Shop/);
    await expect(page.getByRole('heading', { name: 'Shop by category' })).toBeVisible();
    await expect(page.locator('ui-product-card').first()).toBeVisible();
  });

  test('search suggests products and opens results', async ({ page }) => {
    const box = page.getByRole('combobox', { name: 'Search products' }).first();
    await box.fill('lap');
    await expect(page.getByRole('option').first()).toBeVisible();
    await box.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=lap/);
    await expect(page.locator('ui-product-card').first()).toBeVisible();
  });

  test('guest can add to cart and check out with cash on delivery', async ({ page }) => {
    // Open a well-stocked product from a category page.
    await page.goto('/c/home-and-kitchen');
    await page.locator('ui-product-card h3 a').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    const drawer = page.getByRole('dialog', { name: 'Your cart' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Checkout' }).click();

    await expect(page.getByRole('heading', { name: 'Address' })).toBeVisible();
    await page.getByLabel('Full name').fill('Asha Rao');
    await page.getByLabel('Email', { exact: false }).first().fill('asha@example.com');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByLabel('Pin code').fill('560001');
    await page.getByLabel('Address line 1').fill('12 MG Road');
    await page.getByLabel('City').fill('Bengaluru');
    await page.getByLabel('State').fill('Karnataka');
    await page.getByRole('button', { name: 'Continue to delivery' }).click();

    await expect(page.getByRole('heading', { name: 'Delivery' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to payment' }).click();

    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
    await page.getByLabel('Cash on delivery').check();
    await page.getByRole('button', { name: 'Review order' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page).toHaveURL(/\/orders\/ORD-/);
    await expect(page.getByRole('heading', { name: /Your order is placed/ })).toBeVisible();
  });

  test('a customer can sign in and see their account', async ({ page }) => {
    await page.goto('/account/login');
    // The development-only helper fills the seeded demo customer.
    await page.getByRole('button', { name: /fill demo customer/i }).click();
    // Wait until the page reacted, which also proves the app has finished loading, before submitting.
    await expect(page.locator('main').getByLabel('Email')).toHaveValue(/@shop\.test$/);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', { name: /Hello, Demo Customer/ })).toBeVisible();
  });

  test('unknown pages return a friendly 404', async ({ page }) => {
    await page.goto('/definitely-not-a-page');
    await expect(page.getByText('We could not find that page')).toBeVisible();
  });
});

test.describe('admin smoke', () => {
  test('an admin can sign in and sees the dashboard', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/`);
    await expect(page).toHaveURL(/\/login/);
    await page.getByRole('button', { name: /fill demo admin/i }).click();
    await expect(page.getByLabel('Email')).toHaveValue(/@shop\.test$/);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Revenue').first()).toBeVisible();
    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });
});
