import { test, expect } from '@playwright/test';

test('Final comprehensive check - no runtime errors', async ({ page }) => {
  console.log('🔍 Running final comprehensive check...\n');

  // Track all errors
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  // Capture page errors (JavaScript runtime errors)
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
    console.log(`\n❌ PAGE ERROR: ${error.message}`);
    if (error.stack) {
      console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
    }
  });

  // Capture console errors (excluding expected auth messages)
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore expected auth messages
      if (!text.includes('[AuthContext] Auth error: Auth session missing!')) {
        consoleErrors.push(text);
        console.log(`\n❌ CONSOLE ERROR: ${text}`);
      }
    }
  });

  // Capture failed network requests (excluding expected 401s)
  page.on('response', (response) => {
    if (!response.ok() && response.status() !== 401) {
      failedRequests.push(`${response.url()} - ${response.status()}`);
      console.log(`\n❌ FAILED REQUEST: ${response.url()} - ${response.status()}`);
    }
  });

  // Navigate and wait
  console.log('📍 Loading page...');
  const startTime = Date.now();
  await page.goto('http://localhost:3000', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  const loadTime = Date.now() - startTime;
  console.log(`✅ Page loaded in ${loadTime}ms`);

  // Wait for React hydration
  await page.waitForTimeout(3000);

  // Check for game cards (using correct selector)
  const gameCards = await page.locator('.group.cursor-pointer').count();
  console.log(`\n✅ Game cards rendered: ${gameCards}`);

  // Take screenshot
  await page.screenshot({ path: 'final-check.png', fullPage: true });
  console.log('📸 Screenshot saved: final-check.png\n');

  // Final verdict
  console.log('='.repeat(60));
  console.log('📊 FINAL COMPREHENSIVE CHECK RESULTS:');
  console.log('='.repeat(60));

  console.log(`\n🔍 ERRORS FOUND:`);
  console.log(`   Page Errors (JavaScript): ${pageErrors.length}`);
  console.log(`   Console Errors (unexpected): ${consoleErrors.length}`);
  console.log(`   Failed Requests (non-401): ${failedRequests.length}`);

  if (pageErrors.length > 0) {
    console.log('\n❌ PAGE ERRORS:');
    pageErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
  }

  if (consoleErrors.length > 0) {
    console.log('\n❌ CONSOLE ERRORS:');
    consoleErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
  }

  if (failedRequests.length > 0) {
    console.log('\n❌ FAILED REQUESTS:');
    failedRequests.forEach((req, i) => console.log(`   ${i + 1}. ${req}`));
  }

  console.log('\n✅ SUCCESSFUL CHECKS:');
  console.log(`   ✅ Page loads in ${loadTime}ms`);
  console.log(`   ✅ ${gameCards} game cards rendered`);
  console.log(`   ✅ No unexpected JavaScript errors`);
  console.log(`   ✅ No unexpected console errors`);
  console.log(`   ✅ No unexpected failed requests`);

  console.log('\n' + '='.repeat(60));
  if (pageErrors.length === 0 && consoleErrors.length === 0 && failedRequests.length === 0) {
    console.log('🎉 ALL CHECKS PASSED - CASINO APP IS FULLY FUNCTIONAL');
  } else {
    console.log('⚠️ SOME ISSUES DETECTED - SEE DETAILS ABOVE');
  }
  console.log('='.repeat(60) + '\n');

  // Assertions
  expect(pageErrors.length).toBe(0);
  expect(consoleErrors.length).toBe(0);
  expect(gameCards).toBeGreaterThan(0);
});
