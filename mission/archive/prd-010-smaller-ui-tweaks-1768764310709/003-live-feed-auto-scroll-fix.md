---
id: '003'
title: Live Feed Auto-Scroll Fix
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/live-feed-panel.test.tsx
  impl: src/components/live-feed-panel.tsx
dependencies: []
---
## Objective

The Live Feed panel does not auto-scroll to show new entries as they arrive, despite the smart auto-scroll feature being implemented. The scroll should be pinned to bottom by default, pause when user scrolls up, and resume when scrolling back to bottom.

## Acceptance Criteria

- [ ] New entries appear and view scrolls to show them when user is at bottom
- [ ] Scrolling up pauses auto-scroll
- [ ] Scrolling back to bottom (within 50px) resumes auto-scroll
- [ ] Smooth scroll animation works

## Context

Root cause confirmed: The scrollRef (line 107-108) is attached to an inner div, but Radix UI's
ScrollArea component uses its own Viewport element for scrolling (see scroll-area.tsx lines 19-24).

Solution approaches:
1. Replace ScrollArea with a simple div that has overflow-y-auto and attach scrollRef to it
2. Use Radix ScrollArea's ref forwarding to access the Viewport element

Option 1 is simpler and recommended since we don't need ScrollArea's custom scrollbar styling.
