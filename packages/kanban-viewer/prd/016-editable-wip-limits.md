# PRD 016: Editable WIP Limits

## Overview

Add the ability to edit WIP (Work In Progress) limits directly from the kanban board UI. Currently WIP limits are seeded in the database and can only be changed by modifying the seed script and re-seeding.

## Motivation

- WIP limits need tuning based on team capacity and workflow
- Changing limits currently requires database access or re-seeding
- Quick adjustments during a mission would improve workflow management
- Admins should be able to experiment with different limits easily

## Current State

WIP limits are stored in the `Stage` table:

```prisma
model Stage {
  id       String  @id       // 'briefings', 'ready', 'testing', etc.
  name     String
  order    Int
  wipLimit Int?              // null = unlimited
  items    Item[]
}
```

Default limits (from seed):
- briefings: unlimited
- ready: 10
- testing: 3
- implementing: 3
- probing: 3
- review: 3
- done: unlimited
- blocked: unlimited

## API Changes

### New Endpoint

```
PATCH /api/stages/:id
```

**Request Body:**
```json
{
  "wipLimit": 5        // positive integer or null for unlimited
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "testing",
    "name": "Testing",
    "order": 2,
    "wipLimit": 5
  }
}
```

**Error Responses:**
- 400: Invalid wipLimit (negative number, non-integer)
- 404: Stage not found
- 500: Database error

**Notes:**
- No `X-Project-ID` header required - stages are global, not project-scoped
- Validate stage ID against known stage IDs

## UI Changes

### Column Header Display

Current header shows stage name and item count:
```
┌─────────────────────────┐
│ TESTING            3    │
└─────────────────────────┘
```

New header shows WIP status (items/limit):
```
┌─────────────────────────┐
│ TESTING          3/5    │  ← Click "5" to edit
└─────────────────────────┘
```

For unlimited stages:
```
┌─────────────────────────┐
│ BRIEFINGS        4/∞    │  ← "∞" indicates unlimited
└─────────────────────────┘
```

### Edit Interaction

1. Click on the limit number (or ∞) to enter edit mode
2. Number input appears inline (small, 3-4 chars wide)
3. Enter or blur to save
4. Escape to cancel
5. Empty input or "0" sets to unlimited (null)

### Visual States

- **Normal:** `3/5` - muted text
- **Hover:** Cursor pointer, subtle highlight on limit
- **Editing:** Number input with focus ring
- **At Limit:** `5/5` - warning color (yellow/orange)
- **Over Limit:** `6/5` - error color (red)

## Component Changes

### BoardColumn Props

```typescript
interface BoardColumnProps {
  stage: Stage;
  items: WorkItem[];
  wipLimit?: number | null;
  onWipLimitChange?: (stageId: string, newLimit: number | null) => void;
  // ... existing props
}
```

### Page State Handler

```typescript
const handleWipLimitChange = async (stageId: string, newLimit: number | null) => {
  const response = await fetch(`/api/stages/${stageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wipLimit: newLimit }),
  });

  if (response.ok) {
    // Update local state or rely on SSE refresh
    setBoardMetadata(prev => ({
      ...prev,
      wip_limits: { ...prev.wip_limits, [stageId]: newLimit }
    }));
  }
};
```

## Implementation Phases

### Phase 1: API Endpoint
1. Create `src/app/api/stages/[id]/route.ts`
2. Implement PATCH handler with validation
3. Add error factory if needed (`createStageNotFoundError`)
4. Test with curl

### Phase 2: UI Display
1. Update `BoardColumn` to show WIP as `items/limit` format
2. Handle null (unlimited) display as `∞`
3. Add color states for at-limit and over-limit

### Phase 3: Inline Editing
1. Add edit mode state to `BoardColumn`
2. Implement click-to-edit on limit number
3. Add number input with keyboard handling
4. Wire up `onWipLimitChange` callback
5. Update page.tsx with handler

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/stages/[id]/route.ts` | New file - PATCH endpoint |
| `src/components/board-column.tsx` | Add WIP display and inline editor |
| `src/app/page.tsx` | Add `handleWipLimitChange` handler |
| `src/types/api.ts` | Add `UpdateStageRequest/Response` types (optional) |

## Acceptance Criteria

- [ ] PATCH `/api/stages/:id` endpoint updates wipLimit
- [ ] Invalid wipLimit values return 400 error
- [ ] Unknown stage ID returns 404 error
- [ ] Column headers show item count and WIP limit
- [ ] Unlimited stages show ∞ symbol
- [ ] Clicking limit enters edit mode
- [ ] Enter/blur saves new value
- [ ] Escape cancels edit
- [ ] Empty/zero input sets unlimited
- [ ] Visual feedback for at-limit (warning) and over-limit (error)
- [ ] Changes persist across page refresh

## Non-Goals (Future)

- Stage reordering
- Stage renaming
- Creating/deleting stages
- Per-project WIP limits
- WIP limit history/audit log
