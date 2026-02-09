---
id: "062"
title: "Integration test: SSE real-time updates"
type: "feature"
status: "pending"
dependencies: ["024", "052"]
parallel_group: "integration-tests"
rejection_count: 0
outputs:
  types: "e2e/sse-updates.spec.ts"
  test: "e2e/sse-updates.spec.ts"
  impl: "e2e/sse-updates.spec.ts"
---

## Objective

Create Playwright integration test verifying the SSE connection works and UI updates when files change.

## Acceptance Criteria

- [ ] Test verifies SSE connection establishes on page load
- [ ] Test modifies a file in mission folder during test
- [ ] Verifies UI updates without manual refresh
- [ ] Tests item-added event (create new file)
- [ ] Tests item-moved event (move file between folders)
- [ ] Tests board-updated event (modify board.json)
- [ ] Verifies updates appear within reasonable time (<2s)

## Context

This test validates the real-time update mechanism.

Test approach:
1. Load page and wait for initial render
2. Use Node.js fs to create/modify files during test
3. Wait for UI to update
4. Assert changes are reflected

Playwright test structure:
```typescript
import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

test('UI updates when file is created', async ({ page }) => {
  await page.goto('/');

  // Create new work item file
  const newItem = `---
id: "999"
title: "New Test Item"
type: "test"
---`;

  await fs.writeFile(
    path.join(process.cwd(), 'mission/briefings/999.md'),
    newItem
  );

  // Wait for card to appear
  await expect(page.getByText('New Test Item')).toBeVisible({ timeout: 5000 });

  // Cleanup
  await fs.unlink(path.join(process.cwd(), 'mission/briefings/999.md'));
});
```
