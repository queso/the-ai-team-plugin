---
id: "038"
title: "AgentBadge component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/agent-badge.tsx"
  test: "src/__tests__/agent-badge.test.tsx"
  impl: "src/components/agent-badge.tsx"
---

## Objective

Create a React component for displaying the assigned agent with their colored dot indicator and name.

## Acceptance Criteria

- [ ] Colored dot matching agent's color
- [ ] Agent name displayed next to dot
- [ ] Only renders when agent is assigned
- [ ] Correct colors for each agent
- [ ] Accepts agent name prop
- [ ] Small, subtle styling

## Context

Agent badge design from PRD:
```
| * B.A.                  |  <- Colored dot + agent name
```

This badge shows which agent is currently working on the item. Only displayed for items in active stages (testing, implementing, review).

Agent colors:
- Hannibal = Blue (#3b82f6)
- Face = Green (#22c55e)
- Murdock = Yellow (#eab308)
- B.A. = Red/Orange (#f97316)
- Lynch = Purple (#8b5cf6)

Props:
```typescript
interface AgentBadgeProps {
  agent: string;  // Agent name: Hannibal, Face, Murdock, B.A., Lynch
}
```

Returns null if agent is undefined/empty.
