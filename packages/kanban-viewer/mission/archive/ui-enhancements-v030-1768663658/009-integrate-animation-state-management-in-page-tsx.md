---
id: 009
title: Integrate animation state management in page.tsx
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/page-animations.test.tsx
  impl: src/app/page.tsx
dependencies:
  - '006'
  - '007'
  - 008
parallel_group: animations
---
## Objective

Wire up animation state management in the main page component to trigger card animations when SSE events indicate item movement between columns.

## Acceptance Criteria

- [ ] Animation state tracked for items currently animating
- [ ] onItemMoved callback triggers exit animation on source column card
- [ ] After exit animation completes, item moves and enter animation triggers on destination
- [ ] Animation direction correctly reflects column movement (left/right based on stage order)
- [ ] Rapid successive moves handled correctly (cancel pending animations)
- [ ] State updates are not blocked or delayed by animations
- [ ] Import animations.css in the page or layout
- [ ] Tests verify animation triggering on SSE events

## Context

The page.tsx onItemMoved callback currently just updates item stage. Enhance it to: 1) Set exit animation state, 2) Wait for animation (setTimeout or onAnimationEnd callback), 3) Update item stage, 4) Set enter animation state, 5) Clear animation state after completion. Use a Map or Record to track animating items. ALL_STAGES array defines column order for determining animation direction.
