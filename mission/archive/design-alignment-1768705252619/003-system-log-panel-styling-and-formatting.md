---
id: '003'
title: System Log Panel styling and formatting
type: enhancement
status: pending
rejection_count: 0
dependencies:
  - '001'
---
## Objective

Implement the complete visual styling for the System Log (Live Feed) panel including header, agent name formatting, colors, and panel dimensions as specified in the PRD.

## Acceptance Criteria

- [ ] Add ">_ SYSTEM LOG" header with terminal prompt styling (12px, #6b7280, JetBrains Mono, uppercase, 8px bottom margin)
- [ ] Format agent names with brackets: [Face] instead of Face
- [ ] Apply agent-specific colors to agent names: Hannibal=#22c55e, Face=#06b6d4, Murdock=#f59e0b, B.A.=#ef4444, Amy=#8b5cf6, Lynch=#3b82f6
- [ ] Set timestamp color to #6b7280 (muted gray) with JetBrains Mono 12px font
- [ ] Set agent name to Inter 12px font-weight 600
- [ ] Set message text to Inter 12px #d1d5db
- [ ] Set line spacing to 24px line-height
- [ ] Implement wrap behavior with 8px indent for continuation lines
- [ ] Set panel width to 400px fixed
- [ ] Set panel background to #1a1a1a
- [ ] Add 1px #374151 left border to panel

## Context

System Log Panel specifications from PRD:
- Header: ">_ SYSTEM LOG" with terminal prompt styling
- Agent name format: [Agent] message (with brackets)
- Agent colors match avatar colors
- Timestamps should be dimmed
- Panel has fixed 400px width with left border

This is a HIGH priority fix per PRD.
