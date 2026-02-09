---
id: '001'
title: Add granular connection state to useBoardEvents hook
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/use-board-events-connection-state.test.ts
  impl: src/hooks/use-board-events.ts
dependencies: []
parallel_group: foundation
---
## Objective

Update useBoardEvents hook to expose granular connection state (connecting/connected/disconnected/error) instead of simple boolean, enabling proper UI feedback during connection establishment and reconnection attempts.

## Acceptance Criteria

- [ ] Hook returns connectionState enum value instead of just isConnected boolean
- [ ] State is connecting during initial EventSource creation and before onopen fires
- [ ] State is connecting during reconnection attempts (between onerror and next onopen)
- [ ] State is connected after onopen fires
- [ ] State is disconnected only after max retries exceeded
- [ ] State is error when connectionError is set
- [ ] Backward-compatible isConnected boolean still available (derived from connectionState)

## Context

The ConnectionStatus type already exists in src/types/index.ts with values: connected, connecting, disconnected, error. The useBoardEvents hook currently uses useState<boolean>(false) for isConnected. Update to use useState<ConnectionStatus>(connecting) and set appropriately in connect(), onopen, onerror handlers.
