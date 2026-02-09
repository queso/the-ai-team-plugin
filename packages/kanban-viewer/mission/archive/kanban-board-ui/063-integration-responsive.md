---
id: "063"
title: "Integration test: Responsive layout"
type: "feature"
status: "pending"
dependencies: ["053"]
parallel_group: "integration-tests"
rejection_count: 0
outputs:
  types: "e2e/responsive.spec.ts"
  test: "e2e/responsive.spec.ts"
  impl: "e2e/responsive.spec.ts"
---

## Objective

Create Playwright integration test verifying responsive layout behavior at different viewport sizes.

## Acceptance Criteria

- [ ] Test desktop viewport (1280x720) shows full layout
- [ ] Test tablet viewport (768x1024) shows collapsible panel
- [ ] Test mobile viewport (375x667) shows stage selector
- [ ] Verifies panel toggle works on tablet
- [ ] Verifies stage selector works on mobile
- [ ] No horizontal overflow issues at any viewport
- [ ] All critical content remains accessible

## Context

This test validates responsive behavior from PRD requirements.

Playwright viewport testing:
```typescript
import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('desktop shows full layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // All columns visible
    await expect(page.locator('.board-column')).toHaveCount(7);
    // Right panel visible
    await expect(page.locator('.live-feed-panel')).toBeVisible();
  });

  test('mobile shows stage selector', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Stage selector visible
    await expect(page.getByRole('combobox', { name: /stage/i })).toBeVisible();
    // Only one column visible at a time
    await expect(page.locator('.board-column:visible')).toHaveCount(1);
  });
});
```

Also test using Playwright device presets:
```typescript
test.use({ ...devices['iPhone 13'] });
test.use({ ...devices['iPad Pro'] });
```
