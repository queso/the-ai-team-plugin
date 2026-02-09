# API Reference

Complete documentation for all API endpoints.

## Base URL

All endpoints are relative to the application root (e.g., `http://localhost:3000`).

## Endpoints

### GET /api/board/metadata

Returns board configuration, agent status, WIP limits, and statistics.

**Response**

```json
{
  "mission": {
    "name": "Kanban Board UI",
    "started_at": "2026-01-15T18:10:00Z",
    "status": "active"
  },
  "wip_limits": {
    "testing": 2,
    "implementing": 3,
    "review": 2
  },
  "phases": {
    "briefings": ["001"],
    "ready": ["002", "003"],
    "testing": [],
    "implementing": ["004"],
    "review": [],
    "done": ["005"],
    "blocked": []
  },
  "agents": {
    "Hannibal": { "status": "idle" },
    "Face": { "status": "working", "current_item": "004" },
    "Murdock": { "status": "idle" },
    "B.A.": { "status": "blocked" },
    "Lynch": { "status": "idle" }
  },
  "stats": {
    "total_items": 34,
    "completed": 5,
    "in_progress": 2,
    "blocked": 1,
    "backlog": 26
  }
}
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Server error reading board.json |

---

### GET /api/board/items

Returns all work items across all stages.

**Response**

```json
[
  {
    "id": "001",
    "title": "Define TypeScript interfaces",
    "type": "feature",
    "priority": "high",
    "stage": "done",
    "assignee": "Hannibal",
    "dependencies": [],
    "rejections": 0,
    "content": "## Description\n\nImplementation details...",
    "created_at": "2026-01-15T18:10:00Z",
    "updated_at": "2026-01-15T19:30:00Z"
  }
]
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Server error reading items |

---

### GET /api/board/activity

Returns recent activity log entries (last 100 by default).

**Response**

```json
[
  {
    "timestamp": "2026-01-16T22:27:12.968Z",
    "agent": "Hannibal",
    "message": "Mission initialized: Activity Log Streaming"
  },
  {
    "timestamp": "2026-01-16T22:28:10.557Z",
    "agent": "Face",
    "message": "Created item 001: Add activity-entry-added event type"
  },
  {
    "timestamp": "2026-01-16T22:51:22.427Z",
    "agent": "Lynch",
    "message": "APPROVED 001-core-types",
    "highlightType": "approved"
  }
]
```

**LogEntry Fields**

| Field | Type | Description |
|-------|------|-------------|
| timestamp | string | ISO 8601 timestamp (with or without milliseconds) |
| agent | string | Agent name (Hannibal, Face, Murdock, B.A., Lynch) |
| message | string | Activity message |
| highlightType | string? | Optional: `approved`, `rejected`, or `alert` |

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Server error reading activity |

---

### GET /api/board/events

Server-Sent Events endpoint for real-time updates.

**Response**

Content-Type: `text/event-stream`

```
data: {"type":"item-moved","timestamp":"2026-01-16T22:51:22Z","data":{"itemId":"001","fromStage":"review","toStage":"done"}}

data: {"type":"activity-entry-added","timestamp":"2026-01-16T22:51:22Z","data":{"logEntry":{"timestamp":"2026-01-16T22:51:22.427Z","agent":"Lynch","message":"APPROVED 001-core-types","highlightType":"approved"}}}
```

**Event Types**

| Type | Description | Data Fields |
|------|-------------|-------------|
| `item-added` | New work item created | `item` (WorkItem) |
| `item-moved` | Item moved between stages | `itemId`, `fromStage`, `toStage` |
| `item-updated` | Item content changed | `item` (WorkItem) |
| `item-deleted` | Item removed | `itemId` |
| `board-updated` | Board metadata changed | `board` (BoardMetadata) |
| `activity-entry-added` | New activity log entry | `logEntry` (LogEntry) |

**Activity Log Streaming**

The endpoint watches `activity.log` for changes and streams new entries in real-time:
- Uses file position tracking to emit only new lines
- Each new line becomes a separate `activity-entry-added` event
- Handles rapid appends without data loss

**Connection Behavior**

- Connection stays open until client disconnects
- Server sends heartbeat every 30 seconds
- Client should reconnect on disconnect (hook handles this automatically)

---

### GET /api/board/stage/[stage]

Returns all work items in a specific stage.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| stage | string | Stage name (briefings, ready, testing, implementing, review, done, blocked) |

**Response**

```json
[
  {
    "id": "001",
    "title": "Define TypeScript interfaces",
    "type": "feature",
    "stage": "done",
    ...
  }
]
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid stage name |
| 500 | Server error reading items |

**Example**

```bash
curl http://localhost:3000/api/board/stage/done
```

---

### GET /api/board/item/[id]

Returns a single work item by ID.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Work item ID (e.g., "001") |

**Response**

```json
{
  "id": "001",
  "title": "Define TypeScript interfaces",
  "type": "feature",
  "priority": "high",
  "stage": "done",
  "assignee": "Hannibal",
  "dependencies": [],
  "rejections": 0,
  "content": "## Description\n\nFull markdown content...",
  "created_at": "2026-01-15T18:10:00Z",
  "updated_at": "2026-01-15T19:30:00Z"
}
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Item not found |
| 500 | Server error reading item |

**Example**

```bash
curl http://localhost:3000/api/board/item/001
```

---

## Data Types

### WorkItem

```typescript
interface WorkItem {
  id: string;
  title: string;
  type: 'feature' | 'bug' | 'enhancement' | 'task';
  priority: 'low' | 'medium' | 'high' | 'critical';
  stage: Stage;
  assignee?: string;
  dependencies: string[];
  rejections: number;
  content: string;
  created_at: string;
  updated_at: string;
}
```

### Stage

```typescript
type Stage =
  | 'briefings'
  | 'ready'
  | 'testing'
  | 'implementing'
  | 'review'
  | 'done'
  | 'blocked';
```

### Agent

```typescript
interface Agent {
  status: 'idle' | 'working' | 'blocked';
  current_item?: string;
}
```

### MissionStatus

```typescript
type MissionStatus = 'planning' | 'active' | 'paused' | 'completed';
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Usage Examples

### Fetch all data for initial load

```javascript
const [metadata, items] = await Promise.all([
  fetch('/api/board/metadata').then(r => r.json()),
  fetch('/api/board/items').then(r => r.json())
]);
```

### Subscribe to real-time updates

```javascript
const eventSource = new EventSource('/api/board/events');

eventSource.addEventListener('update', (event) => {
  const data = JSON.parse(event.data);
  console.log('File changed:', data.path);
  // Refetch data...
});

eventSource.addEventListener('heartbeat', (event) => {
  console.log('Connection alive');
});
```

### Fetch items by stage

```javascript
const doneItems = await fetch('/api/board/stage/done').then(r => r.json());
```

### Fetch single item

```javascript
const item = await fetch('/api/board/item/001').then(r => r.json());
```
