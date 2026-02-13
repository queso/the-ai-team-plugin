---
id: 009
title: Reduce work item card border radius
type: enhancement
status: pending
rejection_count: 0
dependencies: []
---
## Objective

Work item cards currently have rounded corners that are too pronounced. Reduce the border-radius to create more squared, professional-looking corners.

## Acceptance Criteria

- [ ] Card border-radius is set to rounded-md (0.375rem)
- [ ] Corners appear more squared while maintaining slight rounding
- [ ] Change is consistent across all card states
- [ ] Visual appearance matches design intent


## Context

File: `/src/components/work-item-card.tsx`

Tailwind border-radius classes:
- `rounded-none` = 0
- `rounded-sm` = 0.125rem
- `rounded` = 0.25rem
- `rounded-md` = 0.375rem
- `rounded-lg` = 0.5rem

Choose appropriate level based on current styling.


Use Tailwind `rounded-md` (0.375rem) for the card border-radius.
