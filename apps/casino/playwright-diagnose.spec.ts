import { test, expect } from '@playwright/test';

test.describe('Casino App Loading Diagnosis', () => {
  test('should load the page and capture all details', async ({ page }) => {
    console.log('🔍 Starting comprehensive browser diagnosis...\n');

    // Capture console messages
    const consoleMessages: Array<{ type: string; text: string }> = [];
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
      if (msg.type() === 'error') {
        console.log(`❌ Browser Console Error: ${msg.text()}`);
      }
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Capture failed requests
    const failedRequests: Array<{ url: string; status: number }> = [];
    page.on('response', (response) => {
      if (!response.ok()) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
        });
        console.log(`❌ Failed Request: ${response.url()} - Status: ${response.status()}`);
      }
    });

    // Navigate to the page
    console.log('📍 Navigating to http://localhost:3000...');
    const startTime = Date.now();

    try {
      await page.goto('http://localhost:3000', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      const loadTime = Date.now() - startTime;
      console.log(`✅ Page loaded in ${loadTime}ms\n`);
    } catch (error) {
      console.log(`❌ Failed to load page: ${error}`);
      throw error;
    }

    // Wait a bit for hydration
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'diagnosis-screenshot.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: diagnosis-screenshot.png\n');

    // Check what's visible
    console.log('👁️  VISIBILITY CHECK:');
    const checks = [
      { selector: 'body', name: 'Body element' },
      { selector: 'main', name: 'Main content' },
      { selector: 'header', name: 'Header' },
      { selector: 'nav', name: 'Navigation' },
      { selector: 'h1', name: 'Heading' },
      { selector: 'button', name: 'Buttons' },
      { selector: 'a', name: 'Links' },
      { selector: '[class*="game"]', name: 'Game elements' },
      { selector: '[class*="card"]', name: 'Card elements' },
      { selector: 'img', name: 'Images' },
    ];

    for (const check of checks) {
      const element = await page.locator(check.selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      const count = await page.locator(check.selector).count();
      console.log(`  ${isVisible ? '✅' : '❌'} ${check.name}: ${count} found, visible: ${isVisible}`);
    }

    // Check page title
    const title = await page.title();
    console.log(`\n📄 Page Title: "${title}"`);

    // Get page text content
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.trim().length > 100;
    console.log(`📝 Page has content: ${hasContent ? '✅ YES' : '❌ NO'} (${bodyText?.trim().length || 0} characters)`);

    // Check for specific text
    const searchTerms = ['MyPokies', 'Casino', 'Login', 'Sign Up', 'Games', 'Pokies'];
    console.log('\n🔎 TEXT SEARCH:');
    for (const term of searchTerms) {
      const found = bodyText?.includes(term);
      console.log(`  ${found ? '✅' : '❌'} "${term}"`);
    }

    // Network analysis
    console.log('\n🌐 NETWORK ANALYSIS:');
    console.log(`  Failed Requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      failedRequests.forEach((req) => {
        console.log(`    - ${req.url} (${req.status})`);
      });
    }

    // Console messages summary
    console.log('\n💬 CONSOLE MESSAGES:');
    const errorCount = consoleMessages.filter((m) => m.type === 'error').length;
    const warningCount = consoleMessages.filter((m) => m.type === 'warning').length;
    const logCount = consoleMessages.filter((m) => m.type === 'log').length;
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Warnings: ${warningCount}`);
    console.log(`  Logs: ${logCount}`);

    if (errorCount > 0) {
      console.log('\n❌ CONSOLE ERRORS:');
      consoleMessages
        .filter((m) => m.type === 'error')
        .slice(0, 10) // Show first 10 errors
        .forEach((msg) => {
          console.log(`    ${msg.text}`);
        });
    }

    // Page errors summary
    if (pageErrors.length > 0) {
      console.log('\n❌ PAGE ERRORS:');
      pageErrors.forEach((error) => {
        console.log(`    ${error}`);
      });
    }

    // Final verdict
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(60));

    const hasErrors = pageErrors.length > 0 || errorCount > 0;
    const hasFailedRequests = failedRequests.length > 0;
    const pageLoaded = hasContent;

    if (!hasErrors && !hasFailedRequests && pageLoaded) {
      console.log('✅ STATUS: APP IS WORKING CORRECTLY');
      console.log('   - No JavaScript errors detected');
      console.log('   - All network requests successful');
      console.log('   - Page content rendered properly');
    } else {
      console.log('❌ STATUS: ISSUES DETECTED');
      if (pageErrors.length > 0) console.log(`   - ${pageErrors.length} page errors`);
      if (errorCount > 0) console.log(`   - ${errorCount} console errors`);
      if (failedRequests.length > 0) console.log(`   - ${failedRequests.length} failed requests`);
      if (!pageLoaded) console.log('   - Page content not rendered');
    }

    console.log('='.repeat(60));

    // Assert page loaded successfully
    expect(pageLoaded).toBe(true);
  });
});
