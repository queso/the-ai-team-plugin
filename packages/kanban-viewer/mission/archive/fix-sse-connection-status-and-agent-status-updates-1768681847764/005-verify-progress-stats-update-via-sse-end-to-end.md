---
id: '005'
title: Verify progress stats update via SSE end-to-end
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/progress-stats-sse-integration.test.tsx
  impl: src/components/header-bar.tsx
dependencies:
  - '002'
parallel_group: integration
---
## Objective

Create end-to-end test verifying that stats changes in board.json (completed count, WIP) propagate to the HeaderBar component via SSE without page refresh.

## Acceptance Criteria

- [ ] Test simulates board.json change with updated stats (e.g., completed: 1 -> 2)
- [ ] Test verifies SSE endpoint emits board-updated event with new stats data
- [ ] Test verifies page.tsx receives event and updates boardMetadata.stats state
- [ ] Test verifies HeaderBar renders updated progress counter
- [ ] Stats update completes within 1 second of board.json change

## Context

This validates the stats portion of the board-updated flow. The HeaderBar receives stats prop from page.tsx and displays stats.completed/stats.total_items. The wipCurrent is calculated from itemsByStage in page.tsx, but stats.completed comes directly from boardMetadata.stats.
