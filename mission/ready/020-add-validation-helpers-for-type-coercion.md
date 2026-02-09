---
id: '020'
title: Add validation helpers for type coercion
type: enhancement
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/lib/api-validation.test.ts
  impl: src/lib/api-validation.ts
dependencies: []
parallel_group: frontend-fixes
---
## Objective

Add validation helpers in api-transform.ts (or a new validation module) that throw on unexpected types instead of silently defaulting.

## Acceptance Criteria

- [ ] validateItemType throws on unknown item types
- [ ] validateAgentName throws on unknown agent names
- [ ] validateDate throws on invalid date values
- [ ] Validation errors include the unexpected value for debugging
- [ ] Console.error logs unexpected values before throwing

## Context

In src/lib/api-transform.ts (lines 46-69), type coercion silently defaults to feature for unknown types and coerces invalid dates to strings. This hides data corruption. Validation helpers should throw to surface issues early.
