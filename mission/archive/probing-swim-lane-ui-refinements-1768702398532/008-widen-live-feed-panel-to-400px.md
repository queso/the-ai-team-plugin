---
id: 008
title: Widen Live Feed panel to 400px
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/live-feed-panel-width.test.tsx
  impl: src/app/page.tsx
dependencies: []
parallel_group: live-feed
---
## Objective

Increase Live Feed panel container width from current value to 400px with min/max constraints in page.tsx and responsive-board.tsx.

## Acceptance Criteria

- [ ] Live Feed panel width is 400px
- [ ] Minimum width constraint of 350px applied
- [ ] Maximum width constraint of 500px applied
- [ ] Panel width consistent in page.tsx and responsive-board.tsx

## Context

The Live Feed panel is currently ~300px wide. PRD specifies target 400px with min 350px and max 500px. Update the w-[400px] classes in both page.tsx and responsive-board.tsx side panel containers.


The Live Feed panel width is controlled by its container in page.tsx (line 319) and responsive-board.tsx (line 146). Change w-[300px] or similar to w-[400px] with min-w-[350px] max-w-[500px]. The live-feed-panel.tsx component has no width styling.
