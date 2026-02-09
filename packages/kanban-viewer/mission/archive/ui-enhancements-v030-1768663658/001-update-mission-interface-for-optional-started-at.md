---
id: '001'
title: Update Mission interface for optional started_at
type: feature
status: pending
rejection_count: 0
dependencies: []
outputs:
  test: src/__tests__/mission-timer-types.test.ts
  impl: src/types/index.ts
parallel_group: types
---
## Objective

Update the BoardMetadata Mission interface to make started_at optional and add created_at as an alternative date source for the timer calculation.

## Acceptance Criteria

- [ ] Mission interface has optional started_at field
- [ ] Mission interface has optional created_at field
- [ ] TypeScript compiles without errors
- [ ] Existing code using Mission type continues to work

## Context

The board.json provides created_at instead of started_at. The Mission interface in src/types/index.ts needs to be updated to support both fields. This is a type-only change - no runtime behavior changes.
