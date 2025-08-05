import { test, expect } from '@playwright/test';

test.describe('Online Ordering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175');
  });

  test('should load the online ordering page', async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/Online Ordering/);
  });

  test('should display store selection', async ({ page }) => {
    // Check if store selection is visible
    await expect(page.locator('[data-testid="store-selection"]')).toBeVisible();
  });

  test('should select a store', async ({ page }) => {
    // Click on first store
    await page.locator('[data-testid="store-item"]').first().click();
    
    // Check if we're redirected to menu
    await expect(page.locator('[data-testid="menu-page"]')).toBeVisible();
  });

  test('should display menu items', async ({ page }) => {
    // Select store first
    await page.locator('[data-testid="store-item"]').first().click();
    
    // Wait for menu items to load
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });
    
    // Check if menu items are displayed
    const menuItems = await page.locator('[data-testid="menu-item"]').count();
    expect(menuItems).toBeGreaterThan(0);
  });

  test('should add item to cart', async ({ page }) => {
    // Select store first
    await page.locator('[data-testid="store-item"]').first().click();
    
    // Wait for menu items to load
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });
    
    // Click on first menu item
    await page.locator('[data-testid="menu-item"]').first().click();
    
    // Check if item was added to cart
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });

  test('should complete online order', async ({ page }) => {
    // Select store first
    await page.locator('[data-testid="store-item"]').first().click();
    
    // Add item to cart
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });
    await page.locator('[data-testid="menu-item"]').first().click();
    
    // Go to cart
    await page.locator('[data-testid="cart-button"]').click();
    
    // Click checkout
    await page.locator('[data-testid="checkout-button"]').click();
    
    // Fill customer info
    await page.locator('[data-testid="customer-name"]').fill('Online Customer');
    await page.locator('[data-testid="customer-email"]').fill('customer@example.com');
    await page.locator('[data-testid="customer-phone"]').fill('555-5678');
    
    // Fill delivery address
    await page.locator('[data-testid="delivery-address"]').fill('123 Test Street');
    await page.locator('[data-testid="delivery-city"]').fill('Test City');
    await page.locator('[data-testid="delivery-zip"]').fill('12345');
    
    // Submit order
    await page.locator('[data-testid="submit-order"]').click();
    
    // Check for confirmation
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });

  test('should customize pizza', async ({ page }) => {
    // Select store first
    await page.locator('[data-testid="store-item"]').first().click();
    
    // Find a pizza item
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });
    await page.locator('text=Pizza').first().click();
    
    // Customize pizza
    await page.locator('[data-testid="size-large"]').click();
    await page.locator('[data-testid="topping-pepperoni"]').click();
    await page.locator('[data-testid="topping-mushrooms"]').click();
    
    // Add to cart
    await page.locator('[data-testid="add-to-cart"]').click();
    
    // Check if customized pizza was added
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });
}); 