---
id: "121"
title: "Remove Per-Column WIP Labels - Implementation"
type: "implementation"
status: "pending"
dependencies: ["120"]
parallel_group: "column-wip"
rejection_count: 0
outputs:
  test: "src/__tests__/board-column.test.tsx"
  impl: "src/components/board-column.tsx"
---

## Objective

Remove the per-column WIP indicator display from BoardColumn component while keeping the column name and item count.

## Acceptance Criteria

- [ ] Remove WIP indicator JSX from column header
- [ ] Keep column name display (uppercase)
- [ ] Keep item count display on right side
- [ ] Remove getWipStatusClass function (no longer needed)
- [ ] Keep wipLimit prop in interface for backward compatibility
- [ ] Remove data-testid="wip-indicator" element entirely

## Context

- File: `src/components/board-column.tsx`
- Current structure has WIP label below column name
- Simply delete the conditional rendering block for wipLimit
- The global WIP in header-bar.tsx is sufficient per PRD

Current code to remove:
```tsx
{wipLimit !== undefined && (
  <div
    data-testid="wip-indicator"
    className={`text-xs mt-1 ${getWipStatusClass(itemCount, wipLimit)}`}
  >
    WIP: {itemCount}/{wipLimit}
  </div>
)}
```
