# /ateam run

Execute the mission with the pipeline flow.

## Usage

```
/ateam run [--wip N] [--max-wip M]
```

## Arguments

- `--wip N` (optional): Set WIP limit (default: 3)
- `--max-wip M` (optional): Set maximum WIP for adaptive scaling (default: 5)

## Pipeline Flow (ALL STAGES MANDATORY)

Each feature MUST flow through ALL stages. **No shortcuts. No exceptions.**

```
briefings → ready → testing → implementing → review → probing → done
                       ↑           ↑            ↑         ↑       │
                    Murdock      B.A.        Lynch      Amy       │
                                                   (MANDATORY)    │
                                                                  ▼
                                                        ┌─────────────────┐
                                                        │  Final Review   │
                                                        │    (Lynch)      │
                                                        └────────┬────────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │  Post-Checks    │
                                                        │ (lint,unit,e2e) │
                                                        └────────┬────────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │  Documentation  │
                                                        │    (Tawnia)     │
                                                        │   (MANDATORY)   │
                                                        └─────────────────┘
```

**Stage transitions (ALL REQUIRED):**
1. `ready → testing`: Murdock writes tests (and types if specified)
2. `testing → implementing`: B.A. implements to pass tests
3. `implementing → review`: Lynch reviews ALL outputs together
4. `review → probing`: Lynch approves → **Amy MUST investigate** (NOT optional)
5. `probing → done`: Amy verifies (or back to ready if bugs found)
6. `all done → final review`: Lynch reviews entire codebase holistically
7. `final review → post-checks`: Run lint, unit, e2e tests
8. `post-checks → documentation`: **Tawnia MUST run** (NOT optional)
9. `documentation → complete`: Tawnia creates final commit, mission complete

## Pipeline Parallelism

Different features can be at different stages simultaneously:

```
Feature 001: [testing]  →  [implementing]  →  [review]  →  [probing]  →  done
Feature 002:      [testing]  →  [implementing]  →  [review]  →  [probing]
Feature 003:            [testing]  →  [implementing]  →  [review]
```

WIP limit controls how many features are in-flight (not in briefings, ready, or done stages).

## Behavior

1. **Validate mission exists**
   Use `mission_current` MCP tool to check for active mission.
   ```
   if mission not found:
       error "No mission found. Run /ateam plan first."
       exit
   ```

2. **Run pre-mission checks**
   Use the `mission_precheck` MCP tool.
   - Ensures codebase is in clean state (lint, unit tests passing)
   - Establishes baseline before mission work begins
   - If checks fail, abort mission and report to user

2.5. **Initialize team (if native teams enabled)**
   Check if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to "1".
   If enabled:
   ```javascript
   TeammateTool({
     action: "spawnTeam",
     team_name: `mission-${missionId}`,
     config: {
       display_mode: process.env.ATEAM_TEAMMATE_MODE || "auto"
     }
   })
   ```
   This creates the team container. Individual agents are spawned on-demand as items enter their stages.

   If not enabled, skip this step (legacy Task dispatch will be used).

3. **Main Claude becomes Hannibal**
   - Orchestration runs in the main context (visible to user)
   - Worker agents dispatched as direct subagents

