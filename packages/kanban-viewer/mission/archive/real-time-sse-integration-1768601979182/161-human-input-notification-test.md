---
id: "161"
title: "Human Input Tab Notification - Tests"
type: "test"
status: "pending"
dependencies: ["160"]
parallel_group: "tab-notification"
rejection_count: 0
outputs:
  test: "src/__tests__/notification-dot.test.tsx"
  impl: "src/components/notification-dot.tsx"
---

## Objective

Create tests for the notification dot indicator on the Human Input tab.

## Acceptance Criteria

- [ ] Test notification dot appears when blockedItems.length > 0
- [ ] Test notification dot hidden when blockedItems.length === 0
- [ ] Test dot has amber or red color as specified
- [ ] Test count badge shows correct number when multiple items blocked
- [ ] Test dot positioned correctly relative to tab text
- [ ] Test notification updates when blocked items change

## Context

- File: `src/__tests__/notification-dot.test.tsx`
- The notification should appear on the "Human Input" tab specifically
- Need to know where tabs are rendered to test integration
- Consider creating a reusable NotificationDot component

Test scenarios:
1. No blocked items -> no dot
2. 1 blocked item -> dot visible (possibly with "1")
3. 3 blocked items -> dot visible with "3"
4. Items unblocked -> dot disappears
