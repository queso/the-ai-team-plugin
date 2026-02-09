---
id: '003'
title: Add visual completion indicator to header
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/header-bar-completion-visual.test.tsx
  impl: src/components/header-bar.tsx
dependencies:
  - '002'
parallel_group: header-bar
---
## Objective

Update HeaderBar to show MISSION COMPLETE status text and add visual treatment to the frozen timer (checkmark icon or muted styling).

## Acceptance Criteria

- [ ] Status text shows MISSION COMPLETE when mission is completed
- [ ] Status indicator uses red color (bg-red-500) for completed state - already configured
- [ ] Timer display has visual treatment indicating frozen state (checkmark icon or opacity/muted style)
- [ ] Visual distinction is clear between running and frozen timer states

## Context

The HeaderBar already has statusConfig with completed state showing red indicator and MISSION COMPLETED text. Enhance the timer display area to show a checkmark icon (lucide-react Check or CheckCircle) or apply text-muted-foreground class when timer is frozen. The isMissionComplete helper from item 002 can be used to determine display state.
