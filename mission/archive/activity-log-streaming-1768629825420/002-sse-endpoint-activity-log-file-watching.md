---
id: '002'
title: SSE endpoint activity.log file watching
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api-activity-events.test.ts
  impl: src/app/api/board/events/route.ts
dependencies:
  - '001'
parallel_group: sse
---
## Objective

Extend the SSE endpoint to watch activity.log and emit activity-entry-added events when new lines are appended.

## Acceptance Criteria

- [ ] activity.log changes trigger SSE events
- [ ] Only new lines are emitted (not entire file content)
- [ ] File position is tracked to detect appended content efficiently
- [ ] activity-entry-added events include the parsed LogEntry in data.logEntry
- [ ] Multiple rapid appends emit separate events (no dropped entries)

## Context

The SSE endpoint at src/app/api/board/events/route.ts already watches the mission directory recursively. Need to detect when filename is activity.log, track last read position, read new content, parse with parseLogEntry from src/lib/activity-log.ts, and emit events. Consider debouncing carefully - rapid writes should not lose entries.
