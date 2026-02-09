---
id: '002'
title: Add probing to VALID_STAGES array
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/probing-stage-utils.test.ts
  impl: src/lib/stage-utils.ts
dependencies:
  - '001'
parallel_group: types
---
## Objective

Update the VALID_STAGES array in stage-utils.ts to include probing between review and done.

## Acceptance Criteria

- [ ] VALID_STAGES array includes probing in correct position
- [ ] isValidStage function correctly identifies probing as valid
- [ ] getStageFromPath returns probing when path contains /mission/probing/

## Context

The stage-utils.ts file contains VALID_STAGES array used for stage validation and path parsing. Must be updated after Stage type is extended.
