# The A(i)-Team

**Parallel Agent Orchestration Plugin for Claude Code**

> "I love it when a plan comes together." — Hannibal

---

## Overview

A self-orchestrating Claude Code plugin that transforms a PRD into working, tested code through pipeline-based agent execution. Enforces TDD discipline, manages dependencies automatically, and provides real-time visibility into progress.

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

## Installation

Add as a git submodule to any project:

```bash
# Add to your project's .claude folder
git submodule add git@github.com:yourorg/ai-team.git .claude/ai-team

# Add mission directory to gitignore (project-specific state)
echo "mission/" >> .gitignore
```

**Project structure after install:**
```
your-project/
├── .claude/
│   └── ai-team/           # This plugin (submodule)
├── mission/               # Created by /ateam plan (gitignored)
└── src/
```

**Updating:**
```bash
git submodule update --remote .claude/ai-team
```

## Quick Start

```bash
# First time: configure permissions for background agents
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

## Pipeline Flow

### Planning Phase (`/ateam plan`)

Two-pass refinement ensures quality before work begins:

```
PRD → Face (1st pass) → Sosa (review) → Face (2nd pass) → ready/
           ↓                  ↓               ↓
      briefings/        questions         refinement
                        (human)
```

1. **Face (First Pass)**: Decomposes PRD into work items in `briefings/`
2. **Sosa (Review)**: Challenges the breakdown, asks human questions via `AskUserQuestion`
3. **Face (Second Pass)**: Applies Sosa's recommendations, moves Wave 0 items to `ready/`

Use `--skip-refinement` to bypass Sosa for simple PRDs.

### Execution Phase (`/ateam run`)

**Before starting execution:**
- **Pre-Mission Checks**: Runs `mission-precheck.js` to verify lint and tests pass (establishes baseline)

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
                                                        └─────────────────┘
```

**Stage transitions:**
1. `ready → testing`: Murdock writes tests (and types if needed)
2. `testing → implementing`: B.A. implements to pass tests
3. `implementing → review`: Lynch reviews ALL outputs together
4. `review → probing`: Amy probes for bugs beyond tests (APPROVED)
5. `probing → done`: Feature complete (VERIFIED), or back to ready (FLAG)
6. `all done → final review`: Lynch reviews entire codebase holistically
7. `final review → post-checks`: Run `mission-postcheck.js` (lint, unit, e2e)
8. `post-checks pass → complete`: Mission complete (or items back to ready if rejected)

## Pipeline Parallelism

Different features can be at different stages simultaneously:

```
Feature 001: [implementing] ─→ [review]       ─→ done
Feature 002:    [testing]   ─→ [implementing] ─→ ...
Feature 003:                   [testing]      ─→ ...
```

WIP limit controls how many features are in-flight.

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
2. **Completion signaling** - Agents call `item-complete.js` when done
3. **Per-item task_id tracking** - `board-move.js` stores task_id in assignments

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│  /ateam plan                                                        │
│      │                                                              │
│      ▼                                                              │
│  ┌────────┐                                                         │
│  │  Face  │ ──── First Pass: Decompose PRD into feature items       │
│  └───┬────┘                                                         │
│      │                                                              │
│      ▼                                                              │
│  ┌────────┐                                                         │
│  │  Sosa  │ ──── Review: Challenge breakdown, ask human questions   │
│  └───┬────┘                                                         │
│      │                                                              │
│      ▼                                                              │
│  ┌────────┐                                                         │
│  │  Face  │ ──── Second Pass: Refine items, move Wave 0 to ready/   │
│  └───┬────┘                                                         │
│      │                                                              │
│      ▼                                                              │
│  /ateam run                                                         │
│      │                                                              │
│      ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Main Claude AS Hannibal (orchestrator in main context)      │  │
│  │                                                              │  │
│  │  For each feature in pipeline:                               │  │
│  │                                                              │  │
│  │    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │  │
│  │    │ Murdock │ ─▶│  B.A.   │ ─▶│  Lynch  │ ─▶│   Amy   │─▶done │
│  │    │ (tests) │   │ (impl)  │   │(review) │   │(probing)│  │  │
│  │    └─────────┘   └─────────┘   └─────────┘   └─────────┘  │  │
│  │     subagent      subagent      subagent      subagent    │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ════════════════════════════════════════════════════════════════  │
│         "I love it when a plan comes together."                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key:** Hannibal runs in the main Claude context (visible to you), dispatching Murdock, B.A., Lynch, and Amy as subagents. Sosa reviews during planning before Hannibal takes over.

