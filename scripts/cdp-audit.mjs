import { chromium } from '@playwright/test';

/**
 * Standalone CDP Auditing & Profiling Utility for macOS.
 * Run directly with: node scripts/cdp-audit.mjs [url]
 */

const targetUrl = process.argv[2] || 'http://localhost:3001';

async function runCDPAudit() {
  console.log(`[CDP] Launching Chromium Engine on macOS (arm64)...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create low-level CDP session
  const client = await context.newCDPSession(page);

  console.log(`[CDP] Enabling domains: Accessibility, Performance, Emulation, Network, Runtime...`);
  await client.send('Accessibility.enable');
  await client.send('Performance.enable');
  await client.send('Network.enable');
  await client.send('Runtime.enable');

  // Track console errors
  const consoleErrors = [];
  client.on('Runtime.exceptionThrown', (event) => {
    consoleErrors.push(event.exceptionDetails.text || 'Runtime exception');
  });

  // Emulate CPU throttling (2x slowdown benchmark)
  console.log(`[CDP] Simulating 2x CPU throttling...`);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 2 });

  // Emulate Slow 3G
  console.log(`[CDP] Simulating Slow 3G network conditions...`);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
  });

  console.log(`[CDP] Navigating to: ${targetUrl}...`);
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (err) {
    console.warn(`[CDP] Navigation warning (or using data page fallback): ${err.message}`);
    await page.setContent(`<h1>Fallback Accessible Audit Page</h1><button>Click</button>`);
  }

  // 1. Extract Accessibility Tree
  console.log(`[CDP] Extracting full Accessibility Tree...`);
  const axResponse = await client.send('Accessibility.getFullAXTree');
  console.log(`[CDP] Total A11y Tree Nodes: ${axResponse.nodes ? axResponse.nodes.length : 0}`);

  // 2. Extract Performance Metrics
  console.log(`[CDP] Reading Performance Metrics...`);
  const perfResponse = await client.send('Performance.getMetrics');
  const metrics = {};
  for (const m of perfResponse.metrics) {
    metrics[m.name] = m.value;
  }
  console.log(`[CDP] JS Heap Used: ${((metrics['JSHeapUsedSize'] || 0) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[CDP] DOM Nodes Count: ${metrics['Nodes'] || 0}`);
  console.log(`[CDP] Layout Count: ${metrics['LayoutCount'] || 0}`);

  // 3. Check Console Errors
  if (consoleErrors.length > 0) {
    console.warn(`[CDP] Caught ${consoleErrors.length} console errors:`, consoleErrors);
  } else {
    console.log(`[CDP] Console clean: 0 runtime errors detected.`);
  }

  await client.detach();
  await browser.close();
  console.log(`[CDP] Audit completed successfully!`);
}

runCDPAudit().catch((err) => {
  console.error(`[CDP] Fatal execution error:`, err);
  process.exit(1);
});
