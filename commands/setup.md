# /ateam setup

Configure Claude Code permissions and project settings for A(i)-Team.

## Usage

```
/ateam setup
```

## What This Command Does

1. **Auto-detects** project settings from CLAUDE.md and package.json
2. **Configures** the project ID environment variable for multi-project isolation
3. **Sets up** permissions for background agents
4. **Creates** `ateam.config.json` with project-specific settings
5. **Injects** A(i)-Team instructions into CLAUDE.md (so Claude uses the workflow)
6. **Verifies** API server connectivity
7. **Checks** for Playwright plugin (optional, for browser testing)

## Behavior

### Step 1: Configure Project ID

The A(i)-Team uses a project ID to isolate data between projects. This is essential when running multiple projects simultaneously.

**Check for existing configuration:**
```
Look for ATEAM_PROJECT_ID in:
1. .claude/settings.local.json (env section)
2. Environment variables
```

**If not configured, ask the user:**
```
AskUserQuestion({
  questions: [{
    question: "What project ID should identify this project? (Used to isolate data in the API)",
    header: "Project ID",
    options: [
      { label: "Use folder name (Recommended)", description: "Auto-generate from current directory name" },
      { label: "Use git remote", description: "Extract from git remote URL" },
      { label: "Custom", description: "Enter a custom project identifier" }
    ],
    multiSelect: false
  }]
})
```

**Write to `.claude/settings.local.json`:**
```json
{
  "env": {
    "ATEAM_PROJECT_ID": "my-project-name"
  }
}
```

### Step 2: Auto-Detect Project Settings

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

### Step 3: Configure Permissions

Background agents (`run_in_background: true`) cannot prompt for user approval, so we pre-approve necessary permissions.

1. **Check for existing settings**
   - Look for `.claude/settings.local.json` (project-level, gitignored)
   - Or `.claude/settings.json` (project-level, committed)

2. **Determine project structure**
   - Use detected source directory or default to `src/`
   - Use detected test pattern or default to `__tests__`

### Step 4: Confirm Detected Settings

If settings were auto-detected from CLAUDE.md/package.json, **confirm them** instead of asking from scratch:

**Example confirmation flow:**
```
I detected the following settings from your project:

  Project ID:      my-awesome-app (from folder name)
  Package manager: pnpm (detected from pnpm-lock.yaml)
  Lint command:    pnpm run lint (from package.json scripts.lint)
  Unit tests:      pnpm test:unit (from package.json scripts.test:unit)
  E2E tests:       pnpm exec playwright test (from CLAUDE.md)
  Dev server:      http://localhost:3000 (from CLAUDE.md)

Does this look correct?
```

Then use `AskUserQuestion` with detected values as the recommended option.

### Step 5: Fill Gaps with Questions

Only ask questions for settings that **could not be detected**. Use `AskUserQuestion` for missing settings:

**Pre-Mission Checks** (always ask - preference)
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

**Post-Mission Checks** (always ask - preference)
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

### Step 6: Write Config File

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

- `devServer.url`: Where Amy should point Playwright for browser testing
- `devServer.start`: Command to start the server (for user reference)
- `devServer.restart`: Command to restart the server (e.g., to pick up code changes)
- `devServer.managed`: If false, user manages server; Amy checks if running but doesn't start/restart it

### Step 7: Inject A(i)-Team Instructions into CLAUDE.md

**Purpose:** Ensure Claude knows to use the A(i)-Team system for PRD work in this project.

1. **Check if CLAUDE.md exists** in project root

2. **If CLAUDE.md exists:**
   - Check if it already contains `## A(i)-Team` section
   - If not present, append the section at the end

3. **If CLAUDE.md does not exist:**
   - Create it with the A(i)-Team section

**Section to inject:**

```markdown

## A(i)-Team Integration

This project uses the A(i)-Team plugin for PRD-driven development.

### When to Use A(i)-Team

Use the A(i)-Team workflow when:
- Implementing features from a PRD document
- Working on multi-file changes that benefit from TDD
- Building features that need structured test → implement → review flow

### Commands

- `/ateam plan <prd-file>` - Decompose a PRD into tracked work items
- `/ateam run` - Execute the mission with parallel agents
- `/ateam status` - Check current progress
- `/ateam resume` - Resume an interrupted mission

### Workflow

1. Place your PRD in the `prd/` directory
2. Run `/ateam plan prd/your-feature.md`
3. Run `/ateam run` to execute

The A(i)-Team will:
- Break down the PRD into testable units
- Write tests first (TDD)
- Implement to pass tests
- Review each feature
- Probe for bugs
- Update documentation and commit

**Do NOT** work on PRD features directly without using `/ateam plan` first.
```

