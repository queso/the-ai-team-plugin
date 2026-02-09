---
id: '008'
title: Work Item Card Reduced Border Radius
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies: []
---
## Objective

Update work item cards to have more squared corners. Currently cards use rounded-xl from the Card component which creates very rounded corners. The target design calls for more subtle rounding.

## Acceptance Criteria

- [ ] Work item cards have reduced border-radius (rounded or rounded-md instead of rounded-xl)
- [ ] Change is applied via className override on the Card component in work-item-card.tsx
- [ ] Other Card usages in the app are not affected

## Context

The Card component in src/components/ui/card.tsx has `rounded-xl` in its base className. To override this for work item cards:

```tsx
<Card
  className={cn(
    'p-4 gap-2 hover:bg-accent transition-colors rounded-md',
    // ... other classes
  )}
>
```

Using `rounded-md` (6px) or `rounded` (4px) will create more squared corners than `rounded-xl` (12px).
