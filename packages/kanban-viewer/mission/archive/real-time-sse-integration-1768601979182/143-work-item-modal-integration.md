---
id: "143"
title: "Work Item Modal - Board Integration"
type: "integration"
status: "pending"
dependencies: ["142"]
parallel_group: "work-item-modal"
rejection_count: 0
outputs:
  test: "src/__tests__/modal-integration.test.tsx"
  impl: "src/app/page.tsx"
---

## Objective

Integrate WorkItemModal with the board view so clicking any card opens the modal with that item's details.

## Acceptance Criteria

- [ ] Clicking any WorkItemCard opens the modal
- [ ] Modal receives correct work item data
- [ ] Modal state managed at board/page level
- [ ] Closing modal returns focus to board
- [ ] Multiple rapid clicks don't cause issues
- [ ] Modal updates if underlying item data changes while open
- [ ] Works correctly across all column types

## Context

- The board view (likely in `src/app/page.tsx` or similar) needs state:
  - `selectedItem: WorkItem | null`
  - `isModalOpen: boolean`
- Pass onClick handler through BoardColumn to WorkItemCard
- WorkItemCard already has onClick prop support

Integration pattern:
```tsx
const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

<BoardColumn
  onItemClick={(item) => setSelectedItem(item)}
/>

<WorkItemModal
  item={selectedItem}
  isOpen={selectedItem !== null}
  onClose={() => setSelectedItem(null)}
/>
```
