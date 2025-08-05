import { test, expect } from '@playwright/test';

test.describe('POS Client', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main page', async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/POS/);
  });

  test('should display menu items', async ({ page }) => {
    // Wait for menu items to load
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });
    
    // Check if menu items are displayed
    const menuItems = await page.locator('[data-testid="menu-item"]').count();
    expect(menuItems).toBeGreaterThan(0);
  });

  test('should add item to cart', async ({ page }) => {
    // Wait for menu items to load
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });
    
    // Click on first menu item
    await page.locator('[data-testid="menu-item"]').first().click();
    
    // Check if item was added to cart
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });

  test('should navigate to cart page', async ({ page }) => {
    // Click on cart button
    await page.locator('[data-testid="cart-button"]').click();
    
    // Check if we're on cart page
    await expect(page.locator('[data-testid="cart-page"]')).toBeVisible();
  });

  test('should complete checkout process', async ({ page }) => {
    // Add item to cart
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });
    await page.locator('[data-testid="menu-item"]').first().click();
    
    // Go to cart
    await page.locator('[data-testid="cart-button"]').click();
    
    // Click checkout
    await page.locator('[data-testid="checkout-button"]').click();
    
    // Fill customer info
    await page.locator('[data-testid="customer-name"]').fill('Test Customer');
    await page.locator('[data-testid="customer-phone"]').fill('555-1234');
    
    // Submit order
    await page.locator('[data-testid="submit-order"]').click();
    
    // Check for confirmation
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });
}); 