---
id: '004'
title: Update Header with mission phase status display
type: implementation
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/header-bar.test.tsx
  impl: src/components/header-bar.tsx
dependencies:
  - '001'
work_log:
  - agent: Murdock
    timestamp: '2026-01-20T19:11:32.117Z'
    status: success
    summary: >-
      Added 11 test cases for mission phase status display: final_review
      (purple), post_checks (yellow), documentation (teal), complete (green with
      checkmark), plus 3 regression tests for existing states
    files_created:
      - src/__tests__/header-bar.test.tsx
  - agent: B.A.
    timestamp: '2026-01-20T19:13:19.595Z'
    status: success
    summary: >-
      Extended statusConfig with 4 new mission phases: final_review (purple),
      post_checks (yellow), documentation (teal), complete (green). All 89
      header-bar tests passing.
    files_modified:
      - src/components/header-bar.tsx
  - agent: Lynch
    timestamp: '2026-01-20T19:16:13.873Z'
    status: success
    summary: >-
      APPROVED - All tests pass, implementation matches spec for mission phase
      status display
  - agent: Amy
    timestamp: '2026-01-20T19:22:58.115Z'
    status: success
    summary: >-
      VERIFIED - All probes pass: statusConfig covers all 8 Mission.status
      values, fallback handles edge cases, tests comprehensive
---
## Objective

Extend the HeaderBar component to display mission phase status during the completion flow, showing different indicators for final_review, post_checks, documentation, and complete phases.

## Acceptance Criteria

- [ ] Header shows FINAL REVIEW with purple dot when mission.status is final_review
- [ ] Header shows POST-CHECKS with yellow dot when mission.status is post_checks
- [ ] Header shows DOCUMENTATION with teal dot when mission.status is documentation
- [ ] Header shows MISSION COMPLETE with green checkmark when mission.status is complete
- [ ] Status indicator colors: final_review=purple, post_checks=yellow, documentation=teal, complete=green checkmark
- [ ] Existing active/paused/planning states continue to work


## Context

The HeaderBar component uses a statusConfig object to map status values to display colors and labels. This needs to be extended to support the new mission phases. The Mission type status field must be updated first (item 001).

## Work Log
Amy - VERIFIED - All probes pass: statusConfig covers all 8 Mission.status values, fallback handles edge cases, tests comprehensive
Lynch - APPROVED - All tests pass, implementation matches spec for mission phase status display
B.A. - Extended statusConfig with 4 new mission phases: final_review (purple), post_checks (yellow), documentation (teal), complete (green). All 89 header-bar tests passing.
Murdock - Added 11 test cases for mission phase status display: final_review (purple), post_checks (yellow), documentation (teal), complete (green with checkmark), plus 3 regression tests for existing states
