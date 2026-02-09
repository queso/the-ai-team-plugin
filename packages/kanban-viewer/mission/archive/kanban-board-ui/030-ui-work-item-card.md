---
id: "030"
title: "WorkItemCard component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/work-item-card.tsx"
  test: "src/__tests__/work-item-card.test.tsx"
  impl: "src/components/work-item-card.tsx"
---

## Objective

Create a React component to display a single work item as a card with ID, title, type badge, agent assignment, dependency blocker, and rejection warning.

## Acceptance Criteria

- [ ] Displays item ID in top-left (subtle gray, three-digit format)
- [ ] Displays title prominently (supports multi-line)
- [ ] Shows type badge with correct color (implementation=teal, interface=blue, integration=purple, test=green)
- [ ] Shows assigned agent with colored dot when in active stage
- [ ] Shows dependency blocker icon and count when dependencies unmet
- [ ] Shows rejection warning badge with count when rejection_count > 0
- [ ] Hover state with subtle highlight
- [ ] Click handler prop for opening detail modal
- [ ] Uses shadcn/ui Card component as base

## Context

Card design from PRD:
```
+-------------------------+
| 013              (!) 2  |  <- ID (left), rejection warning (right)
| Payment Processing      |  <- Title
| Module                  |
| [implementation]        |  <- Type badge (colored pill)
|                  @ 1    |  <- Dependency chain icon + count
| * B.A.                  |  <- Agent dot + name
+-------------------------+
```

Type badge colors:
- implementation = Teal/Cyan (#06b6d4)
- interface = Blue (#3b82f6)
- integration = Purple (#8b5cf6)
- test = Green (#22c55e)

Agent colors:
- Hannibal = Blue
- Face = Green
- Murdock = Yellow
- B.A. = Red/Orange
- Lynch = Purple

## Design Reference

See `mission/design-reference.md` for full styling details.

**Key patterns from v0 reference:**
- Rejection badge: amber at 1-2 rejections, warning color at 3+
- Dependency indicator with hover tooltip showing blocker ID
- Agent assignment with animated pulse when active
- Conditional rendering: `const hasRejections = (item.rejectionCount ?? 0) > 0`
- OKLch color palette for dark theme aesthetic
