---
id: '006'
title: FilterBar component with dropdowns
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/filter-bar.test.tsx
  impl: src/components/filter-bar.tsx
dependencies:
  - '004'
parallel_group: filter-ui
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T19:48:50.614Z'
    status: success
    summary: >-
      Created 29 test cases for FilterBar component covering rendering,
      dropdowns, styling, selected states, and layout requirements
    files_created:
      - src/__tests__/filter-bar.test.tsx
  - agent: B.A.
    timestamp: '2026-01-18T20:28:09.412Z'
    status: success
    summary: >-
      Implemented FilterBar component with three dropdowns (Type, Agent,
      Status). All 30 tests passing.
    files_created:
      - src/components/filter-bar.tsx
  - agent: Lynch
    timestamp: '2026-01-18T20:31:34.762Z'
    status: success
    summary: >-
      APPROVED - Tests pass (30 tests), FilterBar has correct styling (48px
      h-12, bg-gray-800), three dropdowns with proper options and interactions.
  - agent: Amy
    timestamp: '2026-01-18T20:46:54.133Z'
    status: success
    summary: >-
      VERIFIED - FilterBar renders 3 dropdowns correctly. Minor INFO:
      aria-selected missing on options (lint warning). 30 tests pass.
---
## Objective

Create the FilterBar component with three dropdown selects (Type, Agent, Status) styled according to PRD specifications.

## Acceptance Criteria

- [ ] FilterBar renders horizontal bar below header (48px height, #1f2937 background)
- [ ] Three dropdowns display with correct styling (#374151 background, 6px border-radius)
- [ ] Dropdowns show all options from PRD with correct labels
- [ ] Dropdown hover state changes background to #4b5563
- [ ] Selected option shows #22c55e text color and checkmark
- [ ] Filter label shows Filter by: text in #6b7280

## Context

Use lucide-react ChevronDown icon for dropdown indicators. Component receives filter state and onChange handlers as props. See PRD Filter Bar section for full styling spec. Create at src/components/filter-bar.tsx.

## Work Log
Amy - VERIFIED - FilterBar renders 3 dropdowns correctly. Minor INFO: aria-selected missing on options (lint warning). 30 tests pass.
Lynch - APPROVED - Tests pass (30 tests), FilterBar has correct styling (48px h-12, bg-gray-800), three dropdowns with proper options and interactions.
B.A. - Implemented FilterBar component with three dropdowns (Type, Agent, Status). All 30 tests passing.
Murdock - Created 29 test cases for FilterBar component covering rendering, dropdowns, styling, selected states, and layout requirements
