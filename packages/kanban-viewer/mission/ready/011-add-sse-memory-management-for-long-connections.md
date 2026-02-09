---
id: '011'
title: Add SSE memory management for long connections
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/board/events-memory.test.ts
  impl: src/app/api/board/events/route.ts
dependencies: []
parallel_group: sse-fixes
---
## Objective

Implement cleanup of archived items from the trackedItems Map in SSE endpoint to prevent memory leaks during long-running connections.

## Acceptance Criteria

- [ ] Archived items are removed from trackedItems Map during poll cycles
- [ ] Items not in current database result set are cleaned up
- [ ] Memory usage does not grow unbounded over time
- [ ] Cleanup does not interfere with normal event emission

## Context

In src/app/api/board/events/route.ts (lines 248-249), the trackedItems Map grows indefinitely. For long-running connections (dashboard left open for days), this can cause memory leaks as items are archived but not removed from tracking.
