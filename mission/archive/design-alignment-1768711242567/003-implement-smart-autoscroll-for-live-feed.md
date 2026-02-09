---
id: '003'
title: Implement smart auto-scroll for Live Feed panel
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/live-feed-panel.test.tsx
  impl: src/components/live-feed-panel.tsx
dependencies:
  - '002'
---
## Objective

Implement intelligent auto-scroll behavior that pins to bottom by default but pauses when user scrolls up to read history.

## Acceptance Criteria

- [ ] Live Feed is pinned to bottom by default, showing newest entries
- [ ] New log entries appear at bottom and view auto-scrolls to show them
- [ ] When user manually scrolls up to read history, auto-scroll pauses
- [ ] When user scrolls back to bottom (within 50px), auto-scroll resumes
- [ ] Scroll behavior is smooth (CSS scroll-behavior: smooth)

## Technical Notes

Current implementation just sets scrollTop to scrollHeight on every update. Need to track:
1. Whether user is at bottom (within threshold)
2. Only auto-scroll if user was already at bottom

```typescript
const isAtBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 50;
```

## Context

PRD specifies smart auto-scroll that doesn't interrupt users reading history. Current implementation always jumps to bottom which can be jarring.
