---
id: '003'
title: Update validation transition matrix for new stage names
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/lib/validation.test.ts
  impl: src/lib/validation.ts
dependencies:
  - '001'
parallel_group: stage-harmonization
---
## Objective

Update the TRANSITION_MATRIX in src/lib/validation.ts to use the new stage names and include all 8 stages with their valid transitions.

## Acceptance Criteria

- [ ] TRANSITION_MATRIX includes entries for all 8 stages
- [ ] briefings can transition to: ready, blocked
- [ ] ready can transition to: probing, testing, implementing, blocked, briefings
- [ ] probing can transition to: ready, blocked
- [ ] testing can transition to: review, blocked
- [ ] implementing can transition to: review, blocked
- [ ] review can transition to: done, testing, implementing, blocked
- [ ] done has no valid transitions (terminal)
- [ ] blocked can transition to: ready
- [ ] isValidTransition function works correctly with new stages

## Context

The validation layer enforces valid stage transitions. With the expanded stage list, we need to define which transitions are allowed for each stage. Amy uses probing, Murdock uses testing, B.A. uses implementing.
