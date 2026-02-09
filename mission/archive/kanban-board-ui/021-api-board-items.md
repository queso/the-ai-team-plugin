---
id: "021"
title: "API route for all work items"
type: "feature"
status: "pending"
dependencies: ["001", "010"]
parallel_group: "api-layer"
rejection_count: 0
outputs:
  types: "src/app/api/board/items/route.ts"
  test: "src/__tests__/api-board-items.test.ts"
  impl: "src/app/api/board/items/route.ts"
---

## Objective

Create Next.js API route to fetch all work items across all pipeline stages.

## Acceptance Criteria

- [ ] GET /api/board/items returns array of WorkItem objects
- [ ] Items include stage field derived from folder location
- [ ] Returns 200 status with empty array if no items
- [ ] Returns 500 status with error message on failure
- [ ] Items sorted by stage order (briefings first, done last)
- [ ] Malformed items excluded from response (not crash)

## Context

This endpoint is called on initial board load to populate all columns.

Response format:
```typescript
{
  items: WorkItem[];
}
```

Each WorkItem includes the stage field set from the folder it was found in.

The API should read from all stage folders:
- mission/briefings/*.md
- mission/ready/*.md
- mission/testing/*.md
- mission/implementing/*.md
- mission/review/*.md
- mission/done/*.md
- mission/blocked/*.md
