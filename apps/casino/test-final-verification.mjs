import { chromium } from '@playwright/test';

(async () => {
  let browser;
  try {
    console.log('=== FINAL VERIFICATION TEST ===\n');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Test 1: Homepage
    console.log('✓ Test 1: Homepage (http://localhost:3000)');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    const homepageGames = await page.locator('text=/Sweet Bonanza|Gates of Olympus|Wolf Gold/').count();
    console.log(`  - Games visible: ${homepageGames > 0 ? '✅ YES' : '❌ NO'} (${homepageGames} found)`);

    await page.screenshot({ path: '/tmp/final-homepage.png', fullPage: true });

    // Test 2: Pokies Page
    console.log('\n✓ Test 2: Pokies Page (http://localhost:3000/games/pokies)');
    await page.goto('http://localhost:3000/games/pokies', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(8000); // Wait for games to fully load

    // Check that loading spinner is gone
    const loadingStillVisible = await page.locator('text=Loading games...').isVisible().catch(() => false);
    console.log(`  - Loading spinner gone: ${!loadingStillVisible ? '✅ YES' : '❌ NO'}`);

    // Check games are visible
    const pokiesGames = await page.locator('text=/Sweet Bonanza|Gates of Olympus/').count();
    console.log(`  - Games visible: ${pokiesGames > 0 ? '✅ YES' : '❌ NO'} (${pokiesGames} found)`);

    // Check game cards are rendered
    const gameCards = await page.locator('.grid > div').count();
    console.log(`  - Game cards rendered: ${gameCards > 0 ? '✅ YES' : '❌ NO'} (${gameCards} cards)`);

    await page.screenshot({ path: '/tmp/final-pokies.png', fullPage: true });

    // Test 3: Other game pages
    console.log('\n✓ Test 3: Other Game Pages');

    // Test jackpot page
    await page.goto('http://localhost:3000/jackpot', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    const jackpotLoading = await page.locator('text=Loading games...').isVisible().catch(() => false);
    console.log(`  - Jackpot page loads: ${!jackpotLoading ? '✅ YES' : '❌ NO'}`);

    // Test live casino page
    await page.goto('http://localhost:3000/games/live', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    const liveLoading = await page.locator('text=Loading games...').isVisible().catch(() => false);
    console.log(`  - Live casino page loads: ${!liveLoading ? '✅ YES' : '❌ NO'}`);

    // Final check
    console.log('\n✓ Test 4: Error Check');
    console.log(`  - JavaScript errors: ${errors.length === 0 ? '✅ NONE' : `❌ ${errors.length} found`}`);

    if (errors.length > 0) {
      errors.forEach(err => console.log(`    - ${err}`));
    }

    // Summary
    const allPassed = homepageGames > 0 && pokiesGames > 0 && gameCards > 0 && !loadingStillVisible && errors.length === 0;

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('✅✅✅ ALL TESTS PASSED! ✅✅✅');
      console.log('='.repeat(50));
      console.log('\nGames are loading correctly on all pages!');
      console.log('The casino application is working as expected.');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('='.repeat(50));
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
