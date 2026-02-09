---
id: "202"
title: "Implement SSE connection status indicator component"
type: "feature"
outputs:
  impl: "src/components/connection-status-indicator.tsx"
dependencies: ["201"]
parallel_group: "sse-integration"
status: "pending"
rejection_count: 0
---

## Objective

Implement the ConnectionStatusIndicator component that displays real-time SSE connection state with visual indicators.

## Acceptance Criteria

- [ ] Component renders colored dot indicator based on connection status
- [ ] Green dot + "Live" text for connected state
- [ ] Yellow/amber dot + "Connecting..." for connecting state
- [ ] Red dot + "Disconnected" for disconnected state
- [ ] Red dot + truncated error message for error state
- [ ] Dot has subtle pulse animation when connected (indicating live data)
- [ ] Component has appropriate aria-label for screen readers
- [ ] Component accepts optional className for additional styling
- [ ] Component has data-testid attributes matching test expectations
- [ ] All tests from 201 pass

## Technical Notes

Component structure:
```tsx
export function ConnectionStatusIndicator({
  status,
  error,
  className
}: ConnectionStatusIndicatorProps) {
  // Map status to dot color class
  // Map status to display text
  // Render dot + text with accessibility attributes
}
```

Styling should use Tailwind classes consistent with existing components:
- `bg-green-500` for connected
- `bg-amber-500` for connecting
- `bg-red-500` for disconnected/error
- `animate-pulse` for connected state dot

## Context

This component will be positioned in the header area of the board, near the mission name, to give users immediate feedback about the real-time connection status.
