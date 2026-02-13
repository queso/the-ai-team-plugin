---
id: "004"
title: "Board statistics calculator"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "data-layer"
rejection_count: 0
outputs:
  types: "src/lib/stats.ts"
  test: "src/__tests__/stats.test.ts"
  impl: "src/lib/stats.ts"
---

## Objective

Create utility functions to calculate board statistics from work items and board metadata.

## Acceptance Criteria

- [ ] calculateBoardStats function computes total_items, completed, in_progress, blocked, backlog
- [ ] Correctly counts items per stage
- [ ] Handles empty board (zero items)
- [ ] getWipStatus function checks current vs limit for a stage
- [ ] isOverWipLimit returns boolean for stage capacity check
- [ ] calculateProgress returns percentage complete (done/total)

## Context

Statistics are displayed in the header bar:
- WIP indicator: current in-flight / max WIP limit (e.g., "4/5")
- Progress bar: done/total items (e.g., "12/26")

Stats structure from board.json:
```json
{
  "stats": {
    "total_items": 26,
    "completed": 5,
    "in_progress": 4,
    "blocked": 0,
    "backlog": 7
  }
}
```

WIP limits apply to: testing (2), implementing (3), review (2)
