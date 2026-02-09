---
id: '002'
title: Board UI Clear After Archive
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/board-archive.test.tsx
  impl: src/app/api/board/events/route.ts
dependencies: []
---
## Objective

When a mission is archived, the board UI retains stale data. Items remain visible in columns even though they have been moved to the archive folder. The UI should clear all columns and reflect an empty/reset state after archiving.

## Acceptance Criteria

- [ ] After archiving a mission, the board shows empty columns
- [ ] No stale work items remain visible
- [ ] Stats show zeroed values (total_items: 0, completed: 0)
- [ ] Solution works with the existing SSE infrastructure

## Context

Possible solutions:
1. SSE Event: Emit a `board-reset` event that triggers full state refresh in the React app
2. Page Reload: Trigger a page reload after archive completes
3. State Reset: Clear local React state when archive is detected via board-updated event with empty phases

The SSE endpoint already emits `board-updated` when board.json changes. The frontend useBoardEvents hook handles `onBoardUpdated`. Consider if the existing infrastructure can handle this, or if a new event type is needed.
