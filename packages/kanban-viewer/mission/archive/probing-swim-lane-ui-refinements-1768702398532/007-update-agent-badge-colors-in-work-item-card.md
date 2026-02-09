---
id: '007'
title: Update agent badge colors in work-item-card
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-badge-colors.test.tsx
  impl: src/components/work-item-card.tsx
dependencies: []
parallel_group: work-item-card
---
## Objective

Update the agent name text color in work-item-card to use agent-specific colors from the PRD specification.

## Acceptance Criteria

- [ ] Agent names display in their designated colors: Hannibal #22c55e, Face #06b6d4, Murdock #f59e0b, B.A. #ef4444, Amy #8b5cf6, Lynch #3b82f6
- [ ] Status dot colors remain: active=yellow/green, idle=gray
- [ ] Person icon displays before agent name
- [ ] Badge positioned at bottom-left below type badge

## Context

The work-item-card already shows agent badges but uses muted-foreground for the name. Need to add AGENT_COLORS mapping and apply per-agent color to the name text. Add User icon from lucide-react before agent name.
