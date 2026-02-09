---
id: '001'
title: Progress Bar Completion Color
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/progress-bar.test.tsx
  impl: src/components/ui/progress.tsx
dependencies: []
---
## Objective

Update the progress bar to change color when showing 100% completion. Currently the progress bar remains white/neutral even when showing complete status (e.g., 12/12).

## Acceptance Criteria

- [ ] Progress bar fill is green (#22c55e / green-500) when progress equals total (100% complete)
- [ ] Progress bar fill remains current color (bg-primary) when in progress
- [ ] Transition between states is smooth
- [ ] Color change applies to the indicator element, not the track

## Context

The Progress component uses Radix UI's ProgressPrimitive. The indicator element currently has a static `bg-primary` class. Implementation should conditionally apply `bg-green-500` when value is 100, otherwise keep `bg-primary`. Use `transition-colors` for smooth color transition. The component already receives a value prop that can be used for this comparison.
