---
id: '005'
title: Update Agent Status Bar layout and spacing
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-status-bar.test.tsx
  impl: src/components/agent-status-bar.tsx
dependencies: []
---
## Objective

Refine the Agent Status Bar to match PRD specifications for layout, spacing, and positioning.

## Acceptance Criteria

- [ ] AGENTS label: 12px, #6b7280, left-aligned with 16px left padding, fully visible
- [ ] Agents right-aligned with 80px gap between each agent group
- [ ] Avatar circles are 32px diameter with 14px font, centered letter
- [ ] Status dot is 8px diameter, positioned 4px below agent name, horizontally centered
- [ ] Status text is 10px, #a0a0a0, centered below dot
- [ ] Bar height is 64px total
- [ ] Bar background is #1a1a1a with 1px #374151 top border

## Target Layout

```
AGENTS                          [H]        [F]       [M]       [B]       [A]       [L]
                             Hannibal    Face    Murdock    B.A.      Amy      Lynch
                             @WATCHING   @IDLE   @ACTIVE   @ACTIVE   @IDLE    @IDLE
```

## Context

Current implementation has agents with gap-6 (24px). PRD specifies 80px gaps. Status dots are inline with text but should be below. Layout needs restructuring.
