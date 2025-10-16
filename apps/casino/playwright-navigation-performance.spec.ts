import { test, expect } from '@playwright/test';

test.describe('Navigation Performance Analysis', () => {

  test('Test 1: Measure home page navigation times', async ({ page }) => {
    console.log('\n=== TEST 1: Home Page Navigation Performance ===');

    const navigationTimes: number[] = [];
    const routes = [
      { name: 'Home', path: '/' },
      { name: 'Pokies', path: '/games/pokies' },
      { name: 'Live Casino', path: '/games/live' },
      { name: 'Jackpot', path: '/jackpot' },
      { name: 'Promotions', path: '/promotions' },
      { name: 'VIP', path: '/vip' },
      { name: 'Back to Home', path: '/' }
    ];

    for (const route of routes) {
      console.log(`\nNavigating to: ${route.name}`);

      const startTime = Date.now();
      await page.goto(`http://localhost:3000${route.path}`);
      await page.waitForLoadState('networkidle');
      const endTime = Date.now();

      const duration = endTime - startTime;
      navigationTimes.push(duration);

      console.log(`  Time: ${duration}ms`);
      console.log(`  URL: ${page.url()}`);

      // Take screenshot
      await page.screenshot({
        path: `test-results/nav-perf-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`
      });
    }

    const avgTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    const maxTime = Math.max(...navigationTimes);
    const minTime = Math.min(...navigationTimes);

    console.log('\n=== Navigation Performance Summary ===');
    console.log(`Average: ${avgTime.toFixed(0)}ms`);
    console.log(`Fastest: ${minTime}ms`);
    console.log(`Slowest: ${maxTime}ms`);
    console.log(`All times: ${navigationTimes.join(', ')}ms`);

    // Performance expectations
    expect(avgTime).toBeLessThan(5000); // Average should be under 5 seconds
    expect(maxTime).toBeLessThan(10000); // No navigation should take more than 10 seconds
  });

  test('Test 2: Measure network activity during navigation', async ({ page }) => {
    console.log('\n=== TEST 2: Network Activity Analysis ===');

    const networkStats: { [key: string]: { requests: number, totalSize: number, slowRequests: any[] } } = {};

    page.on('request', request => {
      const url = new URL(request.url());
      const path = url.pathname;

      if (!networkStats[path]) {
        networkStats[path] = { requests: 0, totalSize: 0, slowRequests: [] };
      }
      networkStats[path].requests++;
    });

    page.on('response', async response => {
      const url = new URL(response.url());
      const path = url.pathname;

      if (!networkStats[path]) {
        networkStats[path] = { requests: 0, totalSize: 0, slowRequests: [] };
      }

      try {
        const buffer = await response.body();
        networkStats[path].totalSize += buffer.length;

        const timing = response.request().timing();
        if (timing && timing.responseEnd - timing.requestStart > 1000) {
          networkStats[path].slowRequests.push({
            url: response.url(),
            status: response.status(),
            time: timing.responseEnd - timing.requestStart
          });
        }
      } catch (e) {
        // Some responses can't be read
      }
    });

    // Navigate through key pages
    const routes = ['/', '/games/pokies', '/promotions', '/jackpot'];

    for (const route of routes) {
      console.log(`\nLoading: ${route}`);
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    console.log('\n=== Network Statistics ===');
    const sortedPaths = Object.keys(networkStats).sort((a, b) =>
      networkStats[b].totalSize - networkStats[a].totalSize
    );

    for (const path of sortedPaths.slice(0, 10)) {
      const stats = networkStats[path];
      console.log(`\n${path}:`);
      console.log(`  Requests: ${stats.requests}`);
      console.log(`  Total Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      if (stats.slowRequests.length > 0) {
        console.log(`  Slow Requests (>1s): ${stats.slowRequests.length}`);
        stats.slowRequests.forEach(req => {
          console.log(`    - ${req.url} (${req.time.toFixed(0)}ms)`);
        });
      }
    }
  });

  test('Test 3: Measure JavaScript execution time', async ({ page }) => {
    console.log('\n=== TEST 3: JavaScript Execution Time ===');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Measure React hydration time
    const hydrationMetrics = await page.evaluate(() => {
      const performance = window.performance;
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
        domInteractive: navTiming.domInteractive - navTiming.fetchStart,
        domComplete: navTiming.domComplete - navTiming.fetchStart,
        loadComplete: navTiming.loadEventEnd - navTiming.fetchStart
      };
    });

    console.log('\n=== Page Load Metrics ===');
    console.log(`DOM Content Loaded: ${hydrationMetrics.domContentLoaded.toFixed(0)}ms`);
    console.log(`DOM Interactive: ${hydrationMetrics.domInteractive.toFixed(0)}ms`);
    console.log(`DOM Complete: ${hydrationMetrics.domComplete.toFixed(0)}ms`);
    console.log(`Load Complete: ${hydrationMetrics.loadComplete.toFixed(0)}ms`);

    // Navigate to another page and measure
    console.log('\n=== Client-Side Navigation Metrics ===');
    const startTime = Date.now();

    await page.click('a[href="/games/pokies"]');
    await page.waitForURL('**/games/pokies');
    await page.waitForLoadState('networkidle');

    const navigationTime = Date.now() - startTime;
    console.log(`Navigation Time: ${navigationTime}ms`);

    expect(navigationTime).toBeLessThan(3000);
  });

  test('Test 4: Identify render-blocking resources', async ({ page }) => {
    console.log('\n=== TEST 4: Render-Blocking Resources ===');

    const blockingResources: any[] = [];

    page.on('response', async response => {
      const request = response.request();
      const resourceType = request.resourceType();
      const timing = request.timing();

      if (timing && (resourceType === 'stylesheet' || resourceType === 'script')) {
        const duration = timing.responseEnd - timing.requestStart;
        if (duration > 500) {
          blockingResources.push({
            type: resourceType,
            url: response.url(),
            status: response.status(),
            size: response.headers()['content-length'] || 'unknown',
            duration: duration
          });
        }
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('\n=== Slow Resources (>500ms) ===');
    if (blockingResources.length === 0) {
      console.log('No slow resources detected');
    } else {
      blockingResources
        .sort((a, b) => b.duration - a.duration)
        .forEach(resource => {
          console.log(`\n${resource.type.toUpperCase()}: ${resource.url}`);
          console.log(`  Duration: ${resource.duration.toFixed(0)}ms`);
          console.log(`  Status: ${resource.status}`);
          console.log(`  Size: ${resource.size}`);
        });
    }
  });

  test('Test 5: Memory and CPU usage indicators', async ({ page }) => {
    console.log('\n=== TEST 5: Resource Usage Analysis ===');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check memory usage via Performance API
    const memoryStats = await page.evaluate(() => {
      const perf = performance as any;
      if (perf.memory) {
        return {
          usedJSHeapSize: (perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
          totalJSHeapSize: (perf.memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
          jsHeapSizeLimit: (perf.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
        };
      }
      return null;
    });

    if (memoryStats) {
      console.log('\n=== Memory Usage ===');
      console.log(`Used JS Heap: ${memoryStats.usedJSHeapSize} MB`);
      console.log(`Total JS Heap: ${memoryStats.totalJSHeapSize} MB`);
      console.log(`JS Heap Limit: ${memoryStats.jsHeapSizeLimit} MB`);
    }

    // Count DOM nodes
    const domStats = await page.evaluate(() => {
      return {
        totalNodes: document.getElementsByTagName('*').length,
        divs: document.getElementsByTagName('div').length,
        images: document.getElementsByTagName('img').length,
        scripts: document.getElementsByTagName('script').length,
        styles: document.getElementsByTagName('style').length
      };
    });

    console.log('\n=== DOM Statistics ===');
    console.log(`Total DOM Nodes: ${domStats.totalNodes}`);
    console.log(`  Divs: ${domStats.divs}`);
    console.log(`  Images: ${domStats.images}`);
    console.log(`  Scripts: ${domStats.scripts}`);
    console.log(`  Styles: ${domStats.styles}`);

    // Warn if DOM is too large
    if (domStats.totalNodes > 1500) {
      console.log('\n⚠️  WARNING: Large DOM detected (>1500 nodes)');
      console.log('   This can cause slow rendering and navigation');
    }
  });

  test('Test 6: Component mount/unmount timing', async ({ page }) => {
    console.log('\n=== TEST 6: Component Lifecycle Analysis ===');

    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('mount') || text.includes('unmount') || text.includes('render')) {
        consoleLogs.push(text);
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('\n=== Initial Page Load ===');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('  No mount/unmount logs detected');
    }

    // Navigate to trigger unmount/remount
    consoleLogs.length = 0;
    await page.click('a[href="/games/pokies"]');
    await page.waitForURL('**/games/pokies');
    await page.waitForTimeout(1000);

    console.log('\n=== After Navigation ===');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('  No mount/unmount logs detected');
    }
  });

  test('Test 7: Identify excessive re-renders', async ({ page }) => {
    console.log('\n=== TEST 7: Re-render Detection ===');

    let renderCount = 0;

    page.on('console', msg => {
      const text = msg.text();
      if (text.toLowerCase().includes('render') && !text.includes('hydration')) {
        renderCount++;
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait to detect any ongoing re-renders

    console.log(`\nDetected ${renderCount} render-related console logs`);

    if (renderCount > 10) {
      console.log('⚠️  WARNING: Excessive rendering detected');
      console.log('   This may indicate unnecessary re-renders');
    }
  });
});
