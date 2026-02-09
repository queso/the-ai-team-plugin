---
id: '005'
title: Create card animation CSS and types
type: feature
status: pending
rejection_count: 0
dependencies: []
outputs:
  test: src/__tests__/card-animation-styles.test.ts
  impl: src/styles/animations.css
parallel_group: animations
---
## Objective

Create CSS animation classes and TypeScript types for card movement animations including exit, enter, and layout shift effects.

## Acceptance Criteria

- [ ] CSS file created with exit animation (lift and fade, 300ms)
- [ ] CSS file includes enter animation (slide and settle with subtle bounce, 300ms)
- [ ] CSS file includes layout shift animation for repositioning (200ms)
- [ ] Animations support directional variants (left/right) for movement indication
- [ ] TypeScript types defined for animation state (entering, exiting, idle)
- [ ] Animations use CSS transforms for GPU acceleration
- [ ] Includes prefers-reduced-motion media query for accessibility

## Context

Create new file src/styles/animations.css with keyframe animations. Animation types should include: CardAnimationState (entering | exiting | idle), CardAnimationDirection (left | right | none). Use transform and opacity for performant animations. The exit animation should lift the card slightly (translateY -4px) while fading out and translating toward destination. Enter animation should slide from source direction and settle with a subtle scale bounce effect.
