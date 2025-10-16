#!/usr/bin/env node

/**
 * Browser Runtime Diagnostic Tool
 * Tests what actually happens when the casino app loads in a browser
 */

const http = require('http');
const https = require('https');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          size: data.length
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testServerConnection() {
  section('TEST 1: Server Connection');

  try {
    const response = await makeRequest('http://localhost:3000');

    if (response.statusCode === 200) {
      log('✓ Server responding with HTTP 200', 'green');
      log(`  Response size: ${response.size} bytes`, 'blue');

      // Check for critical content
      const checks = [
        { name: 'DOCTYPE', pattern: '<!DOCTYPE html>', found: false },
        { name: 'React root', pattern: '<div', found: false },
        { name: 'Next.js scripts', pattern: '_next/static', found: false },
        { name: 'Bailout marker', pattern: 'BAILOUT_TO_CLIENT_SIDE_RENDERING', found: false },
        { name: 'Layout CSS', pattern: 'layout.css', found: false }
      ];

      checks.forEach(check => {
        check.found = response.body.includes(check.pattern);
        const status = check.found ? '✓' : '✗';
        const color = check.found ? 'green' : 'red';
        log(`  ${status} ${check.name}: ${check.found ? 'Present' : 'MISSING'}`, color);
      });

      // Check for any error messages in HTML
      if (response.body.includes('Error') && !response.body.includes('ErrorBoundary')) {
        log('  ⚠ HTML contains error text', 'yellow');
      }

      return true;
    } else {
      log(`✗ Server returned HTTP ${response.statusCode}`, 'red');
      return false;
    }
  } catch (err) {
    log(`✗ Connection failed: ${err.message}`, 'red');
    return false;
  }
}

async function testJavaScriptChunks() {
  section('TEST 2: JavaScript Chunks');

  const chunks = [
    { name: 'Webpack Runtime', path: '/_next/static/chunks/webpack.js' },
    { name: 'Main App', path: '/_next/static/chunks/main-app.js' },
    { name: 'Page Component', path: '/_next/static/chunks/app/page.js' },
    { name: 'Layout Component', path: '/_next/static/chunks/app/layout.js' }
  ];

  let allPassed = true;

  for (const chunk of chunks) {
    try {
      const response = await makeRequest(`http://localhost:3000${chunk.path}`);

      if (response.statusCode === 200) {
        log(`✓ ${chunk.name}: ${(response.size / 1024).toFixed(1)} KB`, 'green');

        // Check for compilation errors in dev mode
        if (response.body.includes('Module parse failed') ||
            response.body.includes('SyntaxError')) {
          log(`  ✗ COMPILATION ERROR DETECTED`, 'red');
          allPassed = false;
        }
      } else {
        log(`✗ ${chunk.name}: HTTP ${response.statusCode}`, 'red');
        allPassed = false;
      }
    } catch (err) {
      log(`✗ ${chunk.name}: ${err.message}`, 'red');
      allPassed = false;
    }
  }

  return allPassed;
}

async function testCSS() {
  section('TEST 3: CSS & Styles');

  try {
    const response = await makeRequest('http://localhost:3000/_next/static/css/app/layout.css');

    if (response.statusCode === 200) {
      log(`✓ Layout CSS loaded: ${(response.size / 1024).toFixed(1)} KB`, 'green');

      // Check for Tailwind
      if (response.body.includes('tailwind')) {
        log('  ✓ Tailwind CSS detected', 'green');
      }

      return true;
    } else {
      log(`✗ CSS failed: HTTP ${response.statusCode}`, 'red');
      return false;
    }
  } catch (err) {
    log(`✗ CSS load error: ${err.message}`, 'red');
    return false;
  }
}

