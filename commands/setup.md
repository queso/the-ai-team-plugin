# /ateam setup

Configure Claude Code permissions and project settings for A(i)-Team.

## Usage

```
/ateam setup
```

## What This Command Does

1. Configures permissions for background agents
2. Creates `ateam.config.json` with project-specific settings
3. Checks for required plugin dependencies (Playwright)

## Behavior

### Step 1: Configure Permissions

Background agents (`run_in_background: true`) cannot prompt for user approval, so we pre-approve necessary permissions.

1. **Check for existing settings**
   - Look for `.claude/settings.local.json` (project-level, gitignored)
   - Or `.claude/settings.json` (project-level, committed)

2. **Determine project structure**
   - Ask user about their source directory (default: `src/`)
   - Ask about test directory pattern (default: `__tests__`)

### Step 2: Create Project Config

Use `AskUserQuestion` to gather project-specific settings, then write to `ateam.config.json`:

**Question 1: Package Manager**
```
AskUserQuestion({
  questions: [{
    question: "Which package manager does this project use?",
    header: "Package mgr",
    options: [
      { label: "npm (Recommended)", description: "Node Package Manager" },
      { label: "yarn", description: "Yarn package manager" },
      { label: "pnpm", description: "Fast, disk space efficient package manager" },
      { label: "bun", description: "Fast JavaScript runtime and package manager" }
    ],
    multiSelect: false
  }]
})
```

**Question 2: Test Commands**
```
AskUserQuestion({
  questions: [{
    question: "What command runs your unit tests?",
    header: "Unit tests",
    options: [
      { label: "npm test", description: "Standard npm test script" },
      { label: "npm run test:unit", description: "Separate unit test script" },
      { label: "vitest", description: "Vitest test runner" },
      { label: "jest", description: "Jest test runner directly" }
    ],
    multiSelect: false
  }]
})
```

**Question 3: Lint Command**
```
AskUserQuestion({
  questions: [{
    question: "What command runs your linter?",
    header: "Linter",
    options: [
      { label: "npm run lint", description: "Standard lint script" },
      { label: "eslint .", description: "ESLint directly" },
      { label: "biome check", description: "Biome linter" },
      { label: "None", description: "No linting configured" }
    ],
    multiSelect: false
  }]
})
```

**Question 4: E2E Tests**
```
AskUserQuestion({
  questions: [{
    question: "What command runs your E2E tests (if any)?",
    header: "E2E tests",
    options: [
      { label: "npm run test:e2e", description: "E2E test script" },
      { label: "playwright test", description: "Playwright directly" },
      { label: "cypress run", description: "Cypress test runner" },
      { label: "None", description: "No E2E tests configured" }
    ],
    multiSelect: false
  }]
})
```

**Question 5: Pre-Mission Checks**
```
AskUserQuestion({
  questions: [{
    question: "Which checks should run BEFORE starting a mission? (establishes baseline)",
    header: "Pre-checks",
    options: [
      { label: "Lint + Unit tests", description: "Recommended: ensure clean starting point" },
      { label: "Unit tests only", description: "Just verify tests pass" },
      { label: "Lint only", description: "Just verify code style" },
      { label: "None", description: "Skip pre-mission checks" }
    ],
    multiSelect: false
  }]
})
```

**Question 6: Post-Mission Checks**
```
AskUserQuestion({
  questions: [{
    question: "Which checks should run AFTER mission completes? (proves everything works)",
    header: "Post-checks",
    options: [
      { label: "Lint + Unit + E2E", description: "Recommended: full verification" },
      { label: "Lint + Unit tests", description: "Standard verification" },
      { label: "Unit tests only", description: "Minimal verification" },
      { label: "None", description: "Skip post-mission checks" }
    ],
    multiSelect: false
  }]
})
```

