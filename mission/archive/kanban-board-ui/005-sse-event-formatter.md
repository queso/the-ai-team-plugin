---
id: "005"
title: "SSE event payload formatter"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "data-layer"
rejection_count: 0
outputs:
  types: "src/lib/sse-utils.ts"
  test: "src/__tests__/sse-utils.test.ts"
  impl: "src/lib/sse-utils.ts"
---

## Objective

Create utility functions to format and serialize SSE event payloads for real-time board updates.

## Acceptance Criteria

- [ ] formatSSEEvent function creates properly formatted SSE message string
- [ ] Supports all event types: item-added, item-moved, item-updated, item-deleted, board-updated
- [ ] Includes timestamp in ISO format
- [ ] Creates valid SSE format with data: prefix and double newline
- [ ] parseSSEEvent function for client-side parsing
- [ ] Handles JSON serialization of complex objects

## Context

SSE event format from PRD:
```typescript
interface BoardEvent {
  type: 'item-added' | 'item-moved' | 'item-updated' | 'item-deleted' | 'board-updated';
  timestamp: string;
  data: {
    itemId?: string;
    fromStage?: string;
    toStage?: string;
    item?: WorkItem;
    board?: BoardMetadata;
  };
}
```

SSE wire format:
```
data: {"type":"item-moved","timestamp":"2026-01-15T10:42:15Z","data":{"itemId":"007","fromStage":"ready","toStage":"implementing"}}

```

Note the double newline at the end.
