---
id: '003'
title: Project name display in header
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/header-bar-project-name.test.tsx
  impl: src/components/header-bar.tsx
dependencies:
  - '002'
parallel_group: header
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T20:45:46.832Z'
    status: success
    summary: >-
      Created 16 test cases for project name display in header: container sizing
      (160px), border styling, text styling (Inter 14px, weight 600, white),
      hover effect (green), click handler, responsive hiding below 1024px, edge
      cases
    files_created:
      - src/__tests__/header-bar-project-name.test.tsx
  - agent: B.A.
    timestamp: '2026-01-18T20:50:08.732Z'
    status: success
    summary: >-
      Implemented project name display in header: added
      projectName/onProjectNameClick props, 160px container with right border,
      Inter 14px font-semibold white text with green hover, responsive hiding
      below 1024px, all 16 tests passing
    files_modified:
      - src/components/header-bar.tsx
  - agent: Lynch
    timestamp: '2026-01-18T20:59:37.409Z'
    status: success
    summary: >-
      APPROVED - All 16 tests pass, implementation matches spec: 160px
      container, border styling, Inter 14px font-semibold white text, green
      hover, click handler, responsive hiding below 1024px
  - agent: Amy
    timestamp: '2026-01-18T21:11:01.686Z'
    status: success
    summary: >-
      FLAG - CRITICAL: projectName prop NOT wired to HeaderBar in page.tsx (line
      347). Implementation exists but not connected. User cannot see project
      name in header.
  - agent: Lynch
    timestamp: '2026-01-18T21:14:48.440Z'
    status: success
    summary: >-
      APPROVED (RE-REVIEW) - Wiring fix verified:
      projectName={boardMetadata.projectName} now present at page.tsx line 352.
      All 16 tests pass. Implementation complete.
  - agent: Amy
    timestamp: '2026-01-19T04:05:12.554Z'
    status: success
    summary: >-
      VERIFIED - Project name wiring fix confirmed. projectName prop passed to
      HeaderBar at line 352. User sees kanban-viewer in header. All 16 tests
      pass.
---
## Objective

Add a 160px left container to the header that displays the project name with ORIGINAL CASING (as-is from folder name), with hover effect and responsive hiding below 1024px viewport.

## Acceptance Criteria

- [ ] Project name displays in 160px fixed-width container on left side of header
- [ ] 1px #374151 right border separates from mission bar
- [ ] Text displays with original casing from folder name (no text-transform)
- [ ] Text uses Inter 14px weight 600, white color
- [ ] Hover changes text to #22c55e (green accent)
- [ ] Click handler exists (can be no-op for now)
- [ ] Container hides below 1024px viewport width


## Context

Modify HeaderBar component at src/components/header-bar.tsx. The project name comes from boardMetadata.projectName passed from page.tsx. See PRD for exact layout - project container is separate from existing mission bar content.


Modify HeaderBar component at src/components/header-bar.tsx. The project name comes from boardMetadata.projectName passed from page.tsx. IMPORTANT: Display the project name exactly as it comes from the API - do NOT apply uppercase or any text-transform. See PRD for exact layout - project container is separate from existing mission bar content.

## Work Log
Amy - VERIFIED - Project name wiring fix confirmed. projectName prop passed to HeaderBar at line 352. User sees kanban-viewer in header. All 16 tests pass.
Amy - FLAG - CRITICAL: projectName prop NOT wired to HeaderBar in page.tsx (line 347). Implementation exists but not connected. User cannot see project name in header.
Lynch - APPROVED - All 16 tests pass, implementation matches spec: 160px container, border styling, Inter 14px font-semibold white text, green hover, click handler, responsive hiding below 1024px
B.A. - Implemented project name display in header: added projectName/onProjectNameClick props, 160px container with right border, Inter 14px font-semibold white text with green hover, responsive hiding below 1024px, all 16 tests passing
Murdock - Created 16 test cases for project name display in header: container sizing (160px), border styling, text styling (Inter 14px, weight 600, white), hover effect (green), click handler, responsive hiding below 1024px, edge cases
B.A. - Implemented project name display: added projectName and onProjectNameClick props, 160px container with border-r border-gray-700, text-sm font-semibold text-white hover:text-green-500, hidden lg:flex for responsive, all 16 tests passing
