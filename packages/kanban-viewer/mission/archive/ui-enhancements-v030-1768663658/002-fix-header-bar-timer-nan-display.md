---
id: '002'
title: Fix header-bar timer NaN display
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/header-bar.test.tsx
  impl: src/components/header-bar.tsx
dependencies:
  - '001'
parallel_group: header
---
## Objective

Update the HeaderBar component to gracefully handle missing or invalid date fields, using created_at as fallback when started_at is missing, and displaying a placeholder when no valid date exists.

## Acceptance Criteria

- [ ] Timer displays valid time when created_at is present but started_at is missing
- [ ] Timer displays placeholder (--:--:--) when no valid date exists
- [ ] No NaN values ever displayed in timer
- [ ] Timer continues to work normally when started_at is provided
- [ ] Tests cover edge cases: missing dates, invalid dates, created_at fallback

## Context

The calculateElapsedSeconds function in header-bar.tsx produces NaN when passed an invalid date string. The component currently expects mission.started_at but board.json provides mission.created_at. Update the logic to: 1) Use started_at if available, 2) Fall back to created_at, 3) Display placeholder if neither is valid. Use isNaN() or Number.isNaN() to detect invalid dates.
