import { test, expect } from '@playwright/test';

const BASE = '/computational-relationship-dynamic';

const pages = [
  { path: `${BASE}/`, title: /Computational Relationship Dynamics/ },
  { path: `${BASE}/methodology`, title: /Methodology/ },
  { path: `${BASE}/simulation`, title: /Simulation/ },
  { path: `${BASE}/results`, title: /Results/ },
];

test.describe('All pages load without 404s', () => {
  for (const { path, title } of pages) {
    test(`${path} returns 200 and correct title`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
    });
  }
});

test.describe('Navigation links use correct base path', () => {
  test('all nav links point inside /computational-relationship-dynamic', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const links = page.locator('nav.site-nav a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href, `Nav link ${i} has wrong href: ${href}`).toMatch(
        /^\/computational-relationship-dynamic/
      );
    }
  });

  test('CTA buttons on home page point inside /computational-relationship-dynamic', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const ctaLinks = page.locator('a.btn');
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await ctaLinks.nth(i).getAttribute('href');
      expect(href, `CTA button ${i} has wrong href: ${href}`).toMatch(
        /^\/computational-relationship-dynamic/
      );
    }
  });

  test('"Open Simulation" button on results page points inside /computational-relationship-dynamic', async ({ page }) => {
    await page.goto(`${BASE}/results`);
    const btn = page.locator('a.btn.btn-primary').first();
    const href = await btn.getAttribute('href');
    expect(href).toMatch(/^\/computational-relationship-dynamic/);
  });
});

test.describe('Nav links actually navigate to correct pages', () => {
  test('Methodology link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.locator('nav a', { hasText: 'Methodology' }).click();
    await expect(page).toHaveURL(/\/computational-relationship-dynamic\/methodology/);
    await expect(page).toHaveTitle(/Methodology/);
  });

  test('Simulation link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.locator('nav a', { hasText: 'Simulation' }).click();
    await expect(page).toHaveURL(/\/computational-relationship-dynamic\/simulation/);
    await expect(page).toHaveTitle(/Simulation/);
  });

  test('Results link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.locator('nav a', { hasText: 'Results' }).click();
    await expect(page).toHaveURL(/\/computational-relationship-dynamic\/results/);
    await expect(page).toHaveTitle(/Results/);
  });
});

test.describe('Assets load without 404', () => {
  test('simulation page has no failed asset requests', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404) failed.push(response.url());
    });

    await page.goto(`${BASE}/simulation`);
    // Wait for network idle so all dynamic imports finish
    await page.waitForLoadState('networkidle');

    expect(failed, `404s on simulation page:\n${failed.join('\n')}`).toHaveLength(0);
  });
});
