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
| **Hannibal** | Orchestration only | `src/**`, tests | `block-hannibal-writes`, `block-raw-mv`, `enforce-final-review` |
| **Face** | Work items via MCP | Tests, implementation | None |
| **Sosa** | Review reports | Work items directly | None |
| **Murdock** | Tests + types | Implementation code | `block-raw-echo-log`, `enforce-completion-log` |
| **B.A.** | Implementation | Tests | Same as Murdock |
| **Lynch** | Review verdicts | Any code | Same as Murdock |
| **Amy** | Debug scripts only | Production code, tests | Same as Murdock |
| **Tawnia** | Docs (CHANGELOG, README) | `src/**`, tests | Same as Murdock |

**Hooks enforce these boundaries at runtime.** Agents physically cannot violate them.

## Hook System

Scripts in `scripts/hooks/` run at lifecycle points. Exit code 0 = allow, non-zero = block.

**Working agents** (Murdock, B.A., Lynch, Amy, Tawnia) all share:
- `PreToolUse(Bash)` → `block-raw-echo-log.js` — forces MCP `log` tool instead of raw echo
- `Stop` → `enforce-completion-log.js` — blocks exit until `agent_stop` MCP tool is called

**Hannibal** has unique hooks:
- `PreToolUse(Write|Edit)` → `block-hannibal-writes.js` — prevents writing to source/test files
- `PreToolUse(Bash)` → `block-raw-mv.js` — prevents raw `mv` on mission files
- `Stop` → `enforce-final-review.js` — blocks exit until final review + post-checks pass

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
