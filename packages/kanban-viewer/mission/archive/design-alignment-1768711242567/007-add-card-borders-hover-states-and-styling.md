---
id: '007'
title: Add card borders, hover states, and refined styling
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies: []
---
## Objective

Update work item cards to match PRD specifications for borders, hover states, and visual styling.

## Acceptance Criteria

- [ ] Card background is #2a2a2a with 1px #374151 border
- [ ] Card corners have 8px border-radius
- [ ] Card padding is 16px all sides
- [ ] Item ID styled: top left, #6b7280 (muted gray), 12px font
- [ ] Title: 14px, #ffffff, font-weight 500
- [ ] Card hover state lightens background to #333333
- [ ] Card spacing: 8px gap between cards in column

## Technical Notes

Current card uses `hover:bg-accent` which maps to a theme variable. Need to explicitly set hover to #333333.

## Context

PRD specifies explicit hex colors for cards rather than theme variables, plus specific border and hover treatments.
