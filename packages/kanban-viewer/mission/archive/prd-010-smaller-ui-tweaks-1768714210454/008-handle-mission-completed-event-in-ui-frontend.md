---
id: 008
title: Handle mission-completed event in UI (frontend)
type: feature
status: pending
rejection_count: 0
dependencies:
  - '007'
---
## Objective

The frontend needs to handle the new `mission-completed` SSE event. When received, the timer should stop and display the final mission duration.

## Acceptance Criteria

- [ ] useBoardEvents hook handles `mission-completed` event
- [ ] Callback `onMissionCompleted` is available in hook options
- [ ] HeaderBar timer stops when mission completes
- [ ] Final duration is displayed (not continuing to count)
- [ ] UI provides visual indication of completion state
- [ ] Update boardMetadata.mission.status to 'completed' on event
- [ ] Set boardMetadata.mission.completed_at to event timestamp


## Context

Files:
- `/src/hooks/use-board-events.ts` - Add event handler
- `/src/components/header-bar.tsx` - Stop timer, show final duration

Depends on 007 (backend SSE event) being implemented first.
