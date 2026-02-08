# Product Requirements Document: Kanban Board UI

## Overview
A web-based kanban board that visualizes work items stored in the A(i)-Team API database. The board provides real-time visibility into work pipeline stages by fetching data from REST API endpoints and displaying them as interactive cards.

## Objectives
- Provide visual oversight of work items across pipeline stages
- Enable quick identification of bottlenecks and blocked items
- Display real-time board statistics and WIP limits
- Support responsive viewing across devices

## Tech Stack

### Core
- **Language**: TypeScript (strict mode)
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19

### Styling & Components
- **Component Library**: shadcn/ui
- **CSS Framework**: Tailwind CSS

### Real-time
- **Updates**: Server-Sent Events (SSE)
- **Data Source**: A(i)-Team REST API polling + SSE push

### Testing
- **Unit Tests**: Vitest
- **Integration Tests**: Playwright

### Data Storage
- **Database**: A(i)-Team API database (persistent, multi-project)
- **State**: API endpoints (items, board, missions)
- **Metadata**: API responses with board state, WIP limits, agent assignments

## Data Source

### API Architecture

All data is served by the A(i)-Team REST API. The Kanban UI fetches data via HTTP requests with the `X-Project-ID` header for multi-project isolation.

**Pipeline Stages:**
- `briefings` - Backlog stage (Face creates items here)
- `ready` - Ready to start (dependencies met)
- `testing` - Murdock writing tests
- `implementing` - B.A. implementing
- `review` - Lynch reviewing
- `probing` - Amy investigating for bugs beyond tests
- `done` - Completed work
- `blocked` - Blocked items requiring human intervention

### Work Item Format
Each work item is a markdown file with YAML frontmatter:

```yaml
---
id: "work-item-123"
title: "Implement user authentication"
type: "feature" # feature | bug | enhancement | task
status: "implementing"
assigned_agent: "developer-agent-1"
rejection_count: 0
dependencies: ["work-item-100", "work-item-101"]
outputs:
  test: "tests/auth.test.ts"
  impl: "src/auth/index.ts"
  types: "src/auth/types.ts"
created_at: "2026-01-15T10:30:00Z"
updated_at: "2026-01-15T14:20:00Z"
---

# Implementation Notes
Detailed description and notes go here...
```

### Board Metadata (from API)

**IMPORTANT: The API database is the source of truth for the kanban UI.**

The API returns board state via `GET /api/projects/:projectId/board`.

```json
{
  "mission": {
    "name": "Project Nightfall Auth System",
    "started_at": "2026-01-15T10:00:00Z",
    "status": "active"
  },
  "wip_limits": {
    "testing": 2,
    "implementing": 3,
    "review": 2
  },
  "phases": {
    "briefings": ["013", "014", "015", "016"],
    "ready": ["010", "011", "012"],
    "testing": ["009", "025"],
    "implementing": ["007", "008"],
    "review": ["006"],
    "probing": ["004", "005"],
    "done": ["001", "002", "003"],
    "blocked": []
  },
  "assignments": {
    "009": {"agent": "Murdock", "task_id": "task-abc123", "started_at": "2026-01-15T10:41:00Z"},
    "025": {"agent": "Murdock", "task_id": "task-abc124", "started_at": "2026-01-15T10:41:30Z"},
    "007": {"agent": "B.A.", "task_id": "task-def456", "started_at": "2026-01-15T10:40:00Z"},
    "008": {"agent": "Face", "task_id": "task-def457", "started_at": "2026-01-15T10:40:30Z"}
  },
  "agents": {
    "Hannibal": {"status": "watching"},
    "Face": {"status": "active", "current_item": "008"},
    "Sosa": {"status": "idle"},
    "Murdock": {"status": "active", "current_item": "009"},
    "B.A.": {"status": "active", "current_item": "007"},
    "Lynch": {"status": "idle"},
    "Amy": {"status": "active", "current_item": "004"},
    "Tawnia": {"status": "idle"}
  },
  "stats": {
    "total_items": 26,
    "completed": 5,
    "in_progress": 4,
    "blocked": 0,
    "backlog": 7
  },
  "last_updated": "2026-01-15T10:42:15Z"
}
```

### Activity Log (from API)

**Activity feed served via the API for the Live Feed.**

Agents log events via the `activity_log` / `log` MCP tools, which POST to the API.

