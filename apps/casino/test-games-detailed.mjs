import { chromium } from '@playwright/test';

(async () => {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMessages = [];
    const errors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Navigate to homepage
    console.log('\n=== TESTING HOMEPAGE ===');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check for game sections
    const pokiesSection = await page.locator('text=Pokies (Slots)').count();
    console.log(`Pokies section visible: ${pokiesSection > 0}`);

    const jackpotSection = await page.locator('text=Big Jackpot Buys').count();
    console.log(`Jackpot section visible: ${jackpotSection > 0}`);

    const liveSection = await page.locator('text=Live Dealer Tables').count();
    console.log(`Live Dealer section visible: ${liveSection > 0}`);

    const newGamesSection = await page.locator('text=New Games').count();
    console.log(`New Games section visible: ${newGamesSection > 0}`);

    // Count visible game cards (looking for game names)
    const gameNames = await page.locator('text=/Sweet Bonanza|Gates of Olympus|Wolf Gold/').count();
    console.log(`Sample game names found: ${gameNames}`);

    // Check for images
    const images = await page.locator('img').count();
    console.log(`Total images on page: ${images}`);

    // Take screenshot of homepage
    await page.screenshot({ path: '/tmp/homepage-detailed.png', fullPage: true });
    console.log('Homepage screenshot saved to /tmp/homepage-detailed.png');

    // Navigate to /games/pokies
    console.log('\n=== TESTING /games/pokies PAGE ===');
    await page.goto('http://localhost:3000/games/pokies', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    const pokiesTitle = await page.locator('h1:has-text("Pokies")').count();
    console.log(`Pokies page title visible: ${pokiesTitle > 0}`);

    const pokiesGames = await page.locator('text=/Sweet Bonanza|Gates of Olympus|Wolf Gold/').count();
    console.log(`Games found on pokies page: ${pokiesGames}`);

    // Take screenshot of pokies page
    await page.screenshot({ path: '/tmp/pokies-page.png', fullPage: true });
    console.log('Pokies page screenshot saved to /tmp/pokies-page.png');

    // Print any errors
    if (errors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      errors.forEach(err => {
        console.log(`Error: ${err.message}`);
      });
    } else {
      console.log('\n=== NO PAGE ERRORS ===');
    }

    // Print console errors
    const consoleErrors = consoleMessages.filter(msg => msg.type === 'error');
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach(msg => {
        console.log(`${msg.text}`);
      });
    } else {
      console.log('\n=== NO CONSOLE ERRORS ===');
    }

    console.log('\n=== SUMMARY ===');
    console.log('✅ Homepage loads successfully');
    console.log(`✅ Game sections visible: ${pokiesSection > 0 && jackpotSection > 0 && liveSection > 0}`);
    console.log(`✅ Games are rendering: ${gameNames > 0}`);
    console.log(`✅ /games/pokies page accessible: ${pokiesTitle > 0}`);

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
