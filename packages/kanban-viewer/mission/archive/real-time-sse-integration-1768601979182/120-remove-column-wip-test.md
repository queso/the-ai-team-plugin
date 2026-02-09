---
id: "120"
title: "Remove Per-Column WIP Labels - Tests"
type: "test"
status: "pending"
dependencies: []
parallel_group: "column-wip"
rejection_count: 0
outputs:
  test: "src/__tests__/board-column.test.tsx"
  impl: "src/components/board-column.tsx"
---

## Objective

Create tests verifying that per-column WIP labels are not displayed, while column name and item count remain visible.

## Acceptance Criteria

- [ ] Test that column header shows column name (uppercase)
- [ ] Test that column header shows item count
- [ ] Test that NO "WIP: x/y" text appears in column header
- [ ] Test that wipLimit prop is no longer used/rendered
- [ ] Verify header layout: column name on left, count on right

## Context

- Existing tests in `src/__tests__/board-column.test.tsx` test the WIP indicator
- Update or replace those tests to verify WIP labels are ABSENT
- The BoardColumn component currently receives `wipLimit` prop
- Keep the prop interface for now (backward compat) but don't render it

Expected column header structure:
```
TESTING        2
```
Not:
```
TESTING
WIP: 0/2
```
