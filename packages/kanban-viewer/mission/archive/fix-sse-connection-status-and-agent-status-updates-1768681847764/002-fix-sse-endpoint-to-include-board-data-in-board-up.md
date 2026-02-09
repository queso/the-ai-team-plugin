---
id: '002'
title: Fix SSE endpoint to include board data in board-updated events
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/sse-board-updated-payload.test.ts
  impl: src/app/api/board/events/route.ts
dependencies: []
parallel_group: core-fixes
---
## Objective

Update the SSE endpoint createBoardUpdatedEvent function to read and include full board metadata in the event payload, enabling client-side updates of agent status and progress stats without page refresh.

## Acceptance Criteria

- [ ] createBoardUpdatedEvent reads board.json and includes full BoardMetadata in event data
- [ ] Event data.board field contains agents, stats, mission, wip_limits, and other metadata
- [ ] Client receives board data and onBoardUpdated callback is invoked with the data
- [ ] Agent status changes propagate to client within 1 second of board.json change
- [ ] Progress stats changes propagate to client within 1 second of board.json change

## Context

The createBoardUpdatedEvent function at line 265 of route.ts returns data: {}. It needs to read board.json synchronously (using fs.readFileSync) and parse it, then include the parsed BoardMetadata in the event. The client-side handler at line 151-154 of use-board-events.ts already checks for boardEvent.data.board and calls onBoardUpdated.
