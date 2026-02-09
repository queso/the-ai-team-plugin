---
id: "023"
title: "API route for single work item"
type: "feature"
status: "pending"
dependencies: ["001", "010"]
parallel_group: "api-layer"
rejection_count: 0
outputs:
  types: "src/app/api/board/item/[id]/route.ts"
  test: "src/__tests__/api-board-item.test.ts"
  impl: "src/app/api/board/item/[id]/route.ts"
---

## Objective

Create Next.js dynamic API route to fetch a single work item by its ID with full markdown content.

## Acceptance Criteria

- [ ] GET /api/board/item/:id returns single WorkItem object
- [ ] Returns 404 status if item not found
- [ ] Returns 500 status with error message on failure
- [ ] Includes full markdown content in response
- [ ] Searches all stage folders to find item by ID
- [ ] Uses dynamic route parameter [id]

## Context

This endpoint is used when clicking a card to view full details in a modal.

Response format:
```typescript
{
  item: WorkItem;
}
```

The WorkItem includes the full content field with the markdown body.

Search strategy: The ID could be the filename (e.g., 007.md) or embedded in frontmatter. Search all stage folders for a file with matching ID.
