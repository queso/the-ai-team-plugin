---
id: '007'
title: Add mission-completed SSE event (backend)
type: feature
status: pending
rejection_count: 0
dependencies: []
---
## Objective

The UI has no way to know when a mission completes. Add a new SSE event type `mission-completed` that is emitted when all work items reach the done stage.

## Acceptance Criteria

- [ ] New SSE event type `mission-completed` is defined
- [ ] Event is emitted when mission completion is detected
- [ ] Event payload includes relevant completion data (timestamp, duration, etc.)
- [ ] Event is properly typed in the BoardEventType union
- [ ] SSE route emits the event at the appropriate time

## Context

Files:
- `/src/app/api/board/events/route.ts` - SSE endpoint
- `/src/types/` - Type definitions

Detection approach: Watch for board.json changes where all items are in 'done' stage, or detect completion marker in board state.
