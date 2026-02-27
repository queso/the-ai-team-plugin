# PRD: Recoverable Precheck Failure

**Version:** 1.0.0
**Status:** Draft
**Author:** Josh / Claude
**Date:** 2026-02-27
**Package:** `@ai-team/kanban-viewer` + `packages/mcp-server`

---

## Problem Statement

When a mission precheck fails, the mission is permanently marked `failed` — a terminal state. The only recovery path is `mission_init(force: true)`, which archives the entire mission and all its work items. This destroys hours of planning work (Face decomposition, Sosa review, Face refinement) and forces the operator to re-run `/ai-team:plan` from scratch.

This just happened in production: a transient bug in the item ID generator caused `item_create` to fail during the planning phase. The mission was marked `failed` before any code was written. The planning artifacts (8 work items, dependency graph, parallel groups, acceptance criteria) were all trapped behind a terminal state with no recovery path.

## Business Context

The A(i)-Team planning phase is the most expensive part of a mission in both tokens and human time:

- **Face (Opus, first pass):** Reads the PRD, audits the project, decomposes into work items — ~100K tokens
- **Sosa (Opus):** Reviews every item, asks human questions, produces refinement report — ~100K tokens
- **Face (Opus, second pass):** Applies refinements, moves items to ready — ~50K tokens
- **Human time:** Answering Sosa's clarifying questions, reviewing the decomposition

A single precheck failure throws all of this away. At Opus pricing, that's ~$4-5 in API costs per lost planning cycle, plus 5-15 minutes of human attention. More importantly, it erodes operator trust — the system should not destroy work due to a transient infrastructure issue.

Precheck failures are inherently recoverable. They fail because the codebase has lint errors or test failures — things the operator can fix without re-planning the mission. The state machine should reflect this.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Preserve planning work across precheck failures | Planning phase re-runs after precheck failure | 0 (never re-plan due to precheck) |
| Enable retry without re-planning | Operator can retry precheck after fixing issue | 100% of precheck failures are retryable |
| Distinguish transient from terminal failures | `failed` state only reached during execution | Precheck never sets `failed` |

**Negative metric (must NOT degrade):**
- Mission state integrity. A mission in `precheck_failure` must not be startable without passing prechecks. The safety guarantees of the precheck gate must be preserved.

---

## User Stories

**As an** operator whose mission precheck just failed due to a lint error, **I want** to fix the lint error and retry the precheck **so that** I don't have to re-run the entire planning phase.

**As an** operator debugging a flaky test that caused precheck failure, **I want** the mission and all its work items to remain intact **so that** I can retry once the test is fixed.

**As a** Hannibal orchestrator, **I want** to distinguish between "precheck failed, retryable" and "mission failed during execution" **so that** I can present the correct recovery options to the operator.

---

## Scope

### In Scope

- New `precheck_failure` mission state
- State transition: `prechecking` -> `precheck_failure` (on failure) instead of `prechecking` -> `failed`
- State transition: `precheck_failure` -> `prechecking` (on retry)
- Updated `mission_precheck` API to accept calls from `precheck_failure` state (not just `initializing`)
- Updated MCP tool (`mission_precheck`) to support retry
- Kanban UI indication of `precheck_failure` state with retry affordance
- Orchestration playbook updates for both legacy and native teams modes

### Out of Scope

- Postcheck failure recovery (similar problem, separate PRD — postchecks have different semantics because code has already been written)
- Automatic retry logic (operator must explicitly retry after fixing the issue)
- Precheck failure notifications or alerts
- Partial precheck retry (re-run only failed checks) — always re-runs all checks on retry

---

## Requirements

### Functional Requirements

#### Mission State Machine

1. The system shall add a `precheck_failure` state to the `MissionState` type.

2. When `mission_precheck` checks fail, the mission state shall transition to `precheck_failure` instead of `failed`.

3. The `mission_precheck` endpoint shall accept missions in either `initializing` or `precheck_failure` state. Missions in any other state shall be rejected with a 400 error.

4. When retrying from `precheck_failure`, the mission shall transition through `prechecking` as normal: `precheck_failure` -> `prechecking` -> `running` (on success) or `precheck_failure` -> `prechecking` -> `precheck_failure` (on failure again).

5. The `failed` state shall be reserved for failures that occur during mission execution (`running` or `postchecking` phases). Prechecks shall never set `failed`.

6. `mission_init(force: true)` shall archive missions in `precheck_failure` state, same as it handles `failed` missions today.

#### Work Item Preservation

7. Work items shall remain in their current stage (`briefings` or `ready`) when the mission enters `precheck_failure`. Items shall not be archived, deleted, or modified.

8. The dependency graph shall remain intact across precheck retries. `deps_check` shall continue to return valid results for a mission in `precheck_failure` state.

#### API Changes

9. The `POST /api/missions/precheck` endpoint shall validate that the mission is in `initializing` or `precheck_failure` state before proceeding.

10. The precheck response shall include a `retryable: true` field when the mission enters `precheck_failure`, indicating to the caller that retry is available.

11. The `GET /api/missions/current` endpoint shall return `precheck_failure` as a valid state. No changes to the response schema beyond the new state value.

#### MCP Tool Changes

12. The `mission_precheck` MCP tool shall support being called multiple times for the same mission. Subsequent calls after a `precheck_failure` shall re-run all checks.

13. The `mission_current` MCP tool shall return `precheck_failure` as a valid state in its response.

#### Orchestration

14. Hannibal shall recognize `precheck_failure` as a non-terminal state and present the operator with a clear message: precheck failed, here's what failed, fix it and retry.

