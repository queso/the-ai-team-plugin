---
id: "130"
title: "Agent Card Display Enhancement - Tests"
type: "test"
status: "pending"
dependencies: []
parallel_group: "agent-cards"
rejection_count: 0
outputs:
  test: "src/__tests__/work-item-card.test.tsx"
  impl: "src/components/work-item-card.tsx"
---

## Objective

Verify that work item cards correctly display assigned agents with appropriate status dots, following the PRD design specification.

## Acceptance Criteria

- [ ] Test agent displays only when card is in TESTING, IMPLEMENTING, or REVIEW columns
- [ ] Test agent name is shown next to status dot
- [ ] Test status dot colors: green for active, red for blocked
- [ ] Test agent is NOT shown for cards in BRIEFINGS, READY, DONE columns
- [ ] Test card footer layout: status dot + agent name on left, dependency count on right
- [ ] Test that unassigned cards show no agent indicator

## Context

- File: `src/__tests__/work-item-card.test.tsx`
- Existing tests cover basic agent display - extend for stage-specific behavior
- The WorkItemCard currently shows agent whenever assigned_agent is set
- May need to pass stage information to determine visibility
- PRD specifies: "Show agent only when card is in TESTING, IMPLEMENTING, or REVIEW columns"

Current implementation shows agent regardless of stage - tests should verify the NEW behavior where agent visibility depends on stage.
