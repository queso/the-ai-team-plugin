---
id: "142"
title: "Work Item Modal - Implementation"
type: "implementation"
status: "pending"
dependencies: ["141"]
parallel_group: "work-item-modal"
rejection_count: 0
outputs:
  test: "src/__tests__/work-item-modal.test.tsx"
  impl: "src/components/work-item-modal.tsx"
---

## Objective

Implement the WorkItemModal component that displays detailed work item information when a card is clicked.

## Acceptance Criteria

- [ ] Create WorkItemModal component using shadcn Dialog
- [ ] Header row: ID badge, type tag, status indicator, close button (X)
- [ ] Title bar: large title, agent with status dot (if assigned), rejection badge
- [ ] Objective section: work item description/content
- [ ] Acceptance criteria section: checklist from item content (parse markdown)
- [ ] Rejection history table (if rejections > 0): #, reason, agent columns
- [ ] Current status section: assigned agent name, role, progress text
- [ ] Close on X button click
- [ ] Close on outside click (overlay)
- [ ] Close on ESC key press
- [ ] Apply dark mode styling throughout

## Context

- File: `src/components/work-item-modal.tsx`
- Use existing `src/components/ui/dialog.tsx` components
- Parse work item content for checklist items (look for `- [ ]` patterns)
- Type tag should use same colors as WorkItemCard type badges

Modal layout:
```
+------------------------------------------+
| 025   [test]   Testing               [X] |
+------------------------------------------+
| Login Form Validation Tests              |
| [Agent dot] Murdock   [warning] 1        |
+------------------------------------------+
| Objective                                |
| Description text here...                 |
+------------------------------------------+
| Acceptance Criteria                      |
| [ ] Criterion 1                          |
| [ ] Criterion 2                          |
+------------------------------------------+
| Rejection History (if any)               |
| # | Reason              | Agent          |
| 1 | Missing tests...    | Lynch          |
+------------------------------------------+
| Current Status                           |
| Agent: Murdock (QA)                      |
| Progress: Working on feedback...         |
+------------------------------------------+
```
