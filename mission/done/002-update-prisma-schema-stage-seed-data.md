---
id: '002'
title: Update Prisma schema stage seed data
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/prisma/seed.test.ts
  impl: prisma/seed.ts
dependencies:
  - '001'
parallel_group: stage-harmonization
---
## Objective

Update the Prisma schema and seed script to use the original stage names (briefings, probing, testing, implementing) instead of the simplified names (backlog, in_progress).

## Acceptance Criteria

- [ ] prisma/seed.ts creates stages with IDs: briefings, ready, probing, testing, implementing, review, done, blocked
- [ ] Stage display names and order numbers are correctly set
- [ ] WIP limits are set appropriately for each stage
- [ ] Database migration runs successfully

## Context

The database Stage table needs to store the canonical stage names that match the UI expectations. This allows the API to return stage IDs that the frontend can use directly without transformation.


Human confirmed: Fresh database only - no data migration needed. Existing data can be discarded. This seed script creates the canonical 8 stages that match the UI expectations.
