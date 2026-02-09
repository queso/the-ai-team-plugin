---
id: '002'
title: Project name in metadata API response
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/api-board-metadata-project-name.test.ts
  impl: src/app/api/board/metadata/route.ts
dependencies:
  - '001'
parallel_group: api
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T19:46:49.144Z'
    status: success
    summary: >-
      Created 8 test cases verifying projectName in API metadata response - all
      passing
    files_created:
      - src/__tests__/api-board-metadata-project-name.test.ts
  - agent: B.A.
    timestamp: '2026-01-18T20:27:45.000Z'
    status: success
    summary: >-
      Verified implementation complete from item 001 - BoardMetadata type has
      projectName field, BoardService.getBoardMetadata() populates it via
      getProjectName(), API route returns it. All 8 tests passing.
    files_verified:
      - src/types/index.ts
      - src/services/board-service.ts
      - src/app/api/board/metadata/route.ts
  - agent: B.A.
    timestamp: '2026-01-18T20:28:00.291Z'
    status: success
    summary: >-
      Verified implementation complete - BoardMetadata type has projectName
      field, BoardService.getBoardMetadata() populates it, API route returns it.
      All 8 tests passing.
  - agent: Lynch
    timestamp: '2026-01-18T20:31:33.342Z'
    status: success
    summary: >-
      APPROVED - Tests pass (8 tests), projectName correctly flows from
      BoardService through API. Type is defined in BoardMetadata.
  - agent: Amy
    timestamp: '2026-01-18T20:46:52.633Z'
    status: success
    summary: >-
      VERIFIED - API wiring confirmed. projectName flows from
      BoardService.getProjectName() through API. 8 tests pass. Endpoint returns
      correct value.
---
## Objective

Update the BoardMetadata type to include projectName field and verify the /api/board/metadata endpoint correctly returns it. Since the route already returns NextResponse.json(metadata) from BoardService.getBoardMetadata(), this item focuses on type definitions and integration verification.

## Acceptance Criteria

- [ ] BoardMetadata type in src/types/index.ts includes projectName: string field
- [ ] GET /api/board/metadata returns projectName field in response
- [ ] Integration test verifies projectName flows from BoardService through API


## Context

The metadata endpoint at src/app/api/board/metadata/route.ts uses BoardService.getBoardMetadata(). After 001 adds project name to BoardService, this endpoint will automatically include it. May need to update BoardMetadata type in src/types/index.ts.


The metadata endpoint at src/app/api/board/metadata/route.ts already uses BoardService.getBoardMetadata() and returns it via NextResponse.json(metadata). After item 001 adds projectName to BoardService, this endpoint automatically includes it. The main work is updating the BoardMetadata TypeScript type and writing integration tests to verify the data flow.

## Work Log
Amy - VERIFIED - API wiring confirmed. projectName flows from BoardService.getProjectName() through API. 8 tests pass. Endpoint returns correct value.
Lynch - APPROVED - Tests pass (8 tests), projectName correctly flows from BoardService through API. Type is defined in BoardMetadata.
B.A. - Verified implementation complete - BoardMetadata type has projectName field, BoardService.getBoardMetadata() populates it, API route returns it. All 8 tests passing.
Murdock - Created 8 test cases verifying projectName in API metadata response - all passing
