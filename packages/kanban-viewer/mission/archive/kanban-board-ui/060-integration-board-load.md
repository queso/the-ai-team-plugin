---
id: "060"
title: "Integration test: Board loads with all columns"
type: "feature"
status: "pending"
dependencies: ["050", "051"]
parallel_group: "integration-tests"
rejection_count: 0
outputs:
  types: "e2e/board-load.spec.ts"
  test: "e2e/board-load.spec.ts"
  impl: "e2e/board-load.spec.ts"
---

## Objective

Create Playwright integration test verifying the board loads and displays all 7 columns correctly.

## Acceptance Criteria

- [ ] Test navigates to board page
- [ ] Verifies all 7 column headers are visible (Briefings, Ready, Testing, Implementing, Review, Done, Blocked)
- [ ] Verifies header bar is present with mission info
- [ ] Verifies agent status bar is present at bottom
- [ ] Verifies live feed panel is present on right
- [ ] Test passes with sample data in mission folder
- [ ] Test handles empty board state

## Context

This is the primary smoke test for the board UI.

Test setup:
1. Create sample work items in mission/briefings/ and mission/ready/
2. Create sample board.json with metadata
3. Navigate to / and verify UI loads

Playwright test structure:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Board Load', () => {
  test('displays all 7 columns', async ({ page }) => {
    await page.goto('/');

    const columns = ['Briefings', 'Ready', 'Testing', 'Implementing', 'Review', 'Done', 'Blocked'];
    for (const column of columns) {
      await expect(page.getByRole('heading', { name: column })).toBeVisible();
    }
  });
});
```
