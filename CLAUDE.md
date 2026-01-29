# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Repository

**This is the source repository for the A(i)-Team Claude Code plugin.**

This plugin will be published and added to user projects as a submodule (typically at `.claude/ai-team/`). The CLAUDE.md in the user's project root is what Claude Code reads at runtime - this file exists to help with plugin development.

## Overview

The A(i)-Team is a Claude Code plugin for parallel agent orchestration. It transforms PRDs into working, tested code through a TDD pipeline with specialized agents:

- **Hannibal** (Orchestrator): Runs in main Claude context, coordinates the team
- **Face** (Decomposer): Breaks PRDs into feature items (uses opus model)
- **Sosa** (Critic): Reviews decomposition, asks clarifying questions (requirements-critic subagent, opus)
- **Murdock** (QA): Writes tests first (qa-engineer subagent)
- **B.A.** (Implementer): Implements code to pass tests (clean-code-architect subagent)
- **Lynch** (Reviewer): Reviews tests + implementation together (code-review-expert subagent)
- **Amy** (Investigator): Probes every feature for bugs beyond tests (bug-hunter subagent)
- **Tawnia** (Documentation): Updates docs and makes final commit (clean-code-architect subagent)

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Hannibal  │     │   Murdock   │     │    B.A.     │   │
│  │ (main ctx)  │     │ (subagent)  │     │ (subagent)  │   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘   │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │   MCP Server    │                      │
│                    │  (20 tools)     │                      │
│                    └────────┬────────┘                      │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP + X-Project-ID header
                              ▼
                    ┌─────────────────┐
                    │  A(i)-Team API  │
                    │    (Database)   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Kanban UI     │
                    │ (Web Dashboard) │
                    └─────────────────┘
```

### Pipeline Flow

**Planning Phase (`/ateam plan`):**
```
PRD → Face (1st pass) → Sosa (review) → Face (2nd pass) → ready stage
           ↓                  ↓               ↓
      briefings          questions         refinement
        stage            (human)
```

**Execution Phase (`/ateam run`):**
```
briefings → ready → testing → implementing → review → probing → done
                       ↑           ↑            ↑         ↑       │
                    Murdock      B.A.        Lynch      Amy       │
                                          (per-feature)           │
                                                                  ▼
                                                        ┌─────────────────┐
                                                        │  Final Review   │
                                                        │    (Lynch)      │
                                                        └────────┬────────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │  Post-Checks    │
                                                        │ (lint,unit,e2e) │
                                                        └────────┬────────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │  Documentation  │
                                                        │    (Tawnia)     │
                                                        └─────────────────┘
```

Each feature flows through stages sequentially. Different features can be at different stages simultaneously (pipeline parallelism). WIP limits control how many features are in-flight.

**Two-Level Orchestration:**
1. **Dependency waves** - Items wait in `briefings` until deps reach `done` (correct waiting)
2. **Pipeline flow** - Items advance IMMEDIATELY on completion, no stage batching (critical)

Use the `deps_check` MCP tool to see which items are ready. Within a wave, items flow independently through stages.

**True Individual Item Tracking:** Items advance immediately when their agent completes - no waiting for batch completion. Hannibal polls TaskOutput for each background agent individually and agents signal completion via the `agent_stop` MCP tool.

When ALL features reach `done`, Lynch performs a **Final Mission Review** of the entire codebase, checking for cross-cutting issues (consistency, race conditions, security, code quality).

### Data Storage

All mission state is stored in the **A(i)-Team API database**, not on the local filesystem. This enables:

- **Multi-project isolation**: Each project has a unique `ATEAM_PROJECT_ID`
- **Web-based Kanban UI**: Real-time visibility into mission progress
- **Activity feeds**: Live logging of agent actions
- **Persistence**: Mission state survives Claude Code session restarts

The MCP server acts as a bridge between Claude Code and the API, sending the project ID in every request via the `X-Project-ID` HTTP header.

### Work Item Format

Work items are stored in the database with the following structure:

```yaml
id: "WI-001"  # Generated by API with WI- prefix
title: "Feature name"
type: "feature"        # feature | bug | task
status: "pending"
stage: "briefings"     # briefings | ready | testing | implementing | review | probing | done | blocked
outputs:
  test: "src/__tests__/feature.test.ts"    # REQUIRED
  impl: "src/services/feature.ts"          # REQUIRED
  types: "src/types/feature.ts"            # Optional
