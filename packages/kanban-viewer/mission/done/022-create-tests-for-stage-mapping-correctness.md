---
id: '022'
title: Create tests for stage mapping correctness
type: feature
status: in_progress
assigned_agent: B.A.
rejection_count: 0
outputs:
  test: src/__tests__/integration/stage-consistency.test.ts
  impl: src/types/board.ts
dependencies:
  - '004'
parallel_group: testing
---
## Objective

Create integration tests that verify stage name consistency across the entire system after harmonization is complete.

## Acceptance Criteria

- [ ] Tests verify all 8 stages are valid and recognized in StageId type
- [ ] Tests verify stage transitions follow the validation matrix in src/lib/validation.ts
- [ ] Tests verify SSE endpoint emits events with correct stage IDs
- [ ] Tests verify API GET /api/board returns all 8 stages correctly
- [ ] Tests detect unknown or unmapped stages at runtime


## Context

After stage harmonization, we need tests to verify stage names are consistent across the system. This includes the database, API routes, SSE events, and frontend. These tests catch regressions in stage handling.


While items 003 and 004 update validation and API routes respectively, this item creates end-to-end integration tests that verify the entire harmonization works together. These tests catch regressions where individual components pass but the system fails as a whole. This is a distinct testing concern from unit tests in other items.
