---
id: '012'
title: Set consistent minimum height for work item cards
type: enhancement
status: pending
rejection_count: 0
dependencies: []
---
## Objective

Work item cards have inconsistent heights based on content, creating a visually uneven board. Set a minimum height so cards have consistent vertical sizing.

## Acceptance Criteria

- [ ] All work item cards have a minimum height of min-h-[100px]
- [ ] Cards with more content can still expand beyond minimum
- [ ] Minimum height accommodates typical card content (title, type badge, icons)
- [ ] Board columns appear more uniform and organized


## Context

File: `/src/components/work-item-card.tsx`

Use Tailwind `min-h-*` class (e.g., `min-h-24`, `min-h-28`) to set minimum height. Choose value that fits typical card content without excessive whitespace.


Use Tailwind `min-h-[100px]` class to set minimum height of 100px.
