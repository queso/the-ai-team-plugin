---
id: '003'
title: Update Agent Status Bar to display 7 agents
type: implementation
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-status-bar.test.tsx
  impl: src/components/agent-status-bar.tsx
dependencies:
  - '002'
work_log:
  - agent: Murdock
    timestamp: '2026-01-20T19:26:22.863Z'
    status: success
    summary: >-
      Extended agent-status-bar tests with 2 new test cases: Tawnia teal badge
      color verification and Tawnia positioning after Lynch
    files_created:
      - /Users/josh/Code/kanban-viewer/src/__tests__/agent-status-bar.test.tsx
  - agent: B.A.
    timestamp: '2026-01-20T19:27:53.762Z'
    status: success
    summary: >-
      Verified agent-status-bar displays all 7 agents correctly. All 57 tests
      passing. Implementation was already complete from Item 002.
  - agent: Lynch
    timestamp: '2026-01-20T19:33:39.126Z'
    status: success
    summary: >-
      APPROVED - All 51 tests pass. Implementation displays all 7 agents
      correctly with Amy pink and Tawnia teal. Was already complete from Item
      002.
---
## Objective

Update Agent Status Bar to add Tawnia (7th agent) and verify Amy displays with updated pink color. The status bar currently shows 6 agents (Amy already exists with violet color).

## Acceptance Criteria

- [ ] Agent status bar displays all 7 agents: Hannibal, Face, Murdock, B.A., Lynch, Amy, Tawnia
- [ ] Amy displays with pink badge color (changed from violet) and A initial
- [ ] Tawnia displays with teal badge color and T initial
- [ ] Agent status updates work correctly for Amy and Tawnia
- [ ] Layout adapts to accommodate 7 agents without overflow


## Context

The existing component already displays 6 agents. This update adds Amy and Tawnia. Note that Amy already exists in the AGENT_NAMES array but with violet color - this needs to change to pink.

## Work Log
Lynch - APPROVED - All 51 tests pass. Implementation displays all 7 agents correctly with Amy pink and Tawnia teal. Was already complete from Item 002.
B.A. - Verified agent-status-bar displays all 7 agents correctly. All 57 tests passing. Implementation was already complete from Item 002.
Murdock - Extended agent-status-bar tests with 2 new test cases: Tawnia teal badge color verification and Tawnia positioning after Lynch
