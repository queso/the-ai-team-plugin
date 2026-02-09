---
id: '010'
title: Apply tonal styling to work item type badges
type: enhancement
status: pending
rejection_count: 0
dependencies: []
---
## Objective

Type badges on work item cards need tonal styling - muted background color, colored text, and subtle border - instead of solid/bold colors. This creates a more refined, less visually heavy appearance.

## Acceptance Criteria

- [ ] Type badges have muted/tonal background (e.g., bg-blue-100 instead of bg-blue-500)
- [ ] Badge text uses darker shade of the same color (e.g., text-blue-700)
- [ ] Badges have subtle border in matching color (e.g., border-blue-200)
- [ ] Each type (feature, bug, enhancement, task) has distinct tonal palette
- [ ] Badges remain readable and distinguishable

## Context

File: `/src/components/work-item-card.tsx`

Tonal color pattern example:
- Feature: bg-blue-50/100, text-blue-700, border-blue-200
- Bug: bg-red-50/100, text-red-700, border-red-200
- Enhancement: bg-purple-50/100, text-purple-700, border-purple-200
- Task: bg-gray-50/100, text-gray-700, border-gray-200


Location: Lines 114-120 inline styling in `/src/components/work-item-card.tsx`.

Note: A TypeBadge component exists but is NOT currently used. Apply tonal styling inline.

Tonal color pattern example:
- Feature: bg-blue-50/100, text-blue-700, border-blue-200
- Bug: bg-red-50/100, text-red-700, border-red-200
- Enhancement: bg-purple-50/100, text-purple-700, border-purple-200
- Task: bg-gray-50/100, text-gray-700, border-gray-200
