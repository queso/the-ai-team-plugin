---
id: "051"
title: "Board page data fetching and state management"
type: "feature"
status: "pending"
dependencies: ["001", "020", "021", "025", "050"]
parallel_group: "page-assembly"
rejection_count: 0
outputs:
  types: "src/hooks/use-board-data.ts"
  test: "src/__tests__/use-board-data.test.ts"
  impl: "src/hooks/use-board-data.ts"
---

## Objective

Create a custom React hook for fetching board data from API routes and managing board state in the main page.

## Acceptance Criteria

- [ ] useBoardData hook fetches board metadata and work items on mount
- [ ] Returns loading, error, and data states
- [ ] Provides refresh function to manually reload data
- [ ] Organizes items by stage for easy column rendering
- [ ] Combines board metadata with items data
- [ ] Handles API errors gracefully
- [ ] Memoizes computed values

## Context

The hook provides all data needed for the board UI:

```typescript
interface UseBoardDataReturn {
  isLoading: boolean;
  error: Error | null;
  board: BoardMetadata | null;
  itemsByStage: Record<string, WorkItem[]>;
  activityLog: LogEntry[];
  refresh: () => Promise<void>;
}
```

Usage in page:
```typescript
const { isLoading, error, board, itemsByStage, activityLog } = useBoardData();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;

return (
  <BoardLayout>
    {STAGES.map(stage => (
      <BoardColumn
        key={stage}
        stage={stage}
        items={itemsByStage[stage] || []}
        wipLimit={board?.wip_limits[stage]}
      />
    ))}
  </BoardLayout>
);
```

API calls:
- GET /api/board - board metadata
- GET /api/board/items - all work items
- GET /api/board/activity - activity log entries
