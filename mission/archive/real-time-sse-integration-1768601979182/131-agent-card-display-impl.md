---
id: "131"
title: "Agent Card Display Enhancement - Implementation"
type: "implementation"
status: "pending"
dependencies: ["130"]
parallel_group: "agent-cards"
rejection_count: 0
outputs:
  test: "src/__tests__/work-item-card.test.tsx"
  impl: "src/components/work-item-card.tsx"
---

## Objective

Update WorkItemCard to only show assigned agent when the card is in an active work stage (testing, implementing, review).

## Acceptance Criteria

- [ ] Agent indicator only visible for stages: 'testing', 'implementing', 'review'
- [ ] Agent indicator hidden for stages: 'briefings', 'ready', 'done', 'blocked'
- [ ] Maintain existing agent color coding (Hannibal=blue, Face=green, etc.)
- [ ] Status dot shows agent activity state (use existing color scheme)
- [ ] Layout: status dot + agent name aligned to right of card footer

## Context

- File: `src/components/work-item-card.tsx`
- The WorkItem type already includes `stage: Stage`
- Update the `showAgent` logic to check stage:

```tsx
const ACTIVE_STAGES: Stage[] = ['testing', 'implementing', 'review'];
const showAgent = item.assigned_agent !== undefined &&
                  ACTIVE_STAGES.includes(item.stage);
```

- Current implementation shows agent unconditionally when assigned
- Card already has the footer row structure with agent indicator
