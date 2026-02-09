---
id: "001"
title: "Core TypeScript types and interfaces"
type: "feature"
status: "pending"
dependencies: []
parallel_group: "types"
rejection_count: 0
outputs:
  types: "src/types/index.ts"
  test: "src/__tests__/types.test.ts"
  impl: "src/types/index.ts"
---

## Objective

Define all core TypeScript interfaces for the kanban board application including WorkItem, BoardMetadata, BoardEvent, and related types.

## Acceptance Criteria

- [ ] WorkItem interface with all fields (id, title, type, status, assigned_agent, rejection_count, dependencies, outputs, created_at, updated_at, stage, content)
- [ ] BoardMetadata interface with mission, wip_limits, phases, assignments, agents, stats, last_updated
- [ ] BoardEvent interface for SSE events (item-added, item-moved, item-updated, item-deleted, board-updated)
- [ ] Agent type and status definitions (Hannibal, Face, Murdock, B.A., Lynch)
- [ ] Stage type as union of valid stage names
- [ ] WorkItemType union (implementation, interface, integration, test)
- [ ] All types exported from src/types/index.ts
- [ ] Strict TypeScript mode compatible

## Context

These types form the foundation for the entire application. They must match the data structures defined in the PRD:

```typescript
// WorkItem frontmatter fields
interface WorkItem {
  id: string;
  title: string;
  type: 'feature' | 'bug' | 'enhancement' | 'task';
  status: string;
  assigned_agent?: string;
  rejection_count: number;
  dependencies: string[];
  outputs: {
    test?: string;
    impl?: string;
    types?: string;
  };
  created_at: string;
  updated_at: string;
  stage: string;
  content: string;
}
```

The BoardMetadata matches the board.json structure from the PRD.
