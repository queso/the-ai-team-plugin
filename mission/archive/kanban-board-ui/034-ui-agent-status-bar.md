---
id: "034"
title: "AgentStatusBar component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/agent-status-bar.tsx"
  test: "src/__tests__/agent-status-bar.test.tsx"
  impl: "src/components/agent-status-bar.tsx"
---

## Objective

Create a React component for the bottom status bar showing all 5 agents with their current status (WATCHING, ACTIVE, IDLE).

## Acceptance Criteria

- [ ] Displays all 5 agents: Hannibal, Face, Murdock, B.A., Lynch
- [ ] Each agent shows initial in circle badge
- [ ] Status indicator dot (colored=active/watching, gray=idle)
- [ ] Status text: WATCHING, ACTIVE, or IDLE
- [ ] Agent-specific colors for active state
- [ ] Accepts agents status object as prop
- [ ] Responsive layout for smaller screens
- [ ] Fixed position at bottom of viewport

## Context

Agent status bar design from PRD:
```
+------------------------------------------------------------------------------+
| AGENTS   (H) Hannibal   (F) Face      (M) Murdock   (B) B.A.    (L) Lynch   |
|          * WATCHING     o IDLE        * ACTIVE      * ACTIVE    o IDLE      |
+------------------------------------------------------------------------------+
```

Status states:
- WATCHING = Orchestrating/monitoring (Hannibal only, blue dot)
- ACTIVE = Currently working on a task (colored dot)
- IDLE = Available, no current task (gray dot)

Agent colors:
- Hannibal = Blue (#3b82f6)
- Face = Green (#22c55e)
- Murdock = Yellow (#eab308)
- B.A. = Red/Orange (#f97316)
- Lynch = Purple (#8b5cf6)

Data from board.json agents field:
```json
{
  "agents": {
    "Hannibal": {"status": "watching"},
    "Face": {"status": "idle"},
    "Murdock": {"status": "active", "current_item": "009"},
    "B.A.": {"status": "active", "current_item": "007"},
    "Lynch": {"status": "idle"}
  }
}
```

## Design Reference

See `mission/design-reference.md` for full styling details.

**Key patterns from v0 reference:**
- Colored avatar badges matching agent identity
- Animated pulse indicator for ACTIVE status
- Static indicator for IDLE/error states
- OKLch color palette for dark theme
