---
id: "031"
title: "BoardColumn component"
type: "feature"
status: "pending"
dependencies: ["001", "030"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/board-column.tsx"
  test: "src/__tests__/board-column.test.tsx"
  impl: "src/components/board-column.tsx"
---

## Objective

Create a React component for a single kanban board column that displays a header with stage name and item count, and renders work item cards vertically.

## Acceptance Criteria

- [ ] Column header shows stage name (capitalized)
- [ ] Column header shows item count
- [ ] WIP limit indicator for applicable stages (testing, implementing, review)
- [ ] Visual warning when WIP limit exceeded (red/orange highlight)
- [ ] Renders WorkItemCard components for each item
- [ ] Scrollable if items exceed viewport height
- [ ] Proper spacing between cards
- [ ] Accepts stage name, items array, and optional wipLimit props

## Context

Column header design:
```
+-----------------+
| TESTING       2 |  <- Stage name + count
+-----------------+
| [Card 1]        |
| [Card 2]        |
+-----------------+
```

WIP limit indicator appears below count when limit is set:
```
| IMPLEMENTING  3 |
| WIP: 2/3        |  <- Shows current/limit, warning if exceeded
```

Stages with WIP limits from PRD:
- testing: 2
- implementing: 3
- review: 2
