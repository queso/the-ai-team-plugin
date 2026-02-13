---
id: '015'
title: Add probing to ALL_STAGES in SSE events route
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/sse-probing-events.test.ts
  impl: src/app/api/board/events/route.ts
dependencies:
  - '001'
parallel_group: api-events
---
## Objective

Update ALL_STAGES array in api/board/events/route.ts to include probing so SSE endpoint emits events for probing stage.

## Acceptance Criteria

- [ ] ALL_STAGES includes probing between review and done
- [ ] SSE emits item-moved events for probing transitions
- [ ] Item location map includes probing stage items

## Context

The SSE endpoint uses ALL_STAGES for building item location map. Without probing, it won't emit events for probing stage transitions.