```
2026-01-15T10:42:15Z [B.A.] Implementing JWT token refresh logic
2026-01-15T10:42:12Z [Face] Styling login form with design tokens
2026-01-15T10:42:08Z [Murdock] Running auth integration tests
2026-01-15T10:42:03Z [B.A.] Writing src/services/auth.ts
2026-01-15T10:42:01Z [B.A.] Tests passing: 12/12
2026-01-15T10:41:58Z [Murdock] Created 14 test cases for auth module
2026-01-15T10:41:52Z [Face] Completed form validation logic
2026-01-15T10:41:45Z [Hannibal] Dispatching 007, 008, 009 to agents
2026-01-15T10:41:40Z [Lynch] APPROVED 006-database-schema
2026-01-15T10:41:35Z [Lynch] Reviewing database migration scripts
2026-01-15T10:41:22Z [Hannibal] Mission progress: 50% complete
2026-01-15T10:41:00Z [Hannibal] ALERT: Item 024 requires human input
```

**Log format:** `{ISO timestamp} [{Agent}] {Action message}`

**Special prefixes for highlighting:**
- `APPROVED` - Green highlight
- `REJECTED` - Red highlight
- `ALERT:` - Yellow/warning highlight

### Data Flow: Who Does What

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT RESPONSIBILITIES                             │
├─────────────┬───────────────────────────────────────────────────────────────┤
│   AGENT     │   ACTIONS                                                     │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   Face      │  • Creates work items via item_create MCP tool               │
│             │  • Sets initial fields (id, title, type, dependencies)       │
│             │                                                               │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   Sosa      │  • Reviews work item decomposition                           │
│             │  • Asks clarifying questions, provides critique              │
│             │  • Does NOT modify items directly                            │
│             │                                                               │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   Hannibal  │  • Moves items between stages via board_move MCP tool        │
│             │  • Manages assignments via agent_start/agent_stop             │
│             │  • Logs activity via activity_log MCP tool                   │
│             │  • Orchestrates pipeline flow                                │
│             │                                                               │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   Murdock   │  • Creates test files at outputs.test path                   │
│             │  • Creates type files at outputs.types path (if specified)   │
│             │  • Signals completion via agent_stop MCP tool                │
│             │                                                               │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   B.A.      │  • Creates implementation files at outputs.impl path         │
│             │  • Signals completion via agent_stop MCP tool                │
│             │                                                               │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   Lynch     │  • Reports APPROVED or REJECTED verdict                      │
│             │  • Does NOT write files directly                             │
│             │                                                               │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   Amy       │  • Probes features for bugs beyond tests (Raptor Protocol)  │
│             │  • Does NOT write production code or tests                   │
│             │  • Reports findings with proof                               │
│             │                                                               │
├─────────────┼───────────────────────────────────────────────────────────────┤
│             │                                                               │
│   Tawnia    │  • Updates documentation (CHANGELOG, README, docs/)          │
│             │  • Creates final commit bundling all mission work            │
│             │  • Does NOT modify source code or tests                      │
│             │                                                               │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

### API Events (for real-time updates)

The kanban UI receives updates via SSE or API polling:

| Event | Trigger | UI Update |
|-------|---------|-----------|
| `item-added` | Face creates work item via API | Add card to Briefings column |
| `item-moved` | board_move MCP tool advances item | Move card to new column |
| `item-deleted` | Item removed via API | Remove card from board |
| `board-updated` | Board state changes | Refresh stats, assignments, agent status |
| `activity-logged` | Agent logs via activity_log tool | Add entry to Live Feed |
| `item-updated` | Item fields modified via API | Update card (rejection badge, etc.) |

## Functional Requirements

### FR-1: Board Columns
- Display 8 columns representing pipeline stages: **Briefings → Ready → Testing → Implementing → Review → Probing → Done → Blocked**
- Columns ordered left-to-right following work progression
- Each column header shows: stage name + item count
- WIP limit indicator on applicable columns (testing, implementing, review, probing)
- Visual warning when WIP limit exceeded

### FR-2: Work Item Cards
Each card displays:
- **ID**: Three-digit identifier (top-left, subtle gray)
- **Title**: Work item title (prominent, multi-line if needed)
- **Type badge**: Colored pill indicating work type
  - `implementation` = Teal/Cyan
  - `interface` = Blue
  - `integration` = Purple
  - `test` = Green
