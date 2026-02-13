---
id: 008
title: Add layout transition to BoardColumn component
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/board-column-animations.test.tsx
  impl: src/components/board-column.tsx
dependencies:
  - '005'
  - '007'
parallel_group: animations
---
## Objective

Update BoardColumn to smoothly animate layout changes when cards are added, removed, or reordered within the column.

## Acceptance Criteria

- [ ] Cards smoothly reposition when siblings are added or removed (200ms transition)
- [ ] Layout uses CSS transition on transform for smooth repositioning
- [ ] No jank or stuttering during rapid successive updates
- [ ] Column scroll position is preserved during animations
- [ ] Tests verify layout transition behavior

## Context

The BoardColumn component in src/components/board-column.tsx maps over items to render WorkItemCards. Add CSS transition properties to the card container to enable smooth layout shifts. Consider using a keyed approach with transition-group patterns or CSS layout-animation-mode. The space-y-2 utility currently handles spacing - ensure transitions work with this.
