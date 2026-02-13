---
id: '007'
title: Mission Completion UI Handler
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/use-board-events.test.tsx
  impl: src/hooks/use-board-events.ts
  types: src/types/index.ts
dependencies:
  - '006'
---
## Objective

Add frontend handling for the mission-completed SSE event. When received, the timer should stop and show final duration, and the UI should reflect the completed state.

## Acceptance Criteria

- [ ] useBoardEvents hook handles 'mission-completed' event type
- [ ] onMissionCompleted callback is added to UseBoardEventsOptions
- [ ] HeaderBar stops timer and shows completion state when event received
- [ ] Progress bar shows 100% complete styling (green) on completion

## Context

This depends on item 006 (backend SSE event).

Files to modify:
- src/types/index.ts: Add 'mission-completed' to BoardEventType
- src/hooks/use-board-events.ts: Add onMissionCompleted callback and handle the event

The HeaderBar already has logic to stop timer when mission.completed_at is set. The SSE event should update the mission state to trigger this existing logic.
