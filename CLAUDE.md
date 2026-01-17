# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The A(i)-Team is a Claude Code plugin for parallel agent orchestration. It transforms PRDs into working, tested code through a TDD pipeline with specialized agents:

- **Hannibal** (Orchestrator): Runs in main Claude context, coordinates the team
- **Face** (Decomposer): Breaks PRDs into feature items (uses opus model)
- **Sosa** (Critic): Reviews decomposition, asks clarifying questions (requirements-critic subagent, opus)
- **Murdock** (QA): Writes tests first (qa-engineer subagent)
- **B.A.** (Implementer): Implements code to pass tests (clean-code-architect subagent)
- **Lynch** (Reviewer): Reviews tests + implementation together (code-review-expert subagent)
- **Amy** (Investigator): Probes every feature for bugs beyond tests (bug-hunter subagent)

## Architecture

### Pipeline Flow

**Planning Phase (`/ateam plan`):**
```
PRD → Face (1st pass) → Sosa (review) → Face (2nd pass) → ready/
           ↓                  ↓               ↓
      briefings/        questions         refinement
                        (human)
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
                                                        └─────────────────┘
```

Each feature flows through stages sequentially. Different features can be at different stages simultaneously (pipeline parallelism). WIP limits control how many features are in-flight.

**Two-Level Orchestration:**
1. **Dependency waves** - Items wait in `ready/` until deps reach `done/` (correct waiting)
2. **Pipeline flow** - Items advance IMMEDIATELY on completion, no stage batching (critical)

Use `deps-check.js` to see which items are ready. Within a wave, items flow independently through stages.

**True Individual Item Tracking:** Items advance immediately when their agent completes - no waiting for batch completion. Hannibal polls TaskOutput for each background agent individually and agents signal completion via `item-complete.js`.

When ALL features reach `done/`, Lynch performs a **Final Mission Review** of the entire codebase, checking for cross-cutting issues (consistency, race conditions, security, code quality).

### Mission Directory Structure
When the plugin runs, it creates a `mission/` directory (gitignored) containing:
- `board.json` - State, WIP limits, agent status, assignments
- `activity.log` - Append-only log for Live Feed
- Stage folders: `briefings/`, `ready/`, `testing/`, `implementing/`, `review/`, `probing/`, `done/`, `blocked/`
- `archive/<mission-name>/` - Completed missions (optional, for preserving history)

### Feature Item Format
Work items are markdown files with YAML frontmatter containing:
- `id`, `title`, `type`, `status`, `rejection_count`
- `outputs.test`, `outputs.impl`, `outputs.types` (file paths)
- `dependencies`, `parallel_group`

## Plugin Commands

- `/ateam setup` - Configure permissions for background agents (run once per project)
- `/ateam plan <prd-file>` - Initialize mission from PRD, Face decomposes into work items
- `/ateam run [--wip N]` - Execute mission with pipeline agents (default WIP: 3)
- `/ateam status` - Display kanban board with current progress
- `/ateam resume` - Resume interrupted mission from saved state
- `/ateam unblock <item-id> [--guidance "hint"]` - Unblock stuck items

## Critical Requirements

### Work Item Format (YAML Frontmatter)
Every work item MUST have YAML frontmatter with the `outputs:` field:
```yaml
---
id: "001"
title: "Feature name"
type: "feature"
outputs:
  test: "src/__tests__/feature.test.ts"    # REQUIRED
  impl: "src/services/feature.ts"          # REQUIRED
  types: "src/types/feature.ts"            # Optional
dependencies: []
parallel_group: "group-name"
status: "pending"
rejection_count: 0
---
```
Without `outputs:`, Murdock and B.A. don't know where to create files.

### File Movement (Hannibal)
When moving items between stages, use the CLI scripts which handle both filesystem and board.json atomically:

```bash
echo '{"itemId": "001", "to": "implementing"}' | node .claude/ai-team/scripts/board-move.js
```

The scripts ensure:
- File is moved to the correct stage directory
- `board.json` phases array is updated
- Activity is logged to `mission/activity.log`
- WIP limits are enforced
- Invalid transitions are rejected

### Agent Boundaries
- **Face**: Creates and updates work items. Does NOT write tests or implementation.
- **Sosa**: Reviews and critiques work items. Does NOT modify items directly - provides recommendations for Face.
- **Murdock**: Writes ONLY tests and types. Does NOT write implementation code.
- **B.A.**: Writes ONLY implementation. Tests already exist from Murdock.
- **Lynch**: Reviews only. Does NOT write code.
- **Amy**: Investigates only. Does NOT write production code or tests. Reports findings with proof.

