---
id: '007'
title: Add COMMITTED highlight to Activity Log
type: implementation
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/activity-log.test.ts
  impl: src/lib/activity-log.ts
dependencies:
  - '002'
work_log:
  - agent: Murdock
    timestamp: '2026-01-20T19:26:30.038Z'
    status: success
    summary: >-
      Extended activity-log.test.ts with 4 new test cases for COMMITTED
      highlight: COMMITTED prefix detection, full commit hash parsing, short
      commit hash parsing, and committed highlightType in LogEntry type. Updated
      sample log content to include Tawnia COMMITTED entry. All 4 new tests fail
      as expected (implementation pending).
    files_created:
      - /Users/josh/Code/kanban-viewer/src/__tests__/activity-log.test.ts
  - agent: B.A.
    timestamp: '2026-01-20T19:28:07.898Z'
    status: success
    summary: >-
      Added COMMITTED highlightType to LogEntry interface and detection logic in
      parseLogEntry function. All 27 tests passing.
    files_modified:
      - src/lib/activity-log.ts
  - agent: Lynch
    timestamp: '2026-01-20T19:33:40.529Z'
    status: success
    summary: >-
      APPROVED - All 27 tests pass. COMMITTED highlightType added to LogEntry.
      Parser correctly detects COMMITTED prefix using startsWith pattern.
---
## Objective

Extend the activity log parser and display to highlight COMMITTED messages from Tawnia with teal color, similar to existing APPROVED and REJECTED highlights.

## Acceptance Criteria

- [ ] Activity log parser recognizes COMMITTED prefix and sets highlightType to committed
- [ ] COMMITTED detection uses message.startsWith(COMMITTED) pattern
- [ ] LogEntry highlightType type extended to include committed
- [ ] COMMITTED messages displayed with teal highlight color in activity feed
- [ ] Tawnia agent messages display with teal agent color
- [ ] Commit hash displayed prominently in COMMITTED messages


## Context

The activity log already supports APPROVED (green), REJECTED (red), and ALERT highlights. COMMITTED should be added as a new highlight type with teal color matching Tawnia agent.

## Work Log
Lynch - APPROVED - All 27 tests pass. COMMITTED highlightType added to LogEntry. Parser correctly detects COMMITTED prefix using startsWith pattern.
B.A. - Added COMMITTED highlightType to LogEntry interface and detection logic in parseLogEntry function. All 27 tests passing.
Murdock - Extended activity-log.test.ts with 4 new test cases for COMMITTED highlight: COMMITTED prefix detection, full commit hash parsing, short commit hash parsing, and committed highlightType in LogEntry type. Updated sample log content to include Tawnia COMMITTED entry. All 4 new tests fail as expected (implementation pending).
