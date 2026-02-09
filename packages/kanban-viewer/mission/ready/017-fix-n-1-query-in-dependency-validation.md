---
id: '017'
title: Fix N+1 query in dependency validation
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/items/dependency-validation.test.ts
  impl: src/app/api/items/route.ts
dependencies: []
parallel_group: database-fixes
---
## Objective

Replace individual dependency queries with a single batch query using findMany to improve performance.

## Acceptance Criteria

- [ ] Dependency validation uses findMany with id: { in: dependencies }
- [ ] A single database query validates all dependencies
- [ ] Missing dependencies are reported with their IDs
- [ ] Performance improves for items with multiple dependencies

## Context

In src/app/api/items/route.ts (lines 206-223), dependency validation queries each dependency individually. If creating an item with 5 dependencies, this causes 5 separate database queries. The fix uses a single findMany query.