15. The `/ai-team:run` command shall handle missions in `precheck_failure` state by re-running the precheck, not by requiring re-planning.

#### Dashboard

16. The kanban-viewer shall display `precheck_failure` missions with a distinct visual treatment (not the same as `failed`) indicating the mission is recoverable.

17. The mission status area shall show the precheck failure details (which checks failed, error output) when the mission is in `precheck_failure` state.

### Non-Functional Requirements

1. State transitions shall remain atomic (single database update per transition).

2. The mission-active marker (`/tmp/.ateam-mission-active-{projectId}`) shall NOT be set when the mission is in `precheck_failure` state. It shall only be set when transitioning to `running`.

3. No additional API calls or database queries shall be required for the retry path beyond what the initial precheck already performs.

---

## State Machine (Updated)

```
initializing
    |
    v
prechecking  <----+
    |              |
    +---> running  |  (checks passed)
    |              |
    +---> precheck_failure  (checks failed, retryable)
               |
               +---> prechecking  (retry)
               +---> archived     (force init or manual archive)

running
    |
    v
postchecking
    |
    +---> completed  (checks passed)
    +---> failed     (checks failed — terminal for now)

completed/failed
    |
    v
archived
```

**Key difference from current:** `prechecking` failure goes to `precheck_failure` (recoverable) instead of `failed` (terminal). The `failed` state is reserved for execution-phase failures only.

---

## Edge Cases & Error States

- **Multiple consecutive precheck failures.** The operator fixes one issue but another check fails. The mission stays in `precheck_failure` and can be retried again. There is no limit on retry attempts — the operator retries until checks pass or abandons the mission.

- **Precheck failure followed by `mission_init(force: true)`.** The operator decides to start over. `force: true` archives the `precheck_failure` mission and its items, same as it would for a `failed` mission. Planning work is lost, but this is an explicit operator choice.

- **Work items modified while in `precheck_failure`.** Work items remain fully accessible via MCP tools. Face could theoretically update items while in this state. This is acceptable — the items were created during planning, and the operator may want to adjust them before retrying.

- **Concurrent precheck calls.** If `mission_precheck` is called while the mission is already in `prechecking` state (e.g., double-click), the second call shall be rejected with a 400 error ("mission is already prechecking").

- **Session restart during `precheck_failure`.** The mission persists in the database. A new Claude Code session can pick up the mission in `precheck_failure` state and retry. No session-level state is required.

- **Stale mission-active marker.** If a previous session crashed during `running` and left a marker, `mission_init` already clears stale markers. The `precheck_failure` state does not interact with the marker at all (marker is only set on successful precheck).

---

## Dependencies

### Internal

| Dependency | Owner | Status |
|------------|-------|--------|
| Mission state machine (`MissionState` type) | kanban-viewer | Shipped — needs new state |
| `POST /api/missions/precheck` | kanban-viewer | Shipped — needs state validation update |
| `mission_precheck` MCP tool | mcp-server | Shipped — needs retry support |
| Orchestration playbooks | Plugin | Shipped — needs `precheck_failure` handling |
| Kanban UI mission status | kanban-viewer | Shipped — needs new state rendering |

### External

None. This is entirely internal to the A(i)-Team system.

---

## Risks & Open Questions

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Operators get stuck in retry loop without understanding what to fix | Medium | Wasted time | Precheck response includes specific failure details (lint output, test names) |
| State machine complexity increases | Low | Maintenance burden | `precheck_failure` has exactly two transitions (retry or archive) — minimal complexity |
| Existing tooling doesn't recognize new state | Low | UI/API errors | `MissionState` type update propagates to all consumers via TypeScript |

### Open Questions

- [x] ~~Should there be a retry limit before auto-transitioning to `failed`?~~ **Decision:** No. The operator controls when to give up. Artificial retry limits add complexity without value — if the operator wants to retry 10 times, let them.
- [x] ~~Should `postcheck_failure` be added at the same time?~~ **Decision:** No. Postcheck failure has different semantics (code has been written, tests may be partially passing). Separate PRD if needed.
- [x] ~~Should the precheck failure details be stored on the mission record?~~ **Decision:** Yes. Store the `blockers` array and check output on the mission record so it's available across sessions and in the dashboard.

---

## Additional Requirement: Mission History & Archive Access

### Problem

When `mission_init(force: true)` archives a mission, the old mission metadata (name, PRD path, state, timestamps) becomes inaccessible. There is no way to list past missions for a project or retrieve details about archived missions. This was discovered when a PRD 008 mission was accidentally overwritten by initializing PRD 009 — the operator had no way to confirm what the previous mission was or recover its metadata.

### Requirements

#### API Endpoints

18. The system shall provide a `GET /api/missions` endpoint that lists all missions for a project (active, completed, failed, archived), ordered by `startedAt` descending.

19. The `GET /api/missions` endpoint shall support filtering by state (e.g., `?state=archived`, `?state=completed`).

20. The system shall provide a `GET /api/missions/:missionId` endpoint that returns full details for any mission, including archived missions.

#### MCP Tools

21. A `mission_list` MCP tool shall be added that lists all missions for the current project. It shall support an optional `state` filter parameter.

22. The `mission_list` tool shall return: id, name, state, prdPath, startedAt, completedAt, archivedAt for each mission.

23. The existing `mission_current` tool behavior is unchanged — it returns only the active (non-archived) mission.

#### Dashboard

24. The kanban-viewer shall include a mission history view or dropdown that shows past missions for the project.

25. Selecting an archived mission shall show its metadata (name, PRD, dates, final state) in a read-only view.
