# Architecture

This document describes the system architecture of the Kanban Board Viewer.

## Overview

The application follows a client-server architecture with:
- Next.js App Router for both client and server code
- File system as the data store (markdown files with YAML frontmatter)
- Server-Sent Events (SSE) for real-time updates
- React components with custom hooks for state management

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    React Application                     ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ ││
│  │  │ useBoardData│  │useBoardEvents│  │   Components    │ ││
│  │  │   (fetch)   │  │    (SSE)     │  │                 │ ││
│  │  └──────┬──────┘  └──────┬───────┘  └────────────────┘ ││
│  └─────────┼────────────────┼───────────────────────────────┘│
└────────────┼────────────────┼────────────────────────────────┘
             │                │
             ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Server                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      API Routes                          ││
│  │  /api/board/metadata  /api/board/items  /api/board/events││
│  │  /api/board/activity  /api/board/stage  /api/board/item  ││
│  └──────────────────────────┬───────────────────────────────┘│
│                             │                                │
│  ┌──────────────────────────▼───────────────────────────────┐│
│  │                    BoardService                           ││
│  │         (File system access, parsing, caching)            ││
│  └──────────────────────────┬───────────────────────────────┘│
└─────────────────────────────┼────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      File System                             │
│  mission/                                                    │
│  ├── board.json          (board state, agents, stats)        │
│  ├── briefings/          (work items in briefings stage)     │
│  ├── ready/              (work items ready for work)         │
│  ├── testing/            (work items being tested)           │
│  ├── implementing/       (work items in progress)            │
│  ├── review/             (work items under review)           │
│  ├── done/               (completed work items)              │
│  └── blocked/            (blocked work items)                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Initial Load

1. Page loads and renders with loading state
2. `useBoardData` hook fetches `/api/board/metadata` and `/api/board/items`
3. BoardService reads `board.json` and all stage directories
4. Parser extracts frontmatter from markdown files
5. Data is returned and components render

### Real-Time Updates

1. `useBoardEvents` hook connects to `/api/board/events` SSE endpoint
2. Server watches file system for changes using `fs.watch`
3. When files change, server sends SSE event with relevant data
4. Client receives event and invokes appropriate callback
5. Components re-render with new data

**SSE Event Types**
- `item-added`: New work item created (includes full item data)
- `item-moved`: Item moved between stages (includes itemId, fromStage, toStage)
- `item-updated`: Item content changed (includes full item data)
- `item-deleted`: Item removed (includes itemId)
- `board-updated`: Board metadata changed (includes full board data with agents, stats)
- `activity-entry-added`: New activity log entry (includes LogEntry)

**Board-Updated Payload**
The `board-updated` event includes the full board state, enabling real-time updates for:
- Agent status changes (idle → active → watching)
- Progress statistics (completed, in-progress, blocked counts)
- WIP limit changes
- Mission status changes

### Activity Log Streaming

The Live Feed panel receives real-time updates when agents write to `activity.log`:

1. SSE endpoint watches `activity.log` with `fs.watch`
2. On change, reads only new content using file position tracking
3. Parses each new line into a `LogEntry` object
4. Emits `activity-entry-added` SSE event for each entry
5. `useBoardEvents` hook invokes `onActivityEntry` callback
6. Page appends entry to state (with deduplication)
7. LiveFeedPanel re-renders with new entry

### Data Update Cycle

```
File System Change
       │
       ▼
fs.watch detects change
       │
       ▼
SSE event sent to clients
       │
       ▼
useBoardEvents receives event
       │
       ▼
Triggers useBoardData refetch
       │
       ▼
Components re-render
```

## Component Hierarchy

```
App (layout.tsx)
└── Page (page.tsx)
    └── ResponsiveBoard
        ├── HeaderBar
        │   ├── ConnectionStatusIndicator
        │   ├── Status Indicator
        │   ├── ProgressBar
        │   ├── MissionTimer (with freeze/resume)
        │   └── Completion Indicator (checkmark)
        ├── Board Columns (x7)
        │   └── BoardColumn (with layout transitions)
        │       ├── WIP Indicator
        │       ├── Item Count
        │       └── WorkItemCard (multiple, with animations)
        │           ├── TypeBadge
        │           ├── DependencyIndicator
        │           └── RejectionBadge
        ├── LiveFeedPanel
        │   ├── Tabs (Live Feed / Human Input)
        │   └── NotificationDot (on Human Input tab)
        ├── AgentStatusBar
        │   └── AgentBadge (x6: Hannibal, Face, Murdock, B.A., Lynch, Amy)
        └── WorkItemModal (full details dialog)
```

## Key Design Decisions

### File-Based Data Store

Work items are stored as markdown files in stage-named directories. This approach:
- Makes data human-readable and editable
- Allows version control of work items
- Enables easy inspection and debugging
- Supports rich content in markdown body

### Stage as Directory

Each stage (briefings, ready, testing, etc.) is a filesystem directory. Moving an item between stages means moving the file. The `board.json` file tracks metadata but the source of truth for stage is file location.

### SSE over WebSocket

Server-Sent Events chosen over WebSocket because:
- Simpler server implementation (no connection management)
- Automatic reconnection built into EventSource API
- One-way data flow matches our use case
- Works through proxies and load balancers

### No External Database

The application uses the filesystem as its database:
- `board.json` for board-level state (agents, WIP limits, stats)
- Markdown files for work item content
- Directory structure for stage organization

This keeps the application self-contained and easy to deploy.

## Error Handling

### API Errors

- Invalid stage name: Returns 400 with error message
- Item not found: Returns 404 with error message
- Parse errors: Logs error, returns partial data
- File system errors: Logs error, returns 500

### SSE Connection Management

The `useBoardEvents` hook provides granular connection state tracking:

**Connection States**
- `connecting`: Initial connection or reconnecting after failure
- `connected`: Active SSE connection receiving events
- `disconnected`: Connection closed (e.g., `enabled: false`)
- `error`: Connection failed after max retry attempts

**Reconnection Strategy**
- Exponential backoff starting at 1 second
- Maximum delay of 30 seconds between attempts
- Up to 10 reconnection attempts before giving up
- Uses ref pattern for recursive reconnection to avoid stale closures

**Visual Feedback**
- ConnectionStatusIndicator component shows current state
- Green dot: connected
- Yellow pulsing: connecting
- Gray: disconnected
- Red: error

### Client Error Boundaries

Components handle missing data gracefully:
- Empty arrays render as empty columns
- Missing optional fields use defaults
- Type coercion prevents runtime errors

## Performance Considerations

### Caching

- BoardService can cache parsed items
- API responses include appropriate cache headers
- Client-side state prevents unnecessary refetches

### Lazy Loading

- Work item content loaded on-demand in modal
- Images/media in markdown rendered lazily

### Efficient Re-renders

- React's reconciliation handles minimal DOM updates
- SSE events trigger targeted refetches
- Components use proper key props for list rendering
