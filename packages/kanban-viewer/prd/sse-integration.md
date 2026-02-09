# PRD: Real-Time SSE Integration

## Problem

The kanban board has a complete SSE (Server-Sent Events) infrastructure for real-time updates, but it's not connected. The `useBoardEvents` hook exists and the `/api/board/events` endpoint is functional, yet the main page component only fetches data once on mount and never subscribes to live updates.

When work items move between folders (e.g., from `backlog/` to `in-progress/`), users must manually refresh the page to see changes.

## Goal

Wire up the existing SSE infrastructure so the board updates automatically when files change on disk.

## Scope

### In Scope
- Integrate `useBoardEvents` hook into `src/app/page.tsx`
- Update board state when SSE events arrive (`item-added`, `item-moved`, `item-updated`, `item-deleted`, `board-updated`)
- Display connection status indicator (optional but recommended)

### Out of Scope
- Changes to the SSE endpoint itself
- Changes to the `useBoardEvents` hook
- New event types

## Technical Approach

1. Import and call `useBoardEvents` in the main page component
2. Implement callback handlers that update the existing `items` and `metadata` state:
   - `onItemAdded`: Append new item to `items` array
   - `onItemMoved`: Update the item's `stage` property in state
   - `onItemUpdated`: Replace the item in state with updated data
   - `onItemDeleted`: Remove the item from state
   - `onBoardUpdated`: Replace `metadata` state
3. Optionally show a connection status indicator in the UI

## Success Criteria

- [ ] Board reflects file moves within 1 second without manual refresh
- [ ] New items appear automatically when `.md` files are added to stage folders
- [ ] Deleted items disappear automatically
- [ ] Item content updates reflect automatically
- [ ] No memory leaks from SSE connection on unmount

## Files to Modify

- `src/app/page.tsx` - Add hook integration and state update handlers
