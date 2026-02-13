---
id: '008'
title: Implement dependency icon display on work item cards
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies:
  - '007'
---
## Objective

Display dependency count with Link2 icon on work item cards that have dependencies.

## Acceptance Criteria

- [ ] Show lucide-react Link2 icon (14px) when item has dependencies
- [ ] Display dependency count next to icon
- [ ] Icon and count use #6b7280 color
- [ ] Positioned right-aligned in card footer
- [ ] Only visible when dependencies array has items
- [ ] board-column.tsx passes `blockerCount={item.dependencies?.length}` to WorkItemCard

## Technical Notes

Current card has `blockerCount` prop but it's not populated from dependencies. Need to:
1. Pass dependencies.length as blocker count from parent
2. Ensure Link2 icon is used (currently uses Link icon)
3. Style matches PRD specification

## Context

PRD requires dependency display with Link2 icon. Current implementation has the structure but icon and data flow need verification.
