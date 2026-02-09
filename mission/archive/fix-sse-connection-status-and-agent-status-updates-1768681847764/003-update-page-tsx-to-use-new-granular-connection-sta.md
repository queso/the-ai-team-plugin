---
id: '003'
title: Update page.tsx to use new granular connection states
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/page-connection-status.test.tsx
  impl: src/app/page.tsx
dependencies:
  - '001'
parallel_group: integration
---
## Objective

Update the main page component to consume the new connectionState from useBoardEvents and pass appropriate ConnectionStatus to the ConnectionStatusIndicator component.

## Acceptance Criteria

- [ ] Page imports and uses connectionState from useBoardEvents return value
- [ ] ConnectionStatusIndicator receives correct status during initial page load (connecting)
- [ ] ConnectionStatusIndicator shows connected after SSE connection opens
- [ ] ConnectionStatusIndicator shows connecting during reconnection attempts
- [ ] ConnectionStatusIndicator shows error with error message when connection fails
- [ ] ConnectionStatusIndicator shows disconnected only after max retries exceeded

## Context

Currently page.tsx derives connectionStatus from isConnected boolean (lines 205-209). After item 001 is complete, update to use the new connectionState directly. The ConnectionStatusIndicator component already supports all ConnectionStatus values (connected, connecting, disconnected, error).
