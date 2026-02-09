---
id: '013'
title: Fix AgentName type to use B.A. with dot
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/types/agent-name.test.ts
  impl: src/types/agent.ts
dependencies: []
parallel_group: type-fixes
---
## Objective

Update the AgentName type in src/types/agent.ts to use B.A. (with dot) instead of BA to match existing code and activity logs.

## Acceptance Criteria

- [ ] AgentName type uses B.A. instead of BA
- [ ] All TypeScript compilation passes
- [ ] Agent claims work correctly with B.A. name
- [ ] Activity logs display B.A. correctly

## Context

In src/types/agent.ts (line 15), the API uses BA but the existing codebase uses B.A. with a dot. This causes runtime errors when API clients pass BA to components expecting B.A. The fix updates the type to use B.A. for consistency.


Human confirmed: Fresh database only - no data migration needed for existing BA agent names in the database. This is purely a type definition fix. In src/types/agent.ts, the API uses BA but the existing codebase uses B.A. with a dot. The fix updates the type to use B.A. for consistency.
