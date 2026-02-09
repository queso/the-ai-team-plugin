---
id: '009'
title: Fix E2E regression script async error handling
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/scripts/e2e-regression-cleanup.test.ts
  impl: scripts/e2e-regression.ts
dependencies: []
parallel_group: e2e-fixes
---
## Objective

Add proper error handling to cleanup operations in e2e-regression.ts to prevent unhandled promise rejections.

## Acceptance Criteria

- [ ] archivePreviousMission and cleanupStaleClaims are wrapped in try-catch
- [ ] Cleanup errors are logged with clear messages but do not crash the script
- [ ] Script continues to main test execution even if cleanup encounters issues
- [ ] Cleanup failure messages indicate the operation can be retried

## Context

In scripts/e2e-regression.ts (lines 293-295), cleanup operations are called without error handling. If getBoardState() fails in cleanupStaleClaims(), it propagates up and crashes the script. The fix wraps both cleanup operations in try-catch.
