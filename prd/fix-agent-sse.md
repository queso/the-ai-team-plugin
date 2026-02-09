# PRD: Fix SSE Connection Status and Agent Status Updates

## Overview

The kanban viewer has four related issues affecting real-time updates: intermittent "Disconnected" status display, agent status bar not updating via SSE, progress stats not updating when items complete, and mission timer not ticking.

## Problem Statement

Users experience a degraded real-time experience where:
1. The connection status indicator shows "Disconnected" during page load and reconnection attempts, even when the connection is actively being established
2. Agent status changes (e.g., Murdock changing from IDLE to WORKING) only appear after a full page refresh, not via the live SSE stream
3. Progress stats in the header bar (e.g., "0/4" completed) do not update when items move to done, requiring a page refresh
4. The mission timer in the header bar shows a static value from page load instead of continuously ticking to show elapsed time

## Investigation Findings

### Issue 1: Connection Status Shows "Disconnected" Incorrectly

**Symptom:** The UI displays a red "Disconnected" indicator at the top of the page during initial page load and during reconnection attempts.

**Root Cause:** The `useBoardEvents` hook tracks connection state as a simple boolean (`isConnected: true/false`). When the component mounts, this value starts as `false` and only becomes `true` after the SSE connection's `onopen` event fires.

**Impact:** During the window between component mount and connection establishment (typically 100-500ms), users see "Disconnected" which creates unnecessary concern. The same issue occurs during reconnection attempts with exponential backoff.

**Expected Behavior:** The UI should show "Connecting..." with an amber indicator during connection establishment, only showing "Disconnected" if the connection actually fails.

**Relevant Files:**
- `src/hooks/use-board-events.ts` - SSE connection hook
- `src/app/page.tsx` - Connection status derivation
- `src/components/connection-status-indicator.tsx` - Status display component
- `src/types/index.ts` - ConnectionStatus type definition (already includes 'connecting' state)

---

### Issue 2: Agent Status Bar Does Not Update via SSE

**Symptom:** When an agent's status changes in board.json (e.g., Murdock status changes from "idle" to "working"), the agent status bar at the bottom of the screen does not update. Users must refresh the page to see the updated status.

**Root Cause:** The SSE endpoint correctly detects board.json file changes and emits `board-updated` events. However, the event creation function returns an empty data payload. The client-side handler checks for board data in the event payload and, finding none, discards the event without triggering an update.

**Impact:** The agent status bar becomes stale, showing incorrect information about which agents are currently working. This defeats the purpose of the real-time kanban board and requires users to manually refresh to see accurate agent states.

**Expected Behavior:** When board.json changes, the SSE endpoint should include the updated board metadata in the event payload. The client should receive this data and update the agent status bar accordingly.

**Relevant Files:**
- `src/app/api/board/events/route.ts` - SSE endpoint and event creation
- `src/hooks/use-board-events.ts` - Client-side event handler
- `src/app/page.tsx` - Board metadata state and agent status derivation

---

### Issue 3: Progress Stats Do Not Update via SSE

**Symptom:** The header bar displays progress stats (e.g., "0/4" showing completed items out of total). When an item moves to the done column, this counter does not update. The Live Feed correctly shows "Feature 001 → done" but the progress indicator remains stale.

**Root Cause:** Same as Issue 2. The progress stats are derived from `boardMetadata.stats` which comes from board.json. Since the `board-updated` SSE event contains no data payload, the stats never update on the client.

**Impact:** Users cannot see mission progress at a glance without refreshing. This is particularly confusing when the Live Feed shows items completing but the progress counter contradicts it.

**Expected Behavior:** When board.json stats change (items complete, WIP changes, etc.), the header bar should reflect the updated counts within 1 second.

**Relevant Files:**
- `src/app/api/board/events/route.ts` - SSE endpoint (same fix as Issue 2)
- `src/components/header-bar.tsx` - Header bar displaying stats
- `src/app/page.tsx` - Stats passed to HeaderBar component

---

### Issue 4: Mission Timer Does Not Tick

**Symptom:** The mission timer in the top-right header (e.g., "00:00:29") displays the elapsed time calculated at page load but does not continue counting up. The timer remains frozen at the initial value.

**Root Cause:** The timer component likely calculates elapsed time once on mount (from `mission.started_at` to current time) but does not set up an interval to re-calculate and update the display every second.

**Impact:** Users cannot see how long the mission has been running in real-time. This makes the timer essentially useless for monitoring mission duration during active work.

**Expected Behavior:** The mission timer should:
- Calculate initial elapsed time from `mission.started_at` (or `mission.created_at` as fallback)
- Update every second to show continuously ticking elapsed time
- Stop ticking and show final duration when `mission.completed_at` is set

**Relevant Files:**
- `src/components/header-bar.tsx` - Header bar containing timer display
- `src/components/mission-timer.tsx` - Timer component (if separate)
- `src/app/page.tsx` - Mission data passed to header

---

## Acceptance Criteria

### Connection Status
- [ ] Connection indicator shows "Connecting..." (amber) during initial connection establishment
- [ ] Connection indicator shows "Connected" (green) when SSE connection is open
- [ ] Connection indicator shows "Connecting..." (amber) during reconnection attempts
- [ ] Connection indicator shows "Disconnected" (red) only after connection failure or max retries exceeded
- [ ] Connection indicator shows "Error" (red) when a connection error occurs with error message

### Agent Status Updates
- [ ] When board.json is modified, the SSE endpoint emits a `board-updated` event containing the full board metadata
- [ ] Client receives the event and updates the board metadata state
- [ ] Agent status bar reflects the updated agent statuses without page refresh
- [ ] Changes to agent `status` and `current_item` fields propagate within 1 second

### Progress Stats Updates
- [ ] Header bar progress counter (e.g., "1/4") updates when items move to done
- [ ] WIP indicator updates when items enter/exit WIP stages
- [ ] Stats update within 1 second of board.json change
- [ ] No page refresh required to see updated progress

### Mission Timer
- [ ] Timer displays elapsed time since `mission.started_at` (or `created_at` as fallback)
- [ ] Timer ticks every second showing continuously updating elapsed time
- [ ] Timer stops and shows final duration when `mission.completed_at` is set
- [ ] Timer handles missing/invalid date fields gracefully (shows placeholder, not NaN)

---

## Out of Scope

- Changes to how board.json is written (handled by A(i)-Team scripts)
- Adding new SSE event types
- Modifications to the agent status bar UI design
- Performance optimization of file watching

---

## Technical Notes

- The `ConnectionStatus` TypeScript type already includes the `'connecting'` state - it just needs to be utilized
- The SSE endpoint already has file watching infrastructure that detects board.json changes
- The client-side `onBoardUpdated` callback is already wired up in page.tsx - it just never receives data
- Consider whether the board data should be read synchronously during event creation or if an async pattern is needed

---

## Priority

**High** - These issues undermine the core value proposition of the real-time kanban viewer and create a confusing user experience.
