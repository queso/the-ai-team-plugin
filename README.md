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
| **Murdock** | QA Engineer | `qa-engineer` | Writes tests for critical paths. Move fast. |
| **B.A.** | Implementer | `clean-code-architect` | Builds solid, reliable code. No jibber-jabber. |
| **Lynch** | Reviewer | `general-purpose` | Reviews tests + implementation together. |

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

Each feature flows through stages sequentially:

```
briefings → ready → testing → implementing → review → done
                       ↑           ↑            ↑
                    Murdock      B.A.        Lynch
```

**Stage transitions:**
1. `ready → testing`: Murdock writes tests (and types if needed)
2. `testing → implementing`: B.A. implements to pass tests
3. `implementing → review`: Lynch reviews ALL outputs together
4. `review → done`: Feature complete (or back to ready if rejected)

## Pipeline Parallelism

Different features can be at different stages simultaneously:

```
Feature 001: [implementing] ─→ [review]       ─→ done
Feature 002:    [testing]   ─→ [implementing] ─→ ...
Feature 003:                   [testing]      ─→ ...
```

WIP limit controls how many features are in-flight.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│  /ateam plan                                                        │
│      │                                                              │
│      ▼                                                              │
│  ┌────────┐                                                         │
│  │  Face  │ ──── Decompose PRD into feature items                   │
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
│  │    ┌─────────┐     ┌─────────┐     ┌─────────┐              │  │
│  │    │ Murdock │ ──▶ │  B.A.   │ ──▶ │  Lynch  │ ──▶ done    │  │
│  │    │ (tests) │     │ (impl)  │     │(review) │              │  │
│  │    └─────────┘     └─────────┘     └─────────┘              │  │
│  │     subagent        subagent        subagent                │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ════════════════════════════════════════════════════════════════  │
│         "I love it when a plan comes together."                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key:** Hannibal runs in the main Claude context (visible to you), dispatching Murdock, B.A., and Lynch as subagents.

## Mission Directory Structure

```
mission/
├── board.json               # State, WIP limits, assignments
├── briefings/               # Backlog (feature items)
├── ready/                   # Dependencies met, awaiting work
├── testing/                 # Murdock writing tests
├── implementing/            # B.A. implementing
├── review/                  # Lynch reviewing
├── done/                    # Completed features
└── blocked/                 # Needs human intervention
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

Each feature flows: **Murdock → B.A. → Lynch**
1. Murdock writes tests first (defines acceptance criteria)
2. B.A. implements to pass those tests
3. Lynch reviews tests + implementation together

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

### `/ateam plan <prd-file>`

Initialize a mission from a PRD file.

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
├── agents/
│   ├── hannibal.md          # Orchestrator (main context)
│   ├── face.md              # Decomposer
│   ├── murdock.md           # QA Engineer (qa-engineer)
│   ├── ba.md                # Implementer (clean-code-architect)
│   └── lynch.md             # Reviewer (general-purpose)
├── commands/
│   ├── plan.md              # Initialize mission
│   ├── run.md               # Execute mission
│   ├── status.md            # Check progress
│   ├── resume.md            # Resume interrupted
│   └── unblock.md           # Unblock failed items
├── skills/
│   └── tdd-workflow.md      # TDD guidance
├── docs/
│   └── kanban-ui-prd.md     # Example PRD
└── README.md
```

---

*In 1972, a crack commando unit was sent to prison by a military court for a crime they didn't commit. These men promptly escaped from a maximum security stockade to the Los Angeles underground. Today, still wanted by the government, they survive as soldiers of fortune. If you have a problem, if no one else can help, and if you can find them, maybe you can hire... The A(i)-Team.*
