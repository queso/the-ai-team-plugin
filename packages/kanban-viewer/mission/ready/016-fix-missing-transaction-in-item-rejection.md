---
id: '016'
title: Fix missing transaction in item rejection
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/items/reject-transaction.test.ts
  impl: 'src/app/api/items/[id]/reject/route.ts'
dependencies: []
parallel_group: database-fixes
---
## Objective

Move the item lookup inside the transaction in the reject endpoint to prevent stale validation.

## Acceptance Criteria

- [ ] Item lookup is performed inside the transaction
- [ ] Validation checks (archived, stage) are atomic with the update
- [ ] Concurrent rejections on the same item serialize correctly
- [ ] Error handling distinguishes between validation and database errors

## Context

In src/app/api/items/[id]/reject/route.ts (lines 103-114), the item lookup excludes archived items but there is no transaction wrapping the read-check-write sequence. Between read and write, the item could be archived or moved out of review stage.
