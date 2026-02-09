---
id: '001'
title: Update StageId type to use original stage names
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/types/stage-id.test.ts
  impl: src/types/board.ts
dependencies: []
parallel_group: stage-harmonization
---
## Objective

Update the StageId type in src/types/board.ts to use all 8 original stage names (briefings, ready, probing, testing, implementing, review, done, blocked) instead of the simplified database names (backlog, in_progress).

## Acceptance Criteria

- [ ] StageId type includes all 8 original stages: briefings, ready, probing, testing, implementing, review, done, blocked
- [ ] The simplified stages backlog and in_progress are removed from the type
- [ ] All TypeScript compilation passes with the updated type


## Context

This is the foundational change for stage harmonization. The API currently uses simplified stage names but the UI expects the original filesystem stage names. Changing the type definition is the first step - subsequent items will update the database seed, validation, and API routes.


Human confirmed: Database will have 8 separate stages with individual WIP limits for probing, testing, and implementing. This is the foundational change for stage harmonization.