**Check for existing section:**
```
if CLAUDE.md contains "## A(i)-Team":
    skip injection (already configured)
else:
    append section to CLAUDE.md
```

**Example output:**
```
Updating CLAUDE.md...
  ✓ Added A(i)-Team integration instructions
```

Or if already present:
```
Checking CLAUDE.md...
  ✓ A(i)-Team section already present
```

### Step 8: Verify API Connectivity

Test connection to the A(i)-Team API server:

```
Using mission_current MCP tool to verify API connectivity...

✓ Connected to A(i)-Team API at http://localhost:3000
✓ Project ID: my-awesome-app
```

If connection fails:
```
⚠ Could not connect to A(i)-Team API at http://localhost:3000

Make sure the API server is running:
  cd /path/to/ateam-api && npm run dev

Or configure a different URL:
  Set ATEAM_API_URL in .claude/settings.local.json
```

### Step 9: Check Plugin Dependencies

Check for Playwright plugin availability (see Plugin Dependencies section below).

## Required Permissions

Add these permissions to `.claude/settings.local.json`:

```json
{
  "env": {
    "ATEAM_PROJECT_ID": "my-project-name"
  },
  "permissions": {
    "allow": [
      "Bash(git add *)",
      "Bash(git commit *)",
      "Write(src/**)"
    ]
  }
}
```

**Note:** All board and item operations are handled via MCP tools that communicate with the API server. No filesystem permissions are needed for mission state management.

| Permission | Purpose |
|------------|---------|
| `Bash(git add *)` | Tawnia stages files for final commit |
| `Bash(git commit *)` | Tawnia creates final commit |
| `Write(src/**)` | Murdock writes tests, B.A. writes implementations |

## Environment Variables

The MCP server reads the following environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ATEAM_PROJECT_ID` | Yes | `default` | Project identifier for multi-project isolation |
| `ATEAM_API_URL` | No | `http://localhost:3000` | Base URL for the A(i)-Team API |
| `ATEAM_API_KEY` | No | - | Optional API key for authentication |
| `ATEAM_TIMEOUT` | No | `10000` | Request timeout in milliseconds |
| `ATEAM_RETRIES` | No | `3` | Number of retry attempts |

## Example Output

```
A(i)-Team Setup

Configuring project...
  Project ID: my-awesome-app (from folder name)

Checking permissions...
  + Bash(git add *)
  + Bash(git commit *)
  + Write(src/**)

Settings updated: .claude/settings.local.json

Updating CLAUDE.md...
  ✓ Added A(i)-Team integration instructions

Verifying API connectivity...
  ✓ Connected to A(i)-Team API
  ✓ Project ID registered

Checking plugin dependencies...
  ✓ Playwright plugin detected

Background agents can now:
  - Write test files
  - Write implementation files
  - Create git commits (Tawnia)

Board operations handled via MCP tools → API server.
CLAUDE.md updated with A(i)-Team workflow instructions.

Ready to run /ateam plan
```

## Customization

If your project uses a different structure, you can manually edit `.claude/settings.local.json`:

```json
{
  "env": {
    "ATEAM_PROJECT_ID": "custom-project-id",
    "ATEAM_API_URL": "https://api.example.com"
  },
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

The A(i)-Team recommends the **Playwright plugin** for Amy's browser-based bug hunting.

### Check for Playwright Plugin

After configuring permissions, check if Playwright is available:

```
Do you have the Playwright plugin installed? Amy (Investigator) uses it for browser-based testing.
```

If the user doesn't have it:

```
Amy can use the Playwright plugin for browser-based bug hunting.

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

## Notes

- Uses `settings.local.json` by default (gitignored) to avoid committing permissions
- Run this once per project before using `/ateam plan`
- Safe to run multiple times - won't duplicate permissions or CLAUDE.md sections
- Playwright plugin is recommended but not strictly required
- Project ID enables running multiple A(i)-Team projects simultaneously
- CLAUDE.md injection ensures Claude uses `/ateam plan` for PRD work instead of ad-hoc development
