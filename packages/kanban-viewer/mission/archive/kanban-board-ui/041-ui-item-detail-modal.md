---
id: "041"
title: "ItemDetailModal component"
type: "feature"
status: "pending"
dependencies: ["001", "030"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/item-detail-modal.tsx"
  test: "src/__tests__/item-detail-modal.test.tsx"
  impl: "src/components/item-detail-modal.tsx"
---

## Objective

Create a modal dialog component for displaying full work item details when a card is clicked.

## Acceptance Criteria

- [ ] Modal overlay with backdrop blur
- [ ] Displays all work item metadata (ID, title, type, status, etc.)
- [ ] Renders full markdown content body
- [ ] Shows dependencies list
- [ ] Shows output file paths (test, impl, types)
- [ ] Close button and click-outside-to-close
- [ ] Keyboard accessible (Escape to close)
- [ ] Uses shadcn/ui Dialog component
- [ ] Accepts isOpen, onClose, and item props

## Context

Modal displays the full work item when clicking a card:
```
+------------------------------------------+
| X                                        |
| 007 - Auth Service Implementation        |
| [implementation]           * B.A.        |
|------------------------------------------|
| Status: implementing                     |
| Created: 2026-01-15T10:30:00Z            |
| Updated: 2026-01-15T14:20:00Z            |
|------------------------------------------|
| Dependencies: 001, 003                   |
|------------------------------------------|
| Outputs:                                 |
|   impl: src/services/auth.ts             |
|   test: src/__tests__/auth.test.ts       |
|------------------------------------------|
| # Implementation Notes                   |
|                                          |
| Full markdown content here...            |
+------------------------------------------+
```

Props:
```typescript
interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkItem | null;
}
```
