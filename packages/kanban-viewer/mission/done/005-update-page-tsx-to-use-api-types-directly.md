---
id: '005'
title: Update page.tsx to use API types directly
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/page-api-integration.test.tsx
  impl: src/app/page.tsx
dependencies:
  - '004'
parallel_group: stage-harmonization
---
## Objective

Update src/app/page.tsx to consume API response data directly without transformation, since the API will now return harmonized stage names.

## Acceptance Criteria

- [ ] page.tsx fetches board data and uses it directly
- [ ] No calls to transformApiItemToWorkItem or transformBoardStateToMetadata
- [ ] Work items display with correct stage assignments
- [ ] Board metadata displays correct values
- [ ] All existing functionality (filtering, animations, SSE) works correctly

## Context

With stage harmonization complete, the API returns data in the format the UI expects. The transformation layer becomes unnecessary. This simplifies the data flow and removes a source of potential bugs.
