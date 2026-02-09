---
id: '016'
title: Add probing to ALL_STAGES in use-board-data hook
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/use-board-data-probing.test.ts
  impl: src/hooks/use-board-data.ts
dependencies:
  - '001'
parallel_group: hooks
---
## Objective

Update ALL_STAGES array in use-board-data.ts to include probing so itemsByStage includes probing items.

## Acceptance Criteria

- [ ] ALL_STAGES includes probing between review and done
- [ ] itemsByStage.probing is a valid array
- [ ] Items in probing stage are grouped correctly

## Context

use-board-data.ts groups work items by stage. Without probing in ALL_STAGES, probing items won't be grouped and will be lost.
