---
id: "160"
title: "Human Input Tab Notification - Interface"
type: "interface"
status: "pending"
dependencies: []
parallel_group: "tab-notification"
rejection_count: 0
outputs:
  types: "src/types/index.ts"
  test: "src/__tests__/notification-types.test.ts"
  impl: "src/types/index.ts"
---

## Objective

Define TypeScript types for the tab notification indicator system.

## Acceptance Criteria

- [ ] Define TabNotificationProps interface:
  - hasNotification: boolean
  - count?: number (optional count to display)
- [ ] Define NotificationDotProps for the indicator component
- [ ] Types support both simple dot and count badge variants
- [ ] Export from @/types

## Context

- File: `src/types/index.ts` or new `src/types/ui.ts`
- The notification can be either a simple dot or include a count
- PRD shows: `Human Input●` or with count badge

```typescript
interface TabNotificationProps {
  hasNotification: boolean;
  count?: number;
}

interface NotificationDotProps {
  visible: boolean;
  count?: number;
  className?: string;
}
```
