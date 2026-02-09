---
id: '001'
title: Add TypeScript types for mission completion flow
type: interface
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/types-mission-completion.test.ts
  impl: src/types/index.ts
  types: src/types/index.ts
dependencies: []
work_log:
  - agent: Murdock
    timestamp: '2026-01-20T19:04:32.036Z'
    status: success
    summary: >-
      Created 36 test cases covering AgentName (Tawnia), MissionPhase,
      CheckResult, FinalReviewStatus, PostChecksStatus, DocumentationStatus,
      BoardMetadata extensions, and Mission.status extensions. TypeScript
      compilation errors confirm missing types that B.A. must implement.
    files_created:
      - src/__tests__/types-mission-completion.test.ts
  - agent: B.A.
    timestamp: '2026-01-20T19:06:15.277Z'
    status: success
    summary: >-
      Implemented all mission completion types: AgentName includes Tawnia (7
      agents), MissionPhase, CheckResultStatus, CheckResult, FinalReviewStatus,
      PostChecksStatus, DocumentationStatus interfaces, extended BoardMetadata
      with optional finalReview/postChecks/documentation fields, extended
      Mission.status with new phases. All 36 type tests passing.
    files_modified:
      - src/types/index.ts
  - agent: Lynch
    timestamp: '2026-01-20T19:07:17.215Z'
    status: success
    summary: >-
      APPROVED - All 36 type tests pass. Implementation correctly defines all
      required types: AgentName (7 agents incl Tawnia), MissionPhase,
      CheckResult, FinalReviewStatus, PostChecksStatus, DocumentationStatus,
      extends BoardMetadata and Mission.status. TypeScript errors in other files
      are expected downstream effects of adding Tawnia to AgentName.
  - agent: Amy
    timestamp: '2026-01-20T19:08:40.509Z'
    status: success
    summary: >-
      FLAG - Found 6 type specification discrepancies vs PRD 012:
      FinalReviewStatus.rejections is number vs string[],
      FinalReviewStatus.verdict is string vs APPROVED|REJECTED,
      FinalReviewStatus.agent allows any agent vs Lynch, CheckResult missing
      error/failures fields, PostChecksStatus.results has different check names
      (typecheck/test/build vs unit/e2e), DocumentationStatus.commit is string
      vs object with hash+message
---
## Objective

Define TypeScript interfaces and types for the mission completion flow including FinalReviewStatus, PostChecksStatus, CheckResult, DocumentationStatus, and extend existing types to support Tawnia agent (Amy already exists in codebase).

## Acceptance Criteria

- [ ] AgentName type includes Tawnia (7 agents total)
- [ ] FinalReviewStatus interface defined with started_at, completed_at, passed, verdict, agent, rejections fields
- [ ] PostChecksStatus interface defined with started_at, completed_at, passed, results fields
- [ ] CheckResult interface defined with status and completed_at fields
- [ ] CheckResult.status is typed as pending | running | passed | failed
- [ ] DocumentationStatus interface defined with started_at, completed_at, completed, agent, files_modified, commit, summary fields
- [ ] MissionPhase type defined as active | final_review | post_checks | documentation | complete
- [ ] BoardMetadata interface extended with optional finalReview, postChecks, documentation fields
- [ ] Mission interface status field extended to include new phases
- [ ] Existing Mission.status values remain supported


## Context

This is the foundation item for PRD 012 - Tawnia and Mission Completion Flow. All other items depend on these type definitions. The types should follow existing patterns in src/types/index.ts.

## Work Log
Amy - FLAG - Found 6 type specification discrepancies vs PRD 012: FinalReviewStatus.rejections is number vs string[], FinalReviewStatus.verdict is string vs APPROVED|REJECTED, FinalReviewStatus.agent allows any agent vs Lynch, CheckResult missing error/failures fields, PostChecksStatus.results has different check names (typecheck/test/build vs unit/e2e), DocumentationStatus.commit is string vs object with hash+message
Lynch - APPROVED - All 36 type tests pass. Implementation correctly defines all required types: AgentName (7 agents incl Tawnia), MissionPhase, CheckResult, FinalReviewStatus, PostChecksStatus, DocumentationStatus, extends BoardMetadata and Mission.status. TypeScript errors in other files are expected downstream effects of adding Tawnia to AgentName.
B.A. - Implemented all mission completion types: AgentName includes Tawnia (7 agents), MissionPhase, CheckResultStatus, CheckResult, FinalReviewStatus, PostChecksStatus, DocumentationStatus interfaces, extended BoardMetadata with optional finalReview/postChecks/documentation fields, extended Mission.status with new phases. All 36 type tests passing.
Murdock - Created 36 test cases covering AgentName (Tawnia), MissionPhase, CheckResult, FinalReviewStatus, PostChecksStatus, DocumentationStatus, BoardMetadata extensions, and Mission.status extensions. TypeScript compilation errors confirm missing types that B.A. must implement.
