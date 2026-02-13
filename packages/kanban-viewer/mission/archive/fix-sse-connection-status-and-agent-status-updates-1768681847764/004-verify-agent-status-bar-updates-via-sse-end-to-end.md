---
id: '004'
title: Verify agent status bar updates via SSE end-to-end
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-status-sse-integration.test.tsx
  impl: src/components/agent-status-bar.tsx
dependencies:
  - '002'
parallel_group: integration
---
## Objective

Create end-to-end test verifying that agent status changes in board.json propagate to the AgentStatusBar component via SSE without page refresh.

## Acceptance Criteria

- [ ] Test simulates board.json change with updated agent status
- [ ] Test verifies SSE endpoint emits board-updated event with new agent data
- [ ] Test verifies page.tsx receives event and updates boardMetadata state
- [ ] Test verifies AgentStatusBar renders updated agent statuses
- [ ] All updates complete within 1 second of file change

## Context

This is an integration test that validates the full flow: board.json change -> SSE endpoint detects change -> emits board-updated with data -> client receives and updates state -> AgentStatusBar re-renders. The AgentStatusBar component receives agents prop from page.tsx which derives it from boardMetadata.agents.
