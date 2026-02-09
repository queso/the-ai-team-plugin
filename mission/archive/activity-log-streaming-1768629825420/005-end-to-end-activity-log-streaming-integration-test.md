---
id: '005'
title: End-to-end activity log streaming integration test
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/activity-streaming-integration.test.tsx
  impl: src/__tests__/activity-streaming-integration.test.tsx
dependencies:
  - '002'
  - '004'
parallel_group: integration
---
## Objective

Create an integration test verifying that activity log entries stream from file write to UI display within expected latency.

## Acceptance Criteria

- [ ] Test simulates writing to activity.log file
- [ ] Test verifies SSE event is emitted with correct LogEntry data
- [ ] Test verifies new entry appears in Live Feed panel
- [ ] Test verifies latency is under 1 second
- [ ] Test verifies multiple rapid entries all appear without loss

## Context

This integration test validates the full pipeline: activity.log write -> fs.watch detection -> SSE emit -> hook callback -> state update -> UI render. May need to mock fs.watch or use actual file operations. Focus on the data flow rather than visual verification.
