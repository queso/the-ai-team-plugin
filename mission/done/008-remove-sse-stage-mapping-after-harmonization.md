---
id: '008'
title: Remove SSE stage mapping after harmonization
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/board/events-stage-mapping.test.ts
  impl: src/app/api/board/events/route.ts
dependencies:
  - '004'
parallel_group: stage-harmonization
---
## Objective

Remove the bidirectional stage mappings in SSE endpoint dbItemToWorkItem() function since harmonization makes them unnecessary.

## Acceptance Criteria

- [ ] stageMapping object in SSE endpoint only contains identity mappings
- [ ] Or preferably, stage mapping logic is removed entirely
- [ ] Unknown stage IDs log warnings and do not crash
- [ ] SSE events contain correct stage IDs matching database

## Context

In src/app/api/board/events/route.ts, look for the stageMapping object and dbItemToWorkItem() function containing bidirectional mappings like backlog->briefings and in_progress->testing. After stage harmonization (item 004), the database will use the same stage names as the UI, so this mapping layer should be simplified to identity mappings or removed entirely.
