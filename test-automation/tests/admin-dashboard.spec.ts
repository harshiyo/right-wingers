import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
  });

  test('should load the admin dashboard', async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/Admin/);
  });

  test('should display login form', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.locator('[data-testid="email-input"]').fill('admin@example.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    
    // Submit login
    await page.locator('[data-testid="login-button"]').click();
    
    // Check if we're redirected to dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should display menu management', async ({ page }) => {
    // Login first
    await page.locator('[data-testid="email-input"]').fill('admin@example.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    // Navigate to menu management
    await page.locator('[data-testid="menu-link"]').click();
    
    // Check if menu management page is loaded
    await expect(page.locator('[data-testid="menu-management"]')).toBeVisible();
  });

  test('should add new menu item', async ({ page }) => {
    // Login first
    await page.locator('[data-testid="email-input"]').fill('admin@example.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    // Navigate to menu management
    await page.locator('[data-testid="menu-link"]').click();
    
    // Click add new item
    await page.locator('[data-testid="add-menu-item"]').click();
    
    // Fill form
    await page.locator('[data-testid="item-name"]').fill('Test Pizza');
    await page.locator('[data-testid="item-price"]').fill('15.99');
    await page.locator('[data-testid="item-category"]').selectOption('Pizza');
    
    // Save item
    await page.locator('[data-testid="save-item"]').click();
    
    // Check if item was added
    await expect(page.locator('text=Test Pizza')).toBeVisible();
  });

  test('should view orders', async ({ page }) => {
    // Login first
    await page.locator('[data-testid="email-input"]').fill('admin@example.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    // Navigate to orders
    await page.locator('[data-testid="orders-link"]').click();
    
    // Check if orders page is loaded
    await expect(page.locator('[data-testid="orders-page"]')).toBeVisible();
  });
}); 