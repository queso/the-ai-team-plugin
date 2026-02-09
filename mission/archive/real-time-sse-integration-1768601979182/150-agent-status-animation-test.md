---
id: "150"
title: "Agent Status Bar Animation - Tests"
type: "test"
status: "pending"
dependencies: []
parallel_group: "agent-status"
rejection_count: 0
outputs:
  test: "src/__tests__/agent-status-bar.test.tsx"
  impl: "src/components/agent-status-bar.tsx"
---

## Objective

Create tests verifying that agent status dots have correct visual states including pulsing animation for ACTIVE status.

## Acceptance Criteria

- [ ] Test ACTIVE status shows green dot with animate-pulse class
- [ ] Test WATCHING status shows amber/yellow dot (no pulse)
- [ ] Test IDLE status shows gray dot (no pulse)
- [ ] Test status text displays correctly: ACTIVE, WATCHING, IDLE
- [ ] Test only ACTIVE agents have pulsing animation
- [ ] Test multiple agents can have different animation states simultaneously

## Context

- File: `src/__tests__/agent-status-bar.test.tsx`
- Extend existing tests to check for animation classes
- PRD specifies:
  - ACTIVE: Green (pulsing) - `bg-green-500 animate-pulse`
  - WATCHING: Amber - `bg-amber-500`
  - IDLE: Gray - `bg-gray-500`
- Current implementation uses agent-specific colors, PRD wants status-specific colors
