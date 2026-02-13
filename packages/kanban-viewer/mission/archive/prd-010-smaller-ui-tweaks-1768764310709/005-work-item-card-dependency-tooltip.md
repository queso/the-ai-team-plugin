---
id: '005'
title: Work Item Card Dependency Tooltip
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies: []
---
## Objective

The dependency link icon (Link2 icon - the dependency indicator, not the blocker indicator) on work item cards shows a count but hovering over it provides no additional information about what the dependencies are. Add a tooltip to show the list of dependency IDs.

## Acceptance Criteria

- [ ] Tooltip appears on hover over dependency icon in work item cards
- [ ] Tooltip shows list of dependency IDs (e.g., 'Depends on: 002, 010')
- [ ] Tooltip styling matches dark theme
- [ ] Tooltip disappears when mouse leaves

## Context

Note: There is already a separate DependencyIndicator component at src/components/dependency-indicator.tsx that has a Radix UI Tooltip. However, the work-item-card.tsx uses its own inline dependency indicator (using Link2 icon) that does NOT use the tooltip.

Implementation options:
1. Use native `title` attribute for simple tooltip
2. Use Radix UI Tooltip component for styled tooltip (like DependencyIndicator does)
3. Replace inline indicator with DependencyIndicator component

The Radix UI Tooltip approach is preferred to match existing patterns.
