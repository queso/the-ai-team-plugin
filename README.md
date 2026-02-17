# The A(i)-Team

**Parallel Agent Orchestration Plugin for Claude Code**

> "I love it when a plan comes together." — Hannibal

---

## Overview

A self-orchestrating Claude Code plugin that transforms a PRD into working, tested code through pipeline-based agent execution. Enforces TDD discipline, manages dependencies automatically, and provides real-time visibility into progress via a web-based Kanban UI.

## Architecture

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

All mission state is stored in the **A(i)-Team API database**, enabling:
- **Multi-project isolation** via `ATEAM_PROJECT_ID`
- **Web-based Kanban UI** for real-time visibility
- **Activity feeds** for live logging
- **Persistence** across Claude Code sessions

## The Team

| Agent | Role | Subagent Type | Specialty |
|-------|------|---------------|-----------|
| **Hannibal** | Orchestrator | *(main context)* | The man with the plan. Coordinates the team. |
| **Face** | Decomposer | opus | Breaks impossible missions into achievable objectives. |
| **Sosa** | Critic | `requirements-critic` | Challenges Face's breakdown. Finds gaps before work begins. |
| **Murdock** | QA Engineer | `qa-engineer` | Writes tests for critical paths. Move fast. |
| **B.A.** | Implementer | `clean-code-architect` | Builds solid, reliable code. No jibber-jabber. |
| **Lynch** | Reviewer | `code-review-expert` | Reviews tests + implementation together. |
| **Amy** | Investigator | `bug-hunter` | Probes every feature for bugs beyond tests. |
| **Tawnia** | Documentation | `clean-code-architect` | Updates docs and makes the final commit. |

## Installation

Add as a git submodule to any project:

```bash
# Add to your project's .claude folder
git submodule add git@github.com:yourorg/ai-team.git .claude/ai-team
```

**Project structure after install:**
```
your-project/
├── .claude/
│   └── ai-team/           # This plugin (submodule)
├── ateam.config.json      # Created by /ateam setup
└── src/
```

**Updating:**
```bash
git submodule update --remote .claude/ai-team
```

## Quick Start

```bash
# First time: configure project ID and permissions
/ateam setup

# Plan a mission from a PRD
/ateam plan ./docs/my-feature-prd.md

# Execute with pipeline agents
/ateam run

# Check progress anytime
/ateam status

# Resume after interruption
/ateam resume

# Unblock a stuck item
/ateam unblock 015 --guidance "Try using the existing AuthService"
```

## Kanban Dashboard

The A(i)-Team includes a web-based dashboard for real-time visibility into mission progress. Start it with Docker:

```bash
# From the ai-team plugin directory
docker compose up -d

# Visit http://localhost:3001
```

The dashboard provides two views:

### Mission Board View
- **Kanban board** with columns for each pipeline stage (briefings, ready, testing, implementing, review, probing, done)
- **Work item cards** showing title, type, assigned agent, and status
- **Live updates** via Server-Sent Events (SSE) as items move through stages
- **Activity feed** with timestamped agent actions

### Raw Agent View (NEW)
- **Real-time observability** into agent tool calls via observer hooks
- **Swim lanes** showing each agent's activity (Hannibal, Face, Sosa, Murdock, B.A., Lynch, Amy, Tawnia)
- **Tool call timeline** with PreToolUse, PostToolUse, and Stop events
- **Duration tracking** showing how long each tool call took (e.g., "Write took 1.2s")
- **Filtering controls** to view specific agents, tools, or event types
- **Live updates** via SSE as agents execute tools

Switch between views using the navigation tabs at the top of the dashboard.

## Pipeline Flow

### Planning Phase (`/ateam plan`)

Two-pass refinement ensures quality before work begins:

```
PRD → Face (1st pass) → Sosa (review) → Face (2nd pass) → ready stage
           ↓                  ↓               ↓
      briefings          questions         refinement
        stage            (human)
```

1. **Face (First Pass)**: Decomposes PRD into work items in `briefings` stage
2. **Sosa (Review)**: Challenges the breakdown, asks human questions via `AskUserQuestion`
3. **Face (Second Pass)**: Applies Sosa's recommendations, moves Wave 0 items to `ready` stage

Use `--skip-refinement` to bypass Sosa for simple PRDs.

### Execution Phase (`/ateam run`)

**Before starting execution:**
- **Pre-Mission Checks**: Runs `mission_precheck` MCP tool to verify lint and tests pass (establishes baseline)

Each feature flows through stages sequentially:

