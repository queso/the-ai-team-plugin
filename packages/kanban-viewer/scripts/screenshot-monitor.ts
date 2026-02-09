#!/usr/bin/env tsx
/**
 * Monitor the kanban board and take screenshots at key moments.
 * Specifically watching for Lynch reviewing items.
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  console.log('Opening kanban board...');
  await page.goto('http://localhost:3000');

  // Take initial screenshot
  await page.screenshot({ path: 'e2e-initial-state.png', fullPage: true });
  console.log('✓ Initial state screenshot saved');

  // Wait a bit for items to start appearing
  await page.waitForTimeout(5000);

  // Monitor for changes and take screenshots
  const maxScreenshots = 15;
  const interval = 3000; // every 3 seconds

  console.log('Monitoring board state...');

  for (let i = 0; i < maxScreenshots; i++) {
    await page.waitForTimeout(interval);

    // Check if there are items in review stage
    const reviewItems = await page.locator('[data-stage-id="review"]').count();

    if (reviewItems > 0) {
      // Check if Lynch is active in the agent status bar
      const lynchStatus = await page.locator('text=/Lynch/i').first();
      const isVisible = await lynchStatus.isVisible().catch(() => false);

      if (isVisible) {
        const filename = `e2e-lynch-reviewing-${Date.now()}.png`;
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`✓ Screenshot saved: ${filename} (Lynch is active!)`);
      }
    }

    // Take periodic screenshots
    if (i % 4 === 0) {
      const filename = `e2e-mid-simulation-${i}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`✓ Periodic screenshot: ${filename}`);
    }
  }

  // Take final screenshot
  await page.screenshot({ path: 'e2e-final-state.png', fullPage: true });
  console.log('✓ Final state screenshot saved');

  await browser.close();
  console.log('Monitoring complete!');
}

main().catch(console.error);
