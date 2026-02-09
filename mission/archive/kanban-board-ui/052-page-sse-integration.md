---
id: "052"
title: "SSE real-time updates integration"
type: "feature"
status: "pending"
dependencies: ["001", "024", "051"]
parallel_group: "page-assembly"
rejection_count: 0
outputs:
  types: "src/hooks/use-board-events.ts"
  test: "src/__tests__/use-board-events.test.ts"
  impl: "src/hooks/use-board-events.ts"
---

## Objective

Create a custom React hook that connects to the SSE endpoint and updates board state in real-time when file changes occur.

## Acceptance Criteria

- [ ] useBoardEvents hook establishes EventSource connection to /api/board/events
- [ ] Handles all event types: item-added, item-moved, item-updated, item-deleted, board-updated
- [ ] Updates local state based on events without full refetch
- [ ] Auto-reconnects if connection drops
- [ ] Provides connection status (connected, disconnected, error)
- [ ] Cleans up EventSource on unmount
- [ ] Optional callback props for event handlers

## Context

The hook manages the SSE connection and state updates:

```typescript
interface UseBoardEventsOptions {
  onItemAdded?: (item: WorkItem) => void;
  onItemMoved?: (itemId: string, fromStage: string, toStage: string) => void;
  onItemUpdated?: (item: WorkItem) => void;
  onItemDeleted?: (itemId: string) => void;
  onBoardUpdated?: (board: BoardMetadata) => void;
}

interface UseBoardEventsReturn {
  isConnected: boolean;
  connectionError: Error | null;
}
```

Usage:
```typescript
const { isConnected } = useBoardEvents({
  onItemMoved: (itemId, from, to) => {
    // Update local state
    setItemsByStage(prev => moveItem(prev, itemId, from, to));
  },
  onBoardUpdated: (board) => {
    setBoard(board);
  }
});
```

EventSource setup:
```typescript
const eventSource = new EventSource('/api/board/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle based on data.type
};
eventSource.onerror = () => {
  // Reconnect logic
};
```
