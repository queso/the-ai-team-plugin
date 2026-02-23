# Agent Prompts

Defines behavior contracts for 8 A(i)-Team agents. Each `.md` file is a prompt loaded at dispatch time — not code, but the instructions that shape agent behavior. Does NOT contain implementation logic (that's in `packages/mcp-server/`).

## Frontmatter Contract

All agent files use YAML frontmatter:

```yaml
---
name: agent-name              # Identifier (required)
description: Role summary     # (required)
permissionMode: acceptEdits   # Working agents that write files
hooks:                         # Runtime enforcement (see below)
  PreToolUse: [...]
  Stop: [...]
---
```

Hannibal also has `tools:` listing available tools. Model selection (`opus`/`sonnet`) is in the body, not frontmatter.

## Agent Boundaries

| Agent | Writes | Cannot Write | Hooks |
|-------|--------|-------------|-------|
| **Hannibal** | Orchestration only | `src/**`, tests, Playwright | `enforce-orchestrator-boundary` (plugin), `enforce-orchestrator-stop` (plugin), `block-hannibal-writes`, `block-raw-mv`, `enforce-final-review` |
| **Face** | Work items via MCP | Tests, implementation | None |
| **Sosa** | Review reports (text output) | Any files | `block-sosa-writes`, `enforce-sosa-coverage` |
| **Murdock** | Tests + types | Implementation code | `block-raw-echo-log`, `block-murdock-impl-writes`, `block-worker-board-move`, `block-worker-board-claim`, `enforce-completion-log` |
| **B.A.** | Implementation | Tests | `block-raw-echo-log`, `block-ba-bash-restrictions`, `block-ba-test-writes`, `block-worker-board-move`, `block-worker-board-claim`, `enforce-completion-log` |
| **Lynch** | Review verdicts | Any code | `block-raw-echo-log`, `block-worker-board-move`, `block-worker-board-claim`, `block-lynch-browser`, `enforce-completion-log` |
| **Amy** | `/tmp/` debug scripts only | Production code, tests, config | `block-raw-echo-log`, `block-amy-writes`, `block-worker-board-move`, `block-worker-board-claim`, `enforce-completion-log` |
| **Tawnia** | Docs (CHANGELOG, README) | `src/**`, tests | `block-raw-echo-log`, `block-worker-board-move`, `block-worker-board-claim`, `enforce-completion-log` |

**Hooks enforce these boundaries at runtime.** Agents physically cannot violate them.

## Hook System

Scripts in `scripts/hooks/` run at lifecycle points. Exit code 0 = allow, non-zero = block.

Hooks operate at two levels:

### Plugin-Level Hooks (`hooks/hooks.json`)

Fire for ALL sessions (main + subagents). Used for observability and orchestrator enforcement.

**Observer hooks** (fire for all sessions, never block):
- `PreToolUse` → `observe-pre-tool-use.js` — logs tool invocations to API
- `PostToolUse` → `observe-post-tool-use.js` — logs tool completions to API
- `Stop` → `observe-stop.js` — logs session ends to API
- `SubagentStart/Stop` → `observe-subagent.js` — tracks agent lifecycle + registers agent map
- `TeammateIdle/TaskCompleted` → `observe-teammate.js` — tracks teammate events

**Orchestrator enforcement** (agent-aware, only blocks the main session):
- `PreToolUse` → `enforce-orchestrator-boundary.js` — detects main session via agent map, blocks Hannibal from writing source/tests, using Playwright, or raw `mv` on mission files
- `Stop` → `enforce-orchestrator-stop.js` — prevents mission from ending without final review and post-checks

**Agent detection:** The enforcement hooks check `hookInput.agent_type` (set for subagent sessions) and the agent map (`/tmp/ateam-agent-map/{session_id}`, maintained by `observe-subagent.js`). If the current session is a worker subagent, the hook exits 0 immediately — worker enforcement is handled by their own frontmatter hooks.

### Agent Frontmatter Hooks (`agents/*.md`)

Scoped to individual agent lifetimes. These fire when an agent is dispatched as a subagent.

**Note:** Hannibal runs in the MAIN context (not as a subagent), so his frontmatter hooks serve as defense-in-depth only. The plugin-level `enforce-orchestrator-boundary.js` provides the primary enforcement.

**Working agents** (Murdock, B.A., Lynch, Amy, Tawnia) all share:
- `PreToolUse(Bash)` → `block-raw-echo-log.js` — forces MCP `log` tool instead of raw echo
- `PreToolUse(board_move)` → `block-worker-board-move.js` — stage transitions are Hannibal's responsibility
- `PreToolUse(board_claim)` → `block-worker-board-claim.js` — workers use `agent_start`, not raw `board_claim`
- `Stop` → `enforce-completion-log.js` — blocks exit until `agent_stop` MCP tool is called

**Murdock** has an additional hook:
- `PreToolUse(Write|Edit)` → `block-murdock-impl-writes.js` — blocks implementation file writes (only tests, `*.d.ts`, and `/types/` allowed)

**B.A.** has additional hooks:
- `PreToolUse(Write|Edit)` → `block-ba-test-writes.js` — blocks `*.test.*`, `*.spec.*` file edits (tests are Murdock's job)
- `PreToolUse(Bash)` → `block-ba-bash-restrictions.js` — blocks dev server commands, `git stash`, and `sleep > 5s`

**Amy** has an additional hook:
- `PreToolUse(Write|Edit)` → `block-amy-writes.js` — blocks ALL project file writes (source, tests, config); only `/tmp/` allowed

**Sosa** has unique hooks:
- `PreToolUse(Write|Edit)` → `block-sosa-writes.js` — blocks ALL file writes (Sosa reviews, does not write)
- `Stop` → `enforce-sosa-coverage.js` — blocks exit if no items were rendered for review

**Hannibal** has frontmatter hooks (defense-in-depth) + plugin-level enforcement (primary):
- `PreToolUse(Write|Edit)` → `block-hannibal-writes.js` (frontmatter) — prevents writing to source/test files
- `PreToolUse(Bash)` → `block-raw-mv.js` (frontmatter) — prevents raw `mv` on mission files
- `Stop` → `enforce-final-review.js` (frontmatter) — blocks exit until final review + post-checks pass
- `PreToolUse(*)` → `enforce-orchestrator-boundary.js` (plugin-level) — blocks src/**, tests, Playwright
- `Stop` → `enforce-orchestrator-stop.js` (plugin-level) — same final review enforcement for main session

## Dispatch Modes

Agents are dispatched differently based on `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`:

| Mode | Dispatch | Completion Signal | Orchestration |
|------|----------|-------------------|---------------|
| **Legacy** (default) | `Task(subagent_type: "ai-team:murdock", run_in_background: true)` | `agent_stop` MCP tool, Hannibal polls `TaskOutput` | `playbooks/orchestration-legacy.md` |
| **Native teams** (`=1`) | `TeamCreate` + `Task(team_name, name)` | `agent_stop` + `SendMessage` to Hannibal | `playbooks/orchestration-native.md` |

In both modes, MCP tools are the source of truth. Communication tools are for coordination only.

## Patterns

**Modifying an agent file:**
1. Keep hook consistency — working agents MUST have both `PreToolUse` and `Stop` hooks
2. Maintain explicit "Do NOT" sections listing forbidden operations
3. All agents must call `agent_start`/`agent_stop` MCP tools (enforced by Stop hook)
4. Communication sections must use `SendMessage` (not the old `TeammateTool` API)

**Pipeline flow (all stages mandatory):**
```
briefings → ready → testing → implementing → review → probing → done
                      Murdock    B.A.          Lynch    Amy
```
Then: Final Review (Lynch) → Post-Checks → Documentation (Tawnia) → Complete.

## Related Context

- Hook scripts: `scripts/hooks/`
- Orchestration playbooks: `playbooks/orchestration-{legacy,native}.md`
- Dispatch commands: `commands/run.md`, `commands/resume.md`
- MCP tools that agents call: `packages/mcp-server/AGENTS.md`
