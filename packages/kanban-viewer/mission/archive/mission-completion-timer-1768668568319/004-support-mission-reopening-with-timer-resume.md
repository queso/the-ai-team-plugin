---
id: '004'
title: Support mission reopening with timer resume
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/header-bar-reopen.test.tsx
  impl: src/components/header-bar.tsx
dependencies:
  - '002'
parallel_group: header-bar
---
## Objective

Ensure the timer resumes counting when a mission is reopened (completed_at is cleared or an item moves out of done).

## Acceptance Criteria

- [ ] When completed_at is cleared from mission, timer resumes from current calculation
- [ ] When mission.status changes from completed to active, timer resumes
- [ ] Timer correctly transitions from frozen to running state
- [ ] Status reverts to active state display when mission is reopened
- [ ] No memory leaks from interval cleanup during state transitions

## Context

The HeaderBar timer effect depends on mission.status and mission.completed_at. When the board-updated SSE event arrives with completed_at cleared, the component will re-render. The effect cleanup should properly clear any existing interval and the new effect run should restart the interval if the mission is no longer complete. Test by simulating prop changes with rerender.
