---
id: '012'
title: Add probing to VALID_STAGES in stage API route
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api-stage-probing.test.ts
  impl: 'src/app/api/board/stage/[stage]/route.ts'
dependencies:
  - '001'
parallel_group: api-stage
---
## Objective

Update VALID_STAGES array in api/board/stage/[stage]/route.ts to accept probing as a valid stage parameter.

## Acceptance Criteria

- [ ] VALID_STAGES includes probing
- [ ] GET /api/board/stage/probing returns 200 with items
- [ ] Invalid stages still return 400

## Context

The stage API route validates stage parameter against VALID_STAGES. Without probing, requests to /api/board/stage/probing return 400 error.
