---
id: '004'
title: Add probing to responsive-board.tsx
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/responsive-board-probing.test.tsx
  impl: src/components/responsive-board.tsx
dependencies:
  - '001'
parallel_group: responsive-board
---
## Objective

Update ALL_STAGES and STAGE_LABELS in responsive-board.tsx to include probing stage.

## Acceptance Criteria

- [ ] ALL_STAGES includes probing between review and done
- [ ] STAGE_LABELS includes probing with label PROBING
- [ ] Mobile stage tabs include probing tab
- [ ] Desktop board renders probing column

## Context

The responsive-board.tsx component has its own ALL_STAGES and STAGE_LABELS definitions for mobile and desktop views. Both must be updated for probing stage.
