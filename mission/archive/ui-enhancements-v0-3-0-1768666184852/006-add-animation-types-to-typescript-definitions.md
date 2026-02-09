---
id: '006'
title: Add animation types to TypeScript definitions
type: feature
status: pending
rejection_count: 0
dependencies: []
outputs:
  test: src/__tests__/animation-types.test.ts
  impl: src/types/index.ts
parallel_group: types
---
## Objective

Add TypeScript type definitions for card animation state management to the types module.

## Acceptance Criteria

- [ ] CardAnimationState type defined (entering | exiting | idle)
- [ ] CardAnimationDirection type defined (left | right | none)
- [ ] AnimatingItem interface defined with itemId, state, and direction
- [ ] Types are exported from src/types/index.ts
- [ ] Type tests verify all animation types

## Context

These types will be used by work-item-card, board-column, and page.tsx to coordinate animation state. The AnimatingItem interface tracks which items are currently animating and their animation state/direction.