**Question 7: Dev Server (for Amy's browser testing)**
```
AskUserQuestion({
  questions: [{
    question: "What URL is your dev server running on? (Amy uses this for browser testing)",
    header: "Dev server",
    options: [
      { label: "http://localhost:3000", description: "Common for React, Next.js" },
      { label: "http://localhost:5173", description: "Common for Vite" },
      { label: "http://localhost:4200", description: "Common for Angular" },
      { label: "http://localhost:8080", description: "Common for Vue, generic" }
    ],
    multiSelect: false
  }]
})
```

**Question 8: Dev Server Start Command (optional)**
```
AskUserQuestion({
  questions: [{
    question: "What command starts your dev server?",
    header: "Dev start",
    options: [
      { label: "npm run dev", description: "Standard dev script" },
      { label: "npm start", description: "Standard start script" },
      { label: "docker compose up", description: "Docker Compose" },
      { label: "User managed", description: "User starts server manually" }
    ],
    multiSelect: false
  }]
})
```

**Question 9: Dev Server Restart Command (optional)**
```
AskUserQuestion({
  questions: [{
    question: "What command restarts your dev server? (to pick up code changes)",
    header: "Dev restart",
    options: [
      { label: "Same as start", description: "Just restart the start command" },
      { label: "docker compose restart", description: "Docker Compose restart" },
      { label: "pm2 restart all", description: "PM2 process manager" },
      { label: "Not needed", description: "Hot reload handles changes" }
    ],
    multiSelect: false
  }]
})
```

### Step 3: Write Config File

Based on answers, create `ateam.config.json` in project root:

```json
{
  "packageManager": "npm",
  "checks": {
    "lint": "npm run lint",
    "unit": "npm test",
    "e2e": "npm run test:e2e"
  },
  "precheck": ["lint", "unit"],
  "postcheck": ["lint", "unit", "e2e"],
  "devServer": {
    "url": "http://localhost:3000",
    "start": "npm run dev",
    "restart": "docker compose restart",
    "managed": false
  }
}
```

- `devServer.start`: Command to start the server (for user reference)
- `devServer.restart`: Command to restart the server (Amy can suggest this if changes need to be picked up)
- `devServer.managed`: If false, user manages server; Amy checks if running but doesn't start/restart it herself

### Step 4: Check Plugin Dependencies

Check for Playwright plugin availability (see Plugin Dependencies section below).

## Required Permissions

Add these permissions to `.claude/settings.local.json`:

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

## Plugin Dependencies

The A(i)-Team requires the **Playwright plugin** for Amy's browser-based bug hunting.

### Check for Playwright Plugin

After configuring permissions, check if Playwright is available:

```
Do you have the Playwright plugin installed? Amy (Investigator) uses it for browser-based testing.
```

If the user doesn't have it:

```
Amy needs the Playwright plugin for browser-based bug hunting.

To install it:
1. Go to the Claude Code plugins repository
2. Install the official Playwright plugin
3. Run: /ateam setup again to verify

Without Playwright, Amy can still:
- Run curl commands for API testing
- Execute Node.js test scripts
- Analyze code and logs

But she won't be able to:
- Open browsers for UI testing
- Take screenshots
- Test interactive flows
```

### Verify Plugin Installation

To check if Playwright tools are available, look for MCP tools matching `mcp__*playwright*`:
- `mcp__plugin_playwright_playwright__browser_navigate`
- `mcp__plugin_playwright_playwright__browser_snapshot`
- `mcp__plugin_playwright_playwright__browser_click`

If these tools exist, Playwright is properly installed.

## Example Output (with Playwright check)

```
A(i)-Team Setup

Checking permissions...
[permissions output...]

Checking plugin dependencies...
  ✓ Playwright plugin detected

Amy (Investigator) has full browser testing capabilities:
  - Navigate to URLs
  - Take screenshots
  - Click elements
  - Fill forms
  - Capture console logs

Ready to run /ateam plan
```

Or if missing:

```
Checking plugin dependencies...
  ⚠ Playwright plugin not detected

Amy can still test via curl/scripts, but for full browser testing:
  → Install the Playwright plugin from Claude Code plugins

Continue anyway? (Amy will use API-only testing)
```

## Notes

- Uses `settings.local.json` by default (gitignored) to avoid committing permissions
- Run this once per project before using `/ateam run`
- Safe to run multiple times - won't duplicate permissions
- Playwright plugin is recommended but not strictly required
