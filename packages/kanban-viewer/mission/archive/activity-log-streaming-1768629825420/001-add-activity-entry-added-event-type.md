---
id: '001'
title: Add activity-entry-added event type
type: feature
status: pending
rejection_count: 0
dependencies: []
outputs:
  test: src/__tests__/activity-event-types.test.ts
  impl: src/types/index.ts
parallel_group: types
---
## Objective

Extend BoardEventType and BoardEvent to support activity log streaming events.

## Acceptance Criteria

- [ ] BoardEventType union includes activity-entry-added
- [ ] BoardEvent.data has optional logEntry field of type LogEntry
- [ ] LogEntry type is properly imported/exported from types

## Context

The LogEntry interface already exists in src/lib/activity-log.ts. Either re-export it from types/index.ts or define it there. This is a type-only change that enables the SSE endpoint and hook to pass activity log entries.
