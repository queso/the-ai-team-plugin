---
id: "033"
title: "LiveFeedPanel component"
type: "feature"
status: "pending"
dependencies: ["001", "006"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/live-feed-panel.tsx"
  test: "src/__tests__/live-feed-panel.test.tsx"
  impl: "src/components/live-feed-panel.tsx"
---

## Objective

Create a React component for the right-side panel displaying the live system log with tabs for Live Feed, Human Input, Git, and New Mission.

## Acceptance Criteria

- [ ] Tab bar with Live Feed, Human Input, Git, + New Mission tabs
- [ ] Human Input tab shows notification badge when items need attention
- [ ] System log displays scrolling list of activity entries
- [ ] Each entry shows timestamp, agent name (color-coded), and message
- [ ] Special highlighting for APPROVED (green), REJECTED (red), ALERT (yellow)
- [ ] Auto-scrolls to latest entries when new ones arrive
- [ ] Accepts entries array and activeTab props
- [ ] Tab change handler prop
- [ ] Monospace font for log entries

## Context

Live Feed panel design from PRD:
```
+-------------------------------+
| Live Feed | Human Input* | Git|
|           | + New Mission     |
+-------------------------------+
| >_ SYSTEM LOG                 |
|                               |
| 10:42:15 [B.A.] Implementing  |
|   JWT token refresh logic     |
| 10:41:40 [Lynch] APPROVED     |  <- Green highlight
|   006-database-schema         |
| 10:41:00 [Hannibal] ALERT:    |  <- Yellow highlight
|   Item 024 requires input     |
+-------------------------------+
```

Agent colors for log entries:
- Hannibal = Blue
- Face = Green
- Murdock = Yellow
- B.A. = Red/Orange
- Lynch = Purple

Only the Live Feed tab needs full implementation for MVP. Other tabs can be placeholders.

## Design Reference

See `mission/design-reference.md` for full styling details.

**Key patterns from v0 reference:**
- Tab bar with bottom border highlight on active tab
- Human Input tab: pulse animation when blocked items exist
- Fixed panel width: 400px on desktop
- Monospace font for log entries (terminal aesthetic)
- OKLch color palette: `oklch(0.22 0.005 250)` for panel background
