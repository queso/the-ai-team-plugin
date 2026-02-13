---
id: '018'
title: Add database indexes for common queries
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/prisma/indexes.test.ts
  impl: prisma/schema.prisma
dependencies: []
parallel_group: database-fixes
---
## Objective

Add database indexes to the Prisma schema for frequently filtered fields to improve query performance.

## Acceptance Criteria

- [ ] Index added for Item.stageId
- [ ] Index added for Item.archivedAt
- [ ] Index added for Item.assignedAgent
- [ ] Index added for Mission.archivedAt
- [ ] Database migration applies successfully
- [ ] Query performance improves for filtered queries

## Context

The Prisma schema lacks indexes for commonly filtered fields. Queries like item.findMany({ where: { archivedAt: null } }) and item.findMany({ where: { stageId } }) will benefit from indexes as data volume grows.

## Work Notes

### 2026-01-24T19:30:21.383Z - murdock
Status: success
Created 9 test cases verifying database indexes for Item.stageId, Item.archivedAt, Item.assignedAgent, and Mission.archivedAt - tests fail as expected awaiting implementation

Files created:
- src/__tests__/prisma/indexes.test.ts
