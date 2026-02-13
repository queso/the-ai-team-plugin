---
id: '010'
title: Consistent Work Item Card Height
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies: []
---
## Objective

Work item cards currently have variable heights based on content, causing ragged card edges across columns. Cards should have a consistent minimum height so they align better visually.

## Acceptance Criteria

- [ ] All work item cards have a minimum height (e.g., min-h-[140px])
- [ ] Card content uses flexbox with justify-between to push footer to bottom
- [ ] Cards without agents (briefings, ready, done, blocked) handle gracefully
- [ ] Prevents ragged card edges across columns

## Context

Implementation:
1. Add `min-h-[140px]` to the Card className
2. Ensure the Card's internal layout uses flexbox (already has `flex flex-col`)
3. Add `flex-1` to the title section to take available space
4. Use `mt-auto` on the footer row to push it to the bottom

```tsx
<Card className={cn('p-4 gap-2 min-h-[140px] flex flex-col', ...)}>
  <div>{/* header */}</div>
  <div className="flex-1">{/* title */}</div>
  <div>{/* badge */}</div>
  <div className="mt-auto">{/* footer */}</div>
</Card>
```
