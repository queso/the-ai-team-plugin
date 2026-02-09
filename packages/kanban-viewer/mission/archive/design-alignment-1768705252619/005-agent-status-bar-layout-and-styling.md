---
id: '005'
title: Agent Status Bar layout and styling
type: enhancement
status: pending
rejection_count: 0
dependencies:
  - '001'
---
## Objective

Implement the correct layout and styling for the Agent Status Bar including right-alignment, proper spacing, avatar sizing, status dots with animations, and correct color scheme.

## Acceptance Criteria

- [ ] Right-align agent groups with 80px spacing between each
- [ ] Display "AGENTS" label left-aligned with 12px font, #6b7280 color, 16px left padding
- [ ] Set avatar circles to 32px diameter with 14px centered letter
- [ ] Apply correct avatar background colors: Hannibal=#22c55e, Face=#06b6d4, Murdock=#f59e0b(text #000000), B.A.=#ef4444, Amy=#8b5cf6, Lynch=#3b82f6
- [ ] Position status dot 8px diameter, 4px below agent name, horizontally centered
- [ ] Add status text 10px, #a0a0a0, centered below dot
- [ ] Implement status dot colors: ACTIVE=#22c55e with pulse animation, WATCHING=#f59e0b, IDLE=#6b7280
- [ ] Add pulse animation for ACTIVE status (opacity 0.5-1.0, 2s ease-in-out infinite)
- [ ] Set bar height to 64px total
- [ ] Set bar background to #1a1a1a with 1px #374151 top border

## Context

Agent Status Bar from PRD:
- Agents right-aligned with 80px gaps
- AGENTS label visible on left
- Three status states: ACTIVE (green pulse), WATCHING (amber), IDLE (gray)
- Avatar colors per agent
- 64px bar height with top border

This is a HIGH priority fix per PRD.
