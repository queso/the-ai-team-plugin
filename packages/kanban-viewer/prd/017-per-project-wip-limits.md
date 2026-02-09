# PRD 017: Per-Project WIP Limits

## Overview

Extend WIP limits to be project-scoped rather than global. Currently, changing a WIP limit affects all projects, which doesn't work well when different projects have different team sizes or workflow requirements.

## Motivation

- Different projects have different team capacities
- A solo project might want WIP limit of 1, while a team project might want 5
- Global WIP limits cause unexpected behavior when switching between projects
- Teams working on multiple projects need independent workflow controls

## Current State

WIP limits are stored globally in the `Stage` table:

```prisma
model Stage {
  id       String  @id       // 'briefings', 'ready', 'testing', etc.
  name     String
  order    Int
  wipLimit Int?              // null = unlimited - GLOBAL
  items    Item[]
}
```

The recent "Editable WIP Limits" feature (PRD 016) added:
- `PATCH /api/stages/:id` endpoint (no project context)
- Inline editing in BoardColumn
- Changes apply to ALL projects

## Proposed Solution

### Data Model Changes

Create a new `ProjectStageConfig` table for per-project overrides:

```prisma
model ProjectStageConfig {
  id        String   @id @default(cuid())
  projectId String
  stageId   String
  wipLimit  Int?     // null = unlimited, absent = use global default

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  stage     Stage    @relation(fields: [stageId], references: [id], onDelete: Cascade)

  @@unique([projectId, stageId])
}
```

### WIP Limit Resolution

When displaying/enforcing WIP limits:

```typescript
function getWipLimit(projectId: string, stageId: string): number | null {
  // 1. Check for project-specific override
  const override = await prisma.projectStageConfig.findUnique({
    where: { projectId_stageId: { projectId, stageId } }
  });

  if (override !== null) {
    return override.wipLimit;  // Use project override (can be null for unlimited)
  }

  // 2. Fall back to global stage default
  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  return stage?.wipLimit ?? null;
}
```

### API Changes

#### Update Existing Endpoint

```
PATCH /api/stages/:id
```

Add optional `X-Project-ID` header:
- **With header**: Updates project-specific WIP limit (creates override if needed)
- **Without header**: Updates global default (existing behavior, maybe admin-only)

**Request Body:** (unchanged)
```json
{
  "wipLimit": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stageId": "testing",
    "wipLimit": 5,
    "scope": "project",        // or "global"
    "projectId": "my-project"  // only if project-scoped
  }
}
```

#### New Endpoint: Reset to Default

```
DELETE /api/stages/:id/config
```

Requires `X-Project-ID` header. Removes project override, reverting to global default.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stageId": "testing",
    "wipLimit": 3,             // now showing global default
    "scope": "global"
  }
}
```

### UI Changes

#### Column Header

Show indicator when using project override vs global default:

```
┌─────────────────────────────┐
│ TESTING            3/5  ●   │  ← Dot indicates project override
└─────────────────────────────┘

┌─────────────────────────────┐
│ TESTING            3/5      │  ← No dot = using global default
└─────────────────────────────┘
```

#### Edit Popover (Enhanced)

Replace simple inline edit with a small popover:

```
┌────────────────────────────┐
│ WIP Limit for Testing      │
├────────────────────────────┤
│ ○ Use default (3)          │
│ ● Custom: [5    ]          │
├────────────────────────────┤
│ [Cancel]        [Save]     │
└────────────────────────────┘
```

Options:
- **Use default**: Removes project override, uses global
- **Custom**: Sets project-specific limit
- **Unlimited**: Sets to null (no limit)

### Board API Response Changes

Update `GET /api/board` to return resolved WIP limits:

```json
{
  "stages": [...],
  "wip_limits": {
    "briefings": { "limit": null, "scope": "global" },
    "ready": { "limit": 5, "scope": "project" },
    "testing": { "limit": 3, "scope": "global" },
    ...
  }
}
```

## Migration Strategy

1. Create `ProjectStageConfig` table (no data migration needed)
2. Update `PATCH /api/stages/:id` to check for `X-Project-ID` header
3. Update board API to return resolved limits with scope info
4. Update BoardColumn UI to show scope indicator and enhanced editor
5. Global defaults remain unchanged - zero impact on existing behavior

## Implementation Phases

### Phase 1: Data Model
1. Add `ProjectStageConfig` model to Prisma schema
2. Run migration
3. Add helper function `getWipLimit(projectId, stageId)`

### Phase 2: API Updates
1. Update `PATCH /api/stages/:id` to handle project context
2. Add `DELETE /api/stages/:id/config` endpoint
3. Update `GET /api/board` response format

### Phase 3: UI Updates
1. Update BoardColumn to show scope indicator
2. Replace inline edit with popover
3. Add "reset to default" option

## Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `ProjectStageConfig` model |
| `src/app/api/stages/[id]/route.ts` | Handle project context |
| `src/app/api/stages/[id]/config/route.ts` | New DELETE endpoint |
| `src/app/api/board/route.ts` | Return resolved limits with scope |
| `src/components/board-column.tsx` | Scope indicator, popover editor |
| `src/types/index.ts` | Update WIP limit types |

## Acceptance Criteria

- [ ] ProjectStageConfig table stores per-project overrides
- [ ] PATCH with X-Project-ID creates/updates project override
- [ ] PATCH without X-Project-ID updates global default
- [ ] DELETE removes project override
- [ ] Board API returns resolved limits with scope info
- [ ] UI shows indicator for project vs global limits
- [ ] UI allows resetting to global default
- [ ] Existing global-only behavior continues to work
- [ ] Switching projects shows correct project-specific limits

## Non-Goals (Future)

- Bulk WIP limit configuration
- WIP limit templates/presets
- Per-user WIP limits
- WIP limit history/audit log
- Admin UI for managing global defaults
