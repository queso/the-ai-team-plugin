---
id: '012'
title: Add SSE circuit breaker for database errors
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/board/events-circuit-breaker.test.ts
  impl: src/app/api/board/events/route.ts
dependencies: []
parallel_group: sse-fixes
---
## Objective

Implement circuit breaker pattern with exponential backoff for database errors in SSE endpoint to prevent zombie connections.

## Acceptance Criteria

- [ ] Consecutive database errors are tracked
- [ ] After MAX_CONSECUTIVE_ERRORS (5), connection is closed gracefully
- [ ] Error messages indicate circuit breaker triggered
- [ ] Intervals are cleaned up properly on connection close
- [ ] Successful polls reset the error counter

## Context

In src/app/api/board/events/route.ts (lines 276-398), database errors are logged but the stream continues indefinitely. If the database dies permanently, the stream becomes a zombie that wastes server resources. A circuit breaker should close the connection after repeated failures.
