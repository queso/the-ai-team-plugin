# /ateam setup

Configure Claude Code permissions for A(i)-Team background agents.

## Usage

```
/ateam setup
```

## Why This Is Needed

Background agents (`run_in_background: true`) cannot prompt for user approval. When they try to:
- Write files (tests, implementations)
- Run bash commands (board scripts)

...those operations get auto-denied since there's no interactive prompt available.

This command pre-approves the necessary permissions so agents can work autonomously.

## Behavior

1. **Check for existing settings**
   - Look for `.claude/settings.local.json` (project-level, gitignored)
   - Or `.claude/settings.json` (project-level, committed)

2. **Determine project structure**
   - Ask user about their source directory (default: `src/`)
   - Ask about test directory pattern (default: `__tests__`)

3. **Add required permissions**

   ```json
   {
     "permissions": {
       "allow": [
         "Bash(echo * | node **/scripts/*.js)",
         "Bash(node **/scripts/*.js)",
         "Bash(cat <<*)",
         "Bash(mv mission/*)",
         "Bash(echo *>> mission/activity.log)",
         "Write(src/**)",
         "Write(mission/**)"
       ]
     }
   }
   ```

4. **Merge with existing permissions**
   - Don't overwrite existing allowed commands
   - Add new permissions that don't already exist

5. **Report what was added**

## Required Permissions

| Permission | Purpose |
|------------|---------|
| `Bash(echo * \| node **/scripts/*.js)` | Pipe JSON to board scripts |
| `Bash(node **/scripts/*.js)` | Run board management scripts directly |
| `Bash(cat <<*)` | Heredoc input to scripts |
| `Bash(mv mission/*)` | Move items between stage directories |
| `Bash(echo *>> mission/activity.log)` | Log to Live Feed |
| `Write(src/**)` | Murdock writes tests, B.A. writes implementations |
| `Write(mission/**)` | Face creates/updates work items |

## Implementation

```javascript
// Pseudocode for setup logic

const REQUIRED_PERMISSIONS = [
  'Bash(echo * | node **/scripts/*.js)',
  'Bash(node **/scripts/*.js)',
  'Bash(cat <<*)',
  'Bash(mv mission/*)',
  'Bash(echo *>> mission/activity.log)',
  'Write(src/**)',
  'Write(mission/**)'
];

// 1. Read existing settings
const settingsPath = '.claude/settings.local.json';
let settings = {};
if (fileExists(settingsPath)) {
  settings = JSON.parse(readFile(settingsPath));
}

// 2. Ensure permissions structure exists
if (!settings.permissions) {
  settings.permissions = {};
}
if (!settings.permissions.allow) {
  settings.permissions.allow = [];
}

// 3. Add missing permissions
const existing = new Set(settings.permissions.allow);
const added = [];
for (const perm of REQUIRED_PERMISSIONS) {
  if (!existing.has(perm)) {
    settings.permissions.allow.push(perm);
    added.push(perm);
  }
}

// 4. Write updated settings
writeFile(settingsPath, JSON.stringify(settings, null, 2));

// 5. Report
if (added.length > 0) {
  console.log(`Added ${added.length} permissions:`);
  added.forEach(p => console.log(`  + ${p}`));
} else {
  console.log('All required permissions already configured.');
}
```

## Example Output

```
A(i)-Team Setup

Checking permissions...

Current settings: .claude/settings.local.json

Adding permissions for background agents:
  + Bash(echo * | node **/scripts/*.js)
  + Bash(node **/scripts/*.js)
  + Bash(cat <<*)
  + Bash(mv mission/*)
  + Bash(echo *>> mission/activity.log)
  + Write(src/**)
  + Write(mission/**)

Settings updated successfully.

Background agents can now:
  - Run board scripts (item-create, board-move, etc.)
  - Move items between stage directories
  - Log to the activity feed
  - Write test files
  - Write implementation files
  - Manage work items

Ready to run /ateam plan
```

## Customization

If your project uses a different structure, you can manually edit `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Write(lib/**)",
      "Write(test/**)",
      "Write(packages/*/src/**)"
    ]
  }
}
```

## Notes

- Uses `settings.local.json` by default (gitignored) to avoid committing permissions
- Run this once per project before using `/ateam run`
- Safe to run multiple times - won't duplicate permissions
