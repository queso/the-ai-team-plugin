---
id: '002'
title: Implement timer freeze on mission completion
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/header-bar-completion.test.tsx
  impl: src/components/header-bar.tsx
dependencies:
  - '001'
parallel_group: header-bar
---
## Objective

Modify HeaderBar component to stop the timer when mission.completed_at is present and display the final frozen elapsed time.

## Acceptance Criteria

- [ ] When mission.completed_at is present, timer stops counting and no interval is running
- [ ] Timer displays final elapsed time using duration_ms if available
- [ ] Timer calculates elapsed time from started_at to completed_at if duration_ms is not available
- [ ] Timer effect properly handles the completed state without starting an interval
- [ ] All existing timer tests continue to pass

## Context

The HeaderBar component in src/components/header-bar.tsx has a timer that currently runs when status is active. Add completion detection using getMissionEndTime() and isMissionComplete() helper functions. The timer effect should check for completed_at before starting the interval. Use the calculateElapsedSeconds function signature to support end time parameter.
