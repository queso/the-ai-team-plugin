---
id: '006'
title: Add probing to ACTIVE_STAGES in work-item-card
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card-probing.test.tsx
  impl: src/components/work-item-card.tsx
dependencies:
  - '001'
parallel_group: work-item-card
---
## Objective

Update ACTIVE_STAGES array in work-item-card.tsx to include probing so agent badges show on probing cards.

## Acceptance Criteria

- [ ] ACTIVE_STAGES includes probing: testing, implementing, review, probing
- [ ] Agent badge displays on cards in probing stage when assigned_agent is set
- [ ] Status dot shows correct color for probing stage agents

## Context

The ACTIVE_STAGES array in work-item-card.tsx controls which stages show agent badges. Since Amy actively works items in probing, it must be included.
