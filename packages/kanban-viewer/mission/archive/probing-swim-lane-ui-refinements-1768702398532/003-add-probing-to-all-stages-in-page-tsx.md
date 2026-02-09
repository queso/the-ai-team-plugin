---
id: '003'
title: Add probing to ALL_STAGES in page.tsx
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/page-probing-column.test.tsx
  impl: src/app/page.tsx
dependencies:
  - '001'
parallel_group: page
---
## Objective

Update the ALL_STAGES array in page.tsx to include probing between review and done, and include probing in WIP calculations.

## Acceptance Criteria

- [ ] ALL_STAGES array includes probing in order: briefings, ready, testing, implementing, review, probing, done, blocked
- [ ] Probing column renders between Review and Done columns
- [ ] wipCurrent calculation includes probing: itemsByStage.probing.length added
- [ ] Animation direction calculation works correctly for probing transitions


## Context

The page.tsx file defines ALL_STAGES for rendering columns and calculating WIP. The order determines visual column position and animation direction logic.
