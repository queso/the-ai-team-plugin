---
id: '005'
title: Style probing column with purple theme
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/probing-column-styling.test.tsx
  impl: src/components/board-column.tsx
dependencies:
  - '001'
parallel_group: board-column
---
## Objective

Apply purple/violet styling to the probing column header and background in BoardColumn component.

## Acceptance Criteria

- [ ] Probing column header has purple/violet color #8b5cf6
- [ ] Probing column background uses dark purple tint #2d2438
- [ ] Header text displays PROBING
- [ ] Styling matches other column patterns

## Context

The BoardColumn component needs conditional styling for the probing stage. Reference COLUMN_COLORS pattern if one exists, or add inline style conditions. Header color #8b5cf6, background #2d2438.
