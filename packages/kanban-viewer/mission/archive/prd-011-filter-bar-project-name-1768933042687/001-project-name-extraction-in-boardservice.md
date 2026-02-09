---
id: '001'
title: Project name extraction in BoardService
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/board-service-project-name.test.ts
  impl: src/services/board-service.ts
  types: src/types/index.ts
dependencies: []
parallel_group: board-service
work_log:
  - agent: Murdock
    timestamp: '2026-01-18T19:40:18.964Z'
    status: success
    summary: >-
      Created 13 test cases covering getProjectName() happy path, edge cases
      (root path, trailing slash, nested paths), and getBoardMetadata
      integration. Added projectName to BoardMetadata type. All 10
      implementation tests failing as expected.
    files_created:
      - src/__tests__/board-service-project-name.test.ts
      - src/types/index.ts
  - agent: B.A.
    timestamp: '2026-01-18T19:42:56.745Z'
    status: success
    summary: >-
      Implemented getProjectName() method in BoardService and updated
      getBoardMetadata() to include projectName. All 13 tests passing.
    files_modified:
      - src/services/board-service.ts
      - src/__tests__/board-service.test.ts
  - agent: Lynch
    timestamp: '2026-01-18T19:45:00.585Z'
    status: success
    summary: >-
      APPROVED - All 13 tests pass. getProjectName() correctly extracts parent
      folder using path.resolve/dirname/basename. Method integrated into
      getBoardMetadata(). Type properly added as optional for backwards
      compatibility. Edge cases covered.
---
## Objective

Add method to BoardService that extracts the project name from the parent directory of the mission folder, returning it as part of board metadata. Use path.resolve(missionPath) to get absolute path, then path.basename(path.dirname(...)) to extract the parent folder name.

## Acceptance Criteria

- [ ] BoardService has getProjectName() method that returns parent folder name
- [ ] Method handles edge cases (root path, missing folder)
- [ ] Project name is included in getBoardMetadata() response

## Context

The project name is derived from the filesystem - it is the parent folder name of the mission/ directory. Use path.basename(path.dirname(missionPath)) to extract it. See existing BoardService at src/services/board-service.ts.


The project name is derived from the filesystem - it is the parent folder name of the mission/ directory. IMPORTANT: missionPath must be resolved to an absolute path before extracting parent. Use path.resolve(missionPath) then path.basename(path.dirname(...)) to extract it. See existing BoardService at src/services/board-service.ts. The BoardMetadata type in src/types/index.ts will need projectName added.

## Work Log
Lynch - APPROVED - All 13 tests pass. getProjectName() correctly extracts parent folder using path.resolve/dirname/basename. Method integrated into getBoardMetadata(). Type properly added as optional for backwards compatibility. Edge cases covered.
B.A. - Implemented getProjectName() method in BoardService and updated getBoardMetadata() to include projectName. All 13 tests passing.
Murdock - Created 13 test cases covering getProjectName() happy path, edge cases (root path, trailing slash, nested paths), and getBoardMetadata integration. Added projectName to BoardMetadata type. All 10 implementation tests failing as expected.
