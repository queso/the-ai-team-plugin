---
id: '001'
title: Add probing to Stage type definition
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/probing-stage-type.test.ts
  impl: src/types/index.ts
dependencies: []
parallel_group: types
---
## Objective

Extend the Stage type in src/types/index.ts to include probing as a valid stage value.

## Acceptance Criteria

- [ ] Stage type includes probing: briefings | ready | testing | implementing | review | probing | done | blocked
- [ ] TypeScript compilation succeeds with no errors
- [ ] Existing Stage type usages remain compatible

## Context

The pipeline flow has changed to include a probing stage after review. The Stage type in src/types/index.ts currently lacks this value. This is a foundational change that other work items depend on.
