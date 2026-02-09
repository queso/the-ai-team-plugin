---
id: "200"
title: "Define SSE connection status indicator types"
type: "interface"
outputs:
  types: "src/types/index.ts"
dependencies: []
parallel_group: "sse-integration"
status: "pending"
rejection_count: 0
---

## Objective

Define TypeScript types for the SSE connection status indicator component that will display the real-time connection state to users.

## Acceptance Criteria

- [ ] `ConnectionStatus` type defined with values: 'connected' | 'connecting' | 'disconnected' | 'error'
- [ ] `ConnectionStatusIndicatorProps` interface defined with:
  - `status: ConnectionStatus` - current connection state
  - `error?: Error | null` - optional error details for error state
  - `className?: string` - optional additional styling
- [ ] Types are exported from `src/types/index.ts`
- [ ] Types include JSDoc documentation

## Technical Notes

The connection status indicator will show:
- Green dot + "Live" for connected state
- Yellow dot + "Connecting..." for connecting state
- Red dot + "Disconnected" for disconnected state
- Red dot + error message for error state

These types will be used by the connection status indicator component added in work item 204.

## Context

The `useBoardEvents` hook already returns `isConnected: boolean` and `connectionError: Error | null`. These types need to map that to a richer status enum for display purposes.
