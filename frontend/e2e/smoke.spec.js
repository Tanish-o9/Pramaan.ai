import { test, expect } from '@playwright/test';

test.describe('Pramaan Portal Smoke Suite', () => {
  test('Landing page renders title and entry buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Presence|Pramaan/i);
    await expect(page.locator('text=Faculty Portal')).toBeVisible();
    await expect(page.locator('text=Student Portal')).toBeVisible();
  });
});

