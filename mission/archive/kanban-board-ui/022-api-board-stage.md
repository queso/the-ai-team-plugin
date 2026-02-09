---
id: "022"
title: "API route for items by stage"
type: "feature"
status: "pending"
dependencies: ["001", "010"]
parallel_group: "api-layer"
rejection_count: 0
outputs:
  types: "src/app/api/board/stage/[stage]/route.ts"
  test: "src/__tests__/api-board-stage.test.ts"
  impl: "src/app/api/board/stage/[stage]/route.ts"
---

## Objective

Create Next.js dynamic API route to fetch work items for a specific pipeline stage.

## Acceptance Criteria

- [ ] GET /api/board/stage/:stage returns array of WorkItem objects for that stage
- [ ] Returns 400 status for invalid stage name
- [ ] Returns 200 with empty array if stage folder is empty
- [ ] Returns 500 status with error message on failure
- [ ] Validates stage parameter against valid stage names
- [ ] Uses dynamic route parameter [stage]

## Context

This endpoint allows fetching items for a single column, useful for lazy loading or refreshing individual columns.

Valid stage values: briefings, ready, testing, implementing, review, done, blocked

Response format:
```typescript
{
  stage: string;
  items: WorkItem[];
}
```

Next.js dynamic route format:
```typescript
// src/app/api/board/stage/[stage]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { stage: string } }
) {
  const { stage } = params;
  // ...
}
```
