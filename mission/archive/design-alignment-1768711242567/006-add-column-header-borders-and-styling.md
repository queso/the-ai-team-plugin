---
id: '006'
title: Add column header borders and standardize styling
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/board-column.test.tsx
  impl: src/components/board-column.tsx
dependencies:
  - '001'
---
## Objective

Standardize column header styling across all columns with proper typography, height, and borders.

## Acceptance Criteria

- [ ] Column name style: ALL CAPS, 14px, Inter font-weight 600, #ffffff
- [ ] Count right-aligned, 14px, #6b7280
- [ ] Header height is 40px
- [ ] Header padding is 12px horizontal
- [ ] Column background is #242424
- [ ] Header has 1px #374151 bottom border
- [ ] Column min-width is 200px
- [ ] Column gap is 8px between columns (in responsive-board.tsx)

## Context

Current column headers use varying styles. PRD requires consistent treatment with specific typography and borders.
