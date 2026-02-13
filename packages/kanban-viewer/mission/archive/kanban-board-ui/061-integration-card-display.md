---
id: "061"
title: "Integration test: Cards render with correct data"
type: "feature"
status: "pending"
dependencies: ["030", "050", "051"]
parallel_group: "integration-tests"
rejection_count: 0
outputs:
  types: "e2e/card-display.spec.ts"
  test: "e2e/card-display.spec.ts"
  impl: "e2e/card-display.spec.ts"
---

## Objective

Create Playwright integration test verifying work item cards display all required information correctly.

## Acceptance Criteria

- [ ] Test creates sample work item with known data
- [ ] Verifies card shows item ID
- [ ] Verifies card shows item title
- [ ] Verifies card shows type badge with correct color
- [ ] Verifies assigned agent badge appears for active items
- [ ] Verifies dependency indicator shows when dependencies unmet
- [ ] Verifies rejection badge shows when rejection_count > 0

## Context

This test validates card rendering matches PRD requirements.

Test setup:
1. Create work item with all fields populated
2. Create dependencies (some met, some unmet)
3. Set rejection_count > 0
4. Verify all UI elements appear

Sample test data:
```yaml
---
id: "007"
title: "Auth Service Implementation"
type: "implementation"
status: "implementing"
assigned_agent: "B.A."
rejection_count: 2
dependencies: ["001", "099"]  # 001 in done, 099 not in done
---
```

Playwright test:
```typescript
test('card displays all required information', async ({ page }) => {
  await page.goto('/');

  const card = page.locator('[data-testid="work-item-007"]');
  await expect(card.getByText('007')).toBeVisible();
  await expect(card.getByText('Auth Service Implementation')).toBeVisible();
  await expect(card.getByText('implementation')).toBeVisible();
  await expect(card.getByText('B.A.')).toBeVisible();
  // ... more assertions
});
```
