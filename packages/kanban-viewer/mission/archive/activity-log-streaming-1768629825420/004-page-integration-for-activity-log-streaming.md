---
id: '004'
title: Page integration for activity log streaming
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/page-activity-streaming.test.tsx
  impl: src/app/page.tsx
dependencies:
  - '003'
parallel_group: page
---
## Objective

Wire up the onActivityEntry callback in the main page to append new log entries to state in real-time.

## Acceptance Criteria

- [ ] onActivityEntry callback is passed to useBoardEvents
- [ ] New activity entries are appended to logEntries state
- [ ] Duplicate entries are not added (check timestamp + agent + message)
- [ ] LiveFeedPanel receives updated entries and auto-scrolls

## Context

In src/app/page.tsx, add an onActivityEntry callback that appends the new LogEntry to the logEntries state. The LiveFeedPanel component already has auto-scroll behavior that triggers when entries change. Be careful to avoid duplicates - the initial fetch loads historical entries, and SSE should only add truly new ones.