4. **Orchestration loop:**
   - Poll `TaskOutput` for completed agents, advance items to next stage via `board_move`
   - Use `deps_check` to find items ready to move from briefings → ready
   - Start new features if under WIP limit
   - Use `board_claim` before dispatching agent, `board_release` on completion


   **Dispatch mode:**
   - **Native teams** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`): Use `TeammateTool({ action: "spawn", ... })` to create teammates. Completion detected via mailbox messages instead of TaskOutput polling.
   - **Legacy mode** (default): Use `Task(run_in_background: true)` with TaskOutput polling.

5. **Final Mission Review:**
   - When ALL items reach `done` stage, trigger final review
   - Lynch reviews entire codebase for cross-cutting issues
   - Focus: readability, security, race conditions, code quality
   - If FINAL APPROVED → proceed to post-checks
   - If FINAL REJECTED → specified items return to pipeline

6. **Post-Mission Checks:**
   Use the `mission_postcheck` MCP tool.
   - Run after final review approves
   - Verifies lint, unit tests, and e2e tests all pass
   - Updates mission state with postcheck results
   - If checks fail, items return to pipeline for fixes

7. **Documentation Phase (Tawnia):**
   - Dispatch Tawnia when ALL three conditions are met:
     1. All items in `done` stage
     2. Final review passed
     3. Post-checks passed
   - Tawnia updates CHANGELOG.md (always)
   - Tawnia updates README.md (if user-facing changes)
   - Tawnia creates/updates docs/ entries (for complex features)
   - Tawnia makes the **final commit** bundling all mission work + documentation
   - Updates mission state with documentation completion and commit hash

7.5. **Team shutdown (if native teams enabled)**
   If native teams mode was used:
   ```javascript
   // Shutdown remaining agents (Amy, Lynch may still be active)
   for (const agent of activeAgents) {
     TeammateTool({ action: "requestShutdown", target: agent.name })
   }
   ```
   Note: Don't clean up the team yet - Tawnia still needs to run.

8. **Completion (ALL conditions required):**
   - ✓ All items in `done` stage
   - ✓ Final review passed
   - ✓ Post-checks passed
   - ✓ Tawnia documentation committed ← **REQUIRED**
   - Then and ONLY then: "I love it when a plan comes together."


   - If native teams mode: clean up team resources
   ```javascript
   TeammateTool({ action: "cleanup", team_name: `mission-${missionId}` })
   ```

   **Mission is NOT complete until Tawnia commits. No exceptions.**

   - Items in `blocked` stage → Needs human intervention
   - Post-checks fail → Fix issues before documentation can run

## Progress Updates

```
[Hannibal] Feature 001 → testing, dispatching Murdock
[Murdock] 001 complete - test file created
[Hannibal] Feature 001 → implementing, dispatching B.A.
[Hannibal] Feature 002 → testing, dispatching Murdock
[B.A.] 001 complete - implementation ready
[Hannibal] Feature 001 → review, dispatching Lynch
[Murdock] 002 complete - test file created
[Lynch] 001 APPROVED
[Hannibal] Feature 001 → probing, dispatching Amy
[Amy] 001 VERIFIED - no bugs found
[Hannibal] Feature 001 → done
...
[Hannibal] All features complete. Dispatching final review.
[Lynch] FINAL MISSION REVIEW - reviewing 12 files
[Lynch] VERDICT: FINAL APPROVED
[Hannibal] Running post-mission checks...
[Hannibal] Post-checks PASSED (lint ✓, unit ✓, e2e ✓)
[Hannibal] Dispatching Tawnia for documentation and final commit.
[Tawnia] Updated CHANGELOG.md with 4 entries
[Tawnia] Updated README.md
[Tawnia] COMMITTED a1b2c3d - feat: Mission Name
[Hannibal] Documentation complete.
"I love it when a plan comes together."
```

## Example

```
# Default WIP of 3
/ateam run

# Higher parallelism
/ateam run --wip 4 --max-wip 6

# Sequential (one at a time)
/ateam run --wip 1 --max-wip 1
```

## Implementation Notes

**Hannibal runs in the MAIN context, not as a subagent.**

The main Claude session becomes Hannibal and orchestrates directly:

```
Main Claude (as Hannibal)
    ├── Task → Murdock (testing stage)
    ├── Task → B.A. (implementing stage)
    ├── Task → Lynch (review stage, final review)
    ├── Task → Amy (probing stage)
    └── Task → Tawnia (documentation, after post-checks pass)
```

This flat structure:
- Gives user visibility into orchestration
- Allows mid-run intervention
- Avoids nested subagent memory overhead


**Native Teams Mode:**

When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`:
```
Main Claude (as Hannibal / Team Lead)
    ├── TeammateTool → Murdock  (tester, testing stage)
    ├── TeammateTool → B.A.     (coder, implementing stage)
    ├── TeammateTool → Lynch    (reviewer, review + final review)
    ├── TeammateTool → Amy      (researcher, probing stage)
    └── TeammateTool → Tawnia   (documenter, after post-checks)
```

Benefits over legacy mode:
- Direct mailbox communication (no TaskOutput polling)
- Split pane visualization (tmux)
- Interactive user control (Shift+Up/Down to select agents)
- Plan approval for complex items

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `mission_current` | Check mission exists and get state |
| `mission_precheck` | Run lint/tests before starting |
| `mission_postcheck` | Run lint/tests after all done |
| `board_read` | Get current board state |
| `board_move` | Move items between stages |
| `board_claim` | Assign agent to item |
| `board_release` | Release agent assignment |
| `item_list` | List items by stage |
| `deps_check` | Find items ready to advance |
| `agent_start` | Signal agent beginning work |
| `agent_stop` | Signal agent completed work |
| `log` | Write to activity feed |

## Errors

- **No mission found**: Run `/ateam plan` first
- **All items blocked**: Human intervention needed via `/ateam unblock`
- **Agent failure**: Item returned to previous stage for retry
- **API unavailable**: Cannot connect to A(i)-Team server
