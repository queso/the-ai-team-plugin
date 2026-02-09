---
id: '011'
title: Update type badge feature color to cyan
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies:
  - '007'
---
## Objective

Ensure the feature type badge uses the correct cyan color (#06b6d4) as specified in the PRD.

## Acceptance Criteria

- [ ] Feature badge background is #06b6d4 (cyan-500)
- [ ] Feature badge text is #ffffff
- [ ] Verify all type badge colors match PRD:
  - feature: #06b6d4 (cyan), text #ffffff
  - bug: #ef4444 (red-500), text #ffffff
  - enhancement: #3b82f6 (blue-500), text #ffffff
  - task: #22c55e (green-500), text #ffffff
- [ ] Badge sizing: 12px font, 4px 8px padding, 4px border-radius

## Context

Current TYPE_COLORS has feature, bug, enhancement, and task. The key change is ensuring feature uses #06b6d4 (cyan) as specified in the PRD.
