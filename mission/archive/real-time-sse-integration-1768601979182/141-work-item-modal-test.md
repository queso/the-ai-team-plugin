---
id: "141"
title: "Work Item Modal - Tests"
type: "test"
status: "pending"
dependencies: ["140"]
parallel_group: "work-item-modal"
rejection_count: 0
outputs:
  test: "src/__tests__/work-item-modal.test.tsx"
  impl: "src/components/work-item-modal.tsx"
---

## Objective

Create comprehensive tests for the WorkItemModal component covering all sections and interactions.

## Acceptance Criteria

- [ ] Test modal renders when isOpen is true
- [ ] Test modal does not render when isOpen is false
- [ ] Test header shows: work item ID, type tag, current status, close button
- [ ] Test title bar shows: title, assigned agent with status dot, rejection count badge
- [ ] Test objective section displays item content/description
- [ ] Test acceptance criteria section renders checklist items
- [ ] Test rejection history table appears when rejections > 0
- [ ] Test rejection history table shows number, reason, agent columns
- [ ] Test current status section shows agent and progress
- [ ] Test close button (X) triggers onClose
- [ ] Test clicking outside modal triggers onClose
- [ ] Test ESC key triggers onClose
- [ ] Test modal does not block - can receive updates while open

## Context

- File: `src/__tests__/work-item-modal.test.tsx`
- Use @testing-library/react with fireEvent for interactions
- Test userEvent for keyboard interactions (ESC)
- The existing dialog.tsx component can be used as base
- Mock WorkItem data with various states (with/without rejections, assigned/unassigned)
