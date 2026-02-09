---
id: "151"
title: "Agent Status Bar Animation - Implementation"
type: "implementation"
status: "pending"
dependencies: ["150"]
parallel_group: "agent-status"
rejection_count: 0
outputs:
  test: "src/__tests__/agent-status-bar.test.tsx"
  impl: "src/components/agent-status-bar.tsx"
---

## Objective

Update AgentStatusBar to show correct status-based colors with pulsing animation for ACTIVE agents.

## Acceptance Criteria

- [ ] ACTIVE status: green dot (#22c55e) with pulsing animation
- [ ] WATCHING status: amber dot (#f59e0b) without animation
- [ ] IDLE status: gray dot (#6b7280) without animation
- [ ] Animation uses Tailwind animate-pulse class
- [ ] Status text displays uppercase state name
- [ ] Agent badge retains agent-specific color

## Context

- File: `src/components/agent-status-bar.tsx`
- Update getDotColor function to use status-specific colors:

```tsx
const STATUS_DOT_COLORS: Record<AgentStatus, string> = {
  active: 'bg-green-500 animate-pulse',
  watching: 'bg-amber-500',
  idle: 'bg-gray-500'
};

function getDotColor(status: AgentStatus): string {
  return STATUS_DOT_COLORS[status];
}
```

- Current implementation uses agent colors for dots
- PRD clearly specifies status-based coloring for the dots
- The badge (circle with initial) can keep agent colors
