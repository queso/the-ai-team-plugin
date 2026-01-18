#!/usr/bin/env node
/**
 * enforce-completion-log.js - SubagentStop hook for working agents
 *
 * Ensures agents call item-agent-stop.js before finishing.
 * If the agent hasn't logged completion, this hook blocks the stop
 * and injects a message telling the agent to call the script.
 *
 * Used by: Murdock, B.A., Lynch, Amy
 *
 * Environment variables (set by Claude Code):
 *   AGENT_OUTPUT - The agent's final output text
 *   ITEM_ID - The work item ID (passed via agent prompt/context)
 *
 * Returns JSON:
 *   { "decision": "block", "additionalContext": "..." } - Force agent to continue
 *   {} - Allow stop
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const missionDir = join(process.cwd(), 'mission');
const boardPath = join(missionDir, 'board.json');

// Get the item ID from environment or try to parse from agent output
const itemId = process.env.ITEM_ID;
const agentOutput = process.env.AGENT_OUTPUT || '';

// If no mission exists, allow stop
if (!existsSync(boardPath)) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

// Try to detect itemId from agent output if not in env
// Look for patterns like "item-agent-stop" calls or "Feature 007" mentions
let detectedItemId = itemId;
if (!detectedItemId) {
  // Look for item-agent-stop.js call in output (agent already called it)
  const stopCallMatch = agentOutput.match(/item-agent-stop\.js.*"itemId":\s*"(\d+)"/);
  if (stopCallMatch) {
    detectedItemId = stopCallMatch[1];
  }

  // Look for "Feature XXX" or "item XXX" patterns
  if (!detectedItemId) {
    const featureMatch = agentOutput.match(/(?:Feature|item|Item)\s+(\d{3})/i);
    if (featureMatch) {
      detectedItemId = featureMatch[1];
    }
  }
}

// If we still don't know the item ID, we can't enforce - allow stop
if (!detectedItemId) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

try {
  const board = JSON.parse(readFileSync(boardPath, 'utf8'));
  const assignment = board.assignments?.[detectedItemId];

  // Check if agent logged completion (has completed_at timestamp)
  if (assignment?.completed_at) {
    // Completion was logged, allow stop
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  // No completion logged - block and inject message
  const message = `
STOP: You haven't logged your work completion yet.

Before finishing, you MUST call item-agent-stop.js to record your work:

\`\`\`bash
echo '{"itemId": "${detectedItemId}", "agent": "YOUR_AGENT_NAME", "status": "success", "summary": "Your summary here"}' | node scripts/item-agent-stop.js
\`\`\`

Replace:
- YOUR_AGENT_NAME with your agent name (murdock, ba, lynch, or amy)
- The summary with a brief human-readable overview of your work

**About the summary:** This is for HUMANS reading the work item to understand what was done. Write a light overview that complements the code - e.g., "Created 5 tests covering auth flow, error handling, and edge cases" or "Implemented OrderService with retry logic and connection pooling". Keep it concise but informative.

This note will be appended to the work item for the team to see.
`.trim();

  console.log(JSON.stringify({
    decision: "block",
    additionalContext: message
  }));
  process.exit(0);

} catch (err) {
  // On error, allow stop (don't block due to parse errors)
  console.error(`Warning: ${err.message}`);
  console.log(JSON.stringify({}));
  process.exit(0);
}