- **Assigned agent**: Colored dot + agent name (only when in active stage)
- **Dependency blocker**: Link icon (⛓) + count when blocked by unfinished dependencies
- **Rejection warning**: Triangle icon (⚠) + count when rejection_count > 0

### FR-3: Dependency Blocking Indicator
- Cards with unmet dependencies show ⛓ icon with dependency count
- **Hover tooltip** reveals blocker details:
  ```
  ┌──────────────────┐
  │ v0 block         │
  │ Blocked by: 009  │
  └──────────────────┘
  ```
- Blocked cards cannot progress until dependencies complete
- Visual distinction from "Blocked" column (dependency block vs. human intervention needed)

### FR-4: Rejection Warning Badge
- Cards with rejection_count > 0 show ⚠ badge with count
- Badge appears in top-right corner of card
- Yellow/orange color to indicate warning state
- Tooltip shows rejection history on hover

### FR-5: Header Bar
Display mission-level information:
- **Status indicator**: Green dot = active, Yellow = paused, Red = blocked
- **Mission name**: Current project/mission title
- **WIP indicator**: Current in-flight / max WIP limit (e.g., "4/5")
- **Progress bar**: Visual bar showing done/total items (e.g., "12/26")
- **Mission timer**: Elapsed time since mission start (HH:MM:SS)

### FR-6: Live Feed Panel (Right Side)
- **Tabs**: Live Feed | Human Input (with notification badge) | Git | + New Mission
- **System Log**: Scrolling list of agent activity
  - Timestamp + [Agent name] + Action description
  - Agent names color-coded to match their assigned color
  - Special highlighting for: APPROVED, REJECTED, ALERT messages
- Real-time updates via SSE
- Auto-scroll to latest entries

### FR-7: Agent Status Bar (Bottom)
- Display all 8 agents with status:
  - **Hannibal**: ● WATCHING (always orchestrating)
  - **Face/Sosa/Murdock/B.A./Lynch/Amy/Tawnia**: ● ACTIVE or ○ IDLE
- Agent initial in circle (ⓗ ⓕ ⓢ ⓜ ⓑ ⓛ ⓐ ⓣ)
- Colored dot indicates current state
- Shows which agents are currently working

### FR-8: Real-time Updates via SSE
- Server polls A(i)-Team API for changes or receives webhook notifications
- Push updates to client via Server-Sent Events (SSE) endpoint
- Client connects to `/api/board/events` SSE stream on load
- Events include: `item-added`, `item-moved`, `item-updated`, `item-deleted`, `board-updated`, `agent-status-changed`, `activity-logged`
- Update UI immediately without polling
- Visual flash/highlight when card updates
- Auto-reconnect if SSE connection drops

### FR-9: Responsive Design
- Desktop: Full board view with all columns + right panel visible
- Tablet: Scrollable horizontal board, collapsible right panel
- Mobile: Single column view with stage selector/tabs, bottom sheet for live feed

## Non-Functional Requirements

### NFR-1: Performance
- Initial board load < 2 seconds
- Card rendering optimized (virtualization for 100+ items)
- Smooth animations and transitions

### NFR-2: Accessibility
- Keyboard navigation support
- Screen reader compatible
- ARIA labels for all interactive elements
- Color contrast meets WCAG 2.1 AA standards

### NFR-3: Error Handling
- Graceful handling of missing files or malformed YAML
- Display error state for parsing failures
- Continue showing valid cards even if some fail to parse

### NFR-4: Scalability
- Support boards with 200+ work items
- Efficient file watching without excessive I/O
- Minimal re-renders when data changes

## User Interface

