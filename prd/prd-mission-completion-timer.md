# PRD: Mission Completion Timer

## Problem Statement

The mission timer in the header bar runs indefinitely, even after all work items have been moved to `done` and `mission.completed_at` has been set. Users cannot see when a mission was completed or its total duration.

## Background

The `board-move.js` script now automatically sets `mission.completed_at` and `mission.duration_ms` when the last item moves to `done`. However, the UI does not consume these values:

```json
{
  "mission": {
    "name": "UI Enhancements v0.3.0",
    "status": "planning",
    "created_at": "2026-01-17T06:03:45.423Z",
    "started_at": "2026-01-17T06:20:30.918Z",
    "completed_at": "2026-01-17T07:15:00.000Z",
    "duration_ms": 3269082
  }
}
```

## Requirements

### 1. Stop Timer on Mission Completion

**Acceptance Criteria:**
- [ ] When `mission.completed_at` is present, timer stops counting
- [ ] Timer displays final elapsed time (frozen at completion moment)
- [ ] Timer uses `duration_ms` if available, otherwise calculates from `started_at` to `completed_at`

### 2. Visual Indicator for Completed Mission

**Acceptance Criteria:**
- [ ] Status indicator shows completion state (use existing `completed` status color - red)
- [ ] Status text changes to "MISSION COMPLETE"
- [ ] Timer display gets subtle visual treatment indicating it's frozen (e.g., checkmark icon or muted style)

### 3. Handle Real-time Completion via SSE

**Acceptance Criteria:**
- [ ] When `board-updated` SSE event arrives with `completed_at` set, timer freezes immediately
- [ ] No page refresh required to see completion state
- [ ] Timer transitions smoothly from running to frozen state

### 4. Support Mission Reopening

**Acceptance Criteria:**
- [ ] If an item is moved OUT of `done` (mission reopened), timer resumes
- [ ] `completed_at` being cleared reactivates the timer
- [ ] Status reverts to active state

## Technical Approach

### Files to Modify

1. **`src/types/index.ts`** - Add `completed_at?: string` and `duration_ms?: number` to Mission interface
2. **`src/components/header-bar.tsx`** - Timer logic and completion display
3. **`src/__tests__/header-bar.test.tsx`** - Test coverage for completion states

### Implementation Notes

The `HeaderBar` component currently has:
```typescript
function getMissionStartTime(mission: Mission): string | undefined {
  return mission.started_at || mission.created_at;
}
```

Add completion detection:
```typescript
function getMissionEndTime(mission: Mission): string | undefined {
  return mission.completed_at;
}

function isMissionComplete(mission: Mission): boolean {
  return mission.status === 'completed' || !!mission.completed_at;
}
```

Timer effect should check for completion:
```typescript
useEffect(() => {
  // Don't run timer if mission is complete
  if (mission.completed_at || mission.status === 'completed') {
    // Set final elapsed time from duration_ms or calculate it
    const finalTime = mission.duration_ms
      ? Math.floor(mission.duration_ms / 1000)
      : calculateElapsedSeconds(getMissionStartTime(mission), mission.completed_at);
    setElapsedTime(finalTime);
    return;
  }
  // ... existing timer logic
}, [mission.status, mission.completed_at]);
```

## Out of Scope

- Mission archiving UI (separate feature)
- Duration breakdown by stage (available in `history` but not displayed)
- Per-item duration display in cards

## Success Metrics

- Timer correctly freezes when mission completes
- Timer correctly resumes if mission is reopened
- All existing timer tests continue to pass
- New tests cover completion scenarios

## Dependencies

- Requires `board-move.js` timestamp tracking (already implemented)
- Mission interface must support `completed_at?: string` and `duration_ms?: number`