## Key Conventions

### TDD Workflow
1. Murdock writes tests first (defines acceptance criteria)
2. B.A. implements to pass those tests
3. Lynch reviews all outputs together (per-feature)
4. If rejected (max 2 times), item goes to `blocked/` for human intervention
5. When ALL features complete, Lynch performs **Final Mission Review** (holistic codebase review)
6. Final review may reject specific items back to `ready/` for fixes

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

### Agent Dispatch
Hannibal dispatches agents using Task tool with `run_in_background: true`:
- Face: `subagent_type: "clean-code-architect"`, `model: "opus"` (planning phase only)
- Sosa: `subagent_type: "requirements-critic"`, `model: "opus"` (planning phase only)
- Murdock: `subagent_type: "qa-engineer"`, `model: "sonnet"`
- B.A.: `subagent_type: "clean-code-architect"`, `model: "sonnet"`
- Lynch: `subagent_type: "code-review-expert"`
- Amy: `subagent_type: "bug-hunter"`, `model: "sonnet"` (invoked by Lynch or Hannibal)

### Background Agent Permissions

**IMPORTANT:** Background agents (`run_in_background: true`) cannot prompt for user approval. Operations that require approval will be auto-denied.

Run `/ateam setup` once per project to configure required permissions in `.claude/settings.local.json`:

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

| Permission | Used By | Purpose |
|------------|---------|---------|
| `Bash(node **/scripts/*.js)` | All agents | Run board management scripts |
| `Bash(cat <<*)` | All agents | Heredoc input to scripts |
| `Bash(mv mission/*)` | Hannibal | Move items between stage directories |
| `Bash(echo *>> mission/activity.log)` | All agents | Log to Live Feed |
| `Write(src/**)` | Murdock, B.A. | Write tests and implementations |
| `Write(mission/**)` | Face | Create/update work items |

Without these permissions, agents will fail with: "Permission to use [tool] has been auto-denied (prompts unavailable)"

## File Organization

```
ai-team/
├── plugin.json              # Plugin configuration
├── package.json             # Node.js dependencies (run `npm install`)
├── agents/                  # Agent prompts and behavior
│   ├── hannibal.md          # Orchestrator (main context)
│   ├── face.md              # Decomposer
│   ├── sosa.md              # Requirements Critic
│   ├── murdock.md           # QA Engineer
│   ├── ba.md                # Implementer
│   ├── lynch.md             # Reviewer
│   └── amy.md               # Investigator (bug-hunter)
├── commands/                # Slash command definitions
│   ├── setup.md, plan.md, run.md, status.md, resume.md, unblock.md
├── skills/
│   └── tdd-workflow.md      # TDD guidance
├── scripts/                 # CLI scripts for board operations
│   ├── board-read.js, board-move.js, board-claim.js, ...
├── lib/                     # Shared utilities
│   ├── board.js, lock.js, validate.js
└── docs/
    └── kanban-ui-prd.md     # PRD for web-based kanban board
```

## CLI Scripts

Agents should use CLI scripts for board operations instead of direct file manipulation:

| Script | Purpose |
|--------|---------|
| `board-read.js` | Read board state as JSON |
| `board-move.js` | Move item between stages (validates transitions, enforces WIP, stores task_id) |
| `board-claim.js` | Assign agent to item |
| `board-release.js` | Release agent claim |
| `item-create.js` | Create new work item |
| `item-update.js` | Update work item |
| `item-reject.js` | Record rejection (escalates after 2) |
| `item-complete.js` | Signal agent completion (enables immediate item advancement) |
| `item-render.js` | Render item as markdown |
| `mission-init.js` | Initialize fresh mission (archives existing first) |
| `mission-archive.js` | Archive completed items and activity log |
| `deps-check.js` | Validate dependency graph, detect cycles |
| `activity-log.js` | Log progress to Live Feed |

All scripts accept JSON via stdin and output JSON to stdout. See README for full usage examples.

## Installation as Submodule

The plugin is designed to be added as a git submodule to any project:
```bash
git submodule add git@github.com:yourorg/ai-team.git .claude/ai-team
echo "mission/" >> .gitignore
```