### Master Layout
```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● MISSION ACTIVE   Project Nightfall Auth System          ⑂ WIP: 4/5   ⊙ 12/26 ████░░   ⏱ 00:23:51 │
├──────────────────────────────────────────────────────────────┬─────────────────────────────────┤
│                                                              │ ⦿ Live Feed │ 💬 Human Input• │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │ ⎇ Git    │ + New Mission  │
│  │ BRIEFINGS  4│ │   READY    3│ │  TESTING   2│ │IMPLEMENTING 2│    ├─────────────────────────────┤
│  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤    │ >_ SYSTEM LOG               │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │    │                             │
│  │ │   013   │ │ │ │   010   │ │ │ │   009   │ │ │ │   007   │ │    │ 10:42:15 [B.A.] Implementing│
│  │ │ Payment │ │ │ │ Session │ │ │ │Auth Unit│ │ │ │Auth Svc │ │    │   JWT token refresh logic   │
│  │ │Processing│ │ │ │ Mgmt   │ │ │ │ Tests   │ │ │ │  Impl   │ │    │ 10:42:12 [Face] Styling     │
│  │ │ Module  │ │ │ │        │ │ │ │ ┌─────┐ │ │ │ │ ┌─────┐ │ │    │   login form with tokens    │
│  │ │┌──────┐ │ │ │ │┌──────┐│ │ │ │ │test │ │ │ │ │ │impl │ │ │    │ 10:42:08 [Murdock] Running  │
│  │ ││ impl ││ │ │ ││ impl ││ │ │ │ └─────┘ │ │ │ │ └─────┘ │ │    │   auth integration tests    │
│  │ │└──────┘ │ │ │ │└──────┘│ │ │ │ ● Murdock│ │ │ │ ● B.A.  │ │    │ 10:42:03 [B.A.] Writing     │
│  │ └─────────┘ │ │ │  ⛓ 1   │ │ │ └─────────┘ │ │ └─────────┘ │    │   src/services/auth.ts      │
│  │ ┌─────────┐ │ │ └─────────┘ │ │ ┌─────────┐ │ │ ┌─────────┐ │    │ 10:42:01 [B.A.] Tests       │
│  │ │   014   │ │ │ ┌─────────┐ │ │ │   025   │ │ │ │   008   │ │    │   passing: 12/12            │
│  │ │ Email   │ │ │ │   011   │ │ │ │ Login  │ │ │ │ Login   │ │    │ 10:41:58 [Murdock] Created  │
│  │ │Notifica-│ │ │ │ Input  │ │ │ │ Form   │ │ │ │ Form    │ │    │   14 test cases for auth    │
│  │ │  tion   │ │ │ │ Valid  │ │ │ │ Valid  │ │ │ │Component│ │    │ 10:41:52 [Face] Completed   │
│  │ │┌──────┐ │ │ │ │ Utils  │ │ │ │ Tests  │ │ │ │ ⚠ 2    │ │    │   form validation logic     │
│  │ ││integ ││ │ │ │┌──────┐│ │ │ │ ⚠ 1   │ │ │ │┌──────┐│ │    │ 10:41:45 [Hannibal] Dispatch│
│  │ │└──────┘ │ │ │ ││ impl ││ │ │ │┌─────┐│ │ │ ││iface ││ │    │   007, 008, 009 to agents   │
│  │ │  ⛓ 1   │ │ │ │└──────┘│ │ │ ││test ││ │ │ │└──────┘│ │    │ 10:41:40 [Lynch] APPROVED   │
│  │ └─────────┘ │ │ └─────────┘ │ │ │└─────┘│ │ │ │  ⛓ 1  │ │    │   006-database-schema       │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ │● Murdock│ │ │ │ ● Face │ │    │ 10:41:35 [Lynch] Reviewing  │
│  │ │   015   │ │ │ │   012   │ │ │ └─────────┘ │ │ └─────────┘ │    │   database migration scripts│
│  │ │ Rate    │ │ │ │ Error  │ │ │             │ │             │    │ 10:41:22 [Hannibal] Mission │
│  │ │Limiting │ │ │ │Boundary│ │ │             │ │             │    │   progress: 50% complete    │
│  │ │Middleware│ │ │ │ Comp  │ │ │             │ │             │    │ 10:41:00 [Hannibal] ALERT:  │
│  │ │┌──────┐ │ │ │ │┌──────┐│ │ │             │ │             │    │   Item 024 needs human input│
│  │ ││ impl ││ │ │ ││iface ││ │ │             │ │             │    │                             │
│  │ │└──────┘ │ │ │ │└──────┘│ │ │             │ │             │    │                             │
│  │ └─────────┘ │ │ └─────────┘ │ │             │ │             │    │                             │
│  │ ┌─────────┐ │ │             │ │             │ │             │    │                             │
│  │ │   016   │ │ │             │ │             │ │             │    │                             │
│  │ │Analytics│ │ │             │ │             │ │             │    │                             │
│  │ │Dashboard│ │ │             │ │             │ │             │    │                             │
│  │ │┌──────┐ │ │ │             │ │             │ │             │    │                             │
│  │ ││iface ││ │ │             │ │             │ │             │    │                             │
│  │ │└──────┘ │ │ │             │ │             │ │             │    │                             │
│  │ │  ⛓ 2   │ │ │             │ │             │ │             │    │                             │
│  │ └─────────┘ │ │             │ │             │ │             │    │                             │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │                             │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ AGENTS  ⓗ Hannibal ● WATCHING  ⓕ Face ○ IDLE  ⓢ Sosa ○ IDLE  ⓜ Murdock ● ACTIVE  ⓑ B.A. ● ACTIVE  ⓛ Lynch ○ IDLE  ⓐ Amy ● ACTIVE  ⓣ Tawnia ○ IDLE │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Header Bar
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ● MISSION ACTIVE   Project Name                    ⑂ WIP: 4/5   ⊙ 12/26 ████░░   ⏱ 00:23:51 │
└────────────────────────────────────────────────────────────────────────────────────────┘
  │                    │                               │          │              │
  │                    │                               │          │              └─ Mission timer
  │                    │                               │          └─ Progress bar (done/total)
  │                    │                               └─ WIP limit (current/max)
  │                    └─ Mission/project name
  └─ Status indicator (green = active, yellow = paused, red = blocked)
```

