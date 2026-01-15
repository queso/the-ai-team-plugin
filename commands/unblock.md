# /ateam unblock

Unblock a stuck work item and return it to the ready queue.

## Usage

```
/ateam unblock <item-id> [--guidance "hint for agent"]
```

## Arguments

- `item-id` (required): ID of the blocked item (e.g., "015")
- `--guidance` (optional): Human guidance to help the agent succeed

## Behavior

1. **Validate mission exists**
   ```
   if not exists(mission/board.json):
       error "No mission found."
       exit
   ```

2. **Find the blocked item**
   ```
   if item-id not in board.phases.blocked:
       error "Item {item-id} is not blocked."
       list blocked items
       exit
   ```

3. **Read item details**
   - Load work item from `mission/blocked/`
   - Show rejection history
   - Display last feedback

4. **Apply human guidance** (if provided)

   Append to work item:
   ```markdown
   ## Human Guidance

   added_at: <ISO timestamp>
   guidance: |
     {guidance text}
   ```

5. **Reset for retry**
   - Reset `rejection_count` to 0
   - Move item from `blocked/` to `ready/`
   - Update `board.json`

6. **Confirm unblock**
   ```
   Item {item-id} unblocked. Back in the fight.

   Title: {item.title}
   Previous rejections: {count}

   Human guidance added: {yes/no}

   Item is now in ready/ queue.
   Run /ateam run or /ateam resume to continue.
   ```

## Example

```
# See what's blocked
/ateam status

# Shows:
# BLOCKED:
#   015-auth-tests - "Tests not covering error cases"

# Unblock with guidance
/ateam unblock 015 --guidance "Focus on network timeout and 401/403 response handling"
```

Output:
```
Item 015 unblocked. Back in the fight.

Title: Write authentication service tests
Previous rejections: 2

Human guidance added: yes
  "Focus on network timeout and 401/403 response handling"

Item is now in ready/ queue.
Run /ateam run or /ateam resume to continue.
```

## Without Guidance

```
/ateam unblock 015
```

Output:
```
Item 015 unblocked. Back in the fight.

Title: Write authentication service tests
Previous rejections: 2

⚠ No guidance provided. Agent will retry with same context.
Consider adding --guidance if previous attempts missed something.

Item is now in ready/ queue.
```

## Viewing Rejection History

Before unblocking, you may want to understand why it failed:

```
/ateam status
```

Shows:
```
═══════════════════════════════════════════════════════════════
                       BLOCKED ITEMS
═══════════════════════════════════════════════════════════════

  ⚠ 015-auth-tests
    Title: Write authentication service tests
    Type: test

    Rejection 1 (Lynch):
      "Missing tests for expired token handling"

    Rejection 2 (Lynch):
      "Tests not covering network timeout cases.
       Need to test what happens when auth server is unreachable."

    Tip: /ateam unblock 015 --guidance "your hint here"

═══════════════════════════════════════════════════════════════
```

## Implementation Notes

This command:

1. Reads `mission/board.json`
2. Finds item in `blocked/` phase
3. If guidance provided, appends to work item file
4. Resets `rejection_count` in frontmatter
5. Moves file from `mission/blocked/` to `mission/ready/`
6. Updates `board.json` phases

```python
# Pseudo-implementation
board = read_json("mission/board.json")

if item_id not in board.phases.blocked:
    error(f"Item {item_id} not blocked")
    return

item_file = f"mission/blocked/{item_id}-*.md"
item = read_work_item(item_file)

if guidance:
    item.append_section("Human Guidance", {
        "added_at": now(),
        "guidance": guidance
    })

item.frontmatter.rejection_count = 0

move_file(item_file, f"mission/ready/{item_file.name}")

board.phases.blocked.remove(item_id)
board.phases.ready.append(item_id)
write_json("mission/board.json", board)
```

## Errors

- **No mission found**: Nothing to unblock
- **Item not blocked**: Item is in different phase
- **Item not found**: Invalid item ID
