---
id: '002'
title: Progress bar turns green at 100% completion
type: enhancement
status: pending
rejection_count: 0
dependencies: []
---
## Objective

Change the progress bar color to green (#22c55e) when mission progress reaches 100%. The bar should remain the current color while in progress and transition smoothly to green upon completion.

## Acceptance Criteria

- [ ] Progress bar displays green (#22c55e) when progress is 100%
- [ ] Progress bar uses current/default color when progress is less than 100%
- [ ] Color transition is smooth (CSS transition)
- [ ] Green color matches Tailwind's green-500 (#22c55e)

## Context

File: `/src/components/header-bar.tsx`

Use conditional styling based on progress value. Add CSS transition for smooth color change. Consider using Tailwind's `transition-colors` class.


HeaderBar uses Progress from `@/components/ui/progress` (shadcn/ui). Change requires conditional className prop. Note: separate `/src/components/progress-bar.tsx` exists but is NOT used.

Use conditional styling based on progress value. Add CSS transition for smooth color change. Consider using Tailwind's `transition-colors` class.
