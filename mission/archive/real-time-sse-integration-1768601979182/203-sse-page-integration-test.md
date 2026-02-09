---
id: "203"
title: "Test SSE hook integration in main page"
type: "test"
outputs:
  test: "src/__tests__/page-sse-integration.test.tsx"
dependencies: ["202"]
parallel_group: "sse-integration"
status: "pending"
rejection_count: 0
---

## Objective

Create tests verifying that the main page correctly integrates the useBoardEvents hook and updates state in response to SSE events.

## Acceptance Criteria

- [ ] Test that useBoardEvents hook is called with correct callbacks
- [ ] Test onItemAdded callback adds new item to workItems state
- [ ] Test onItemMoved callback updates item's stage property
- [ ] Test onItemUpdated callback replaces item in state with updated data
- [ ] Test onItemDeleted callback removes item from state
- [ ] Test onBoardUpdated callback replaces boardMetadata state
- [ ] Test connection status indicator is rendered with correct status
- [ ] Test SSE connection is cleaned up on component unmount (no memory leaks)
- [ ] Test initial data fetch still works alongside SSE subscription

## Technical Notes

This test file will need to mock:
- The `useBoardEvents` hook to control connection state and trigger callbacks
- The fetch API for initial data loading

Use `vi.mock` to mock the hook module:
```tsx
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn()
}));
```

Test each callback by:
1. Rendering the page with initial state
2. Triggering the callback via the mocked hook
3. Asserting the UI reflects the state change

## Context

The page already has:
- `boardMetadata` / `setBoardMetadata` for BoardMetadata
- `workItems` / `setWorkItems` for WorkItem[]

The callbacks need to correctly update these state variables when events arrive.
