# Product Requirements Document: Native TeammateTool Integration

## Overview

Integrate Claude Code's native Agent Teams feature (TeammateTool) with the A(i)-Team plugin to leverage first-party multi-agent infrastructure while preserving our TDD pipeline discipline, MCP-based persistence, and Kanban UI visibility.

## Background

### Current State

The A(i)-Team plugin uses the `Task` tool with `run_in_background: true` to spawn specialized agents:

```javascript
Task({
  subagent_type: "general-purpose",
  model: "sonnet",
  run_in_background: true,
  prompt: "You are Murdock, the QA Engineer..."
})
```

**Limitations of current approach:**
- No direct agent-to-agent communication (must go through Hannibal)
- No interactive control (can't talk to agents mid-task)
- Polling-based completion detection (TaskOutput checks)
- Terminal-only visibility (no split panes)

### Native Agent Teams (Opus 4.6)

Claude Code now provides first-party TeammateTool with:
- Direct mailbox messaging between agents
- Shared task list with dependency tracking
- Interactive control (Shift+Up/Down to select agents)
- Split pane visualization (tmux/iTerm2)
- Plan approval workflow
- Built-in agent types (tester, coder, reviewer, etc.)

**Limitation:** No session persistence - teams are ephemeral.

### Opportunity

Combine native TeammateTool spawning with our MCP persistence layer to get:
- Native inter-agent communication
- Interactive control during missions
- Split pane visibility
- **Plus** persistence, TDD pipeline, Kanban UI

## Objectives

1. **Adopt native spawning**: Replace `Task` with `TeammateTool` for agent dispatch
2. **Preserve persistence**: Keep MCP tools for board state, work logs, activity feed
3. **Maintain TDD discipline**: Pipeline stages still enforced via `board_move`
4. **Enable interactivity**: Allow user to message agents directly during missions
5. **Support split panes**: Visual parallel agent execution via tmux

## Non-Goals

- Replacing MCP persistence with native task list (no session resumption)
- Removing specialized agent roles (keep Murdock, B.A., Lynch personas)
- Eliminating Kanban UI (still needed for external visibility)
- Supporting nested teams (not supported by native TeammateTool)

## Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                              │
│  ┌─────────────┐                                            │
│  │   Hannibal  │──── Task(run_in_background) ────┐         │
│  │ (main ctx)  │                                  │         │
│  └──────┬──────┘                                  ▼         │
│         │                              ┌──────────────────┐ │
│         │                              │ Background Agent │ │
│         │                              │   (isolated)     │ │
│         │                              └────────┬─────────┘ │
│         │                                       │           │
│         └───────────────┬───────────────────────┘           │
│                         │                                   │
│                ┌────────▼────────┐                          │
│                │   MCP Server    │                          │
│                └────────┬────────┘                          │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │  A(i)-Team API  │
                └─────────────────┘
```

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                              │
│  ┌─────────────┐                                            │
│  │   Hannibal  │──── TeammateTool(spawn) ────┐             │
│  │ (team lead) │                              │             │
│  └──────┬──────┘                              ▼             │
│         │                         ┌────────────────────────┐│
│         │    ┌── mailbox ────────▶│ Murdock   (tester)    ││
│         │    │                    │ B.A.      (coder)     ││
│         │◀───┤                    │ Lynch     (reviewer)  ││
│         │    │                    │ Amy       (researcher)││
│         │    └── mailbox ────────▶│ Tawnia    (documenter)││
│         │                         └──────────┬─────────────┘│
│         │                                    │              │
│         └────────────────┬───────────────────┘              │
│                          │                                  │
│                 ┌────────▼────────┐                         │
│                 │   MCP Server    │                         │
│                 └────────┬────────┘                         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │  A(i)-Team API  │
                 └─────────────────┘
```

**Key changes:**
- Hannibal becomes "team lead" using TeammateTool
- Agents are "teammates" with direct mailbox communication
- MCP layer unchanged - still handles persistence
- User can interact with any agent via Shift+Up/Down

## Functional Requirements

### FR-1: Team Initialization

When `/ai-team:run` starts, Hannibal creates a team:

```javascript
TeammateTool({
  action: "spawnTeam",
  team_name: `mission-${missionId}`,
  config: {
    display_mode: "auto"  // tmux if available, else in-process
  }
})
```

### FR-2: Agent Spawning with Native Types

Map A(i)-Team agents to native types with custom prompts:

| A(i)-Team Agent | Native Type | allowed_tools |
|-----------------|-------------|---------------|
| Murdock | `tester` | Read, Write, Glob, Grep, Bash, mcp__* |
| B.A. | `coder` | Read, Write, Edit, Glob, Grep, Bash, mcp__* |
| Lynch | `reviewer` | Read, Glob, Grep, mcp__* |
| Amy | `researcher` | Read, Glob, Grep, Bash, mcp__* (+ Playwright) |
| Tawnia | `documenter` | Read, Write, Edit, Bash, mcp__* |

```javascript
TeammateTool({
  action: "spawn",
  team_name: `mission-${missionId}`,
  name: "murdock",
  subagent_type: "tester",
  model: "sonnet",
  allowed_tools: ["Read", "Write", "Glob", "Grep", "Bash", "mcp__*"],
  prompt: `You are Murdock, the A(i)-Team's QA Engineer.

WORK ITEM: ${workItem.title} (${workItem.id})
- Objective: ${workItem.objective}
- Test file: ${workItem.outputs.test}
- Types file: ${workItem.outputs.types || "none"}

INSTRUCTIONS:
1. Call agent_start MCP tool with itemId="${workItem.id}", agent="murdock"
2. Write tests at ${workItem.outputs.test}
3. Call agent_stop MCP tool with summary of work done

See full guidelines in agents/murdock.md.`
})
```

### FR-3: MCP Tool Integration

Agents still use MCP tools for persistence. The spawn prompt instructs them to:

1. **Start**: Call `agent_start` to claim the work item
2. **Work**: Use standard tools (Read, Write, etc.)
3. **Log**: Call `log` MCP tool for activity feed updates
4. **Complete**: Call `agent_stop` with summary

The MCP layer handles:
- Board state (`board_move`, `board_read`)
- Work item management (`item_update`, `item_get`)
- Activity logging (`log`, `activity_log`)
- Mission lifecycle (`mission_current`, `mission_postcheck`)

### FR-4: Direct Agent Communication

Hannibal can message agents directly instead of polling:

```javascript
// Instead of polling TaskOutput
TeammateTool({
  action: "message",
  team_name: `mission-${missionId}`,
  target: "murdock",
  message: "Status check - are tests complete?"
})
```

Agents can message each other for coordination:

```javascript
// B.A. asking Murdock about test expectations
TeammateTool({
  action: "message",
  target: "murdock",
  message: "What's the expected return type for processOrder()?"
})
```

### FR-5: Plan Approval for Complex Items

For items marked `requires_review: true`, use plan approval:

```javascript
TeammateTool({
  action: "spawn",
  name: "ba",
  require_plan_approval: true,
  prompt: "Implement ${workItem.title}. This is a complex change - create a plan first."
})
```

Hannibal reviews and approves/rejects:

```javascript
TeammateTool({
  action: "approvePlan",
  target: "ba",
  feedback: "Approved. Proceed with implementation."
})
```

### FR-6: Interactive User Control

User can interact with agents during mission:

- **Shift+Up/Down**: Select agent
- **Enter**: View agent's session
- **Escape**: Interrupt current turn
- **Type**: Send message to selected agent

This enables mid-mission guidance without stopping the pipeline.

### FR-7: Split Pane Visualization

When tmux is available, each agent gets its own pane:

```
┌─────────────────┬─────────────────┬─────────────────┐
│    Hannibal     │    Murdock      │      B.A.       │
│   (team lead)   │   (testing)     │  (implementing) │
│                 │                 │                 │
│ Coordinating    │ Writing tests   │ Implementing    │
│ mission...      │ for WI-003...   │ WI-001...       │
│                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

Set via settings or flag:
```json
{
  "teammateMode": "tmux"
}
```

### FR-8: Graceful Shutdown

When mission completes or is cancelled:

```javascript
// Request each agent to shutdown
for (const agent of activeAgents) {
  TeammateTool({
    action: "requestShutdown",
    target: agent.name
  })
}

// Clean up team resources
TeammateTool({
  action: "cleanup",
  team_name: `mission-${missionId}`
})
```

### FR-9: Session Resumption Handling

Native teams don't support `/resume`. Handle this:

1. On `/ai-team:resume`, check for orphaned team references
2. If team doesn't exist, log warning and spawn fresh teammates
3. MCP state is source of truth - agents pick up from board state

```javascript
// In /ai-team:resume
const missionState = await mcp.mission_current();
const readyItems = missionState.columns.ready;

// Spawn new teammates for in-progress work
for (const itemId of missionState.columns.testing) {
  const item = await mcp.item_get({ id: itemId });
  spawnTeammate("murdock", item);
}
```

## Agent Prompt Updates

### Hannibal (Team Lead)

Update `agents/hannibal.md` to use TeammateTool:

```markdown
## Agent Dispatch

Use TeammateTool to spawn and manage teammates:

### Spawning Agents
\`\`\`javascript
TeammateTool({
  action: "spawn",
  team_name: "mission-${missionId}",
  name: "murdock",
  subagent_type: "tester",
  model: "sonnet",
  allowed_tools: ["Read", "Write", "Glob", "Grep", "Bash", "mcp__*"],
  prompt: "..."
})
\`\`\`

### Messaging Agents
\`\`\`javascript
TeammateTool({
  action: "message",
  target: "murdock",
  message: "Status update?"
})
\`\`\`

### Completion Detection
Instead of polling TaskOutput, agents message you when done.
Listen for completion messages from teammates.
```

### Working Agents (Murdock, B.A., Lynch, Amy, Tawnia)

Add team communication section:

```markdown
## Team Communication

You are a teammate in an A(i)-Team mission. You can:

### Message Hannibal (Lead)
\`\`\`javascript
TeammateTool({
  action: "message",
  target: "hannibal",
  message: "Tests complete for WI-003. Ready for implementation."
})
\`\`\`

### Message Other Teammates
\`\`\`javascript
TeammateTool({
  action: "message",
  target: "ba",
  message: "The OrderService interface expects async methods."
})
\`\`\`

### Shutdown
When your work is complete and agent_stop has been called:
\`\`\`javascript
TeammateTool({
  action: "approveShutdown"
})
\`\`\`
```

## Configuration

### Environment Variables

```json
// .claude/settings.local.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "ATEAM_PROJECT_ID": "my-project",
    "ATEAM_API_URL": "http://localhost:3000"
  }
}
```

### Teammate Mode

```json
// .claude/settings.local.json
{
  "teammateMode": "auto"  // "auto" | "in-process" | "tmux"
}
```

## Migration Path

### Phase 1: Parallel Support (Non-Breaking)

1. Add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` check in Hannibal
2. If enabled, use TeammateTool; else fall back to Task
3. MCP tools unchanged
4. Test with both modes

```javascript
const useNativeTeams = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";

if (useNativeTeams) {
  // TeammateTool dispatch
} else {
  // Legacy Task dispatch
}
```

### Phase 2: Native-First

1. Update agent prompts with team communication
2. Document new interactive controls
3. Add split pane setup guidance
4. Deprecate legacy dispatch

### Phase 3: Cleanup

1. Remove legacy Task dispatch code
2. Remove TaskOutput polling logic
3. Update documentation
4. Mark CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS as required

## Risks and Mitigations

### Risk: No Session Resumption

**Impact:** If Claude Code session crashes, teammates are lost.

**Mitigation:**
- MCP state is source of truth
- `/ai-team:resume` spawns fresh teammates from board state
- Work items track progress, not teammate sessions

### Risk: Token Cost

**Impact:** 5 teammates = ~5x token usage.

**Mitigation:**
- Spawn teammates on-demand (not all at once)
- Use Haiku for simple tasks where appropriate
- Document cost implications

### Risk: Coordination Overhead

**Impact:** Direct messaging could create noise.

**Mitigation:**
- Agents primarily use MCP tools for state
- Messaging reserved for ad-hoc coordination
- Hannibal remains coordinator

### Risk: tmux Availability

**Impact:** Split panes require tmux/iTerm2.

**Mitigation:**
- Default to "auto" mode
- In-process mode works everywhere
- Document setup for split panes

## Success Metrics

1. **Interactivity**: User can message agents mid-mission
2. **Visibility**: Split pane view shows parallel progress
3. **Persistence**: Mission state survives session restart
4. **Pipeline**: TDD stages still enforced
5. **Token efficiency**: No significant increase vs current approach

## Testing Strategy

### Unit Tests
- TeammateTool parameter construction
- Agent type mapping
- MCP tool integration in spawn prompts

### Integration Tests
- Spawn teammate and verify MCP calls
- Message round-trip between agents
- Plan approval workflow
- Graceful shutdown sequence

### Manual Testing
- Full mission with native teams
- Session crash and `/ai-team:resume`
- Split pane visualization
- Interactive agent messaging

## Implementation Checklist

- [ ] Add CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS check
- [ ] Update Hannibal dispatch to use TeammateTool
- [ ] Update agent prompts with team communication
- [ ] Add teammate mode configuration
- [ ] Update `/ai-team:run` command
- [ ] Update `/ai-team:resume` for orphaned teams
- [ ] Add split pane setup documentation
- [ ] Test parallel Task/TeammateTool support
- [ ] Performance testing with 5 teammates
- [ ] Update CLAUDE.md with new architecture

## Appendix: Native vs MCP Responsibility Split

| Concern | Native TeammateTool | MCP Tools |
|---------|---------------------|-----------|
| Spawning agents | TeammateTool spawn | - |
| Agent communication | Mailbox messaging | - |
| Work item state | - | board_move, item_update |
| Activity logging | - | log, activity_log |
| Pipeline enforcement | - | board_move validates |
| Mission state | - | mission_current |
| Session persistence | - | API database |
| Interactive control | Shift+Up/Down | - |
| Split panes | tmux integration | - |
| Plan approval | approvePlan/rejectPlan | - |
| Work log history | - | agent_stop summary |

The split is clean: **Native handles orchestration, MCP handles persistence.**
