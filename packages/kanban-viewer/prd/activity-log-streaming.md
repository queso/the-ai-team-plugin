# PRD: Real-Time Activity Log Streaming

## Problem

The "Live Feed" panel in the kanban board UI displays entries from `mission/activity.log`, but it's not actually live. The log is fetched once on page mount and never updates. When agents write new entries during a mission run, users must manually refresh the page to see them.

This defeats the purpose of a "Live Feed" - users watching a mission unfold can't see agent activity in real-time.

## Goal

Stream activity log entries to the Live Feed panel in real-time via SSE, so users see agent activity as it happens.

## Scope

### In Scope
- Add `activity.log` file watching to the SSE endpoint
- New SSE event type: `activity-entry-added`
- New callback in `useBoardEvents` hook: `onActivityEntry`
- Update page to append new log entries via SSE
- Auto-scroll Live Feed to show newest entries

### Out of Scope
- Changes to activity log format or parsing
- Changes to LiveFeedPanel component styling
- Activity log write operations (agents write directly to file)

## Technical Approach

### 1. SSE Endpoint Changes (`src/app/api/board/events/route.ts`)

Add `activity.log` to the file watcher:

```typescript
function determineEventType(eventType: string, filename: string): BoardEventType | null {
  if (filename === 'board.json') {
    return 'board-updated';
  }

  // NEW: Handle activity.log changes
  if (filename === 'activity.log') {
    return 'activity-entry-added';
  }

  // ... rest of .md file handling
}
```

The event should include the new log entry content. This requires:
- Reading the last line(s) of activity.log when a change is detected
- Including the parsed entry in the event data

### 2. Type Updates (`src/types/index.ts`)

Add new event type:

```typescript
export type BoardEventType =
  | 'item-added'
  | 'item-moved'
  | 'item-updated'
  | 'item-deleted'
  | 'board-updated'
  | 'activity-entry-added';  // NEW

export interface BoardEvent {
  type: BoardEventType;
  timestamp: string;
  data: {
    // ... existing fields
    logEntry?: LogEntry;  // NEW: for activity-entry-added events
  };
}
```

### 3. Hook Updates (`src/hooks/use-board-events.ts`)

Add new callback option:

```typescript
export interface UseBoardEventsOptions {
  // ... existing callbacks
  onActivityEntry?: (entry: LogEntry) => void;  // NEW
}
```

Handle the new event type in the event handler.

### 4. Page Integration (`src/app/page.tsx`)

Add callback to append new entries:

```typescript
const { isConnected, connectionError } = useBoardEvents({
  // ... existing callbacks
  onActivityEntry: (entry) => {
    setLogEntries(prev => [...prev, entry]);
  },
});
```

### 5. LiveFeedPanel Enhancement (optional)

Consider auto-scrolling to newest entry when new entries arrive, unless user has scrolled up to read history.

## Implementation Complexity

This is a focused change touching:
- 1 API route (add activity.log watching + event creation)
- 1 types file (add event type + data field)
- 1 hook (add callback handling)
- 1 page (add callback implementation)

The trickiest part is efficiently reading new lines from activity.log when it changes, rather than re-reading the entire file.

## Success Criteria

- [ ] New activity log entries appear in Live Feed within 1 second of being written
- [ ] Existing initial fetch still works (shows historical entries on load)
- [ ] Multiple rapid log entries all appear (no dropped events)
- [ ] SSE connection handles activity.log changes alongside existing .md file changes
- [ ] No duplicate entries when file is modified

## Files to Modify

- `src/types/index.ts` - Add event type and data field
- `src/app/api/board/events/route.ts` - Watch activity.log, emit events
- `src/hooks/use-board-events.ts` - Add onActivityEntry callback
- `src/app/page.tsx` - Implement callback to update logEntries state

## Edge Cases

1. **Large batch writes**: If an agent writes many lines quickly, should emit individual events or batch them?
2. **File truncation**: If activity.log is cleared/rotated, how to handle?
3. **Parse errors**: If a malformed line is written, skip gracefully

## Recommended Approach for Reading New Lines

Track file size/position between events. When activity.log changes:
1. Check current file size vs last known size
2. If larger, read only the new bytes from last position
3. Parse new lines and emit events
4. Update tracked position

This avoids re-reading the entire file on every change.