### Column Header
```
┌─────────────────┐
│ TESTING       2 │  ← Stage name + item count
├─────────────────┤
│                 │
```

### Card Design - Standard
```
┌─────────────────────────┐
│ 013                     │  ← Item ID (top-left, subtle)
│ Payment Processing      │  ← Title (prominent)
│ Module                  │
│ ┌──────────────┐        │
│ │ implementation│        │  ← Type badge (colored)
│ └──────────────┘        │
└─────────────────────────┘
```

### Card Design - With Dependency Blocker
```
┌─────────────────────────┐
│ 010                     │
│ Session Management      │
│ ┌──────────────┐        │
│ │ implementation│        │  ← Type badge
│ └──────────────┘        │
│                  ⛓ 1   │  ← Dependency link icon + count
└─────────────────────────┘   (BLOCKED by another card)
        │
        └─────────────────────┐
                              ▼
                   ┌──────────────────┐
                   │ v0 block         │  ← Hover tooltip shows blocker
                   │ Blocked by: 009  │
                   └──────────────────┘
```

### Card Design - With Rejection Warning
```
┌─────────────────────────┐
│ 025              ⚠ 1   │  ← Rejection count (yellow/orange warning)
│ Login Form Validation   │
│ Tests                   │
│ ┌──────┐                │
│ │ test │                │  ← Type badge
│ └──────┘                │
│ ● Murdock               │  ← Assigned agent (colored dot + name)
└─────────────────────────┘
```

### Card Design - In Progress (Assigned)
```
┌─────────────────────────┐
│ 007                     │
│ Auth Service            │
│ Implementation          │
│ ┌──────────────┐        │
│ │ implementation│        │
│ └──────────────┘        │
│ ● B.A.                  │  ← Agent dot (color matches agent) + name
└─────────────────────────┘
     │
     └─ Agent colors:
        ● Hannibal = Blue
        ● Face     = Green
        ● Sosa     = Teal
        ● Murdock  = Yellow
        ● B.A.     = Red/Orange
        ● Lynch    = Purple
        ● Amy      = Pink
        ● Tawnia   = Cyan
```

### Type Badges (Color Reference)
```
┌──────────────┐
│ implementation│  ← Teal/Cyan background
└──────────────┘

┌──────────┐
│ interface │      ← Blue background
└──────────┘

┌───────────┐
│integration│      ← Purple background
└───────────┘

┌──────┐
│ test │           ← Green background
└──────┘
```

### Right Panel - Live Feed
```
┌─────────────────────────────────┐
│ ⦿ Live Feed │ 💬 Human Input• │  ← Tabs (• = notification badge)
│ ⎇ Git       │ + New Mission   │
├─────────────────────────────────┤
│ >_ SYSTEM LOG                   │
│                                 │
│ 10:42:15 [B.A.] Implementing    │  ← Timestamp + [Agent] + Action
│   JWT token refresh logic       │
│ 10:42:12 [Face] Styling login   │
│   form with design tokens       │
│ 10:42:08 [Murdock] Running      │
│   auth integration tests        │
│ 10:42:01 [B.A.] Tests passing:  │
│   12/12                         │
│ 10:41:45 [Hannibal] Dispatching │
│   007, 008, 009 to agents       │
│ 10:41:40 [Lynch] APPROVED       │  ← Approval/rejection highlighted
│   006-database-schema           │
│ 10:41:00 [Hannibal] ALERT:      │  ← Alerts in warning color
│   Item 024 requires human input │
│                                 │
└─────────────────────────────────┘
```

