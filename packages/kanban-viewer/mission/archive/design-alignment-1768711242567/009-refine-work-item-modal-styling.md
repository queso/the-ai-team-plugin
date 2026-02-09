---
id: '009'
title: Refine work item modal styling to match PRD
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/item-detail-modal.test.tsx
  impl: src/components/item-detail-modal.tsx
dependencies:
  - '010'
---
## Objective

Update the work item detail modal styling to match PRD specifications for container, sections, and typography.

## Acceptance Criteria

### Modal Container
- [ ] Background: #1f2937
- [ ] Border: 1px solid #374151
- [ ] Border-radius: 12px
- [ ] Width: 500px max, centered horizontally
- [ ] Padding: 24px
- [ ] Box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)

### Header
- [ ] Item ID: 14px JetBrains Mono, #6b7280, top-left
- [ ] Title: 20px, #ffffff, Inter font-weight 600, 8px top margin
- [ ] Close button: X icon 20px, #6b7280, hover: #ffffff

### Sections
- [ ] Section headers: 14px, #ffffff, font-weight 600, 16px top margin
- [ ] Body text: 14px, #d1d5db, line-height 1.5

### Outputs Section
- [ ] Header: "Outputs", 12px, #6b7280, uppercase
- [ ] File paths: JetBrains Mono, 12px, #a0a0a0
- [ ] Use FileCode icon for impl, TestTube2 for test (14px, #6b7280)

## Context

Current modal uses theme classes. PRD requires specific hex colors and precise spacing for a polished appearance.
