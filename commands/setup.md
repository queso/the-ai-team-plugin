# /ateam setup

Configure Claude Code permissions and project settings for A(i)-Team.

## Usage

```
/ateam setup
```

## What This Command Does

1. **Auto-detects** project settings from CLAUDE.md and package.json
2. Configures permissions for background agents
3. Creates `ateam.config.json` with project-specific settings
4. Checks for required plugin dependencies (Playwright)

## Behavior

### Step 1: Auto-Detect Project Settings

**IMPORTANT:** Before asking questions, inspect the project's existing documentation to auto-detect settings.

1. **Read CLAUDE.md** (if exists)
   - Look for package manager mentions: `npm`, `yarn`, `pnpm`, `bun`
   - Look for test commands: `npm test`, `vitest`, `jest`, `pnpm test`, etc.
   - Look for lint commands: `npm run lint`, `eslint`, `biome`, etc.
   - Look for dev server URLs: `localhost:3000`, `localhost:5173`, etc.
   - Look for docker commands: `docker compose up`, etc.

2. **Read package.json** (if exists)
   - Check `scripts` for: `test`, `test:unit`, `test:e2e`, `lint`, `dev`, `start`
   - Detect package manager from lock files: `package-lock.json` → npm, `yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm, `bun.lockb` → bun

3. **Build detected config** from findings

### Step 2: Configure Permissions

Background agents (`run_in_background: true`) cannot prompt for user approval, so we pre-approve necessary permissions.

1. **Check for existing settings**
   - Look for `.claude/settings.local.json` (project-level, gitignored)
   - Or `.claude/settings.json` (project-level, committed)

2. **Determine project structure**
   - Use detected source directory or default to `src/`
   - Use detected test pattern or default to `__tests__`

### Step 3: Confirm Detected Settings

If settings were auto-detected from CLAUDE.md/package.json, **confirm them** instead of asking from scratch:

**Example confirmation flow:**
```
I detected the following settings from your project:

  Package manager: pnpm (detected from pnpm-lock.yaml)
  Lint command:    pnpm run lint (from package.json scripts.lint)
  Unit tests:      pnpm test:unit (from package.json scripts.test:unit)
  E2E tests:       pnpm exec playwright test (from CLAUDE.md)
  Dev server:      http://localhost:3000 (from CLAUDE.md)
  Dev start:       docker compose up (from CLAUDE.md)

Does this look correct?
```

Then use `AskUserQuestion` with detected values as the recommended option:

```
AskUserQuestion({
  questions: [{
    question: "I detected pnpm as your package manager. Is this correct?",
    header: "Package mgr",
    options: [
      { label: "pnpm (Recommended)", description: "Detected from pnpm-lock.yaml" },
      { label: "npm", description: "Node Package Manager" },
      { label: "yarn", description: "Yarn package manager" },
      { label: "bun", description: "Fast JavaScript runtime" }
    ],
    multiSelect: false
  }]
})
```

### Step 4: Fill Gaps with Questions

Only ask questions for settings that **could not be detected**. Use `AskUserQuestion` for missing settings:

**Fallback Question 1: Package Manager** (if no lock file detected)
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

**Fallback Question 2: Test Commands** (if not in package.json scripts)
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

**Fallback Question 3: Lint Command** (if not in package.json scripts)
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

**Fallback Question 4: E2E Tests** (if not in package.json scripts)
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

**Fallback Question 5: Pre-Mission Checks** (always ask - preference)
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

**Fallback Question 6: Post-Mission Checks** (always ask - preference)
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

**Fallback Question 7: Dev Server** (if not detected in CLAUDE.md)
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

**Fallback Question 8: Dev Server Start** (if not detected)
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

**Fallback Question 9: Dev Server Restart** (if not detected)
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

### Step 5: Write Config File

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

### Step 6: Check Plugin Dependencies

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
         "Bash(git add *)",
         "Bash(git commit *)",
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
| `Bash(git add *)` | Tawnia stages files for final commit |
| `Bash(git commit *)` | Tawnia creates final commit |
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
  'Bash(git add *)',
  'Bash(git commit *)',
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
  + Bash(git add *)
  + Bash(git commit *)
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
  - Create git commits (Tawnia)

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
