---
id: "032"
title: "HeaderBar component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/header-bar.tsx"
  test: "src/__tests__/header-bar.test.tsx"
  impl: "src/components/header-bar.tsx"
---

## Objective

Create a React component for the top header bar displaying mission status, name, WIP indicator, progress bar, and mission timer.

## Acceptance Criteria

- [ ] Status indicator dot (green=active, yellow=paused, red=blocked)
- [ ] Mission name displayed prominently
- [ ] WIP indicator shows current/max (e.g., "4/5")
- [ ] Progress bar visualizes done/total items with percentage
- [ ] Mission timer shows elapsed time in HH:MM:SS format
- [ ] Timer updates every second when mission is active
- [ ] Responsive layout that collapses gracefully on smaller screens
- [ ] Uses Lucide icons for visual elements

## Context

Header bar design from PRD:
```
+-------------------------------------------------------------------------------------+
| * MISSION ACTIVE   Project Nightfall Auth System   WIP: 4/5   [====--] 12/26   00:23:51 |
+-------------------------------------------------------------------------------------+
```

Components:
1. Status indicator: colored dot with "MISSION ACTIVE/PAUSED/BLOCKED" text
2. Mission name: from board.json mission.name
3. WIP indicator: sum of items in testing+implementing+review vs max WIP
4. Progress bar: done items / total items
5. Timer: elapsed since mission.started_at

Timer calculation:
```typescript
const elapsed = Date.now() - new Date(mission.started_at).getTime();
// Format as HH:MM:SS
```

## Design Reference

See `mission/design-reference.md` for full styling details.

**Key patterns from v0 reference:**
- Use `useEffect` with `setInterval(1000)` for live timer
- WIP counter should show warning color when at/over limit
- Progress bar with smooth CSS transition on width changes
- OKLch color palette for dark theme aesthetic
- Monospace font (Geist Mono) for numeric displays
