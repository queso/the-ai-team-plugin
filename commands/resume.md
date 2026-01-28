# /ateam resume

Resume an interrupted mission from where it left off.

## Usage

```
/ateam resume
```

## Behavior

1. **Validate mission exists**
   Use `mission_current` MCP tool to check for active mission.
   ```
   if mission not found:
       error "No mission found. Nothing to resume."
       exit
   ```

2. **Check mission state**
   - Use `board_read` MCP tool to get current state
   - Count items in each stage
   - Identify interrupted work

3. **Recover interrupted work**

   Items in active stages during interruption need recovery:
   - `testing` items → back to `ready` stage
   - `implementing` items → back to `testing` stage (tests already exist)
   - `review` items → back to `implementing` stage (impl already exists)
   - Clear agent assignments

   Use `board_move` MCP tool for each recovery:
   ```
   for item in testing stage:
       board_move(itemId, to="ready")
   for item in implementing stage:
       board_move(itemId, to="testing")  # Will re-run through B.A.
   for item in review stage:
       board_move(itemId, to="implementing")  # Will re-run through Lynch
   ```

4. **Validate board integrity**
   - Use `deps_check` MCP tool to verify dependency graph
   - Check for orphaned items
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

### Items in `testing` stage
- Move to `ready` stage
- Agent may have partially completed
- Partial outputs are preserved but flagged

### Items in `review` stage
- Stay in `review` stage
- Lynch will re-review on resume

### Items in `done` stage
- Never re-done
- Already approved by Lynch

### Items in `blocked` stage
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

1. Uses `board_read` MCP tool to get current state
2. Uses `board_move` MCP tool to recover any in-progress items
3. Uses `board_release` MCP tool to clear stale assignments
4. Main Claude BECOMES Hannibal and continues orchestration

**Architecture:**
```
Main Claude (as Hannibal)
    ├── Task → Murdock (subagent)
    ├── Task → B.A. (subagent)
    └── Task → Lynch (subagent)
```

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `mission_current` | Check mission exists |
| `board_read` | Get current board state |
| `board_move` | Move items to recover state |
| `board_release` | Clear stale agent assignments |
| `deps_check` | Verify dependency graph integrity |

## Errors

- **No mission found**: Nothing to resume
- **All items blocked**: No work to resume (use `/ateam unblock`)
- **API unavailable**: Cannot connect to A(i)-Team server
