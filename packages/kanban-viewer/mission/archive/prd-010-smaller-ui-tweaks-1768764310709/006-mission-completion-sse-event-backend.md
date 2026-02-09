---
id: '006'
title: Mission Completion SSE Event Backend
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api-board-events.test.ts
  impl: src/app/api/board/events/route.ts
  types: src/types/index.ts
dependencies: []
---
## Objective

When a mission completes (all items reach done), the UI does not receive notification to update its state. Add a new SSE event type `mission-completed` that is emitted when the board mission status changes to 'completed'.

## Acceptance Criteria

- [ ] New SSE event type 'mission-completed' is defined in BoardEventType
- [ ] Event is emitted when board.json mission.status changes to 'completed'
- [ ] Event payload includes: completed_at timestamp, duration_ms, and final stats
- [ ] Event is detected by watching board.json changes and comparing status

## Context

The SSE endpoint at /api/board/events already watches board.json and emits 'board-updated' events. This item adds a new event type specifically for mission completion.

Implementation:
1. Add 'mission-completed' to BoardEventType in src/types/index.ts
2. Track previous mission status in the watcher
3. When board.json changes, compare new status to previous
4. If status changed to 'completed', emit mission-completed event with payload

The existing createBoardUpdatedEvent function can be used as a reference for reading board.json.
