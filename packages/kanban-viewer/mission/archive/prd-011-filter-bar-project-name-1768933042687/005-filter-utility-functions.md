---
id: '005'
title: Filter utility functions
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/filter-utils.test.ts
  impl: src/lib/filter-utils.ts
dependencies:
  - '004'
parallel_group: filter
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T19:47:51.590Z'
    status: success
    summary: >-
      Created 32 test cases for filter utility functions covering matchesType,
      matchesAgent, matchesStatus, matchesSearch, and filterWorkItems with AND
      logic
    files_created:
      - src/__tests__/filter-utils.test.ts
  - agent: B.A.
    timestamp: '2026-01-18T20:28:05.841Z'
    status: success
    summary: >-
      Implemented 5 filter utility functions: matchesType, matchesAgent,
      matchesStatus, matchesSearch, filterWorkItems. All 46 tests passing.
    files_created:
      - src/lib/filter-utils.ts
  - agent: Lynch
    timestamp: '2026-01-18T20:31:34.043Z'
    status: success
    summary: >-
      APPROVED - Tests pass (46 tests), all 5 filter functions correctly
      implemented with AND logic. Status filter matches PRD spec.
  - agent: Amy
    timestamp: '2026-01-18T20:46:53.365Z'
    status: success
    summary: >-
      VERIFIED - All 5 filter functions work correctly. Edge cases for
      undefined/null handled by parser validation. 46 tests pass.
---
## Objective

Implement pure filter functions that take a WorkItem and filter criteria, returning boolean for whether the item matches.

## Acceptance Criteria

- [ ] matchesType(item, filter) correctly filters by item type
- [ ] matchesAgent(item, filter) filters by assigned_agent including Unassigned
- [ ] matchesStatus(item, filter) filters by stage and rejection count per PRD spec
- [ ] matchesSearch(item, query) does case-insensitive title search
- [ ] filterWorkItems(items, filters) combines all filters with AND logic

## Context

Status filter logic from PRD: Active = cards in TESTING, IMPLEMENTING, REVIEW. Blocked = cards in BLOCKED column. Has Rejections = rejectionCount > 0. Has Dependencies = dependencies.length > 0. Completed = cards in DONE column. Functions go in src/lib/filter-utils.ts.


Status filter logic from PRD: Active = cards in TESTING, IMPLEMENTING, REVIEW. Blocked = cards in BLOCKED column. Has Rejections = rejectionCount > 0. Has Dependencies = dependencies.length > 0. Completed = cards in DONE column. IMPORTANT: matchesAgent must use proper AgentName casing: 'Hannibal', 'Face', 'Murdock', 'B.A.', 'Amy', 'Lynch' - not lowercase. WorkItem.assigned_agent uses AgentName type. Functions go in src/lib/filter-utils.ts.

## Work Log
Amy - VERIFIED - All 5 filter functions work correctly. Edge cases for undefined/null handled by parser validation. 46 tests pass.
Lynch - APPROVED - Tests pass (46 tests), all 5 filter functions correctly implemented with AND logic. Status filter matches PRD spec.
B.A. - Implemented 5 filter utility functions: matchesType, matchesAgent, matchesStatus, matchesSearch, filterWorkItems. All 46 tests passing.
Murdock - Created 32 test cases for filter utility functions covering matchesType, matchesAgent, matchesStatus, matchesSearch, and filterWorkItems with AND logic
