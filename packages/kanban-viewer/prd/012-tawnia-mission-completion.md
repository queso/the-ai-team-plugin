# Kanban UI Update PRD: Tawnia & Mission Completion Flow

**Version:** 1.0
**Date:** January 20, 2026
**Status:** Ready for Development
**Depends On:** [kanban-ui-prd.md](./kanban-ui-prd.md)

---

## Overview

This PRD describes updates to the Kanban Board UI to support:
1. Two new agents: **Amy** (Investigator) and **Tawnia** (Documentation)
2. Mission completion flow with Final Review, Post-Checks, and Documentation phases
3. A new **Mission Completion Panel** that visualizes the end-of-mission pipeline

---

## Background

The A(i)-Team pipeline has been extended. After all items reach `done/`, there's now a multi-step mission completion flow:

```
All items done → Lynch Final Review → Post-Checks → Tawnia (docs + commit) → COMPLETE
                      ↓                    ↓              ↓
                 Reviews ALL code    lint/unit/e2e    CHANGELOG, README,
                 holistically        must pass        docs/, final commit
```

These are **mission-level operations**, not per-item operations. Items stay in `done/` while the mission completes.

---

## Changes Summary

| Area | Change |
|------|--------|
| Agent Status Bar | Add Amy and Tawnia (7 agents total) |
| Header | Show mission phase after all items done |
| Right Panel | New "Mission Completion" tab/panel |
| board.json | New fields: `finalReview`, `postChecks`, `documentation` |
| SSE Events | New events for completion flow |
| Activity Log | New highlights for COMMITTED |

---

## 1. Agent Status Bar

### Current (5 agents)
```
AGENTS  ⓗ Hannibal  ⓕ Face  ⓜ Murdock  ⓑ B.A.  ⓛ Lynch
        ● WATCHING  ○ IDLE  ● ACTIVE   ● ACTIVE ○ IDLE
```

### Updated (7 agents)
```
AGENTS  ⓗ Hannibal  ⓕ Face  ⓜ Murdock  ⓑ B.A.  ⓛ Lynch  ⓐ Amy  ⓣ Tawnia
        ● WATCHING  ○ IDLE  ● ACTIVE   ● ACTIVE ○ IDLE   ○ IDLE  ○ IDLE
```

### Agent Colors

```typescript
const AGENT_COLORS = {
  Hannibal: '#3B82F6', // blue
  Face: '#22C55E',     // green
  Murdock: '#EAB308',  // yellow
  'B.A.': '#F97316',   // orange
  Lynch: '#A855F7',    // purple
  Amy: '#EC4899',      // pink (NEW)
  Tawnia: '#14B8A6'    // teal (NEW)
};
```

### Agent Initials

| Agent | Initial | Color |
|-------|---------|-------|
| Hannibal | ⓗ | Blue |
| Face | ⓕ | Green |
| Murdock | ⓜ | Yellow |
| B.A. | ⓑ | Orange |
| Lynch | ⓛ | Purple |
| Amy | ⓐ | Pink |
| Tawnia | ⓣ | Teal |

---

## 2. Mission Phase Status

### Header Updates

The header currently shows mission status as a simple indicator. Extend it to show the current **phase** when mission is completing:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ● MISSION ACTIVE   Project Name                    ⑂ WIP: 4/5   ⊙ 12/26 ████░░   ⏱ 00:23:51 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Phase Display States

| Phase | Status Indicator | Description |
|-------|------------------|-------------|
| `active` | ● MISSION ACTIVE | Normal execution, items flowing through pipeline |
| `final_review` | ● FINAL REVIEW | Lynch reviewing all code holistically |
| `post_checks` | ● POST-CHECKS | Running lint, unit tests, e2e tests |
| `documentation` | ● DOCUMENTATION | Tawnia updating docs and committing |
| `complete` | ✓ MISSION COMPLETE | All done, ready for next mission |

### Visual Treatment

