---
id: '005'
title: Fix Live Feed agent name alignment
type: bug
status: pending
rejection_count: 0
dependencies: []
---
## Objective

Agent names in the Live Feed have variable widths, causing message text to start at different horizontal positions. This creates a ragged, hard-to-read layout. Agent names need a fixed width column.

## Acceptance Criteria

- [ ] Agent name column has fixed width of w-16 (64px)
- [ ] All message text starts at the same horizontal position
- [ ] Agent names are properly truncated if too long
- [ ] Layout remains responsive and doesn't break on small screens


## Context

File: `/src/components/live-feed-panel.tsx`

Apply fixed width class to agent name element. Tailwind classes like `w-20`, `min-w-20`, or `flex-shrink-0` can help. Ensure text truncation with `truncate` class if needed.


Apply `w-16` (64px) fixed width class to agent name element. Use `flex-shrink-0` to prevent shrinking. Ensure text truncation with `truncate` class if needed.
