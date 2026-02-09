---
id: 008
title: Dependency icon on work item cards
type: feature
status: pending
rejection_count: 0
dependencies:
  - '007'
---
## Objective

Implement the missing dependency indicator on work item cards using the lucide-react Link2 icon to show when items have dependencies.

## Acceptance Criteria

- [ ] Import Link2 icon from lucide-react
- [ ] Display dependency indicator when item has dependencies array with length > 0
- [ ] Position indicator right-aligned on the card
- [ ] Show Link2 icon (12px) with dependency count
- [ ] Use #6b7280 color for icon and count text
- [ ] Use 12px font size for count

## Context

Dependency Icon specification from PRD:
- Icon: lucide-react Link2
- Position: right-aligned on card
- Color: #6b7280
- Size: 12px icon + count
- Only show when dependencies exist

This is a HIGH priority fix per PRD - the dependency display code is currently missing.
