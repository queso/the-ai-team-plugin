---
id: "003"
title: "Stage detection from file path"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "data-layer"
rejection_count: 0
outputs:
  types: "src/lib/stage-utils.ts"
  test: "src/__tests__/stage-utils.test.ts"
  impl: "src/lib/stage-utils.ts"
---

## Objective

Create utility functions to detect the pipeline stage from a file path and validate stage names.

## Acceptance Criteria

- [ ] getStageFromPath function extracts stage from file path (e.g., /mission/ready/foo.md -> ready)
- [ ] Handles all valid stages: briefings, ready, testing, implementing, review, done, blocked
- [ ] Returns null or throws for invalid/unknown stage paths
- [ ] isValidStage type guard function
- [ ] Works with both absolute and relative paths
- [ ] Handles edge cases (no stage folder, deeply nested paths)

## Context

The stage detector is used when:
1. Loading work items from filesystem to determine their stage
2. Watching file system events to detect when items move between stages
3. Validating that files are in expected locations

Valid stages as defined in PRD:
- briefings (backlog)
- ready (ready to start)
- testing (Murdock writing tests)
- implementing (B.A. implementing)
- review (Lynch reviewing)
- done (completed)
- blocked (needs human intervention)
