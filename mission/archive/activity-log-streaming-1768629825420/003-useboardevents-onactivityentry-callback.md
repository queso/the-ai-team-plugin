---
id: '003'
title: useBoardEvents onActivityEntry callback
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/use-board-events-activity.test.ts
  impl: src/hooks/use-board-events.ts
dependencies:
  - '001'
parallel_group: hooks
---
## Objective

Add onActivityEntry callback to the useBoardEvents hook to handle activity-entry-added SSE events.

## Acceptance Criteria

- [ ] UseBoardEventsOptions includes onActivityEntry?: (entry: LogEntry) => void
- [ ] Hook dispatches to onActivityEntry when activity-entry-added event received
- [ ] Callback ref is updated when onActivityEntry changes (same pattern as other callbacks)
- [ ] LogEntry type is imported from correct location

## Context

Follow the existing pattern in src/hooks/use-board-events.ts. The handleEvent function has a switch statement on boardEvent.type. Add a case for activity-entry-added that calls callbacksRef.current.onActivityEntry. The callback should receive the LogEntry from boardEvent.data.logEntry.
