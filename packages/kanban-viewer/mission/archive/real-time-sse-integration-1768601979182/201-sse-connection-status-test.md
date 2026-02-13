---
id: "201"
title: "Test SSE connection status indicator component"
type: "test"
outputs:
  test: "src/__tests__/connection-status-indicator.test.tsx"
dependencies: ["200"]
parallel_group: "sse-integration"
status: "pending"
rejection_count: 0
---

## Objective

Create comprehensive tests for the ConnectionStatusIndicator component that displays real-time SSE connection state to users.

## Acceptance Criteria

- [ ] Test renders "Live" text when status is 'connected'
- [ ] Test renders green indicator dot when connected
- [ ] Test renders "Connecting..." text when status is 'connecting'
- [ ] Test renders yellow/amber indicator dot when connecting
- [ ] Test renders "Disconnected" text when status is 'disconnected'
- [ ] Test renders red indicator dot when disconnected
- [ ] Test renders error message when status is 'error' and error prop provided
- [ ] Test renders red indicator dot when error state
- [ ] Test applies custom className when provided
- [ ] Test has appropriate aria-label for accessibility
- [ ] Test has correct data-testid attributes for each state

## Technical Notes

Use vitest and @testing-library/react following the existing test patterns in the codebase.

Test structure should include describe blocks for:
- Connected state rendering
- Connecting state rendering
- Disconnected state rendering
- Error state rendering
- Accessibility
- Custom styling

## Context

Reference existing test patterns from:
- `src/__tests__/agent-status-bar.test.tsx` for status indicator testing
- `src/__tests__/notification-dot.test.tsx` for dot rendering patterns
