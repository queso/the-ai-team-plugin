---
id: '011'
title: Update agent status bar colors to match PRD
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-colors-consistency.test.tsx
  impl: src/components/agent-status-bar.tsx
dependencies: []
parallel_group: agent-status-bar
---
## Objective

Update AGENT_COLORS in agent-status-bar.tsx to match the PRD color specification.

## Acceptance Criteria

- [ ] Hannibal uses #22c55e (green-500)
- [ ] Face uses #06b6d4 (cyan-500)
- [ ] Murdock uses #f59e0b (amber-500)
- [ ] B.A. uses #ef4444 (red-500)
- [ ] Amy uses #8b5cf6 (violet-500)
- [ ] Lynch uses #3b82f6 (blue-500)
- [ ] live-feed-panel.tsx agentColors matches these same values


## Context

The current AGENT_COLORS in agent-status-bar.tsx uses different mappings (Hannibal=blue, Face=green). PRD specifies new colors. Also update the matching colors in live-feed-panel.tsx agentColors for consistency.


Update AGENT_COLORS in agent-status-bar.tsx and agentColors in live-feed-panel.tsx to match PRD specification. Both files need consistent colors.
