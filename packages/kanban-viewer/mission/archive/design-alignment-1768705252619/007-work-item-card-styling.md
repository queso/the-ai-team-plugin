---
id: '007'
title: Work Item Card styling
type: enhancement
status: pending
rejection_count: 0
dependencies:
  - '001'
---
## Objective

Implement consistent styling for work item cards including borders, padding, hover states, and correct badge colors.

## Acceptance Criteria

- [ ] Set card background to #2a2a2a with 1px #374151 border
- [ ] Set border-radius to 8px
- [ ] Set padding to 16px all sides
- [ ] Style item ID as top-left, #6b7280 (muted gray), 12px font
- [ ] Style title as 14px, #ffffff, font-weight 500
- [ ] Style type badges: 12px, 4px 8px padding, 4px border-radius
- [ ] Apply badge colors: implementation=#22c55e, test=#eab308(text #000000), interface=#8b5cf6, integration=#3b82f6, feature=#06b6d4
- [ ] Add agent assignment display on active cards: 12px, 20px avatar circle + 6px gap + name + 8px status dot
- [ ] Style rejection badge: AlertTriangle icon (14px) + count, #eab308 background, 4px 8px padding, 4px radius
- [ ] Add hover state: background lightens to #333333
- [ ] Set 8px gap between cards in column

## Context

Work Item Card specifications from PRD:
- Card styling: #2a2a2a background, #374151 border, 8px radius, 16px padding
- ID muted gray, title white
- Badge colors per type
- Hover state lightens background
- 8px card spacing

Note: Dependency icon is handled in separate item 008.
