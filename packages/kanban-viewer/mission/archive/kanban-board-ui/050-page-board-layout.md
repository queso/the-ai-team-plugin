---
id: "050"
title: "Main board page layout"
type: "feature"
status: "pending"
dependencies: ["001", "031", "032", "033", "034"]
parallel_group: "page-assembly"
rejection_count: 0
outputs:
  types: "src/app/page.tsx"
  test: "src/__tests__/page.test.tsx"
  impl: "src/app/page.tsx"
---

## Objective

Create the main board page that assembles all components into the complete kanban board layout with header, columns, right panel, and agent status bar.

## Acceptance Criteria

- [ ] Header bar at top with mission info
- [ ] 7 board columns in horizontal scrollable area
- [ ] Columns ordered: Briefings, Ready, Testing, Implementing, Review, Done, Blocked
- [ ] Live feed panel on right side
- [ ] Agent status bar fixed at bottom
- [ ] Responsive layout (desktop, tablet, mobile)
- [ ] Dark theme styling
- [ ] Proper grid/flex layout for all sections

## Context

Master layout from PRD:
```
+----------------------------------------------------------+------------+
| Header Bar (status, name, WIP, progress, timer)          |            |
+----------------------------------------------------------+  Live Feed |
| Briefings | Ready | Testing | Impl | Review | Done | Blocked | Panel  |
|           |       |         |      |        |      |         |        |
|  [cards]  |[cards]| [cards] |[cards]|[cards] |[cards]| [cards] |        |
|           |       |         |      |        |      |         |        |
+----------------------------------------------------------+------------+
| Agent Status Bar (Hannibal, Face, Murdock, B.A., Lynch)              |
+----------------------------------------------------------------------+
```

Layout structure:
1. Grid with main area and right sidebar
2. Header spans full width
3. Board columns in scrollable flex container
4. Right panel fixed width (400px)
5. Agent bar fixed at bottom

Responsive:
- Desktop: Full layout as shown
- Tablet: Collapsible right panel
- Mobile: Single column with stage tabs

## Design Reference

See `mission/design-reference.md` for full styling details.

**Key patterns from v0 reference:**
- Two-column split: kanban board (flex-1) + right panel (400px fixed)
- Column width: `min-w-[220px] w-[220px]` for each kanban column
- Background: `oklch(0.13 0.005 250)` (dark blue-black)
- Custom scrollbar styling for command-center aesthetic
- Geist Mono + Geist font stack
