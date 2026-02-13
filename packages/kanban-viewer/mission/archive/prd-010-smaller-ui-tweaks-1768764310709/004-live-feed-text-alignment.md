---
id: '004'
title: Live Feed Text Alignment
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/live-feed-panel.test.tsx
  impl: src/components/live-feed-panel.tsx
dependencies: []
---
## Objective

Agent names have variable widths causing message text to start at different horizontal positions. For example, [Amy] is short while [Hannibal] is long. This creates a ragged, hard-to-scan log display. All three columns (timestamp, agent name, message) should have consistent alignment.

## Acceptance Criteria

- [ ] Agent name column has fixed width w-20 (80px) to accommodate longest name [Hannibal]
- [ ] All message text starts at the same horizontal position
- [ ] Layout remains readable and does not waste excessive space
- [ ] Wrapped message lines still indent properly

## Context

Implementation:
```tsx
<span className="shrink-0 w-20 font-semibold ...">[{entry.agent}]</span>
```

The agent name span currently only has `shrink-0` but no fixed width. Adding `w-20` (80px) should accommodate the longest agent name [Hannibal] plus brackets.
