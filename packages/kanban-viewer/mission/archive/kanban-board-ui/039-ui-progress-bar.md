---
id: "039"
title: "ProgressBar component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/progress-bar.tsx"
  test: "src/__tests__/progress-bar.test.tsx"
  impl: "src/components/progress-bar.tsx"
---

## Objective

Create a React component for the visual progress bar showing completed vs total items.

## Acceptance Criteria

- [ ] Horizontal bar showing fill percentage
- [ ] Displays count text (e.g., "12/26")
- [ ] Smooth fill animation on change
- [ ] Green fill color for completed portion
- [ ] Gray background for remaining portion
- [ ] Accepts completed and total props
- [ ] Handles edge cases (0 items, all complete)

## Context

Progress bar design from PRD:
```
[====------] 12/26
```

Shows visual representation of mission progress:
- Filled portion = completed items (done stage)
- Empty portion = remaining items
- Text shows exact count

Props:
```typescript
interface ProgressBarProps {
  completed: number;  // Items in done stage
  total: number;      // Total items across all stages
}
```

Percentage: (completed / total) * 100

Use shadcn/ui Progress component or custom implementation with Tailwind.
