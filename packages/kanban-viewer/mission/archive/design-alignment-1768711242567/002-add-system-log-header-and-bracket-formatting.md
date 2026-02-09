---
id: '002'
title: Add SYSTEM LOG header and bracket agent name formatting
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/live-feed-panel.test.tsx
  impl: src/components/live-feed-panel.tsx
dependencies:
  - '010'
---
## Objective

Add a ">_ SYSTEM LOG" header to the Live Feed panel and wrap agent names in brackets for proper terminal styling.

## Acceptance Criteria

- [ ] Add ">_ SYSTEM LOG" header above log entries
- [ ] Header styled: 12px, #6b7280 color, JetBrains Mono font, uppercase, 8px bottom margin
- [ ] Agent names display as `[Agent]` instead of `Agent` (e.g., `[B.A.]` not `B.A.`)
- [ ] Timestamps use #6b7280 (muted gray) color
- [ ] Timestamps use JetBrains Mono, 12px font
- [ ] Agent names use Inter, 12px, font-weight 600
- [ ] Message text uses Inter, 12px, #d1d5db color
- [ ] Line spacing is 24px line-height (1.6 at 12px + 4px padding)

## Target Format

```
>_ SYSTEM LOG

10:42:15 [B.A.] Implementing JWT token refresh logic
10:42:12 [Face] Styling login form with design tokens
```

## Context

Current format shows agent names without brackets. PRD requires terminal-style formatting with brackets around agent names and a SYSTEM LOG header.
