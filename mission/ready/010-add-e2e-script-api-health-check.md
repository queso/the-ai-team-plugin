---
id: '010'
title: Add E2E script API health check
type: bug
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/scripts/e2e-regression-health-check.test.ts
  impl: scripts/e2e-regression.ts
dependencies: []
parallel_group: e2e-fixes
---
## Objective

Add a health check to the E2E regression script before starting tests to verify the API is reachable.

## Acceptance Criteria

- [ ] Script checks API availability before cleanup and initialization
- [ ] Clear error message shown if server is not running
- [ ] Suggests npm run dev command to start server
- [ ] Script exits with code 1 on connection failure
- [ ] Successful health check allows test to proceed

## Context

In scripts/e2e-regression.ts (lines 282-305), the script immediately creates a mission without verifying the API is reachable. Users must wait through setup before realizing the server is unavailable. A GET /api/board health check should run first.
