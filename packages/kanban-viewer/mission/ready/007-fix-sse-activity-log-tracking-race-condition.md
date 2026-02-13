---
id: '007'
title: Fix SSE activity log tracking race condition
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api/board/events-activity-log.test.ts
  impl: src/app/api/board/events/route.ts
dependencies: []
parallel_group: sse-fixes
---
## Objective

Fix the race condition in SSE endpoint where lastActivityLogId is updated inside the loop instead of after all entries are processed.

## Acceptance Criteria

- [ ] lastActivityLogId is updated only after all log entries are successfully processed
- [ ] If an error occurs during processing, the tracking position remains consistent
- [ ] No activity log entries are skipped or duplicated
- [ ] Activity log streaming works correctly under concurrent updates

## Context

In src/app/api/board/events/route.ts (lines 375-386), the lastActivityLogId is updated per-entry inside the loop. If an error occurs while processing a log entry, the tracking position can become inconsistent. The fix moves the update outside the loop.


In src/app/api/board/events/route.ts, look for the activity log processing loop where lastActivityLogId is updated inside a for...of loop. The fix moves the ID update outside the loop to ensure consistent tracking even if errors occur mid-processing.
