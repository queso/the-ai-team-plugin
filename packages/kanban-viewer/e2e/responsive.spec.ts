import { test, expect } from "@playwright/test";

test.describe("Responsive Layout", () => {
  test("desktop: shows full layout with side panel", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // All 8 columns should be visible (including Probing)
    const columns = page.getByTestId("board-column");
    await expect(columns).toHaveCount(8);

    // Live feed panel should be visible
    await expect(page.getByTestId("live-feed-panel")).toBeVisible();
  });

  test("tablet: columns scroll horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Columns should still be present
    const columns = page.getByTestId("board-column");
    await expect(columns.first()).toBeVisible();

    // Live feed panel should be hidden on tablet
    await expect(page.getByTestId("live-feed-panel")).not.toBeVisible();
  });

  test("mobile: columns still accessible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // At least first column should be visible
    const firstColumn = page.getByTestId("board-column").first();
    await expect(firstColumn).toBeVisible();

    // Live feed panel should be hidden
    await expect(page.getByTestId("live-feed-panel")).not.toBeVisible();
  });

  test("header bar adapts to screen size", async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId("status-indicator")).toBeVisible();
    await expect(page.getByTestId("timer-display")).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Header elements should still be visible
    await expect(page.getByTestId("status-indicator")).toBeVisible();
    await expect(page.getByTestId("timer-display")).toBeVisible();
  });

  test("agent status bar visible at all sizes", async ({ page }) => {
    const viewports = [
      { width: 1280, height: 720 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

      await expect(page.getByTestId("agent-status-bar")).toBeVisible();
    }
  });

  test("live feed panel has correct width on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    const liveFeedPanel = page.getByTestId("live-feed-panel");
    await expect(liveFeedPanel).toBeVisible();

    // The width class w-[400px] is on the parent wrapper div, not the panel itself
    // Get the parent element that contains the width styling
    const panelWrapper = liveFeedPanel.locator("xpath=..");
    const wrapperClass = await panelWrapper.getAttribute("class");

    // Verify the wrapper has w-[400px] width class
    expect(wrapperClass).toContain("w-[400px]");

    // Also verify width is approximately 400px (within 5px for rendering differences)
    const width = await panelWrapper.evaluate((el) => {
      return parseInt(window.getComputedStyle(el).width);
    });
    expect(width).toBeGreaterThanOrEqual(395);
    expect(width).toBeLessThanOrEqual(405);
  });
});
