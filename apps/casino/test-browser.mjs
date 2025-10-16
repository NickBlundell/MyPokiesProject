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

    // Navigate to the page
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for React to hydrate
    await page.waitForTimeout(5000);

    // Take a screenshot
    await page.screenshot({ path: '/tmp/homepage.png', fullPage: true });
    console.log('Screenshot saved to /tmp/homepage.png');

    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check if games are visible
    const gamesVisible = await page.locator('[class*="GameCard"]').count();
    console.log(`\nGameCard components found: ${gamesVisible}`);

    // Check for loading state
    const loadingText = await page.locator('text=Loading games').count();
    console.log(`Loading indicator visible: ${loadingText > 0}`);

    // Check for error messages
    const errorText = await page.locator('text=error').count();
    console.log(`Error text on page: ${errorText}`);

    // Print console messages
    console.log('\n=== CONSOLE MESSAGES ===');
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error' || msg.type === 'warning');
    if (errorMessages.length > 0) {
      errorMessages.forEach(msg => {
        console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
      });
    } else {
      console.log('No errors or warnings in console');
    }

    // Print errors
    if (errors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      errors.forEach(err => {
        console.log(`Error: ${err.message}`);
        if (err.stack) console.log(err.stack);
      });
    } else {
      console.log('\n=== PAGE ERRORS ===');
      console.log('No page errors');
    }

    // Get HTML content to check what's rendered
    const bodyContent = await page.content();
    const hasGamesSection = bodyContent.includes('Pokies') || bodyContent.includes('game');
    console.log(`\nPage contains game-related content: ${hasGamesSection}`);

  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
