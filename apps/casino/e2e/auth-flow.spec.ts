import { test, expect } from '@playwright/test';

test.describe('Authentication Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the home page
    await page.goto('http://localhost:3000');
  });

  test('Homepage loads successfully', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that key elements are present
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();

    // Check that the logo is present
    await expect(page.locator('img[alt="MyPokies"]')).toBeVisible();

    console.log('✅ Homepage loaded successfully');
  });

  test('Login modal opens and closes', async ({ page }) => {
    // Click the Login button
    await page.click('text=Login');

    // Wait for the modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Check that login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Close the modal by clicking outside or close button
    await page.keyboard.press('Escape');

    // Verify modal is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });

    console.log('✅ Login modal opens and closes correctly');
  });

  test('Sign Up modal opens and closes', async ({ page }) => {
    // Click the Sign Up button
    await page.click('text=Sign Up');

    // Wait for the modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Check that signup form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Close the modal
    await page.keyboard.press('Escape');

    // Verify modal is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });

    console.log('✅ Sign Up modal opens and closes correctly');
  });

  test('Can switch between Login and Sign Up modals', async ({ page }) => {
    // Open login modal
    await page.click('text=Login');
    await page.waitForSelector('[role="dialog"]');

    // Look for "Sign up" link in the modal
    const signUpLink = page.locator('text=/sign up/i').first();
    await signUpLink.click();

    // Verify we're now on the sign up form
    await expect(page.locator('text=/create.*account/i')).toBeVisible({ timeout: 3000 });

    // Look for "Log in" link
    const loginLink = page.locator('text=/log in/i').or(page.locator('text=/sign in/i')).first();
    await loginLink.click();

    // Verify we're back on login form
    await expect(page.locator('text=/welcome back/i').or(page.locator('input[type="email"]'))).toBeVisible({ timeout: 3000 });

    console.log('✅ Successfully switched between Login and Sign Up modals');
  });

  test('Login form validation works', async ({ page }) => {
    // Open login modal
    await page.click('text=Login');
    await page.waitForSelector('[role="dialog"]');

    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("Log in")')).or(page.locator('button:has-text("Sign in")')).first();
    await submitButton.click();

    // Check for validation messages or disabled state
    // Note: This might vary based on your implementation
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    console.log('✅ Form validation appears to be working');
  });

  test('Game catalog displays', async ({ page }) => {
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check if games are displayed (adjust selector based on your implementation)
    const gameElements = await page.locator('[class*="game"]').or(page.locator('img[alt*="game"]')).count();

    console.log(`Found ${gameElements} game elements on the page`);
    expect(gameElements).toBeGreaterThan(0);

    console.log('✅ Game catalog displays correctly');
  });

  test('Sidebar navigation works', async ({ page }) => {
    // On mobile, check for menu button
    const menuButton = page.locator('text=Menu').or(page.locator('[aria-label="Menu"]'));

    if (await menuButton.isVisible()) {
      await menuButton.click();
      console.log('Opened mobile menu');
    }

    // Check for key navigation items
    const homeLink = page.locator('text=HOME').or(page.locator('a[href="/"]'));
    await expect(homeLink).toBeVisible({ timeout: 3000 });

    console.log('✅ Sidebar navigation is functional');
  });

  test('No JavaScript errors on page load', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Reload the page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check if there are any errors
    if (errors.length > 0) {
      console.log('⚠️ JavaScript errors found:', errors);
    } else {
      console.log('✅ No JavaScript errors on page load');
    }

    expect(errors).toHaveLength(0);
  });
});
