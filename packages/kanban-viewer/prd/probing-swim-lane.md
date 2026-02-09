# PRD: Add Probing Stage Swim Lane & UI Refinements

## Overview

The A(i)-Team pipeline has been updated to include a new **probing** stage where Amy (the Investigator) probes every feature for bugs before it moves to `done/`. This PRD covers:

1. Adding the probing swim lane to the kanban viewer
2. Agent badges on work item cards
3. Wider Live Feed panel
4. Tighter, right-aligned agent status bar

## Background

### Pipeline Change

The pipeline flow has changed from:

```
testing → implementing → review → done
   ↑          ↑           ↑
Murdock     B.A.       Lynch
```

To:

```
testing → implementing → review → probing → done
   ↑          ↑           ↑         ↑
Murdock     B.A.       Lynch      Amy
```

### Amy's Role

Amy Allen is now part of the **standard pipeline** - every feature passes through her:

1. **Probing stage** - After Lynch approves, Amy probes the implementation
2. Execute the "Raptor Protocol" to find bugs beyond tests
3. **VERIFIED** → item moves to `done/`
4. **FLAG** → item is rejected back to `ready/` (counts toward 2-strike limit)

---

## Feature 1: Probing Stage Swim Lane

### Requirements

1. Add `probing` to the Stage type in the type definitions
2. Add `probing` to the VALID_STAGES array in stage-utils
3. Render probing column between Review and Done

### Column Order

```
Briefings | Ready | Testing | Implementing | Review | Probing | Done | Blocked
```

### Column Styling

| Property | Value | Rationale |
|----------|-------|-----------|
| Header Color | Purple/Violet (`#8b5cf6`) | Matches Amy's investigative theme |
| Header Text | "PROBING" | Stage name, uppercase like others |
| Column Background | Dark purple tint `#2d2438` (dark mode) | Consistent with theme |

### WIP Limit Support

- Default WIP limit: 3 (same as review)
- Show current/limit in column header (e.g., "2/3")
- Read `wip_limits.probing` from `board.json`
- Apply visual warning when at limit

### Animation Support

Card animations should work for these transitions:
- `review` → `probing` (rightward)
- `probing` → `done` (rightward, VERIFIED)
- `probing` → `ready` (leftward, FLAG/rejection)

### Backward Compatibility

- If `phases.probing` is missing from board.json, treat as empty array
- If `wip_limits.probing` is missing, default to 3

---

## Feature 2: Agent Badges on Work Item Cards

### Current State

Work item cards do not show which agent is assigned. Users must look at the agent status bar at the bottom to see assignments.

### Target Design

Each work item card displays the assigned agent at the bottom:

```
┌─────────────────────────────┐
│ 009                         │
│ Auth Unit Tests             │
│ ┌──────┐                    │
│ │ test │                    │
│ └──────┘                    │
│                             │
│ ● 👤 Murdock                │
└─────────────────────────────┘
```

### Badge Specification

| Element | Description |
|---------|-------------|
| Status dot | Colored dot indicating active (yellow/green) or idle (gray) |
| Person icon | Small user/person icon |
| Agent name | Agent name in their assigned color |
| Position | Bottom-left of card, below type badge |
| Visibility | Only shown when an agent is assigned |

### Agent Colors

| Agent | Color | Hex |
|-------|-------|-----|
| Hannibal | Green | `#22c55e` |
| Face | Cyan | `#06b6d4` |
| Murdock | Yellow/Orange | `#f59e0b` |
| B.A. | Red | `#ef4444` |
| Amy | Purple | `#8b5cf6` |
| Lynch | Blue | `#3b82f6` |

---

## Feature 3: Wider Live Feed Panel

### Current State

The Live Feed panel is narrow (~300px), causing log entries to wrap awkwardly and truncate important information.

### Target Design

Increase panel width to accommodate longer log messages without excessive wrapping.

### Specifications

| Property | Current | Target |
|----------|---------|--------|
| Panel width | ~300px | ~400px |
| Min width | none | 350px |
| Max width | none | 500px |
| Log entry format | Wrapped | Single line where possible |

### Log Entry Format