- **active**: Green dot, white text
- **final_review**: Purple dot (Lynch's color), white text
- **post_checks**: Yellow dot, white text (running)
- **documentation**: Teal dot (Tawnia's color), white text
- **complete**: Green checkmark, green text

---

## 3. Mission Completion Panel

### When to Show

The Mission Completion Panel appears when:
- `mission.status` is `final_review`, `post_checks`, `documentation`, or `complete`
- OR all items are in `done/` and completion flow has started

### Location

Add as a new tab in the right panel:

```
┌─────────────────────────────────────┐
│ ⦿ Live Feed │ 💬 Human Input │ 🏁 │  ← New tab (flag icon or "Complete")
│ ⎇ Git       │ + New Mission       │
├─────────────────────────────────────┤
```

Alternatively, show as an overlay/banner at the top of the board when completion starts.

### Panel Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏁 MISSION COMPLETION                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐         │
│  │  Final Review  │───▶│  Post-Checks   │───▶│ Documentation  │───▶ ✓   │
│  ├────────────────┤    ├────────────────┤    ├────────────────┤         │
│  │                │    │                │    │                │         │
│  │   ● Lynch      │    │  ✓ lint        │    │   ○ Tawnia     │         │
│  │   APPROVED     │    │  ✓ unit        │    │   waiting...   │         │
│  │                │    │  ● e2e ···     │    │                │         │
│  │   ✓ 14:25:03   │    │                │    │                │         │
│  │                │    │                │    │                │         │
│  └────────────────┘    └────────────────┘    └────────────────┘         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Panel States

#### State 1: Final Review In Progress
```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Final Review  │    │  Post-Checks   │    │ Documentation  │
├────────────────┤    ├────────────────┤    ├────────────────┤
│   ● Lynch      │    │  ○ lint        │    │   ○ Tawnia     │
│   reviewing... │    │  ○ unit        │    │   waiting      │
│                │    │  ○ e2e         │    │                │
└────────────────┘    └────────────────┘    └────────────────┘
     ACTIVE              PENDING              PENDING
```

#### State 2: Final Review Passed, Post-Checks Running
```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Final Review  │    │  Post-Checks   │    │ Documentation  │
├────────────────┤    ├────────────────┤    ├────────────────┤
│   ✓ Lynch      │    │  ✓ lint        │    │   ○ Tawnia     │
│   APPROVED     │    │  ✓ unit        │    │   waiting      │
│   14:25:03     │    │  ● e2e ···     │    │                │
└────────────────┘    └────────────────┘    └────────────────┘
     COMPLETE            ACTIVE              PENDING
```

#### State 3: Post-Checks Passed, Documentation Running
```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Final Review  │    │  Post-Checks   │    │ Documentation  │
├────────────────┤    ├────────────────┤    ├────────────────┤
│   ✓ Lynch      │    │  ✓ lint        │    │   ● Tawnia     │
│   APPROVED     │    │  ✓ unit        │    │   writing...   │
│   14:25:03     │    │  ✓ e2e         │    │                │
│                │    │   14:26:45     │    │                │
└────────────────┘    └────────────────┘    └────────────────┘
     COMPLETE            COMPLETE            ACTIVE
```

#### State 4: All Complete
```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Final Review  │    │  Post-Checks   │    │ Documentation  │
├────────────────┤    ├────────────────┤    ├────────────────┤
│   ✓ Lynch      │    │  ✓ lint        │    │   ✓ Tawnia     │
│   APPROVED     │    │  ✓ unit        │    │   COMMITTED    │
│   14:25:03     │    │  ✓ e2e         │    │   a1b2c3d      │
│                │    │   14:26:45     │    │   14:28:12     │
└────────────────┘    └────────────────┘    └────────────────┘
     COMPLETE            COMPLETE            COMPLETE

┌─────────────────────────────────────────────────────────────┐
│  ✓ MISSION COMPLETE                                          │
│                                                              │
│  Commit: a1b2c3d - feat: PRD 010 - Auth System              │
│  Items: 7 completed                                          │
│  Duration: 01:45:23                                          │
│                                                              │
│  Files documented:                                           │
│  • CHANGELOG.md                                              │
│  • README.md                                                 │
│  • docs/features/auth-refresh.md                            │
└─────────────────────────────────────────────────────────────┘
```

#### State 5: Failure (Post-Checks Failed)
```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Final Review  │    │  Post-Checks   │    │ Documentation  │
├────────────────┤    ├────────────────┤    ├────────────────┤
│   ✓ Lynch      │    │  ✓ lint        │    │   ○ Tawnia     │
│   APPROVED     │    │  ✗ unit (3)    │    │   blocked      │
│   14:25:03     │    │  ○ e2e         │    │                │
└────────────────┘    └────────────────┘    └────────────────┘
     COMPLETE            FAILED              BLOCKED

┌─────────────────────────────────────────────────────────────┐
│  ⚠ POST-CHECKS FAILED                                        │
│                                                              │
│  3 unit tests failing:                                       │
│  • src/__tests__/auth.test.ts - token refresh timeout       │
│  • src/__tests__/auth.test.ts - invalid token handling      │
│  • src/__tests__/session.test.ts - session expiry           │
│                                                              │
│  Items returned to pipeline for fixes.                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. board.json Schema Updates

### New Fields

Add these fields to `board.json`:

```json
{
  "mission": {
    "name": "PRD 010 - Auth System",
    "started_at": "2026-01-15T10:00:00Z",
    "status": "active"  // active | final_review | post_checks | documentation | complete
  },

  "finalReview": {
    "started_at": "2026-01-15T14:20:00Z",
    "completed_at": "2026-01-15T14:25:03Z",
    "passed": true,
    "verdict": "APPROVED",
    "agent": "Lynch",
    "rejections": []  // List of item IDs if any were rejected back
  },

  "postChecks": {
    "started_at": "2026-01-15T14:25:05Z",
    "completed_at": "2026-01-15T14:26:45Z",
    "passed": true,
    "results": {
      "lint": { "status": "passed", "completed_at": "2026-01-15T14:25:15Z" },
      "unit": { "status": "passed", "completed_at": "2026-01-15T14:26:00Z" },
      "e2e": { "status": "passed", "completed_at": "2026-01-15T14:26:45Z" }
    }
  },

  "documentation": {
    "started_at": "2026-01-15T14:26:47Z",
    "completed_at": "2026-01-15T14:28:12Z",
    "completed": true,
    "agent": "Tawnia",
    "files_modified": [
      "CHANGELOG.md",
      "README.md",
      "docs/features/auth-refresh.md"
    ],
    "commit": {
      "hash": "a1b2c3d",
      "message": "feat: PRD 010 - Auth System"
    },
    "summary": "Updated CHANGELOG with 4 entries, updated README, created auth refresh feature doc"
  },

  "agents": {
    "Hannibal": { "status": "watching" },
    "Face": { "status": "idle" },
    "Murdock": { "status": "idle" },
    "B.A.": { "status": "idle" },
    "Lynch": { "status": "idle" },
    "Amy": { "status": "idle" },      // NEW
    "Tawnia": { "status": "idle" }    // NEW
  }
}
```

### TypeScript Interfaces

```typescript
interface BoardJson {
  mission: {
    name: string;
    started_at: string;
    status: 'active' | 'final_review' | 'post_checks' | 'documentation' | 'complete';
  };

  wip_limits: Record<string, number>;
  phases: Record<string, string[]>;
  assignments: Record<string, Assignment>;
  agents: Record<AgentName, AgentStatus>;
  stats: BoardStats;
  last_updated: string;

  // New fields for mission completion
  finalReview?: FinalReviewStatus;
  postChecks?: PostChecksStatus;
  documentation?: DocumentationStatus;
}

type AgentName = 'Hannibal' | 'Face' | 'Murdock' | 'B.A.' | 'Lynch' | 'Amy' | 'Tawnia';

interface FinalReviewStatus {
  started_at: string;
  completed_at?: string;
  passed?: boolean;
  verdict?: 'APPROVED' | 'REJECTED';
  agent: 'Lynch';
  rejections?: string[];  // Item IDs rejected back to pipeline
}

interface PostChecksStatus {
  started_at: string;
  completed_at?: string;
  passed?: boolean;
  results: {
    lint?: CheckResult;
    unit?: CheckResult;
    e2e?: CheckResult;
  };
}

interface CheckResult {
  status: 'pending' | 'running' | 'passed' | 'failed';
  completed_at?: string;
  error?: string;
  failures?: number;
}

interface DocumentationStatus {
  started_at: string;
  completed_at?: string;
  completed: boolean;
  agent: 'Tawnia';
  files_modified: string[];
  commit?: {
    hash: string;
    message: string;
  };
  summary?: string;
}
```

---

## 5. SSE Events

### New Event Types

Add these event types to the SSE stream:

```typescript
type BoardEventType =
  // Existing events
  | 'item-added'
  | 'item-moved'
  | 'item-updated'
  | 'item-deleted'
  | 'board-updated'
  | 'agent-status-changed'

  // New mission completion events
  | 'final-review-started'
  | 'final-review-complete'
  | 'post-checks-started'
  | 'post-check-update'      // Individual check completed
  | 'post-checks-complete'
  | 'documentation-started'
  | 'documentation-complete'
  | 'mission-complete';
```

### Event Payloads

```typescript
// Final review events
interface FinalReviewStartedEvent {
  type: 'final-review-started';
  timestamp: string;
  data: {
    agent: 'Lynch';
    items_count: number;
  };
}

interface FinalReviewCompleteEvent {
  type: 'final-review-complete';
  timestamp: string;
  data: {
    passed: boolean;
    verdict: 'APPROVED' | 'REJECTED';
    rejections?: string[];
  };
}

// Post-checks events
interface PostChecksStartedEvent {
  type: 'post-checks-started';
  timestamp: string;
  data: {
    checks: string[];  // ['lint', 'unit', 'e2e']
  };
}

interface PostCheckUpdateEvent {
  type: 'post-check-update';
  timestamp: string;
  data: {
    check: 'lint' | 'unit' | 'e2e';
    status: 'running' | 'passed' | 'failed';
    error?: string;
  };
}

interface PostChecksCompleteEvent {
  type: 'post-checks-complete';
  timestamp: string;
  data: {
    passed: boolean;
    results: Record<string, CheckResult>;
  };
}

// Documentation events
interface DocumentationStartedEvent {
  type: 'documentation-started';
  timestamp: string;
  data: {
    agent: 'Tawnia';
  };
}

interface DocumentationCompleteEvent {
  type: 'documentation-complete';
  timestamp: string;
  data: {
    files_modified: string[];
    commit: {
      hash: string;
      message: string;
    };
    summary: string;
  };
}

// Mission complete event
interface MissionCompleteEvent {
  type: 'mission-complete';
  timestamp: string;
  data: {
    mission_name: string;
    duration: string;  // "01:45:23"
    items_completed: number;
    commit_hash: string;
  };
}
```

---

## 6. Activity Log Updates

### New Highlight: COMMITTED

Add highlighting for Tawnia's commit action:

| Prefix | Color | Example |
|--------|-------|---------|
| `APPROVED` | Green | `[Lynch] APPROVED 006-database-schema` |
| `REJECTED` | Red | `[Lynch] REJECTED 008-login-form` |
| `ALERT:` | Yellow | `[Hannibal] ALERT: Item 024 needs input` |
| `COMMITTED` | Teal | `[Tawnia] COMMITTED a1b2c3d` |  **NEW** |

### Activity Log Examples

```
14:28:12 [Tawnia] COMMITTED a1b2c3d - feat: PRD 010 - Auth System
14:28:10 [Tawnia] Updated docs/features/auth-refresh.md
14:28:05 [Tawnia] Updated README.md
14:28:00 [Tawnia] Updated CHANGELOG.md with 4 entries
14:27:45 [Tawnia] Starting documentation for mission "PRD 010"
14:26:45 [Hannibal] Post-checks PASSED (lint ✓, unit ✓, e2e ✓)
14:26:45 [Hannibal] e2e tests passed
14:26:00 [Hannibal] Unit tests passed (47/47)
14:25:15 [Hannibal] Lint passed
14:25:05 [Hannibal] Running post-mission checks...
14:25:03 [Lynch] APPROVED - Final review complete
14:24:00 [Lynch] Starting final mission review (7 items)
```

---

## 7. UI Component Updates

### AgentStatusBar Component

```tsx
// Update agent list
const AGENTS: AgentConfig[] = [
  { name: 'Hannibal', initial: 'ⓗ', color: '#3B82F6' },
  { name: 'Face', initial: 'ⓕ', color: '#22C55E' },
  { name: 'Murdock', initial: 'ⓜ', color: '#EAB308' },
  { name: 'B.A.', initial: 'ⓑ', color: '#F97316' },
  { name: 'Lynch', initial: 'ⓛ', color: '#A855F7' },
  { name: 'Amy', initial: 'ⓐ', color: '#EC4899' },      // NEW
  { name: 'Tawnia', initial: 'ⓣ', color: '#14B8A6' },   // NEW
];
```

### MissionCompletionPanel Component (New)

```tsx
interface MissionCompletionPanelProps {
  missionStatus: MissionStatus;
  finalReview?: FinalReviewStatus;
  postChecks?: PostChecksStatus;
  documentation?: DocumentationStatus;
}

// Render the three-phase pipeline with current status
```

### HeaderBar Component

```tsx
// Update status display logic
function getMissionStatusDisplay(status: string) {
  switch (status) {
    case 'active': return { icon: '●', text: 'MISSION ACTIVE', color: 'green' };
    case 'final_review': return { icon: '●', text: 'FINAL REVIEW', color: 'purple' };
    case 'post_checks': return { icon: '●', text: 'POST-CHECKS', color: 'yellow' };
    case 'documentation': return { icon: '●', text: 'DOCUMENTATION', color: 'teal' };
    case 'complete': return { icon: '✓', text: 'MISSION COMPLETE', color: 'green' };
    default: return { icon: '○', text: 'NO MISSION', color: 'gray' };
  }
}
```

---

## 8. Acceptance Criteria

### Agent Status Bar
- [ ] Amy appears in agent status bar with pink color and ⓐ initial
- [ ] Tawnia appears in agent status bar with teal color and ⓣ initial
- [ ] All 7 agents display correctly
- [ ] Agent status updates work for Amy and Tawnia

### Mission Phase Status
- [ ] Header shows "FINAL REVIEW" when `mission.status === 'final_review'`
- [ ] Header shows "POST-CHECKS" when `mission.status === 'post_checks'`
- [ ] Header shows "DOCUMENTATION" when `mission.status === 'documentation'`
- [ ] Header shows "MISSION COMPLETE" with checkmark when `mission.status === 'complete'`

### Mission Completion Panel
- [ ] Panel/tab appears when mission enters completion flow
- [ ] Shows three phases: Final Review → Post-Checks → Documentation
- [ ] Each phase shows current status (pending/active/complete/failed)
- [ ] Post-checks shows individual check status (lint/unit/e2e)
- [ ] Documentation phase shows Tawnia's status
- [ ] Complete state shows commit hash and files modified
- [ ] Failed state shows error details

### board.json Support
- [ ] Reads `finalReview` object and displays status
- [ ] Reads `postChecks` object and displays individual check results
- [ ] Reads `documentation` object and displays commit info
- [ ] Handles missing fields gracefully (fields are optional until that phase starts)

### SSE Events
- [ ] Handles `final-review-started` event
- [ ] Handles `final-review-complete` event
- [ ] Handles `post-checks-started` event
- [ ] Handles `post-check-update` event (updates individual check status)
- [ ] Handles `post-checks-complete` event
- [ ] Handles `documentation-started` event
- [ ] Handles `documentation-complete` event
- [ ] Handles `mission-complete` event

### Activity Log
- [ ] COMMITTED prefix highlighted in teal
- [ ] Tawnia's activity appears with teal agent color
- [ ] Commit hash displayed in activity log

---

## 9. Implementation Notes

### Phase Transitions

The mission status transitions are:
1. `active` → `final_review`: When all items reach `done/` and Lynch starts review
2. `final_review` → `post_checks`: When Lynch approves (or back to `active` if rejected)
3. `post_checks` → `documentation`: When all checks pass (or items return to pipeline if failed)
4. `documentation` → `complete`: When Tawnia commits

### Backward Compatibility

- All new `board.json` fields are optional
- UI should handle missing fields gracefully
- Existing missions without these fields should display normally

### Performance Considerations

- Mission Completion Panel only renders when needed
- Don't poll for completion status - use SSE events
- Cache parsed board.json, only re-read on `board-updated` event

---

## 10. Out of Scope

- Drag-and-drop for completion phases (they're automatic)
- Manual retry of failed post-checks (Hannibal handles this)
- Editing documentation from UI
- Viewing full commit diff in UI

---

## 11. Questions

1. ~~Should the Mission Completion Panel be a tab or overlay?~~ **Tab in right panel**
2. Should we show a celebration animation on mission complete? **Nice to have, not required**
3. Should commit hash link to GitHub/GitLab if repo URL is known? **Future enhancement**
