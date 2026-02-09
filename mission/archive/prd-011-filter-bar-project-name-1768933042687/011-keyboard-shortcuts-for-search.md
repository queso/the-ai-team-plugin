---
id: '011'
title: Keyboard shortcuts for search
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/filter-keyboard-shortcuts.test.tsx
  impl: src/components/filter-bar.tsx
dependencies:
  - '007'
parallel_group: filter-ui
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T21:01:18.257Z'
    status: success
    summary: >-
      Created 24 test cases for keyboard shortcuts covering / focus,
      Cmd+K/Ctrl+K focus, Escape to clear/close, and shortcut exclusion when
      typing in input
    files_created:
      - src/__tests__/filter-keyboard-shortcuts.test.tsx
  - agent: B.A.
    timestamp: '2026-01-18T21:10:10.702Z'
    status: success
    summary: >-
      Implemented keyboard shortcuts in FilterBar: / and Cmd+K/Ctrl+K to focus
      search, Escape to clear search and close dropdowns. Used
      useImperativeHandle pattern to close dropdowns via refs. All 24 tests
      passing.
    files_modified:
      - src/components/filter-bar.tsx
  - agent: Lynch
    timestamp: '2026-01-18T21:14:48.440Z'
    status: success
    summary: >-
      APPROVED - All 24 tests pass. Keyboard shortcuts implemented: / focuses
      search, Cmd+K/Ctrl+K focuses search, Escape clears search and closes
      dropdowns, shortcuts don't trigger when typing in other inputs (except
      Escape for clearing).
  - agent: Amy
    timestamp: '2026-01-19T04:05:14.892Z'
    status: success
    summary: >-
      VERIFIED - Keyboard shortcuts work correctly. / focuses search, Cmd+K
      focuses search, Escape clears search and closes dropdowns. All 24 tests
      pass.
---
## Objective

Implement keyboard shortcuts: / and Cmd/Ctrl+K to focus search input, Escape to clear search and close dropdowns.

## Acceptance Criteria

- [ ] Pressing / focuses the search input
- [ ] Pressing Cmd+K (Mac) or Ctrl+K (Windows) focuses search input
- [ ] Pressing Escape clears search input text
- [ ] Pressing Escape closes any open dropdown menus
- [ ] Shortcuts do not trigger when typing in search input (except Escape)

## Context

Add global keyboard event listener in page.tsx or FilterBar. Use event.key and event.metaKey/event.ctrlKey for detection. Prevent default behavior for / when not in input to avoid typing slash in search.

## Work Log
Amy - VERIFIED - Keyboard shortcuts work correctly. / focuses search, Cmd+K focuses search, Escape clears search and closes dropdowns. All 24 tests pass.
B.A. - Implemented keyboard shortcuts in FilterBar: / and Cmd+K/Ctrl+K to focus search, Escape to clear search and close dropdowns. Used useImperativeHandle pattern to close dropdowns via refs. All 24 tests passing.
Murdock - Created 24 test cases for keyboard shortcuts covering / focus, Cmd+K/Ctrl+K focus, Escape to clear/close, and shortcut exclusion when typing in input
