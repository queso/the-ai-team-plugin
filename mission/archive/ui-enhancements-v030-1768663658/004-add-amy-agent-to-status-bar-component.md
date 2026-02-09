---
id: '004'
title: Add Amy agent to status bar component
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-status-bar.test.tsx
  impl: src/components/agent-status-bar.tsx
dependencies:
  - '003'
parallel_group: agent-bar
---
## Objective

Update the AgentStatusBar component to display Amy as the sixth agent, positioned between B.A. and Lynch, with purple/violet color scheme.

## Acceptance Criteria

- [ ] Amy appears in agent status bar with avatar initial A
- [ ] Amy has distinct purple/violet color (bg-violet-500 or bg-purple-500)
- [ ] Amy is positioned after B.A. and before Lynch in the display order
- [ ] Amy status displays correctly (ACTIVE, WATCHING, IDLE)
- [ ] Status bar layout accommodates 6 agents without breaking
- [ ] Tests verify Amy rendering, color, and status display

## Context

Update AGENT_NAMES array to include Amy in correct position. Add Amy to AGENT_INITIALS (A) and AGENT_COLORS (bg-violet-500). The existing pattern in agent-status-bar.tsx shows how agents are configured. Layout order should be: Hannibal, Face, Murdock, B.A., Amy, Lynch.
