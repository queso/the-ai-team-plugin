---
id: 019
title: Fix frontend error handling in data fetching
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/page-error-handling.test.tsx
  impl: src/app/page.tsx
dependencies: []
parallel_group: frontend-fixes
---
## Objective

Improve error handling in page.tsx data fetching to properly handle non-ok responses and distinguish between different error types.

## Acceptance Criteria

- [ ] Non-ok responses from /api/board are handled with specific error messages
- [ ] Non-ok responses from /api/activity are handled gracefully (activity log is optional)
- [ ] Error messages indicate which endpoint failed
- [ ] Network errors vs parse errors vs API errors are distinguished
- [ ] User sees actionable error messages

## Context

In src/app/page.tsx (lines 352-396), fetch errors are not fully handled. If /api/board returns 500, boardRes.ok is false but no error state is set. If /api/activity returns 404, we silently continue. Users see generic Failed to load board data with no details.
