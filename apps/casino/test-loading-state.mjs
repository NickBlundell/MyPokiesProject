import { chromium } from '@playwright/test';

(async () => {
  let browser;
  try {
    console.log('Testing loading state issue...\n');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      // Look for AppContext logs
      if (text.includes('games') || text.includes('loading') || text.includes('AppProvider')) {
        consoleMessages.push({
          type: msg.type(),
          text: text
        });
      }
    });

    // Navigate to pokies page
    console.log('Navigating to /games/pokies...');
    await page.goto('http://localhost:3000/games/pokies', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for the page to potentially load
    await page.waitForTimeout(8000);

    // Check loading state text
    const loadingVisible = await page.locator('text=Loading games...').isVisible().catch(() => false);
    console.log(`Loading indicator visible: ${loadingVisible}`);

    // Check if games count is showing
    const gamesCount = await page.locator('text=/\\d+ games available/').count();
    console.log(`Games count text visible: ${gamesCount > 0}`);

    // Check if actual game grid is rendered
    const gameGrid = await page.locator('[class*="grid"]').count();
    console.log(`Grid elements found: ${gameGrid}`);

    // Get the text content
    const bodyText = await page.textContent('body');
    const hasLoadingText = bodyText.includes('Loading games');
    const hasGamesAvailable = bodyText.match(/(\d+) games available/);

    console.log(`\nPage state:`);
    console.log(`  - Shows "Loading games...": ${hasLoadingText}`);
    console.log(`  - Shows games count: ${hasGamesAvailable ? hasGamesAvailable[0] : 'No'}`);

    // Print relevant console messages
    if (consoleMessages.length > 0) {
      console.log('\nRelevant console messages:');
      consoleMessages.forEach(msg => {
        console.log(`  [${msg.type}] ${msg.text}`);
      });
    }

    // Take a screenshot
    await page.screenshot({ path: '/tmp/pokies-loading-state.png' });
    console.log('\nScreenshot saved to /tmp/pokies-loading-state.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
