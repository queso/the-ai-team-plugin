---
id: '010'
title: Right-align agents with compact spacing
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-status-bar-layout.test.tsx
  impl: src/components/agent-status-bar.tsx
dependencies:
  - 009
parallel_group: agent-status-bar
---
## Objective

Change agent status bar layout to right-align agents with tighter 16-24px spacing between them.

## Acceptance Criteria

- [ ] Agents are right-aligned in the status bar
- [ ] Spacing between agent items is compact (16-24px gap)
- [ ] Layout uses flexbox with justify-end
- [ ] AGENTS label remains left-aligned while agents are right-aligned

## Context

Currently agents are evenly distributed with justify-around. PRD shows agents tightly grouped on the right. Change to flex with AGENTS label on left (flex-none), spacer (flex-1), and agents container on right with gap-4 to gap-6.
