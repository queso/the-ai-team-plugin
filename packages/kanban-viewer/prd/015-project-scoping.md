# PRD 015: Project Scoping for Multi-Project Support

## Overview

Add project-level scoping to support tracking multiple concurrent projects (repos) on a single kanban board instance. Projects are the top-level container, with missions and items scoped within them.

## Motivation

- Users work across multiple repositories/projects simultaneously
- MCP tool calls will send projectId to identify which project an operation belongs to
- Need to view and switch between projects in the UI
- Keep data isolated between projects while sharing the same board infrastructure

## Data Model

### Hierarchy
```
Project (e.g., "kanban-viewer", "my-app", "api-service")
  └── Mission (e.g., "PRD 015: Project Scoping")
       └── Items (work items scoped to mission and project)
```

### New Database Schema

```prisma
model Project {
  id          String    @id                // e.g., "kanban-viewer", "my-app"
  name        String                       // Display name
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  missions    Mission[]
  items       Item[]
  activityLogs ActivityLog[]
}
```

### Modified Models

All existing models gain a `projectId` foreign key:

- `Mission.projectId` (required)
- `Item.projectId` (required)
- `ActivityLog.projectId` (required)
- `AgentClaim` - scoped via Item relationship (no direct projectId needed)

## API Changes

### Query Parameter

All API endpoints accept `projectId` query parameter:

```
GET  /api/board?projectId=kanban-viewer&includeCompleted=true
GET  /api/items?projectId=kanban-viewer
POST /api/items?projectId=kanban-viewer
GET  /api/activity?projectId=kanban-viewer
POST /api/missions?projectId=kanban-viewer
...
```

### Validation

- If `projectId` is missing, return 400 error with clear message
- If `projectId` doesn't exist in database, auto-create the project record
- Project IDs should be URL-safe strings (alphanumeric, hyphens, underscores)

### New Endpoints

```
GET  /api/projects              - List all projects
POST /api/projects              - Create a new project
GET  /api/projects/:id          - Get project details
```

## UI Changes

### URL Structure

Project ID in URL query param for bookmarking/sharing:

```
http://localhost:3000/?project=kanban-viewer
http://localhost:3000/?project=my-app
```

### Project Selector

Add dropdown in header bar (left side, before mission name):

```
┌─────────────────────────────────────────────────────────────┐
│ [kanban-viewer ▼]  PRD 015: Project Scoping    [filters...] │
└─────────────────────────────────────────────────────────────┘
```

Dropdown behavior:
- Shows list of all projects (fetched from `/api/projects`)
- Selecting a project updates URL and reloads board data
- Current project highlighted
- Optional: Show item count per project

### State Management

- `projectId` stored in URL query param (source of truth)
- Read from URL on page load
- Update URL when project changes (without full page reload)
- Pass `projectId` to all API calls

## Migration

### Existing Data

Create migration script to:

1. Create default project record: `{ id: 'kanban-viewer', name: 'Kanban Viewer' }`
2. Update all existing Items: `SET projectId = 'kanban-viewer'`
3. Update all existing Missions: `SET projectId = 'kanban-viewer'`
4. Update all existing ActivityLogs: `SET projectId = 'kanban-viewer'`

### Database Migration

```sql
-- Add projectId columns (nullable initially for migration)
ALTER TABLE Item ADD COLUMN projectId TEXT;
ALTER TABLE Mission ADD COLUMN projectId TEXT;
ALTER TABLE ActivityLog ADD COLUMN projectId TEXT;

-- Run data migration script

-- Make columns required and add foreign key
ALTER TABLE Item ALTER COLUMN projectId SET NOT NULL;
-- etc.
```

## SSE Updates

The `/api/board/events` SSE endpoint needs project scoping:

```
GET /api/board/events?projectId=kanban-viewer
```

- Only emit events for items/missions in the specified project
- Filter file system watches or database polling by project

## Implementation Phases

### Phase 1: Database & API
1. Add Project model to Prisma schema
2. Add projectId to Item, Mission, ActivityLog models
3. Create migration for existing data
4. Update all API routes to require/use projectId query param
5. Add `/api/projects` endpoints

### Phase 2: UI
1. Add project selector component to header
2. Update page.tsx to read projectId from URL
3. Pass projectId to all fetch calls
4. Update URL when project changes
5. Handle missing/invalid projectId gracefully

### Phase 3: SSE & Polish
1. Update SSE endpoint for project scoping
2. Add project to activity log display
3. Test multi-project workflows
4. Update e2e regression script for project param

## Acceptance Criteria

- [ ] All API endpoints require projectId query parameter
- [ ] Missing projectId returns 400 with clear error message
- [ ] Unknown projectId auto-creates project record
- [ ] UI shows project selector dropdown in header
- [ ] Selecting project updates URL and reloads data
- [ ] Existing data migrated to 'kanban-viewer' project
- [ ] SSE events scoped to selected project
- [ ] Can run e2e test with custom projectId
- [ ] Multiple browser tabs can view different projects simultaneously

## Non-Goals (Future)

- Project-level settings/configuration
- Project deletion/archival
- Project access control/permissions
- Project statistics dashboard
