---
id: "037"
title: "RejectionBadge component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/rejection-badge.tsx"
  test: "src/__tests__/rejection-badge.test.tsx"
  impl: "src/components/rejection-badge.tsx"
---

## Objective

Create a React component for the rejection warning badge showing count of times an item has been rejected.

## Acceptance Criteria

- [ ] Triangle warning icon from Lucide (AlertTriangle)
- [ ] Count displayed next to icon
- [ ] Only renders when count > 0
- [ ] Yellow/orange warning color
- [ ] Positioned in top-right corner of parent
- [ ] Accepts count prop
- [ ] Small, unobtrusive styling

## Context

Rejection badge design from PRD:
```
+-------------------------+
| 025              (!) 2  |  <- Warning icon + rejection count
| Login Form Validation   |
+-------------------------+
```

This badge indicates the item has been sent back for revision (rejected by Lynch during review).

Props:
```typescript
interface RejectionBadgeProps {
  count: number;  // rejection_count from work item frontmatter
}
```

Only renders if count > 0.

Color: Yellow/amber (#f59e0b / text-amber-500) or Orange (#f97316 / text-orange-500)
