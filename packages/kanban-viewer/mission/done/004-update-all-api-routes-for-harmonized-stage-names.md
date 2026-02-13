---
id: '004'
title: Update all API routes for harmonized stage names
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/stage-harmonization.test.ts
  impl: src/app/api/board/route.ts
dependencies:
  - '001'
  - '002'
  - '003'
parallel_group: stage-harmonization
---
## Objective

Update API routes (excluding SSE endpoint) to use the harmonized stage names. Replace backlog with briefings and in_progress with the appropriate stage (probing/testing/implementing).

## Acceptance Criteria

- [ ] Board routes use new stage names: board/route.ts, board/move/route.ts, board/claim/route.ts, board/release/route.ts
- [ ] Item routes use new stage names: items/route.ts, items/[id]/route.ts, items/[id]/reject/route.ts
- [ ] GET /api/board returns items with correct stage IDs
- [ ] POST /api/board/move validates against new stage names
- [ ] No references to backlog or in_progress remain in non-SSE API routes


## Context

Multiple API route files need updating: board/route.ts, board/move/route.ts, board/claim/route.ts, board/release/route.ts, board/events/route.ts, items/route.ts, items/[id]/route.ts, items/[id]/reject/route.ts. The SSE endpoint also has stage mapping logic that needs removal.


The SSE endpoint (board/events/route.ts) is handled by item 008, which depends on this item. This split avoids the overlap Sosa identified.
