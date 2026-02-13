---
id: '006'
title: Delete api-transform.ts bandaid file
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/lib/no-transform-needed.test.ts
  impl: src/lib/api-transform.ts
dependencies:
  - '005'
parallel_group: stage-harmonization
---
## Objective

Remove the src/lib/api-transform.ts file and all imports/references to it, since the transformation layer is no longer needed after stage harmonization.

## Acceptance Criteria

- [ ] src/lib/api-transform.ts is deleted
- [ ] No imports of api-transform remain in the codebase
- [ ] All TypeScript compilation passes
- [ ] Application functions correctly without transformation layer


## Context

The api-transform.ts file was a bandaid to bridge the mismatch between API and UI stage names. With harmonization complete, this file should be removed to reduce maintenance burden and eliminate a source of bugs.


Test file verifies no imports of api-transform.ts exist anywhere in the codebase. Since the file is deleted, the test confirms the deletion was complete and no dangling references remain.
