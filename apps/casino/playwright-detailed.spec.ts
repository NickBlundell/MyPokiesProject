import { test } from '@playwright/test';

test('Capture detailed runtime errors', async ({ page }) => {
  // Capture ALL console messages with timestamps
  page.on('console', (msg) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Capture page errors with full stack traces
  page.on('pageerror', (error) => {
    console.log('\n❌❌❌ PAGE ERROR ❌❌❌');
    console.log('Message:', error.message);
    console.log('Stack:', error.stack);
    console.log('❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
  });

  // Capture request failures
  page.on('requestfailed', (request) => {
    console.log(`\n❌ REQUEST FAILED: ${request.url()}`);
    console.log(`   Failure: ${request.failure()?.errorText}\n`);
  });

  console.log('🔍 Loading page and waiting for games...\n');

  await page.goto('http://localhost:3000');

  // Wait up to 10 seconds for games to load
  console.log('⏳ Waiting for games to appear...');

  try {
    await page.waitForSelector('[class*="game"]', { timeout: 10000 });
    console.log('✅ Games loaded successfully!');
  } catch (e) {
    console.log('❌ Games did not load within 10 seconds');
    console.log('   Current page state:');

    // Check what text is visible
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.includes('Loading')) {
      console.log('   ⚠️  Page still shows "Loading" text');
    }
    if (bodyText?.includes('Error') || bodyText?.includes('error')) {
      console.log('   ❌ Page shows error message');
    }

    // Take screenshot
    await page.screenshot({ path: 'error-state.png', fullPage: true });
    console.log('   📸 Screenshot saved: error-state.png');
  }

  // Wait a bit more to see if anything changes
  await page.waitForTimeout(5000);

  console.log('\n✅ Test complete - check logs above for errors');
});