```
briefings → ready → testing → implementing → review → probing → done
                       ↑           ↑            ↑         ↑       │
                    Murdock      B.A.        Lynch      Amy       │
                                          (per-feature)           │
                                                                  ▼
                                                        ┌─────────────────┐
                                                        │  Final Review   │
                                                        │  (Lynch - all   │
                                                        │   code at once) │
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

**Stage transitions:**
1. `ready → testing`: Murdock writes tests (and types if needed)
2. `testing → implementing`: B.A. implements to pass tests
3. `implementing → review`: Lynch reviews ALL outputs together
4. `review → probing`: Amy probes for bugs beyond tests (APPROVED)
5. `probing → done`: Feature complete (VERIFIED), or back to ready (FLAG)
6. `all done → final review`: Lynch reviews entire codebase holistically
7. `final review → post-checks`: Run `mission_postcheck` MCP tool (lint, unit, e2e)
8. `post-checks → documentation`: Tawnia updates CHANGELOG, README, docs/
9. `documentation → complete`: Tawnia creates final commit with all co-authors

## Pipeline Parallelism

Different features can be at different stages simultaneously:

```
Feature 001: [implementing] ─→ [review]       ─→ done
Feature 002:    [testing]   ─→ [implementing] ─→ ...
Feature 003:                   [testing]      ─→ ...
```

WIP limit controls how many features are in-flight (not in briefings, ready, or done stages).

### True Individual Item Tracking

Items flow independently through the pipeline. When an agent completes work on one item, that item advances **immediately** without waiting for other agents:

```
Time T0: Dispatch Murdock for 001, 002, 003
Time T1: 001 completes → immediately move to implementing, dispatch B.A.
         (002 and 003 still in testing)
Time T2: 002 completes → immediately move to implementing, dispatch B.A.
         (001 now in implementing, 003 still in testing)
```

This is achieved through:
1. **TaskOutput polling** - Hannibal polls each background agent individually
2. **Completion signaling** - Agents call `agent_stop` MCP tool when done
3. **Per-item tracking** - `board_move` MCP tool stores assignments in database

## Feature Item Format

Each work item bundles everything for one feature:

```yaml
id: "WI-001"  # Generated by API with WI- prefix
title: "Order sync service"
type: "feature"
stage: "briefings"
outputs:
  types: "src/types/order-sync.ts"           # Optional
  test: "src/__tests__/order-sync.test.ts"
  impl: "src/services/order-sync.ts"
dependencies: []
parallel_group: "orders"
status: "pending"
rejection_count: 0
objective: "One sentence describing the deliverable."
acceptance:
  - "Criterion 1"
  - "Criterion 2"
