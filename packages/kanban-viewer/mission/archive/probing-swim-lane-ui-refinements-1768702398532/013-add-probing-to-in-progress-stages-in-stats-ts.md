---
id: '013'
title: Add probing to IN_PROGRESS_STAGES in stats.ts
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/stats-probing.test.ts
  impl: src/lib/stats.ts
dependencies:
  - '001'
parallel_group: stats
---
## Objective

Update IN_PROGRESS_STAGES array in stats.ts to include probing so board statistics count probing items as in-progress.

## Acceptance Criteria

- [ ] IN_PROGRESS_STAGES includes probing: testing, implementing, review, probing
- [ ] calculateBoardStats correctly counts probing items as in_flight
- [ ] Stats displayed in UI reflect probing items

## Context

src/lib/stats.ts defines IN_PROGRESS_STAGES for calculating board statistics. Probing items should count as in-progress since Amy is actively working them.