```
10:42:15 [B.A.] Implementing JWT token refresh logic
10:42:12 [Face] Styling login form with design tokens
10:42:08 [Murdock] Running auth integration tests
```

Each entry should have:
- Timestamp in HH:MM:SS format
- Agent name in brackets, colored by agent
- Message text

---

## Feature 4: Agent Status Bar Layout

### Current State

Agent status bar spans full width with agents spread evenly, leaving excessive whitespace.

### Target Design

Agents grouped tightly on the right, with "AGENTS" label on the left.

**Current layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [H] Hannibal     [F] Face     [M] Murdock     [B] B.A.     [A] Amy     [L] Lynch  │
│      ● IDLE           ● IDLE       ● IDLE          ● IDLE       ● IDLE      ● IDLE │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Target layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AGENTS                    [H] Hannibal [F] Face [M] Murdock [B] B.A. [A] Amy [L] Lynch │
│                               ● WATCHING  ● IDLE   ● ACTIVE    ● ACTIVE  ● IDLE  ● IDLE │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Specifications

| Element | Specification |
|---------|---------------|
| "AGENTS" label | Left-aligned, muted text color, uppercase |
| Agent group | Right-aligned, compact spacing |
| Agent spacing | 16-24px between agents (reduced from current) |
| Agent display | Circle avatar with letter, name, status dot + text below |

### Agent Status States

- **WATCHING** - Hannibal observing (green dot)
- **ACTIVE** - Agent working on an item (yellow/orange dot)
- **IDLE** - Agent available (gray dot)

---

## Acceptance Criteria

### Probing Stage
- [ ] `probing` is a valid Stage type
- [ ] Probing column renders between Review and Done
- [ ] Items can transition: `review` → `probing` → `done`
- [ ] Items can transition: `probing` → `ready` (FLAG rejection)
- [ ] WIP limit displays correctly (default: 3)
- [ ] Column has purple header matching Amy's theme
- [ ] Card animations work for probing transitions
- [ ] SSE `item-moved` events handled for probing stage

### Agent Badges on Cards
- [ ] Cards display assigned agent at bottom when assigned
- [ ] Badge shows: status dot, person icon, agent name
- [ ] Agent name uses agent's assigned color
- [ ] Badge hidden when no agent assigned
- [ ] All six agents have correct colors

### Live Feed Panel
- [ ] Panel width increased to ~400px
- [ ] Min/max width constraints applied (350-500px)
- [ ] Log entries display on single line where possible
- [ ] Timestamp format is HH:MM:SS
- [ ] Agent names colored in log entries

### Agent Status Bar
- [ ] "AGENTS" label on left side
- [ ] All agents grouped and right-aligned
- [ ] Compact spacing between agents (16-24px)
- [ ] Each agent shows: avatar circle, name, status
- [ ] Status shows WATCHING/ACTIVE/IDLE correctly

### Tests
- [ ] Stage type tests include probing
- [ ] Board column tests include probing column
- [ ] Work item card tests cover agent badge
- [ ] Agent status bar tests cover new layout

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add 'probing' to Stage type |
| `src/lib/stage-utils.ts` | Add 'probing' to VALID_STAGES |
| `src/app/page.tsx` | Render probing column, adjust Live Feed width |
| `src/components/board-column.tsx` | Handle probing column styling |
| `src/components/responsive-board.tsx` | Include probing in column order |
| `src/components/work-item-card.tsx` | Add agent badge at bottom |
| `src/components/live-feed-panel.tsx` | Increase width, adjust log styling |
| `src/components/agent-status-bar.tsx` | Compact layout, right-align, add label |

---

## Out of Scope

- Detailed Amy investigation UI (just show status)
- Manual item movement (SSE-driven only)
- Amy-specific tooltips or help text
- Probing stage metrics/analytics
- Resizable Live Feed panel

---

## Related Changes

This PRD depends on A(i)-Team plugin changes already completed:
- `lib/board.js` - Added 'probing' stage
- `lib/validate.js` - Added 'probing' to STAGES
- `agents/hannibal.md` - Updated orchestration loop
- `agents/amy.md` - Updated role description
- `scripts/mission-init.js` - Creates probing/ directory
