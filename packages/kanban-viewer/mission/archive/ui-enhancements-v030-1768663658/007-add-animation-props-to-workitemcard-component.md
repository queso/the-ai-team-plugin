---
id: '007'
title: Add animation props to WorkItemCard component
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card-animations.test.tsx
  impl: src/components/work-item-card.tsx
dependencies:
  - '005'
  - '006'
parallel_group: animations
---
## Objective

Extend WorkItemCard to accept animation state props and apply appropriate CSS animation classes based on state.

## Acceptance Criteria

- [ ] WorkItemCard accepts optional animationState prop (entering | exiting | idle)
- [ ] WorkItemCard accepts optional animationDirection prop (left | right | none)
- [ ] Exiting state applies exit animation CSS class
- [ ] Entering state applies enter animation CSS class with correct direction
- [ ] Idle state applies no animation classes
- [ ] Animation classes are removed after animation completes (onAnimationEnd)
- [ ] Card renders correctly when animation props are undefined
- [ ] Tests verify animation class application for all states

## Context

The WorkItemCard component in src/components/work-item-card.tsx needs to conditionally apply animation classes from animations.css based on props. Use the cn() utility for conditional class merging. The animation CSS file will be imported in page.tsx or a layout file. Wire up onAnimationEnd to support cleanup callbacks.
