---
id: "025"
title: "API route for activity log"
type: "feature"
status: "pending"
dependencies: ["001", "006", "010"]
parallel_group: "api-layer"
rejection_count: 0
outputs:
  types: "src/app/api/board/activity/route.ts"
  test: "src/__tests__/api-board-activity.test.ts"
  impl: "src/app/api/board/activity/route.ts"
---

## Objective

Create Next.js API route to fetch parsed activity log entries for the Live Feed panel.

## Acceptance Criteria

- [ ] GET /api/board/activity returns array of LogEntry objects
- [ ] Supports ?limit=N query parameter for last N entries
- [ ] Returns entries in reverse chronological order (newest first)
- [ ] Returns 200 with empty array if no activity.log
- [ ] Returns 500 status with error message on failure
- [ ] Parses special prefixes (APPROVED, REJECTED, ALERT) into highlightType

## Context

This endpoint provides data for the Live Feed panel's initial load.

Response format:
```typescript
{
  entries: LogEntry[];
}
```

LogEntry structure:
```typescript
{
  timestamp: string;
  agent: string;
  message: string;
  highlightType?: 'approved' | 'rejected' | 'alert';
}
```

The limit parameter defaults to 50 if not specified.
