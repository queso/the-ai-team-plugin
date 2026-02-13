---
id: "011"
title: "Dependency blocking checker"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "data-layer"
rejection_count: 0
outputs:
  types: "src/lib/dependency-utils.ts"
  test: "src/__tests__/dependency-utils.test.ts"
  impl: "src/lib/dependency-utils.ts"
---

## Objective

Create utility functions to check if a work item has unmet dependencies that block its progress.

## Acceptance Criteria

- [ ] getUnmetDependencies function returns array of dependency IDs not in done stage
- [ ] isBlocked function returns boolean if item has any unmet dependencies
- [ ] getBlockerCount function returns count of unmet dependencies
- [ ] Works with board phases data to check dependency status
- [ ] Handles circular dependency detection (optional but recommended)
- [ ] Handles missing dependency IDs gracefully

## Context

From PRD FR-3 (Dependency Blocking Indicator):
- Cards with unmet dependencies show chain icon with dependency count
- Hover tooltip reveals blocker details
- Blocked cards cannot progress until dependencies complete

A dependency is "met" when the dependency item ID appears in the `done` phase of board.json.

Example:
```json
{
  "phases": {
    "done": ["001", "002", "003"],
    "implementing": ["007"]
  }
}
```

If item 007 has dependencies: ["001", "004"], then:
- 001 is met (in done)
- 004 is unmet (not in done)
- getUnmetDependencies returns ["004"]
- getBlockerCount returns 1
