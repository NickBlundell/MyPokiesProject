import { chromium } from '@playwright/test';

(async () => {
  let browser;
  try {
    console.log('=== COMPREHENSIVE CASINO GAME LOADING TEST ===\n');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Test 1: Homepage
    console.log('Test 1: Loading Homepage (http://localhost:3000)');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(6000); // Wait for games to load

    const homepageGames = await page.locator('text=/Sweet Bonanza|Gates of Olympus|Wolf Gold/').count();
    console.log(`  ✓ Games visible on homepage: ${homepageGames > 0 ? 'YES' : 'NO'} (${homepageGames} found)`);

    const pokiesSection = await page.locator('text=Pokies (Slots)').count();
    console.log(`  ✓ Pokies section visible: ${pokiesSection > 0 ? 'YES' : 'NO'}`);

    const jackpotSection = await page.locator('text=Big Jackpot Buys').count();
    console.log(`  ✓ Jackpot section visible: ${jackpotSection > 0 ? 'YES' : 'NO'}`);

    const liveSection = await page.locator('text=Live Dealer Tables').count();
    console.log(`  ✓ Live Dealer section visible: ${liveSection > 0 ? 'YES' : 'NO'}`);

    await page.screenshot({ path: '/tmp/test-homepage.png', fullPage: true });
    console.log(`  ✓ Screenshot saved: /tmp/test-homepage.png\n`);

    // Test 2: Pokies Page
    console.log('Test 2: Loading Pokies Page (http://localhost:3000/games/pokies)');
    await page.goto('http://localhost:3000/games/pokies', { waitUntil: 'networkidle', timeout: 30000 });

    // Check initial loading state
    const initialLoading = await page.locator('text=Loading games...').isVisible().catch(() => false);
    console.log(`  ⏳ Initial loading state visible: ${initialLoading ? 'YES' : 'NO'}`);

    // Wait for games to load
    await page.waitForTimeout(8000);

    const pokiesGames = await page.locator('text=/Sweet Bonanza|Gates of Olympus|Wolf Gold/').count();
    console.log(`  ✓ Games visible on pokies page: ${pokiesGames > 0 ? 'YES' : 'NO'} (${pokiesGames} found)`);

    const gamesCount = await page.textContent('body');
    const match = gamesCount.match(/(\d+) games available/);
    if (match) {
      console.log(`  ✓ Games count displayed: ${match[0]}`);
    }

    const showingMatch = gamesCount.match(/Showing 1-(\d+) of (\d+)/);
    if (showingMatch) {
      console.log(`  ✓ Pagination info: ${showingMatch[0]}`);
    }

    await page.screenshot({ path: '/tmp/test-pokies.png', fullPage: true });
    console.log(`  ✓ Screenshot saved: /tmp/test-pokies.png\n`);

    // Test 3: Check for errors
    console.log('Test 3: Error Check');
    if (errors.length > 0) {
      console.log(`  ❌ Page errors found: ${errors.length}`);
      errors.forEach(err => console.log(`     - ${err}`));
    } else {
      console.log(`  ✓ No page errors detected`);
    }

    // Final Summary
    console.log('\n=== FINAL SUMMARY ===');
    const allTestsPassed = homepageGames > 0 && pokiesGames > 0 && errors.length === 0;
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED - Games are loading correctly!');
      console.log('\nNote: Games may take 3-8 seconds to load from Supabase database.');
      console.log('This is normal behavior for the casino application.');
    } else {
      console.log('❌ SOME TESTS FAILED - See details above');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
