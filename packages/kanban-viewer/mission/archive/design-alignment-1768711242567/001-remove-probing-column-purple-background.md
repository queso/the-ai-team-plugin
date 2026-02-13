---
id: '001'
title: Remove probing column purple background
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/board-column.test.tsx
  impl: src/components/board-column.tsx
dependencies: []
---
## Objective

Remove the purple/violet theme colors from the PROBING column so it matches the styling of all other columns.

## Acceptance Criteria

- [ ] Remove COLUMN_COLORS constant that applies special styling to probing
- [ ] PROBING column uses same #242424 background as other columns
- [ ] PROBING column header text uses #ffffff (not purple #8b5cf6)
- [ ] All columns have consistent visual appearance
- [ ] Update or remove tests that specifically check for purple probing styling

## Context

The PRD specifies that PROBING should NOT have a colored background. Currently board-column.tsx has:
```typescript
const COLUMN_COLORS: Partial<Record<Stage, { bg: string; header: string }>> = {
  probing: {
    bg: 'bg-[#2d2438]',
    header: 'text-[#8b5cf6]',
  },
};
```

This needs to be removed so probing matches other columns.
