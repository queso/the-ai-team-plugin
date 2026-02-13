import { test, expect } from "@playwright/test";

test.describe("Board Load", () => {
  test("displays all 8 columns including Probing", async ({ page }) => {
    await page.goto("/");

    // Wait for loading to complete
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Verify all 8 column headers are visible (including new Probing stage)
    const columns = ["BRIEFINGS", "READY", "TESTING", "IMPLEMENTING", "REVIEW", "PROBING", "DONE", "BLOCKED"];
    for (const column of columns) {
      await expect(page.getByText(column, { exact: true })).toBeVisible();
    }
  });

  test("displays header bar with mission info", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Header should show some mission name (loaded from board.json dynamically)
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Header should show status indicator
    await expect(page.getByTestId("status-indicator")).toBeVisible();

    // Header should show timer
    await expect(page.getByTestId("timer-display")).toBeVisible();
  });

  test("displays agent status bar at bottom", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Agent status bar should be visible (fixed at bottom)
    const agentBar = page.getByTestId("agent-status-bar");
    await expect(agentBar).toBeVisible({ timeout: 10000 });

    // Agent bar should contain agent badges
    await expect(agentBar.getByTestId("agent-badge-Hannibal")).toBeVisible();
  });

  test("displays live feed panel on right (desktop)", async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Live feed panel should be visible
    await expect(page.getByTestId("live-feed-panel")).toBeVisible();

    // Should have tab options - use role selector to be more specific
    await expect(page.getByRole("tab", { name: "Live Feed" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Human Input/ })).toBeVisible();
  });

  test("handles board with work items", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Should display work item cards
    const cards = page.getByTestId("work-item-card");
    await expect(cards.first()).toBeVisible();
  });

  test("Probing column is displayed with proper styling", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Find the Probing column by exact header match
    const probingHeader = page.getByText("PROBING", { exact: true }).first();
    await expect(probingHeader).toBeVisible();

    // Get the parent column element
    const probingColumn = probingHeader.locator("xpath=ancestor::div[@data-testid='board-column']");
    await expect(probingColumn).toBeVisible();

    // Verify the column has the standard background class
    const columnClass = await probingColumn.getAttribute("class");
    expect(columnClass).toContain("bg-muted/30");
  });

  test("agent status bar displays AGENTS label", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });

    // Agent status bar should have AGENTS label
    const agentBar = page.getByTestId("agent-status-bar");
    await expect(agentBar).toBeVisible();

    // Verify AGENTS label is present
    await expect(agentBar.getByText("AGENTS", { exact: true })).toBeVisible();
  });
});
