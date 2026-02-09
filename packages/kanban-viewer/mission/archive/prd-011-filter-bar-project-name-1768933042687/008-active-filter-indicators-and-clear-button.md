---
id: 008
title: Active filter indicators and clear button
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/filter-bar-active-indicators.test.tsx
  impl: src/components/filter-bar.tsx
dependencies:
  - '007'
parallel_group: filter-ui
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T20:45:48.367Z'
    status: success
    summary: >-
      Created 20 test cases for active filter indicators: green tint on active
      dropdowns (bg/border), clear filters button visibility, button styling
      (gray text, white hover, X icon 12px), clear filters functionality, button
      positioning
    files_created:
      - src/__tests__/filter-bar-active-indicators.test.tsx
  - agent: B.A.
    timestamp: '2026-01-18T20:50:56.983Z'
    status: success
    summary: >-
      Implemented active filter indicators: green tint (bg-green-500/20,
      border-green-500) on active dropdowns, clear filters button with X icon
      that appears when any filter is non-default. All 20 tests passing.
    files_modified:
      - src/components/filter-bar.tsx
  - agent: Lynch
    timestamp: '2026-01-18T20:59:38.895Z'
    status: success
    summary: >-
      APPROVED - All 20 tests pass, implementation matches spec: green tint on
      active dropdowns (bg-green-500/20, border-green-500), clear filters button
      with X icon 12px, proper styling and functionality
  - agent: Amy
    timestamp: '2026-01-18T21:11:03.331Z'
    status: success
    summary: >-
      VERIFIED - Active filter indicators and clear button work correctly: green
      tint toggles, clear filters resets all, whitespace search considered
      active. All 20 tests pass + probe tests.
---
## Objective

Add visual indicators when filters are active: dropdown badge with match count, green tint on active dropdowns, and Clear filters button.

## Acceptance Criteria

- [ ] Active dropdown shows green tint (#22c55e20 background, #22c55e border)
- [ ] Clear filters button appears when any filter is non-default
- [ ] Clear filters button styled as text button (#6b7280, hover #ffffff)
- [ ] Clear filters resets all dropdowns and search to defaults
- [ ] Clear filters button uses lucide-react X icon (12px)

## Context

Active means filter value is not the default All X option. The green tint gives visual feedback that a filter is constraining results. Clear filters button appears after the dropdowns in the filter bar.

## Work Log
Amy - VERIFIED - Active filter indicators and clear button work correctly: green tint toggles, clear filters resets all, whitespace search considered active. All 20 tests pass + probe tests.
Lynch - APPROVED - All 20 tests pass, implementation matches spec: green tint on active dropdowns (bg-green-500/20, border-green-500), clear filters button with X icon 12px, proper styling and functionality
B.A. - Implemented active filter indicators: green tint (bg-green-500/20, border-green-500) on active dropdowns, clear filters button with X icon that appears when any filter is non-default. All 20 tests passing.
Murdock - Created 20 test cases for active filter indicators: green tint on active dropdowns (bg/border), clear filters button visibility, button styling (gray text, white hover, X icon 12px), clear filters functionality, button positioning
