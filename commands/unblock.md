# /ai-team:unblock

Unblock a stuck work item and return it to the ready queue.

## Usage

```
/ai-team:unblock <item-id> [--guidance "hint for agent"]
```

## Arguments

- `item-id` (required): ID of the blocked item (e.g., "015")
- `--guidance` (optional): Human guidance to help the agent succeed

## Behavior

1. **Validate mission exists**
   Use `mission_current` MCP tool to check for active mission.
   ```
   if mission not found:
       error "No mission found."
       exit
   ```

2. **Find the blocked item**
   Use `item_list` MCP tool with `stage: "blocked"` to list blocked items.
   ```
   if item-id not in blocked items:
       error "Item {item-id} is not blocked."
       list blocked items
       exit
   ```

3. **Read item details**
   - Use `item_get` MCP tool to load the work item
   - Show rejection history
   - Display last feedback

4. **Apply human guidance** (if provided)
   Use `item_update` MCP tool to add guidance to the item context.

5. **Reset for retry**
   - Use `item_update` MCP tool to reset `rejection_count` to 0
   - Use `board_move` MCP tool to move item from `blocked` to `ready` stage

6. **Confirm unblock**
   ```
   Item {item-id} unblocked. Back in the fight.

   Title: {item.title}
   Previous rejections: {count}

   Human guidance added: {yes/no}

   Item is now in ready stage.
   Run /ai-team:run or /ai-team:resume to continue.
   ```

## Example

```
# See what's blocked
/ai-team:status

# Shows:
# BLOCKED:
#   015-auth-tests - "Tests not covering error cases"

# Unblock with guidance
/ai-team:unblock 015 --guidance "Focus on network timeout and 401/403 response handling"
```

Output:
```
Item 015 unblocked. Back in the fight.

Title: Write authentication service tests
Previous rejections: 2

Human guidance added: yes
  "Focus on network timeout and 401/403 response handling"

Item is now in ready stage.
Run /ai-team:run or /ai-team:resume to continue.
```

## Without Guidance

```
/ai-team:unblock 015
```

Output:
```
Item 015 unblocked. Back in the fight.

Title: Write authentication service tests
Previous rejections: 2

⚠ No guidance provided. Agent will retry with same context.
Consider adding --guidance if previous attempts missed something.

Item is now in ready stage.
```

## Viewing Rejection History

Before unblocking, you may want to understand why it failed:

```
/ai-team:status
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

    Tip: /ai-team:unblock 015 --guidance "your hint here"

═══════════════════════════════════════════════════════════════
```

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `mission_current` | Check mission exists |
| `item_list` | List blocked items |
| `item_get` | Get item details |
| `item_update` | Reset rejection count, add guidance |
| `board_move` | Move from blocked to ready stage |

## Errors

- **No mission found**: Nothing to unblock
- **Item not blocked**: Item is in different stage
- **Item not found**: Invalid item ID