## Mission Directory Structure

```
mission/
├── board.json               # State, WIP limits, agent status, assignments
├── activity.log             # Append-only log for Live Feed
├── briefings/               # Backlog (feature items)
├── ready/                   # Dependencies met, awaiting work
├── testing/                 # Murdock writing tests
├── implementing/            # B.A. implementing
├── review/                  # Lynch reviewing
├── probing/                 # Amy probing for bugs
├── done/                    # Completed features
├── blocked/                 # Needs human intervention
└── archive/                 # Completed missions (optional)
    └── <mission-name>/      # Archived work items from previous missions
```

## Feature Item Format

Each work item bundles everything for one feature:

```yaml
---
id: "001"
title: "Order sync service"
type: "feature"
outputs:
  types: "src/types/order-sync.ts"           # Optional
  test: "src/__tests__/order-sync.test.ts"
  impl: "src/services/order-sync.ts"
dependencies: []
parallel_group: "orders"
status: "pending"
rejection_count: 0
---

## Objective

One sentence describing the deliverable.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Context

Business logic, patterns, edge cases to consider.
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

**Pre-Mission Checks** (`mission-precheck.js`):
- Run before `/ateam run` starts execution
- Configured via `ateam.config.json` (typically lint + unit tests)
- Ensures codebase is in clean state before mission begins
- Establishes baseline - if tests are already failing, mission can't determine what it broke

**Post-Mission Checks** (`mission-postcheck.js`):
- Run after Lynch's Final Mission Review approves
- Configured via `ateam.config.json` (typically lint + unit + e2e)
- Proves all code works together
- Required for mission completion (enforced by Hannibal's Stop hook)
- Updates `board.json` so the Stop hook can verify checks passed

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

Configure Claude Code permissions for background agents. **Run this once per project** before using `/ateam run`.

This command:
1. **Configures permissions** - Background agents can't prompt for approval, so this pre-approves:
   - `Bash(node **/scripts/*.js)` - board scripts
   - `Bash(mv mission/*)` - moving items between stages
   - `Bash(echo *>> mission/activity.log)` - activity logging
   - `Write(src/**)` - tests and implementations
   - `Write(mission/**)` - work items

2. **Creates `ateam.config.json`** - Project-specific settings via interactive prompts:
   - Package manager (npm, yarn, pnpm, bun)
   - Test commands (unit, e2e)
   - Lint command
   - Pre-mission checks (what runs before `/ateam run`)
   - Post-mission checks (what runs after final review)

3. **Checks plugin dependencies** - Verifies Playwright plugin is available for Amy's browser testing

### `/ateam plan <prd-file> [--skip-refinement]`

Initialize a mission from a PRD file with two-pass refinement:
1. Face decomposes PRD into work items
2. Sosa reviews and asks clarifying questions
3. Face refines based on feedback and moves Wave 0 to `ready/`

Use `--skip-refinement` to bypass Sosa's review for simple PRDs.

### `/ateam run [--wip N] [--max-wip M]`

Execute the mission. Default WIP: 3, max: 5.

### `/ateam status`

Display the mission board with current progress.

### `/ateam resume`

Resume an interrupted mission.

### `/ateam unblock <item-id> [--guidance "hint"]`

Unblock a stuck work item with optional guidance.

## Plugin Structure

```
ai-team/                     # Add as .claude/ai-team submodule
├── plugin.json              # Plugin configuration
├── package.json             # Node.js dependencies
├── agents/                  # Agent prompts with lifecycle hooks
│   ├── hannibal.md          # Orchestrator (PreToolUse + Stop hooks)
│   ├── face.md              # Decomposer (opus)
│   ├── sosa.md              # Requirements Critic (requirements-critic, opus)
│   ├── murdock.md           # QA Engineer (SubagentStop hook)
│   ├── ba.md                # Implementer (SubagentStop hook)
│   ├── lynch.md             # Reviewer (SubagentStop hook)
│   └── amy.md               # Investigator (SubagentStop hook)
├── commands/
│   ├── setup.md             # Configure permissions + create config
│   ├── plan.md              # Initialize mission
│   ├── run.md               # Execute mission (with pre/post checks)
│   ├── status.md            # Check progress
│   ├── resume.md            # Resume interrupted
│   └── unblock.md           # Unblock failed items
├── skills/
│   └── tdd-workflow.md      # TDD guidance
├── scripts/                 # CLI scripts for board management
│   ├── board-*.js           # Board operations
│   ├── item-*.js            # Work item operations
│   ├── mission-*.js         # Mission lifecycle (init, precheck, postcheck, archive)
│   ├── deps-check.js
│   ├── activity-log.js
│   └── hooks/               # Agent lifecycle hooks
│       ├── enforce-completion-log.js    # SubagentStop for working agents
│       ├── block-hannibal-writes.js     # PreToolUse for Hannibal
│       └── enforce-final-review.js      # Stop for Hannibal
├── lib/                     # Shared libraries
│   ├── board.js
│   ├── lock.js
│   └── validate.js
├── docs/                    # Documentation (optional)
└── README.md
```

## CLI Scripts

The plugin includes Node.js CLI scripts for atomic board operations. Agents use these scripts instead of directly manipulating files.

### Installation

```bash
# In the plugin directory (e.g., .claude/ai-team/)
npm install
```

### Scripts

| Script | Purpose | Example |
|--------|---------|---------|
| `board-read.js` | Read board state | `node .claude/ai-team/scripts/board-read.js --agents` |
| `board-move.js` | Move item between stages | `echo '{"itemId":"001","to":"testing","agent":"murdock","task_id":"abc123"}' \| node .claude/ai-team/scripts/board-move.js` |
| `board-claim.js` | Assign agent to item | `echo '{"itemId":"001","agent":"murdock"}' \| node .claude/ai-team/scripts/board-claim.js` |
| `board-release.js` | Release agent claim | `echo '{"itemId":"001"}' \| node .claude/ai-team/scripts/board-release.js` |
| `item-create.js` | Create work item | `echo '{"title":"...","type":"feature",...}' \| node .claude/ai-team/scripts/item-create.js` |
| `item-update.js` | Update work item | `echo '{"itemId":"001","updates":{...}}' \| node .claude/ai-team/scripts/item-update.js` |
| `item-reject.js` | Record rejection | `echo '{"itemId":"001","reason":"..."}' \| node .claude/ai-team/scripts/item-reject.js` |
| `item-agent-start.js` | **Lifecycle hook**: Claim item + set `assigned_agent` | `echo '{"itemId":"001","agent":"murdock"}' \| node .claude/ai-team/scripts/item-agent-start.js` |
| `item-agent-stop.js` | **Lifecycle hook**: Log completion + add to `work_log` | `echo '{"itemId":"001","agent":"murdock","status":"success","summary":"..."}' \| node .claude/ai-team/scripts/item-agent-stop.js` |
| `item-complete.js` | Signal agent completion (DEPRECATED) | `echo '{"itemId":"001","agent":"murdock","status":"success"}' \| node .claude/ai-team/scripts/item-complete.js` |
| `item-render.js` | Render as markdown | `node .claude/ai-team/scripts/item-render.js --item=001` |
| `mission-init.js` | Initialize fresh mission | `node .claude/ai-team/scripts/mission-init.js --force` |
| `mission-precheck.js` | **Pre-mission checks**: Lint + unit tests | `node .claude/ai-team/scripts/mission-precheck.js` |
| `mission-postcheck.js` | **Post-mission checks**: Lint + unit + e2e | `node .claude/ai-team/scripts/mission-postcheck.js` |
| `mission-archive.js` | Archive completed items | `node .claude/ai-team/scripts/mission-archive.js --complete` |
| `deps-check.js` | Validate dependency graph | `node .claude/ai-team/scripts/deps-check.js` |
| `activity-log.js` | Log to Live Feed | `node .claude/ai-team/scripts/activity-log.js --agent=Murdock --message="Writing tests"` |

### Input/Output

- **Input:** JSON via stdin or `--input` flag
- **Output:** JSON to stdout (except `item-render.js` which outputs markdown)
- **Errors:** JSON to stderr, exit code 1

### Key Features

- **Atomic operations:** File locking prevents race conditions between concurrent agents
- **Dual updates:** `board-move.js` updates both filesystem and `board.json`
- **Transition validation:** Invalid stage transitions are rejected
- **WIP limits:** Enforced when moving items to active stages
- **Escalation:** Items rejected twice are moved to `blocked/`
- **Lifecycle hooks:** Agent start/stop scripts enforce completion logging
- **Mission checks:** Pre/post checks ensure clean baseline and working output

## Agent Lifecycle Hooks

The plugin uses Claude Code's hook system to enforce workflow discipline:

### Working Agent Hooks (Murdock, B.A., Lynch, Amy)

All working agents have a **SubagentStop hook** (`enforce-completion-log.js`) that:
- Prevents agents from finishing without calling `item-agent-stop.js`
- Ensures work summaries are recorded in the work item's `work_log`
- Blocks stop and prompts agent if completion logging is missing

### Hannibal Hooks

**PreToolUse Hook** (`block-hannibal-writes.js`):
- Blocks Hannibal from writing to `src/**` or test files
- Enforces delegation to B.A. and Murdock
- Maintains orchestrator boundaries

**Stop Hook** (`enforce-final-review.js`):
- Prevents mission from ending without all items in `done/`
- Requires Lynch's Final Mission Review verdict
- Requires post-mission checks to pass
- Ensures mission completes properly

## Project Configuration

`ateam.config.json` (created by `/ateam setup`):

```json
{
  "packageManager": "npm",
  "checks": {
    "lint": "npm run lint",
    "unit": "npm test",
    "e2e": "npm run test:e2e"
  },
  "precheck": ["lint", "unit"],
  "postcheck": ["lint", "unit", "e2e"]
}
```

Configures which checks run before and after missions.

## Troubleshooting

### Background agents getting permission denied
**Symptom:** Murdock/B.A. errors: "Permission to use Write has been auto-denied (prompts unavailable)"

**Cause:** Background agents can't prompt for approval interactively.

**Fix:** Run `/ateam setup` to configure required permissions, or manually add to `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
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

### Board shows items in wrong columns
**Symptom:** `board.json` says items are in one stage, but UI shows them elsewhere.

**Cause:** Hannibal updated `board.json` but didn't `mv` the actual files.

**Fix:** Sync filesystem to match `board.json`:
```bash
# Move files to correct stage folders based on board.json phases
mv mission/briefings/001-*.md mission/done/
```

### Agents not creating files
**Symptom:** Murdock/B.A. complete but no test/impl files appear.

**Cause:** Work items missing `outputs:` field in YAML frontmatter.

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

### Starting a new mission with old items in done/
**Symptom:** New mission shows old completed items in DONE column.

**Fix:** Archive old mission items before starting new mission:
```bash
mkdir -p mission/archive/old-mission-name
mv mission/done/*.md mission/archive/old-mission-name/
```

---

*In 1972, a crack commando unit was sent to prison by a military court for a crime they didn't commit. These men promptly escaped from a maximum security stockade to the Los Angeles underground. Today, still wanted by the government, they survive as soldiers of fortune. If you have a problem, if no one else can help, and if you can find them, maybe you can hire... The A(i)-Team.*
