# PRD 017: Project Added SSE Event

## Overview

Add real-time SSE notification when a new project is created, allowing the project dropdown to update automatically without requiring a page refresh.

## Motivation

- Projects are auto-created when API calls include a new `X-Project-ID` header
- Currently, users must refresh the page to see newly created projects in the dropdown
- Real-time updates improve UX, especially when running missions that create projects from other tools (MCP)
- Follows the established SSE event pattern used for items, missions, and activity logs

## Current State

The SSE endpoint (`/api/board/events`) polls for and emits events for:
- `item-added`, `item-moved`, `item-updated`, `item-deleted`
- `board-updated`, `mission-completed`
- `activity-entry-added`

Projects are not tracked, so new projects require a page refresh to appear.

## API Changes

### New SSE Event Type

```typescript
type: 'project-added'
```

**Event Payload:**
```json
{
  "type": "project-added",
  "timestamp": "2026-01-30T14:00:00.000Z",
  "data": {
    "project": {
      "id": "my-new-project",
      "name": "my-new-project",
      "createdAt": "2026-01-30T14:00:00.000Z",
      "updatedAt": "2026-01-30T14:00:00.000Z"
    }
  }
}
```

**Notes:**
- Event is emitted to ALL SSE connections (not project-scoped) since the dropdown shows all projects
- Only emits for truly new projects (not on first poll baseline)

## Type Changes

### `src/types/index.ts`

Add to `BoardEventType` union:
```typescript
| 'project-added'
```

Add new event interface:
```typescript
export interface ProjectAddedEvent {
  type: 'project-added';
  timestamp: string;
  data: {
    project: {
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}
```

Add to `BoardEvent` union type.

## SSE Endpoint Changes

### `src/app/api/board/events/route.ts`

Add project tracking:
```typescript
// State tracking for change detection
const trackedProjectIds = new Set<string>();
```

Add event creator:
```typescript
function createProjectAddedEvent(project: DbProject): BoardEvent {
  return {
    type: 'project-added',
    timestamp: new Date().toISOString(),
    data: {
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    },
  };
}
```

In `poll()` function:
```typescript
// Fetch all projects and detect new ones
const projects = await prisma.project.findMany();
for (const project of projects) {
  if (!trackedProjectIds.has(project.id)) {
    if (!isFirstPoll) {
      pendingEvents.push(createProjectAddedEvent(project));
    }
    trackedProjectIds.add(project.id);
  }
}
```

## Hook Changes

### `src/hooks/use-board-events.ts`

Add to `UseBoardEventsOptions`:
```typescript
/** Callback when a new project is created */
onProjectAdded?: (project: {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}) => void;
```

Add to `callbacksRef` and `handleEvent` switch case.

## UI Changes

### `src/app/page.tsx`

Add handler to `useBoardEvents`:
```typescript
onProjectAdded: (project) => {
  setProjects(prev => {
    // Avoid duplicates
    if (prev.some(p => p.id === project.id)) return prev;
    return [...prev, {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }];
  });
},
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `ProjectAddedEvent` interface and update unions |
| `src/app/api/board/events/route.ts` | Track projects and emit `project-added` events |
| `src/hooks/use-board-events.ts` | Add `onProjectAdded` callback support |
| `src/app/page.tsx` | Handle `onProjectAdded` to update projects state |

## Acceptance Criteria

- [ ] `project-added` event type defined in types
- [ ] SSE endpoint tracks projects and emits events for new ones
- [ ] Hook supports `onProjectAdded` callback
- [ ] Page updates project dropdown when event received
- [ ] No duplicate projects added to dropdown
- [ ] Existing SSE functionality unaffected

## Verification

1. Start the application
2. Open browser to http://localhost:3000
3. Note current projects in dropdown
4. Create a mission with a new project ID:
   ```bash
   curl -X POST http://localhost:3000/api/missions \
     -H "Content-Type: application/json" \
     -H "X-Project-ID: brand-new-project" \
     -d '{"name": "Test Mission", "prdPath": "/test.md"}'
   ```
5. Verify new project appears in dropdown without page refresh

## Non-Goals (Future)

- `project-updated` event (for name changes)
- `project-deleted` event
- Project list sorting in dropdown
