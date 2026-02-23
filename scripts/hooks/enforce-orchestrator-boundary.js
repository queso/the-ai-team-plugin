#!/usr/bin/env node
/**
 * enforce-orchestrator-boundary.js - Plugin-level PreToolUse enforcement
 *
 * Enforces Hannibal's orchestrator boundaries when running in the main session.
 *
 * Problem: Agent frontmatter hooks only fire for subagent sessions. Since
 * Hannibal runs in the MAIN Claude context ("Main Claude becomes Hannibal"),
 * his frontmatter hooks in agents/hannibal.md never fire.
 *
 * Solution: This hook runs at the PLUGIN level (hooks/hooks.json), firing
 * for ALL sessions. It detects whether the current session is the main
 * session (Hannibal) and only enforces restrictions in that case.
 *
 * Detection:
 *   1. hookInput.agent_type set → subagent session → exit 0 (allow)
 *   2. Agent map shows worker name → worker active in main session → exit 0
 *   3. Agent map shows 'hannibal' or null → main session → enforce
 *
 * Blocks (main session only):
 *   - Write/Edit to src/**, test files, project source directories
 *   - Playwright browser tools (Amy's responsibility)
 */

import { readHookInput, lookupAgent } from './lib/observer.js';

const hookInput = readHookInput();
const toolName = hookInput.tool_name || '';

// Fast exit for tools we never care about
if (
  toolName === 'Read' ||
  toolName === 'Glob' ||
  toolName === 'Grep' ||
  toolName === 'Task' ||
  toolName === 'TaskOutput' ||
  toolName === 'TaskCreate' ||
  toolName === 'TaskUpdate' ||
  toolName === 'TaskList' ||
  toolName === 'TaskGet' ||
  toolName === 'SendMessage' ||
  toolName === 'TeamCreate' ||
  toolName === 'TeamDelete' ||
  toolName === 'AskUserQuestion' ||
  toolName === 'EnterPlanMode' ||
  toolName === 'ExitPlanMode' ||
  toolName === 'WebSearch' ||
  toolName === 'WebFetch'
) {
  process.exit(0);
}

// --- Agent Detection ---

// Subagent sessions have agent_type set by Claude Code
if (hookInput.agent_type) {
  process.exit(0);
}

// Check agent map: if a worker is active (between SubagentStart/Stop), allow.
// The observer registers the active agent on SubagentStart and re-registers
// 'hannibal' on SubagentStop.
const sessionId = hookInput.session_id || '';
const mappedAgent = lookupAgent(sessionId);

if (mappedAgent && mappedAgent !== 'hannibal') {
  // Worker agent is active in the main session — allow through
  process.exit(0);
}

// We're in the main session and Hannibal is in control.
// (mappedAgent is 'hannibal' after SubagentStop, or null before first dispatch)

// --- Enforcement ---

const toolInput = hookInput.tool_input || {};

// Block Playwright browser tools (Amy's job)
if (toolName.startsWith('mcp__plugin_playwright_playwright__')) {
  console.error(`BLOCKED: Hannibal cannot use browser tools (${toolName})`);
  console.error("Browser testing is Amy's responsibility.");
  console.error('Dispatch Amy to probe the feature instead.');
  process.exit(2);
}

// Block Write/Edit to source code and test files
if (toolName === 'Write' || toolName === 'Edit') {
  const filePath = toolInput.file_path || '';
  if (!filePath) {
    process.exit(0);
  }

  // Block writes to src/ directory
  if (filePath.includes('/src/') || filePath.startsWith('src/')) {
    console.error(`BLOCKED: Hannibal cannot write to ${filePath}`);
    console.error('Implementation code must be delegated to B.A.');
    process.exit(2);
  }

  // Block writes to test/spec files
  if (filePath.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
    console.error(`BLOCKED: Hannibal cannot write to ${filePath}`);
    console.error('Test files must be delegated to Murdock.');
    process.exit(2);
  }

  // Block writes to other project source directories (handle both absolute and relative paths)
  if (
    filePath.match(
      /(^|\/)(?:app|lib|components|pages|utils|services|hooks|styles|public)\//
    )
  ) {
    console.error(
      `BLOCKED: Hannibal cannot modify project source: ${filePath}`
    );
    console.error('All implementation must be delegated to B.A.');
    process.exit(2);
  }
}

// Allow everything else
process.exit(0);
