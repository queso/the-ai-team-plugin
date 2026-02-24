# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Intent Layer

**Before modifying code in a subdirectory, read its AGENTS.md first** to understand local patterns and invariants.

- **MCP Server**: `packages/mcp-server/AGENTS.md` - Bridge between Claude Code and the A(i)-Team API (21 tools, HTTP client, Zod schemas)
- **Agent Prompts**: `agents/AGENTS.md` - Agent behavior contracts, hooks, boundaries, and dispatch patterns
- **Kanban Viewer**: `packages/kanban-viewer/CLAUDE.md` - Next.js web UI with Prisma/SQLite (already documented)

### Global Invariants

- All mission state lives in the API database, not the filesystem. Use MCP tools for state changes.
- The `@ai-team/shared` package must be built before `@ai-team/mcp-server` (workspace dependency).
- Both shared and mcp-server use `moduleResolution: "NodeNext"` — all relative imports need `.js` extensions.
- Tests use **vitest** (not bun's native test runner). Run `bun run test`, never bare `bun test`.
- Agent files use YAML frontmatter with hooks that enforce workflow boundaries at runtime.

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
│                    │  (21 tools)     │                      │
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

### With Native Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                              │
│  ┌─────────────┐                                            │
│  │   Hannibal  │──── Task(team_name) ────────┐             │
│  │ (team lead) │                              │             │
│  └──────┬──────┘                              ▼             │
│         │                         ┌────────────────────────┐│
│         │    ┌── SendMessage ────▶│ Murdock   (tester)    ││
│         │    │                    │ B.A.      (coder)     ││
│         │◀───┤                    │ Lynch     (reviewer)  ││
│         │    │                    │ Amy       (researcher)││
│         │    └── SendMessage ────▶│ Tawnia    (documenter)││
│         │                         └──────────┬─────────────┘│
│         │                                    │              │
│         └────────────────┬───────────────────┘              │
│                          │                                  │
│                 ┌────────▼────────┐                         │
│                 │   MCP Server    │                         │
│                 └────────┬────────┘                         │
└──────────────────────────┤──────────────────────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │  A(i)-Team API  │
                 └─────────────────┘
```

Native handles orchestration, MCP handles persistence.

### Package Dependencies

```
@ai-team/shared
    ↑
    ├── @ai-team/mcp-server (MCP tools depend on shared types)
    └── @ai-team/kanban-viewer (UI depends on shared types)
```

The `@ai-team/shared` package provides TypeScript types and constants used by both the MCP server and Kanban viewer, ensuring type consistency across the system.

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

**Note on transition enforcement:** The diagram above shows the happy-path flow. The actual transition matrix enforces stricter rules: `testing` can only advance to `review` (not directly to `implementing`); `implementing` can only advance to `review`; `review` can send an item back to `testing` or `implementing` for rework, or forward to `probing`; `probing` cannot be skipped — `review` cannot transition directly to `done`. See `packages/shared/src/stages.ts` for the full `TRANSITION_MATRIX`.

Each feature flows through stages sequentially. Different features can be at different stages simultaneously (pipeline parallelism). WIP limits control how many features are in-flight.

**Two-Level Orchestration:**
1. **Dependency waves** - Items wait in `briefings` until deps reach `done` (correct waiting)
2. **Pipeline flow** - Items advance IMMEDIATELY on completion, no stage batching (critical)

Use the `deps_check` MCP tool to see which items are ready. Within a wave, items flow independently through stages.

**True Individual Item Tracking:** Items advance immediately when their agent completes - no waiting for batch completion. In legacy mode, Hannibal polls TaskOutput for each background agent individually. In native teams mode, agents send completion messages via SendMessage. In both modes, agents signal completion via the `agent_stop` MCP tool.

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
type: "feature"        # feature | task | bug | enhancement
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
- `/ateam setup` - Configure project ID, permissions, teammate mode, and settings (run once per project)
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

**Test granularity depends on work item type:**

| Type | Test Count | Focus |
|------|------------|-------|
| `feature` | 3-5 tests | Happy path, error path, edge cases |
| `task` | 1-3 smoke tests | "Does it compile? Does it run? Does it integrate?" |
| `bug` | 2-3 tests | Reproduce bug, verify fix, regression guard |
| `enhancement` | 2-4 tests | New/changed behavior only |

**Scaffolding work (`type: "task"`)** needs minimal testing:
- Types-only items: 1-2 tests proving the types compile and can be used
- Config files: 1-2 tests proving config loads and works
- Don't test every field/property individually - test the outcome

**Feature work (`type: "feature"`)** needs behavioral testing:
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

### Agent Dispatch (Dual Mode)

The plugin supports two dispatch modes, controlled by `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. The `/ateam run` command detects the mode and loads the appropriate orchestration playbook:

- **Legacy mode** (default): `playbooks/orchestration-legacy.md` - Uses `Task` with `run_in_background: true` and `TaskOutput` polling
- **Native teams mode** (env var = "1"): `playbooks/orchestration-native.md` - Uses `TeamCreate`, `Task` with `team_name`, and `SendMessage`

**Progressive disclosure:** Hannibal reads exactly ONE playbook at mission start. The playbook contains the complete orchestration loop, agent dispatch patterns, completion detection, and concrete examples. Claude never sees the irrelevant mode's instructions.

**Planning Phase (both modes):**
- Face: `subagent_type: "ai-team:face"`, `model: "opus"`
- Sosa: `subagent_type: "ai-team:sosa"`, `model: "opus"`

**Per-Feature Pipeline (ALL MANDATORY for each item):**
- Murdock: `subagent_type: "ai-team:murdock"`, `model: "sonnet"` → testing stage
- B.A.: `subagent_type: "ai-team:ba"`, `model: "sonnet"` → implementing stage
- Lynch: `subagent_type: "ai-team:lynch"` → review stage
- Amy: `subagent_type: "ai-team:amy"`, `model: "sonnet"` → probing stage (EVERY feature, no exceptions)

**Mission Completion (MANDATORY):**
- Tawnia: `subagent_type: "ai-team:tawnia"`, `model: "sonnet"` → after post-checks pass

### Background Agent Permissions

**IMPORTANT:** Background agents (`run_in_background: true`) cannot prompt for user approval. Operations that require approval will be auto-denied.

**Native Teams Mode:** When using native teams, agents are spawned as teammates via `Task` with `team_name` parameter. The same permissions in `.claude/settings.local.json` are still required for filesystem operations.

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
├── .claude-plugin/plugin.json  # Plugin configuration
├── .mcp.json                # MCP server configuration
├── package.json             # Bun workspaces root (run `bun install`)
├── bun.lockb                # Bun lock file
├── docker-compose.yml       # Docker setup for kanban-viewer
├── packages/                # Monorepo packages
│   ├── shared/              # @ai-team/shared - Shared types and constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts     # Re-exports all types
│   │       ├── stages.ts    # Stage definitions and validation
│   │       ├── agents.ts    # Agent type definitions
│   │       ├── items.ts     # Work item types
│   │       ├── errors.ts    # Error types
│   │       └── __tests__/   # Type tests
│   ├── mcp-server/          # @ai-team/mcp-server - MCP server for Claude Code integration
│   │   ├── package.json     # MCP server dependencies
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts     # Entry point (stdio transport)
│   │   │   ├── server.ts    # McpServer instance
│   │   │   ├── config.ts    # Environment configuration (projectId, apiUrl, etc.)
│   │   │   ├── client/      # HTTP client with retry logic
│   │   │   ├── lib/         # Error handling utilities
│   │   │   └── tools/       # Tool implementations (21 tools)
│   │   │       ├── board.ts     # Board operations (4 tools)
│   │   │       ├── items.ts     # Item operations (6 tools)
│   │   │       ├── agents.ts    # Agent lifecycle (2 tools)
│   │   │       ├── missions.ts  # Mission lifecycle (5 tools)
│   │   │       ├── utils.ts     # Utilities (4 tools)
│   │   │       └── index.ts     # Tool registration
│   │   └── dist/            # Compiled JavaScript
│   └── kanban-viewer/       # @ai-team/kanban-viewer - Web-based Kanban UI
│       ├── package.json
│       ├── Dockerfile
│       └── src/             # React application
├── hooks/                   # Plugin-level hooks (auto-loaded by Claude Code)
│   └── hooks.json           # Plugin hooks: observer telemetry + enforcement hooks
├── playbooks/               # Dispatch-mode orchestration playbooks
│   ├── orchestration-legacy.md   # Legacy Task/TaskOutput dispatch
│   └── orchestration-native.md   # Native teams (TeamCreate/SendMessage) dispatch
├── agents/                  # Agent prompts and behavior (with frontmatter hooks)
│   ├── AGENTS.md            # Local patterns, invariants, and hook contracts
│   ├── hannibal.md          # Orchestrator (PreToolUse + PostToolUse + Stop hooks)
│   ├── face.md              # Decomposer (PreToolUse + PostToolUse + Stop observers)
│   ├── sosa.md              # Requirements Critic (PreToolUse + PostToolUse + Stop hooks)
│   ├── murdock.md           # QA Engineer (PreToolUse + PostToolUse + Stop hooks)
│   ├── ba.md                # Implementer (PreToolUse + PostToolUse + Stop hooks)
│   ├── lynch.md             # Reviewer (PreToolUse + PostToolUse + Stop hooks)
│   ├── amy.md               # Investigator (PreToolUse + PostToolUse + Stop hooks)
│   ├── tawnia.md            # Documentation writer (PreToolUse + PostToolUse + Stop hooks)
│   └── __tests__/           # Agent hook contract tests
├── commands/                # Slash command definitions
│   ├── setup.md, plan.md, run.md, status.md, resume.md, unblock.md
│   └── perspective-test.md  # Standalone user perspective testing
├── skills/
│   ├── test-writing/
│   │   ├── SKILL.md                          # Test quality rules (5 banned categories)
│   │   └── references/
│   │       └── testing-anti-patterns.md      # Detailed anti-pattern catalog
│   ├── tdd-workflow/
│   │   └── SKILL.md                          # TDD cycle and test granularity
│   └── perspective-test/
│       └── SKILL.md                          # User perspective testing methodology
├── scripts/                 # Hook enforcement scripts (for internal use)
│   ├── vitest.config.ts     # Test configuration for hook scripts
│   └── hooks/               # Agent lifecycle hooks
│       ├── lib/
│       │   ├── observer.js              # Shared observer utility
│       │   ├── resolve-agent.js         # Shared agent identity resolution (resolveAgent, isKnownAgent, KNOWN_AGENTS)
│       │   └── send-denied-event.js     # Fire-and-forget denied event recording
│       ├── __tests__/                   # Hook unit tests
│       │   ├── enforce-hooks.test.js
│       │   └── observe-hooks.test.ts
│       ├── # Observer hooks (telemetry)
│       ├── observe-pre-tool-use.js      # PreToolUse observer
│       ├── observe-post-tool-use.js     # PostToolUse observer
│       ├── observe-stop.js              # Stop observer
│       ├── observe-subagent.js          # Subagent lifecycle observer
│       ├── observe-teammate.js          # Teammate lifecycle observer
│       ├── track-browser-usage.js       # Browser tool usage tracker (Amy)
│       ├── # Stop hooks (completion enforcement)
│       ├── enforce-completion-log.js    # Require agent_stop before finishing
│       ├── enforce-final-review.js      # Require final review (Hannibal)
│       ├── enforce-orchestrator-boundary.js  # Plugin-level Hannibal enforcement
│       ├── enforce-orchestrator-stop.js      # Plugin-level Hannibal stop
│       ├── enforce-sosa-coverage.js     # Require item coverage (Sosa)
│       ├── enforce-browser-verification.js   # Require browser testing (Amy)
│       ├── # PreToolUse hooks (boundary enforcement)
│       ├── block-raw-echo-log.js        # Block echo >> activity.log
│       ├── block-raw-mv.js              # Block raw mv (Hannibal)
│       ├── block-hannibal-writes.js     # Block src/** writes (Hannibal)
│       ├── block-murdock-impl-writes.js # Block impl writes (Murdock)
│       ├── block-ba-test-writes.js      # Block test writes (B.A.)
│       ├── block-ba-bash-restrictions.js # Block dev server/git stash (B.A.)
│       ├── block-amy-writes.js          # Block all project writes (Amy)
│       ├── block-amy-test-writes.js     # Block test file writes (Amy)
│       ├── block-lynch-browser.js       # Block Playwright (Lynch)
│       ├── block-lynch-writes.js        # Block file writes (Lynch)
│       ├── block-sosa-writes.js         # Block all writes (Sosa)
│       ├── block-worker-board-move.js   # Block board_move (workers)
│       ├── block-worker-board-claim.js  # Block board_claim (workers)
│       └── diagnostic-hook.js           # Debug/diagnostic hook
└── docs/
    ├── hook-audit.md
    ├── test-anti-patterns.md
    ├── kanban-ui-prd.md     # PRD for web-based kanban board
    ├── compile-time-safety-verification.md
    ├── future-thinking.md
    └── teammate-tool-integration-prd.md
```

**Monorepo Structure:**
The repository uses bun workspaces with three packages:
- `@ai-team/shared` - Shared types and constants used by other packages
- `@ai-team/mcp-server` - MCP server (depends on @ai-team/shared)
- `@ai-team/kanban-viewer` - Web UI (depends on @ai-team/shared)

Plugin-specific files (agents/, commands/, skills/, scripts/) remain at the repository root.

**MCP Server Configuration:**
The `.mcp.json` file at the repository root points to `packages/mcp-server/src/index.ts` as the MCP server entry point. The server uses bun to run TypeScript directly without a separate build step for development.

## MCP Tools

Agents use MCP tools for all board and item operations. The MCP server exposes 21 tools across 5 modules:

| Module | Tools | Description |
|--------|-------|-------------|
| **Board** | `board_read`, `board_move`, `board_claim`, `board_release` | Board state and item movement |
| **Items** | `item_create`, `item_update`, `item_get`, `item_list`, `item_reject`, `item_render` | Work item CRUD operations |
| **Agents** | `agent_start`, `agent_stop` | Agent lifecycle hooks |
| **Missions** | `mission_init`, `mission_current`, `mission_precheck`, `mission_postcheck`, `mission_archive` | Mission lifecycle management |
| **Utils** | `plugin_root`, `deps_check`, `activity_log`, `log` | Plugin path resolution, dependency validation, and logging |

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
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | No | - | Set to `1` to enable native teams dispatch |
| `ATEAM_TEAMMATE_MODE` | No | `auto` | Teammate display: `auto`, `tmux`, or `in-process` |

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

The plugin uses Claude Code's hook system to enforce workflow discipline.

**IMPORTANT: Hook Data Source.** Claude Code sends hook context via **stdin as JSON**, NOT as environment variables. All hook scripts must read from stdin using `readFileSync(0, 'utf8')` and parse the JSON. The stdin JSON contains fields like `tool_name`, `tool_input`, `hook_event_name`, `session_id`, `cwd`, etc. The only env vars available are those from `settings.local.json` (e.g., `ATEAM_API_URL`, `ATEAM_PROJECT_ID`) and `CLAUDE_PROJECT_DIR`.

**IMPORTANT: Plugin-Level Hooks.** Observer hooks for telemetry (Raw Agent View) are defined in `hooks/hooks.json` at the plugin root. This file is auto-discovered by Claude Code from the `hooks/` directory at the plugin root — `plugin.json` does not reference it explicitly. These hooks fire automatically for all sessions where the plugin is enabled — no per-project configuration needed. Agent frontmatter hooks (in `agents/*.md`) provide enforcement (blocking bad behavior) scoped to individual agent lifetimes. Use `${CLAUDE_PLUGIN_ROOT}` for paths in both locations.

**IMPORTANT: Dual Registration.** All enforcement hooks are registered at BOTH the plugin level (`hooks/hooks.json`) AND in each agent's frontmatter. This is intentional for backward compatibility: frontmatter hooks scope to legacy subagent sessions, while plugin-level hooks catch native teammate sessions where frontmatter may not fire. Blocking is idempotent — being blocked by both levels is harmless.

**IMPORTANT: Agent Identity in Hooks.** All enforcement hooks use `resolveAgent()` from `scripts/hooks/lib/resolve-agent.js` to identify the current agent from hook stdin JSON. In native teams mode, `agent_type` (e.g. `"ai-team:ba"`) identifies the agent. In legacy mode, frontmatter scoping provides identity; plugin-level hooks fall back to the agent map from `lookupAgent()`. Unknown/null agents fail open (exit 0) in all enforcement hooks except `enforce-orchestrator-boundary.js`, which treats null as the main (Hannibal) session.

**IMPORTANT: Denied Event Telemetry.** All enforcement hooks call `sendDeniedEvent()` from `scripts/hooks/lib/send-denied-event.js` before blocking. This fires a fire-and-forget POST to the API with `status: "denied"`, recording which agent attempted the forbidden action. Events appear in the Raw Agent View with status "denied". No await, no throw on failure.

### Plugin-Level Hooks (`hooks/hooks.json`)

These hooks fire for all sessions where the plugin is enabled:

- **PreToolUse** (no matcher): `observe-pre-tool-use.js` — logs every tool call for Raw Agent View telemetry
- **PreToolUse** (no matcher): `enforce-orchestrator-boundary.js` — enforces allowlist for Hannibal's main session (allowlist: `ateam.config.json`, `.claude/*`, `/tmp/*`, `/var/*`); blocks Playwright browser tools; uses `resolveAgent()` + `lookupAgent()` for agent detection; expanded from blocklist to allowlist in PRD-007
- **PreToolUse** (no matcher): `block-amy-writes.js`, `block-amy-test-writes.js`, `block-murdock-impl-writes.js`, `block-ba-test-writes.js`, `block-ba-bash-restrictions.js`, `block-sosa-writes.js`, `block-lynch-writes.js`, `block-lynch-browser.js`, `block-hannibal-writes.js`, `block-raw-echo-log.js`, `block-raw-mv.js`, `block-worker-board-claim.js`, `block-worker-board-move.js` — all enforcement hooks registered at plugin level (in addition to agent frontmatter); use `resolveAgent()` to identify target agent and fail-open for unknown sessions
- **PostToolUse** (no matcher): `observe-post-tool-use.js` — logs every tool result for telemetry
- **Stop** (no matcher): `observe-stop.js` — logs agent stop events for telemetry
- **Stop** (no matcher): `enforce-orchestrator-stop.js` — prevents mission ending without final review and post-checks
- **SubagentStart** (no matcher): `observe-subagent.js` — logs subagent lifecycle events
- **SubagentStop** (no matcher): `observe-subagent.js` — logs subagent lifecycle events
- **TeammateIdle** (no matcher): `observe-teammate.js` — logs native teams teammate idle events
- **TaskCompleted** (no matcher): `observe-teammate.js` — logs native teams task completion events

### Shared Working Agent Hooks (Murdock, B.A., Lynch, Amy, Tawnia)

All five working agents share these hooks in their frontmatter:

**PreToolUse(Bash)** - Blocks raw echo to activity log (`block-raw-echo-log.js`):
Prevents agents from using raw `echo >> activity.log` commands. Agents must use the `log` or `activity_log` MCP tool instead for proper formatting and API integration.

**PreToolUse(mcp__plugin_ai-team_ateam__board_move)** - Blocks direct board moves (`block-worker-board-move.js`):
Prevents working agents from calling `board_move` directly. Stage transitions are Hannibal's responsibility.

**PreToolUse(mcp__plugin_ai-team_ateam__board_claim)** - Blocks direct board claims (`block-worker-board-claim.js`):
Prevents working agents from calling `board_claim` directly. Item claims go through `agent_start`.

**PreToolUse(no matcher)** - Observer (`observe-pre-tool-use.js {agent}`):
Logs every tool call with the agent's name as an argument for per-agent attribution in the Raw Agent View.

**PostToolUse(no matcher)** - Observer (`observe-post-tool-use.js {agent}`):
Logs every tool result with the agent's name for telemetry.

**Stop** - Enforces completion logging (`enforce-completion-log.js`):
Prevents agents from finishing without calling the `agent_stop` MCP tool to record their work summary.

**Stop** - Observer (`observe-stop.js {agent}`):
Logs the stop event with the agent's name for telemetry.

### Per-Agent Unique Hooks

In addition to the shared hooks above, each agent has additional hooks specific to its role:

**Murdock** (QA Engineer):
- PreToolUse(Write|Edit) → `block-murdock-impl-writes.js`: Prevents Murdock from writing implementation files. Murdock writes tests and types only; implementation belongs to B.A.

**B.A.** (Implementer):
- PreToolUse(Bash) → `block-ba-bash-restrictions.js` (in addition to `block-raw-echo-log.js`): Enforces Bash restrictions specific to B.A.'s role.
- PreToolUse(Write|Edit) → `block-ba-test-writes.js`: Prevents B.A. from writing or editing test files. Tests are Murdock's domain.

**Lynch** (Reviewer):
- PreToolUse(Write|Edit) → `block-lynch-writes.js`: Prevents Lynch from writing or editing project files. Lynch reviews code statically; `/tmp/` and `/var/` are allowed as scratch space.
- PreToolUse(mcp__plugin_playwright_playwright__.*) → `block-lynch-browser.js`: Prevents Lynch from using Playwright browser tools. Lynch reviews code statically; browser investigation belongs to Amy.

**Amy** (Investigator):
- PreToolUse(Write|Edit) → `block-amy-writes.js`: Blocks ALL project file writes. Amy can only write to `/tmp`. Investigation findings belong in the `agent_stop` work_log summary, not as file artifacts.
- PreToolUse(mcp__plugin_playwright) → `track-browser-usage.js`: Records browser tool usage so the Stop hook can verify Amy actually used the browser for UI features.
- PreToolUse(Skill) → `track-browser-usage.js`: Also tracks browser usage invoked through the Skill tool.
- Stop → `enforce-browser-verification.js` (runs before `enforce-completion-log.js`): Requires Amy to have performed browser verification for UI features before she can stop.

**Sosa** (Requirements Critic):
- PreToolUse(Write|Edit) → `block-sosa-writes.js`: Prevents Sosa from writing or editing any files. Sosa reviews and critiques only; modifications go through Face.
- Stop → `enforce-sosa-coverage.js`: Requires Sosa to have produced adequate coverage of the decomposition before stopping.

**Face** (Decomposer):
Face has observer hooks only (no enforcement hooks beyond the plugin-level ones).

### Hannibal Hooks

Hannibal runs in the main Claude context and has frontmatter hooks for orchestrator boundary enforcement plus observer hooks:

**PreToolUse(Write|Edit)** - Blocks writes to source code (`block-hannibal-writes.js`):
Prevents Hannibal from writing to `src/**` or test files. Implementation must be delegated to B.A. and Murdock.

**PreToolUse(Bash)** - Blocks raw file moves (`block-raw-mv.js`):
Prevents Hannibal from using raw `mv` commands on mission files. Stage transitions must go through the `board_move` MCP tool.

**Stop** - Enforces final review and post-checks (`enforce-final-review.js`):
Prevents mission from ending without:
1. All items reaching `done` stage
2. Final Mission Review being completed by Lynch
3. Post-mission checks passing (lint, tests, e2e)

Note: The plugin-level `hooks/hooks.json` also registers `enforce-orchestrator-boundary.js` and `enforce-orchestrator-stop.js` as session-level hooks that apply to the Hannibal session independently of the frontmatter hooks. All observer hooks (PreToolUse, PostToolUse, Stop) are also present in Hannibal's frontmatter for per-agent attribution.

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

**Note:** The A(i)-Team plugin itself uses bun workspaces for development, but it detects and works with any package manager in user projects.

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
- `url`: Where Amy should point the browser for testing
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

Amy (Investigator) uses browser testing tools during the probing stage to verify UI features. The `/ateam setup` command detects which tools are available and offers to install the preferred one.

**agent-browser CLI (Preferred):**
Amy's primary browser testing tool. Installed globally via npm/bun (`npm install -g agent-browser`). Used via Bash commands (`agent-browser open`, `agent-browser snapshot`, etc.). The `/ateam setup` command checks for it and offers to install it if missing, adding `Bash(agent-browser:*)` and `Skill(agent-browser)` permissions automatically.

**Playwright MCP Plugin (Fallback):**
Still supported as a fallback if agent-browser is unavailable. Detected by the presence of MCP tools matching `mcp__*playwright*` (e.g., `browser_navigate`, `browser_snapshot`, `browser_click`). The `/ateam setup` command detects this automatically and adds the required MCP tool permissions.

Without browser tools, Amy can still:
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

### Development Setup

For plugin development, the repository uses bun workspaces:

```bash
# Install dependencies for all packages
bun install

# Build shared package (must be built first)
cd packages/shared && bun run build

# Build MCP server
cd packages/mcp-server && bun run build

# Start Kanban UI (optional, for viewing mission progress)
docker compose up -d
```

The shared package must be built before other packages since they depend on it.