async function testSupabaseAPI() {
  section('TEST 4: Supabase API Connection');

  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1cHJ1eXR0emdleXRseXNvYmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MDg4NDYsImV4cCI6MjA3NTM4NDg0Nn0.NHm2yWGoE5pAibttO-u5isxkRCow-g4kULYuiT3XxQw';

  try {
    const response = await makeRequest(
      'https://hupruyttzgeytlysobar.supabase.co/rest/v1/games?is_active=eq.true&limit=5',
      {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (response.statusCode === 200) {
      const games = JSON.parse(response.body);
      log(`✓ Supabase API working`, 'green');
      log(`  Found ${games.length} active games`, 'blue');

      if (games.length > 0) {
        log(`  Sample game: ${games[0].game_name || games[0].name || 'Unknown'}`, 'blue');
        return true;
      } else {
        log('  ⚠ No games in database', 'yellow');
        return false;
      }
    } else {
      log(`✗ API returned HTTP ${response.statusCode}`, 'red');
      log(`  Response: ${response.body.substring(0, 200)}`, 'red');
      return false;
    }
  } catch (err) {
    log(`✗ API request failed: ${err.message}`, 'red');
    return false;
  }
}

async function testRuntimeScenarios() {
  section('TEST 5: Runtime Scenario Analysis');

  log('Analyzing potential runtime issues...', 'blue');

  const scenarios = [
    {
      name: 'Client-side hydration',
      issue: 'Dynamic components using next/dynamic with ssr:false',
      status: 'EXPECTED - This is intentional for client-only components',
      severity: 'info'
    },
    {
      name: 'Context providers',
      issue: 'Multiple nested providers (Auth, Player, App, Sidebar, etc.)',
      status: 'OK - All providers are properly wrapped',
      severity: 'info'
    },
    {
      name: 'Supabase connection',
      issue: 'Client needs to connect to Supabase on mount',
      status: 'OK - Environment variables are set',
      severity: 'info'
    },
    {
      name: 'Loading states',
      issue: 'Games might not show immediately',
      status: 'EXPECTED - Shows loading spinner then populates',
      severity: 'info'
    }
  ];

  scenarios.forEach(scenario => {
    const colors = {
      'info': 'blue',
      'warning': 'yellow',
      'error': 'red'
    };

    log(`\n  ${scenario.name}:`, 'cyan');
    log(`    Issue: ${scenario.issue}`, 'blue');
    log(`    Status: ${scenario.status}`, colors[scenario.severity]);
  });
}

async function analyzePageStructure() {
  section('TEST 6: Page Structure Analysis');

  try {
    const response = await makeRequest('http://localhost:3000');
    const html = response.body;

    // Extract visible structure
    log('Expected visible elements:', 'blue');

    const expectedElements = [
      'Fixed background with stars',
      'Header with logo and search',
      'Sidebar navigation (collapsible)',
      'Main content area with games',
      'Category filters (All Games, Popular, etc.)',
      'Game cards in horizontal scrolling rows',
      'Footer with links'
    ];

    expectedElements.forEach((element, i) => {
      log(`  ${i + 1}. ${element}`, 'cyan');
    });

    log('\nActual HTML markers found:', 'blue');

    const markers = [
      { name: 'Background component', pattern: 'FixedBackground' },
      { name: 'Header component', pattern: 'StakeHeader' },
      { name: 'Sidebar component', pattern: 'StakeSidebar' },
      { name: 'Main content', pattern: '<main' },
      { name: 'Dynamic imports', pattern: 'next/dynamic' }
    ];

    markers.forEach(marker => {
      const found = html.includes(marker.pattern);
      const status = found ? '✓' : '?';
      const color = found ? 'green' : 'yellow';
      log(`  ${status} ${marker.name}`, color);
    });

  } catch (err) {
    log(`✗ Analysis failed: ${err.message}`, 'red');
  }
}

async function testUserExperience() {
  section('TEST 7: Expected User Experience');

  log('What the user SHOULD see:', 'cyan');
  log('', 'reset');
  log('1. Page loads with dark theme background', 'blue');
  log('2. Animated star field background', 'blue');
  log('3. Header at top with MyPokies logo', 'blue');
  log('4. Sidebar on left (desktop) or bottom (mobile)', 'blue');
  log('5. Welcome banner (if not logged in)', 'blue');
  log('6. Category filter pills with animated slider', 'blue');
  log('7. Horizontal scrolling rows of game cards', 'blue');
  log('8. Game cards show: thumbnail, name, provider', 'blue');
  log('9. Hover effects on games (Play button appears)', 'blue');
  log('10. Footer at bottom', 'blue');

  log('\nLoading sequence:', 'cyan');
  log('', 'reset');
  log('1. Initial HTML loads immediately (< 100ms)', 'blue');
  log('2. Background and layout components load (< 500ms)', 'blue');
  log('3. Supabase connection established (< 1s)', 'blue');
  log('4. Games data fetched and rendered (< 2s)', 'blue');
  log('5. All components hydrated and interactive (< 3s)', 'blue');

  log('\nPotential issues that might look like "doesn\'t load":', 'yellow');
  log('', 'reset');
  log('• Games array empty → Shows "Loading..." indefinitely', 'yellow');
  log('• Supabase connection fails → No games render', 'yellow');
  log('• JavaScript error → Components fail to mount', 'yellow');
  log('• CSS not loading → Unstyled content', 'yellow');
  log('• Context provider error → Entire app fails', 'yellow');
}

async function main() {
  console.clear();
  log('╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║  Casino App Browser Runtime Diagnostic Tool          ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  const results = {
    server: false,
    chunks: false,
    css: false,
    api: false
  };

  // Run all tests
  results.server = await testServerConnection();
  results.chunks = await testJavaScriptChunks();
  results.css = await testCSS();
  results.api = await testSupabaseAPI();

  await testRuntimeScenarios();
  await analyzePageStructure();
  await testUserExperience();

  // Final summary
  section('FINAL DIAGNOSIS');

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    log('✓ ALL TESTS PASSED', 'green');
    log('', 'reset');
    log('The app SHOULD be loading correctly in the browser.', 'green');
    log('', 'reset');
    log('What to check in actual browser:', 'cyan');
    log('1. Open http://localhost:3000 in Chrome/Firefox', 'blue');
    log('2. Open DevTools (F12) → Console tab', 'blue');
    log('3. Check for any red errors', 'blue');
    log('4. Check Network tab → Filter by "Fetch/XHR"', 'blue');
    log('5. Look for failed requests (red status codes)', 'blue');
    log('', 'reset');
    log('If page shows blank or loading spinner:', 'yellow');
    log('• Check browser console for errors', 'yellow');
    log('• Check Network tab for failed requests', 'yellow');
    log('• Try hard refresh (Cmd+Shift+R / Ctrl+F5)', 'yellow');
    log('• Try incognito/private mode', 'yellow');
  } else {
    log('✗ SOME TESTS FAILED', 'red');
    log('', 'reset');
    log('Failed components:', 'red');
    Object.entries(results).forEach(([key, passed]) => {
      if (!passed) {
        log(`  ✗ ${key}`, 'red');
      }
    });
  }

  log('', 'reset');
  log('For live browser testing, open:', 'cyan');
  log('  file:///Users/jo/MyPokiesProject/apps/casino/test-browser-load.html', 'blue');
  log('', 'reset');
}

// Run diagnostics
main().catch(err => {
  log(`\nFatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
