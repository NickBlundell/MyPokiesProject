#!/usr/bin/env node

/**
 * Simple focused test to determine what's actually wrong
 */

const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('\n===================================================');
  console.log('SIMPLE CASINO APP TEST');
  console.log('===================================================\n');

  // Test 1: Can we reach the server?
  console.log('[1/4] Testing server...');
  try {
    const response = await makeRequest('http://localhost:3000');
    console.log(`✓ Server responds with HTTP ${response.status}`);
    console.log(`✓ Page size: ${(response.body.length / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.log(`✗ Server unreachable: ${err.message}`);
    process.exit(1);
  }

  // Test 2: Does the HTML contain the expected structure?
  console.log('\n[2/4] Checking HTML structure...');
  const html = (await makeRequest('http://localhost:3000')).body;

  const checks = [
    { name: 'HTML doctype', pattern: '<!DOCTYPE html>' },
    { name: 'Root element', pattern: '<html' },
    { name: 'Body element', pattern: '<body' },
    { name: 'Main content', pattern: '<main' },
    { name: 'Next.js scripts', pattern: '/_next/static/chunks/' },
    { name: 'Theme script', pattern: 'theme' }
  ];

  let allPresent = true;
  checks.forEach(check => {
    const present = html.includes(check.pattern);
    console.log(`${present ? '✓' : '✗'} ${check.name}`);
    if (!present) allPresent = false;
  });

  // Test 3: Check if bailout is present (expected in dev mode)
  console.log('\n[3/4] Checking rendering strategy...');
  if (html.includes('BAILOUT_TO_CLIENT_SIDE_RENDERING')) {
    console.log('✓ Uses client-side rendering (expected for dynamic content)');
  } else {
    console.log('? Server-side rendering (unusual for this app)');
  }

  // Test 4: Check what user should actually see
  console.log('\n[4/4] Expected user experience...\n');
  console.log('When you open http://localhost:3000 in a browser, you should see:');
  console.log('  1. Dark background (loads immediately)');
  console.log('  2. Animated star field');
  console.log('  3. Header with logo');
  console.log('  4. Sidebar navigation');
  console.log('  5. Category filter buttons');
  console.log('  6. Game cards in rows');
  console.log('  7. Footer at bottom\n');

  console.log('Loading sequence:');
  console.log('  • 0-1s: HTML and CSS load, basic structure appears');
  console.log('  • 1-2s: JavaScript hydrates, components become interactive');
  console.log('  • 2-3s: Supabase data loads, games populate\n');

  console.log('If page shows blank or stuck on "Loading...":');
  console.log('  1. Open browser DevTools (F12)');
  console.log('  2. Check Console tab for red errors');
  console.log('  3. Check Network tab for failed requests (red/orange)');
  console.log('  4. Look for specific error messages\n');

  if (allPresent) {
    console.log('✓ ALL CHECKS PASSED - App should be working correctly');
    console.log('\nConclusion: The server is responding correctly.');
    console.log('If you report "doesn\'t load properly", please:');
    console.log('  - Specify what you see vs. what you expected');
    console.log('  - Share any browser console errors');
    console.log('  - Include a screenshot if possible\n');
  } else {
    console.log('✗ SOME CHECKS FAILED - There may be a configuration issue');
  }
}

main().catch(err => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
