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

4. **Native Teams Recovery** (if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

   Native teams are ephemeral - they don't survive session restarts. On resume:

   1. **Log warning about lost team context:**
      ```
      [Hannibal] Previous team session lost. Spawning fresh teammates from board state.
      ```

   2. **Initialize fresh team:**
      ```javascript
      TeammateTool({
        action: "spawnTeam",
        team_name: \`mission-\${missionId}\`,
        config: { display_mode: process.env.ATEAM_TEAMMATE_MODE || "auto" }
      })
      ```

   3. **Respawn agents for in-progress work:**
      Use `board_read` to find items in active stages, then spawn fresh teammates:

      ```javascript
      const board = await mcp.board_read();

      // Items in testing stage need Murdock
      for (const itemId of board.columns.testing) {
        const item = await mcp.item_get({ id: itemId });
        await mcp.board_release({ itemId }); // Clear stale assignment
        spawnTeammate("murdock", item);
      }

      // Items in implementing stage need B.A.
      for (const itemId of board.columns.implementing) {
        const item = await mcp.item_get({ id: itemId });
        await mcp.board_release({ itemId });
        spawnTeammate("ba", item);
      }

      // Items in review stage need Lynch
      for (const itemId of board.columns.review) {
        const item = await mcp.item_get({ id: itemId });
        await mcp.board_release({ itemId });
        spawnTeammate("lynch", item);
      }

      // Items in probing stage need Amy
      for (const itemId of board.columns.probing) {
        const item = await mcp.item_get({ id: itemId });
        await mcp.board_release({ itemId });
        spawnTeammate("amy", item);
      }
      ```

   4. **MCP state is source of truth:**
      - Work items track all progress via `work_log`
      - Board stage positions are preserved in the database
      - Only the teammate sessions are lost - not the work state
      - Agents pick up from the current board state, not from memory

5. **Validate board integrity**
   - Use `deps_check` MCP tool to verify dependency graph
   - Check for orphaned items
   - Ensure no items are "lost"

6. **Display recovery summary**
   ```
   The A(i)-Team is back. Resuming mission...

   Recovered state:
   - {n} items were in-progress, moved to ready
   - {m} items in review (will be re-reviewed)
   - Native teams: respawned from board state (if teams mode)

   Current state:
   - Briefings: {x}
   - Ready:     {y}
   - Done:      {z}
   - Blocked:   {b}

   Resuming orchestration...
   ```

7. **Start Hannibal orchestration**
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
4. Respawns native team if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set (teammates are ephemeral and lost on restart; board state in MCP is the source of truth)
5. Main Claude BECOMES Hannibal and continues orchestration

**Architecture:**
```
Main Claude (as Hannibal)
    ├── Task → Murdock (subagent)
    ├── Task → B.A. (subagent)
    └── Task → Lynch (subagent)
```

**With Native Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`):**
```
Main Claude (as Hannibal)
    ├── Teammate → Murdock (native team member)
    ├── Teammate → B.A. (native team member)
    ├── Teammate → Lynch (native team member)
    └── Teammate → Amy (native team member)
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
- **Orphaned team**: Previous team session lost on restart (normal behavior, auto-recovered)
