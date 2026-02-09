# PRD: Kanban Viewer API + Storage Layer

**Version:** 1.0.0  
**Status:** Draft  
**Author:** Josh / Claude  
**Date:** 2026-01-21  
**Repo:** `kanban-viewer`

---

## 1. Overview

### 1.1 Problem Statement

The Kanban Viewer dashboard currently uses file-based storage (`board.json`). This approach has limitations:

1. **Race conditions** - Parallel agents can corrupt state with concurrent writes
2. **No API** - External tools (like MCP servers) can't interact with the board programmatically
3. **No transaction safety** - Partial writes can leave board in inconsistent state

### 1.2 Solution

Extend Kanban Viewer with:
- SQLite database via Prisma ORM for ACID-compliant storage
- REST API endpoints for all board operations
- API serves as the **single source of truth** for board state

### 1.3 Scope

This PRD covers:
- Prisma schema and migrations
- Next.js API routes
- Request/response types

This PRD does NOT cover:
- MCP protocol handling (separate PRD)
- Dashboard UI changes (existing, reads from new data layer)

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kanban Viewer                             │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Dashboard UI   │    │   API Routes     │                   │
│  │   (React/Next)   │    │   /api/*         │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│              ┌─────────────────┐                                 │
│              │  Prisma Client  │                                 │
│              └────────┬────────┘                                 │
│                       ▼                                          │
│              ┌─────────────────┐                                 │
│              │     SQLite      │                                 │
│              │   ateam.db      │                                 │
│              └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
                        ▲
                        │ HTTP
                        │
              ┌─────────────────┐
              │  MCP Server     │
              │  (separate)     │
              └─────────────────┘
```

### 2.2 File Structure Changes

```
kanban-viewer/
├── prisma/
│   ├── schema.prisma            # NEW: Database schema
│   ├── migrations/              # NEW: Migration history
│   └── seed.ts                  # NEW: Initial stages, WIP limits
│
├── src/
│   ├── app/
│   │   ├── api/                 # NEW: API routes
│   │   │   ├── board/
│   │   │   │   ├── route.ts           # GET /api/board
│   │   │   │   ├── move/route.ts      # POST /api/board/move
│   │   │   │   ├── claim/route.ts     # POST /api/board/claim
│   │   │   │   └── release/route.ts   # POST /api/board/release
│   │   │   │
│   │   │   ├── items/
│   │   │   │   ├── route.ts           # GET, POST /api/items
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts       # GET, PATCH, DELETE /api/items/[id]
│   │   │   │   │   ├── reject/route.ts    # POST /api/items/[id]/reject
│   │   │   │   │   └── render/route.ts    # GET /api/items/[id]/render
│   │   │   │
│   │   │   ├── agents/
│   │   │   │   ├── start/route.ts     # POST /api/agents/start
│   │   │   │   └── stop/route.ts      # POST /api/agents/stop
│   │   │   │
│   │   │   ├── missions/
│   │   │   │   ├── route.ts           # GET, POST /api/missions
│   │   │   │   ├── current/route.ts   # GET /api/missions/current
│   │   │   │   ├── precheck/route.ts  # POST /api/missions/precheck
│   │   │   │   ├── postcheck/route.ts # POST /api/missions/postcheck
│   │   │   │   └── archive/route.ts   # POST /api/missions/archive
│   │   │   │
│   │   │   ├── deps/
│   │   │   │   └── check/route.ts     # GET /api/deps/check
│   │   │   │
│   │   │   └── activity/
│   │   │       └── route.ts           # GET, POST /api/activity
│   │   │
│   │   └── (existing dashboard pages)
│   │
│   ├── lib/
│   │   ├── db.ts                # NEW: Prisma client singleton
│   │   ├── validation.ts        # NEW: Stage transitions, WIP rules
│   │   └── errors.ts            # NEW: API error types
│   │
│   └── types/
│       ├── api.ts               # NEW: Request/response types
│       ├── board.ts             # NEW: Board domain types
│       ├── item.ts              # NEW: Item domain types
│       ├── agent.ts             # NEW: Agent domain types
│       └── mission.ts           # NEW: Mission domain types
│
├── package.json                 # Add: prisma, @prisma/client
└── .env.local                   # Add: DATABASE_URL
```

---

## 3. Data Model

### 3.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Stage {
  id       String  @id                    // 'backlog', 'ready', etc.
  name     String
  order    Int
  wipLimit Int?                           // null = unlimited
  items    Item[]
}

model Item {
  id             String    @id            // 'WI-001'
  title          String
  description    String
  type           String                   // 'feature' | 'bug' | 'chore' | 'spike'
  priority       String                   // 'critical' | 'high' | 'medium' | 'low'
  stageId        String
  stage          Stage     @relation(fields: [stageId], references: [id])
  assignedAgent  String?
  rejectionCount Int       @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  completedAt    DateTime?

  // Relations
  workLogs       WorkLog[]
  agentClaim     AgentClaim?
  missionItems   MissionItem[]
  
  // Dependencies (self-referential many-to-many)
  dependsOn      ItemDependency[] @relation("DependentItem")
  dependedOnBy   ItemDependency[] @relation("DependencyItem")
}

model ItemDependency {
  id           Int    @id @default(autoincrement())
  itemId       String
  dependsOnId  String
  
  item         Item   @relation("DependentItem", fields: [itemId], references: [id], onDelete: Cascade)
  dependsOn    Item   @relation("DependencyItem", fields: [dependsOnId], references: [id], onDelete: Cascade)

  @@unique([itemId, dependsOnId])
}

model WorkLog {
  id        Int      @id @default(autoincrement())
  itemId    String
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  agent     String
  action    String                        // 'started' | 'completed' | 'rejected' | 'note'
  summary   String
  timestamp DateTime @default(now())
}

model AgentClaim {
  agentName String   @id                  // 'Hannibal', 'Face', etc.
  itemId    String   @unique
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  claimedAt DateTime @default(now())
}

model Mission {
  id          String        @id           // 'M-20260121-001'
  name        String
  state       String                      // MissionState
  prdPath     String
  startedAt   DateTime      @default(now())
  completedAt DateTime?
  archivedAt  DateTime?
  
  items       MissionItem[]
  activities  ActivityLog[]
}

model MissionItem {
  id        Int     @id @default(autoincrement())
  missionId String
  itemId    String
  
  mission   Mission @relation(fields: [missionId], references: [id], onDelete: Cascade)
  item      Item    @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([missionId, itemId])
}

model ActivityLog {
  id        Int      @id @default(autoincrement())
  missionId String?
  mission   Mission? @relation(fields: [missionId], references: [id], onDelete: SetNull)
  agent     String?
  message   String
  level     String   @default("info")     // 'info' | 'warn' | 'error'
  timestamp DateTime @default(now())
}
```

### 3.2 TypeScript Types

```typescript
// src/types/board.ts

export type StageId = 
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'blocked';

export interface Stage {
  id: StageId;
  name: string;
  order: number;
  wipLimit: number | null;
}

export interface BoardState {
  stages: Stage[];
  items: ItemWithRelations[];
  claims: AgentClaim[];
  currentMission: Mission | null;
}

export interface WipStatus {
  stageId: StageId;
  limit: number | null;
  current: number;
  available: number | null;  // null if unlimited
}
```

```typescript
// src/types/item.ts

export type ItemType = 'feature' | 'bug' | 'chore' | 'spike';
export type ItemPriority = 'critical' | 'high' | 'medium' | 'low';
export type WorkLogAction = 'started' | 'completed' | 'rejected' | 'note';

export interface Item {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  priority: ItemPriority;
  stageId: StageId;
  assignedAgent: string | null;
  rejectionCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface ItemWithRelations extends Item {
  dependencies: string[];      // IDs of items this depends on
  workLogs: WorkLogEntry[];
}

export interface WorkLogEntry {
  id: number;
  agent: string;
  action: WorkLogAction;
  summary: string;
  timestamp: Date;
}
```

```typescript
// src/types/agent.ts

export type AgentName = 
  | 'Hannibal'
  | 'Face'
  | 'Murdock'
  | 'BA'
  | 'Lynch'
  | 'Amy'
  | 'Tawnia';

export interface AgentClaim {
  agentName: AgentName;
  itemId: string;
  claimedAt: Date;
}
```

```typescript
// src/types/mission.ts

export type MissionState = 
  | 'initializing'
  | 'prechecking'
  | 'running'
  | 'postchecking'
  | 'completed'
  | 'failed'
  | 'archived';

export interface Mission {
  id: string;
  name: string;
  state: MissionState;
  prdPath: string;
  startedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
}

export interface PrecheckResult {
  passed: boolean;
  lintErrors: number;
  testsPassed: number;
  testsFailed: number;
  blockers: string[];
}

export interface PostcheckResult {
  passed: boolean;
  lintErrors: number;
  unitTestsPassed: number;
  unitTestsFailed: number;
  e2eTestsPassed: number;
  e2eTestsFailed: number;
  blockers: string[];
}
```

```typescript
// src/types/api.ts

// ============ Board Endpoints ============

// GET /api/board
export interface GetBoardResponse {
  success: true;
  data: BoardState;
}

// POST /api/board/move
export interface MoveItemRequest {
  itemId: string;
  toStage: StageId;
  force?: boolean;  // Override WIP limits
}

export interface MoveItemResponse {
  success: true;
  data: {
    item: Item;
    previousStage: StageId;
    wipStatus: WipStatus;
  };
}

// POST /api/board/claim
export interface ClaimItemRequest {
  itemId: string;
  agent: AgentName;
}

export interface ClaimItemResponse {
  success: true;
  data: AgentClaim;
}

// POST /api/board/release
export interface ReleaseItemRequest {
  itemId: string;
}

export interface ReleaseItemResponse {
  success: true;
  data: {
    released: boolean;
    agent: AgentName;
  };
}

// ============ Item Endpoints ============

// POST /api/items
export interface CreateItemRequest {
  title: string;
  description: string;
  type: ItemType;
  priority: ItemPriority;
  dependencies?: string[];
}

export interface CreateItemResponse {
  success: true;
  data: ItemWithRelations;
}

// PATCH /api/items/[id]
export interface UpdateItemRequest {
  title?: string;
  description?: string;
  type?: ItemType;
  priority?: ItemPriority;
  dependencies?: string[];
}

export interface UpdateItemResponse {
  success: true;
  data: ItemWithRelations;
}

// POST /api/items/[id]/reject
export interface RejectItemRequest {
  reason: string;
  agent: AgentName;
}

export interface RejectItemResponse {
  success: true;
  data: {
    item: Item;
    escalated: boolean;
    rejectionCount: number;
  };
}

// GET /api/items/[id]/render
export interface RenderItemResponse {
  success: true;
  data: {
    markdown: string;
  };
}

// ============ Agent Endpoints ============

// POST /api/agents/start
export interface AgentStartRequest {
  itemId: string;
  agent: AgentName;
}

export interface AgentStartResponse {
  success: true;
  data: {
    itemId: string;
    agent: AgentName;
    item: ItemWithRelations;
    claimedAt: Date;
  };
}

// POST /api/agents/stop
export interface AgentStopRequest {
  itemId: string;
  agent: AgentName;
  summary: string;
  outcome?: 'completed' | 'blocked';
}

export interface AgentStopResponse {
  success: true;
  data: {
    itemId: string;
    agent: AgentName;
    workLogEntry: WorkLogEntry;
    nextStage: StageId | null;
  };
}

// ============ Mission Endpoints ============

// POST /api/missions
export interface CreateMissionRequest {
  name: string;
  prdPath: string;
}

export interface CreateMissionResponse {
  success: true;
  data: Mission;
}

// GET /api/missions/current
export interface GetCurrentMissionResponse {
  success: true;
  data: Mission | null;
}

// POST /api/missions/precheck
export interface PrecheckResponse {
  success: true;
  data: PrecheckResult;
}

// POST /api/missions/postcheck
export interface PostcheckResponse {
  success: true;
  data: PostcheckResult;
}

// POST /api/missions/archive
export interface ArchiveMissionResponse {
  success: true;
  data: {
    mission: Mission;
    archivedItems: number;
  };
}

// ============ Utility Endpoints ============

// GET /api/deps/check
export interface DepsCheckResponse {
  success: true;
  data: {
    valid: boolean;
    cycles: string[][];
    readyItems: string[];
    blockedItems: string[];
  };
}

// POST /api/activity
export interface LogActivityRequest {
  message: string;
  agent?: AgentName;
  level?: 'info' | 'warn' | 'error';
}

export interface LogActivityResponse {
  success: true;
  data: {
    logged: boolean;
    timestamp: Date;
  };
}

// GET /api/activity
export interface GetActivityResponse {
  success: true;
  data: {
    entries: ActivityLogEntry[];
  };
}

// ============ Error Response ============

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = T | ApiError;
```

---

## 4. API Specification

### 4.1 Board Endpoints

#### `GET /api/board`

Get full board state including all stages, items, and agent claims.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `includeCompleted` | boolean | No | false | Include items in 'done' stage |

**Response:** `GetBoardResponse`

---

#### `POST /api/board/move`

Move a work item between stages.

**Request Body:** `MoveItemRequest`

**Validation:**
- Item must exist
- Stage transition must be valid (see Business Rules)
- Target stage WIP limit not exceeded (unless `force=true`)
- Item must not be in 'blocked' stage (unless moving to 'ready')

**Response:** `MoveItemResponse`

**Error Codes:**
- `ITEM_NOT_FOUND` - Item doesn't exist
- `INVALID_TRANSITION` - Stage transition not allowed
- `WIP_LIMIT_EXCEEDED` - Target stage at capacity

---

#### `POST /api/board/claim`

Assign an agent to a work item.

**Request Body:** `ClaimItemRequest`

**Validation:**
- Item must exist
- Item must be in 'ready' or 'in_progress' stage
- Agent must not have an existing claim
- Item must not already be claimed

**Response:** `ClaimItemResponse`

**Error Codes:**
- `ITEM_NOT_FOUND`
- `INVALID_STAGE` - Item not in claimable stage
- `AGENT_BUSY` - Agent has another claim
- `ITEM_CLAIMED` - Item already claimed by another agent

---

#### `POST /api/board/release`

Release an agent's claim on a work item.

**Request Body:** `ReleaseItemRequest`

**Response:** `ReleaseItemResponse`

**Error Codes:**
- `ITEM_NOT_FOUND`
- `NOT_CLAIMED` - Item has no active claim

---

### 4.2 Item Endpoints

#### `GET /api/items`

List all items with optional filters.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `stage` | StageId | No | Filter by stage |
| `type` | ItemType | No | Filter by type |
| `priority` | ItemPriority | No | Filter by priority |
| `agent` | AgentName | No | Filter by assigned agent |

**Response:** `{ success: true, data: ItemWithRelations[] }`

---

#### `POST /api/items`

Create a new work item.

**Request Body:** `CreateItemRequest`

**Validation:**
- Title required, max 200 chars
- Dependencies must exist and not create cycles

**Response:** `CreateItemResponse`

**Side Effects:**
- Item created in 'backlog' stage
- ID auto-generated as `WI-{NNN}`

---

#### `GET /api/items/[id]`

Get a single item with all relations.

**Response:** `{ success: true, data: ItemWithRelations }`

---

#### `PATCH /api/items/[id]`

Update item properties.

**Request Body:** `UpdateItemRequest`

**Response:** `UpdateItemResponse`

---

#### `DELETE /api/items/[id]`

Delete an item (soft delete - moves to archived).

**Response:** `{ success: true, data: { deleted: true } }`

---

#### `POST /api/items/[id]/reject`

Record a rejection on a work item.

**Request Body:** `RejectItemRequest`

**Validation:**
- Item must be in 'review' stage

**Response:** `RejectItemResponse`

**Side Effects:**
- Increments `rejectionCount`
- Adds work log entry with rejection reason
- If `rejectionCount >= 2`, moves to 'blocked' stage

---

#### `GET /api/items/[id]/render`

Render item as formatted markdown.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `includeWorkLog` | boolean | No | true | Include work log history |

**Response:** `RenderItemResponse`

---

### 4.3 Agent Endpoints

#### `POST /api/agents/start`

Start hook: Claim item, move to in_progress, log start.

**Request Body:** `AgentStartRequest`

**Validation:**
- Item must be in 'ready' stage
- All item dependencies must be in 'done' stage
- Agent must not have an active claim

**Response:** `AgentStartResponse`

**Side Effects:**
- Creates agent claim
- Moves item to 'in_progress'
- Sets `assignedAgent` on item
- Adds work log entry (action: 'started')

---

#### `POST /api/agents/stop`

Stop hook: Release claim, log summary, move to next stage.

**Request Body:** `AgentStopRequest`

**Validation:**
- Item must be claimed by the specified agent

**Response:** `AgentStopResponse`

**Side Effects:**
- Deletes agent claim
- Clears `assignedAgent` on item
- Adds work log entry with summary
- Moves item to 'review' (completed) or 'blocked' (blocked)

---

### 4.4 Mission Endpoints

#### `GET /api/missions`

List all missions.

**Response:** `{ success: true, data: Mission[] }`

---

#### `POST /api/missions`

Initialize a new mission (archives existing first).

**Request Body:** `CreateMissionRequest`

**Response:** `CreateMissionResponse`

**Side Effects:**
- Archives current mission if exists
- Creates new mission in 'initializing' state
- Generates ID as `M-{YYYYMMDD}-{NNN}`

---

#### `GET /api/missions/current`

Get the current active mission.

**Response:** `GetCurrentMissionResponse`

---

#### `POST /api/missions/precheck`

Run pre-mission checks.

**Response:** `PrecheckResponse`

**Side Effects:**
- Updates mission state: 'initializing' → 'prechecking' → 'running' (or 'failed')
- Logs results to activity log

---

#### `POST /api/missions/postcheck`

Run post-mission checks.

**Response:** `PostcheckResponse`

**Side Effects:**
- Updates mission state: 'running' → 'postchecking' → 'completed' (or 'failed')
- Logs results to activity log

---

#### `POST /api/missions/archive`

Archive the current mission.

**Response:** `ArchiveMissionResponse`

**Side Effects:**
- Sets mission state to 'archived'
- Sets `archivedAt` timestamp

---

### 4.5 Utility Endpoints

#### `GET /api/deps/check`

Validate dependency graph.

**Response:** `DepsCheckResponse`

Returns:
- `valid`: true if no cycles detected
- `cycles`: Array of item ID arrays forming cycles
- `readyItems`: Items with all dependencies satisfied (in 'done')
- `blockedItems`: Items waiting on incomplete dependencies

---

#### `GET /api/activity`

Get activity log entries.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `limit` | number | No | 100 | Max entries to return |
| `missionId` | string | No | current | Filter by mission |

**Response:** `GetActivityResponse`

---

#### `POST /api/activity`

Log an activity entry.

**Request Body:** `LogActivityRequest`

**Response:** `LogActivityResponse`

---

## 5. Business Rules

### 5.1 Stage Transition Matrix

| From | Allowed To |
|------|-----------|
| backlog | ready, blocked |
| ready | in_progress, blocked, backlog |
| in_progress | review, blocked |
| review | done, in_progress, blocked |
| done | _(terminal)_ |
| blocked | ready |

### 5.2 Default WIP Limits

| Stage | Limit |
|-------|-------|
| backlog | ∞ |
| ready | 10 |
| in_progress | 5 |
| review | 3 |
| done | ∞ |
| blocked | ∞ |

### 5.3 ID Generation

- **Items:** `WI-{NNN}` where NNN is zero-padded sequence (e.g., `WI-001`, `WI-042`)
- **Missions:** `M-{YYYYMMDD}-{NNN}` (e.g., `M-20260121-001`)

### 5.4 Rejection Escalation

```
rejection 1 → item stays in 'review', rejectionCount = 1
rejection 2 → item moves to 'blocked', rejectionCount = 2
```

### 5.5 Dependency Rules

- Item cannot move to 'in_progress' until ALL dependencies are in 'done'
- Circular dependencies rejected at creation/update time
- Deleting an item removes it from other items' dependency lists

---

## 6. Database Setup

### 6.1 Environment

```bash
# .env.local
DATABASE_URL="file:./ateam.db"
```

### 6.2 Initial Migration

```bash
npx prisma migrate dev --name init
```

### 6.3 Seed Data

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create stages
  const stages = [
    { id: 'backlog', name: 'Backlog', order: 0, wipLimit: null },
    { id: 'ready', name: 'Ready', order: 1, wipLimit: 10 },
    { id: 'in_progress', name: 'In Progress', order: 2, wipLimit: 5 },
    { id: 'review', name: 'Review', order: 3, wipLimit: 3 },
    { id: 'done', name: 'Done', order: 4, wipLimit: null },
    { id: 'blocked', name: 'Blocked', order: 5, wipLimit: null },
  ];

  for (const stage of stages) {
    await prisma.stage.upsert({
      where: { id: stage.id },
      update: stage,
      create: stage,
    });
  }

  console.log('Seeded stages');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 7. Migration from File-Based Storage

### 7.1 Migration Script

Create a one-time migration script to import existing `board.json` data:

```bash
npx ts-node scripts/migrate-from-json.ts
```

The script should:
1. Read existing `board.json`
2. Parse items, extract frontmatter
3. Insert into SQLite via Prisma
4. Validate data integrity
5. Backup original file

### 7.2 Rollback Plan

- Keep `board.json` as read-only backup
- Dashboard can fall back to file-based reads if DB unavailable

---

## 8. Testing Requirements

### 8.1 Unit Tests

- Stage transition validation
- WIP limit enforcement
- Dependency cycle detection
- ID generation

### 8.2 Integration Tests

- Full CRUD flows for each endpoint
- Concurrent request handling
- Transaction rollback on errors

### 8.3 Load Tests

- 5 concurrent agents making requests
- Verify no race conditions or deadlocks

---

## 9. Implementation Checklist

### Phase 1: Database Setup
- [ ] Add Prisma dependencies
- [ ] Create schema.prisma
- [ ] Run initial migration
- [ ] Create seed script
- [ ] Add db.ts singleton

### Phase 2: Core API Routes
- [ ] `GET /api/board`
- [ ] `POST /api/board/move`
- [ ] `POST /api/board/claim`
- [ ] `POST /api/board/release`

### Phase 3: Item Routes
- [ ] `GET /api/items`
- [ ] `POST /api/items`
- [ ] `GET /api/items/[id]`
- [ ] `PATCH /api/items/[id]`
- [ ] `POST /api/items/[id]/reject`
- [ ] `GET /api/items/[id]/render`

### Phase 4: Agent Routes
- [ ] `POST /api/agents/start`
- [ ] `POST /api/agents/stop`

### Phase 5: Mission Routes
- [ ] `GET /api/missions`
- [ ] `POST /api/missions`
- [ ] `GET /api/missions/current`
- [ ] `POST /api/missions/precheck`
- [ ] `POST /api/missions/postcheck`
- [ ] `POST /api/missions/archive`

### Phase 6: Utility Routes
- [ ] `GET /api/deps/check`
- [ ] `GET /api/activity`
- [ ] `POST /api/activity`

### Phase 7: Migration & Testing
- [ ] Migration script from board.json
- [ ] Unit tests
- [ ] Integration tests
- [ ] Update dashboard to use API

---

## 10. Open Questions

1. **Authentication**: Should API routes require auth (API key, JWT)? (not yet)
2. **Rate limiting**: Needed for the API? (not yet)
3. **Audit log**: Should we track who made each API call? (Yes, audit log in the db)
4. **Soft delete**: Archive items or hard delete? (Archive, from Josh)
