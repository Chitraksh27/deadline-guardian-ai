import { test, expect } from '@playwright/test';

test.describe('Deadline Guardian AI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto('/');
  });

  test('should load the dashboard and verify initial state', async ({ page }) => {
    // The app should load and show Dashboard as the active view
    await expect(page.getByRole('heading', { name: /Deadline Guardian AI/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Active Goals/i })).toBeVisible();
  });

  test('should navigate to Create Goal page', async ({ page }) => {
    // Click on New Goal in the sidebar
    await page.getByRole('button', { name: /New Goal/i }).click();
    
    // Verify Create Goal view is active
    await expect(page.getByRole('heading', { name: /Create Goal Plan/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Build MVP project/i)).toBeVisible();
  });

  test('should display execution logs view', async ({ page }) => {
    // Click on Execution Logs in the sidebar
    await page.getByRole('button', { name: /Execution Logs/i }).click();
    
    // Verify Audit Logs view is active
    await expect(page.getByRole('heading', { name: /Multi-Agent Audit Trail/i })).toBeVisible();
  });
});
