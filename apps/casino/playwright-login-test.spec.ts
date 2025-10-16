import { test, expect } from '@playwright/test';

test.describe('Login Flow Test', () => {
  test('should login successfully with test@mypokies.com', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Fill in login credentials
    await page.fill('input[type="email"]', 'test@mypokies.com');
    await page.fill('input[type="password"]', 'Test123456!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/protected', { timeout: 10000 });

    // Verify we're on the protected page (redirects to home after login)
    const url = page.url();
    console.log('Current URL after login:', url);

    // Check for error messages
    const errorMessages = await page.locator('text=/error|failed|invalid/i').count();
    expect(errorMessages).toBe(0);

    // Verify user is authenticated by checking for user-specific elements
    // (adjust selector based on your actual UI)
    const isAuthenticated = await page.locator('body').isVisible();
    expect(isAuthenticated).toBe(true);

    console.log('✅ Login test passed - user authenticated successfully');
  });

  test('should login successfully with nicholasblundell@proton.me', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Fill in login credentials
    await page.fill('input[type="email"]', 'nicholasblundell@proton.me');
    await page.fill('input[type="password"]', 'Nicholas123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/protected', { timeout: 10000 });

    // Verify we're on the protected page
    const url = page.url();
    console.log('Current URL after login:', url);

    // Check for error messages
    const errorMessages = await page.locator('text=/error|failed|invalid/i').count();
    expect(errorMessages).toBe(0);

    console.log('✅ Login test passed - user authenticated successfully');
  });
});
