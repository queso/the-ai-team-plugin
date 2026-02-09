---
id: "163"
title: "Human Input Tab Notification - Integration"
type: "integration"
status: "pending"
dependencies: ["162"]
parallel_group: "tab-notification"
rejection_count: 0
outputs:
  test: "src/__tests__/notification-integration.test.tsx"
  impl: "src/components/live-feed-panel.tsx"
---

## Objective

Integrate the notification dot with the actual blocked items state from the board data.

## Acceptance Criteria

- [ ] NotificationDot receives blockedItems count from board state
- [ ] Dot updates in real-time when items become blocked/unblocked
- [ ] Works with SSE updates for live board changes
- [ ] Tab shows notification immediately when first blocked item appears
- [ ] Tab clears notification when all blocked items resolved

## Context

- The board state likely has phases.blocked array with item IDs
- Need to wire up blocked count to the tab component
- May need to lift state or use context depending on component structure

Integration points:
1. Board state tracks blocked items
2. Tab container receives blocked count
3. Human Input tab renders NotificationDot with count

```tsx
// In tab container/page
const blockedCount = boardState.phases.blocked?.length ?? 0;

<TabsTrigger value="human-input">
  Human Input
  <NotificationDot visible={blockedCount > 0} count={blockedCount} />
</TabsTrigger>
```
