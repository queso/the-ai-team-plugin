---
id: 009
title: Add AGENTS label to status bar
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-status-bar-label.test.tsx
  impl: src/components/agent-status-bar.tsx
dependencies: []
parallel_group: agent-status-bar
---
## Objective

Add a left-aligned muted AGENTS label to the agent status bar.

## Acceptance Criteria

- [ ] AGENTS label displays on the left side of the status bar
- [ ] Label styled with muted color and small caps or uppercase text
- [ ] Label does not affect agent positioning

## Context

The PRD shows an AGENTS label on the left side of the status bar. Currently the bar has no label. Add a span with text AGENTS styled with text-muted-foreground and uppercase tracking.
