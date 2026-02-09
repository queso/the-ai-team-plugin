---
id: "204"
title: "Implement SSE hook integration in main page"
type: "feature"
outputs:
  impl: "src/app/page.tsx"
dependencies: ["203"]
parallel_group: "sse-integration"
status: "pending"
rejection_count: 0
---

## Objective

Integrate the useBoardEvents hook into the main page component to enable real-time board updates via SSE.

## Acceptance Criteria

- [ ] useBoardEvents hook imported and called in Home component
- [ ] onItemAdded callback appends new item to workItems array
- [ ] onItemMoved callback updates the item's stage property in workItems
- [ ] onItemUpdated callback replaces the matching item in workItems
- [ ] onItemDeleted callback removes the item from workItems by ID
- [ ] onBoardUpdated callback replaces boardMetadata state
- [ ] ConnectionStatusIndicator rendered in header area showing connection state
- [ ] Board reflects file moves within 1 second without manual refresh
- [ ] New items appear automatically when added
- [ ] Deleted items disappear automatically
- [ ] Item content updates reflect automatically
- [ ] No memory leaks from SSE connection on unmount
- [ ] All tests from 203 pass

## Technical Notes

Add to the Home component:

```tsx
import { useBoardEvents } from "@/hooks/use-board-events";
import { ConnectionStatusIndicator } from "@/components/connection-status-indicator";

// Inside Home component:
const { isConnected, connectionError } = useBoardEvents({
  onItemAdded: (item) => {
    setWorkItems(prev => [...prev, item]);
  },
  onItemMoved: (itemId, fromStage, toStage) => {
    setWorkItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, stage: toStage as Stage } : item
    ));
  },
  onItemUpdated: (item) => {
    setWorkItems(prev => prev.map(existing =>
      existing.id === item.id ? item : existing
    ));
  },
  onItemDeleted: (itemId) => {
    setWorkItems(prev => prev.filter(item => item.id !== itemId));
  },
  onBoardUpdated: (board) => {
    setBoardMetadata(board);
  },
});
```

Derive connection status from hook return values:
- `isConnected && !connectionError` -> 'connected'
- `!isConnected && !connectionError` -> 'connecting' (during initial connection)
- `connectionError` -> 'error'

Position the status indicator near the HeaderBar, possibly inside it or adjacent to it.

## Context

The existing page structure fetches data on mount in a useEffect. The SSE integration should work alongside this - initial data comes from fetch, then SSE provides updates. The hook already handles reconnection with exponential backoff.
