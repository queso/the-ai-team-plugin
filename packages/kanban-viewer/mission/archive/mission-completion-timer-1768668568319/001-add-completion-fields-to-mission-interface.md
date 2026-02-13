---
id: '001'
title: Add completion fields to Mission interface
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/mission-completion-types.test.ts
  impl: src/types/index.ts
dependencies: []
parallel_group: mission-types
---
## Objective

Extend the Mission interface in src/types/index.ts to include completed_at and duration_ms optional fields for tracking mission completion.

## Acceptance Criteria

- [ ] Mission interface includes completed_at?: string field
- [ ] Mission interface includes duration_ms?: number field
- [ ] TypeScript compiles without errors
- [ ] Existing code continues to work without changes (fields are optional)

## Context

The Mission interface is in src/types/index.ts. Currently it has name, started_at, created_at, and status fields. The board-move.js script already populates completed_at and duration_ms in board.json when the last item moves to done, but the TypeScript types do not reflect this.
