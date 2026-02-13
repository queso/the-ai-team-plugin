---
id: "140"
title: "Work Item Modal - Interface Types"
type: "interface"
status: "pending"
dependencies: []
parallel_group: "work-item-modal"
rejection_count: 0
outputs:
  types: "src/types/index.ts"
  test: "src/__tests__/modal-types.test.ts"
  impl: "src/types/index.ts"
---

## Objective

Define TypeScript interfaces for the WorkItemModal component props and related data structures.

## Acceptance Criteria

- [ ] Define WorkItemModalProps interface with:
  - item: WorkItem (the work item to display)
  - isOpen: boolean (modal visibility state)
  - onClose: () => void (close handler)
- [ ] Define RejectionHistoryEntry interface:
  - number: number (rejection sequence)
  - reason: string (rejection reason text)
  - agent: AgentName (reviewing agent who rejected)
- [ ] Extend WorkItem type if needed to include rejection_history array
- [ ] Types exported from @/types

## Context

- File: `src/types/index.ts` (extend existing)
- The modal needs to show rejection history which may not be in current WorkItem type
- Consider if rejection_history should be optional (backward compat)

```typescript
interface RejectionHistoryEntry {
  number: number;
  reason: string;
  agent: AgentName;
}

interface WorkItemModalProps {
  item: WorkItem;
  isOpen: boolean;
  onClose: () => void;
}
```