dependencies: []
parallel_group: "group-name"
rejection_count: 0
assigned_agent: "Murdock"                   # Set by agent_start, cleared by agent_stop
work_log:                                   # Populated by agent_stop
  - agent: "Murdock"
    timestamp: "2024-01-15T10:30:00Z"
    status: "success"
    summary: "Created 5 test cases"
```

The `outputs` field is critical - without it, Murdock and B.A. don't know where to create files.

## Plugin Commands

### Mission Commands
- `/ateam setup` - Configure project ID, permissions, and settings (run once per project)
- `/ateam plan <prd-file>` - Initialize mission from PRD, Face decomposes into work items
- `/ateam run [--wip N]` - Execute mission with pipeline agents (default WIP: 3)
- `/ateam status` - Display kanban board with current progress
- `/ateam resume` - Resume interrupted mission from saved state
- `/ateam unblock <item-id> [--guidance "hint"]` - Unblock stuck items

### Standalone Skills
- `/perspective-test <feature>` - Test a feature from user's perspective (static analysis + browser verification)

## Critical Requirements

### Working Directory
**All agents work on the TARGET PROJECT, not the ai-team plugin directory.**

- The target project is the user's working directory where `/ateam` commands are run
- NEVER explore, search, or modify files in the ai-team plugin directory (`.claude/ai-team/` or similar)
- When Face or other agents explore codebases, they explore the TARGET PROJECT's `src/`, `tests/`, etc.
- The MCP tools handle all communication with the A(i)-Team system - no need to explore plugin internals

### Agent Boundaries
- **Hannibal**: Orchestrates ONLY. NEVER uses Write/Edit on `src/**` or test files. Delegates ALL coding to subagents. If pipeline is stuck, reports status and waits for human intervention - never codes a workaround.
- **Face**: Creates and updates work items via MCP tools. Does NOT write tests or implementation. On second pass, uses MCP tools ONLY (no Glob/Grep).
- **Sosa**: Reviews and critiques work items. Does NOT modify items directly - provides recommendations for Face.
- **Murdock**: Writes ONLY tests and types. Does NOT write implementation code.
- **B.A.**: Writes ONLY implementation. Tests already exist from Murdock.
- **Lynch**: Reviews only. Does NOT write code.
- **Amy**: Investigates only. Does NOT write production code or tests. Reports findings with proof.
- **Tawnia**: Writes documentation only (CHANGELOG, README, docs/). Does NOT modify source code or tests. Makes the final commit.

### Stage Transitions

Use the `board_move` MCP tool for all stage transitions. The tool:
- Validates the transition is allowed
- Enforces WIP limits
- Logs the transition to the activity feed
- Returns success/error status

## Key Conventions

### TDD Workflow (MANDATORY STAGES - NO EXCEPTIONS)

Every feature MUST flow through ALL stages. Skipping stages is NOT permitted.

**Per-Feature Pipeline (each item, in order):**
1. **Murdock** writes tests first (defines acceptance criteria)
2. **B.A.** implements to pass those tests
3. **Lynch** reviews tests + implementation together
4. **Amy** probes for bugs beyond tests (Raptor Protocol) ← MANDATORY, NOT OPTIONAL
5. If rejected at any stage (max 2 times), item goes to `blocked`

**Mission Completion (after ALL items reach done):**
6. **Lynch** performs **Final Mission Review** (holistic codebase review)
7. **Post-checks** run (lint, unit, e2e)
8. **Tawnia** updates documentation and creates final commit ← MANDATORY, NOT OPTIONAL

**A mission is NOT complete until Tawnia commits.** No shortcuts.

### Testing Philosophy
- Cover happy paths, negative paths, and key edge cases
- Don't chase 100% coverage
- 3-5 tests per feature is often enough
- Test behavior, not implementation

### Work Item Sizing
Smallest independently-completable units:
- One logical unit of functionality per item
- If you can split it further without artificial boundaries, split it
- No arbitrary time limits

### Task Tracking: Two Systems

The A(i)-Team uses two distinct task tracking systems for different purposes:

**MCP Work Items** (`item_create`, `board_move`, etc.):
- Persistent in API database
- Visible in Kanban UI
- Survive session restarts
- Track: feature implementation progress (per-item)

**Native Claude Tasks** (`TaskCreate`, `TaskUpdate`, `TaskList`):
- Session-level, ephemeral
- Visible in CLI progress spinner
- Lost on session restart
- Track: Hannibal's orchestration milestones (waves, phases)

Use MCP tools for mission items. Use native tasks for orchestration checkpoints. Do NOT mirror one system to the other - they track different concerns.

### Agent Dispatch

Hannibal dispatches agents using Task tool with `run_in_background: true`:

**Planning Phase:**
- Face: `subagent_type: "general-purpose"`, `model: "opus"`
- Sosa: `subagent_type: "general-purpose"`, `model: "opus"`

**Per-Feature Pipeline (ALL MANDATORY for each item):**
- Murdock: `subagent_type: "general-purpose"`, `model: "sonnet"` → testing stage
- B.A.: `subagent_type: "general-purpose"`, `model: "sonnet"` → implementing stage
- Lynch: `subagent_type: "general-purpose"` → review stage
- Amy: `subagent_type: "general-purpose"`, `model: "sonnet"` → probing stage (EVERY feature, no exceptions)

**Mission Completion (MANDATORY):**
- Tawnia: `subagent_type: "general-purpose"`, `model: "sonnet"` → after post-checks pass

### Background Agent Permissions

**IMPORTANT:** Background agents (`run_in_background: true`) cannot prompt for user approval. Operations that require approval will be auto-denied.

Run `/ateam setup` once per project to configure required permissions in `.claude/settings.local.json`:

```json
{
  "env": {
    "ATEAM_PROJECT_ID": "my-project-name",
    "ATEAM_API_URL": "http://localhost:3000"
  },
  "permissions": {
    "allow": [
      "Bash(mkdir *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Write(src/**)",
      "Edit(src/**)"
    ]
  }
}
```

**CRITICAL:** Both `ATEAM_PROJECT_ID` and `ATEAM_API_URL` must be in the `env` section. The MCP server reads these as environment variables.

| Permission | Used By | Purpose |
|------------|---------|---------|
| `Bash(mkdir *)` | Murdock, B.A. | Create directories for tests/implementations |
| `Bash(git add *)` | Tawnia | Stage files for final commit |
| `Bash(git commit *)` | Tawnia | Create final commit |
| `Write(src/**)` | Murdock, B.A. | Write tests and implementations |
| `Edit(src/**)` | B.A. | Edit existing files during implementation |

**Note:** All board and item operations are handled via MCP tools that communicate with the API server. No filesystem permissions are needed for mission state management.

## File Organization

```
ai-team/
├── plugin.json              # Plugin configuration
├── .mcp.json                # MCP server configuration
├── package.json             # Node.js dependencies (run `npm install`)
├── mcp-server/              # MCP server for Claude Code integration
│   ├── package.json         # MCP server dependencies
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts         # Entry point (stdio transport)
│   │   ├── server.ts        # McpServer instance
│   │   ├── config.ts        # Environment configuration (projectId, apiUrl, etc.)
│   │   ├── client/          # HTTP client with retry logic
│   │   ├── lib/             # Error handling utilities
│   │   └── tools/           # Tool implementations (20 tools)
│   │       ├── board.ts     # Board operations (4 tools)
│   │       ├── items.ts     # Item operations (6 tools)
│   │       ├── agents.ts    # Agent lifecycle (2 tools)
│   │       ├── missions.ts  # Mission lifecycle (5 tools)
│   │       ├── utils.ts     # Utilities (3 tools)
│   │       └── index.ts     # Tool registration
│   └── dist/                # Compiled JavaScript
├── agents/                  # Agent prompts and behavior (with frontmatter hooks)
│   ├── hannibal.md          # Orchestrator (main context, has PreToolUse + Stop hooks)
│   ├── face.md              # Decomposer
│   ├── sosa.md              # Requirements Critic
│   ├── murdock.md           # QA Engineer (has SubagentStop hook)
│   ├── ba.md                # Implementer (has SubagentStop hook)
│   ├── lynch.md             # Reviewer (has SubagentStop hook)
│   ├── amy.md               # Investigator (has SubagentStop hook)
│   └── tawnia.md            # Documentation writer (has SubagentStop hook)
├── commands/                # Slash command definitions
│   ├── setup.md, plan.md, run.md, status.md, resume.md, unblock.md
│   └── perspective-test.md  # Standalone user perspective testing
├── skills/
│   ├── tdd-workflow.md      # TDD guidance
│   └── perspective-test.md  # User perspective testing methodology
├── scripts/                 # Hook enforcement scripts (for internal use)
│   └── hooks/               # Agent lifecycle hooks
│       ├── enforce-completion-log.js    # Stop hook for working agents
│       ├── block-raw-echo-log.js        # PreToolUse hook for working agents
│       ├── block-hannibal-writes.js     # PreToolUse hook for Hannibal
│       └── enforce-final-review.js      # Stop hook for Hannibal
├── lib/                     # Shared utilities (used by hooks)
│   ├── board.js, lock.js, validate.js
└── docs/
    └── kanban-ui-prd.md     # PRD for web-based kanban board
```

## MCP Tools

Agents use MCP tools for all board and item operations. The MCP server exposes 20 tools across 5 modules:

| Module | Tools | Description |
|--------|-------|-------------|
| **Board** | `board_read`, `board_move`, `board_claim`, `board_release` | Board state and item movement |
| **Items** | `item_create`, `item_update`, `item_get`, `item_list`, `item_reject`, `item_render` | Work item CRUD operations |
| **Agents** | `agent_start`, `agent_stop` | Agent lifecycle hooks |
| **Missions** | `mission_init`, `mission_current`, `mission_precheck`, `mission_postcheck`, `mission_archive` | Mission lifecycle management |
| **Utils** | `deps_check`, `activity_log`, `log` | Dependency validation and logging |

### Agent Lifecycle Tools

Working agents (Murdock, B.A., Lynch, Amy, Tawnia) use lifecycle tools:

**Start Tool** (`agent_start`):
```
Parameters:
  - itemId: "007"
  - agent: "murdock"
```
- Claims the item in the database
- Records `assigned_agent` on the work item
- The kanban UI shows which agent is working on each card

**Stop Tool** (`agent_stop`):
```
Parameters:
  - itemId: "007"
  - agent: "murdock"
  - status: "success"
  - summary: "Created 5 test cases"
  - files_created: ["src/__tests__/feature.test.ts"]
```
- Marks completion in the database
- Clears `assigned_agent` from the item
- Appends work summary to `work_log` array

All tools automatically include the `X-Project-ID` header from the `ATEAM_PROJECT_ID` environment variable.

## Environment Variables

The MCP server reads the following environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ATEAM_PROJECT_ID` | Yes | `default` | Project identifier for multi-project isolation |
| `ATEAM_API_URL` | No* | `http://localhost:3000` | Base URL for the A(i)-Team API |
| `ATEAM_API_KEY` | No | - | Optional API key for authentication |
| `ATEAM_TIMEOUT` | No | `10000` | Request timeout in milliseconds |
| `ATEAM_RETRIES` | No | `3` | Number of retry attempts |

*`ATEAM_API_URL` defaults to `http://localhost:3000`. If your API runs elsewhere, you MUST set this variable.

Configure these in `.claude/settings.local.json`:

```json
{
  "env": {
    "ATEAM_PROJECT_ID": "my-project-name",
    "ATEAM_API_URL": "http://localhost:3000"
  }
}
```

## Agent Lifecycle Hooks

The plugin uses Claude Code's hook system to enforce workflow discipline:

### Working Agent Hooks (Murdock, B.A., Lynch, Amy, Tawnia)

All working agents have two hooks:

**PreToolUse Hook** - Blocks raw echo to activity log:
```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "node scripts/hooks/block-raw-echo-log.js"
```

**Purpose:** Prevents agents from using raw `echo >> activity.log` commands. Agents must use the `log` or `activity_log` MCP tool instead for proper formatting and API integration.

**Stop Hook** - Enforces completion logging:
```yaml
hooks:
  Stop:
    - hooks:
        - type: command
          command: "node scripts/hooks/enforce-completion-log.js"
```

**Purpose:** Prevents agents from finishing without calling the `agent_stop` MCP tool to record their work.

### Hannibal Hooks

Hannibal has hooks to maintain orchestrator boundaries:

**PreToolUse Hook** - Blocks writes to source code:
```yaml
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "node scripts/hooks/block-hannibal-writes.js"
```

**Purpose:** Prevents Hannibal from writing to `src/**` or test files. Implementation must be delegated to B.A. and Murdock.

**Stop Hook** - Enforces final review and post-checks:
```yaml
hooks:
  Stop:
    - hooks:
        - type: command
          command: "node scripts/hooks/enforce-final-review.js"
```

**Purpose:** Prevents mission from ending without:
1. All items reaching `done` stage
2. Final Mission Review being completed by Lynch
3. Post-mission checks passing (lint, tests, e2e)

## Project Configuration

The `/ateam setup` command **auto-detects** project settings and creates `ateam.config.json`:

### Auto-Detection Sources

1. **CLAUDE.md** - Scans for:
   - Package manager mentions (`npm`, `yarn`, `pnpm`, `bun`)
   - Test commands (`npm test`, `vitest`, `pnpm test:unit`, etc.)
   - Lint commands (`npm run lint`, `eslint`, `biome`, etc.)
   - Dev server URLs (`localhost:3000`, `localhost:5173`, etc.)
   - Docker commands (`docker compose up`, etc.)

2. **package.json** - Checks `scripts` for:
   - `test`, `test:unit`, `test:e2e`, `lint`, `dev`, `start`

3. **Lock files** - Detects package manager:
   - `package-lock.json` → npm
   - `yarn.lock` → yarn
   - `pnpm-lock.yaml` → pnpm
   - `bun.lockb` → bun

### Config File Format

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

**Dev server** (`devServer`):
- `url`: Where Amy should point Playwright for browser testing
- `start`: Command to start the server (for user reference)
- `restart`: Command to restart the server (e.g., to pick up code changes)
- `managed`: If false, user manages server; Amy checks if running but doesn't start/restart it

**Pre-mission checks** (`mission_precheck` MCP tool):
- Run before `/ateam run` starts execution
- Ensures codebase is in clean state (no existing lint/test failures)
- Establishes baseline for mission work

**Post-mission checks** (`mission_postcheck` MCP tool):
- Run after Lynch completes Final Mission Review
- Proves all code works together (lint + unit + e2e all passing)
- Required for mission completion (enforced by Hannibal's Stop hook)

## Plugin Dependencies

**Playwright Plugin (Recommended):**
Amy uses Playwright MCP tools for browser-based testing. The `/ateam setup` command checks for this dependency.

Without Playwright, Amy can still:
- Run curl commands for API testing
- Execute Node.js test scripts
- Analyze code and logs

But she won't be able to:
- Open browsers for UI testing
- Take screenshots
- Test interactive flows

## Installation

When published, users can install this plugin via several methods:

### Option 1: Claude Code Plugin Command (Recommended)
```
/plugin install ai-team
```

Or from a marketplace:
```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install ai-team
```

### Option 2: Git Submodule
```bash
git submodule add git@github.com:yourorg/ai-team.git .claude/ai-team
```

### Development Testing
Use the `--plugin-dir` flag to test during development:
```bash
claude --plugin-dir /path/to/ai-team
```

Once installed, the plugin's slash commands (`/ateam plan`, `/ateam run`, etc.) become available.

### First-Time Setup

After installation, run setup to configure the project:

```
/ateam setup
```

This will:
1. Configure your project ID (for multi-project isolation)
2. Set up required permissions for background agents
3. Create `ateam.config.json` with project settings
4. Verify API server connectivity
5. Check for optional Playwright plugin