context: "Business logic, patterns, edge cases to consider."
```

## Key Features

### TDD Pipeline

Each feature flows: **Murdock → B.A. → Lynch → Amy**
1. Murdock writes tests first (defines acceptance criteria)
2. B.A. implements to pass those tests
3. Lynch reviews tests + implementation together
4. Amy probes for bugs that slip past tests

### Final Mission Review

When ALL features are complete, Lynch performs a holistic review of the entire codebase:
- **Readability & consistency** across all files
- **Race conditions & async issues** in concurrent code
- **Security vulnerabilities** (injection, auth gaps, input validation)
- **Code quality** (DRY violations, coupling, performance)
- **Integration issues** between modules

If issues are found, specific items return to the pipeline for fixes.

### Mission Lifecycle Checks

**Pre-Mission Checks** (`mission_precheck` MCP tool):
- Run before `/ateam run` starts execution
- Configured via `ateam.config.json` (typically lint + unit tests)
- Ensures codebase is in clean state before mission begins
- Establishes baseline - if tests are already failing, mission can't determine what it broke

**Post-Mission Checks** (`mission_postcheck` MCP tool):
- Run after Lynch's Final Mission Review approves
- Configured via `ateam.config.json` (typically lint + unit + e2e)
- Proves all code works together
- Required for mission completion (enforced by Hannibal's Stop hook)

### Testing Philosophy

**Move fast, test what matters:**
- ✅ Happy paths
- ✅ Negative paths (error cases)
- ✅ Key edge cases
- ❌ Don't chase 100% coverage

### Work Item Sizing

**Smallest independently-completable units:**
- One logical unit of functionality per item
- No arbitrary time limits
- If you can split it further, split it

### Resumable

- Pick up where you left off after interruptions
- Items in active stages return to previous stage
- Completed work is never redone

## Commands

### `/ateam setup`

Configure project ID, permissions, and settings. **Run this once per project.**

This command:
1. **Configures project ID** - Sets `ATEAM_PROJECT_ID` for multi-project isolation
2. **Auto-detects settings** from `CLAUDE.md`, `package.json`, and lock files
3. **Confirms detected settings** before writing
4. **Configures permissions** for background agents:
   - `Bash(mkdir *)` - create directories
   - `Write(src/**)` - tests and implementations
   - `Edit(src/**)` - edit existing files
   - `Bash(git add *)` - staging files for commit
   - `Bash(git commit *)` - creating final commit
5. **Creates `ateam.config.json`** with project settings
6. **Verifies API connectivity**
7. **Checks for Playwright plugin** (for Amy's browser testing)

### `/ateam plan <prd-file> [--skip-refinement]`

Initialize a mission from a PRD file with two-pass refinement:
1. Face decomposes PRD into work items
2. Sosa reviews and asks clarifying questions
3. Face refines based on feedback and moves Wave 0 to `ready` stage

Use `--skip-refinement` to bypass Sosa's review for simple PRDs.

### `/ateam run [--wip N] [--max-wip M]`

Execute the mission. Default WIP: 3, max: 5.

### `/ateam status`

Display the mission board with current progress.

### `/ateam resume`

Resume an interrupted mission.

### `/ateam unblock <item-id> [--guidance "hint"]`

Unblock a stuck work item with optional guidance.

### Standalone Skills

#### `/perspective-test <feature>`

Test a feature from a real user's perspective. Combines static code analysis with browser-based verification to catch integration bugs that unit tests miss.

```bash
/perspective-test "the login form"
/perspective-test "project name display in header"
/perspective-test src/components/UserProfile.tsx
```

## MCP Server

The plugin includes an MCP (Model Context Protocol) server that exposes board operations as tools that Claude Code can invoke directly.

### Setup

1. **Build the MCP server:**
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

2. **Configure environment** (via `.claude/settings.local.json`):
   ```json
   {
     "env": {
       "ATEAM_PROJECT_ID": "my-project-name",
       "ATEAM_API_URL": "http://localhost:3000"
     }
   }
   ```

### Available Tools

The MCP server provides 20 tools across 5 modules:

| Module | Tools | Description |
|--------|-------|-------------|
| **Board** | `board_read`, `board_move`, `board_claim`, `board_release` | Board state and item movement |
| **Items** | `item_create`, `item_update`, `item_get`, `item_list`, `item_reject`, `item_render` | Work item CRUD operations |
| **Agents** | `agent_start`, `agent_stop` | Agent lifecycle hooks |
| **Missions** | `mission_init`, `mission_current`, `mission_precheck`, `mission_postcheck`, `mission_archive` | Mission lifecycle management |
| **Utils** | `deps_check`, `activity_log`, `log` | Dependency validation and logging |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ATEAM_PROJECT_ID` | `default` | Project identifier for multi-project isolation |
| `ATEAM_API_URL` | `http://localhost:3000` | A(i)-Team API server URL |
| `ATEAM_API_KEY` | - | Optional API key for authentication |
| `ATEAM_TIMEOUT` | `10000` | Request timeout in ms |
| `ATEAM_RETRIES` | `3` | Max retry attempts |

## Plugin Structure

```
ai-team/                     # Add as .claude/ai-team submodule
├── plugin.json              # Plugin configuration
├── package.json             # Node.js dependencies
├── .mcp.json                # MCP server configuration for Claude Code
├── mcp-server/              # MCP server implementation
│   ├── src/
│   │   ├── index.ts         # Entry point (stdio transport)
│   │   ├── server.ts        # McpServer instance
│   │   ├── config.ts        # Environment configuration (projectId, apiUrl)
│   │   ├── client/          # HTTP client with retry logic
│   │   ├── lib/             # Error handling utilities
│   │   └── tools/           # Tool implementations
│   │       ├── board.ts     # Board operations (4 tools)
│   │       ├── items.ts     # Item operations (6 tools)
│   │       ├── agents.ts    # Agent lifecycle (2 tools)
│   │       ├── missions.ts  # Mission lifecycle (5 tools)
│   │       ├── utils.ts     # Utilities (3 tools)
│   │       └── index.ts     # Tool registration
│   ├── package.json
│   └── tsconfig.json
├── agents/                  # Agent prompts with lifecycle hooks
│   ├── hannibal.md          # Orchestrator (PreToolUse + Stop hooks)
│   ├── face.md              # Decomposer (opus)
│   ├── sosa.md              # Requirements Critic (opus)
│   ├── murdock.md           # QA Engineer (PreToolUse + Stop hooks)
│   ├── ba.md                # Implementer (PreToolUse + Stop hooks)
│   ├── lynch.md             # Reviewer (PreToolUse + Stop hooks)
│   ├── amy.md               # Investigator (PreToolUse + Stop hooks)
│   └── tawnia.md            # Documentation writer (PreToolUse + Stop hooks)
├── commands/
│   ├── setup.md             # Configure project ID + permissions
│   ├── plan.md              # Initialize mission
│   ├── run.md               # Execute mission
│   ├── status.md            # Check progress
│   ├── resume.md            # Resume interrupted
│   ├── unblock.md           # Unblock failed items
│   └── perspective-test.md  # Standalone user perspective testing
├── skills/
│   ├── tdd-workflow.md      # TDD guidance
│   └── perspective-test.md  # User perspective testing methodology
├── scripts/                 # Hook enforcement scripts
│   └── hooks/               # Agent lifecycle hooks
│       ├── enforce-completion-log.js    # Stop hook for working agents
│       ├── block-raw-echo-log.js        # PreToolUse for working agents
│       ├── block-hannibal-writes.js     # PreToolUse for Hannibal
│       ├── block-raw-mv.js              # PreToolUse for Hannibal
│       └── enforce-final-review.js      # Stop for Hannibal
├── lib/                     # Shared libraries
│   ├── board.js
│   ├── lock.js
│   └── validate.js
├── docs/                    # Documentation
└── README.md
```

## Agent Lifecycle Hooks

The plugin uses Claude Code's hook system to enforce workflow discipline:

### Working Agent Hooks (Murdock, B.A., Lynch, Amy, Tawnia)

**PreToolUse Hook** (`block-raw-echo-log.js`):
- Forces agents to use the `log` MCP tool for activity logging
- Ensures consistent logging format

**Stop Hook** (`enforce-completion-log.js`):
- Prevents agents from finishing without calling the `agent_stop` MCP tool
- Ensures work summaries are recorded in the work item's `work_log`

### Hannibal Hooks

**PreToolUse Hook** (`block-hannibal-writes.js`):
- Blocks Hannibal from writing to `src/**` or test files
- Enforces delegation to B.A. and Murdock

**Stop Hook** (`enforce-final-review.js`):
- Prevents mission from ending without all items in `done` stage
- Requires Lynch's Final Mission Review verdict
- Requires post-mission checks to pass

## Project Configuration

`ateam.config.json` (created by `/ateam setup`):

```json
{
  "packageManager": "pnpm",
  "checks": {
    "lint": "pnpm run lint",
    "unit": "pnpm test:unit",
    "e2e": "pnpm exec playwright test"
  },
  "precheck": ["lint", "unit"],
  "postcheck": ["lint", "unit", "e2e"],
  "devServer": {
    "url": "http://localhost:3000",
    "start": "docker compose up",
    "restart": "docker compose restart",
    "managed": false
  }
}
```

## Troubleshooting

### Background agents getting permission denied
**Symptom:** Murdock/B.A. errors: "Permission to use Write has been auto-denied (prompts unavailable)"

**Cause:** Background agents can't prompt for approval interactively.

**Fix:** Run `/ateam setup` to configure required permissions, or manually add to `.claude/settings.local.json`:
```json
{
  "env": {
    "ATEAM_PROJECT_ID": "my-project-name"
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

### Cannot connect to API server
**Symptom:** MCP tools return connection errors.

**Cause:** A(i)-Team API server is not running.

**Fix:** Start the API server and ensure `ATEAM_API_URL` is configured correctly in `.claude/settings.local.json`.

### Agents not creating files
**Symptom:** Murdock/B.A. complete but no test/impl files appear.

**Cause:** Work items missing `outputs:` field.

**Fix:** Ensure every work item has:
```yaml
outputs:
  test: "src/__tests__/feature.test.ts"
  impl: "src/services/feature.ts"
```

### Murdock writing implementation code
**Symptom:** Murdock creates both tests AND implementation instead of just tests.

**Cause:** Murdock's boundaries weren't clear enough.

**Fix:** Murdock should only create files at `outputs.test` and `outputs.types`. Implementation (`outputs.impl`) is B.A.'s job.

---

*In 1972, a crack commando unit was sent to prison by a military court for a crime they didn't commit. These men promptly escaped from a maximum security stockade to the Los Angeles underground. Today, still wanted by the government, they survive as soldiers of fortune. If you have a problem, if no one else can help, and if you can find them, maybe you can hire... The A(i)-Team.*
