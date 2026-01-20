# /ateam run

Execute the mission with the pipeline flow.

## Usage

```
/ateam run [--wip N] [--max-wip M]
```

## Arguments

- `--wip N` (optional): Set WIP limit (default: 3)
- `--max-wip M` (optional): Set maximum WIP for adaptive scaling (default: 5)

## Pipeline Flow

Each feature flows through stages:

```
briefings → ready → testing → implementing → review → probing → done
                       ↑           ↑            ↑         ↑       │
                    Murdock      B.A.        Lynch      Amy       │
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
                                                        └─────────────────┘
```

**Stage transitions:**
1. `ready → testing`: Murdock writes tests (and types if specified)
2. `testing → implementing`: B.A. implements to pass tests
3. `implementing → review`: Lynch reviews ALL outputs together
4. `review → probing`: Lynch approves, Amy investigates for bugs beyond tests
5. `probing → done`: Amy verifies (or back to ready if bugs found)
6. `all done → final review`: Lynch reviews entire codebase holistically
7. `final review → post-checks`: Run lint, unit, e2e tests
8. `post-checks → documentation`: Tawnia updates CHANGELOG, README, docs/
9. `documentation → complete`: Tawnia creates final commit, mission complete

## Pipeline Parallelism

Different features can be at different stages simultaneously:

```
Feature 001: [testing]  →  [implementing]  →  [review]  →  [probing]  →  done
Feature 002:      [testing]  →  [implementing]  →  [review]  →  [probing]
Feature 003:            [testing]  →  [implementing]  →  [review]
```

WIP limit controls how many features are in-flight (not in briefings/ready/done).

## Behavior

1. **Validate mission exists**
   ```
   if not exists(mission/board.json):
       error "No mission found. Run /ateam plan first."
       exit
   ```

2. **Run pre-mission checks**
   ```bash
   node .claude/ai-team/scripts/mission-precheck.js
   ```
   - Ensures codebase is in clean state (lint, unit tests passing)
   - Establishes baseline before mission work begins
   - If checks fail, abort mission and report to user

3. **Main Claude becomes Hannibal**
   - Orchestration runs in the main context (visible to user)
   - Worker agents dispatched as direct subagents

4. **Orchestration loop:**
   - Check for completed agents, advance items to next stage
   - Move eligible items from briefings → ready
   - Start new features if under WIP limit
   - Update board.json after every change

5. **Final Mission Review:**
   - When ALL items reach `done/`, trigger final review
   - Lynch reviews entire codebase for cross-cutting issues
   - Focus: readability, security, race conditions, code quality
   - If FINAL APPROVED → proceed to post-checks
   - If FINAL REJECTED → specified items return to pipeline

6. **Post-Mission Checks:**
   ```bash
   node .claude/ai-team/scripts/mission-postcheck.js
   ```
   - Run after final review approves
   - Verifies lint, unit tests, and e2e tests all pass
   - Updates `board.json` with `postChecks.passed: true`
   - If checks fail, items return to pipeline for fixes

7. **Documentation Phase (Tawnia):**
   - Dispatch Tawnia when ALL three conditions are met:
     1. All items in `done/`
     2. `finalReview.passed: true` in board.json
     3. `postChecks.passed: true` in board.json
   - Tawnia updates CHANGELOG.md (always)
   - Tawnia updates README.md (if user-facing changes)
   - Tawnia creates/updates docs/ entries (for complex features)
   - Tawnia makes the **final commit** bundling all mission work + documentation
   - Updates `board.json` with `documentation.completed: true` and `commit.hash`

8. **Completion:**
   - Documentation complete → "I love it when a plan comes together."
   - Items in `blocked/` → Needs human intervention
   - Post-checks fail → Fix issues before documentation can run
   - Mission is NOT complete until Tawnia commits

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

## Errors

- **No mission found**: Run `/ateam plan` first
- **All items blocked**: Human intervention needed via `/ateam unblock`
- **Agent failure**: Item returned to previous stage for retry
