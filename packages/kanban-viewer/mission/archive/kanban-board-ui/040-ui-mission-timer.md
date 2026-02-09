---
id: "040"
title: "MissionTimer component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/mission-timer.tsx"
  test: "src/__tests__/mission-timer.test.tsx"
  impl: "src/components/mission-timer.tsx"
---

## Objective

Create a React component for the mission elapsed time display that updates every second.

## Acceptance Criteria

- [ ] Displays elapsed time in HH:MM:SS format
- [ ] Updates every second when mission is active
- [ ] Pauses updates when mission status is paused
- [ ] Clock/timer icon from Lucide
- [ ] Accepts startedAt timestamp and status props
- [ ] Handles missing startedAt gracefully (shows 00:00:00)
- [ ] Cleans up interval on unmount

## Context

Mission timer design from PRD:
```
@ 00:23:51
```

Shows elapsed time since mission started.

Props:
```typescript
interface MissionTimerProps {
  startedAt: string;  // ISO timestamp from mission.started_at
  status: 'active' | 'paused' | 'blocked';
}
```

Time calculation:
```typescript
const elapsed = Date.now() - new Date(startedAt).getTime();
const hours = Math.floor(elapsed / 3600000);
const minutes = Math.floor((elapsed % 3600000) / 60000);
const seconds = Math.floor((elapsed % 60000) / 1000);
// Format as HH:MM:SS with leading zeros
```

Use useEffect with setInterval for live updates. Clean up interval on unmount or when status changes to paused.
