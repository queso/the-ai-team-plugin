---
id: '014'
title: Harmonize ItemType between API and UI
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/types/item-type.test.ts
  impl: src/types/item.ts
dependencies: []
parallel_group: type-fixes
---
## Objective

Update the ItemType in src/types/item.ts to use the UI-expected types: feature, bug, enhancement, task. Remove the API types spike and chore.

## Acceptance Criteria

- [ ] ItemType uses exactly: feature, bug, enhancement, task (matching UI)
- [ ] API routes accept and return these item types
- [ ] TypeFilter in UI works correctly with item types
- [ ] All existing item types in database are compatible (feature, bug already match)


## Context

In src/types/item.ts (line 13), the API uses feature/bug/chore/spike but the UI expects feature/bug/enhancement/task. The api-transform.ts maps spike->enhancement and chore->task but this loses fidelity. Either harmonize the types or document the mapping clearly.


The API currently uses feature/bug/chore/spike but the UI expects feature/bug/enhancement/task. Since we are using fresh database (no migration needed), simply update the type definition to match the UI. The api-transform.ts mappings will be deleted anyway.