### Agent Status Bar
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ AGENTS  ⓗ Hannibal   ⓕ Face     ⓢ Sosa     ⓜ Murdock   ⓑ B.A.      ⓛ Lynch    ⓐ Amy      ⓣ Tawnia     │
│         ● WATCHING   ○ IDLE    ○ IDLE    ● ACTIVE    ● ACTIVE    ○ IDLE    ● ACTIVE   ○ IDLE       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Status states:
  ● ACTIVE   = Currently working on a task
  ● WATCHING = Orchestrating/monitoring (Hannibal only)
  ○ IDLE     = Available, no current task
```

## API/Data Layer

### A(i)-Team API Routes
- `GET /api/projects/:projectId/board` - Fetch board metadata (stages, WIP limits, assignments)
- `GET /api/projects/:projectId/items` - Fetch all work items across stages
- `GET /api/projects/:projectId/items?stage=:stage` - Fetch items for specific stage
- `GET /api/projects/:projectId/items/:id` - Fetch single work item with full content
- `GET /api/projects/:projectId/activity` - Fetch activity feed entries
- `GET /api/projects/:projectId/missions/current` - Fetch current mission metadata
- `GET /api/board/events` - SSE endpoint for real-time updates

### SSE Event Format
```typescript
interface BoardEvent {
  type: 'item-added' | 'item-moved' | 'item-updated' | 'item-deleted' | 'board-updated';
  timestamp: string;
  data: {
    itemId?: string;
    fromStage?: string;
    toStage?: string;
    item?: WorkItem;
    board?: BoardMetadata;
  };
}
```

### Response Format
```typescript
interface WorkItem {
  id: string;
  title: string;
  type: 'feature' | 'bug' | 'enhancement' | 'task';
  status: string;
  assigned_agent?: string;
  rejection_count: number;
  dependencies: string[];
  outputs: {
    test?: string;
    impl?: string;
    types?: string;
  };
  created_at: string;
  updated_at: string;
  stage: string; // folder name
  content: string; // markdown body
}

