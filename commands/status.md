# /ateam status

Check mission progress and current state.

## Usage

```
/ateam status
```

## Behavior

1. **Validate mission exists**
   ```
   if not exists(mission/board.json):
       error "No mission found. Run /ateam plan first."
       exit
   ```

2. **Read board state**
   - Load `mission/board.json`
   - Count items in each phase
   - Check current assignments

3. **Display kanban board**

```
═══════════════════════════════════════════════════════════════
                    A(i)-TEAM MISSION STATUS
═══════════════════════════════════════════════════════════════

┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  BRIEFINGS  │    READY    │ IN-PROGRESS │   REVIEW    │    DONE     │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ 003-types   │ 010-tests   │ 001-iface   │ 020-impl    │ 002-types   │
│ 004-types   │ 011-tests   │ 012-tests   │             │ 005-iface   │
│             │             │ 021-impl    │             │             │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│     2       │     2       │     3       │     1       │     2       │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

BLOCKED: 0

═══════════════════════════════════════════════════════════════
                      CURRENT ASSIGNMENTS
═══════════════════════════════════════════════════════════════

  B.A.     → 001-iface (Implement user interface types)
  Murdock  → 012-tests (Write auth service tests)
  B.A.     → 021-impl  (Implement user service)
  Lynch    → 020-impl  (Reviewing rate limiter)

═══════════════════════════════════════════════════════════════
                          STATISTICS
═══════════════════════════════════════════════════════════════

  Total Items:     10
  Completed:       2 (20%)
  In Flight:       4
  Blocked:         0

  WIP Limit:       3 / 5 max
  Rejection Rate:  15% (last 10)

  Time Elapsed:    12m 34s

═══════════════════════════════════════════════════════════════
```

4. **Highlight issues**
   - Show blocked items with rejection reasons
   - Flag items with high rejection count
   - Warn about dependency bottlenecks

## Example Output (Blocked Items)

```
═══════════════════════════════════════════════════════════════
                       BLOCKED ITEMS
═══════════════════════════════════════════════════════════════

  ⚠ 015-auth-tests
    Rejected 2 times
    Last feedback: "Tests not covering error cases"
    Use: /ateam unblock 015 --guidance "Add network timeout tests"

═══════════════════════════════════════════════════════════════
```

## Implementation Notes

This is a read-only command that:

1. Reads `mission/board.json`
2. Reads work item files for titles
3. Formats ASCII table output
4. Calculates statistics

No agents are launched - this is direct file reading and formatting.

```python
# Pseudo-implementation
board = read_json("mission/board.json")

for phase in ["briefings", "ready", "in_progress", "review", "done"]:
    items = board["phases"][phase]
    for item_id in items:
        item = read_work_item(f"mission/{phase}/{item_id}.md")
        display(item.id, item.title)

display_stats(board["stats"])
display_assignments(board["assignments"])
```

## Errors

- **No mission found**: Run `/ateam plan` first
