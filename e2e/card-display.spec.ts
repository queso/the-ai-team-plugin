import { test, expect } from "@playwright/test";

test.describe("Card Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Loading mission data...")).not.toBeVisible({ timeout: 10000 });
  });

  test("displays work item cards in columns", async ({ page }) => {
    // Cards should be rendered
    const cards = page.getByTestId("work-item-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("cards show item title", async ({ page }) => {
    const firstCard = page.getByTestId("work-item-card").first();
    await expect(firstCard).toBeVisible();

    // Card should contain text (the title)
    const cardText = await firstCard.textContent();
    expect(cardText?.length).toBeGreaterThan(0);
  });

  test("cards show type badge", async ({ page }) => {
    // Type badges (feature/bug/enhancement/task) should be visible on cards
    const cards = page.getByTestId("work-item-card");
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    // Cards should contain type text (feature, bug, enhancement, or task)
    const typeBadges = page.locator('[data-testid="work-item-card"] .rounded-full');
    const count = await typeBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("cards in correct columns based on stage", async ({ page }) => {
    // Done column should have cards (we have items in done)
    const doneColumn = page.locator('[data-testid="board-column"]').filter({ hasText: "DONE" });
    await expect(doneColumn).toBeVisible();

    // The done column should contain work item cards
    const doneCards = doneColumn.getByTestId("work-item-card");
    const count = await doneCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("columns show item count", async ({ page }) => {
    // Each column header should show item count
    const columns = page.getByTestId("board-column");
    const firstColumn = columns.first();

    // Should have item count displayed
    await expect(firstColumn.getByTestId("item-count")).toBeVisible();
  });

  test("columns that typically have WIP limits are present", async ({ page }) => {
    // Testing, implementing, review are stages that would have WIP limits
    const wipColumns = ["TESTING", "IMPLEMENTING", "REVIEW"];

    for (const columnName of wipColumns) {
      const column = page.locator('[data-testid="board-column"]').filter({ hasText: columnName });
      // Column should be visible
      await expect(column).toBeVisible();
      // Column should have item count displayed
      await expect(column.getByTestId("item-count")).toBeVisible();
    }
  });
});
