---
id: '015'
title: Fix race condition in item claim flow
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/board/claim-race-condition.test.ts
  impl: src/app/api/board/claim/route.ts
dependencies: []
parallel_group: database-fixes
---
## Objective

Wrap the claim creation and item update operations in a database transaction to prevent race conditions where two agents claim the same item.

## Acceptance Criteria

- [ ] AgentClaim creation and Item update are wrapped in prisma.$transaction()
- [ ] Concurrent claim attempts on the same item are handled gracefully
- [ ] Only one claim succeeds if multiple agents try simultaneously
- [ ] Error messages indicate claim conflict when it occurs

## Context

In src/app/api/board/claim/route.ts (lines 179-190), the claim creation and item update are separate operations without a transaction. Between the two operations, another request could create a conflicting claim. This violates the constraint that items are uniquely claimed.
