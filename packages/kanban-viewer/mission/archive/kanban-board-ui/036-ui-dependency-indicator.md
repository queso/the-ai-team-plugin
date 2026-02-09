---
id: "036"
title: "DependencyIndicator component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/dependency-indicator.tsx"
  test: "src/__tests__/dependency-indicator.test.tsx"
  impl: "src/components/dependency-indicator.tsx"
---

## Objective

Create a React component showing the dependency blocker icon with count and hover tooltip revealing blocker details.

## Acceptance Criteria

- [ ] Chain link icon from Lucide (Link2 or similar)
- [ ] Count displayed next to icon
- [ ] Only renders when count > 0
- [ ] Hover tooltip shows list of blocking item IDs
- [ ] Subtle styling (muted color, small size)
- [ ] Accepts blockerIds array prop
- [ ] Uses shadcn/ui Tooltip component

## Context

Dependency indicator design from PRD:
```
                 @ 1   <- Chain icon + count
                  |
                  v
        +-----------------+
        | Blocked by:     |  <- Hover tooltip
        | - 009           |
        | - 012           |
        +-----------------+
```

This indicator appears on cards that have unmet dependencies - items they depend on that are not yet in the "done" stage.

Props:
```typescript
interface DependencyIndicatorProps {
  blockerIds: string[];  // IDs of unmet dependencies
}
```

Only renders if blockerIds.length > 0.
