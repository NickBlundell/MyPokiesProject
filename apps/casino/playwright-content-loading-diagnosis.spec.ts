import { test, expect } from '@playwright/test';

test.describe('Content Loading Diagnosis', () => {

  test('Test 1: Fresh page load (no cache) - Anonymous user', async ({ page }) => {
    console.log('\n=== TEST 1: Fresh Load (Anonymous) ===');

    // Clear all cache and storage
    await page.context().clearCookies();
    await page.context().clearPermissions();

    // Navigate to home page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait a bit for any async loading
    await page.waitForTimeout(2000);

    // Take screenshot of initial load
    await page.screenshot({ path: 'test-results/test1-initial-load.png', fullPage: true });

    // Check for game cards - look for the actual structure
    // Each game card has an image with the game name as alt text
    const gameImages = await page.locator('img[alt]:not([alt=""])').count();
    const gameCards = gameImages > 3 ? gameImages - 3 : 0; // Subtract header/footer images
    console.log(`Game cards found: ${gameCards} (total images: ${gameImages})`);

    // Check for any error messages
    const errors = await page.locator('text=/error|failed|unavailable/i').allTextContents();
    console.log(`Error messages: ${errors.length > 0 ? errors : 'None'}`);

    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Capture network requests
    const failedRequests: any[] = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });

    // Check Supabase API calls
    const supabaseRequests: any[] = [];
    page.on('response', response => {
      if (response.url().includes('supabase.co')) {
        supabaseRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    await page.waitForTimeout(3000);

    console.log(`Console logs: ${consoleLogs.length} entries`);
    console.log(`Failed requests: ${failedRequests.length}`);
    console.log(`Supabase API calls: ${supabaseRequests.length}`);

    if (failedRequests.length > 0) {
      console.log('Failed requests:', JSON.stringify(failedRequests, null, 2));
    }

    if (supabaseRequests.length > 0) {
      console.log('Supabase requests:', JSON.stringify(supabaseRequests, null, 2));
    }

    expect(gameCards).toBeGreaterThan(0);
  });

  test('Test 2: Page reload (with cache) - Anonymous user', async ({ page }) => {
    console.log('\n=== TEST 2: Reload (Anonymous, with cache) ===');

    // First load
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const firstLoadGames = await page.locator('[class*="game-card"], [data-testid*="game"], img[alt*="game" i]').count();
    console.log(`First load game cards: ${firstLoadGames}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/test2-first-load.png', fullPage: true });

    // Reload the page
    console.log('Reloading page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const secondLoadGames = await page.locator('[class*="game-card"], [data-testid*="game"], img[alt*="game" i]').count();
    console.log(`Second load game cards: ${secondLoadGames}`);

    // Take screenshot after reload
    await page.screenshot({ path: 'test-results/test2-after-reload.png', fullPage: true });

    // Check for errors
    const errors = await page.locator('text=/error|failed|unavailable/i').allTextContents();
    console.log(`Error messages after reload: ${errors.length > 0 ? errors : 'None'}`);

    expect(secondLoadGames).toBeGreaterThan(0);
    expect(secondLoadGames).toEqual(firstLoadGames);
  });

  test('Test 3: Multiple reloads - Check consistency', async ({ page }) => {
    console.log('\n=== TEST 3: Multiple Reloads ===');

    const gameCounts: number[] = [];

    for (let i = 1; i <= 5; i++) {
      console.log(`\nReload ${i}/5...`);
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const gameCards = await page.locator('[class*="game-card"], [data-testid*="game"], img[alt*="game" i]').count();
      gameCounts.push(gameCards);
      console.log(`Reload ${i} game cards: ${gameCards}`);

      // Take screenshot
      await page.screenshot({ path: `test-results/test3-reload-${i}.png`, fullPage: true });
    }

    console.log('\nGame counts across reloads:', gameCounts);

    // Check if any reload returned 0 games
    const zeroGameLoads = gameCounts.filter(count => count === 0).length;
    console.log(`Reloads with zero games: ${zeroGameLoads}/5`);

    // Check consistency
    const allSame = gameCounts.every(count => count === gameCounts[0]);
    console.log(`All loads returned same count: ${allSame}`);

    expect(zeroGameLoads).toBe(0);
    expect(gameCounts[0]).toBeGreaterThan(0);
  });

  test('Test 4: Check for specific Supabase errors', async ({ page }) => {
    console.log('\n=== TEST 4: Supabase Error Detection ===');

    const consoleErrors: string[] = [];
    const supabaseErrors: any[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('supabase.co') && response.status() >= 400) {
        try {
          const body = await response.text();
          supabaseErrors.push({
            url: response.url(),
            status: response.status(),
            body: body
          });
        } catch (e) {
          supabaseErrors.push({
            url: response.url(),
            status: response.status(),
            body: 'Could not read response body'
          });
        }
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }

    console.log(`Supabase errors: ${supabaseErrors.length}`);
    if (supabaseErrors.length > 0) {
      console.log('Supabase errors:', JSON.stringify(supabaseErrors, null, 2));
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/test4-error-check.png', fullPage: true });

    // We don't fail the test, just report findings
    console.log('Error detection complete');
  });

  test('Test 5: Check DOM for loading states', async ({ page }) => {
    console.log('\n=== TEST 5: Loading States ===');

    await page.goto('http://localhost:3000');

    // Check for loading indicators immediately
    await page.waitForTimeout(100);
    const loadingIndicators = await page.locator('text=/loading|spinner|skeleton/i, [class*="loading"], [class*="spinner"], [class*="skeleton"]').count();
    console.log(`Loading indicators found: ${loadingIndicators}`);

    // Wait for network to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if loading indicators are gone
    const loadingIndicatorsAfter = await page.locator('text=/loading|spinner|skeleton/i, [class*="loading"], [class*="spinner"], [class*="skeleton"]').count();
    console.log(`Loading indicators after wait: ${loadingIndicatorsAfter}`);

    // Check for game content
    const gameCards = await page.locator('[class*="game-card"], [data-testid*="game"], img[alt*="game" i]').count();
    console.log(`Game cards visible: ${gameCards}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/test5-loading-states.png', fullPage: true });

    expect(gameCards).toBeGreaterThan(0);
  });

  test('Test 6: Inspect page HTML structure', async ({ page }) => {
    console.log('\n=== TEST 6: HTML Structure Inspection ===');

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Get the full HTML to inspect
    const html = await page.content();

    // Check for specific game sections
    const hasPokiesSection = html.includes('Pokies') || html.includes('pokies');
    const hasBigJackpotSection = html.includes('Big Jackpot') || html.includes('jackpot');
    const hasLiveDealerSection = html.includes('Live Dealer') || html.includes('live dealer');
    const hasNewGamesSection = html.includes('New Games') || html.includes('new games');

    console.log(`Has Pokies section: ${hasPokiesSection}`);
    console.log(`Has Big Jackpot section: ${hasBigJackpotSection}`);
    console.log(`Has Live Dealer section: ${hasLiveDealerSection}`);
    console.log(`Has New Games section: ${hasNewGamesSection}`);

    // Count images that might be game thumbnails
    const images = await page.locator('img').count();
    console.log(`Total images on page: ${images}`);

    // Count links
    const links = await page.locator('a').count();
    console.log(`Total links on page: ${links}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/test6-html-structure.png', fullPage: true });
  });

  test('Test 7: Test with browser refresh (F5 equivalent)', async ({ page }) => {
    console.log('\n=== TEST 7: Browser Refresh Test ===');

    // Initial load
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const initialGames = await page.locator('[class*="game-card"], [data-testid*="game"], img[alt*="game" i]').count();
    console.log(`Initial game cards: ${initialGames}`);
    await page.screenshot({ path: 'test-results/test7-before-refresh.png', fullPage: true });

    // Simulate F5 refresh by reloading
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const afterRefreshGames = await page.locator('[class*="game-card"], [data-testid*="game"], img[alt*="game" i]').count();
    console.log(`After refresh game cards: ${afterRefreshGames}`);
    await page.screenshot({ path: 'test-results/test7-after-refresh.png', fullPage: true });

    // Hard reload (clear cache)
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const afterHardRefreshGames = await page.locator('[class*="game-card"], [data-testid*="game"], img[alt*="game" i]').count();
    console.log(`After hard refresh game cards: ${afterHardRefreshGames}`);
    await page.screenshot({ path: 'test-results/test7-after-hard-refresh.png', fullPage: true });

    console.log(`\nResults: Initial: ${initialGames}, Refresh: ${afterRefreshGames}, Hard Refresh: ${afterHardRefreshGames}`);

    expect(initialGames).toBeGreaterThan(0);
    expect(afterRefreshGames).toBeGreaterThan(0);
    expect(afterHardRefreshGames).toBeGreaterThan(0);
  });
});
