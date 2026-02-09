---
id: '003'
title: Add Amy to AgentName type and constants
type: feature
status: pending
rejection_count: 0
dependencies: []
outputs:
  test: src/__tests__/agent-types.test.ts
  impl: src/types/index.ts
parallel_group: types
---
## Objective

Extend the AgentName type to include Amy as the sixth agent, with appropriate type exports and documentation.

## Acceptance Criteria

- [ ] AgentName type includes Amy as a valid value
- [ ] TypeScript compiles without errors
- [ ] Type tests verify Amy is a valid AgentName

## Context

Amy Allen is the investigator agent. Add her to the AgentName type union in src/types/index.ts. The type definition is on line 6: export type AgentName = 'Hannibal' | 'Face' | 'Murdock' | 'B.A.' | 'Lynch';
