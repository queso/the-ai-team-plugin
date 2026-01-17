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
briefings → ready → testing → implementing → review → done
                       ↑           ↑            ↑
                    Murdock      B.A.        Lynch
```

**Stage transitions:**
1. `ready → testing`: Murdock writes tests (and types if specified)
2. `testing → implementing`: B.A. implements to pass tests
3. `implementing → review`: Lynch reviews ALL outputs together
4. `review → done`: Feature complete (or back to ready if rejected)
5. `all done → final review`: Lynch reviews entire codebase holistically
6. `final review → complete`: Mission complete (or items back to ready if rejected)

## Pipeline Parallelism

Different features can be at different stages simultaneously:

```
Feature 001: [testing]  →  [implementing]  →  [review]  →  done
Feature 002:      [testing]  →  [implementing]  →  [review]  →  done
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

2. **Main Claude becomes Hannibal**
   - Orchestration runs in the main context (visible to user)
   - Worker agents dispatched as direct subagents

3. **Orchestration loop:**
   - Check for completed agents, advance items to next stage
   - Move eligible items from briefings → ready
   - Start new features if under WIP limit
   - Update board.json after every change

4. **Final Mission Review:**
   - When ALL items reach `done/`, trigger final review
   - Lynch reviews entire codebase for cross-cutting issues
   - Focus: readability, security, race conditions, code quality
   - If FINAL APPROVED → proceed to completion
   - If FINAL REJECTED → specified items return to pipeline

5. **Completion:**
   - Final review approved → "I love it when a plan comes together."
   - Items in `blocked/` → Needs human intervention

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
[Hannibal] Feature 001 → done
...
[Hannibal] All features complete. Dispatching final review.
[Lynch] FINAL MISSION REVIEW - reviewing 12 files
[Lynch] VERDICT: FINAL APPROVED
[Hannibal] Final review passed.
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
    └── Task → Lynch (review stage)
```

This flat structure:
- Gives user visibility into orchestration
- Allows mid-run intervention
- Avoids nested subagent memory overhead

## Errors

- **No mission found**: Run `/ateam plan` first
- **All items blocked**: Human intervention needed via `/ateam unblock`
- **Agent failure**: Item returned to previous stage for retry
