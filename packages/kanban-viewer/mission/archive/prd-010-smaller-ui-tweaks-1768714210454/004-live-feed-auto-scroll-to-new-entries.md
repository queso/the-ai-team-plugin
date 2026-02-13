---
id: '004'
title: Fix Live Feed auto-scroll (bug fix)
type: bug
status: pending
rejection_count: 0
dependencies: []
---
## Objective

The Live Feed panel does not auto-scroll to show new entries as they arrive. Auto-scroll logic exists but isn't working. Debug ScrollArea container nesting issue.

It should be pinned to the bottom by default, showing the latest entries, with smart scroll behavior that respects user interaction.

## Acceptance Criteria

- [ ] Live Feed auto-scrolls to bottom when new entries arrive
- [ ] Feed is pinned to bottom by default on initial load
- [ ] Auto-scroll pauses when user manually scrolls up
- [ ] Auto-scroll resumes when user scrolls back to bottom
- [ ] Scroll behavior is smooth, not jarring

## Context

File: `/src/components/live-feed-panel.tsx`

Implementation approach:
1. Track scroll position with useRef
2. Detect if user is at bottom (within threshold, e.g., 50px)
3. Use useEffect to scroll to bottom when new entries arrive AND user is at bottom
4. Consider `scrollIntoView({ behavior: 'smooth' })` or `scrollTop` manipulation
