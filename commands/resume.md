# /ateam resume

Resume an interrupted mission from where it left off.

## Usage

```
/ateam resume
```

## Behavior

1. **Validate mission exists**
   ```
   if not exists(mission/board.json):
       error "No mission found. Nothing to resume."
       exit
   ```

2. **Check mission state**
   - Read `mission/board.json`
   - Count items in each phase
   - Identify interrupted work

3. **Recover interrupted work**

   Items in active stages during interruption:
   - `testing/` items → back to `ready/`
   - `implementing/` items → back to `testing/` (tests already exist)
   - `review/` items → back to `implementing/` (impl already exists)
   - Clear assignments

   ```
   for item in testing/:
       move to ready/
   for item in implementing/:
       move to testing/  # Will re-run through B.A.
   for item in review/:
       move to implementing/  # Will re-run through Lynch
   clear assignments
   ```

4. **Validate board integrity**
   - Check for orphaned items
   - Verify dependency graph is consistent
   - Ensure no items are "lost"

5. **Display recovery summary**
   ```
   The A(i)-Team is back. Resuming mission...

   Recovered state:
   - {n} items were in-progress, moved to ready
   - {m} items in review (will be re-reviewed)

   Current state:
   - Briefings: {x}
   - Ready:     {y}
   - Done:      {z}
   - Blocked:   {b}

   Resuming orchestration...
   ```

6. **Start Hannibal orchestration**
   - Same as `/ateam run` from recovered state
   - Hannibal picks up from current board state

## Recovery Rules

### Items in `in-progress/`
- Move to `ready/`
- Agent may have partially completed
- Partial outputs are preserved but flagged

### Items in `review/`
- Stay in `review/`
- Lynch will re-review on resume

### Items in `done/`
- Never re-done
- Already approved by Lynch

### Items in `blocked/`
- Stay blocked
- Require human intervention via `/ateam unblock`

## Example

```
# Original run was interrupted
^C

# Later, resume
/ateam resume
```

Output:
```
The A(i)-Team is back. Resuming mission...

Recovered state:
- 2 items were in-progress, moved to ready
- 1 item in review (will be re-reviewed)

Current state:
- Briefings: 3
- Ready:     5
- Done:      7
- Blocked:   0

[Hannibal] "Time to get back to work."
[Hannibal] Dispatching B.A. on 021-impl
[Hannibal] Dispatching Murdock on 015-tests
...
```

## Implementation Notes

**Hannibal runs in the MAIN context, not as a subagent.**

This command:

1. Reads `mission/board.json`
2. Moves any `in_progress` items to `ready`
3. Updates `board.json` with corrected state
4. Main Claude BECOMES Hannibal and continues orchestration

```
# Recovery logic (done by main Claude)
board = read_json("mission/board.json")

recovered = []
for item_id in board.phases.in_progress:
    move_file(f"mission/in-progress/{item_id}.md", f"mission/ready/{item_id}.md")
    board.phases.ready.append(item_id)
    recovered.append(item_id)

board.phases.in_progress = []
board.assignments = {}

write_json("mission/board.json", board)

# Main Claude then operates as Hannibal
# Dispatching Murdock/B.A./Lynch as direct subagents
```

**Architecture:**
```
Main Claude (as Hannibal)
    ├── Task → Murdock (subagent)
    ├── Task → B.A. (subagent)
    └── Task → Lynch (subagent)
```

## Errors

- **No mission found**: Nothing to resume
- **Corrupted board.json**: Manual intervention needed
- **All items blocked**: No work to resume (use `/ateam unblock`)
