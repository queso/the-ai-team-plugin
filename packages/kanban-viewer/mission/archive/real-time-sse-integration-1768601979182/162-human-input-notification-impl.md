---
id: "162"
title: "Human Input Tab Notification - Implementation"
type: "implementation"
status: "pending"
dependencies: ["161"]
parallel_group: "tab-notification"
rejection_count: 0
outputs:
  test: "src/__tests__/notification-dot.test.tsx"
  impl: "src/components/notification-dot.tsx"
---

## Objective

Implement notification dot indicator on the Human Input tab that appears when items are blocked awaiting human input.

## Acceptance Criteria

- [ ] Create NotificationDot component for reusable indicator
- [ ] Dot appears on Human Input tab when blocked items exist
- [ ] Dot color: amber (#f59e0b) or red (#ef4444)
- [ ] Optional count badge for multiple blocked items
- [ ] Dot positioned to right of tab text
- [ ] Animation on appearance (subtle pulse or fade-in)
- [ ] Dot updates reactively when blocked count changes

## Context

- Create: `src/components/notification-dot.tsx`
- Modify tab rendering to include NotificationDot

Visual spec from PRD:
```
Live Feed    Human Input●    Git    + New Mission
```

Component structure:
```tsx
function NotificationDot({ visible, count, className }: NotificationDotProps) {
  if (!visible) return null;

  return (
    <span className={cn(
      "inline-flex items-center justify-center",
      "w-2 h-2 rounded-full bg-amber-500",
      count && "w-4 h-4 text-[10px] text-white",
      className
    )}>
      {count && count > 0 ? count : null}
    </span>
  );
}
```

Integration with tabs needs blocked items count from board state.
