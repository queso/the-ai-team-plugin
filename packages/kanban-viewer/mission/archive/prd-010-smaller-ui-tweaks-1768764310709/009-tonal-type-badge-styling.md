---
id: '009'
title: Tonal Type Badge Styling
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies: []
---
## Objective

Update work item type badges to use tonal/muted styling instead of solid colored backgrounds. The new style should have a subtle semi-transparent background, full saturation colored text, and a subtle border.

## Acceptance Criteria

- [ ] Type badges have muted/transparent background (e.g., bg-cyan-500/20)
- [ ] Badge text uses full saturation of the type color (e.g., text-cyan-400)
- [ ] Badge has subtle border in the type color (e.g., border-cyan-500/50)
- [ ] All type badge colors are updated: feature, bug, enhancement, task

## Context

Current TYPE_COLORS uses solid backgrounds:
```typescript
const TYPE_COLORS: Record<WorkItemFrontmatterType, string> = {
  feature: 'bg-cyan-500',
  bug: 'bg-red-500',
  enhancement: 'bg-blue-500',
  task: 'bg-green-500',
};
```

New tonal approach:
```typescript
const TYPE_BADGE_STYLES: Record<WorkItemFrontmatterType, string> = {
  feature: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50',
  bug: 'bg-red-500/20 text-red-400 border border-red-500/50',
  enhancement: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  task: 'bg-green-500/20 text-green-400 border border-green-500/50',
};
```

Remove `text-white` from the badge span className.