interface BoardMetadata {
  wip_limits: Record<string, number>;
  stats: {
    total_items: number;
    completed: number;
    in_progress: number;
    blocked: number;
    backlog: number;
  };
  last_updated: string;
}
```

## Implementation Phases

### Phase 1: MVP (Core Board View)
- Read filesystem structure
- Display static board with columns
- Render work item cards with basic info
- Show board statistics

### Phase 2: Real-time Updates
- Implement polling mechanism
- Update cards when files change
- Handle file moves between folders

### Phase 3: Enhanced UX
- Add animations and transitions
- Implement responsive design
- Add keyboard navigation
- Improve card hover states

### Phase 4: Advanced Features
- Search/filter work items
- Click card to view full details
- Export board snapshot
- Dark mode support

## Testing Strategy

### Unit Tests (Vitest) - Critical Path Only
Test the functions that, if broken, break the app:
- Parse API response → WorkItem object (valid input)
- Parse API response → error handling (malformed response)
- Calculate board stats from work items
- Format SSE event payload
- Map item stageId to board column

### Integration Tests (Playwright)
- Board loads and displays all columns
- Cards render with correct data
- SSE connection establishes and receives updates
- API data changes trigger UI updates
- Responsive layout at different viewports
- Keyboard navigation works
- Error states display correctly

## Success Metrics
- Board loads in < 2 seconds with 100 work items
- Updates reflect within 500ms of API data changes (via SSE)
- SSE connection stays stable for 1+ hour sessions
- Zero parsing errors on well-formed API responses
- 100% keyboard navigable
- Critical path unit tests pass
- All Playwright integration tests pass

## Out of Scope (Future Considerations)
- Drag-and-drop to move items between stages
- Inline editing of work items
- User authentication/authorization
- Multi-board support
- Historical data/analytics
- Real-time collaboration (WebSocket)

## Technical Considerations

### Data Refresh Strategy (API Polling + SSE)
- Poll A(i)-Team API at configurable interval (default 2s) for board state changes
- Compare previous response with current to detect item additions, moves, updates
- Debounce rapid changes (100ms) to batch related UI updates
- Detect stage changes by comparing item stageId fields
- Broadcast changes to all connected SSE clients
- Cache API responses, only re-fetch when last_updated changes

### SSE Implementation
- Next.js API route returns `ReadableStream` with `text/event-stream` content type
- Maintain set of connected clients for broadcasting
- Send heartbeat every 30s to keep connection alive
- Client uses `EventSource` API with auto-reconnect
- Clean up polling intervals and client connections on server shutdown

### Performance Optimizations
- Implement virtual scrolling for large card lists
- Memoize card components to prevent unnecessary re-renders
- Use React.memo() and useMemo() strategically
- Lazy load card details until hover/click

### Error Scenarios
- API unreachable: Show connection error banner with retry
- Malformed API response: Skip card with error indicator
- Empty stage: Show empty column
- API authentication error: Display error banner with guidance

## Dependencies

### Production
- `next` - Framework (v16, App Router)
- `react` / `react-dom` - UI library (v19)
- `tailwindcss` - CSS framework
- `shadcn/ui` - Component library (installed via CLI)
- `swr` or `@tanstack/react-query` - API data fetching and caching
- `lucide-react` - Icons (used by shadcn)

### Development
- `typescript` - Type checking
- `vitest` - Unit testing
- `@playwright/test` - Integration testing
- `@types/node` / `@types/react` - Type definitions

### Built-in (no install)
- `fetch` - API requests (browser/Node.js built-in)
- `EventSource` - SSE client (browser API)

## Acceptance Criteria

### Board Layout
- [ ] All 8 stage columns display: Briefings → Ready → Testing → Implementing → Review → Probing → Done → Blocked
- [ ] Columns show stage name and item count in header
- [ ] Work items appear in correct stage columns based on filesystem location

### Card Display
- [ ] Card shows ID (three-digit, top-left)
- [ ] Card shows title (prominent, multi-line supported)
- [ ] Card shows type badge with correct color (implementation/interface/integration/test)
- [ ] Cards in active stages show assigned agent with colored dot
- [ ] Dependency blocker (⛓) appears with count when dependencies unmet
- [ ] Hover on ⛓ shows tooltip with blocker item ID
- [ ] Rejection warning (⚠) appears with count when rejection_count > 0

### Header Bar
- [ ] Mission status indicator (green/yellow/red dot)
- [ ] Mission name displays
- [ ] WIP indicator shows current/max (e.g., "4/5")
- [ ] Progress bar visualizes done/total items
- [ ] Mission timer counts up (HH:MM:SS)

### Live Feed Panel
- [ ] Live Feed tab shows system log with timestamps
- [ ] Agent names color-coded in log entries
- [ ] APPROVED/REJECTED/ALERT entries highlighted
- [ ] Human Input tab shows notification badge when items need attention
- [ ] Log auto-scrolls to latest entries

### Agent Status Bar
- [ ] All 8 agents displayed (Hannibal, Face, Sosa, Murdock, B.A., Lynch, Amy, Tawnia)
- [ ] Agent status shows WATCHING/ACTIVE/IDLE
- [ ] Status updates in real-time when agents start/stop work

### Real-time Updates
- [ ] SSE connection established on page load
- [ ] Board updates within 500ms of API data changes
- [ ] SSE auto-reconnects if connection drops
- [ ] Visual flash/highlight when card updates

### Performance & Error Handling
- [ ] Board loads in < 2 seconds with 100 work items
- [ ] No errors with 200+ work items
- [ ] Handles malformed markdown gracefully (shows error state, doesn't crash)
- [ ] Responsive on mobile, tablet, and desktop

## Questions for Stakeholders
1. ~~Should cards be clickable to view full markdown content?~~ **Yes - show modal with full details**
2. ~~Is manual refresh acceptable or must updates be automatic?~~ **Automatic via SSE**
3. ~~What permissions/authentication needed (if any)?~~ **None for MVP**
4. ~~Should there be any filtering/sorting capabilities in MVP?~~ **Not in MVP**
5. ~~Preferred color scheme/branding guidelines?~~ **Dark theme as shown in mockups**
