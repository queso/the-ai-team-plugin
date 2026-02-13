---
id: '004'
title: Filter state types and hook
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/filter-state-types.test.ts
  impl: src/hooks/use-filter-state.ts
  types: src/types/index.ts
dependencies: []
parallel_group: filter
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T19:40:28.612Z'
    status: success
    summary: >-
      Created 23 test cases covering TypeFilter, AgentFilter, StatusFilter,
      FilterState types and useFilterState hook (default values, setters,
      resetFilters, stable references)
    files_created:
      - src/__tests__/filter-state-types.test.ts
  - agent: B.A.
    timestamp: '2026-01-18T19:42:21.336Z'
    status: success
    summary: >-
      Implemented filter state types (TypeFilter, AgentFilter, StatusFilter,
      FilterState) and useFilterState hook with setter functions and
      resetFilters. All 31 tests passing.
    files_created:
      - src/hooks/use-filter-state.ts
    files_modified:
      - src/types/index.ts
  - agent: Lynch
    timestamp: '2026-01-18T19:45:01.335Z'
    status: success
    summary: >-
      APPROVED - All 31 tests pass. TypeFilter/AgentFilter/StatusFilter types
      match PRD exactly. AgentFilter smartly uses AgentName union.
      useFilterState hook has stable callbacks, proper state management, and
      reset function. Type safety verified with ts-expect-error tests.
---
## Objective

Create TypeScript types for filter state and a useFilterState hook that manages filter values with proper typing.

## Acceptance Criteria

- [ ] FilterState type with typeFilter, agentFilter, statusFilter, searchQuery fields
- [ ] TypeFilter, AgentFilter, StatusFilter union types matching PRD options
- [ ] useFilterState hook returns state and setter functions
- [ ] Hook supports reset function to clear all filters

## Context

Filter options from PRD: Type (All Types, implementation, test, interface, integration, feature, bug, enhancement), Agent (All Agents, Hannibal, Face, Murdock, B.A., Amy, Lynch, Unassigned), Status (All Status, Active, Blocked, Has Rejections, Has Dependencies, Completed). Types go in src/types/index.ts, hook in src/hooks/use-filter-state.ts.


Filter options from PRD: Type (All Types, implementation, test, interface, integration, feature, bug, enhancement), Agent (All Agents, Hannibal, Face, Murdock, B.A., Amy, Lynch, Unassigned), Status (All Status, Active, Blocked, Has Rejections, Has Dependencies, Completed). IMPORTANT: Agent filter values must match the existing AgentName type exactly: 'Hannibal', 'Face', 'Murdock', 'B.A.', 'Amy', 'Lynch'. WorkItem uses assigned_agent?: AgentName with these proper casing values. Types go in src/types/index.ts, hook in src/hooks/use-filter-state.ts.

## Work Log
Lynch - APPROVED - All 31 tests pass. TypeFilter/AgentFilter/StatusFilter types match PRD exactly. AgentFilter smartly uses AgentName union. useFilterState hook has stable callbacks, proper state management, and reset function. Type safety verified with ts-expect-error tests.
B.A. - Implemented filter state types (TypeFilter, AgentFilter, StatusFilter, FilterState) and useFilterState hook with setter functions and resetFilters. All 31 tests passing.
Murdock - Created 23 test cases covering TypeFilter, AgentFilter, StatusFilter, FilterState types and useFilterState hook (default values, setters, resetFilters, stable references)
