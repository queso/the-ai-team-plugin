---
id: '014'
title: Add probing to ALL_STAGES in board-service.ts
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/board-service-probing.test.ts
  impl: src/services/board-service.ts
dependencies:
  - '001'
parallel_group: board-service
---
## Objective

Update ALL_STAGES array in board-service.ts to include probing so BoardService can find items in mission/probing/ folder.

## Acceptance Criteria

- [ ] ALL_STAGES includes probing between review and done
- [ ] getAllWorkItems() returns items from probing stage
- [ ] getWorkItemById() finds items in probing folder

## Context

board-service.ts has its own ALL_STAGES array used by getAllWorkItems() and getWorkItemById(). Without probing, the service won't see probing items.
