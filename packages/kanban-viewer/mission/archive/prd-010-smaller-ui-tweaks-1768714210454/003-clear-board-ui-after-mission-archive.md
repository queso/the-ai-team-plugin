---
id: '003'
title: Clear board UI after mission archive
type: bug
status: pending
rejection_count: 0
dependencies: []
---
## Objective

When a mission is archived, the board UI retains stale data from the previous mission. The board should clear all columns and reset state after an archive operation.

Approach: Use SSE `mission-archived` event. Do NOT use page reload.

## Acceptance Criteria

- [ ] Board columns are cleared after mission is archived
- [ ] No stale work items remain visible after archive
- [ ] Solution integrates with existing SSE infrastructure
- [ ] UI state is properly reset (agents, progress, etc.)

## Context

Options to consider:
1. New SSE event (e.g., `mission-archived`) that triggers state reset
2. Page reload after archive
3. Manual state reset in response to archive action

Prefer SSE event approach for consistency with existing patterns. Files: SSE route, useBoardEvents hook, page component.


Files to modify:
- `/src/app/api/board/events/route.ts` - Emit new event
- `/src/types/index.ts` - Add event type
- `/src/hooks/use-board-events.ts` - Handle event
- `/src/app/page.tsx` - Reset state on event
