---
id: '002'
title: Add agent colors and constants for Amy and Tawnia
type: interface
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/agent-constants.test.ts
  impl: src/components/agent-status-bar.tsx
  impl2: src/components/live-feed-panel.tsx
  types: src/types/index.ts
dependencies:
  - '001'
work_log:
  - agent: Murdock
    timestamp: '2026-01-20T19:11:19.095Z'
    status: success
    summary: >-
      Created 20 test cases covering AGENT_NAMES (7 agents), AGENT_COLORS (pink
      for Amy, teal for Tawnia), AGENT_INITIALS, and live feed agentColors
      exports
    files_created:
      - /Users/josh/Code/kanban-viewer/src/__tests__/agent-constants.test.ts
  - agent: B.A.
    timestamp: '2026-01-20T19:13:27.777Z'
    status: success
    summary: >-
      Added Amy (pink) and Tawnia (teal) to agent constants, all 20 tests
      passing
    files_modified:
      - src/components/agent-status-bar.tsx
      - src/components/live-feed-panel.tsx
  - agent: Lynch
    timestamp: '2026-01-20T19:16:13.132Z'
    status: success
    summary: >-
      REJECTED - Missing Tawnia in agent-badge.tsx, work-item-card.tsx,
      work-item-modal.tsx. Test expects violet but PRD says pink for Amy.
  - agent: B.A.
    timestamp: '2026-01-20T19:20:06.642Z'
    status: success
    summary: >-
      Added Tawnia to all agent color constants, updated Amy from violet to pink
      in all files, fixed test expectations for 7 agents. All 1591 tests
      passing.
    files_modified:
      - /Users/josh/Code/kanban-viewer/src/components/agent-badge.tsx
      - /Users/josh/Code/kanban-viewer/src/components/work-item-card.tsx
      - /Users/josh/Code/kanban-viewer/src/components/work-item-modal.tsx
      - /Users/josh/Code/kanban-viewer/src/__tests__/agent-status-bar.test.tsx
      - /Users/josh/Code/kanban-viewer/src/__tests__/agent-badge-colors.test.tsx
---
## Objective

Add color constants and configuration for Amy (changed from violet to pink) and Tawnia (new, teal) agents to the agent status bar, activity log, and live feed panel components.

## Acceptance Criteria

- [ ] AGENT_COLORS includes Amy with pink (#EC4899 / bg-pink-500) - color change from violet
- [ ] AGENT_COLORS includes Tawnia with teal (#14B8A6 / bg-teal-500)
- [ ] AGENT_NAMES array includes Amy and Tawnia (7 agents total)
- [ ] AGENT_INITIALS includes A for Amy and T for Tawnia
- [ ] Constants are exported and can be imported by other components
- [ ] Live feed panel agentColors includes Amy (pink) and Tawnia (teal)


## Context

Amy and Tawnia are new agents. Amy is the Investigator (pink) and Tawnia handles Documentation (teal). The AGENT_COLORS mapping uses Tailwind classes internally but should align with the hex values specified in the PRD.

## Work Log
B.A. - Added Tawnia to all agent color constants, updated Amy from violet to pink in all files, fixed test expectations for 7 agents. All 1591 tests passing.
Lynch - REJECTED - Missing Tawnia in agent-badge.tsx, work-item-card.tsx, work-item-modal.tsx. Test expects violet but PRD says pink for Amy.
B.A. - Added Amy (pink) and Tawnia (teal) to agent constants, all 20 tests passing
Murdock - Created 20 test cases covering AGENT_NAMES (7 agents), AGENT_COLORS (pink for Amy, teal for Tawnia), AGENT_INITIALS, and live feed agentColors exports
